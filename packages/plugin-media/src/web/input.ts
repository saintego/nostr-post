/**
 * @nostr-post/plugin-media - <np-media-input>
 *
 * Multi-file media upload / URL input with drag & drop, gallery, and preview.
 * Uploads files to nostr.build (free Nostr media hosting), photos shrunk on the device to
 * the quality the user picks (remembered for next time).
 *
 * Accepts .value (string[]) and .field (PostField).
 * Dispatches 'np-value-changed' with { detail: { value: string[] } }.
 */

import { dismissActivity, startActivity } from '@nostr-post/plugins/activity';
import type { PostField } from '@nostr-post/plugins/types';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  isImageUrl,
  isMediaQuality,
  isVideoUrl,
  MEDIA_QUALITIES,
  MEDIA_QUALITY_PRESETS,
  type MediaPluginConfig,
  toArray,
} from '../core';
import { mediaFileOf, rememberMediaFile } from '../mediaFiles';
import { targetHost, uploadTargets } from '../uploadServers';
import { renderCameraButtons } from './camera';
import { pastedFiles } from './clipboard';
import { compressImage, rememberQuality } from './compress';
import { mediaInputStyles } from './inputStyles';
import { formatBytes, type MediaMessages, mediaMessages } from './mediaMessages';
import { DEFAULT_MAX_SIZE, uploadFailureText, uploadQuality } from './upload';
import {
  prefersUploadLater,
  prepareUploadLater,
  previewUrl,
  rememberUploadLater,
} from './uploadLater';
import { uploadMedia } from './uploadMedia';

@customElement('np-media-input')
export class NpMediaInput extends NpElement {
  static override styles = [...npStyles, mediaInputStyles];

  @property({ type: Array })
  value: string[] = [];

  @property({ type: Object })
  field: PostField | null = null;

  @property({ type: Object })
  messages: Partial<MediaMessages> = {};

  @state() private _dragover = false;
  /** What's uploading now, e.g. "Uploading a.jpg (1/3)", with the sizes */
  @state() private _uploading = '';
  @state() private _uploadDetail = '';
  /** Percent sent; undefined while waiting to try again */
  @state() private _uploadProgress: number | undefined = 0;
  @state() private _uploadError = '';
  /** Offer "Upload later" (the composer's `upload-later`; a field's `uploadLater: false` refuses) */
  @property({ type: Boolean, attribute: 'upload-later' }) uploadLater = false;
  /** Upload later (on wifi or when the user asks): the user's choice, remembered */
  @state() private _uploadLater = prefersUploadLater();
  /** Why upload later didn't apply */
  @state() private _uploadNote = '';
  @state() private _urlInput = '';
  /** The quality picked here, until then the remembered one */
  @state() private _quality = '';

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('paste', this._handlePaste);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('paste', this._handlePaste);
  }

  private get _m(): MediaMessages {
    return mediaMessages(this.messages);
  }

  private get _config(): MediaPluginConfig {
    return (this.field?.metadata as MediaPluginConfig) || {};
  }

  private get _accept(): string {
    return this._config.accept?.join(',') ?? 'image/*,video/*';
  }

  private get _maxSize(): number {
    return this._config.maxSize ?? DEFAULT_MAX_SIZE;
  }

  private get _maxMb(): number {
    return Math.round(this._maxSize / (1024 * 1024));
  }

  private get _maxFiles(): number {
    return this._config.maxFiles ?? 10;
  }

  private get _urls(): string[] {
    return toArray(this.value);
  }

  private _emitValue(urls: string[]) {
    this.value = urls;
    this.dispatchEvent(
      new CustomEvent('np-value-changed', {
        detail: { value: urls },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _addUrl(url: string) {
    if (this._urls.length >= this._maxFiles) return;
    this._emitValue([...this._urls, url]);
  }

  private _removeUrl(index: number) {
    this._emitValue(this._urls.filter((_, i) => i !== index));
  }

  // --- Drag & Drop ---

  private _handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this._dragover = true;
  }

  private _handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this._dragover = false;
  }

  private _handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this._dragover = false;
    if (e.dataTransfer?.files) void this._uploadFiles(Array.from(e.dataTransfer.files));
  }

  /**
   * Ctrl+V / ⌘V anywhere in the field (the URL input, the focused drop zone): pasted photos and
   * videos upload; pasted text stays a paste into the input
   */
  private _handlePaste = (e: ClipboardEvent) => {
    const files = pastedFiles(e, this._config.accept);
    if (files.length === 0) return;
    e.preventDefault();
    void this._uploadFiles(files);
  };

  private _openFilePicker() {
    (this.shadowRoot?.querySelector('.file-input') as HTMLInputElement)?.click();
  }

  private _handleFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      void this._uploadFiles(Array.from(input.files));
      input.value = '';
    }
  }

  // --- Upload ---

  private _pickQuality(value: string) {
    if (!isMediaQuality(value)) return;
    this._quality = value;
    rememberQuality(value);
  }

  /** Cancels the running batch */
  private _abort?: AbortController;

  /** One after another, so each gets the whole connection and the order is kept */
  private async _uploadFiles(files: File[]) {
    const batch = files.slice(0, this._maxFiles - this._urls.length);
    const controller = new AbortController();
    this._abort = controller;
    this._uploadError = '';
    for (const [index, file] of batch.entries()) {
      if (controller.signal.aborted) break;
      const count = batch.length > 1 ? ` (${index + 1}/${batch.length})` : '';
      await this._uploadFile(file, count, controller);
    }
    this._uploading = '';
  }

  private async _uploadFile(file: File, count: string, controller: AbortController) {
    const m = this._m;
    this._uploading = `${m.preparing(file.name)}${count}`;
    this._uploadDetail = '';
    this._uploadProgress = 0;
    // Shown here, not in <np-activity>; the composer waits for it before publishing
    const activity = startActivity(m.uploading(file.name), {
      blocksPublish: true,
      hidden: true,
      cancel: () => controller.abort(),
    });
    try {
      const quality = isMediaQuality(this._quality) ? this._quality : uploadQuality(this._config);
      const upload = await compressImage(file, quality);
      if (upload.size > this._maxSize) throw new Error(m.tooLarge(this._maxMb));
      this._uploadDetail = m.sizes(formatBytes(file.size), formatBytes(upload.size));
      const later =
        this._offersUploadLater && this._uploadLater ? await this._prepareLater(upload) : undefined;
      if (later) {
        this._addUrl(later);
        activity.done();
        return;
      }
      this._uploading = `${m.uploading(file.name)}${count}`;
      const { url } = await uploadMedia(upload, {
        config: this._config,
        signal: controller.signal,
        onProgress: (fraction) => {
          this._uploadProgress = Math.round(fraction * 100);
        },
        onWait: (offline) => {
          this._uploading = offline ? m.waitingForConnection(file.name) : m.interrupted(file.name);
          this._uploadProgress = undefined;
        },
        onRetry: (attempt, attempts) => {
          this._uploading = m.retrying(file.name, attempt, attempts);
          this._uploadProgress = 0;
        },
        onServer: (host) => {
          this._uploading = m.otherServer(file.name, host);
          this._uploadProgress = 0;
        },
      });
      this._addUrl(url);
      activity.done();
    } catch (err) {
      if (controller.signal.aborted) {
        dismissActivity(activity.id);
        return;
      }
      this._uploadError = uploadFailureText(err, file.name, m);
      activity.fail(this._uploadError);
    }
  }

  private get _offersUploadLater(): boolean {
    return this.uploadLater && this._config.uploadLater !== false;
  }

  /** Prepared to upload later: its URL (a placeholder without a Blossom server: signed later) */
  private async _prepareLater(file: File): Promise<string> {
    const { url } = await prepareUploadLater(file, this._config);
    if (url.startsWith('pending:')) this._uploadNote = this._m.uploadLaterSignLater;
    return url;
  }

  // --- URL input ---

  private _handleUrlKeypress(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this._applyUrl();
    }
  }

  private _applyUrl() {
    const url = this._urlInput.trim();
    if (url) {
      this._addUrl(url);
      this._urlInput = '';
    }
  }

  override render() {
    const m = this._m;
    const showUpload = this._config.allowUpload !== false;
    const showUrl = this._config.allowUrl !== false;
    const canAddMore = this._urls.length < this._maxFiles;

    return html`
      <div class="container">
        ${this._urls.length > 0 ? this._renderGallery() : nothing}
        ${canAddMore && showUpload ? this._renderDropZone() : nothing}
        ${canAddMore && showUpload && this._config.qualityChoice !== false ? this._renderQuality() : nothing}
        ${canAddMore && showUpload && this._offersUploadLater ? this._renderUploadLater() : nothing}
        ${
          canAddMore && showUpload && showUrl
            ? html`<div class="url-row"><span class="separator">${m.or}</span></div>`
            : nothing
        }
        ${
          canAddMore && showUrl
            ? html`
              <div class="url-row">
                <input
                  class="url-input np-input" part="input"
                  type="url"
                  placeholder=${m.urlPlaceholder}
                  .value=${this._urlInput}
                  @input=${(e: Event) => {
                    this._urlInput = (e.target as HTMLInputElement).value;
                  }}
                  @keypress=${this._handleUrlKeypress}
                />
              </div>
            `
            : nothing
        }
        ${this._uploading ? this._renderUploadStatus() : nothing}
        ${this._uploadError ? html`<div class="np-message np-error" part="error">${this._uploadError}</div>` : nothing}

        <div class="np-hint" part="hint">${m.fileCount(this._urls.length, this._maxFiles)}</div>
      </div>
    `;
  }

  /** The running upload: progress, what's happening (also retries), and Cancel */
  private _renderUploadStatus() {
    return html`
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${this._uploadProgress ?? 0}%"></div>
      </div>
      <div class="upload-status" role="status">
        ${this._uploading}
        ${this._uploadProgress === undefined ? nothing : `${this._uploadProgress}%`}
        ${this._uploadDetail ? html`· ${this._uploadDetail}` : nothing}
        <button type="button" class="np-button np-text np-small" part="button" @click=${() => this._abort?.abort()}>
          ${this._m.cancel}
        </button>
      </div>
    `;
  }

  private _renderUploadLater() {
    const m = this._m;
    return html`
      <label class="upload-later np-checkbox">
        <input
          type="checkbox"
          .checked=${this._uploadLater}
          @change=${(e: Event) => {
            this._uploadLater = (e.target as HTMLInputElement).checked;
            this._uploadNote = '';
            rememberUploadLater(this._uploadLater);
          }}
        />
        ${m.uploadLater}
      </label>
      <span class="np-hint" part="hint">${this._uploadNote || (this._uploadLater ? m.uploadLaterHint : '')}</span>
    `;
  }

  private _renderQuality() {
    const m = this._m;
    const selected = isMediaQuality(this._quality) ? this._quality : uploadQuality(this._config);
    return html`
      <label class="quality">
        ${m.quality}
        <select
          class="np-input"
          part="input"
          ?disabled=${this._uploading !== ''}
          @change=${(e: Event) => this._pickQuality((e.target as HTMLSelectElement).value)}
        >
          ${MEDIA_QUALITIES.map(
            (q) =>
              html`<option value=${q} ?selected=${q === selected}>${m.qualityLevels[q]}</option>`
          )}
        </select>
      </label>
      <span class="np-hint" part="hint">
        ${m.qualityDescription(selected, MEDIA_QUALITY_PRESETS[selected]?.maxSide)}
      </span>
    `;
  }

  private _renderGallery() {
    const m = this._m;
    return html`
      <div class="gallery">
        ${this._urls.map(
          (url, i) => html`
            <div class="gallery-item">
            <div class="gallery-card">
              ${
                isImageUrl(url)
                  ? html`<img src=${previewUrl(url)} alt="Media ${i + 1}" />`
                  : isVideoUrl(url)
                    ? html`
                      <video src=${url} muted></video>
                      <span class="badge">▶</span>
                    `
                    : html`<div class="placeholder">
                      ${url.length > 30 ? `${url.slice(0, 27)}…` : url}
                    </div>`
              }
              <button
                type="button"
                class="remove-btn" part="button"
                title=${m.remove}
                aria-label=${m.remove}
                @click=${() => this._removeUrl(i)}
              >
                ×
              </button>
            </div>
            ${this._config.alt && isImageUrl(url) ? this._renderAlt(url) : nothing}
            </div>
          `
        )}
      </div>
    `;
  }

  /** The photo's description, kept for its `imeta` tag (`alt`) */
  private _renderAlt(url: string) {
    const m = this._m;
    return html`<input
      class="alt-input np-input" part="input"
      type="text"
      .value=${mediaFileOf(url).alt ?? ''}
      placeholder=${m.altPlaceholder}
      aria-label=${m.altLabel}
      @change=${(e: Event) => {
        rememberMediaFile({ url, alt: (e.target as HTMLInputElement).value.trim() });
        this._emitValue([...this._urls]);
      }}
    />`;
  }

  private _renderDropZone() {
    const m = this._m;
    // The user's own servers come first once they're known; without them, the field's first
    const [first] = uploadTargets(this._config);
    const host = first ? targetHost(first) : '';
    return html`
      <div
        class="drop-zone ${this._dragover ? 'dragover' : ''} ${this._uploading ? 'uploading' : ''}"
        @dragover=${this._handleDragOver}
        @dragleave=${this._handleDragLeave}
        @drop=${this._handleDrop}
        @click=${this._openFilePicker}
        @keydown=${(e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') this._openFilePicker();
        }}
        tabindex="0"
        role="button"
      >
        <div class="drop-icon">📷</div>
        <p class="drop-text">${m.dropFiles}</p>
        <p class="drop-hint">${m.dropHint(host, this._maxMb)}</p>
        <input
          class="file-input"
          type="file"
          accept=${this._accept}
          multiple
          @change=${this._handleFileSelected}
        />
      </div>
      ${renderCameraButtons(this._accept, m, (files) => void this._uploadFiles(files))}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-media-input': NpMediaInput;
  }
}

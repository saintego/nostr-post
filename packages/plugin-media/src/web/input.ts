/**
 * @nostr-post/plugin-media - <np-media-input>
 *
 * Multi-file media upload / URL input with drag & drop, gallery, and preview.
 * Uploads files to nostr.build (free Nostr media hosting).
 *
 * Accepts .value (string[]) and .field (PostField).
 * Dispatches 'np-value-changed' with { detail: { value: string[] } }.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { type MediaPluginConfig, isImageUrl, isVideoUrl, toArray } from '../core';

const NOSTR_BUILD_UPLOAD = 'https://nostr.build/api/v2/upload/files';

/**
 * Create a NIP-98 HTTP Auth token for file uploads.
 */
async function createNip98AuthToken(url: string, method: string): Promise<string | null> {
  const nostr = (
    window as unknown as {
      nostr?: {
        getPublicKey(): Promise<string>;
        signEvent(e: unknown): Promise<unknown>;
      };
    }
  ).nostr;
  if (!nostr) return null;

  try {
    const pubkey = await nostr.getPublicKey();
    const unsignedEvent = {
      kind: 27235,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['u', url],
        ['method', method],
      ],
      content: '',
      pubkey,
    };

    const signedEvent = await nostr.signEvent(unsignedEvent);
    return btoa(JSON.stringify(signedEvent));
  } catch (err) {
    console.warn('NIP-98 auth failed:', err);
    return null;
  }
}

@customElement('np-media-input')
export class NpMediaInput extends LitElement {
  static styles = css`
    :host { display: block; }
    .container { display: flex; flex-direction: column; gap: 0.75rem; }

    /* Gallery */
    .gallery { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .gallery-card {
      position: relative; border: 1px solid #e5e7eb; border-radius: 6px;
      overflow: hidden; width: 120px; height: 90px; background: #f3f4f6;
    }
    .gallery-card img, .gallery-card video {
      width: 100%; height: 100%; object-fit: cover;
    }
    .gallery-card .badge {
      position: absolute; bottom: 4px; left: 4px; background: rgba(0,0,0,0.6);
      color: #fff; padding: 0 4px; border-radius: 3px; font-size: 0.7rem;
    }
    .gallery-card .placeholder {
      width: 100%; height: 100%; display: flex; align-items: center;
      justify-content: center; font-size: 0.7rem; color: #6b7280;
      padding: 0.25rem; word-break: break-all; text-align: center;
    }
    .gallery-card .remove-btn {
      position: absolute; top: 2px; right: 2px;
      background: rgba(0,0,0,0.6); color: #fff; border: none;
      border-radius: 50%; width: 22px; height: 22px;
      cursor: pointer; font-size: 0.8rem; line-height: 1;
      display: flex; align-items: center; justify-content: center;
    }
    .gallery-card .remove-btn:hover { background: rgba(220, 38, 38, 0.8); }

    /* Drop zone */
    .drop-zone {
      border: 2px dashed #d1d5db; border-radius: 8px;
      padding: 1.5rem 1rem; text-align: center; cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
    }
    .drop-zone:hover, .drop-zone.dragover {
      border-color: #6366f1; background: rgba(99, 102, 241, 0.04);
    }
    .drop-zone.uploading { border-color: #a5b4fc; opacity: 0.7; pointer-events: none; }
    .drop-icon { font-size: 1.75rem; margin-bottom: 0.25rem; }
    .drop-text { font-size: 0.875rem; color: #6b7280; margin: 0; }
    .drop-hint { font-size: 0.75rem; color: #9ca3af; margin: 0.25rem 0 0; }
    .file-input { display: none; }

    /* URL input */
    .url-row { display: flex; gap: 0.5rem; align-items: center; }
    .separator {
      font-size: 0.75rem; color: #9ca3af; text-transform: uppercase;
      font-weight: 600; letter-spacing: 0.05em;
    }
    .url-input {
      flex: 1; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db;
      border-radius: 6px; font-size: 0.875rem; outline: none; transition: border-color 0.15s;
    }
    .url-input:focus { border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15); }

    /* Progress & status */
    .progress-bar { height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden; }
    .progress-fill { height: 100%; background: #6366f1; transition: width 0.3s; border-radius: 2px; }
    .upload-status { font-size: 0.75rem; color: #6b7280; text-align: center; }
    .error {
      font-size: 0.8125rem; color: #dc2626; padding: 0.5rem 0.75rem;
      background: #fef2f2; border-radius: 6px; border: 1px solid #fecaca;
    }
    .hint { font-size: 0.75rem; color: #9ca3af; }
  `;

  @property({ type: Array })
  value: string[] = [];

  @property({ type: Object })
  field: PostField | null = null;

  @state() private dragover = false;
  @state() private uploading = false;
  @state() private uploadProgress = 0;
  @state() private uploadError = '';
  @state() private urlInput = '';

  private get config(): MediaPluginConfig {
    return (this.field?.metadata as MediaPluginConfig) || {};
  }

  private get accept(): string {
    return this.config.accept?.join(',') ?? 'image/*,video/*';
  }

  private get maxSize(): number {
    return this.config.maxSize ?? 10 * 1024 * 1024;
  }

  private get maxFiles(): number {
    return this.config.maxFiles ?? 10;
  }

  private get urls(): string[] {
    return toArray(this.value);
  }

  private emitValue(urls: string[]) {
    this.value = urls;
    this.dispatchEvent(
      new CustomEvent('np-value-changed', {
        detail: { value: urls },
        bubbles: true,
        composed: true,
      })
    );
  }

  private addUrl(url: string) {
    if (this.urls.length >= this.maxFiles) return;
    this.emitValue([...this.urls, url]);
  }

  private removeUrl(index: number) {
    const next = this.urls.filter((_, i) => i !== index);
    this.emitValue(next);
  }

  // --- Drag & Drop ---

  private handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.dragover = true;
  }

  private handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.dragover = false;
  }

  private handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.dragover = false;
    const files = e.dataTransfer?.files;
    if (files) {
      const remaining = this.maxFiles - this.urls.length;
      const batch = Array.from(files).slice(0, remaining);
      for (const file of batch) {
        this.uploadFile(file);
      }
    }
  }

  private openFilePicker() {
    (this.shadowRoot?.querySelector('.file-input') as HTMLInputElement)?.click();
  }

  private handleFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      const remaining = this.maxFiles - this.urls.length;
      const batch = Array.from(input.files).slice(0, remaining);
      for (const file of batch) {
        this.uploadFile(file);
      }
      input.value = '';
    }
  }

  // --- Upload ---

  private async uploadFile(file: File) {
    if (file.size > this.maxSize) {
      this.uploadError = `File too large (max ${Math.round(this.maxSize / (1024 * 1024))}MB)`;
      return;
    }

    this.uploading = true;
    this.uploadProgress = 0;
    this.uploadError = '';

    try {
      const uploadUrl = this.config.uploadUrl ?? NOSTR_BUILD_UPLOAD;
      const formData = new FormData();
      formData.append('file', file);
      const authToken = await createNip98AuthToken(uploadUrl, 'POST');

      const xhr = new XMLHttpRequest();
      const uploadPromise = new Promise<string>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            this.uploadProgress = Math.round((e.loaded / e.total) * 100);
          }
        });
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const resp = JSON.parse(xhr.responseText);
              const url = resp?.data?.[0]?.url ?? resp?.url ?? resp?.data?.url;
              if (url) resolve(url);
              else reject(new Error('No URL in upload response'));
            } catch {
              reject(new Error('Invalid upload response'));
            }
          } else {
            reject(new Error(`Upload failed (HTTP ${xhr.status})`));
          }
        });
        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));
      });

      xhr.open('POST', uploadUrl);
      if (authToken) xhr.setRequestHeader('Authorization', `Nostr ${authToken}`);
      xhr.send(formData);

      const url = await uploadPromise;
      this.addUrl(url);
    } catch (err) {
      this.uploadError = err instanceof Error ? err.message : 'Upload failed';
    } finally {
      this.uploading = false;
      this.uploadProgress = 0;
    }
  }

  // --- URL input ---

  private handleUrlKeypress(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.applyUrl();
    }
  }

  private applyUrl() {
    const url = this.urlInput.trim();
    if (url) {
      this.addUrl(url);
      this.urlInput = '';
    }
  }

  render() {
    const showUpload = this.config.allowUpload !== false;
    const showUrl = this.config.allowUrl !== false;
    const canAddMore = this.urls.length < this.maxFiles;

    return html`
      <div class="container">
        ${this.urls.length > 0 ? this.renderGallery() : nothing}

        ${
          canAddMore
            ? html`
          ${showUpload ? this.renderDropZone() : nothing}
          ${showUpload && showUrl ? html`<div class="url-row"><span class="separator">or</span></div>` : nothing}
          ${
            showUrl
              ? html`
            <div class="url-row">
              <input
                class="url-input" type="url"
                placeholder="Paste a URL and press Enter"
                .value=${this.urlInput}
                @input=${(e: Event) => {
                  this.urlInput = (e.target as HTMLInputElement).value;
                }}
                @keypress=${this.handleUrlKeypress}
              />
            </div>
          `
              : nothing
          }
        `
            : nothing
        }

        ${
          this.uploading
            ? html`
          <div class="progress-bar"><div class="progress-fill" style="width: ${this.uploadProgress}%"></div></div>
          <div class="upload-status">Uploading... ${this.uploadProgress}%</div>
        `
            : nothing
        }
        ${this.uploadError ? html`<div class="error">${this.uploadError}</div>` : nothing}

        <div class="hint">${this.urls.length}/${this.maxFiles} files</div>
      </div>
    `;
  }

  private renderGallery() {
    return html`
      <div class="gallery">
        ${this.urls.map(
          (url, i) => html`
            <div class="gallery-card">
              ${
                isImageUrl(url)
                  ? html`<img src=${url} alt="Media ${i + 1}" />`
                  : isVideoUrl(url)
                    ? html`
                    <video src=${url} muted></video>
                    <span class="badge">▶</span>
                  `
                    : html`<div class="placeholder">${url.length > 30 ? `${url.slice(0, 27)}…` : url}</div>`
              }
              <button type="button" class="remove-btn" title="Remove" @click=${() => this.removeUrl(i)}>×</button>
            </div>
          `
        )}
      </div>
    `;
  }

  private renderDropZone() {
    return html`
      <div
        class="drop-zone ${this.dragover ? 'dragover' : ''} ${this.uploading ? 'uploading' : ''}"
        @dragover=${this.handleDragOver} @dragleave=${this.handleDragLeave}
        @drop=${this.handleDrop} @click=${this.openFilePicker}
      >
        <div class="drop-icon">📷</div>
        <p class="drop-text">Drop files here, or click to browse</p>
        <p class="drop-hint">Uploads to nostr.build (max ${Math.round(this.maxSize / (1024 * 1024))}MB each)</p>
        <input class="file-input" type="file" accept=${this.accept} multiple @change=${this.handleFileSelected} />
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-media-input': NpMediaInput;
  }
}

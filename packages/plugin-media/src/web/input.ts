/**
 * @nostr-post/plugin-media - <np-media-input>
 *
 * Media upload / URL input with drag & drop, file picker, and preview.
 * Uploads files to nostr.build (free Nostr media hosting).
 *
 * Accepts .value (URL string) and .field (PostField).
 * Dispatches 'np-value-changed' with { detail: { value: string } }.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { MediaPluginConfig } from '../core';

const NOSTR_BUILD_UPLOAD = 'https://nostr.build/api/v2/upload/files';

/**
 * Create a NIP-98 HTTP Auth token for file uploads.
 * Signs a kind 27235 event with the target URL and method,
 * then returns it as a base64-encoded Authorization header value.
 */
async function createNip98AuthToken(url: string, method: string): Promise<string | null> {
  const nostr = (
    window as unknown as {
      nostr?: { getPublicKey(): Promise<string>; signEvent(e: unknown): Promise<unknown> };
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
    // Base64-encode the signed event JSON for the Authorization header
    return btoa(JSON.stringify(signedEvent));
  } catch (err) {
    console.warn('NIP-98 auth failed:', err);
    return null;
  }
}

@customElement('np-media-input')
export class NpMediaInput extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .container {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    /* Drop zone */
    .drop-zone {
      border: 2px dashed #d1d5db;
      border-radius: 8px;
      padding: 2rem 1rem;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
      position: relative;
    }

    .drop-zone:hover,
    .drop-zone.dragover {
      border-color: #6366f1;
      background: rgba(99, 102, 241, 0.04);
    }

    .drop-zone.uploading {
      border-color: #a5b4fc;
      opacity: 0.7;
      pointer-events: none;
    }

    .drop-icon {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }

    .drop-text {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0;
    }

    .drop-hint {
      font-size: 0.75rem;
      color: #9ca3af;
      margin: 0.25rem 0 0;
    }

    .file-input {
      display: none;
    }

    /* URL input row */
    .url-row {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .url-row .separator {
      font-size: 0.75rem;
      color: #9ca3af;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.05em;
    }

    .url-input {
      flex: 1;
      padding: 0.5rem 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 0.875rem;
      outline: none;
      transition: border-color 0.15s;
    }

    .url-input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
    }

    /* Preview */
    .preview {
      position: relative;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e5e7eb;
      background: #f9fafb;
    }

    .preview img,
    .preview video {
      display: block;
      max-width: 100%;
      max-height: 300px;
      object-fit: contain;
      margin: 0 auto;
    }

    .preview-remove {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: none;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      font-size: 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      transition: background 0.15s;
    }

    .preview-remove:hover {
      background: rgba(220, 38, 38, 0.8);
    }

    .preview-url {
      padding: 0.5rem 0.75rem;
      font-size: 0.75rem;
      color: #6b7280;
      background: #f3f4f6;
      word-break: break-all;
      font-family: monospace;
    }

    /* Progress */
    .progress-bar {
      height: 4px;
      background: #e5e7eb;
      border-radius: 2px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: #6366f1;
      transition: width 0.3s;
      border-radius: 2px;
    }

    .upload-status {
      font-size: 0.75rem;
      color: #6b7280;
      text-align: center;
    }

    .error {
      font-size: 0.8125rem;
      color: #dc2626;
      padding: 0.5rem 0.75rem;
      background: #fef2f2;
      border-radius: 6px;
      border: 1px solid #fecaca;
    }
  `;

  @property({ type: String })
  value = '';

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
    return this.config.accept ?? 'image/*,video/*';
  }

  private get maxSize(): number {
    return this.config.maxSize ?? 10 * 1024 * 1024; // 10MB
  }

  private get isVideo(): boolean {
    if (!this.value) return false;
    return /\.(mp4|webm|mov|avi|mkv)(\?.*)?$/i.test(this.value);
  }

  private emitValue(url: string) {
    this.value = url;
    this.dispatchEvent(
      new CustomEvent('np-value-changed', {
        detail: { value: url },
        bubbles: true,
        composed: true,
      })
    );
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
    if (files && files.length > 0) {
      this.uploadFile(files[0]);
    }
  }

  // --- File picker ---

  private openFilePicker() {
    const input = this.shadowRoot?.querySelector('.file-input') as HTMLInputElement;
    input?.click();
  }

  private handleFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadFile(input.files[0]);
      input.value = ''; // reset so same file can be re-selected
    }
  }

  // --- Upload ---

  private async uploadFile(file: File) {
    // Validate size
    if (file.size > this.maxSize) {
      const maxMB = Math.round(this.maxSize / (1024 * 1024));
      this.uploadError = `File too large (max ${maxMB}MB)`;
      return;
    }

    this.uploading = true;
    this.uploadProgress = 0;
    this.uploadError = '';

    try {
      const uploadUrl = this.config.uploadUrl ?? NOSTR_BUILD_UPLOAD;
      const formData = new FormData();
      formData.append('file', file);

      // Create NIP-98 auth token for nostr.build
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
              // nostr.build response: { status: "success", data: [{ url: "..." }] }
              const url = resp?.data?.[0]?.url ?? resp?.url ?? resp?.data?.url;
              if (url) {
                resolve(url);
              } else {
                reject(new Error('No URL in upload response'));
              }
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
      if (authToken) {
        xhr.setRequestHeader('Authorization', `Nostr ${authToken}`);
      }
      xhr.send(formData);

      const url = await uploadPromise;
      this.emitValue(url);
      this.urlInput = url;
    } catch (err) {
      this.uploadError = err instanceof Error ? err.message : 'Upload failed';
    } finally {
      this.uploading = false;
      this.uploadProgress = 0;
    }
  }

  // --- URL input ---

  private handleUrlInput(e: Event) {
    this.urlInput = (e.target as HTMLInputElement).value;
  }

  private handleUrlKeypress(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.applyUrl();
    }
  }

  private handleUrlBlur() {
    if (this.urlInput.trim()) {
      this.applyUrl();
    }
  }

  private applyUrl() {
    const url = this.urlInput.trim();
    if (url) {
      this.emitValue(url);
    }
  }

  // --- Remove ---

  private removeMedia() {
    this.urlInput = '';
    this.uploadError = '';
    this.emitValue('');
  }

  render() {
    const showUpload = this.config.allowUpload !== false;
    const showUrl = this.config.allowUrl !== false;

    return html`
      <div class="container">
        ${
          this.value
            ? this.renderPreview()
            : html`
            ${showUpload ? this.renderDropZone() : nothing}

            ${
              showUpload && showUrl
                ? html`<div class="url-row"><span class="separator">or</span></div>`
                : nothing
            }

            ${showUrl ? this.renderUrlInput() : nothing}
          `
        }

        ${
          this.uploading
            ? html`
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${this.uploadProgress}%"></div>
            </div>
            <div class="upload-status">Uploading... ${this.uploadProgress}%</div>
          `
            : nothing
        }

        ${this.uploadError ? html`<div class="error">${this.uploadError}</div>` : nothing}
      </div>
    `;
  }

  private renderDropZone() {
    return html`
      <div
        class="drop-zone ${this.dragover ? 'dragover' : ''} ${this.uploading ? 'uploading' : ''}"
        @dragover=${this.handleDragOver}
        @dragleave=${this.handleDragLeave}
        @drop=${this.handleDrop}
        @click=${this.openFilePicker}
      >
        <div class="drop-icon">📷</div>
        <p class="drop-text">Drop an image or video here, or click to browse</p>
        <p class="drop-hint">Uploads to nostr.build (max ${Math.round(this.maxSize / (1024 * 1024))}MB)</p>
        <input
          class="file-input"
          type="file"
          accept=${this.accept}
          @change=${this.handleFileSelected}
        >
      </div>
    `;
  }

  private renderUrlInput() {
    return html`
      <div class="url-row">
        <input
          class="url-input"
          type="url"
          placeholder="https://example.com/image.jpg"
          .value=${this.urlInput}
          @input=${this.handleUrlInput}
          @keypress=${this.handleUrlKeypress}
          @blur=${this.handleUrlBlur}
        >
      </div>
    `;
  }

  private renderPreview() {
    return html`
      <div class="preview">
        ${
          this.isVideo
            ? html`<video src=${this.value} controls preload="metadata"></video>`
            : html`<img src=${this.value} alt="Media preview" @error=${this.handleImageError}>`
        }
        <button
          type="button"
          class="preview-remove"
          title="Remove media"
          @click=${this.removeMedia}
        >✕</button>
        <div class="preview-url">${this.value}</div>
      </div>
    `;
  }

  private handleImageError() {
    // If image fails to load, it might be a non-image URL — just show as-is
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-media-input': NpMediaInput;
  }
}

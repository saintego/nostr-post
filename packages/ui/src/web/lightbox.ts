/**
 * <np-lightbox>: photos and videos opened large, one at a time, with previous and next
 * (buttons, arrow keys, swiping), "3 / 12", full screen and close. `.slides` are what it shows;
 * `open(index)` opens it. Used by plugin-media's <np-media-gallery> and <np-media-view> (a post's
 * photos, e.g. an event's image); apps can use it for their own pictures.
 */

import { html, nothing, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { slideIndex } from '../slides';
import { DEFAULT_LIGHTBOX_MESSAGES, type LightboxMessages } from './lightboxMessages';
import { lightboxStyles } from './lightboxStyles';
import { NpElement } from './npElement';
import { npStyles } from './styles';

export { DEFAULT_LIGHTBOX_MESSAGES, type LightboxMessages } from './lightboxMessages';

/** One photo or video of a lightbox */
export interface LightboxSlide {
  url: string;
  media: 'image' | 'video';
  alt?: string;
  /** A video's thumbnail */
  poster?: string;
  /** Shown under it, e.g. who posted it and a link to the post */
  caption?: TemplateResult | string;
}

/** Horizontal distance (px) a swipe needs to change the slide */
const SWIPE_PX = 40;

@customElement('np-lightbox')
export class NpLightbox extends NpElement {
  static override styles = [...npStyles, lightboxStyles];

  @property({ attribute: false }) slides: LightboxSlide[] = [];
  @property({ attribute: false }) messages?: Partial<LightboxMessages>;

  /** The slide shown; undefined while closed */
  @state() _index?: number;
  @query('dialog') _dialog?: HTMLDialogElement;
  _touchX?: number;

  get _m(): LightboxMessages {
    return { ...DEFAULT_LIGHTBOX_MESSAGES, ...this.messages };
  }

  /** Opens the slide at `index` */
  async open(index = 0): Promise<void> {
    this._index = slideIndex(index, 0, this.slides.length);
    await this.updateComplete;
    if (!this._dialog?.open) this._dialog?.showModal();
  }

  close(): void {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    this._dialog?.close();
  }

  _go(step: number): void {
    if (this._index !== undefined) this._index = slideIndex(this._index, step, this.slides.length);
  }

  _onKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowRight') this._go(1);
    else if (e.key === 'ArrowLeft') this._go(-1);
    else return;
    e.preventDefault();
  }

  _onTouchEnd(e: TouchEvent): void {
    const start = this._touchX;
    const end = e.changedTouches[0]?.clientX;
    this._touchX = undefined;
    if (start === undefined || end === undefined || Math.abs(end - start) < SWIPE_PX) return;
    this._go(end < start ? 1 : -1);
  }

  _fullScreen(): void {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void this._dialog?.requestFullscreen?.().catch(() => undefined);
  }

  _renderSlide(slide: LightboxSlide) {
    return slide.media === 'video'
      ? html`<video src=${slide.url} poster=${slide.poster ?? nothing} controls autoplay playsinline></video>`
      : html`<img src=${slide.url} alt=${slide.alt ?? ''} referrerpolicy="no-referrer" />`;
  }

  override render() {
    const m = this._m;
    const slide = this._index === undefined ? undefined : this.slides[this._index];
    const several = this.slides.length > 1;
    return html`<dialog
      class="np-dialog"
      part="dialog"
      aria-label=${m.label}
      @close=${() => {
        this._index = undefined;
      }}
      @keydown=${(e: KeyboardEvent) => this._onKey(e)}
      @touchstart=${(e: TouchEvent) => {
        this._touchX = e.touches[0]?.clientX;
      }}
      @touchend=${(e: TouchEvent) => this._onTouchEnd(e)}
    >
      ${
        slide
          ? html`<figure class="slide">
              <div class="stage">
                ${this._renderSlide(slide)}
                ${
                  several
                    ? html`<button type="button" class="nav prev np-icon-button" part="button" aria-label=${m.previous} @click=${() => this._go(-1)}>‹</button>
                      <button type="button" class="nav next np-icon-button" part="button" aria-label=${m.next} @click=${() => this._go(1)}>›</button>`
                    : nothing
                }
              </div>
              <figcaption>
                ${slide.alt ? html`<div class="alt">${slide.alt}</div>` : nothing}
                ${slide.caption ?? nothing}
                <span class="tools">
                  ${several ? html`<span class="count np-hint">${m.position((this._index ?? 0) + 1, this.slides.length)}</span>` : nothing}
                  <button type="button" class="np-button np-text np-small" part="button" @click=${() => this._fullScreen()}>${m.fullScreen}</button>
                  <button type="button" class="close np-button np-text np-small" part="button" @click=${() => this.close()}>${m.close}</button>
                </span>
              </figcaption>
            </figure>`
          : nothing
      }
    </dialog>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-lightbox': NpLightbox;
  }
}

/**
 * @nostr-post/plugin-markdown - <np-markdown-input>
 *
 * Markdown editor with toggle between raw markdown and WYSIWYG.
 * WYSIWYG uses contenteditable with toolbar for formatting.
 * Raw mode is a plain textarea.
 *
 * The canonical value is always markdown text.
 * In WYSIWYG mode, HTML from contenteditable is converted back to markdown.
 *
 * Accepts .value (string) and .field (PostField).
 * Dispatches 'np-value-changed' with { detail: { value: string } }.
 */

import type { PostField } from '@nostr-post/plugins/types';
import { NpElement, npStyles } from '@nostr-post/ui/web';
import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { MarkdownPluginConfig } from '../core';
import { renderMarkdown } from '../render';
import { markdownInputStyles } from './inputStyles';

type EditorMode = 'raw' | 'wysiwyg';

// ---- Markdown <-> HTML for the WYSIWYG editor ----

/** The editor's HTML of the value: the same safe HTML as the view (`renderMarkdown`) */
const markdownToHtml = renderMarkdown;

/** A list item as Markdown: numbered in an ordered list, else a bullet */
const listItem = (el: HTMLElement, inner: string): string => {
  const list = el.parentElement;
  return list?.tagName.toLowerCase() === 'ol'
    ? `${Array.from(list.children).indexOf(el) + 1}. ${inner}\n`
    : `- ${inner}\n`;
};

function htmlToMarkdown(htmlStr: string): string {
  if (!htmlStr) return '';

  // Parsed in a template: inert, so nothing in pasted HTML loads or runs
  const tmp = document.createElement('template');
  tmp.innerHTML = htmlStr;

  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent ?? '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const inner = Array.from(el.childNodes).map(walk).join('');

    switch (tag) {
      case 'h1':
        return `# ${inner}\n`;
      case 'h2':
        return `## ${inner}\n`;
      case 'h3':
        return `### ${inner}\n`;
      case 'strong':
      case 'b':
        return `**${inner}**`;
      case 'em':
      case 'i':
        return `*${inner}*`;
      case 's':
      case 'strike':
      case 'del':
        return `~~${inner}~~`;
      case 'code':
        if (el.parentElement?.tagName.toLowerCase() === 'pre') return inner;
        return `\`${inner}\``;
      case 'pre':
        return `\`\`\`\n${inner}\n\`\`\`\n`;
      case 'a':
        return `[${inner}](${el.getAttribute('href') ?? ''})`;
      case 'img':
        return `![${el.getAttribute('alt') ?? ''}](${el.getAttribute('src') ?? ''})`;
      case 'blockquote':
        return `${inner
          .split('\n')
          .map((l) => (l ? `> ${l}` : ''))
          .join('\n')}\n`;
      case 'ul':
      case 'ol':
        return `${inner}\n`;
      case 'li':
        return listItem(el, inner);
      case 'hr':
        return '---\n';
      case 'br':
        return '\n';
      case 'p':
      case 'div':
        return `${inner}\n`;
      default:
        return inner;
    }
  }

  let result = Array.from(tmp.content.childNodes).map(walk).join('');
  // Trim trailing whitespace but keep single trailing newline
  result = result.replace(/\n{3,}/g, '\n\n').trim();
  return result;
}

@customElement('np-markdown-input')
export class NpMarkdownInput extends NpElement {
  static override styles = [...npStyles, markdownInputStyles];

  /** Composers pass `undefined` for an empty field */
  @property({ type: String })
  value: string | undefined = '';

  @property({ type: Object })
  field: PostField | null = null;

  @state() private mode: EditorMode = 'wysiwyg';
  @state() private editorHtml = '';

  private get config(): MarkdownPluginConfig {
    return (this.field?.metadata as MarkdownPluginConfig) || {};
  }

  connectedCallback() {
    super.connectedCallback();
    this.mode = this.config.defaultMode ?? 'wysiwyg';
    // Initialize HTML from markdown value
    if (this.value) {
      this.editorHtml = markdownToHtml(this.value ?? '');
    }
  }

  updated(changed: Map<PropertyKey, unknown>) {
    // If value is set externally, sync editor
    if (changed.has('value') && !this._internalUpdate) {
      this.editorHtml = markdownToHtml(this.value ?? '');
      const editor = this.shadowRoot?.querySelector('.editor') as HTMLElement;
      if (editor && this.mode === 'wysiwyg') {
        editor.innerHTML = this.editorHtml;
      }
    }
    // Set min-height from config
    const minH = this.config.minHeight ?? 200;
    const editor = this.shadowRoot?.querySelector('.editor, .raw-editor') as HTMLElement;
    if (editor) {
      editor.style.minHeight = `${minH}px`;
    }
  }

  private _internalUpdate = false;

  private emitValue(md: string) {
    this._internalUpdate = true;
    this.value = md;
    this.dispatchEvent(
      new CustomEvent('np-value-changed', {
        detail: { value: md },
        bubbles: true,
        composed: true,
      })
    );
    // Reset flag after microtask
    queueMicrotask(() => {
      this._internalUpdate = false;
    });
  }

  // ---- Mode switching ----

  private switchMode(newMode: EditorMode) {
    if (newMode === this.mode) return;

    if (newMode === 'raw') {
      // WYSIWYG -> Raw: convert current HTML to markdown
      const editor = this.shadowRoot?.querySelector('.editor') as HTMLElement;
      if (editor) {
        const md = htmlToMarkdown(editor.innerHTML);
        this.value = md;
        this.emitValue(md);
      }
    } else {
      // Raw -> WYSIWYG: convert markdown to HTML
      this.editorHtml = markdownToHtml(this.value ?? '');
    }

    this.mode = newMode;
  }

  // ---- Toolbar actions ----

  private execCommand(command: string, value?: string) {
    document.execCommand(command, false, value);
    // Focus back on editor
    const editor = this.shadowRoot?.querySelector('.editor') as HTMLElement;
    editor?.focus();
    // Sync value
    this.syncWysiwygToMarkdown();
  }

  private insertHeading(level: number) {
    const tag = `h${level}`;
    document.execCommand('formatBlock', false, tag);
    this.syncWysiwygToMarkdown();
  }

  private insertLink() {
    const url = prompt('Enter URL:');
    if (url) {
      document.execCommand('createLink', false, url);
      this.syncWysiwygToMarkdown();
    }
  }

  private insertCodeBlock() {
    document.execCommand('formatBlock', false, 'pre');
    this.syncWysiwygToMarkdown();
  }

  private insertHR() {
    document.execCommand('insertHorizontalRule');
    this.syncWysiwygToMarkdown();
  }

  private syncWysiwygToMarkdown() {
    const editor = this.shadowRoot?.querySelector('.editor') as HTMLElement;
    if (!editor) return;
    const md = htmlToMarkdown(editor.innerHTML);
    this.emitValue(md);
  }

  // ---- Handlers ----

  private handleWysiwygInput() {
    this.syncWysiwygToMarkdown();
  }

  private handleRawInput(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    this.emitValue(textarea.value);
  }

  render() {
    const placeholder = this.config.placeholder ?? 'Write your content...';

    return html`
      <div class="container" part="input">
        ${this.renderToolbar()}
        ${
          this.mode === 'wysiwyg'
            ? html`
              <div
                class="editor"
                contenteditable="true"
                @input=${this.handleWysiwygInput}
                data-placeholder=${placeholder}
                .innerHTML=${this.editorHtml}
              ></div>
            `
            : html`
              <textarea
                class="raw-editor"
                placeholder=${placeholder}
                .value=${this.value ?? ''}
                @input=${this.handleRawInput}
              ></textarea>
            `
        }

        <div class="footer">
          <span>${(this.value ?? '').length} chars</span>
          <span>Markdown</span>
        </div>
      </div>
    `;
  }

  private renderToolbar() {
    const isWysiwyg = this.mode === 'wysiwyg';

    return html`
      <div class="toolbar">
        ${
          isWysiwyg
            ? html`
              <button
                type="button"
                class="toolbar-btn np-icon-button" part="button"
                title="Bold (Ctrl+B)"
                @click=${() => this.execCommand('bold')}
              >
                B
              </button>
              <button
                type="button"
                class="toolbar-btn np-icon-button" part="button"
                title="Italic (Ctrl+I)"
                @click=${() => this.execCommand('italic')}
                style="font-style:italic"
              >
                I
              </button>
              <button
                type="button"
                class="toolbar-btn np-icon-button" part="button"
                title="Strikethrough"
                @click=${() => this.execCommand('strikeThrough')}
                style="text-decoration:line-through"
              >
                S
              </button>
              <div class="toolbar-sep"></div>
              <button
                type="button"
                class="toolbar-btn np-icon-button" part="button"
                title="Heading 1"
                @click=${() => this.insertHeading(1)}
              >
                H1
              </button>
              <button
                type="button"
                class="toolbar-btn np-icon-button" part="button"
                title="Heading 2"
                @click=${() => this.insertHeading(2)}
              >
                H2
              </button>
              <button
                type="button"
                class="toolbar-btn np-icon-button" part="button"
                title="Heading 3"
                @click=${() => this.insertHeading(3)}
              >
                H3
              </button>
              <div class="toolbar-sep"></div>
              <button
                type="button"
                class="toolbar-btn np-icon-button" part="button"
                title="Unordered list"
                @click=${() => this.execCommand('insertUnorderedList')}
              >
                •
              </button>
              <button
                type="button"
                class="toolbar-btn np-icon-button" part="button"
                title="Blockquote"
                @click=${() => this.execCommand('formatBlock', 'blockquote')}
              >
                ❝
              </button>
              <button
                type="button"
                class="toolbar-btn np-icon-button" part="button"
                title="Code block"
                @click=${this.insertCodeBlock}
              >
                ⟨⟩
              </button>
              <button
                type="button"
                class="toolbar-btn np-icon-button" part="button"
                title="Link"
                @click=${this.insertLink}
              >
                🔗
              </button>
              <button
                type="button"
                class="toolbar-btn np-icon-button" part="button"
                title="Horizontal rule"
                @click=${this.insertHR}
              >
                ―
              </button>
            `
            : nothing
        }

        <div class="toolbar-spacer"></div>

        <div class="np-segmented" role="group">
          <button
            type="button"
            class="np-segment"
            part="button"
            aria-pressed=${this.mode === 'wysiwyg'}
            @click=${() => this.switchMode('wysiwyg')}
          >
            Visual
          </button>
          <button
            type="button"
            class="np-segment"
            part="button"
            aria-pressed=${this.mode === 'raw'}
            @click=${() => this.switchMode('raw')}
          >
            Markdown
          </button>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-markdown-input': NpMarkdownInput;
  }
}

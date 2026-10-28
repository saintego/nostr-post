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
import { html, LitElement, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { MarkdownPluginConfig } from '../core';
import { markdownInputStyles } from './inputStyles';

type EditorMode = 'raw' | 'wysiwyg';

// ---- Lightweight markdown <-> HTML helpers ----

function markdownToHtml(md: string): string {
  if (!md) return '';
  let h = md;
  // Code blocks (``` ... ```)
  h = h.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  // Inline code
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Headings
  h = h.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  h = h.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  h = h.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  // Bold + Italic
  h = h.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Strikethrough
  h = h.replace(/~~(.+?)~~/g, '<s>$1</s>');
  // Links [text](url)
  h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // Images ![alt](url)
  h = h.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  // Unordered lists
  h = h.replace(/^[*-] (.+)$/gm, '<li>$1</li>');
  h = h.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  // Blockquote
  h = h.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  // Horizontal rule
  h = h.replace(/^---$/gm, '<hr>');
  // Line breaks (convert remaining newlines in non-block context)
  h = h.replace(/\n/g, '<br>');
  // Clean up extra <br> inside block elements
  h = h.replace(/<\/li><br>/g, '</li>');
  h = h.replace(/<\/ul><br>/g, '</ul>');
  h = h.replace(/<\/blockquote><br>/g, '</blockquote>');
  h = h.replace(/<\/pre><br>/g, '</pre>');
  h = h.replace(/<\/h([1-3])><br>/g, '</h$1>');
  h = h.replace(/<\/hr><br>/g, '</hr>');
  return h;
}

function htmlToMarkdown(htmlStr: string): string {
  if (!htmlStr) return '';

  // Work in a temp element to traverse DOM
  const tmp = document.createElement('div');
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
        return `- ${inner}\n`;
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

  let result = Array.from(tmp.childNodes).map(walk).join('');
  // Trim trailing whitespace but keep single trailing newline
  result = result.replace(/\n{3,}/g, '\n\n').trim();
  return result;
}

@customElement('np-markdown-input')
export class NpMarkdownInput extends LitElement {
  static styles = markdownInputStyles;

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
      <div class="container">
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
                class="toolbar-btn"
                title="Bold (Ctrl+B)"
                @click=${() => this.execCommand('bold')}
              >
                B
              </button>
              <button
                type="button"
                class="toolbar-btn"
                title="Italic (Ctrl+I)"
                @click=${() => this.execCommand('italic')}
                style="font-style:italic"
              >
                I
              </button>
              <button
                type="button"
                class="toolbar-btn"
                title="Strikethrough"
                @click=${() => this.execCommand('strikeThrough')}
                style="text-decoration:line-through"
              >
                S
              </button>
              <div class="toolbar-sep"></div>
              <button
                type="button"
                class="toolbar-btn"
                title="Heading 1"
                @click=${() => this.insertHeading(1)}
              >
                H1
              </button>
              <button
                type="button"
                class="toolbar-btn"
                title="Heading 2"
                @click=${() => this.insertHeading(2)}
              >
                H2
              </button>
              <button
                type="button"
                class="toolbar-btn"
                title="Heading 3"
                @click=${() => this.insertHeading(3)}
              >
                H3
              </button>
              <div class="toolbar-sep"></div>
              <button
                type="button"
                class="toolbar-btn"
                title="Unordered list"
                @click=${() => this.execCommand('insertUnorderedList')}
              >
                •
              </button>
              <button
                type="button"
                class="toolbar-btn"
                title="Blockquote"
                @click=${() => this.execCommand('formatBlock', 'blockquote')}
              >
                ❝
              </button>
              <button
                type="button"
                class="toolbar-btn"
                title="Code block"
                @click=${this.insertCodeBlock}
              >
                ⟨⟩
              </button>
              <button
                type="button"
                class="toolbar-btn"
                title="Link"
                @click=${this.insertLink}
              >
                🔗
              </button>
              <button
                type="button"
                class="toolbar-btn"
                title="Horizontal rule"
                @click=${this.insertHR}
              >
                ―
              </button>
            `
            : nothing
        }

        <div class="toolbar-spacer"></div>

        <button
          type="button"
          class="mode-toggle ${this.mode === 'wysiwyg' ? 'active' : ''}"
          @click=${() => this.switchMode('wysiwyg')}
        >
          Visual
        </button>
        <button
          type="button"
          class="mode-toggle ${this.mode === 'raw' ? 'active' : ''}"
          @click=${() => this.switchMode('raw')}
        >
          Markdown
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'np-markdown-input': NpMarkdownInput;
  }
}

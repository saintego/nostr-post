/**
 * @nostr-post/plugins - Markdown editor plugin
 *
 * A plugin for rich text editing with Markdown
 */

import type { NostrUIPlugin, PostField, Result, ValidationError } from './types';

export interface MarkdownPluginConfig {
  minLength?: number;
  maxLength?: number;
  allowHtml?: boolean;
}

export const markdownPlugin: NostrUIPlugin = {
  id: 'markdown',
  type: 'string',

  validate: (value: unknown, field: PostField): Result<void, ValidationError> => {
    if (typeof value !== 'string') {
      return {
        success: false,
        error: {
          field: field.id,
          message: 'Content must be a string',
          code: 'INVALID_TYPE',
        },
      };
    }

    const config = (field.metadata as MarkdownPluginConfig) || {};

    if (config.minLength && value.length < config.minLength) {
      return {
        success: false,
        error: {
          field: field.id,
          message: `Content must be at least ${config.minLength} characters`,
          code: 'TOO_SHORT',
        },
      };
    }

    if (config.maxLength && value.length > config.maxLength) {
      return {
        success: false,
        error: {
          field: field.id,
          message: `Content must not exceed ${config.maxLength} characters`,
          code: 'TOO_LONG',
        },
      };
    }

    return { success: true, data: undefined };
  },

  renderInput: (ctx): HTMLElement => {
    const textarea = document.createElement('textarea');
    textarea.value = String(ctx.value ?? '');
    textarea.style.cssText = `
      width: 100%;
      min-height: 200px;
      padding: 0.5rem;
      font-family: monospace;
      font-size: 0.875rem;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      background: white;
    `;
    textarea.addEventListener('input', (e) => {
      ctx.onChange((e.target as HTMLTextAreaElement).value);
    });
    return textarea;
  },

  renderView: (value: unknown): HTMLElement => {
    const div = document.createElement('div');
    div.style.cssText = `
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    // Simple markdown to HTML conversion
    let html = String(value ?? '');
    // Bold: **text** -> <strong>text</strong>
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic: *text* -> <em>text</em>
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Code: `text` -> <code>text</code>
    html = html.replace(
      /`([^`]+)`/g,
      '<code style="background: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>'
    );
    // Headings: ## -> <h3>, ### -> <h4>
    html = html.replace(
      /^### (.*?)$/gm,
      '<h4 style="margin: 1rem 0 0.5rem 0; font-size: 1rem;">$1</h4>'
    );
    html = html.replace(
      /^## (.*?)$/gm,
      '<h3 style="margin: 1rem 0 0.5rem 0; font-size: 1.1rem;">$1</h3>'
    );
    html = html.replace(
      /^# (.*?)$/gm,
      '<h2 style="margin: 1rem 0 0.5rem 0; font-size: 1.25rem;">$1</h2>'
    );
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    div.innerHTML = html;
    return div;
  },
};

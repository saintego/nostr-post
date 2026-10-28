/**
 * @nostr-post/plugin-markdown - Styles of <np-markdown-input>, light and dark
 */

import { css } from 'lit';

export const markdownInputStyles = css`
    :host {
      display: block;
    }

    .container {
      border: 1px solid #d1d5db;
      border-radius: 8px;
      overflow: hidden;
      background: white;
    }

    /* Toolbar */
    .toolbar {
      display: flex;
      align-items: center;
      gap: 0.125rem;
      padding: 0.375rem 0.5rem;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
      flex-wrap: wrap;
    }

    .toolbar-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: 1px solid transparent;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
      transition:
        background 0.1s,
        border-color 0.1s;
    }

    .toolbar-btn:hover {
      background: #e5e7eb;
    }

    .toolbar-btn:active {
      background: #d1d5db;
    }

    .toolbar-sep {
      width: 1px;
      height: 20px;
      background: #d1d5db;
      margin: 0 0.25rem;
    }

    .toolbar-spacer {
      flex: 1;
    }

    .mode-toggle {
      font-size: 0.75rem;
      font-weight: 500;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      border: 1px solid #d1d5db;
      background: white;
      cursor: pointer;
      color: #6b7280;
      transition: background 0.1s;
    }

    .mode-toggle:hover {
      background: #f3f4f6;
    }

    .mode-toggle.active {
      background: #6366f1;
      color: white;
      border-color: #6366f1;
    }

    /* WYSIWYG editor */
    .editor {
      min-height: 200px;
      padding: 0.75rem 1rem;
      outline: none;
      font-size: 0.9375rem;
      line-height: 1.7;
      color: #1f2937;
      overflow-y: auto;
    }

    .editor:focus {
      box-shadow: inset 0 0 0 2px rgba(99, 102, 241, 0.15);
    }

    .editor h1 {
      font-size: 1.5rem;
      margin: 0.75rem 0 0.5rem;
    }
    .editor h2 {
      font-size: 1.25rem;
      margin: 0.75rem 0 0.5rem;
    }
    .editor h3 {
      font-size: 1.125rem;
      margin: 0.75rem 0 0.5rem;
    }
    .editor strong {
      font-weight: 700;
    }
    .editor em {
      font-style: italic;
    }
    .editor code {
      background: #f3f4f6;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 0.875em;
    }
    .editor pre {
      background: #1f2937;
      color: #e5e7eb;
      padding: 0.75rem;
      border-radius: 6px;
      overflow-x: auto;
      font-family: monospace;
      font-size: 0.875rem;
    }
    .editor blockquote {
      border-left: 3px solid #d1d5db;
      padding-left: 0.75rem;
      margin: 0.5rem 0;
      color: #6b7280;
    }
    .editor a {
      color: #6366f1;
      text-decoration: underline;
    }
    .editor img {
      max-width: 100%;
      border-radius: 4px;
    }
    .editor hr {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 0.75rem 0;
    }
    .editor ul,
    .editor ol {
      padding-left: 1.5rem;
      margin: 0.25rem 0;
    }

    /* Raw textarea */
    .raw-editor {
      width: 100%;
      min-height: 200px;
      padding: 0.75rem 1rem;
      border: none;
      outline: none;
      font-family: "SF Mono", "Fira Code", "Cascadia Code", monospace;
      font-size: 0.875rem;
      line-height: 1.6;
      color: #1f2937;
      resize: vertical;
      box-sizing: border-box;
    }

    .raw-editor:focus {
      box-shadow: inset 0 0 0 2px rgba(99, 102, 241, 0.15);
    }

    /* Footer */
    .footer {
      display: flex;
      justify-content: space-between;
      padding: 0.375rem 0.75rem;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      font-size: 0.75rem;
      color: #9ca3af;
    }

    /* Dark theme (colors.dark in @nostr-post/web's theme) */
    :host-context(.dark) .container {
      background: #374151;
      border-color: #4b5563;
    }
    :host-context(.dark) .toolbar,
    :host-context(.dark) .footer {
      background: #1f2937;
      border-color: #4b5563;
    }
    :host-context(.dark) .toolbar-btn,
    :host-context(.dark) .mode-toggle {
      color: #f3f4f6;
    }
    :host-context(.dark) .toolbar-btn:hover,
    :host-context(.dark) .mode-toggle:hover {
      background: #4b5563;
    }
    :host-context(.dark) .toolbar-btn:active,
    :host-context(.dark) .toolbar-sep {
      background: #4b5563;
    }
    :host-context(.dark) .mode-toggle {
      background: #374151;
      border-color: #4b5563;
    }
    :host-context(.dark) .mode-toggle.active {
      background: #4f46e5;
      border-color: #4f46e5;
      color: white;
    }
    :host-context(.dark) .editor,
    :host-context(.dark) .raw-editor {
      background: #374151;
      color: #f3f4f6;
    }
    :host-context(.dark) .editor code {
      background: #1f2937;
    }
    :host-context(.dark) .editor pre {
      background: #111827;
    }
    :host-context(.dark) .editor blockquote {
      border-color: #4b5563;
      color: #9ca3af;
    }
    :host-context(.dark) .editor a {
      color: #a5b4fc;
    }
    :host-context(.dark) .editor hr {
      border-color: #4b5563;
    }
`;

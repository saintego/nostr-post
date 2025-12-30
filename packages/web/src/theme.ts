/**
 * @nostr-post/web - Shared theme
 *
 * Single source of truth for colors matching nostr-login design system
 */

import { css, unsafeCSS } from "lit";

/**
 * Color values - single source of truth
 */
export const colors = {
  light: {
    bg: "#ffffff",
    inputBg: "#f9fafb",
    text: "#1f2937",
    textSecondary: "#6b7280",
    border: "#d1d5db",
    primary: "#6366f1",
    primaryHover: "#4f46e5",
    error: "#dc2626",
    errorBorder: "#fca5a5",
    errorBg: "#fef2f2",
    successBg: "#d1fae5",
    successBorder: "#6ee7b7",
    successText: "#065f46",
  },
  dark: {
    bg: "#1f2937",
    inputBg: "#374151",
    text: "#f3f4f6",
    textSecondary: "#9ca3af",
    border: "#4b5563",
    primary: "#4f46e5",
    primaryHover: "#4338ca",
    error: "#fca5a5",
    errorBorder: "#dc2626",
    errorBg: "#450a0a",
    successBg: "#064e3b",
    successBorder: "#059669",
    successText: "#6ee7b7",
  },
} as const;

// Helper to use colors in css template
const u = (color: string) => unsafeCSS(color);
const c = colors;

/**
 * Base styles using theme colors
 */
export const baseStyles = css`
  :host {
    display: block;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
      Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.5;
  }

  * {
    box-sizing: border-box;
  }

  /* Error message */
  .error {
    color: ${u(c.light.error)};
    padding: 0.75rem;
    border: 1px solid ${u(c.light.errorBorder)};
    background: ${u(c.light.errorBg)};
    border-radius: 8px;
    margin: 0.5rem 0;
    font-size: 14px;
  }

  :host-context(.dark) .error {
    background: ${u(c.dark.errorBg)};
    border-color: ${u(c.dark.errorBorder)};
    color: ${u(c.dark.error)};
  }

  /* Success message */
  .success {
    padding: 0.75rem;
    background: ${u(c.light.successBg)};
    border: 1px solid ${u(c.light.successBorder)};
    border-radius: 8px;
    color: ${u(c.light.successText)};
    margin: 0.5rem 0;
    font-size: 14px;
  }

  :host-context(.dark) .success {
    background: ${u(c.dark.successBg)};
    border-color: ${u(c.dark.successBorder)};
    color: ${u(c.dark.successText)};
  }

  .loading {
    text-align: center;
    padding: 2rem;
    color: ${u(c.light.textSecondary)};
  }

  :host-context(.dark) .loading {
    color: ${u(c.dark.textSecondary)};
  }

  /* Form fields */
  .field {
    margin-bottom: 1rem;
  }

  .field label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: ${u(c.light.text)};
    font-size: 14px;
  }

  :host-context(.dark) .field label {
    color: ${u(c.dark.text)};
  }

  .field input,
  .field textarea,
  .field select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid ${u(c.light.border)};
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    background: ${u(c.light.inputBg)};
    color: ${u(c.light.text)};
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  :host-context(.dark) .field input,
  :host-context(.dark) .field textarea,
  :host-context(.dark) .field select {
    background: ${u(c.dark.inputBg)};
    border-color: ${u(c.dark.border)};
    color: ${u(c.dark.text)};
  }

  .field input:focus,
  .field textarea:focus,
  .field select:focus {
    outline: none;
    border-color: ${u(c.light.primary)};
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  :host-context(.dark) .field input:focus,
  :host-context(.dark) .field textarea:focus,
  :host-context(.dark) .field select:focus {
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
  }

  .field textarea {
    min-height: 100px;
    resize: vertical;
  }

  .field-error {
    color: ${u(c.light.error)};
    font-size: 12px;
    margin-top: 0.25rem;
  }

  :host-context(.dark) .field-error {
    color: ${u(c.dark.error)};
  }

  /* Buttons */
  button {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: ${u(c.light.bg)};
    color: ${u(c.light.text)};
    border: 1px solid ${u(c.light.border)};
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  button:hover {
    background: ${u(c.light.inputBg)};
  }

  :host-context(.dark) button {
    background: ${u(c.dark.inputBg)};
    border-color: ${u(c.dark.border)};
    color: ${u(c.dark.text)};
  }

  :host-context(.dark) button:hover {
    background: ${u(c.dark.border)};
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Primary button */
  button.primary {
    background: ${u(c.light.primary)};
    color: white;
    border-color: ${u(c.light.primary)};
  }

  button.primary:hover {
    background: ${u(c.light.primaryHover)};
    border-color: ${u(c.light.primaryHover)};
  }

  :host-context(.dark) button.primary {
    background: ${u(c.dark.primary)};
    border-color: ${u(c.dark.primary)};
  }

  :host-context(.dark) button.primary:hover {
    background: ${u(c.dark.primaryHover)};
    border-color: ${u(c.dark.primaryHover)};
  }

  .required::after {
    content: " *";
    color: ${u(c.light.error)};
  }

  :host-context(.dark) .required::after {
    color: ${u(c.dark.error)};
  }
`;

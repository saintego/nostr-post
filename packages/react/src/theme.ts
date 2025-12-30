/**
 * @nostr-post/react - Shared theme and styles
 *
 * Consistent with nostr-login and @nostr-post/web
 */

import type { CSSProperties } from "react";

/** nostr-login color palette */
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
    successBorder: "#10b981",
    successText: "#6ee7b7",
  },
} as const;

export type ColorScheme = typeof colors.light;

/**
 * Detect if dark mode is preferred
 */
export function isDarkMode(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
  );
}

/**
 * Get color scheme based on dark mode preference
 */
export function getColors(dark?: boolean): ColorScheme {
  const isDark = dark ?? isDarkMode();
  return isDark ? colors.dark : colors.light;
}

/**
 * Create base container styles
 */
export function containerStyles(c: ColorScheme): CSSProperties {
  return {
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,
    lineHeight: 1.5,
    background: c.bg,
    color: c.text,
    borderRadius: 8,
    border: `1px solid ${c.border}`,
  };
}

/**
 * Create input/textarea styles
 */
export function inputStyles(c: ColorScheme): CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    border: `1px solid ${c.border}`,
    borderRadius: 8,
    fontSize: 14,
    fontFamily: "inherit",
    background: c.inputBg,
    color: c.text,
    boxSizing: "border-box" as const,
    transition: "border-color 0.2s, box-shadow 0.2s",
  };
}

/**
 * Create primary button styles
 */
export function buttonStyles(c: ColorScheme, disabled = false): CSSProperties {
  return {
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
    border: `1px solid ${c.primary}`,
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: disabled ? "not-allowed" : "pointer",
    background: c.primary,
    color: "#ffffff",
    opacity: disabled ? 0.5 : 1,
    transition: "all 0.2s",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
  };
}

/**
 * Create secondary button styles
 */
export function secondaryButtonStyles(c: ColorScheme, disabled = false): CSSProperties {
  return {
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
    border: `1px solid ${c.border}`,
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: disabled ? "not-allowed" : "pointer",
    background: c.bg,
    color: c.text,
    opacity: disabled ? 0.5 : 1,
    transition: "all 0.2s",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
  };
}

/**
 * Create error message styles
 */
export function errorStyles(c: ColorScheme): CSSProperties {
  return {
    padding: 12,
    background: c.errorBg,
    border: `1px solid ${c.errorBorder}`,
    borderRadius: 8,
    color: c.error,
    fontSize: 14,
  };
}

/**
 * Create success message styles
 */
export function successStyles(c: ColorScheme): CSSProperties {
  return {
    padding: 12,
    background: c.successBg,
    border: `1px solid ${c.successBorder}`,
    borderRadius: 8,
    color: c.successText,
    fontSize: 14,
  };
}

/**
 * Create label styles
 */
export function labelStyles(c: ColorScheme): CSSProperties {
  return {
    display: "block",
    fontWeight: 500,
    marginBottom: 8,
    color: c.text,
    fontSize: 14,
  };
}

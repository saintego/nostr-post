/**
 * @nostr-post/react - NostrPostComposer component
 *
 * A form for creating and publishing Nostr posts
 * Styled to match nostr-login design system
 */

import { useState, useCallback, type FormEvent, type CSSProperties } from "react";
import {
    DEFAULT_KIND1_MANIFEST,
    type NostrPostManifest,
    type PostField,
    type FormData,
} from "@nostr-post/core/types";
import { useNostrPublish } from "../hooks/useNostrPublish";
import type { SignedEvent } from "../signer";

export interface NostrPostComposerProps {
    /** Manifest defining the form fields (defaults to Kind 1 note) */
    manifest?: NostrPostManifest;
    /** Relay URLs to publish to */
    relays?: string[];
    /** Called after successful publish */
    onPublished?: (events: SignedEvent[]) => void;
    /** Called on error */
    onError?: (error: Error) => void;
    /** Custom class name */
    className?: string;
    /** Placeholder text for content field */
    placeholder?: string;
    /** Submit button text */
    submitText?: string;
    /** Submitting button text */
    submittingText?: string;
    /** Dark mode (auto-detects from prefers-color-scheme if not set) */
    dark?: boolean;
}

// nostr-login color palette (matches @nostr-post/web)
const colors = {
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
};

/**
 * Composer component for creating Nostr posts
 * Styled to match nostr-login design system
 */
export function NostrPostComposer({
    manifest = DEFAULT_KIND1_MANIFEST,
    relays,
    onPublished,
    onError,
    className = "",
    placeholder = "What's on your mind?",
    submitText = "Post",
    submittingText = "Posting...",
    dark,
}: NostrPostComposerProps) {
    const [formData, setFormData] = useState<FormData>({});
    const [successMessage, setSuccessMessage] = useState("");

    // Detect dark mode
    const isDark =
        dark ??
        (typeof window !== "undefined" &&
            window.matchMedia?.("(prefers-color-scheme: dark)").matches);
    const c = isDark ? colors.dark : colors.light;

    const { publish, isPublishing, error } = useNostrPublish({
        manifest,
        relays,
        onSuccess: (events) => {
            setFormData({});
            setSuccessMessage("Posted successfully!");
            setTimeout(() => setSuccessMessage(""), 3000);
            onPublished?.(events);
        },
        onError,
    });

    const handleFieldChange = useCallback((fieldId: string, value: unknown) => {
        setFormData((prev) => ({ ...prev, [fieldId]: value }));
    }, []);

    const handleSubmit = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            setSuccessMessage("");
            try {
                await publish(formData);
            } catch {
                // Error handled by hook
            }
        },
        [formData, publish]
    );

    const styles: Record<string, CSSProperties> = {
        container: {
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 14,
            background: c.bg,
            borderRadius: 12,
            padding: 16,
            border: `1px solid ${c.border}`,
        },
        title: {
            fontSize: 18,
            fontWeight: 600,
            margin: "0 0 4px 0",
            color: c.text,
        },
        description: {
            color: c.textSecondary,
            margin: "0 0 16px 0",
            fontSize: 13,
        },
        field: {
            marginBottom: 16,
        },
        label: {
            display: "block",
            fontWeight: 500,
            marginBottom: 8,
            color: c.text,
        },
        input: {
            width: "100%",
            padding: "10px 12px",
            border: `1px solid ${c.border}`,
            borderRadius: 8,
            fontSize: 14,
            fontFamily: "inherit",
            background: c.inputBg,
            color: c.text,
            boxSizing: "border-box",
        },
        textarea: {
            width: "100%",
            padding: "10px 12px",
            border: `1px solid ${c.border}`,
            borderRadius: 8,
            fontSize: 14,
            fontFamily: "inherit",
            background: c.inputBg,
            color: c.text,
            minHeight: 100,
            resize: "vertical" as const,
            boxSizing: "border-box",
        },
        button: {
            display: "inline-flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "10px 20px",
            border: `1px solid ${c.primary}`,
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            background: c.primary,
            color: "#ffffff",
            opacity: isPublishing ? 0.5 : 1,
            transition: "all 0.2s",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
        },
        success: {
            padding: 12,
            background: c.successBg,
            border: `1px solid ${c.successBorder}`,
            borderRadius: 8,
            color: c.successText,
            marginBottom: 16,
        },
        error: {
            padding: 12,
            background: c.errorBg,
            border: `1px solid ${c.errorBorder}`,
            borderRadius: 8,
            color: c.error,
            marginBottom: 16,
        },
    };

    const renderField = (field: PostField) => {
        const value = formData[field.id] ?? "";

        switch (field.type) {
            case "string":
                if (field.uiPlugin === "textarea" || field.uiPlugin === "markdown") {
                    return (
                        <textarea
                            value={String(value)}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            placeholder={field.id === "content" ? placeholder : `Enter ${field.id}...`}
                            disabled={isPublishing}
                            rows={4}
                            style={styles.textarea}
                        />
                    );
                }
                return (
                    <input
                        type="text"
                        value={String(value)}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        placeholder={`Enter ${field.id}...`}
                        disabled={isPublishing}
                        style={styles.input}
                    />
                );

            case "number":
                return (
                    <input
                        type="number"
                        value={String(value)}
                        onChange={(e) => handleFieldChange(field.id, parseFloat(e.target.value))}
                        disabled={isPublishing}
                        style={styles.input}
                    />
                );

            case "boolean":
                return (
                    <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => handleFieldChange(field.id, e.target.checked)}
                        disabled={isPublishing}
                    />
                );

            case "enum":
                return (
                    <select
                        value={String(value)}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        disabled={isPublishing}
                        style={styles.input}
                    >
                        <option value="">Select...</option>
                        {field.options?.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
                );

            default:
                return (
                    <input
                        type="text"
                        value={String(value)}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        style={styles.input}
                    />
                );
        }
    };

    return (
        <div className={className} style={styles.container}>
            {manifest.metadata?.name && <h3 style={styles.title}>{manifest.metadata.name}</h3>}
            {manifest.metadata?.description && (
                <p style={styles.description}>{manifest.metadata.description}</p>
            )}

            {successMessage && <div style={styles.success}>{successMessage}</div>}
            {error && <div style={styles.error}>{error}</div>}

            <form onSubmit={handleSubmit}>
                {manifest.fields.map((field) => (
                    <div key={field.id} style={styles.field}>
                        {manifest.fields.length > 1 && (
                            <label style={styles.label}>
                                {field.id}
                                {field.required && <span style={{ color: c.error }}> *</span>}
                            </label>
                        )}
                        {renderField(field)}
                    </div>
                ))}

                <button type="submit" disabled={isPublishing} style={styles.button}>
                    {isPublishing ? submittingText : submitText}
                </button>
            </form>
        </div>
    );
}

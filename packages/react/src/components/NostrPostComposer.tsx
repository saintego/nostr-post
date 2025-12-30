/**
 * @nostr-post/react - NostrPostComposer component
 *
 * A form for creating and publishing Nostr posts
 */

import { useState, useCallback, type FormEvent } from "react";
import type { NostrPostManifest, PostField, FormData } from "@nostr-post/core/types";
import { useNostrPublish } from "../hooks/useNostrPublish";
import type { SignedEvent } from "../signer";

/** Default Kind 1 manifest */
const DEFAULT_KIND1_MANIFEST: NostrPostManifest = {
    id: "kind1-note",
    version: "1.0.0",
    requiredKinds: [1],
    fields: [
        {
            id: "content",
            type: "string",
            uiPlugin: "textarea",
            mapTo: { kind: 1, target: "content" },
            required: true,
        },
    ],
};

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
}

/**
 * Composer component for creating Nostr posts
 *
 * @example
 * ```tsx
 * // Simple usage - works out of the box
 * <NostrPostComposer onPublished={(events) => console.log('Published!', events)} />
 *
 * // Custom manifest
 * <NostrPostComposer manifest={reviewManifest} />
 * ```
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
}: NostrPostComposerProps) {
    const [formData, setFormData] = useState<FormData>({});
    const [successMessage, setSuccessMessage] = useState("");

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
                            className="np-textarea"
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
                        className="np-input"
                    />
                );

            case "number":
                return (
                    <input
                        type="number"
                        value={String(value)}
                        onChange={(e) => handleFieldChange(field.id, parseFloat(e.target.value))}
                        disabled={isPublishing}
                        className="np-input"
                    />
                );

            case "boolean":
                return (
                    <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => handleFieldChange(field.id, e.target.checked)}
                        disabled={isPublishing}
                        className="np-checkbox"
                    />
                );

            case "enum":
                return (
                    <select
                        value={String(value)}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        disabled={isPublishing}
                        className="np-select"
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
                        disabled={isPublishing}
                        className="np-input"
                    />
                );
        }
    };

    return (
        <div className={`np-composer ${className}`}>
            {manifest.metadata?.name && (
                <h3 className="np-composer-title">{manifest.metadata.name}</h3>
            )}
            {manifest.metadata?.description && (
                <p className="np-composer-description">{manifest.metadata.description}</p>
            )}

            {successMessage && <div className="np-success">{successMessage}</div>}
            {error && <div className="np-error">{error}</div>}

            <form onSubmit={handleSubmit}>
                {manifest.fields.map((field) => (
                    <div key={field.id} className="np-field">
                        {manifest.fields.length > 1 && (
                            <label className={field.required ? "np-required" : ""}>
                                {field.id}
                            </label>
                        )}
                        {renderField(field)}
                    </div>
                ))}

                <button type="submit" disabled={isPublishing} className="np-button np-button-primary">
                    {isPublishing ? submittingText : submitText}
                </button>
            </form>

            <style>{composerStyles}</style>
        </div>
    );
}

const composerStyles = `
  .np-composer {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
  }
  .np-composer-title {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0 0 0.25rem 0;
  }
  .np-composer-description {
    color: #6b7280;
    margin: 0 0 1rem 0;
  }
  .np-field {
    margin-bottom: 1rem;
  }
  .np-field label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }
  .np-required::after {
    content: ' *';
    color: #dc2626;
  }
  .np-input, .np-textarea, .np-select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    background: #f9fafb;
    color: #1f2937;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .np-input:focus, .np-textarea:focus, .np-select:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
  .np-textarea {
    min-height: 100px;
    resize: vertical;
  }
  .np-checkbox {
    width: auto;
  }
  .np-button {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    padding: 10px 16px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  .np-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .np-button-primary {
    background: #6366f1;
    color: white;
    border-color: #6366f1;
  }
  .np-button-primary:hover:not(:disabled) {
    background: #4f46e5;
    border-color: #4f46e5;
  }
  .np-success {
    padding: 0.75rem;
    background: #d1fae5;
    border: 1px solid #6ee7b7;
    border-radius: 8px;
    color: #065f46;
    margin-bottom: 1rem;
  }
  .np-error {
    padding: 0.75rem;
    background: #fef2f2;
    border: 1px solid #fca5a5;
    border-radius: 8px;
    color: #dc2626;
    margin-bottom: 1rem;
  }
`;

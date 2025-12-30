/**
 * @nostr-post/react - NostrPostComposer component
 *
 * A form for creating and publishing Nostr posts
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
import {
  getColors,
  containerStyles,
  inputStyles,
  buttonStyles,
  errorStyles,
  successStyles,
  labelStyles,
} from "../theme";

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

/**
 * Composer component for creating Nostr posts
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

  const c = getColors(dark);

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
      ...containerStyles(c),
      padding: 16,
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
    textarea: {
      ...inputStyles(c),
      minHeight: 100,
      resize: "vertical" as const,
    },
    success: {
      ...successStyles(c),
      marginBottom: 16,
    },
    error: {
      ...errorStyles(c),
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
            style={inputStyles(c)}
          />
        );

      case "number":
        return (
          <input
            type="number"
            value={String(value)}
            onChange={(e) => handleFieldChange(field.id, parseFloat(e.target.value))}
            disabled={isPublishing}
            style={inputStyles(c)}
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
            style={inputStyles(c)}
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
            style={inputStyles(c)}
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
              <label style={labelStyles(c)}>
                {field.id}
                {field.required && <span style={{ color: c.error }}> *</span>}
              </label>
            )}
            {renderField(field)}
          </div>
        ))}

        <button type="submit" disabled={isPublishing} style={buttonStyles(c, isPublishing)}>
          {isPublishing ? submittingText : submitText}
        </button>
      </form>
    </div>
  );
}

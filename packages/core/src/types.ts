/**
 * @nostr-post/core - Type definitions for the manifest and event coordination system
 *
 * This module defines the core types that power the nostr-post headless UI engine.
 * It follows strict functional programming principles and immutable data structures.
 */

/**
 * Defines where and how a field's data is stored in the Nostr event ecosystem.
 *
 * @property kind - The Nostr event kind (e.g., 1 for notes, 30078 for NIP-78 app data)
 * @property target - Whether data goes in 'content' field or as a 'tag'
 * @property tagName - Required when target is 'tag' (e.g., "r" for rating, "t" for topic)
 * @property path - JSON path for structured data in NIP-78 events (e.g., "venue.address.city")
 */
export type NostrTarget = {
  kind: number;
  target: 'content' | 'tag';
  tagName?: string;
  path?: string;
};

/**
 * Supported field types for the manifest system.
 * Each type corresponds to a validation schema and UI plugin interface.
 */
export type FieldType = 'string' | 'number' | 'boolean' | 'enum' | 'geo' | 'ref';

/**
 * Defines a single field in a post manifest.
 *
 * @property id - Unique identifier for the field within the manifest
 * @property type - The data type for validation and UI rendering
 * @property uiPlugin - ID of the UI plugin to use (e.g., "stars", "media", "markdown")
 * @property mapTo - Single source of truth: where this field's data lives in Nostr
 * @property required - Whether this field must be present (defaults to false)
 * @property options - For enum types, the allowed values
 * @property metadata - Additional plugin-specific configuration
 */
export interface PostField {
  id: string;
  type: FieldType;
  uiPlugin: string;
  mapTo: NostrTarget;
  required?: boolean;
  options?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * The manifest defines how complex content is split across Nostr events.
 *
 * This is the "blueprint" that tells the EventCoordinator:
 * - Which Nostr event kinds to produce
 * - How to map form fields to event content/tags
 * - Which UI plugins to use for each field
 *
 * @property id - Unique manifest identifier (e.g., "restaurant-review-v1")
 * @property version - Semantic version for backward compatibility
 * @property requiredKinds - All Nostr event kinds this manifest will produce
 * @property fields - The field definitions that make up the post structure
 * @property metadata - Optional manifest-level metadata (author, description, etc.)
 */
export interface NostrPostManifest {
  id: string;
  version: string;
  requiredKinds: number[];
  fields: PostField[];
  /**
   * Whether to embed an `a` tag referencing this manifest in published events.
   * When true (default), viewers can auto-fetch the manifest to render posts correctly.
   * Set to false for manifests that only provide a predefined editing experience
   * (e.g., preset tags/hashtags) without requiring a custom view.
   */
  linkManifest?: boolean;
  metadata?: {
    name?: string;
    description?: string;
    author?: string;
    tags?: string[];
  };
}

/**
 * Form data submitted by the user, keyed by field ID.
 * Values can be any JSON-serializable type.
 */
export type FormData = Record<string, unknown>;

/**
 * A Nostr event tag (array format as per NIP-01).
 * First element is the tag name, subsequent elements are values.
 */
export type NostrTag = [string, ...string[]];

/**
 * An unsigned Nostr event ready for signing.
 * This follows NIP-01 structure before the signature is added.
 *
 * @property kind - Event kind number
 * @property created_at - Unix timestamp
 * @property tags - Array of tags
 * @property content - String content (may be JSON for structured events)
 * @property pubkey - Public key (may be empty string before signing)
 */
export interface UnsignedNostrEvent {
  kind: number;
  created_at: number;
  tags: NostrTag[];
  content: string;
  pubkey: string;
}

/**
 * A bundle of related Nostr events produced from a single manifest + form data.
 * Events may reference each other via tags (e.g., 'e' tags for replies).
 *
 * @property events - Array of unsigned events ready for signing
 * @property manifest - The manifest used to produce these events
 * @property metadata - Additional context about the bundle
 */
export interface EventBundle {
  events: UnsignedNostrEvent[];
  manifest: NostrPostManifest;
  metadata?: {
    createdAt: number;
    sourceForm: FormData;
  };
}

/**
 * Result type for operations that may fail.
 * Following functional programming patterns for error handling.
 */
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

/**
 * Validation error with field-level details.
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Plugin interface for UI components.
 * Each plugin is a pure function that takes configuration and returns render metadata.
 *
 * @property id - Unique plugin identifier (e.g., "stars", "media")
 * @property type - The field type(s) this plugin supports
 * @property validate - Optional validation function for this plugin's data
 */
export interface NostrUIPlugin {
  id: string;
  type: FieldType | FieldType[];
  validate?: (value: unknown, field: PostField) => Result<void, ValidationError>;
}

/**
 * Default Kind 1 (note) manifest for simple text posts.
 * Use this when you just need a basic text composer without custom fields.
 */
export const DEFAULT_KIND1_MANIFEST: NostrPostManifest = {
  id: 'kind1-note',
  version: '1.0.0',
  requiredKinds: [1],
  fields: [
    {
      id: 'content',
      type: 'string',
      uiPlugin: 'textarea',
      mapTo: { kind: 1, target: 'content' },
      required: true,
    },
  ],
};

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
 * @property target - Where the data lives:
 *   - 'tag'     → Nostr event tags array (relay-filterable, e.g. 't', 'a', 'i', 'title')
 *   - 'content' → plain prose in the event content string
 *   - 'table'   → a row in a structured Djot table inside content (wiki kind:30818 only;
 *                 **not handled by the core coordinator** — use `@nostr-post/wiki`'s
 *                 `manifestToWikiEvent` for this target)
 * @property tagName - Required when target is 'tag' (e.g., "t" for topic, "a" for reference)
 * @property path - JSON path for structured data in NIP-78 events (e.g., "venue.address.city")
 */
export type NostrTarget = {
  kind: number;
  target: 'content' | 'tag' | 'table';
  tagName?: string;
  path?: string;
};

export type FieldMapBehavior = 'first-active' | 'all-active';

export interface PublishFormat {
  id: string;
  label: string;
  description?: string;
  kinds: number[];
  default?: boolean;
  userSelectable?: boolean;
}

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
/**
 * Controls whether a field is shown in the composer (edit) and/or the viewer.
 * Defaults to visible everywhere when omitted.
 */
export interface FieldVisibility {
  /** Show in composer? 'visible' (default), 'hidden', or 'readonly' (shown but not editable). */
  edit?: 'visible' | 'hidden' | 'readonly';
  /** Show in viewer? Defaults to 'visible'. */
  view?: 'visible' | 'hidden';
}

export interface PostField {
  id: string;
  type: FieldType;
  uiPlugin: string;
  mapTo: NostrTarget | NostrTarget[];
  /** How to apply multiple mappings when more than one active kind matches. Defaults to 'first-active'. */
  mapBehavior?: FieldMapBehavior;
  required?: boolean;
  options?: string[];
  metadata?: Record<string, unknown>;
  /** Default value to prefill in the composer. For hashtags: string[], for geo: geohash, etc. */
  defaultValue?: unknown;
  /** Controls field visibility in the composer and viewer. */
  visibility?: FieldVisibility;
  /**
   * Manifest field ID that this field attaches to.
   *
   * This is a field-to-field relationship inside the manifest, not a Nostr
   * storage target. The attached field may map to event content, a tag, or a
   * structured JSON path.
   *
   * When set the field does not render its own standalone UI element.
   * Instead it:
   *  - Calls enrichFormData using the attached field's value as input.
   *  - Registers action icons in the target field's toolbar (via getFieldActions).
   *  - Still runs extraTags / mapTo for final event tag emission.
   */
  attachTo?: string;
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
 * @property fields - The field definitions that make up the post structure
 * @property metadata - Optional manifest-level metadata (author, description, etc.)
 */
export interface NostrPostManifest {
  id: string;
  version: string;
  publishFormats?: PublishFormat[];
  fields: PostField[];
  /**
   * Parent manifest(s) to inherit from.
   *
   * A single string inherits from one parent. An array inherits from multiple
   * parents — they are merged left-to-right (rightmost wins on conflict), then
   * the child is applied on top.
   *
   * Each entry is either a full NIP-78 a-tag (`"30078:<pubkey>:nostr-post:<id>"`)
   * or a bare manifest ID (author-agnostic d-tag lookup).
   */
  extends?: string | string[];
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
 * A Nostr event that may or may not have been signed.
 * Signed events additionally carry `id` and `sig`.
 */
export type DisplayableEvent = UnsignedNostrEvent & { id?: string; sig?: string };

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
    addressableDTag?: string;
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
  publishFormats: [
    {
      id: 'kind1',
      label: 'Kind 1',
      kinds: [1],
      default: true,
      userSelectable: true,
    },
  ],
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

/**
 * Standard kind 1 post manifest with the common out-of-box field set.
 * This is suitable for regular notes and comments when you want text,
 * media attachments, and hashtags backed by the composer system.
 */
export const STANDARD_KIND1_POST_MANIFEST: NostrPostManifest = {
  id: 'kind1-standard-post',
  version: '1.0.0',
  publishFormats: [
    {
      id: 'kind1',
      label: 'Kind 1',
      kinds: [1],
      default: true,
      userSelectable: true,
    },
  ],
  fields: [
    {
      id: 'content',
      type: 'string',
      uiPlugin: 'textarea',
      mapTo: { kind: 1, target: 'content' },
      required: true,
      metadata: {
        label: 'Post',
        placeholder: 'Write something...',
      },
    },
    {
      id: 'media',
      type: 'string',
      uiPlugin: 'media',
      // Attaches to the content field: adds a media toolbar icon + handles paste/drop there.
      // Still maps uploaded image/video URLs to r tags on the event.
      attachTo: 'content',
      mapTo: { kind: 1, target: 'tag', tagName: 'r' },
      metadata: {
        label: 'Media',
        accept: ['image/*', 'video/*'],
        maxFiles: 4,
        expandable: true,
      },
    },
    {
      id: 'refs',
      type: 'string',
      uiPlugin: 'reference',
      // Attaches to content field for enrichment and optional manual URL entry.
      // Extracts all http(s) URLs + nostr identifiers and emits r/p/q/a tags.
      attachTo: 'content',
      mapTo: { kind: 1, target: 'tag', tagName: 'r' },
      visibility: { view: 'hidden' },
      metadata: {
        label: 'Links',
        expandable: true,
      },
    },
    {
      id: 'tags',
      type: 'string',
      uiPlugin: 'hashtag',
      // Attaches to content field: toolbar shows # icon, extracts #hashtags on submit.
      attachTo: 'content',
      mapTo: { kind: 1, target: 'tag', tagName: 't' },
      metadata: {
        label: 'Tags',
        expandable: true,
      },
    },
  ],
  metadata: {
    name: 'Standard Kind 1 Post',
    description: 'Standard kind 1 post/comment with text, media attachments, and hashtags.',
    tags: ['kind1', 'standard', 'comment', 'reply'],
  },
};

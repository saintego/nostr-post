/**
 * @nostr-post/plugins - Type definitions
 *
 * Core types for the plugin system. Each plugin is a separate package
 * that registers itself with the shared PluginRegistry.
 */

export type FieldType = 'string' | 'number' | 'boolean' | 'enum' | 'geo' | 'ref';

export interface PostField {
  id: string;
  type: FieldType;
  uiPlugin: string;
  mapTo: {
    kind: number;
    target: 'content' | 'tag';
    tagName?: string;
    path?: string;
  };
  required?: boolean;
  options?: string[];
  metadata?: Record<string, unknown>;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

/**
 * Plugin interface.
 *
 * Plugins register core logic (validate, formatValue) and optionally
 * web component tag names for input/view rendering.
 *
 * The /web entrypoint of each plugin package defines the Lit custom elements
 * and sets inputTagName/viewTagName on the registry entry.
 *
 * To swap a plugin's UI (e.g. use Google Maps instead of OSM for geo),
 * import a different package that registers the same plugin ID with
 * different tag names.
 */
export interface NostrUIPlugin {
  id: string;
  type: FieldType | FieldType[];

  /** Validate field value */
  validate?: (value: unknown, field: PostField) => Result<void, ValidationError>;

  /** Format value for display as plain text */
  formatValue?: (value: unknown) => string;

  /** Serialize complex value to string for Nostr tag storage */
  serializeValue?: (value: unknown, field?: PostField) => string;

  /** Deserialize string from Nostr tag back to typed value */
  deserializeValue?: (raw: string, field: PostField) => unknown;

  /**
   * Imperative DOM render for input — used when plugins are loaded directly
   * (not as web components). Receives a context with the current value,
   * field definition, and an onChange callback.
   */
  renderInput?: (ctx: {
    value: unknown;
    field: PostField;
    onChange: (value: unknown) => void;
  }) => HTMLElement;

  /**
   * Imperative DOM render for view — used when plugins are loaded directly
   * (not as web components).
   */
  renderView?: (value: unknown, field?: PostField) => HTMLElement;

  /**
   * Custom element tag name for the input component.
   * Set automatically when the plugin's /web entrypoint is imported.
   * The element must accept .value and .field properties
   * and dispatch 'np-value-changed' CustomEvent with { detail: { value } }.
   */
  inputTagName?: string;

  /**
   * Custom element tag name for the view component.
   * Set automatically when the plugin's /web entrypoint is imported.
   * The element must accept .value and .field properties.
   */
  viewTagName?: string;

  /**
   * Emit additional tags beyond the primary mapTo tag.
   * Called by the coordinator during event creation.
   * For example, a venue plugin maps to "g" (geohash) as the primary tag
   * but also emits NIP-73 "i" tags and a "location" tag.
   *
   * @returns Array of extra [tagName, ...values] tags to add
   */
  extraTags?: (value: unknown, field: PostField) => [string, ...string[]][];

  /**
   * Resolve a rich view value from all event tags.
   * Called by view components when rendering; allows plugins to reconstruct
   * a structured object from multiple related tags (e.g. geohash + venue ID + address).
   * When defined, takes priority over the default single-tag-value resolution.
   *
   * @param tags - All tags from the event
   * @param field - The field definition from the manifest
   * @returns The resolved value to pass to the view component's .value property
   */
  resolveFromTags?: (tags: string[][], field: PostField) => unknown;
}

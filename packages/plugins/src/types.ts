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
}

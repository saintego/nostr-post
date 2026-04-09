/**
 * @nostr-post/plugins - Type definitions
 *
 * Core types for the plugin system. Each plugin is a separate package
 * that registers itself with the shared PluginRegistry.
 */

export type FieldType = 'string' | 'number' | 'boolean' | 'enum' | 'geo' | 'ref';

export interface NostrTarget {
  kind: number;
  target: 'content' | 'tag';
  tagName?: string;
  path?: string;
}

export type FieldMapBehavior = 'first-active' | 'all-active';

export interface FieldVisibility {
  edit?: 'visible' | 'hidden' | 'readonly';
  view?: 'visible' | 'hidden';
}

export interface PostField {
  id: string;
  type: FieldType;
  uiPlugin: string;
  mapTo: NostrTarget | NostrTarget[];
  mapBehavior?: FieldMapBehavior;
  required?: boolean;
  options?: string[];
  metadata?: Record<string, unknown>;
  defaultValue?: unknown;
  visibility?: FieldVisibility;
  /**
   * Manifest field ID that this field attaches to.
   *
   * This is a field-to-field relationship within the manifest, not a Nostr
   * target such as event content.
   *
   * The attached field can be any field ID in the same manifest.
   * When set, this field does not render as a standalone composer element.
   */
  attachTo?: string;
}

/** Context passed to FieldAction.onClick handlers. */
export interface FieldActionContext {
  /** The attached plugin's own field definition. */
  field: PostField;
  /** The field this plugin is attached to (e.g. the content textarea). */
  targetField: PostField;
  /** Current composer form data. */
  formData: Record<string, unknown>;
  /** Callback to update any field value. */
  onUpdateField: (fieldId: string, value: unknown) => void;
}

/**
 * A toolbar action contributed by a plugin that is attached to another field.
 * Rendered as an icon button in the target field's toolbar row.
 */
export interface FieldAction {
  id: string;
  /** Emoji or short text used as the button icon. */
  icon: string;
  /** Accessible label and tooltip text. */
  label: string;
  onClick: (ctx: FieldActionContext) => void | Promise<void>;
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
   * Enrich form data before event coordination.
   * Called once per field during the pre-coordinate phase in the composer.
   * Plugins can use this to auto-extract values from other fields (e.g. reading
   * the content field to extract inline #hashtags or image URLs) and merge them
   * into the field's own value so the coordinator produces the right tags.
   *
   * @param formData - The current form data (read-only for other fields)
   * @param field - The field definition from the manifest
   * @returns Partial form data with updated values to merge in (typically just { [field.id]: newValue })
   */
  enrichFormData?: (formData: Record<string, unknown>, field: PostField) => Record<string, unknown>;

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

  /**
   * Handle clipboard paste events on textarea fields.
   * Used by the media plugin to intercept image pastes and upload them.
   * Plugins that want to handle textarea paste events can register this hook.
   *
   * @param e - The ClipboardEvent from the textarea
   * @param field - The field definition (likely the content field)
   * @param ctx - Context with formData and a callback to update fields
   */
  handleTextareaPaste?: (
    e: ClipboardEvent,
    field: PostField,
    ctx: {
      formData: Record<string, unknown>;
      onUpdateField: (fieldId: string, value: unknown) => void;
    }
  ) => Promise<void>;

  /**
   * Handle drag-drop events on textarea fields.
   * Used by the media plugin to intercept image/video drops and upload them.
   * Plugins that want to handle textarea drop events can register this hook.
   *
   * @param e - The DragEvent from the textarea
   * @param field - The field definition (likely the content field)
   * @param ctx - Context with formData and a callback to update fields
   */
  handleTextareaDrop?: (
    e: DragEvent,
    field: PostField,
    ctx: {
      formData: Record<string, unknown>;
      onUpdateField: (fieldId: string, value: unknown) => void;
    }
  ) => Promise<void>;

  /**
   * Web-only: Return toolbar action buttons for a field this plugin is attached to.
   * Called when the target field renders its toolbar and this plugin has `attachTo` set.
   * Each returned action is rendered as a small icon button in the toolbar.
   *
   * @param field - This plugin's own field definition
   * @returns Array of FieldAction objects to render as icon buttons
   */
  getFieldActions?: (field: PostField) => FieldAction[];
}

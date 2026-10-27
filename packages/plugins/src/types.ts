/**
 * @nostr-post/plugins - Type definitions
 *
 * Core types for the plugin system. Each plugin is a separate package
 * that registers itself with the shared PluginRegistry.
 */

import type {
  FieldMapBehavior,
  FieldOption,
  FieldType,
  NostrPostManifest,
  NostrTarget,
} from '@nostr-post/core/types';

export type {
  EnumOption,
  FieldMapBehavior,
  FieldOption,
  FieldType,
  NostrTarget,
} from '@nostr-post/core/types';

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
  options?: FieldOption[];
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

/** A completion offered while typing (see NostrUIPlugin.textareaCompletion) */
export interface TextCompletion {
  /** What the list shows, e.g. a name */
  label: string;
  /** Shown after the label, e.g. a NIP-05 address */
  detail?: string;
  /** An image URL shown before the label, e.g. an avatar */
  image?: string;
  /** The text that replaces the trigger and the typed query, e.g. `nostr:npub1…` */
  insert: string;
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

/** Context passed to a plugin's beforePublish hook */
export interface BeforePublishContext {
  /** Hex pubkey of the post's author */
  pubkey: string;
}

/** An event the post published, as afterPublish hooks get it */
export interface PublishedEvent {
  id: string;
  kind: number;
  pubkey: string;
  created_at: number;
  tags: string[][];
  content: string;
}

/** Context passed to a plugin's afterPublish hook */
export interface AfterPublishContext {
  /** Hex pubkey of the post's author */
  pubkey: string;
  /**
   * The form data after the beforePublish hooks: fields they linked to a wiki page have
   * it as `wikiEntity` (e.g. the venue whose page a venue field just created)
   */
  formData: Record<string, unknown>;
  /** The post's published events; none for a hooks-only publish format (`kinds: []`) */
  events: PublishedEvent[];
  /** The manifest the post was made with */
  manifest: NostrPostManifest;
}

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

  /**
   * Validate field value. The composer runs it on submit for fields with a value, with the
   * field's mapTo narrowed to the selected publish format's kinds; an error blocks publishing.
   */
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
   * The composer also sets .manifest, .pubkey, .activeKinds (the kinds the
   * selected publish format writes) and .error (its error for the field, shown
   * under it), for inputs that need them.
   */
  inputTagName?: string;

  /**
   * Custom element tag name shown next to the post's publish button when the
   * composer publishes itself, for fields with a value. Lets the plugin show
   * and confirm what its beforePublish hook will publish (e.g. the venue's wiki
   * page and its slug). Same contract as inputTagName: .value and .field in,
   * 'np-value-changed' out (updates the field's value).
   */
  publishSummaryTagName?: string;

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
   * Async step before the post is signed and published; only runs when the
   * composer publishes itself (auto-publish). Lets a plugin publish related
   * events first, e.g. the venue plugin creating or updating the venue's wiki
   * entity, and link them from the post.
   *
   * @returns Extra tags added to every event of the post (e.g. an `a` tag)
   */
  beforePublish?: (
    value: unknown,
    field: PostField,
    ctx: BeforePublishContext
  ) => Promise<[string, ...string[]][]>;

  /**
   * Async step after the post was published (fields with a value only), e.g. the list
   * plugin saving the post's venue to the user's lists. The post is out by then: a hook
   * that throws doesn't undo it; the composer shows the error.
   */
  afterPublish?: (value: unknown, field: PostField, ctx: AfterPublishContext) => Promise<void>;

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
   * The JSON Schema of this field's value, for filling a post in from JSON (e.g. an AI's
   * structured output; `formJsonSchema` in `@nostr-post/plugins/formJson`). `null` leaves the
   * field out. Without this hook the field is left out, as its value's shape is unknown.
   * Strict like structured outputs: objects list every property in `required` (optional ones
   * accept `null`) and set `additionalProperties: false`.
   */
  jsonSchema?: (field: PostField) => Record<string, unknown> | null;

  /**
   * Turns a value in `jsonSchema`'s shape into the field's value, when they differ (e.g.
   * names into picked wiki entities). `unresolved`: the parts it couldn't turn, for the user to
   * handle (e.g. names without a page).
   */
  parseJson?: (
    value: unknown,
    field: PostField
  ) => Promise<{ value?: unknown; unresolved?: string[] }>;

  /**
   * Completions while typing in the text field this plugin's field is attached to
   * (`attachTo`), e.g. `@name` mentions: after `trigger`, the composer shows what `search`
   * finds for the typed text and inserts the picked one's `insert`.
   */
  textareaCompletion?: {
    trigger: string;
    search: (query: string, field: PostField) => Promise<TextCompletion[]>;
  };

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

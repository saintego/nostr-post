/**
 * @nostr-post/plugins - Type definitions
 *
 * Types needed for plugin development (re-exported from @nostr-post/core)
 * These will resolve to the core package types at runtime
 */

// Re-export from core when available
// For now, we define minimal types for compilation
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
 * Render context provided to plugins for rendering UI
 */
export interface RenderContext {
  value: unknown;
  field: PostField;
  onChange: (value: unknown) => void;
  onError?: (error: string) => void;
}

/**
 * Plugin interface for framework-agnostic UI components
 */
export interface NostrUIPlugin {
  id: string;
  type: FieldType | FieldType[];

  /**
   * Validate field value
   */
  validate?: (value: unknown, field: PostField) => Result<void, ValidationError>;

  /**
   * Render edit/input UI (returns HTML string or DOM element)
   */
  renderInput?: (ctx: RenderContext) => HTMLElement | string;

  /**
   * Render view/display UI (returns HTML string or DOM element)
   */
  renderView?: (value: unknown, field: PostField) => HTMLElement | string;

  /**
   * Filter/transform value for display
   */
  formatValue?: (value: unknown) => string;
}

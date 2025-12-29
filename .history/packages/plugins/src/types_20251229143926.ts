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

export interface NostrUIPlugin {
  id: string;
  type: FieldType | FieldType[];
  validate?: (value: unknown, field: PostField) => Result<void, ValidationError>;
}

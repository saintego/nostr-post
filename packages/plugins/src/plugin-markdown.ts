/**
 * @nostr-post/plugins - Markdown editor plugin
 *
 * A plugin for rich text editing with Markdown
 */

import type {
  NostrUIPlugin,
  PostField,
  Result,
  ValidationError,
} from "./types";

export interface MarkdownPluginConfig {
  minLength?: number;
  maxLength?: number;
  allowHtml?: boolean;
}

export const markdownPlugin: NostrUIPlugin = {
  id: "markdown",
  type: "string",
  validate: (
    value: unknown,
    field: PostField
  ): Result<void, ValidationError> => {
    if (typeof value !== "string") {
      return {
        success: false,
        error: {
          field: field.id,
          message: "Content must be a string",
          code: "INVALID_TYPE",
        },
      };
    }

    const config = (field.metadata as MarkdownPluginConfig) || {};

    if (config.minLength && value.length < config.minLength) {
      return {
        success: false,
        error: {
          field: field.id,
          message: `Content must be at least ${config.minLength} characters`,
          code: "TOO_SHORT",
        },
      };
    }

    if (config.maxLength && value.length > config.maxLength) {
      return {
        success: false,
        error: {
          field: field.id,
          message: `Content must not exceed ${config.maxLength} characters`,
          code: "TOO_LONG",
        },
      };
    }

    return { success: true, data: undefined };
  },
};

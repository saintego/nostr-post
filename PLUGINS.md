# Creating Custom Plugins

Plugins extend the nostr-post composer and view with custom field types (star ratings, map pickers, media uploaders, etc.).

## Architecture

Each plugin is a **separate npm package** with two entrypoints:

| Entrypoint | Purpose                                                                       | Dependencies                  |
| ---------- | ----------------------------------------------------------------------------- | ----------------------------- |
| Root (`.`) | Core logic: validate, serialize/deserialize. No DOM.                          | `@nostr-post/plugins` only    |
| `/web`     | Lit web components for input & view. Auto-registers with the plugin registry. | `@nostr-post/plugins` + `lit` |

This split lets you:

- Use different UI implementations for the same data type (e.g. Leaflet vs Google Maps for `geo`)
- Run core logic server-side (validation, serialization) without DOM dependencies
- Tree-shake unused UI code

## Quick Start

### 1. Create the package

```
packages/plugin-{name}/
  package.json
  tsconfig.json
  src/
    core.ts         # validation + serialization (no DOM)
    index.ts        # re-exports core
    web.ts          # imports web components + registers plugin
    web/
      input.ts      # <np-{name}-input> Lit element
      view.ts       # <np-{name}-view> Lit element
```

### 2. Define core logic (`src/core.ts`)

```ts
import type {
  NostrUIPlugin,
  PostField,
  ValidationError,
} from "@nostr-post/plugins/types";

// Export any config/value interfaces so web components can import them
export interface MyPluginConfig {
  maxLength?: number;
}

export const myPlugin: NostrUIPlugin = {
  id: "my-plugin", // Must match uiPlugin in manifests
  type: "string", // or 'number', 'geo', 'boolean', 'enum', 'ref', or an array

  validate(value: unknown, field: PostField) {
    if (typeof value !== "string") {
      return {
        success: false,
        error: {
          field: field.id,
          message: "Must be a string",
          code: "INVALID_TYPE",
        },
      };
    }
    return { success: true, data: undefined };
  },

  // Plain text representation for non-plugin views
  formatValue(value: unknown) {
    return String(value);
  },

  // Convert typed value → string for Nostr tag storage
  serializeValue(value: unknown) {
    return String(value);
  },

  // Convert string from Nostr tag → typed value
  deserializeValue(raw: string, _field: PostField) {
    return raw;
  },
};
```

### 3. Re-export core (`src/index.ts`)

```ts
export * from "./core";
```

### 4. Create the input web component (`src/web/input.ts`)

The input element **must**:

- Accept `.value` and `.field` properties
- Dispatch `np-value-changed` CustomEvent with `{ detail: { value } }`

```ts
import type { PostField } from "@nostr-post/plugins/types";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("np-my-plugin-input")
export class NpMyPluginInput extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    input {
      width: 100%;
      padding: 0.5rem;
      box-sizing: border-box;
    }
  `;

  @property({ type: String })
  value = "";

  @property({ type: Object })
  field: PostField | null = null;

  private handleInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    this.dispatchEvent(
      new CustomEvent("np-value-changed", {
        detail: { value: val },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    const label = (this.field?.metadata?.placeholder as string) || "";
    return html`<input
      .value=${this.value}
      placeholder=${label}
      @input=${this.handleInput}
    />`;
  }
}
```

### 5. Create the view web component (`src/web/view.ts`)

The view element **must** accept `.value` and `.field` properties.

```ts
import type { PostField } from "@nostr-post/plugins/types";
import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("np-my-plugin-view")
export class NpMyPluginView extends LitElement {
  static styles = css`
    :host {
      display: inline;
    }
  `;

  @property({ type: String })
  value = "";

  @property({ type: Object })
  field: PostField | null = null;

  render() {
    return html`<span>${this.value}</span>`;
  }
}
```

### 6. Register with the plugin registry (`src/web.ts`)

```ts
import { pluginRegistry } from "@nostr-post/plugins/registry";
import { myPlugin } from "./core";

// Side-effect: import web components to register custom elements
import "./web/input";
import "./web/view";

// Register the plugin with tag names
pluginRegistry.register({
  ...myPlugin,
  inputTagName: "np-my-plugin-input",
  viewTagName: "np-my-plugin-view",
});
```

### 7. Package configuration

**`package.json`**:

```json
{
  "name": "@nostr-post/plugin-my-plugin",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./web": {
      "types": "./dist/web.d.ts",
      "import": "./dist/web.js"
    }
  },
  "dependencies": {
    "@nostr-post/plugins": "workspace:*",
    "lit": "^3.2.1"
  }
}
```

**`tsconfig.json`**:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "paths": {
      "@nostr-post/plugins/registry": ["../plugins/dist/registry.d.ts"],
      "@nostr-post/plugins/types": ["../plugins/dist/types.d.ts"]
    }
  },
  "include": ["src/**/*"]
}
```

## Using a Plugin

Import the `/web` entrypoint **once** in your app to register the custom elements:

```ts
// In your app entry point
import "@nostr-post/plugin-my-plugin/web";
```

Then reference it in your manifest:

```json
{
  "fields": [
    {
      "id": "myField",
      "type": "string",
      "uiPlugin": "my-plugin",
      "mapTo": { "kind": 1, "target": "tag", "tagName": "my-tag" }
    }
  ]
}
```

### Using `attachTo` for enrichment plugins

If your plugin auto-extracts data from another field (like hashtags from a content field), set `attachTo` on the field to specify the source:

```json
{
  "fields": [
    {
      "id": "content",
      "type": "string",
      "uiPlugin": "textarea",
      "mapTo": { "kind": 1, "target": "content" }
    },
    {
      "id": "tags",
      "type": "string",
      "uiPlugin": "hashtag",
      "attachTo": "content",
      "mapTo": { "kind": 1, "target": "tag", "tagName": "t" }
    }
  ]
}
```

`attachTo` must reference an existing field ID in the same manifest. When set:

- The plugin's `enrichFormData` reads from that field's value to auto-extract data
- The plugin's toolbar button (from `getFieldActions`) appears in the target field's composer toolbar
- The plugin's editor is shown inline under the target field when toggled

The `media`, `hashtag`, and `reference` plugins all use `attachTo` for this behaviour.

## Overriding a Built-in Plugin

Since plugins register by ID, you can replace any built-in plugin by registering a new one with the same ID **after** the original:

```ts
// Import the original (registers as 'geo' with Leaflet/OSM)
import "@nostr-post/plugin-geo/web";

// Override with your own implementation (re-registers 'geo' with Google Maps)
import "@my-org/nostr-post-plugin-geo-gmap/web";
```

The last import wins. The plugin registry logs a warning when overwriting.

## Plugin Interface Reference

```ts
interface NostrUIPlugin {
  id: string; // Unique identifier, matches uiPlugin in manifests
  type: FieldType | FieldType[]; // 'string' | 'number' | 'boolean' | 'enum' | 'geo' | 'ref'

  // Core (no DOM)
  validate?(value: unknown, field: PostField): Result<void, ValidationError>;
  formatValue?(value: unknown): string;
  serializeValue?(value: unknown): string;
  deserializeValue?(raw: string, field: PostField): unknown;

  // Emit extra Nostr tags beyond the primary mapTo tag (e.g. venue emits geohash + NIP-73 tags)
  extraTags?(value: unknown, field: PostField): [string, ...string[]][];

  // Reconstruct a rich view value from all event tags (e.g. venue reconstructs from geohash + "i" + "location")
  resolveFromTags?(tags: string[][], field: PostField): unknown;

  // Pre-coordinate: auto-extract values from other fields (e.g. read content to extract #hashtags or URLs)
  // Only runs for fields with `attachTo` pointing at a source field that has data
  enrichFormData?(
    formData: Record<string, unknown>,
    field: PostField,
  ): Record<string, unknown>;

  // Web component tag names (set by /web entrypoint)
  inputTagName?: string; // e.g. 'np-stars-input'
  viewTagName?: string; // e.g. 'np-stars-view'

  // Web-only: toolbar action buttons rendered in the target field's toolbar when attachTo is set
  getFieldActions?(field: PostField): FieldAction[];

  // Web-only: intercept clipboard paste on textarea fields (e.g. media plugin handles image paste)
  handleTextareaPaste?(
    e: ClipboardEvent,
    field: PostField,
    ctx: {
      formData: Record<string, unknown>;
      onUpdateField: (fieldId: string, value: unknown) => void;
    },
  ): Promise<void>;

  // Web-only: intercept drag-drop on textarea fields (e.g. media plugin handles file drop)
  handleTextareaDrop?(
    e: DragEvent,
    field: PostField,
    ctx: {
      formData: Record<string, unknown>;
      onUpdateField: (fieldId: string, value: unknown) => void;
    },
  ): Promise<void>;
}
```

### Input Component Contract

| Property | Type        | Description                                             |
| -------- | ----------- | ------------------------------------------------------- |
| `.value` | `unknown`   | Current field value                                     |
| `.field` | `PostField` | Full field definition from manifest (includes metadata) |

| Event              | Detail               | When                                  |
| ------------------ | -------------------- | ------------------------------------- |
| `np-value-changed` | `{ value: unknown }` | Every time the user changes the value |

### View Component Contract

| Property | Type        | Description                         |
| -------- | ----------- | ----------------------------------- |
| `.value` | `unknown`   | Deserialized field value            |
| `.field` | `PostField` | Full field definition from manifest |

## Existing Plugins

| Package                        | ID          | Type     | Description                                                                      |
| ------------------------------ | ----------- | -------- | -------------------------------------------------------------------------------- |
| `@nostr-post/plugin-stars`     | `stars`     | `number` | Interactive star rating (configurable max via `metadata.max`)                    |
| `@nostr-post/plugin-geo`       | `geo`       | `geo`    | Map location picker using Leaflet/OpenStreetMap (NIP-52 geohash)                 |
| `@nostr-post/plugin-venue`     | `venue`     | `geo`    | OSM venue search + NIP-73 identity tags; wraps `plugin-geo`                      |
| `@nostr-post/plugin-media`     | `media`     | `string` | Multi-file upload with NIP-98 auth; paste/drop on textarea via `attachTo`        |
| `@nostr-post/plugin-markdown`  | `markdown`  | `string` | Markdown editor with live preview (WYSIWYG mode supported)                       |
| `@nostr-post/plugin-hashtag`   | `hashtag`   | `string` | Hashtag array input; auto-extracts from target field when `attachTo` is set      |
| `@nostr-post/plugin-reference` | `reference` | `string` | URL/nostr reference list; auto-extracts from target field when `attachTo` is set |

## Custom Field Types

The `FieldType` union currently supports `'string' | 'number' | 'boolean' | 'enum' | 'geo' | 'ref'`.

If your plugin needs a custom type that doesn't fit these, you have two options:

1. **Use an existing type with a custom plugin** — e.g. store color as `string` with `uiPlugin: 'color-picker'`. The plugin handles input/view rendering, and the string value is stored in a Nostr tag as-is.

2. **Use `serializeValue`/`deserializeValue`** — For complex structures, use `type: 'string'` in the manifest but have your plugin serialize to/from a structured format (JSON, comma-separated, etc.). The geo plugin does this: type is `'geo'` but the tag value is `"lat,lon"`.

The coordinator calls `serializeTagValue()` which handles primitives and known objects (like `{lat, lon}`). For completely novel structures, your plugin's `serializeValue` ensures proper tag storage, and `deserializeValue` reconstructs the typed value when viewing.

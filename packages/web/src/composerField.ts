/**
 * Standalone field rendering helpers for <nostr-post-composer>.
 *
 * Extracted from the composer class so the HTML / plugin-dispatch logic lives
 * in its own file, separate from lifecycle, state, and event publishing.
 */

import type { Completer } from './composerCompletion';
import './composerCompletion';
import { fieldDescription, fieldLabel } from '@nostr-post/core/manifest';
import type { NostrPostManifest, PostField } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import type {
  FieldActionContext,
  FieldActionSetting,
  NostrUIPlugin,
  TextareaEventContext,
} from '@nostr-post/plugins/types';
import { html, nothing, type TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import { renderEnumInput } from './composerEnum';
import './fieldActionPanel';

type NumberFieldConfig = {
  min?: number;
  max?: number;
  step?: number;
};

function getNumberFieldConfig(field: PostField): NumberFieldConfig {
  const metadata = (field.metadata as Record<string, unknown> | undefined) ?? {};
  return {
    min: typeof metadata.min === 'number' ? metadata.min : undefined,
    max: typeof metadata.max === 'number' ? metadata.max : undefined,
    step: typeof metadata.step === 'number' && metadata.step > 0 ? metadata.step : undefined,
  };
}

function coerceNumberValue(rawValue: string, field: PostField): unknown {
  const raw = rawValue.trim();
  if (raw.length === 0) return undefined;

  const parsed = Number.parseFloat(raw);
  if (Number.isNaN(parsed)) return undefined;

  const { min, max, step } = getNumberFieldConfig(field);
  let next = parsed;

  if (typeof min === 'number') next = Math.max(min, next);
  if (typeof max === 'number') next = Math.min(max, next);
  if (typeof step === 'number' && typeof min === 'number') {
    next = min + Math.round((next - min) / step) * step;
    next = Number(next.toFixed(10));
  }

  return next;
}

/**
 * Dependencies that the field renderers need from the composer component.
 * Constructed once per `render()` call and threaded through all helpers.
 */
export interface FieldRenderContext {
  formData: Record<string, unknown>;
  errors: Record<string, string>;
  expandedFields: Set<string>;
  /** Fields indexed by the fieldId they attach to. */
  attachedByTarget: Map<string, PostField[]>;
  /** Full manifest — needed to look up attached fields. */
  manifest: NostrPostManifest;
  /** Kinds the selected publish format writes (e.g. the date field's precision follows them) */
  activeKinds: number[];
  /** The author, when the composer knows it (inputs that need the user's data use it) */
  pubkey?: string;
  /** The composer offers "Upload later" (media inputs) */
  uploadLater?: boolean;
  /** The form data as it is now, for plugin work that finishes later (an upload) */
  getFormData: () => Record<string, unknown>;
  isReadonly: (field: PostField) => boolean;
  onFieldChange: (fieldId: string, value: unknown) => void;
  onToggleExpanded: (fieldId: string) => void;
}

interface BoundFieldAction {
  id: string;
  icon: string;
  label: string;
  run: () => void | Promise<void>;
  setting?: FieldActionSetting;
  runLabel?: string;
  dropLabel?: string;
  dropFiles?: (files: File[]) => void | Promise<void>;
}

function getPluginIcon(field: PostField): string {
  if (field.uiPlugin === 'hashtag') return '#';
  if (field.uiPlugin === 'media') return '🖼️';
  if (field.uiPlugin === 'reference') return '🔗';
  return '+';
}

/**
 * Render a read-only view of a field value using the plugin's view component,
 * falling back to a plain text span.
 */
export function renderFieldView(field: PostField, value: unknown): TemplateResult {
  if (field.uiPlugin) {
    const plugin = pluginRegistry.get(field.uiPlugin);
    if (plugin?.viewTagName) {
      const tag = unsafeStatic(plugin.viewTagName);
      return staticHtml`<${tag} .value=${value} .field=${field}></${tag}>`;
    }
  }
  return html`<span class="readonly-value">${String(value)}</span>`;
}

/**
 * Render the editable input for a field — plugin component first, native fallback.
 */
export function renderFieldInput(
  field: PostField,
  value: unknown,
  ctx: FieldRenderContext
): TemplateResult {
  if (field.uiPlugin) {
    const plugin = pluginRegistry.get(field.uiPlugin);
    if (plugin?.inputTagName) {
      const tag = unsafeStatic(plugin.inputTagName);
      // The manifest too, for inputs that use other fields (e.g. the list field's saveField)
      return staticHtml`<${tag}
        .value=${value}
        .field=${field}
        .manifest=${ctx.manifest}
        .activeKinds=${ctx.activeKinds}
        .error=${ctx.errors[field.id]}
        .pubkey=${ctx.pubkey}
        .uploadLater=${ctx.uploadLater ?? false}
        @np-value-changed=${(e: CustomEvent) => ctx.onFieldChange(field.id, e.detail.value)}
      ></${tag}>`;
    }
  }

  // Shared handleInput for native inputs — applies type conversion before dispatch.
  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    let fieldValue: unknown = target.value;
    if (field.type === 'number') {
      fieldValue = coerceNumberValue(target.value, field);
    } else if (field.type === 'boolean') fieldValue = (target as HTMLInputElement).checked;
    ctx.onFieldChange(field.id, fieldValue);
  };

  switch (field.type) {
    case 'string':
      if (field.uiPlugin === 'textarea' || field.uiPlugin === 'markdown') {
        return renderTextarea(field, value, ctx, handleInput);
      }
      return html`<input type="text" @input=${handleInput} .value=${String(value)} />`;

    case 'number': {
      const numberConfig = getNumberFieldConfig(field);
      const min = typeof numberConfig.min === 'number' ? String(numberConfig.min) : undefined;
      const max = typeof numberConfig.max === 'number' ? String(numberConfig.max) : undefined;
      const step = typeof numberConfig.step === 'number' ? String(numberConfig.step) : undefined;
      return html`<input
        type="number"
        min=${ifDefined(min)}
        max=${ifDefined(max)}
        step=${ifDefined(step)}
        @input=${handleInput}
        .value=${String(value)}
      />`;
    }

    case 'boolean':
      return html`<input type="checkbox" @change=${handleInput} .checked=${Boolean(value)} />`;

    case 'enum':
      return renderEnumInput(field, value, (v) => ctx.onFieldChange(field.id, v));

    default:
      return html`<input type="text" @input=${handleInput} .value=${String(value)} />`;
  }
}

/** A text field: with completions (e.g. `@` mentions) when attached plugins offer them */
function renderTextarea(
  field: PostField,
  value: unknown,
  ctx: FieldRenderContext,
  handleInput: (e: Event) => void
): TemplateResult {
  // Check if any plugin wants to handle textarea paste/drop events
  const handlers = getTextareaEventHandlers(field, ctx);
  const completers = getTextareaCompleters(field, ctx);
  if (completers.length > 0) {
    return html`<np-completing-textarea
        .value=${String(value)}
        .completers=${completers}
        .onInput=${(text: string) => ctx.onFieldChange(field.id, text)}
        .onPaste=${handlers.onPaste}
        .onDrop=${handlers.onDrop}
      ></np-completing-textarea>`;
  }

  return html`<textarea
      @input=${handleInput}
      @paste=${(e: ClipboardEvent) => handlers.onPaste?.(e)}
      @drop=${(e: DragEvent) => handlers.onDrop?.(e)}
      @dragover=${(e: DragEvent) => e.preventDefault()}
      .value=${String(value)}
    ></textarea>`;
}

/** Completions while typing (e.g. `@` mentions) from the plugins attached to this field */
function getTextareaCompleters(field: PostField, ctx: FieldRenderContext): Completer[] {
  return (ctx.attachedByTarget.get(field.id) ?? []).flatMap((attachedField) => {
    const completion = pluginRegistry.get(attachedField.uiPlugin)?.textareaCompletion;
    return completion ? [{ ...completion, field: attachedField }] : [];
  });
}

/**
 * Get textarea event handlers from all plugins attached to this field.
 * Collects paste/drop handlers from every attached plugin that registers them.
 */
function getTextareaEventHandlers(
  field: PostField,
  ctx: FieldRenderContext
): {
  onPaste?: (e: ClipboardEvent) => void;
  onDrop?: (e: DragEvent) => void;
} {
  const attached = ctx.attachedByTarget.get(field.id) ?? [];
  type Bound<H> = { handler: NonNullable<H>; attachedField: PostField };
  const pasteHandlers: Bound<NostrUIPlugin['handleTextareaPaste']>[] = [];
  const dropHandlers: Bound<NostrUIPlugin['handleTextareaDrop']>[] = [];

  for (const attachedField of attached) {
    const plugin = pluginRegistry.get(attachedField.uiPlugin) as NostrUIPlugin | undefined;
    if (plugin?.handleTextareaPaste) {
      pasteHandlers.push({ handler: plugin.handleTextareaPaste.bind(plugin), attachedField });
    }
    if (plugin?.handleTextareaDrop) {
      dropHandlers.push({ handler: plugin.handleTextareaDrop.bind(plugin), attachedField });
    }
  }
  const eventContext = (attachedField: PostField): TextareaEventContext => ({
    formData: ctx.formData,
    getFormData: ctx.getFormData,
    onUpdateField: ctx.onFieldChange,
    attachedField,
  });

  if (!pasteHandlers.length && !dropHandlers.length) return {};

  return {
    onPaste: pasteHandlers.length
      ? (e: ClipboardEvent) => {
          for (const { handler, attachedField } of pasteHandlers) {
            void handler(e, field, eventContext(attachedField));
          }
        }
      : undefined,
    onDrop: dropHandlers.length
      ? (e: DragEvent) => {
          for (const { handler, attachedField } of dropHandlers) {
            void handler(e, field, eventContext(attachedField));
          }
        }
      : undefined,
  };
}

/**
 * Collect FieldActions from all plugins attached to a given field.
 */
function getFieldActions(field: PostField, ctx: FieldRenderContext): BoundFieldAction[] {
  const attached = ctx.attachedByTarget.get(field.id) ?? [];
  const actions: BoundFieldAction[] = [];

  for (const attachedField of attached) {
    const plugin = pluginRegistry.get(attachedField.uiPlugin) as NostrUIPlugin | undefined;
    if (!plugin?.getFieldActions) continue;
    const fieldActions = plugin.getFieldActions(attachedField);
    // Wire up onClick context
    for (const action of fieldActions) {
      const actionCtx = (): FieldActionContext => ({
        field: attachedField,
        targetField: field,
        formData: ctx.formData,
        getFormData: ctx.getFormData,
        onUpdateField: ctx.onFieldChange,
      });
      const { onDropFiles } = action;
      actions.push({
        id: action.id,
        icon: action.icon,
        label: action.label,
        setting: action.setting,
        runLabel: action.runLabel,
        dropLabel: action.dropLabel,
        dropFiles: onDropFiles ? (files) => onDropFiles(files, actionCtx()) : undefined,
        run: () => action.onClick(actionCtx()),
      });
    }
  }

  return actions;
}

/** An attached field whose plugin adds its own toolbar buttons (e.g. media's "Add media") */
const hasOwnActions = (field: PostField): boolean =>
  ((pluginRegistry.get(field.uiPlugin) as NostrUIPlugin | undefined)?.getFieldActions?.(field)
    .length ?? 0) > 0;

const hasValue = (value: unknown): boolean =>
  Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== '';

/** Render the toolbar row of action icons for an attached-plugins field. */
function renderFieldToolbar(
  field: PostField,
  ctx: FieldRenderContext
): TemplateResult | typeof nothing {
  const actions = getFieldActions(field, ctx);
  // Also collect expandable attached fields as toggle buttons; not those whose plugin has its own
  // button (media: "Add media"), which show once they have a value
  const attached = ctx.attachedByTarget.get(field.id) ?? [];
  const expandableAttached = attached.filter(
    (f) =>
      (f.metadata as Record<string, unknown>)?.expandable &&
      f.visibility?.edit !== 'hidden' &&
      !hasOwnActions(f)
  );

  if (!actions.length && !expandableAttached.length) return nothing;

  return html`
    <div class="field-toolbar">
      ${actions.map(({ setting, ...action }) =>
        // An action with a choice opens a panel with it (e.g. Add media and its photo quality)
        setting
          ? html`<np-field-action-panel .action=${{ ...action, setting }}></np-field-action-panel>`
          : html`
              <button
                type="button"
                class="field-action np-icon-button"
                part="button"
                title=${action.label}
                aria-label=${action.label}
                @click=${() => action.run()}
              >${action.icon}</button>
            `
      )}
      ${expandableAttached.map((attachedField) => {
        const isExpanded = ctx.expandedFields.has(attachedField.id);
        const label = fieldLabel(attachedField);
        const icon = getPluginIcon(attachedField);
        return html`
          <button
            type="button"
            class="field-action np-icon-button ${isExpanded ? 'np-selected' : ''}"
            part="button"
            aria-pressed=${isExpanded}
            title=${label}
            aria-label=${label}
            @click=${() => ctx.onToggleExpanded(attachedField.id)}
          >${icon}</button>
        `;
      })}
    </div>
  `;
}

function renderAttachedExpandedFields(
  field: PostField,
  ctx: FieldRenderContext
): TemplateResult | typeof nothing {
  const attached = ctx.attachedByTarget.get(field.id) ?? [];
  const expanded = attached.filter(
    (attachedField) =>
      attachedField.visibility?.edit !== 'hidden' &&
      (ctx.expandedFields.has(attachedField.id) ||
        (hasOwnActions(attachedField) && hasValue(ctx.formData[attachedField.id])))
  );

  if (!expanded.length) return nothing;

  return html`${expanded.map((attachedField) => renderField(attachedField, false, ctx))}`;
}

/**
 * Render a single form field with label, input/view, and validation error.
 */
export function renderField(
  field: PostField,
  isHidden: boolean,
  ctx: FieldRenderContext
): TemplateResult {
  const value = ctx.formData[field.id] ?? field.defaultValue ?? '';
  const error = ctx.errors[field.id];
  const isRequired = field.required === true;
  const readonly = ctx.isReadonly(field);
  const label = fieldLabel(field);
  const description = fieldDescription(field);

  const toolbar = readonly ? nothing : renderFieldToolbar(field, ctx);

  return html`
    <div
      class="field ${readonly ? 'field-readonly' : ''}"
      style="${isHidden ? 'display: none;' : ''}"
    >
      <label class="np-label ${isRequired ? 'np-required' : ''}" part="label">${label}</label>
      ${description ? html`<div class="np-hint" part="hint">${description}</div>` : nothing}
      ${toolbar}
      ${readonly ? renderFieldView(field, value) : renderFieldInput(field, value, ctx)}
      ${readonly ? nothing : renderAttachedExpandedFields(field, ctx)}
      ${error ? html`<div class="np-field-error" part="error">${error}</div>` : nothing}
    </div>
  `;
}

/**
 * Render a field that is collapsed behind an expand toggle by default.
 * Clicking the pill shows/hides the full plugin input widget.
 */
export function renderExpandableField(field: PostField, ctx: FieldRenderContext): TemplateResult {
  const isExpanded = ctx.expandedFields.has(field.id);
  const label = fieldLabel(field);
  const icon = getPluginIcon(field);

  return html`
    <div class="expandable-field">
      <button
        type="button"
        class="np-chip ${isExpanded ? 'np-selected' : ''}"
        part="chip"
        aria-pressed=${isExpanded}
        @click=${() => ctx.onToggleExpanded(field.id)}
      >
        <span class="expand-icon">${icon}</span>
        <span>${label}</span>
        <span class="expand-chevron">${isExpanded ? '▲' : '▼'}</span>
      </button>
      ${isExpanded ? renderField(field, false, ctx) : nothing}
    </div>
  `;
}

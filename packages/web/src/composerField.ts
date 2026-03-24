/**
 * Standalone field rendering helpers for <nostr-post-composer>.
 *
 * Extracted from the composer class so the HTML / plugin-dispatch logic lives
 * in its own file, separate from lifecycle, state, and event publishing.
 */

import type { NostrPostManifest, PostField } from '@nostr-post/core/types';
import { pluginRegistry } from '@nostr-post/plugins/registry';
import type { FieldActionContext, NostrUIPlugin } from '@nostr-post/plugins/types';
import { type TemplateResult, html, nothing } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';

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
  isReadonly: (field: PostField) => boolean;
  onFieldChange: (fieldId: string, value: unknown) => void;
  onToggleExpanded: (fieldId: string) => void;
}

interface BoundFieldAction {
  id: string;
  icon: string;
  label: string;
  run: () => void | Promise<void>;
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
      return staticHtml`<${tag}
        .value=${value}
        .field=${field}
        @np-value-changed=${(e: CustomEvent) => ctx.onFieldChange(field.id, e.detail.value)}
      ></${tag}>`;
    }
  }

  // Shared handleInput for native inputs — applies type conversion before dispatch.
  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    let fieldValue: unknown = target.value;
    if (field.type === 'number') {
      const raw = target.value.trim();
      if (raw.length === 0) {
        fieldValue = undefined;
      } else {
        const parsed = Number.parseFloat(raw);
        if (Number.isNaN(parsed)) {
          fieldValue = undefined;
        } else {
          const meta = (field.metadata as Record<string, unknown> | undefined) ?? {};
          const min = typeof meta.min === 'number' ? meta.min : undefined;
          const max = typeof meta.max === 'number' ? meta.max : undefined;
          const step = typeof meta.step === 'number' && meta.step > 0 ? meta.step : undefined;

          let next = parsed;
          if (typeof min === 'number') next = Math.max(min, next);
          if (typeof max === 'number') next = Math.min(max, next);
          if (typeof step === 'number' && typeof min === 'number') {
            next = min + Math.round((next - min) / step) * step;
            next = Number(next.toFixed(10));
          }
          fieldValue = next;
        }
      }
    } else if (field.type === 'boolean') fieldValue = (target as HTMLInputElement).checked;
    ctx.onFieldChange(field.id, fieldValue);
  };

  switch (field.type) {
    case 'string':
      if (field.uiPlugin === 'textarea' || field.uiPlugin === 'markdown') {
        // Check if any plugin wants to handle textarea paste/drop events
        const handlers = getTextareaEventHandlers(field, ctx);

        return html`<textarea
          @input=${handleInput}
          @paste=${(e: ClipboardEvent) => handlers.onPaste?.(e)}
          @drop=${(e: DragEvent) => handlers.onDrop?.(e)}
          @dragover=${(e: DragEvent) => e.preventDefault()}
          .value=${String(value)}
        ></textarea>`;
      }
      return html`<input type="text" @input=${handleInput} .value=${String(value)} />`;

    case 'number':
      const numberMeta = (field.metadata as Record<string, unknown> | undefined) ?? {};
      const min = typeof numberMeta.min === 'number' ? String(numberMeta.min) : undefined;
      const max = typeof numberMeta.max === 'number' ? String(numberMeta.max) : undefined;
      const step = typeof numberMeta.step === 'number' ? String(numberMeta.step) : undefined;
      return html`<input
        type="number"
        min=${ifDefined(min)}
        max=${ifDefined(max)}
        step=${ifDefined(step)}
        @input=${handleInput}
        .value=${String(value)}
      />`;

    case 'boolean':
      return html`<input type="checkbox" @change=${handleInput} .checked=${Boolean(value)} />`;

    case 'enum':
      return html`
        <select @change=${handleInput}>
          <option value="">Select...</option>
          ${field.options?.map(
            (opt) => html`<option value=${opt} ?selected=${value === opt}>${opt}</option>`
          )}
        </select>
      `;

    default:
      return html`<input type="text" @input=${handleInput} .value=${String(value)} />`;
  }
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
  const pasteHandlers: NonNullable<NostrUIPlugin['handleTextareaPaste']>[] = [];
  const dropHandlers: NonNullable<NostrUIPlugin['handleTextareaDrop']>[] = [];

  for (const attachedField of attached) {
    const plugin = pluginRegistry.get(attachedField.uiPlugin) as NostrUIPlugin | undefined;
    if (plugin?.handleTextareaPaste) pasteHandlers.push(plugin.handleTextareaPaste.bind(plugin));
    if (plugin?.handleTextareaDrop) dropHandlers.push(plugin.handleTextareaDrop.bind(plugin));
  }

  if (!pasteHandlers.length && !dropHandlers.length) return {};

  return {
    onPaste: pasteHandlers.length
      ? (e: ClipboardEvent) => {
          for (const handler of pasteHandlers) {
            void handler(e, field, {
              formData: ctx.formData,
              onUpdateField: ctx.onFieldChange,
            });
          }
        }
      : undefined,
    onDrop: dropHandlers.length
      ? (e: DragEvent) => {
          for (const handler of dropHandlers) {
            void handler(e, field, {
              formData: ctx.formData,
              onUpdateField: ctx.onFieldChange,
            });
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
      actions.push({
        id: action.id,
        icon: action.icon,
        label: action.label,
        run: () => {
          const actionCtx: FieldActionContext = {
            field: attachedField,
            targetField: field,
            formData: ctx.formData,
            onUpdateField: ctx.onFieldChange,
          };
          return action.onClick(actionCtx);
        },
      });
    }
  }

  return actions;
}

/** Render the toolbar row of action icons for an attached-plugins field. */
function renderFieldToolbar(
  field: PostField,
  ctx: FieldRenderContext
): TemplateResult | typeof nothing {
  const actions = getFieldActions(field, ctx);
  // Also collect expandable attached fields as toggle buttons
  const attached = ctx.attachedByTarget.get(field.id) ?? [];
  const expandableAttached = attached.filter(
    (f) => (f.metadata as Record<string, unknown>)?.expandable && f.visibility?.edit !== 'hidden'
  );

  if (!actions.length && !expandableAttached.length) return nothing;

  return html`
    <div class="field-toolbar">
      ${actions.map(
        (action) => html`
          <button
            type="button"
            class="field-action"
            title=${action.label}
            aria-label=${action.label}
            @click=${() => action.run()}
          >${action.icon}</button>
        `
      )}
      ${expandableAttached.map((attachedField) => {
        const isExpanded = ctx.expandedFields.has(attachedField.id);
        const label = (attachedField.metadata?.label as string) || attachedField.id;
        const icon = getPluginIcon(attachedField);
        return html`
          <button
            type="button"
            class="field-action ${isExpanded ? 'expanded' : ''}"
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
      attachedField.visibility?.edit !== 'hidden' && ctx.expandedFields.has(attachedField.id)
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
  const label = (field.metadata?.label as string) || field.id;

  const toolbar = readonly ? nothing : renderFieldToolbar(field, ctx);

  return html`
    <div
      class="field ${readonly ? 'field-readonly' : ''}"
      style="${isHidden ? 'display: none;' : ''}"
    >
      <label class="${isRequired ? 'required' : ''}">${label}</label>
      ${toolbar}
      ${readonly ? renderFieldView(field, value) : renderFieldInput(field, value, ctx)}
      ${readonly ? nothing : renderAttachedExpandedFields(field, ctx)}
      ${error ? html`<div class="field-error">${error}</div>` : nothing}
    </div>
  `;
}

/**
 * Render a field that is collapsed behind an expand toggle by default.
 * Clicking the pill shows/hides the full plugin input widget.
 */
export function renderExpandableField(field: PostField, ctx: FieldRenderContext): TemplateResult {
  const isExpanded = ctx.expandedFields.has(field.id);
  const label = (field.metadata?.label as string) || field.id;
  const icon = getPluginIcon(field);

  return html`
    <div class="expandable-field">
      <button
        type="button"
        class="expand-toggle ${isExpanded ? 'expanded' : ''}"
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

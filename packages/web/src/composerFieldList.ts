import type { NostrPostManifest, PostField } from '@nostr-post/core/types';
import type { FieldRenderContext } from './composerField';
import { renderExpandableField, renderField } from './composerField';
import { isExcludedButPrefilled, isFieldExcluded } from './composerForm';

export const renderFieldList = (
  manifest: NostrPostManifest,
  ctx: Omit<FieldRenderContext, 'attachedByTarget'>,
  excludeFields: string[] | undefined,
  prefill: Record<string, unknown> | undefined
) => {
  const attachedByTarget = new Map<string, PostField[]>();
  for (const field of manifest.fields) {
    if (!field.attachTo) continue;
    const attached = attachedByTarget.get(field.attachTo) ?? [];
    attached.push(field);
    attachedByTarget.set(field.attachTo, attached);
  }

  const fullCtx: FieldRenderContext = { ...ctx, attachedByTarget };

  return manifest.fields.map((field) => {
    if (field.attachTo && field.visibility?.edit !== 'hidden') return '';
    if (
      isFieldExcluded(field, excludeFields) &&
      !isExcludedButPrefilled(field, excludeFields, prefill)
    ) {
      return '';
    }

    const isHidden =
      isExcludedButPrefilled(field, excludeFields, prefill) || field.visibility?.edit === 'hidden';

    if (!isHidden && (field.metadata as Record<string, unknown>)?.expandable) {
      return renderExpandableField(field, fullCtx);
    }
    return renderField(field, isHidden, fullCtx);
  });
};

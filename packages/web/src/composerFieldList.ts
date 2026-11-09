import type { NostrPostManifest, PostField } from '@nostr-post/core/types';
import { isExcludedButPrefilled, isFieldExcluded } from '@nostr-post/posts';
import type { FieldRenderContext } from './composerField';
import { renderExpandableField, renderField } from './composerField';

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

  // Only the chosen publish format's fields: a photo post doesn't ask for a video
  const forActiveKinds = (field: PostField) =>
    ctx.activeKinds.length === 0 ||
    [field.mapTo].flat().some((target) => ctx.activeKinds.includes(target.kind));

  return manifest.fields.map((field) => {
    if (!forActiveKinds(field)) return '';
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

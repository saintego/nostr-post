import type {
  FieldMapBehavior,
  NostrPostManifest,
  NostrTarget,
  PostField,
  PublishFormat,
} from './types';

export type ResolvedPostField = Omit<PostField, 'mapTo'> & { mapTo: NostrTarget };

export const getFieldTargets = (field: PostField): NostrTarget[] =>
  Array.isArray(field.mapTo) ? field.mapTo : [field.mapTo];

export const getFieldMapBehavior = (field: PostField): FieldMapBehavior =>
  field.mapBehavior ?? 'first-active';

export const getUsedKinds = (manifest: NostrPostManifest): number[] => {
  const kinds = new Set<number>();
  for (const field of manifest.fields) {
    for (const target of getFieldTargets(field)) {
      kinds.add(target.kind);
    }
  }
  return [...kinds].sort((a, b) => a - b);
};

export const getManifestAvailableKinds = (manifest: NostrPostManifest): number[] => {
  if (manifest.publishFormats && manifest.publishFormats.length > 0) {
    const kinds = new Set<number>();
    for (const format of manifest.publishFormats) {
      for (const kind of format.kinds) kinds.add(kind);
    }
    return [...kinds].sort((a, b) => a - b);
  }

  if (manifest.requiredKinds && manifest.requiredKinds.length > 0) {
    return [...manifest.requiredKinds].sort((a, b) => a - b);
  }

  return getUsedKinds(manifest);
};

export const getSelectablePublishFormats = (manifest: NostrPostManifest): PublishFormat[] =>
  (manifest.publishFormats ?? []).filter((format) => format.userSelectable !== false);

export const getDefaultPublishFormat = (manifest: NostrPostManifest): PublishFormat | undefined => {
  if (!manifest.publishFormats || manifest.publishFormats.length === 0) return undefined;
  return manifest.publishFormats.find((format) => format.default) ?? manifest.publishFormats[0];
};

export const getActiveKinds = (
  manifest: NostrPostManifest,
  { activeKinds, selectedFormatId }: { activeKinds?: number[]; selectedFormatId?: string } = {}
): number[] => {
  if (activeKinds && activeKinds.length > 0) {
    return [...new Set(activeKinds)].sort((a, b) => a - b);
  }

  if (manifest.publishFormats && manifest.publishFormats.length > 0) {
    const selected = selectedFormatId
      ? manifest.publishFormats.find((format) => format.id === selectedFormatId)
      : getDefaultPublishFormat(manifest);
    if (selected) {
      return [...new Set(selected.kinds)].sort((a, b) => a - b);
    }
  }

  return getManifestAvailableKinds(manifest);
};

export const getFieldsByKind = (
  manifest: NostrPostManifest,
  kind: number,
  activeKinds: number[] = [kind]
): ResolvedPostField[] => {
  const resolved: ResolvedPostField[] = [];

  for (const field of manifest.fields) {
    const activeTargets = getFieldTargets(field).filter((target) =>
      activeKinds.includes(target.kind)
    );
    if (activeTargets.length === 0) continue;

    const targetsForKind =
      getFieldMapBehavior(field) === 'all-active'
        ? activeTargets.filter((target) => target.kind === kind)
        : activeTargets[0]?.kind === kind
          ? [activeTargets[0]]
          : [];

    for (const target of targetsForKind) {
      resolved.push({
        ...field,
        mapTo: target,
      });
    }
  }

  return resolved;
};

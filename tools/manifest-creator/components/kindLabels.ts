const KIND_LABEL_ENTRIES = [
  [1, '1 (Note)'],
  [30023, '30023 (Article)'],
  [30078, '30078 (NIP-78)'],
  [30079, '30079 (Structured JSON)'],
] as const;

const KIND_LABELS = new Map<number, string>(KIND_LABEL_ENTRIES);

export const SUPPORTED_KINDS = KIND_LABEL_ENTRIES.map(([kind]) => kind);

export const formatKindLabel = (kind: number): string => {
  return KIND_LABELS.get(kind) ?? String(kind);
};

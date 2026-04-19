export const formatKindLabel = (kind: number): string => {
  switch (kind) {
    case 1:
      return '1 (Note)';
    case 30023:
      return '30023 (Article)';
    case 30078:
      return '30078 (NIP-78)';
    case 30079:
      return '30079 (Structured JSON)';
    default:
      return String(kind);
  }
};

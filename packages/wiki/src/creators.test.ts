import { describe, expect, it } from 'vitest';
import { entityCreatorFor, registerEntityCreator } from './creators';

describe('entity creators', () => {
  it('finds the creator whose type matches, registered once', () => {
    const osmTyped = {
      id: 'venue',
      version: '1',
      fields: [
        {
          id: 'name',
          type: 'string',
          uiPlugin: 'text',
          mapTo: { kind: 30818, target: 'table' },
          metadata: { sources: { osm: 'name' } },
        },
      ],
    } as never;
    const plain = { id: 'beer', version: '1', fields: [] } as never;
    const creator = {
      tagName: 'x-create',
      matches: (m: { fields: { metadata?: { sources?: unknown } }[] }) =>
        m.fields.some((f) => f.metadata?.sources !== undefined),
    };
    registerEntityCreator(creator as never);
    registerEntityCreator(creator as never);
    expect(entityCreatorFor(osmTyped)?.tagName).toBe('x-create');
    expect(entityCreatorFor(plain)).toBeUndefined();
  });
});

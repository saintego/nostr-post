import { getManifestAvailableKinds } from '@nostr-post/core/manifestMappings';
import { describe, expect, it } from 'vitest';
import { EXAMPLE_MANIFESTS } from '../../lib/examples';

describe('EXAMPLE_MANIFESTS', () => {
  describe('simple manifest', () => {
    it('should have correct structure', () => {
      const manifest = EXAMPLE_MANIFESTS.simple;
      expect(manifest).toBeDefined();
      expect(manifest.id).toBe('kind1-simple-post');
      expect(manifest.version).toBe('1.0.0');
      expect(getManifestAvailableKinds(manifest)).toEqual([1]);
    });

    it('should have content, media, and tags fields', () => {
      const manifest = EXAMPLE_MANIFESTS.simple;
      expect(manifest.fields.length).toBeGreaterThanOrEqual(3);

      const contentField = manifest.fields.find((f) => f.id === 'content');
      expect(contentField).toBeDefined();
      expect(contentField?.type).toBe('string');

      const mediaField = manifest.fields.find((f) => f.uiPlugin === 'media' || f.id === 'media');
      expect(mediaField).toBeDefined();

      const tagsField = manifest.fields.find((f) => f.uiPlugin === 'hashtag' || f.id === 'tags');
      expect(tagsField).toBeDefined();
      expect(tagsField?.mapTo).toEqual({ kind: 1, target: 'tag', tagName: 't' });
      expect(tagsField?.defaultValue).toEqual(['test', 'nostr-post']);
    });
  });

  describe('geo-review manifest', () => {
    it('should have correct structure', () => {
      const manifest = EXAMPLE_MANIFESTS['geo-review'];
      expect(manifest).toBeDefined();
      expect(manifest.id).toBe('geo-review-v1');
    });

    it('should have location field with geo plugin', () => {
      const manifest = EXAMPLE_MANIFESTS['geo-review'];
      const locationField = manifest.fields.find((f) => f.id === 'location');
      expect(locationField).toBeDefined();
      expect(locationField?.type).toBe('geo');
      expect(locationField?.uiPlugin).toBe('geo');
      expect(locationField?.required).toBe(true);
      expect(locationField?.metadata?.precision).toBe(6);
    });

    it('should have photos field with media plugin', () => {
      const manifest = EXAMPLE_MANIFESTS['geo-review'];
      const photosField = manifest.fields.find((f) => f.id === 'photos');
      expect(photosField).toBeDefined();
      expect(photosField?.uiPlugin).toBe('media');
      expect(photosField?.metadata?.maxFiles).toBe(5);
    });

    it('should have tags field with hashtag plugin', () => {
      const manifest = EXAMPLE_MANIFESTS['geo-review'];
      const tagsField = manifest.fields.find((f) => f.id === 'tags');
      expect(tagsField).toBeDefined();
      expect(tagsField?.uiPlugin).toBe('hashtag');
      expect(tagsField?.metadata?.suggestions).toBeDefined();
    });
  });

  describe('venue-review manifest', () => {
    it('should have correct structure', () => {
      const manifest = EXAMPLE_MANIFESTS['venue-review'];
      expect(manifest).toBeDefined();
      expect(manifest.id).toBe('venue-review-v1');
    });

    it('should have venue field with venue plugin', () => {
      const manifest = EXAMPLE_MANIFESTS['venue-review'];
      const venueField = manifest.fields.find((f) => f.id === 'venue');
      expect(venueField).toBeDefined();
      expect(venueField?.type).toBe('geo');
      expect(venueField?.uiPlugin).toBe('venue');
      expect(venueField?.metadata?.providers).toEqual(['osm']);
    });
  });

  describe('All manifests validation', () => {
    it('should have unique ids', () => {
      const ids = Object.values(EXAMPLE_MANIFESTS).map((m) => m.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should have valid version strings', () => {
      for (const manifest of Object.values(EXAMPLE_MANIFESTS)) {
        expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
      }
    });

    it('should have at least one publish kind', () => {
      for (const manifest of Object.values(EXAMPLE_MANIFESTS)) {
        expect(getManifestAvailableKinds(manifest).length).toBeGreaterThan(0);
      }
    });

    it('should have at least one field', () => {
      for (const manifest of Object.values(EXAMPLE_MANIFESTS)) {
        expect(manifest.fields).toBeDefined();
        expect(manifest.fields.length).toBeGreaterThan(0);
      }
    });

    it('should have unique field ids within each manifest', () => {
      for (const manifest of Object.values(EXAMPLE_MANIFESTS)) {
        const fieldIds = manifest.fields.map((f) => f.id);
        const uniqueFieldIds = new Set(fieldIds);
        expect(fieldIds.length).toBe(uniqueFieldIds.size);
      }
    });

    it('should have valid mapTo configuration for all fields', () => {
      for (const manifest of Object.values(EXAMPLE_MANIFESTS)) {
        for (const field of manifest.fields) {
          expect(field.mapTo).toBeDefined();
          const targets = Array.isArray(field.mapTo) ? field.mapTo : [field.mapTo];
          for (const target of targets) {
            expect(target.kind).toBeTypeOf('number');
            expect(target.target).toBeDefined();
            expect(['content', 'tag']).toContain(target.target);
          }
        }
      }
    });
  });
});

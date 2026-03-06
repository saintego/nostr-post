import type { NostrPostManifest } from '@nostr-post/core/types';
import { describe, expect, it } from 'vitest';
import { EXAMPLE_MANIFESTS } from '../../lib/examples';

describe('EXAMPLE_MANIFESTS', () => {
  describe('simple manifest', () => {
    it('should have correct structure', () => {
      const manifest = EXAMPLE_MANIFESTS.simple;
      expect(manifest).toBeDefined();
      expect(manifest.id).toBe('kind1-note');
      expect(manifest.version).toBe('1.0.0');
      expect(manifest.requiredKinds).toEqual([1]);
    });

    it('should have content and tags fields', () => {
      const manifest = EXAMPLE_MANIFESTS.simple;
      expect(manifest.fields).toHaveLength(2);
      expect(manifest.fields[0].id).toBe('content');
      expect(manifest.fields[0].type).toBe('string');
      expect(manifest.fields[0].uiPlugin).toBe('textarea');
      expect(manifest.fields[0].required).toBe(true);

      expect(manifest.fields[1].id).toBe('tags');
      expect(manifest.fields[1].uiPlugin).toBe('hashtag');
    });

    it('should have proper mapTo configuration', () => {
      const manifest = EXAMPLE_MANIFESTS.simple;
      const contentField = manifest.fields[0];
      expect(contentField.mapTo).toEqual({ kind: 1, target: 'content' });

      const tagsField = manifest.fields[1];
      expect(tagsField.mapTo).toEqual({ kind: 1, target: 'tag', tagName: 't' });
    });
  });

  describe('review manifest', () => {
    it('should have correct structure', () => {
      const manifest = EXAMPLE_MANIFESTS.review;
      expect(manifest).toBeDefined();
      expect(manifest.id).toBe('restaurant-review-v1');
      expect(manifest.version).toBe('1.0.0');
      expect(manifest.requiredKinds).toEqual([1]);
    });

    it('should have three fields', () => {
      const manifest = EXAMPLE_MANIFESTS.review;
      expect(manifest.fields).toHaveLength(3);
    });

    it('should have rating field with stars plugin', () => {
      const manifest = EXAMPLE_MANIFESTS.review;
      const ratingField = manifest.fields.find((f) => f.id === 'rating');
      expect(ratingField).toBeDefined();
      expect(ratingField?.type).toBe('number');
      expect(ratingField?.uiPlugin).toBe('stars');
      expect(ratingField?.required).toBe(true);
    });

    it('should have metadata', () => {
      const manifest = EXAMPLE_MANIFESTS.review;
      expect(manifest.metadata).toBeDefined();
      expect(manifest.metadata?.name).toBe('Restaurant Review');
      expect(manifest.metadata?.description).toBeDefined();
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

    it('should have at least one required kind', () => {
      for (const manifest of Object.values(EXAMPLE_MANIFESTS)) {
        expect(manifest.requiredKinds).toBeDefined();
        expect(manifest.requiredKinds.length).toBeGreaterThan(0);
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
          expect(field.mapTo.kind).toBeTypeOf('number');
          expect(field.mapTo.target).toBeDefined();
          expect(['content', 'tag', 'created_at', 'kind']).toContain(field.mapTo.target);
        }
      }
    });
  });
});

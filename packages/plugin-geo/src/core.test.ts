import type { PostField } from '@nostr-post/plugins/types';
/**
 * Unit tests for geo plugin core
 */
import { describe, expect, it } from 'vitest';
import { decodeGeohash, encodeGeohash, geoPlugin } from './core';

describe('encodeGeohash', () => {
  it('should encode coordinates to geohash', () => {
    // San Francisco: 37.7749° N, 122.4194° W
    const hash = encodeGeohash(37.7749, -122.4194, 6);
    expect(hash).toMatch(/^[0-9bcdefghjkmnpqrstuvwxyz]{6}$/);
  });

  it('should respect precision parameter', () => {
    const hash4 = encodeGeohash(37.7749, -122.4194, 4);
    const hash8 = encodeGeohash(37.7749, -122.4194, 8);
    expect(hash4).toHaveLength(4);
    expect(hash8).toHaveLength(8);
  });

  it('should handle equator and prime meridian', () => {
    const hash = encodeGeohash(0, 0, 6);
    expect(hash).toMatch(/^[0-9bcdefghjkmnpqrstuvwxyz]{6}$/);
  });

  it('should handle extreme coordinates', () => {
    const north = encodeGeohash(89, 0, 6);
    const south = encodeGeohash(-89, 0, 6);
    const east = encodeGeohash(0, 179, 6);
    const west = encodeGeohash(0, -179, 6);

    expect(north).toMatch(/^[0-9bcdefghjkmnpqrstuvwxyz]{6}$/);
    expect(south).toMatch(/^[0-9bcdefghjkmnpqrstuvwxyz]{6}$/);
    expect(east).toMatch(/^[0-9bcdefghjkmnpqrstuvwxyz]{6}$/);
    expect(west).toMatch(/^[0-9bcdefghjkmnpqrstuvwxyz]{6}$/);
  });
});

describe('decodeGeohash', () => {
  it('should decode geohash to coordinates', () => {
    const coords = decodeGeohash('9q8yyk');
    expect(coords.lat).toBeCloseTo(37.775, 1);
    expect(coords.lon).toBeCloseTo(-122.419, 1);
  });

  it('should round-trip encode/decode', () => {
    const original = { lat: 37.7749, lon: -122.4194 };
    const hash = encodeGeohash(original.lat, original.lon, 6);
    const decoded = decodeGeohash(hash);

    expect(decoded.lat).toBeCloseTo(original.lat, 2);
    expect(decoded.lon).toBeCloseTo(original.lon, 2);
  });

  it('should handle different precisions', () => {
    const hash4 = encodeGeohash(40.7128, -74.006, 4);
    const hash8 = encodeGeohash(40.7128, -74.006, 8);

    const coords4 = decodeGeohash(hash4);
    const coords8 = decodeGeohash(hash8);

    // Higher precision should be more accurate
    expect(Math.abs(coords8.lat - 40.7128)).toBeLessThan(Math.abs(coords4.lat - 40.7128));
  });
});

describe('geoPlugin.validate', () => {
  const field: PostField = {
    id: 'location',
    type: 'geo',
    uiPlugin: 'geo',
    mapTo: { kind: 1, target: 'tag', tagName: 'g' },
  };

  it('should validate valid geohash string', () => {
    const result = geoPlugin.validate?.('u09tvw', field);
    expect(result.success).toBe(true);
  });

  it('should reject invalid geohash', () => {
    const result = geoPlugin.validate?.('invalid!', field);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_GEOHASH');
    }
  });

  it('should reject empty string', () => {
    const result = geoPlugin.validate?.('', field);
    expect(result.success).toBe(false);
  });

  it('should reject non-string values', () => {
    const result = geoPlugin.validate?.(123, field);
    expect(result.success).toBe(false);
  });

  it('should reject geohash with invalid characters', () => {
    const result = geoPlugin.validate?.('UPPERCASE', field);
    expect(result.success).toBe(false);
  });

  it('should accept all valid base32 characters', () => {
    const result = geoPlugin.validate?.('0123456789bcdefghjkmnpqrstuvwxyz', field);
    expect(result.success).toBe(true);
  });
});

describe('geoPlugin.formatValue', () => {
  it('should format geohash as coordinates', () => {
    const formatted = geoPlugin.formatValue?.('u09tvw');
    expect(formatted).toContain('📍');
    expect(formatted).toMatch(/\d+\.\d+, -?\d+\.\d+/);
  });

  it('should handle empty string', () => {
    const formatted = geoPlugin.formatValue?.('');
    expect(formatted).toBe('Unknown location');
  });

  it('should handle non-string values', () => {
    const formatted = geoPlugin.formatValue?.(123);
    expect(formatted).toBe('Unknown location');
  });
});

describe('geoPlugin.serializeValue', () => {
  it('should serialize geohash string as-is', () => {
    const result = geoPlugin.serializeValue?.('u09tvw');
    expect(result).toBe('u09tvw');
  });

  it('should handle non-string values', () => {
    const result = geoPlugin.serializeValue?.(123);
    expect(result).toBe('');
  });

  it('should handle empty string', () => {
    const result = geoPlugin.serializeValue?.('');
    expect(result).toBe('');
  });
});

describe('geoPlugin.deserializeValue', () => {
  const field: PostField = {
    id: 'location',
    type: 'geo',
    uiPlugin: 'geo',
    mapTo: { kind: 1, target: 'tag', tagName: 'g' },
  };

  it('should return geohash string as-is', () => {
    const result = geoPlugin.deserializeValue?.('u09tvw', field);
    expect(result).toBe('u09tvw');
  });

  it('should handle empty string', () => {
    const result = geoPlugin.deserializeValue?.('', field);
    expect(result).toBe('');
  });
});

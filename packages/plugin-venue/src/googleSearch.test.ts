import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchGoogleLink } from './googleSearch';

const place = (name: string, lat: number, lon: number) => ({
  name,
  display_name: name,
  lat: String(lat),
  lon: String(lon),
  class: 'amenity',
  type: 'cafe',
  osm_type: 'node',
  osm_id: 1,
  place_rank: 30,
});

/** Nominatim answering by the box's size: `atSpot` in the small box, `around` in the area */
const nominatim = (atSpot: unknown[], around: unknown[]) =>
  vi.fn(async (url: string) => {
    const box = new URL(url).searchParams.get('viewbox')?.split(',').map(Number) ?? [];
    const small = (box[2] ?? 0) - (box[0] ?? 0) < 0.01;
    return new Response(JSON.stringify(small ? atSpot : around));
  });

const link = { name: 'Apostrophe s', lat: 13.7446, lon: 100.5622, cid: '1' };

describe('searchGoogleLink', () => {
  afterEach(() => vi.unstubAllGlobals());

  it("finds the place at the link's spot", async () => {
    vi.stubGlobal('fetch', nominatim([place('Apostrophe', 13.7446, 100.5622)], []));
    const { results, spot } = await searchGoogleLink(link, ['place']);
    expect(spot).toBe(true);
    expect(results).toHaveLength(1);
  });

  it("else searches the link's area, closest first", async () => {
    const far = place('far', 13.78, 100.6);
    const near = place('near', 13.7279, 100.5741);
    const fetchMock = nominatim([], [far, near]);
    vi.stubGlobal('fetch', fetchMock);
    const { results, spot } = await searchGoogleLink(link, ['place']);
    expect(spot).toBe(false);
    expect(results.map((r) => r.display_name)).toEqual(['near', 'far']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

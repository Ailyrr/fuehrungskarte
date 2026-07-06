import type { LngLat } from '../types';

export interface GeocodeResult {
  label: string;
  center: LngLat;
  /** [west, south, east, north] when available, used to frame the view. */
  bbox?: [number, number, number, number];
}

interface NominatimItem {
  display_name: string;
  lat: string;
  lon: string;
  boundingbox?: [string, string, string, string];
}

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';

/**
 * Search for a place using the OpenStreetMap Nominatim service. No API key is
 * required; we send a descriptive Referer via the browser and keep requests
 * light and debounced upstream to respect the usage policy.
 */
export async function searchLocation(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = `${ENDPOINT}?format=jsonv2&limit=6&addressdetails=0&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const data = (await res.json()) as NominatimItem[];
  return data.map((item) => {
    const result: GeocodeResult = {
      label: item.display_name,
      center: [parseFloat(item.lon), parseFloat(item.lat)],
    };
    if (item.boundingbox) {
      const [south, north, west, east] = item.boundingbox.map(parseFloat);
      result.bbox = [west, south, east, north];
    }
    return result;
  });
}

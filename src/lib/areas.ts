import type { Feature, FeatureCollection, Polygon } from 'geojson';
import type { AreaObject, LngLat } from '../types';

/** Area-of-a-polygon weighted centroid (falls back to vertex average). */
export function centroid(points: LngLat[]): LngLat {
  if (points.length === 0) return [0, 0];
  if (points.length < 3) {
    const sum = points.reduce<[number, number]>((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]);
    return [sum[0] / points.length, sum[1] / points.length];
  }
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  area *= 0.5;
  if (Math.abs(area) < 1e-12) {
    const sum = points.reduce<[number, number]>((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]);
    return [sum[0] / points.length, sum[1] / points.length];
  }
  return [cx / (6 * area), cy / (6 * area)];
}

export function areasToFeatureCollection(
  areas: AreaObject[],
  selectedId: string | null,
): FeatureCollection<Polygon> {
  return {
    type: 'FeatureCollection',
    features: areas
      .filter((a) => a.points.length >= 3)
      .map((a) => {
        const ring = a.points.map((p) => [p[0], p[1]]);
        // Close the ring for a valid GeoJSON polygon.
        ring.push([a.points[0][0], a.points[0][1]]);
        return {
          type: 'Feature',
          id: a.id,
          properties: { id: a.id, color: a.color, sel: a.id === selectedId ? 1 : 0 },
          geometry: { type: 'Polygon', coordinates: [ring] },
        };
      }),
  };
}

/** Draft geometry shown while a polygon is being drawn. */
export function draftToFeatureCollection(points: LngLat[]): FeatureCollection {
  const coords = points.map((p) => [p[0], p[1]]);
  const features: Feature[] = [];
  if (coords.length >= 2) {
    features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } });
  }
  if (coords.length >= 1) {
    features.push({ type: 'Feature', properties: {}, geometry: { type: 'MultiPoint', coordinates: coords } });
  }
  return { type: 'FeatureCollection', features };
}

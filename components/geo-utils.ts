// geo-utils.ts
import { geoMercator, geoPath, type GeoProjection } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import countries110m from "world-atlas/countries-110m.json";

export type CountryName =
  | "United States"
  | "United Kingdom"
  | "France"
  | "Japan"
  | "Canada"
  | "Greece"
  | "Costa Rica";

const NAME_TO_M49: Record<CountryName, number> = {
  "United States": 840,
  "United Kingdom": 826,
  France: 250,
  Japan: 392,
  Canada: 124,
  Greece: 300,
  "Costa Rica": 188,
};

export function parseViewBox(viewBox: string) {
  const parts = viewBox.trim().split(/\s+/).map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
    return { width: 1000, height: 700 };
  }
  const [, , width, height] = parts;
  return { width, height };
}

export function getCountryFeature(country: CountryName) {
  const topo = countries110m as unknown as Topology<any>;
  const fc = feature(topo, (topo.objects as any).countries) as any; // GeoJSON FeatureCollection
  const m49 = NAME_TO_M49[country];
  const f = (fc.features as Array<{ id: number }>).find(
    (x) => Number(x.id) === m49
  );
  return f || null;
}

/** Build a projection + path generator fit to a single feature with a small margin. */
export function buildProjection(
  geojsonFeature: any,
  width: number,
  height: number,
  margin = 10
) {
  const projection: GeoProjection = geoMercator().fitExtent(
    [
      [margin, margin],
      [width - margin, height - margin],
    ],
    geojsonFeature
  );
  const path = geoPath(projection);
  return { projection, path };
}

/** Optional helper: remove Alaska & Hawaii, leaving the Lower 48. */
export function toUSLower48(usaFeature: any) {
  if (!usaFeature || usaFeature.geometry?.type !== "MultiPolygon")
    return usaFeature;
  const filtered = usaFeature.geometry.coordinates.filter((poly: any) => {
    // Rough bounds test using first ring of the polygon
    const ring = poly[0] as [number, number][];
    const xs = ring.map((p) => p[0]);
    const ys = ring.map((p) => p[1]);
    const minX = Math.min(...xs),
      maxX = Math.max(...xs);
    const minY = Math.min(...ys),
      maxY = Math.max(...ys);
    const looksLikeAlaska = maxY > 50 && minX < -129;
    const looksLikeHawaii = maxY < 25 && minX < -154;
    return !(looksLikeAlaska || looksLikeHawaii);
  });
  return {
    ...usaFeature,
    geometry: { ...usaFeature.geometry, coordinates: filtered },
  };
}

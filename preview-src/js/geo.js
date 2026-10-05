// Sphere maths. Places are unit vectors: x toward (0°, 0°), y toward 90° east, z toward the north pole.

export const RAD = Math.PI / 180;
export const DEG = 180 / Math.PI;
export const EARTH_MILES = 3958.8;

export function vec(lon, lat) {
  const cosLat = Math.cos(lat * RAD);
  return [cosLat * Math.cos(lon * RAD), cosLat * Math.sin(lon * RAD), Math.sin(lat * RAD)];
}
export const lonLat = v => [Math.atan2(v[1], v[0]) * DEG, Math.asin(Math.max(-1, Math.min(1, v[2]))) * DEG];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Angle between two places, in radians. */
export const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(a, b))));

/** The point a fraction t of the way along the great circle from a to b. */
export function slerp(a, b, t) {
  const w = angle(a, b);
  if (w < 1e-9) return [a[0], a[1], a[2]];
  const s = Math.sin(w), ka = Math.sin((1 - t) * w) / s, kb = Math.sin(t * w) / s;
  return [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];
}

/**
 * The three axes of an orthographic view centred on (lon, lat), as world vectors:
 * east points right on screen, north points up, out points at the viewer.
 */
export function viewBasis(lon, lat) {
  const sinLon = Math.sin(lon * RAD), cosLon = Math.cos(lon * RAD), sinLat = Math.sin(lat * RAD), cosLat = Math.cos(lat * RAD);
  return {
    east: [-sinLon, cosLon, 0],
    north: [-sinLat * cosLon, -sinLat * sinLon, cosLat],
    out: [cosLat * cosLon, cosLat * sinLon, sinLat],
  };
}

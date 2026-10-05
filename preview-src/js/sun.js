// Where the sun is, and when it rises and sets. Accurate to about a minute, which is plenty for a travel page.

import { RAD, DEG, vec, dot } from './geo.js';

const DAY = 864e5;

/** The point on Earth directly under the sun at a given time: [lon, lat] in degrees. */
export function subsolar(ms) {
  const d = (ms - Date.UTC(2000, 0, 1, 12)) / DAY;                       // days since J2000
  const g = ((357.529 + 0.98560028 * d) % 360) * RAD;                    // mean anomaly
  const q = (280.459 + 0.98564736 * d) % 360;                            // mean longitude
  const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * RAD;   // ecliptic longitude
  const e = (23.439 - 0.00000036 * d) * RAD;                             // tilt of the Earth's axis
  const rightAscension = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const declination = Math.asin(Math.sin(e) * Math.sin(L));
  const siderealHours = (18.697374558 + 24.06570982441908 * d) % 24;
  const lon = ((rightAscension * DEG - siderealHours * 15 + 540) % 360 + 360) % 360 - 180;
  return [lon, declination * DEG];
}

/** Height of the sun above the horizon at a place, in degrees (negative after sunset). */
export function sunElevation(ms, lat, lon) {
  const [sunLon, sunLat] = subsolar(ms);
  return 90 - Math.acos(Math.max(-1, Math.min(1, dot(vec(lon, lat), vec(sunLon, sunLat))))) * DEG;
}

/** The next sunrise or sunset at a place: { label: 'Sunrise' | 'Sunset', at: ms }, or null where the sun does not rise or set today. */
export function nextSunEvent(ms, lat, lon) {
  const start = ms - 12 * 36e5;
  const hoursToNoon = (((subsolar(start)[0] - lon) % 360) + 360) % 360 / 15;
  let noon = start + hoursToNoon * 36e5;
  noon += ((subsolar(noon)[0] - lon + 540) % 360 - 180) / 15 * 36e5;      // refine: the sun drifts while we wait for it
  const declination = subsolar(noon)[1];
  const cosHalfDay = (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * Math.sin(declination * RAD)) / (Math.cos(lat * RAD) * Math.cos(declination * RAD));
  if (Math.abs(cosHalfDay) > 1) return null;
  const halfDay = Math.acos(cosHalfDay) * DEG / 15 * 36e5;
  if (ms < noon - halfDay) return { label: 'Sunrise', at: noon - halfDay };
  if (ms < noon + halfDay) return { label: 'Sunset', at: noon + halfDay };
  return { label: 'Sunrise', at: noon + DAY - halfDay };
}

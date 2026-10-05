// Everything the page derives from the trip: places, the legs between stops, a playback track for the replay, and the totals.

import { vec, angle, slerp, EARTH_MILES, DEG } from './geo.js';
import { US_STATES } from './data.js';

export const DAY = 864e5;

/** Whole days since 1970 for an ISO date, so two dates can be subtracted. */
export const dayIndex = iso => {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY);
};

const formatters = new Map();
function wallClock(ms, tz) {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    formatters.set(tz, f);
  }
  const p = {};
  for (const part of f.formatToParts(ms)) p[part.type] = +part.value;
  return p;
}
/** The calendar date at a place at a given moment, as "YYYY-MM-DD". */
export function localDate(ms, tz) {
  const p = wallClock(ms, tz);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}
/** The moment a date reaches midday at a place. Moves are taken to happen at midday where the day starts. */
export function zonedNoon(iso, tz) {
  const [y, m, d] = iso.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, 12);
  const p = wallClock(guess, tz);
  const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return guess - (shown - guess);
}

const ease = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const slugify = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * trip: { stops, someday } from data.js. Returns the model the whole page reads from.
 *
 * Playback runs on a track measured in seconds of screen time ("u"), not in days: a three-month stay and a one-night
 * stopover would otherwise be either endless or invisible. Each stay and each move gets a segment of the track.
 */
export function buildModel(trip, nowMs = Date.now()) {
  const stops = trip.stops.map((s, i) => ({ ...s, i, nights: Math.max(0, dayIndex(s.dep) - dayIndex(s.arr)), v: vec(s.lon, s.lat) }));
  stops.forEach((s, i) => {
    const prev = stops[i - 1];
    s.a = prev && prev.dep === s.arr ? prev.d : zonedNoon(s.arr, s.tz);
    if (prev && s.a < prev.d) s.a = prev.d;
    s.d = Math.max(s.a, zonedNoon(s.dep, s.tz));
  });
  const startIso = stops[0].dep;                 // the trip starts the day the first stop (the old house) was left
  const tMin = stops[0].d;
  const tMax = stops[stops.length - 1].d;

  // places: one entry per distinct town, with every visit to it
  const places = new Map();
  const slugs = {}, bySlug = new Map();
  for (const s of stops) {
    let place = places.get(s.key);
    if (!place) places.set(s.key, (place = { key: s.key, name: s.name, region: s.region, country: s.country, lon: s.lon, lat: s.lat, v: s.v, visits: [] }));
    place.visits.push(s);
    s.place = place;
    const base = `${slugify(s.name) || 'stop'}-${s.arr.slice(0, 4)}`;
    slugs[base] = (slugs[base] || 0) + 1;
    s.slug = slugs[base] > 1 ? `${base}-${slugs[base]}` : base;
    bySlug.set(s.slug, s);
  }
  const someday = (trip.someday || [])
    .filter(s => s.lat != null && s.lon != null)
    .map(s => ({ ...s, v: vec(s.lon, s.lat), visits: [], someday: true }));

  // legs: the move from each stop to the next, sampled along the great circle so the globe can draw it
  const legs = [];
  for (let j = 0; j < stops.length - 1; j++) {
    const a = stops[j], b = stops[j + 1];
    const ang = angle(a.v, b.v), fly = b.how === 'fly';
    const n = Math.max(fly ? 16 : 2, Math.ceil(ang * DEG / (fly ? 1.2 : 1.5)));
    const pts = new Float32Array((n + 1) * 3);
    for (let k = 0; k <= n; k++) pts.set(slerp(a.v, b.v, k / n), k * 3);
    legs.push({ j, a, b, fly, ang, miles: ang * EARTH_MILES, pts, n });
  }

  // the playback track
  const segs = [];
  let u = 0;
  const push = (type, i, seconds, t0, t1) => { segs.push({ type, i, u0: u, u1: u + seconds, t0, t1 }); u += seconds; };
  push('stay', 0, 1.1, tMin, tMin);
  for (const leg of legs) {
    push('move', leg.j, (leg.fly ? 0.9 : 0.45) + Math.min(1.1, leg.miles / 3000), leg.j === 0 ? tMin : leg.a.d, leg.b.a);
    push('stay', leg.j + 1, Math.max(0.2, Math.min(2.5, leg.b.nights / 40)), leg.b.a, leg.b.d);
  }
  const uEnd = u;

  const segAt = pos => {
    let lo = 0, hi = segs.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (segs[mid].u1 <= pos) lo = mid + 1; else hi = mid; }
    return segs[lo];
  };
  const dateOf = pos => {
    const s = segAt(pos), k = s.u1 > s.u0 ? (pos - s.u0) / (s.u1 - s.u0) : 0;
    return s.t0 + (s.t1 - s.t0) * Math.min(1, Math.max(0, k));
  };
  const uOf = t => {
    if (t <= tMin) return 0;
    if (t >= tMax) return uEnd - 1e-4;
    const hit = segs.find(s => s.type === 'stay' && s.i > 0 && t >= s.t0 && t < s.t1)
      || segs.find(s => s.type === 'move' && s.t1 > s.t0 && t >= s.t0 && t < s.t1);
    return hit ? hit.u0 + (hit.u1 - hit.u0) * ((t - hit.t0) / (hit.t1 - hit.t0)) : 0;
  };
  /** Where they were at a point on the track: at a stop, or part-way along a leg. */
  const at = pos => {
    const seg = segAt(pos);
    if (seg.type === 'stay') { const stop = stops[seg.i]; return { seg, stop, leg: null, f: 0, v: stop.v }; }
    const leg = legs[seg.i], f = ease(Math.min(1, Math.max(0, (pos - seg.u0) / (seg.u1 - seg.u0))));
    return { seg, stop: null, leg, f, v: slerp(leg.a.v, leg.b.v, f) };
  };
  /** How far along a leg the replay has drawn, 0..1. */
  const legProgress = (leg, pos) => {
    const seg = segs[1 + 2 * leg.j];
    return pos >= seg.u1 ? 1 : pos <= seg.u0 ? 0 : ease((pos - seg.u0) / (seg.u1 - seg.u0));
  };
  const stayStart = i => segs[2 * i].u0;

  const model = {
    stops, places, someday, somedayAll: trip.someday || [], legs, segs, uEnd, tMin, tMax, startIso, bySlug,
    segAt, dateOf, uOf, at, legProgress, stayStart,
    now: 0, uNow: 0, current: null, today: startIso, zone: stops[0].tz, stale: false,
    /** Call every minute or so: moves "now" forward and works out the current stop and today's date where they are. */
    setNow(ms) {
      model.stale = ms >= tMax && stops.length > 1;          // the sheet has no stop covering today
      model.now = Math.min(Math.max(tMin, tMax - 1), Math.max(tMin, ms));
      model.uNow = uOf(model.now);
      model.current = stops.find(s => model.now >= s.a && model.now < s.d) || (stops.length === 1 ? stops[0] : null);
      let latest = stops[0];
      for (const s of stops) if (s.a <= model.now) latest = s;
      model.zone = (model.current || latest).tz;
      model.today = localDate(ms, model.zone);
      model.latest = latest;
      return model;
    },
    /** Day number of the trip for a calendar date. */
    dayNumber: iso => dayIndex(iso) - dayIndex(startIso),
  };
  return model.setNow(nowMs);
}

/** The totals for the "since we sold the house" section. Counts only what has happened, never the plan. */
export function tripStats(model) {
  const { now, stops, legs, places } = model;
  const been = stops.filter(s => s.i > 0 && s.a <= now);
  const done = legs.filter(l => l.b.a <= now);
  const sum = list => list.reduce((total, l) => total + l.miles, 0);
  const isState = s => s.country === 'United States' && US_STATES.has(s.region);
  const states = [...new Set(been.filter(isState).map(s => s.region))];
  const plannedStates = [...new Set(stops.filter(s => s.a > now && isState(s)).map(s => s.region))].filter(r => !states.includes(r));
  const nightsSoFar = s => Math.max(0, Math.min(dayIndex(s.dep), dayIndex(model.today)) - dayIndex(s.arr));
  const finished = been.filter(s => s.d <= now);
  const longest = finished.reduce((best, s) => (!best || s.nights > best.nights ? s : best), null);
  const tally = new Map();
  for (const s of been) {
    const t = tally.get(s.key) || { place: places.get(s.key), n: 0, nights: 0 };
    t.n += 1; t.nights += nightsSoFar(s);
    tally.set(s.key, t);
  }
  let favourite = null;
  for (const t of tally.values()) if (!favourite || t.n > favourite.n || (t.n === favourite.n && t.nights > favourite.nights)) favourite = t;
  return {
    days: Math.max(0, model.dayNumber(model.today)),
    miles: sum(done), flown: sum(done.filter(l => l.fly)), driven: sum(done.filter(l => !l.fly)),
    places: tally.size,
    moves: been.length,
    states, plannedStates,
    countries: [...new Set(been.map(s => s.country))],
    nightsAbroad: been.filter(s => s.country !== 'United States').reduce((n, s) => n + nightsSoFar(s), 0),
    longest, favourite: favourite && favourite.n > 1 ? favourite : null,
    nightsSoFar,
  };
}

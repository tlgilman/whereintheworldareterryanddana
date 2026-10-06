// Turns the rows of the travel sheet (as served by /api/travel-data) into a clean trip:
// consistent place names, ISO dates, IANA time zones, and stops in date order.
// Pure functions only, so the same file runs in the browser and in Node.

const STATES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
  DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico',
  NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island',
  SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', PR: 'Puerto Rico',
};
const PROVINCES = {
  AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick', NL: 'Newfoundland and Labrador', NS: 'Nova Scotia',
  NT: 'Northwest Territories', NU: 'Nunavut', ON: 'Ontario', PE: 'Prince Edward Island', QC: 'Quebec', SK: 'Saskatchewan', YT: 'Yukon',
};
/** The fifty states by name: the District of Columbia and Puerto Rico are places to stay, but not states to count. */
export const US_STATES = new Set(Object.values(STATES).filter(name => name !== 'District of Columbia' && name !== 'Puerto Rico'));
const byLowerName = map => Object.fromEntries(Object.values(map).map(v => [v.toLowerCase(), v]));
const STATE_NAMES = byLowerName(STATES);
const PROVINCE_NAMES = byLowerName(PROVINCES);

// Spellings in the sheet that should read as one place. Fixing them in the sheet makes these entries unnecessary.
const SPELLING = { ashville: 'Asheville', lanarca: 'Larnaca', 'palm spring': 'Palm Springs', kamloop: 'Kamloops', devenport: 'Davenport' };

const COUNTRY_ALIAS = {
  uk: 'United Kingdom', 'u.k.': 'United Kingdom', 'great britain': 'United Kingdom', britain: 'United Kingdom',
  england: 'United Kingdom', scotland: 'United Kingdom', wales: 'United Kingdom', 'northern ireland': 'United Kingdom',
  us: 'United States', usa: 'United States', 'u.s.': 'United States', 'u.s.a.': 'United States', america: 'United States',
  'united states of america': 'United States', uae: 'United Arab Emirates',
};
const HOME_NATION = { scotland: 'Scotland', wales: 'Wales', england: 'England', 'northern ireland': 'Northern Ireland' };

const ZONE = { E: 'America/New_York', C: 'America/Chicago', M: 'America/Denver', P: 'America/Los_Angeles' };
const REGION_ZONE = {};
const assign = (zone, names) => names.split(',').forEach(n => { REGION_ZONE[n] = zone; });
assign(ZONE.E, 'Connecticut,Delaware,District of Columbia,Florida,Georgia,Indiana,Kentucky,Maine,Maryland,Massachusetts,Michigan,New Hampshire,New Jersey,New York,North Carolina,Ohio,Pennsylvania,Rhode Island,South Carolina,Vermont,Virginia,West Virginia');
assign(ZONE.C, 'Alabama,Arkansas,Illinois,Iowa,Kansas,Louisiana,Minnesota,Mississippi,Missouri,Nebraska,North Dakota,Oklahoma,South Dakota,Tennessee,Texas,Wisconsin');
assign(ZONE.M, 'Colorado,Idaho,Montana,New Mexico,Utah,Wyoming');
assign(ZONE.P, 'California,Nevada,Oregon,Washington');
Object.assign(REGION_ZONE, {
  Arizona: 'America/Phoenix', Alaska: 'America/Anchorage', Hawaii: 'Pacific/Honolulu', 'Puerto Rico': 'America/Puerto_Rico',
  'British Columbia': 'America/Vancouver', Alberta: 'America/Edmonton', Saskatchewan: 'America/Regina', Manitoba: 'America/Winnipeg',
  Ontario: 'America/Toronto', Quebec: 'America/Toronto', 'New Brunswick': 'America/Moncton', 'Nova Scotia': 'America/Halifax',
  'Prince Edward Island': 'America/Halifax', 'Newfoundland and Labrador': 'America/St_Johns', Yukon: 'America/Whitehorse',
  'Northwest Territories': 'America/Yellowknife', Nunavut: 'America/Iqaluit',
});
// One zone per country is right for most places; countries that span several zones use the largest city's.
const COUNTRY_ZONE = {
  'United Kingdom': 'Europe/London', Ireland: 'Europe/Dublin', France: 'Europe/Paris', Spain: 'Europe/Madrid', Portugal: 'Europe/Lisbon',
  Italy: 'Europe/Rome', Germany: 'Europe/Berlin', Netherlands: 'Europe/Amsterdam', Belgium: 'Europe/Brussels', Switzerland: 'Europe/Zurich',
  Austria: 'Europe/Vienna', Greece: 'Europe/Athens', Cyprus: 'Asia/Nicosia', Turkey: 'Europe/Istanbul', Croatia: 'Europe/Zagreb',
  Norway: 'Europe/Oslo', Sweden: 'Europe/Stockholm', Denmark: 'Europe/Copenhagen', Finland: 'Europe/Helsinki', Iceland: 'Atlantic/Reykjavik',
  Poland: 'Europe/Warsaw', 'Czech Republic': 'Europe/Prague', Czechia: 'Europe/Prague', Hungary: 'Europe/Budapest', Romania: 'Europe/Bucharest',
  Bulgaria: 'Europe/Sofia', Slovenia: 'Europe/Ljubljana', Montenegro: 'Europe/Podgorica', Albania: 'Europe/Tirane', Malta: 'Europe/Malta',
  Estonia: 'Europe/Tallinn', Latvia: 'Europe/Riga', Lithuania: 'Europe/Vilnius', Georgia: 'Asia/Tbilisi', Morocco: 'Africa/Casablanca',
  Egypt: 'Africa/Cairo', 'South Africa': 'Africa/Johannesburg', Kenya: 'Africa/Nairobi', Israel: 'Asia/Jerusalem', Jordan: 'Asia/Amman',
  'United Arab Emirates': 'Asia/Dubai', India: 'Asia/Kolkata', Nepal: 'Asia/Kathmandu', 'Sri Lanka': 'Asia/Colombo', Thailand: 'Asia/Bangkok',
  Vietnam: 'Asia/Ho_Chi_Minh', Cambodia: 'Asia/Phnom_Penh', Laos: 'Asia/Vientiane', Malaysia: 'Asia/Kuala_Lumpur', Singapore: 'Asia/Singapore',
  Indonesia: 'Asia/Jakarta', Philippines: 'Asia/Manila', China: 'Asia/Shanghai', 'Hong Kong': 'Asia/Hong_Kong', Taiwan: 'Asia/Taipei',
  Japan: 'Asia/Tokyo', 'South Korea': 'Asia/Seoul', Australia: 'Australia/Sydney', 'New Zealand': 'Pacific/Auckland', Fiji: 'Pacific/Fiji',
  Mexico: 'America/Mexico_City', Belize: 'America/Belize', Guatemala: 'America/Guatemala', 'Costa Rica': 'America/Costa_Rica',
  Panama: 'America/Panama', Colombia: 'America/Bogota', Ecuador: 'America/Guayaquil', Peru: 'America/Lima', Chile: 'America/Santiago',
  Argentina: 'America/Argentina/Buenos_Aires', Brazil: 'America/Sao_Paulo', Uruguay: 'America/Montevideo', Bahamas: 'America/Nassau',
  Jamaica: 'America/Jamaica', 'Dominican Republic': 'America/Santo_Domingo', Cuba: 'America/Havana', Aruba: 'America/Aruba',
};

const titleCase = s => s.replace(/\S+/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());

/** "UK" -> "United Kingdom", "JAPAN" -> "Japan", "" -> "". */
function tidyCountry(value) {
  const s = String(value || '').trim().replace(/\s+/g, ' ');
  if (!s) return '';
  const alias = COUNTRY_ALIAS[s.toLowerCase()];
  if (alias) return alias;
  return s === s.toUpperCase() || s === s.toLowerCase() ? titleCase(s) : s;
}

function validZone(zone) {
  try { new Intl.DateTimeFormat('en-US', { timeZone: zone }); return true; } catch (e) { return false; }
}

/** "Asheville, NC" + "United States" -> { name, region, country, key } with full state names and corrected spellings. */
export function parsePlace(location, country) {
  let parts = String(location || '').split(',').map(s => s.trim().replace(/\s+/g, ' ')).filter(Boolean);
  const givenRaw = String(country || '').trim() || (parts.length > 2 ? parts[parts.length - 1] : '');   // "New York, NY, USA"
  const given = tidyCountry(givenRaw);
  const givenUS = !given || given === 'United States', givenCA = given === 'Canada';

  if (parts.length === 1 && (givenUS || givenCA)) {            // "Pensacola FL", with no comma
    const m = parts[0].match(/^(.*\S)\s+([A-Z][A-Za-z])$/);
    const code = m && m[2].toUpperCase();
    if (m && ((givenUS && STATES[code]) || PROVINCES[code])) parts = [m[1], m[2]];
  }
  const raw = parts[0] || '';
  const name = SPELLING[raw.toLowerCase()] || raw;
  const rest = parts[1] || '';
  const code = rest.replace(/\./g, '').toUpperCase(), lower = rest.toLowerCase();

  let nation = given || 'United States', region;
  if (givenUS && (STATES[code] || STATE_NAMES[lower])) {
    region = STATES[code] || STATE_NAMES[lower]; nation = 'United States';
  } else if ((givenUS || givenCA) && (PROVINCES[code] || PROVINCE_NAMES[lower])) {
    region = PROVINCES[code] || PROVINCE_NAMES[lower]; nation = 'Canada';       // a province settles it even if the country column says otherwise
  } else if (HOME_NATION[givenRaw.toLowerCase()] || HOME_NATION[lower]) {
    region = HOME_NATION[givenRaw.toLowerCase()] || HOME_NATION[lower]; nation = 'United Kingdom';
  } else {
    const restCountry = rest ? tidyCountry(rest) : '';
    const unknownCode = /^[A-Z]{2,3}$/.test(rest) && !COUNTRY_ALIAS[lower];      // "Berlin, DE": not a place name worth showing
    if (!given && restCountry && !unknownCode) nation = restCountry;             // "Paris, France" with an empty country column
    region = !rest || restCountry === nation || unknownCode ? nation : rest;
  }
  return { name, region, country: nation, key: name + '|' + region };
}

/** Always returns a usable IANA zone. Covers the states whose time zone line does not follow the state border. */
export function zoneFor(place, lon, lat, sheetZone) {
  const written = String(sheetZone || '').trim();
  if (/^[A-Za-z_]+\/[A-Za-z_\/+-]+$/.test(written) && validZone(written)) return written;      // the sheet may name the zone outright
  const r = place.region;
  let zone = place.country === 'United States' || place.country === 'Canada' ? REGION_ZONE[r] : undefined;
  if (place.country === 'United States') {
    if (r === 'Florida' && lon < -85.3) zone = ZONE.C;                                              // the panhandle
    if (r === 'Kentucky' && lon < -86.1) zone = ZONE.C;
    if (r === 'Tennessee' && (lon > -84.6 || (lat < 35.35 && lon > -85.65))) zone = ZONE.E;         // Knoxville, Chattanooga
    if (r === 'Indiana' && lon < -86.9 && (lat > 41 || lat < 38.6)) zone = ZONE.C;                  // Gary, Evansville
    if (r === 'Texas' && lon < -104.9) zone = ZONE.M;                                               // El Paso
    if ((r === 'South Dakota' && lon < -100.5) || (r === 'Nebraska' && lon < -101) || (r === 'North Dakota' && lon < -101.5 && lat < 47.5)) zone = ZONE.M;
    if (r === 'Idaho' && lat > 45.3) zone = ZONE.P;                                                 // the panhandle
  }
  if (!zone) zone = COUNTRY_ZONE[place.country];
  if (!zone) {                                                         // the fixed offset written in the sheet, e.g. "EEST (UTC+3)"
    const m = written.match(/UTC\s*([+\-\u2212])\s*(\d{1,2})/);
    if (m) zone = 'Etc/GMT' + (m[1] === '+' ? '-' : '+') + Number(m[2]);
    if (zone && !validZone(zone)) zone = undefined;                    // "UTC+30" is a typing slip, not a time zone
  }
  if (!zone) {                                                         // last resort: the hour the longitude suggests
    const hours = Math.round(lon / 15);
    zone = hours === 0 ? 'Etc/GMT' : 'Etc/GMT' + (hours > 0 ? '-' : '+') + Math.abs(hours);
  }
  return zone;
}

/** "9/12/2026", "9/12/26" or "2026-09-12T..." -> "2026-09-12"; anything else, or a date that does not exist, -> null. */
export function isoDate(value) {
  const s = String(value == null ? '' : value).trim();
  let y, m, d;
  let hit = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})(?!\d)/);
  if (hit) { m = +hit[1]; d = +hit[2]; y = +hit[3]; if (hit[3].length === 2) y += 2000; }
  else if ((hit = s.match(/^(\d{4})-(\d{2})-(\d{2})(?!\d)/))) { y = +hit[1]; m = +hit[2]; d = +hit[3]; }
  else return null;
  const check = new Date(Date.UTC(y, m - 1, d));
  if (y < 1900 || check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
const nextDay = iso => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
};

/**
 * Sheet rows -> { stops, someday, notes }.
 * A stop has: name, region, country, key, arr, dep (ISO dates), base, booked, lat, lon, tz, how ('drive' | 'fly' | ''),
 * travel (text), note, off ([start, end] time off work, or null), vacation (the sheet has both a vacation start and a
 * vacation end date for this stop) and flag (a data problem worth showing, or undefined).
 * Rows with no arrival date become "someday" places. A row with a date but no position, or no departure date, is kept
 * and flagged. `notes` lists problems found in the sheet, for the site owner.
 */
export function normalizeRows(rows) {
  if (!Array.isArray(rows) || !rows.length) throw new Error('The travel sheet returned no rows');
  const stops = [], someday = [], notes = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object' || !row.location || !String(row.location).trim()) continue;
    const place = parsePlace(row.location, row.country);
    if (!place.name) continue;
    const c = row.coordinates || {};
    const lat = Number(c.lat), lon = Number(c.lon);
    const located = c.lat != null && c.lon != null && c.lat !== '' && c.lon !== '' && Number.isFinite(lat) && Number.isFinite(lon)
      && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && !(lat === 0 && lon === 0);
    const arr = isoDate(row.arrivalDate), dep = isoDate(row.departureDate);
    if (!arr) {                                    // no arrival date: somewhere they mean to go one day
      if (dep) notes.push(`${place.name}: the sheet has a departure date but no arrival date, so it is listed without dates.`);
      someday.push({ ...place, ...(located ? { lat, lon } : {}) });
      continue;
    }
    const travel = String(row.travelTimeToHere || '').replace(/\*/g, '').trim();
    const fly = /^fly/i.test(travel);
    const offStart = isoDate(row.vacationStart), offEnd = isoDate(row.vacationEnd);
    const offOk = offStart && offEnd && offStart <= offEnd && offStart >= arr && (!dep || offEnd <= dep);
    if ((offStart || offEnd) && !offOk) notes.push(`${place.name}: the vacation dates (${row.vacationStart} to ${row.vacationEnd}) fall outside the stay, so they are not shown.`);
    stops.push({
      ...place, arr, dep, base: Boolean(row.residing), booked: Boolean(row.booked), lat: located ? lat : null, lon: located ? lon : null,
      tz: row.timeZone,                              // settled below, once every stop has a position
      how: travel ? (fly ? 'fly' : 'drive') : '',
      travel: travel.replace(/^flying:?\s*/i, ''),
      note: String(row.note || '').trim(),
      off: offOk ? [offStart, offEnd] : null,
      vacation: Boolean(offStart && offEnd),
    });
  }
  if (!stops.length) throw new Error('The travel sheet has no dated stops');
  stops.sort((a, b) => (a.arr < b.arr ? -1 : a.arr > b.arr ? 1 : 0));
  const flag = (s, text) => { s.flag = s.flag ? s.flag + ' ' + text : text; notes.push(text); };
  const placed = stops.find(s => s.lat != null);
  if (!placed) throw new Error('No stop in the travel sheet has a map position');
  stops.forEach((s, i) => {
    const next = stops[i + 1];
    // A new row often arrives half filled in. Show the stop anyway, and say what is missing.
    if (s.lat == null) {
      const near = stops.slice(0, i).reverse().find(o => o.lat != null) || placed;
      s.lat = near.lat; s.lon = near.lon;
      flag(s, `The sheet has no map position for ${s.name} yet, so the globe shows it at ${near.name}.`);
    }
    s.tz = zoneFor(s, s.lon, s.lat, s.tz);
    if (!s.dep) {
      s.dep = next ? next.arr : nextDay(s.arr);
      flag(s, `The sheet has no departure date for ${s.name} yet.`);
    } else if (s.dep < s.arr) {
      flag(s, `The sheet has ${s.name} leaving before it arrives, so these dates need a look.`);
      s.dep = nextDay(s.arr);
    }
    if (next && next.arr < s.dep) {              // overlapping stays: the later arrival wins
      notes.push(`${s.name}: the sheet has this stay running past the day ${next.name} begins, so it is cut short there.`);
      s.dep = next.arr > s.arr ? next.arr : s.arr;
    }
  });
  stops[0].how = '';
  return { stops, someday, notes };
}

/**
 * A photo entry from /api/photos -> { key, thumb, large, caption }, or null if its address is not one a page should load.
 * Google Photos addresses take a size suffix, so the strip asks for small copies and the viewer for large ones.
 */
export function photoFromApi(entry, origin) {
  if (!entry || typeof entry.url !== 'string') return null;
  const raw = entry.url.trim();
  if (!raw) return null;
  let url;
  try { url = new URL(raw, origin || 'https://example.invalid/'); } catch (e) { return null; }
  const sameSite = origin && url.origin === new URL(origin).origin;
  if (url.protocol !== 'https:' && !sameSite) return null;
  if (/^\/api\//.test(url.pathname) && sameSite) return null;
  const place = parsePlace(entry.location, entry.country);
  const caption = entry.source === 'google_photos' ? '' : String(entry.caption || '').trim();
  let thumb = url.href, large = url.href;
  if (/(^|\.)googleusercontent\.com$/.test(url.hostname)) {
    const base = url.href.replace(/=[a-z]\d+(-[a-z0-9-]+)*$/i, '');
    thumb = base + '=w480'; large = base + '=w1600';
  }
  return { key: place.key, thumb, large, caption, id: String(entry.id || url.href), added: String(entry.uploadedAt || '') };
}

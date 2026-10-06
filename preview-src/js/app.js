// The page: reads the travel sheet, builds the trip, and keeps the sign, the globe, the replay bar and the lists in step.

import { normalizeRows, photoFromApi } from './data.js';
import { buildModel, tripStats, dayIndex, localDate } from './model.js';
import { Globe } from './globe.js';
import { nextSunEvent, sunElevation } from './sun.js';
import { createViewer } from './viewer.js';
import { currentWeather } from './weather.js';
import SNAPSHOT from './snapshot.js';

const $ = id => document.getElementById(id);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
// The page's own files (maps, photos, outlines) sit next to this script, wherever the page itself is served from.
const HERE = new URL('./', ($('appjs') || {}).src || document.baseURI);
const asset = path => new URL(path, HERE).href;
// A copy of the page shown away from the site (a prototype link, a file on disk) sets this: it then runs on the saved trip and asks nobody for anything.
const offline = Boolean(window.__early && window.__early.offline);
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const num = n => n.toLocaleString('en-US');
const plural = (n, word) => `${num(n)} ${word}${n === 1 ? '' : 's'}`;
const ordinal = n => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };

// dates: stops carry calendar dates ("2026-09-12"), so they are formatted without any time zone getting involved
const formats = {};
const fmt = (iso, key, options) => {
  const [y, m, d] = iso.split('-').map(Number);
  formats[key] = formats[key] || new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options });
  return formats[key].format(Date.UTC(y, m - 1, d, 12));
};
const dMD = iso => fmt(iso, 'md', { month: 'short', day: 'numeric' });
const dMDY = iso => fmt(iso, 'mdy', { month: 'short', day: 'numeric', year: 'numeric' });
const dMY = iso => fmt(iso, 'my', { month: 'short', year: 'numeric' });
const dMonthYear = iso => fmt(iso, 'monthyear', { month: 'long', year: 'numeric' });
const clocks = {};
const clock = (ms, tz) => {
  try { clocks[tz] = clocks[tz] || new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }); return clocks[tz].format(ms); }
  catch (error) { return ''; }
};
const regionLine = s => (s.country === 'United States' || s.region === s.country ? s.region : `${s.region}, ${s.country}`);
const travelLine = s => {
  if (!s.how) return null;
  const time = s.travel.replace(/ hours?/, ' hr').replace(/ mins?/, ' min');
  return (s.how === 'fly' ? 'By air' : 'By car') + (time ? ', ' + time : '');
};

// The favorite shots that ship with the site, keyed by place. Photos added on the site arrive from /api/photos.
const HERO = {
  'Albuquerque|New Mexico': [['albuquerque', 'Balloon Fiesta, Albuquerque'], ['carlsbad', 'Carlsbad Caverns'], ['whitesands', 'White Sands']],
  'Steamboat Springs|Colorado': [['colorado', 'Estes Park']],
  'Paris|France': [['france', 'Sunflower field in France']],
  'Osaka|Japan': [['japan', 'Osaka lights']],
  'Louisville|Kentucky': [['louisville', 'Barrel of bourbon']],
  'Glasgow|Scotland': [['scotland', 'Falkirk Wheel']],
  'Larnaca|Cyprus': [['cyprus', 'Cyprus']],
  'Athens|Greece': [['greece', 'Greece'], ['greekislands', 'Greek islands'], ['yacht', 'Yacht in Greece']],
  'Greenville|South Carolina': [['greenville', 'Greenville']],
  'New Orleans|Louisiana': [['jazzfest', 'Jazz Fest']],
  'Key Largo|Florida': [['keylargo', 'Key Largo']],
  'Philadelphia|Pennsylvania': [['philadelphia', 'Philadelphia']],
  'Santa Fe|New Mexico': [['santa-fe', 'Santa Fe']],
  'Sedona|Arizona': [['sedona', 'Sedona']],
};

let model = null, stats = null, globe = null, viewer = null;
const state = { u: 0, live: true, playing: false, speed: 1, limit: 0, endLive: true };
let rowsJson = '';                 // the rows the trip was built from, to tell a real change in the sheet from a refresh
let source = 'saved';              // 'live' (the sheet answered), 'kept' (this browser's copy from last visit) or 'saved' (the copy that ships with the site)
let sheetAnswered = null;           // null while we wait for the sheet, then true or false
const photos = new Map();          // place key -> [{ thumb, large, caption }]
let groups = [], gallery = [];     // the postcard strip (one entry per place) and every photo in that order
let weather = null, weatherFor = '';
let lastKey = '', lastPlaying = null, logYear = null, heroVisible = true, reelTimer = 0, statesData = null, cardKey = '';

// ---------- frames: nothing is drawn unless something changed ----------

let frameId = 0, lastFrame = 0;
function requestFrame() { if (!frameId) frameId = requestAnimationFrame(frame); }
function frame(t) {
  frameId = 0;
  const elapsed = lastFrame ? (t - lastFrame) / 1000 : 0;
  const dt = lastFrame ? Math.min(1, elapsed) : 1 / 60;      // real time, so a slow device still replays at the right pace
  if (lastFrame) globe.noteFrame(elapsed * 1000);
  lastFrame = t;
  let busy = false;
  if (state.playing && model) { advance(dt); busy = true; }
  globe.aim();
  if (globe.step(dt)) busy = true;
  globe.draw(busy);
  if (globe.cam.toZoom > 1.4) sharpenEarth();
  $('zin').disabled = !globe.canZoomIn;
  $('zout').disabled = !globe.canZoomOut;
  if (busy) requestFrame(); else lastFrame = 0;
}

// ---------- moving through the trip ----------

function advance(dt) {
  if (state.endLive) state.limit = model.uNow;
  state.u += dt * state.speed;
  if (state.u >= state.limit) {
    state.playing = false;
    if (state.endLive) { goLive(); return; }
    state.u = state.limit;
  }
  sync();
}
function goLive() {
  state.live = true; state.playing = false; state.u = model.uNow;
  if (globe.cam.mode === 'free') globe.follow();
  sync(true); requestFrame();
}
function goStop(i, { focus = false } = {}) {
  i = clamp(i, 0, model.stops.length - 1);
  if (model.current && model.current.i === i && !model.stale) goLive();
  else {
    state.live = false; state.playing = false; state.u = model.stayStart(i) + 1e-3;
    globe.follow(); sync(true); requestFrame();
  }
  if (focus) {
    $('stage').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    $('board').focus({ preventScroll: true });
  }
}
function step(by) {
  const w = model.at(state.u);
  let i = w.stop ? w.stop.i + by : by < 0 ? w.leg.j + by + 1 : w.leg.j + by;
  goStop(i);
}
function togglePlay() {
  if (state.playing) { state.playing = false; sync(true); return; }
  const atNow = state.live || Math.abs(state.u - model.uNow) < 1e-3, atEnd = state.u >= model.uEnd - 0.01;
  if (atNow || atEnd) { state.u = 0; state.endLive = true; }
  else state.endLive = state.u < model.uNow;
  state.limit = state.endLive ? model.uNow : model.uEnd - 1e-4;
  state.live = false; state.playing = true;
  globe.follow(); sync(true); requestFrame();
}

// ---------- the sign, the facts, the photo, the replay bar ----------

const zoneAt = w => (w.stop ? w.stop.tz : w.leg.a.tz);
const todayValue = () => clamp(model.dayNumber(model.today), 0, +$('scrub').max);

const setText = (node, text) => { if (node.textContent !== text) node.textContent = text; };     // an unchanged live region is not read out again
function sync(force) {
  const w = model.at(state.u), t = model.dateOf(state.u), s = w.stop;
  // At a stop, the date shown never leaves the stop's own dates: a flight in from the far side of the world
  // lands "yesterday" by the clock there, and the sheet's date is the one that counts.
  const here = s ? localDate(t, s.tz) : '';
  const iso = state.live ? model.today : s ? (here < s.arr ? s.arr : here > s.dep ? s.dep : here) : localDate(t, zoneAt(w));
  globe.view = { u: state.u, live: state.live, playing: state.playing, speed: state.speed, pos: w };

  // the replay bar
  const scrub = $('scrub'), max = +scrub.max || 1;
  const value = state.live ? todayValue() : clamp(model.dayNumber(iso), 0, max);
  scrub.value = value;
  $('tdone').style.width = Math.min(value, todayValue()) / max * 100 + '%';
  $('when').textContent = state.live ? 'Today' : dMDY(iso);
  $('dayline').textContent = s && s.i === 0 ? 'Day 0. We sold the house and left.' : `Day ${num(state.live ? stats.days : Math.max(0, model.dayNumber(iso)))} on the road`;
  if (state.playing !== lastPlaying) {
    lastPlaying = state.playing;
    $('board').setAttribute('aria-live', state.playing ? 'off' : 'polite');      // a replay would otherwise read out every stop
  }

  scrub.setAttribute('aria-valuetext', state.live ? 'Today' : s ? `${s.name}, ${dMY(iso)}` : `On the way to ${w.leg.b.name}, ${dMY(iso)}`);

  const key = (state.live ? 'L' + model.today + (model.stale ? 's' : '') : '') + w.seg.type + w.seg.i + (state.playing ? 'p' : '');
  if (key === lastKey && !force) return;
  lastKey = key;

  const future = !state.live && (s ? s.a > model.now : t > model.now + 1);
  $('play').textContent = state.playing ? 'Pause' : state.live || state.u >= model.uEnd - 0.01 ? 'Replay the whole trip' : 'Play from here';
  $('today').hidden = state.live;
  $('prev').disabled = Boolean(s && s.i === 0);
  $('next').disabled = Boolean(s && s.i === model.stops.length - 1);

  $('q').textContent = state.live ? 'Where in the world are Terry and Dana?' : future ? 'Where we plan to be' : 'Where we were';
  $('tab').textContent = state.live ? (model.stale ? 'Last we heard' : 'Right now') : s && s.i === 0 ? dMDY(model.startIso) : dMY(s ? s.arr : iso);
  const place = $('place');
  setText(place, s ? s.name : w.leg.fly ? 'In the air' : 'On the road');
  setText($('region'), s ? regionLine(s) : `${w.leg.a.name} to ${w.leg.b.name}`);
  place.classList.toggle('long', place.textContent.length > 12);

  renderDetail(w, future);
  renderCard(w);
  if (!state.playing) setHash(state.live || !s ? '' : s.slug);
}

function fact(list, label, value, wide) {
  const row = el('div', wide ? 'wide' : null);
  row.appendChild(el('dt', null, label));
  row.appendChild(el('dd', null, value));
  list.appendChild(row);
  return row.lastChild;
}

function renderDetail(w, future) {
  const list = $('facts'), ahead = $('ahead'), s = w.stop;
  list.textContent = '';
  list.classList.toggle('two', !state.live);
  ahead.hidden = !state.live;
  if (state.live) {
    if (s) {
      fact(list, 'Local time', clock(Date.now(), s.tz)).id = 'fclock';
      const sun = nextSunEvent(Date.now(), s.lat, s.lon);
      if (sun) fact(list, sun.label, clock(sun.at, s.tz)).id = 'fsun';
      if (weather && weatherFor === s.key) fact(list, 'Weather', weather.text);
      if (model.stale) fact(list, 'Heads up', `Our travel sheet ends on ${dMDY(s.dep)}, so this may be out of date.`, true);
      else if (s.flag) fact(list, 'Heads up', s.flag, true);
      askWeather(s);
    } else {
      fact(list, 'From', w.leg.a.name); fact(list, 'To', w.leg.b.name);
      fact(list, 'Distance', `${num(Math.round(w.leg.miles / 10) * 10)} miles`);
    }
    renderAhead();
    return;
  }
  if (!s) {
    fact(list, 'From', `${w.leg.a.name}, ${w.leg.a.region}`);
    fact(list, 'To', `${w.leg.b.name}, ${w.leg.b.region}`);
    fact(list, 'Distance', `${num(Math.round(w.leg.miles / 10) * 10)} miles, point to point`, true);
  } else if (s.i === 0) {
    fact(list, 'Home from', dMonthYear(s.arr));
    fact(list, 'Until', dMDY(s.dep));
  } else {
    fact(list, future ? 'Arriving' : 'Arrived', dMDY(s.arr));
    const here = model.current === s;
    fact(list, future ? 'Staying' : here ? 'Staying until' : 'Stayed', here ? dMD(s.dep) : s.nights ? plural(s.nights, 'night') : 'Passing through');
    const how = travelLine(s);
    if (how) fact(list, future ? 'Getting there' : 'Got here', how);
    if (future) fact(list, 'Status', s.booked ? 'Booked' : 'Penciled in');
    else {
      const visits = s.place.visits.filter(v => v.i > 0 && v.a <= model.now);
      fact(list, 'Times here', visits.length > 1 ? `${ordinal(visits.indexOf(s) + 1)} of ${visits.length} stays` : 'First time');
    }
    if (s.off) fact(list, 'Time off work', `${dMD(s.off[0])} to ${dMD(s.off[1])}`);
    if (s.flag) fact(list, 'Heads up', s.flag, true);
  }
}

/** The mileage sign: the next three stops, measured in days instead of miles. */
function renderAhead() {
  const box = $('ahead');
  box.textContent = '';
  const next = model.stops.filter(s => s.a > model.now).slice(0, 3);
  box.hidden = !next.length;
  if (!next.length) return;
  box.appendChild(el('p', null, 'Up the road'));
  for (const s of next) {
    const days = dayIndex(s.arr) - dayIndex(model.today);
    const row = el('button', 'mile');
    row.type = 'button';
    row.appendChild(el('span', null, s.name));
    row.appendChild(el('b', null, days <= 0 ? 'today' : days === 1 ? 'tomorrow' : `${num(days)} days`));
    row.appendChild(el('span', 'sr', `. ${regionLine(s)}. Show on the globe`));
    row.addEventListener('click', () => goStop(s.i, { focus: true }));
    box.appendChild(row);
  }
}

function updateClock() {
  const s = model.current, c = $('fclock');
  if (!state.live || !s || !c) return;
  const text = clock(Date.now(), s.tz);
  if (c.textContent !== text) c.textContent = text;
  const sun = nextSunEvent(Date.now(), s.lat, s.lon), f = $('fsun');
  if (sun && f) { f.previousSibling.textContent = sun.label; f.textContent = clock(sun.at, s.tz); }
}

let weatherAt = 0;
function askWeather(s) {
  if (offline) return;
  // one reading per place, asked for again after half an hour, or after two minutes if the last try got nothing
  if (weatherFor === s.key && Date.now() - weatherAt < (weather ? 30 : 2) * 60000) return;
  if (weatherFor !== s.key) weather = null;
  weatherFor = s.key; weatherAt = Date.now();
  currentWeather(s.lat, s.lon).then(result => {
    if (!result || weatherFor !== s.key || (weather && weather.text === result.text)) return;
    weather = result;
    if (state.live && model.current && model.current.key === s.key) { lastKey = ''; sync(true); }     // by place: the trip may have been rebuilt meanwhile
  });
}

// ---------- photos ----------

function seedPhotos() {
  photos.clear();
  for (const [key, list] of Object.entries(HERO)) {
    photos.set(key, list.map(([name, caption]) => ({ thumb: asset(`img/${name}-480.webp`), large: asset(`img/${name}-1600.jpg`), caption })));
  }
  if (Array.isArray(SNAPSHOT.photos)) addPhotos(SNAPSHOT.photos, true);
}
function pushPhoto(key, photo, seen) {
  if (seen.has(photo.large)) return false;
  seen.add(photo.large);
  if (!photos.has(key)) photos.set(key, []);
  photos.get(key).push(photo);
  return true;
}
function addPhotos(entries, trusted) {
  const seen = new Set();
  for (const list of photos.values()) for (const p of list) seen.add(p.large);
  const when = entry => String(entry.uploadedAt || '');
  entries.filter(entry => entry && typeof entry === 'object').sort((a, b) => (when(a) < when(b) ? -1 : when(a) > when(b) ? 1 : 0)).forEach(entry => {
    const photo = trusted ? { ...entry, thumb: asset(entry.thumb), large: asset(entry.large) } : photoFromApi(entry, location.origin);
    if (photo) pushPhoto(photo.key, { ...photo, remote: !trusted }, seen);
  });
}
/**
 * The photo list from /api/photos, or this browser's copy of it from the last visit. It replaces the list before it,
 * so a photo taken off the site disappears here too. Returns the list as kept, or null if nothing changed.
 */
let sitePhotosJson = '';
function useSitePhotos(entries) {
  const list = entries.filter(entry => entry && typeof entry === 'object')       // keep only what the page needs: no uploader details
    .map(({ id, location, country, url, source, caption, uploadedAt }) => ({ id, location, country, url, source, caption, uploadedAt }));
  const json = JSON.stringify(list);
  if (json === sitePhotosJson) return null;
  sitePhotosJson = json;
  const broken = new Set();
  for (const group of photos.values()) for (const p of group) if (p.broken) broken.add(p.large);
  seedPhotos();
  addPhotos(list, false);
  for (const group of photos.values()) for (const p of group) if (broken.has(p.large)) p.broken = true;
  if (model) refreshPhotos();
  return list;
}
function buildGallery() {
  groups = [];
  for (const [key, list] of photos) {
    const place = model.places.get(key);
    if (!place) continue;
    const visits = place.visits.filter(v => v.i > 0 && v.a <= model.now);
    const good = list.filter(p => !p.broken);
    if (!visits.length || !good.length) continue;
    const stop = visits[visits.length - 1], label = `${place.name}, ${stop.arr.slice(0, 4)}`;
    for (const p of good) { p.label = label; p.stop = stop; }
    groups.push({ place, stop, list: good, label });
  }
  groups.sort((a, b) => b.stop.a - a.stop.a);            // the newest stop first
  gallery = groups.flatMap(g => g.list);
}
let refreshTimer = 0;
function refreshPhotos() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => { buildGallery(); renderStrip(); renderLog(); lastKey = ''; sync(true); }, 120);
}
/** A photo that fails to load is dropped everywhere, once. It is never asked for again. */
function picture(photo, alt, eager) {
  const img = el('img');
  img.alt = alt; img.decoding = 'async';
  if (!eager) img.loading = 'lazy';
  if (photo.remote) img.referrerPolicy = 'no-referrer';
  img.addEventListener('error', () => { if (!photo.broken) { photo.broken = true; cardKey = ''; refreshPhotos(); } }, { once: true });
  img.src = photo.thumb;
  return img;
}
function polaroid(photo, text, count) {
  const card = el('button', 'polaroid');
  card.type = 'button';
  const frame = el('span', 'ph'), img = picture(photo, photo.caption && photo.caption !== text ? photo.caption : '', true);     // the words under the photo already name it
  img.fetchPriority = 'high';                              // the biggest picture in the opener
  img.addEventListener('load', () => { const tall = img.naturalHeight > img.naturalWidth * 1.15; frame.classList.toggle('tall', tall); card.classList.toggle('narrow', tall); });
  frame.appendChild(img);
  if (count > 1) frame.appendChild(el('span', 'count', `${count} photos`));
  card.appendChild(frame);
  card.appendChild(el('span', 'hand', text));
  card.appendChild(el('span', 'sr', '. Open full size'));
  return card;
}

function renderCard(w) {
  const box = $('card'), s = w.stop;
  const shown = Boolean(s) && s.i > 0 && s.a <= model.now;         // not the old house, a move, or a place we have not reached yet
  const list = shown ? (photos.get(s.key) || []).filter(p => !p.broken) : [];
  const kind = !shown ? 'none' : list.length ? `own ${list.length} ${list[0].large}` : s.note ? 'note' : state.live && gallery.length ? 'reel' : 'none';
  const key = `${state.live ? 'L' : ''}${s ? s.i : 'move'} ${kind}`;
  if (key === cardKey) return;                             // nothing new to show: leave the card (and its slideshow) alone
  cardKey = key;
  clearInterval(reelTimer); reelTimer = 0;
  box.textContent = '';
  if (kind === 'none') return;
  const label = `${s.name}, ${s.arr.slice(0, 4)}`;
  if (list.length) {
    const card = polaroid(list[0], s.note || label, list.length);
    card.addEventListener('click', () => viewer.open(list.map(p => ({ ...p, label })), 0));
    box.appendChild(card);
    return;
  }
  if (kind === 'note') {
    const card = el('div', 'polaroid words');
    card.appendChild(el('span', 'hand', s.note));
    box.appendChild(card);
    return;
  }
  // nothing from where we are yet, so flip through postcards from earlier stops
  let showing = gallery[0];
  const place = () => gallery.findIndex(p => p.large === showing.large);     // the list can be rebuilt while the card is up
  const card = polaroid(showing, showing.label, 0), frame = card.querySelector('.ph'), hand = card.querySelector('.hand');
  card.addEventListener('click', () => viewer.open(gallery, Math.max(0, place())));
  box.appendChild(card);
  if (reduced) return;
  // anything that changes by itself needs a way to stop it
  let paused = false;
  const toggle = el('button', 'reelctl');
  toggle.type = 'button';
  const dress = () => {
    toggle.setAttribute('aria-label', paused ? 'Play the photo slideshow' : 'Pause the photo slideshow');
    toggle.textContent = '';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svg.setAttribute('viewBox', '0 0 12 12'); svg.setAttribute('aria-hidden', 'true');
    path.setAttribute('d', paused ? 'M3 1.5 10.5 6 3 10.5z' : 'M2.5 1.5h2.6v9H2.5zM6.9 1.5h2.6v9H6.9z');
    svg.appendChild(path); toggle.appendChild(svg);
  };
  dress();
  toggle.addEventListener('click', () => { paused = !paused; dress(); });
  box.appendChild(toggle);
  reelTimer = setInterval(() => {
    if (paused || document.hidden || !heroVisible || $('viewer').open || gallery.length < 2) return;
    const next = gallery[(place() + 1) % gallery.length], over = new Image();
    if (next.remote) over.referrerPolicy = 'no-referrer';
    over.alt = next.caption && next.caption !== next.label ? next.caption : '';
    over.className = 'over';
    over.onload = () => {                                    // lay the new photo over the old one and fade it in
      if (!card.isConnected) return;
      showing = next;
      frame.appendChild(over);
      requestAnimationFrame(() => requestAnimationFrame(() => { over.style.opacity = 1; }));
      hand.textContent = next.label;
      setTimeout(() => { for (const old of [...frame.querySelectorAll('img')]) if (old !== over) old.remove(); over.className = ''; }, 700);
    };
    over.onerror = () => { if (!next.broken) { next.broken = true; refreshPhotos(); } };
    over.src = next.thumb;
  }, 5200);
}

function renderStrip() {
  const strip = $('strip');
  strip.textContent = '';
  $('postcards').hidden = !groups.length;
  for (const group of groups) {
    const cover = group.list[0];
    const card = el('button', 'pc');
    card.type = 'button';
    const img = picture(cover, cover.caption && cover.caption !== group.label ? cover.caption : '');
    img.width = 172; img.height = 172;
    card.appendChild(img);
    if (group.list.length > 1) card.appendChild(el('span', 'count', `${group.list.length} photos`));
    card.appendChild(el('span', 'hand', group.label));
    card.appendChild(el('span', 'sr', '. Open full size'));
    card.addEventListener('click', () => viewer.open(gallery, gallery.indexOf(cover)));
    strip.appendChild(card);
  }
  stripArrows();
}

/** The two arrows over the postcard row, for a mouse: shown only when the row is longer than the page is wide. */
function stripArrows() {
  const strip = $('strip'), nav = $('stripnav'), prev = $('stripprev'), next = $('stripnext');
  const room = strip.scrollWidth - strip.clientWidth;
  nav.hidden = room < 8;
  prev.setAttribute('aria-disabled', String(strip.scrollLeft < 4));
  next.setAttribute('aria-disabled', String(strip.scrollLeft > room - 4));
}
function wireStrip() {
  const strip = $('strip');
  const move = by => strip.scrollBy({ left: by * Math.max(190, strip.clientWidth * 0.8), behavior: reduced ? 'auto' : 'smooth' });
  $('stripprev').addEventListener('click', () => move(-1));
  $('stripnext').addEventListener('click', () => move(1));
  strip.addEventListener('scroll', stripArrows, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(stripArrows).observe(strip);
}

// ---------- the numbers, the plan, the log ----------

function renderStats() {
  const list = $('stats');
  list.textContent = '';
  const add = (value, label, note) => {
    const row = el('div');
    row.appendChild(el('dt', null, label));
    const dd = el('dd', null, value);
    if (note) dd.appendChild(el('small', null, note));
    row.appendChild(dd);
    list.appendChild(row);
  };
  const hundreds = n => num(Math.round(n / 100) * 100);
  add(num(stats.days), 'Days on the road', `Since ${dMDY(model.startIso)}`);
  const laps = stats.miles / 24901, split = stats.flown > 0 ? `${hundreds(stats.flown)} by air, ${hundreds(stats.driven)} by road` : '';
  add(hundreds(stats.miles), 'Miles, point to point', [laps >= 1 ? `${laps.toFixed(1)} times around the Earth` : '', split].filter(Boolean).join(': ') || null);
  add(String(stats.places), 'Places we have stayed', `${plural(stats.moves, 'move')} to get to them`);
  add(String(stats.countries.length), stats.countries.length === 1 ? 'Country' : 'Countries', stats.nightsAbroad ? `${plural(stats.nightsAbroad, 'night')} outside the United States` : null);
  if (stats.longest) add(stats.longest.name, 'Longest stay', `${plural(stats.longest.nights, 'night')} in ${stats.longest.arr.slice(0, 4)}`);
  if (stats.favourite) add(stats.favourite.place.name, 'Where we keep coming back', `${plural(stats.favourite.n, 'stay')}, ${plural(stats.favourite.nights, 'night')}`);
  renderStates();
}
const listOf = names => (names.length < 2 ? names.join('') : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]);
function renderStates() {
  $('statecount').textContent = `${stats.states.length} of 50`;
  const planned = stats.plannedStates;
  $('statescap').textContent = planned.length
    ? `Filled in: stayed. Dashed: on the plan (${listOf(planned)}).`
    : 'Filled in: states we have stayed in.';
  if (!statesData) return;
  const svg = $('states');
  svg.textContent = '';
  for (const state of statesData.states) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const been = stats.states.includes(state.name), plan = planned.includes(state.name);
    path.setAttribute('d', state.d);
    path.setAttribute('class', 'st' + (been ? ' been' : plan ? ' plan' : ''));
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = state.name + (been ? ': stayed' : plan ? ': on the plan' : '');
    path.appendChild(title);
    svg.appendChild(path);
  }
  // draw the outlined states last so their dashes sit on top of their neighbours
  for (const path of [...svg.querySelectorAll('.plan')]) svg.appendChild(path);
}

function row(list, stop, cells) {
  const item = el('li'), button = el('button');
  button.type = 'button';
  for (const cell of cells) button.appendChild(cell);
  if (stop) button.addEventListener('click', () => goStop(stop.i, { focus: true }));
  else button.disabled = true;
  item.appendChild(button);
  list.appendChild(item);
}
function placeCell(s, extra, hot) {
  const cell = el('span', 'p', `${s.name}, ${s.region}`);
  if (extra) cell.appendChild(el('small', hot ? 'hot' : null, extra));
  return cell;
}
function thumbCell(s) {
  const cell = el('span', 't');
  const list = s && s.a <= model.now ? (photos.get(s.key) || []).filter(p => !p.broken) : [];
  if (list.length) { const img = picture(list[0], ''); img.width = 44; img.height = 44; cell.appendChild(img); }
  return cell;
}
function renderPlan() {
  const list = $('planrows');
  list.textContent = '';
  const coming = model.stops.filter(s => s.a > model.now);
  $('plan').hidden = !coming.length && !model.somedayAll.length;
  coming.forEach((s, k) => {
    const chip = el('span', 'c');
    chip.appendChild(el('span', 'chip ' + (s.booked ? 'booked' : 'pencil'), s.booked ? 'Booked' : 'Penciled in'));
    const days = dayIndex(s.arr) - dayIndex(model.today);
    const extra = s.flag ? s.flag : k === 0 ? (days <= 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${num(days)} days`) : null;
    row(list, s, [
      el('span', 'd', s.nights ? `${dMDY(s.arr)} to ${dMDY(s.dep)}` : dMDY(s.arr)),
      placeCell(s, extra, true),
      el('span', 'n', s.nights ? plural(s.nights, 'night') : 'Passing through'),
      chip, thumbCell(null),
    ]);
  });
  for (const s of model.somedayAll) {
    const chip = el('span', 'c');
    chip.appendChild(el('span', 'chip someday', 'Someday'));
    row(list, null, [el('span', 'd', 'No dates yet'), placeCell(s), el('span', 'n', ''), chip, thumbCell(null)]);
  }
}
function renderLog(year) {
  const past = model.stops.filter(s => s.i > 0 && s.a <= model.now);
  const years = [...new Set(past.map(s => +s.arr.slice(0, 4)))];
  $('log').hidden = !past.length;
  if (!past.length) return;
  if (year != null) logYear = year;
  if (!years.includes(logYear)) logYear = years[years.length - 1];
  const pills = $('years');
  pills.textContent = '';
  for (const y of years) {
    const pill = el('button', 'pill', String(y));
    pill.type = 'button';
    pill.setAttribute('aria-pressed', String(y === logYear));
    pill.addEventListener('click', () => { renderLog(y); const now = $('years').querySelector('[aria-pressed="true"]'); if (now) now.focus(); });
    pills.appendChild(pill);
  }
  const list = $('logrows');
  list.textContent = '';
  past.filter(s => +s.arr.slice(0, 4) === logYear).forEach(s => {
    const here = s === model.current && !model.stale;
    const chip = el('span', 'c');
    // a stopover with vacation dates in the sheet is a vacation; a home base or the place we are now keeps its own label
    const kind = here ? 'here' : s.base ? 'base' : s.vacation ? 'vac' : 'stop';
    chip.appendChild(el('span', 'chip ' + kind, { here: 'We are here now', base: 'Home base', vac: 'Vacation', stop: 'Stopover' }[kind]));
    const nights = stats.nightsSoFar(s);
    row(list, s, [
      el('span', 'd', `${dMD(s.arr)} to ${here ? 'now' : dMD(s.dep)}`),
      placeCell(s, [travelLine(s), s.off ? `time off ${dMD(s.off[0])} to ${dMD(s.off[1])}` : null].filter(Boolean).join(', ')),
      el('span', 'n', nights ? plural(nights, 'night') : here ? 'Just arrived' : 'Passing through'),
      chip, thumbCell(s),
    ]);
  });
}

function renderTicks() {
  const scrub = $('scrub'), box = $('ticks');
  const max = Math.max(1, dayIndex(model.stops[model.stops.length - 1].dep) - dayIndex(model.startIso));
  scrub.max = max;
  const pct = iso => clamp((dayIndex(iso) - dayIndex(model.startIso)) / max * 100, 0, 100);
  box.textContent = '';
  const today = pct(model.today);
  const mark = el('span', 'today', 'Today');
  mark.style.left = today + '%';
  box.appendChild(mark);
  // The labels must not run into each other, however narrow the slider is. "Today" always shows; a year is left out
  // if it would come within a few pixels of "Today" or of the year before it.
  const at = x => x / 100 * box.clientWidth, half = mark.offsetWidth / 2;
  let last = -1e9;
  for (let y = +model.startIso.slice(0, 4) + 1; y <= +model.stops[model.stops.length - 1].dep.slice(0, 4); y++) {
    const x = pct(`${y}-01-01`);
    if (Math.abs(x - today) < 7 || x > 97) continue;
    const tick = el('span', null, String(y));
    tick.style.left = x + '%';
    box.appendChild(tick);
    const w = tick.offsetWidth / 2;
    if (Math.abs(at(x) - at(today)) < w + half + 5 || at(x) - last < 2 * w + 6) { tick.remove(); continue; }
    last = at(x);
  }
  $('tplan').style.left = today + '%';
}

function renderFoot() {
  const where = offline ? `This copy runs on the trip as it stood on ${dMDY(SNAPSHOT.asOf)}. On the site itself, stops and dates come straight from our travel sheet.`
    : source === 'live' ? 'Stops and dates come straight from our travel sheet.'
    : sheetAnswered === null ? 'Checking our travel sheet for the latest.'
    : source === 'kept' ? 'Our travel sheet did not answer just now, so this is the trip as it stood on your last visit.'
    : `Our travel sheet did not answer just now, so this is a saved copy from ${dMDY(SNAPSHOT.asOf)}.`;
  $('foot').textContent = `${where} The sky up top, day and night on the globe, local time and sunset all follow the real clock where we are. Earth imagery: NASA. Weather: Open-Meteo.`;
}

let belowTimer = 0;
function renderAll() {
  stats = tripStats(model);
  buildGallery();
  renderTicks(); renderFoot();
  // everything below the opener waits a beat, so the sign and the globe are on screen first
  clearTimeout(belowTimer);
  belowTimer = setTimeout(() => { renderStrip(); renderStats(); renderPlan(); renderLog(); }, 0);
}

// ---------- the sky ----------

function setSky() {
  const s = model.current || model.latest, now = Date.now();
  const height = sunElevation(now, s.lat, s.lon), soon = sunElevation(now + 6e5, s.lat, s.lon);
  $('sky').dataset.sky = height > 6 ? 'day' : height < -7 ? 'night' : soon > height ? 'dawn' : 'dusk';
  drawStars();
}
let starsWidth = 0;
function drawStars() {
  if ($('sky').dataset.sky === 'day') return;                // no stars by day, so do not spend time drawing them
  const canvas = $('stars'), rect = $('sky').getBoundingClientRect();
  if (Math.abs(rect.width - starsWidth) < 2) return;         // only the width matters: the stars are laid out once
  starsWidth = rect.width;
  const dpr = Math.min(2, window.devicePixelRatio || 1), height = Math.max(rect.height, 900);
  canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  let seed = 20230324;
  const random = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  for (let i = 0, n = Math.round(rect.width * height / 5200); i < n; i++) {
    const y = Math.pow(random(), 1.5) * height, x = random() * rect.width, big = random() > 0.93;
    ctx.globalAlpha = 0.35 + random() * 0.65;
    ctx.fillStyle = random() > 0.85 ? '#FFE7B8' : '#FFFFFF';
    ctx.beginPath(); ctx.arc(x, y, big ? 1.5 : 0.5 + random() * 0.6, 0, 7); ctx.fill();
  }
}

// ---------- links to a stop ----------

function setHash(slug) {
  const want = slug ? '#' + slug : '';
  if (location.hash === want || (!slug && !model.bySlug.has(location.hash.slice(1)))) return;
  try { history.replaceState(null, '', want || location.pathname + location.search); } catch (error) { /* some embedded views do not allow it */ }
}
function openHash(hash) {
  let slug = '';
  try { slug = decodeURIComponent((typeof hash === 'string' ? hash : location.hash).slice(1)); } catch (error) { /* not a link to a stop */ }
  const stop = model && model.bySlug.get(slug);
  if (stop) goStop(stop.i);
  return Boolean(stop);
}

// ---------- data ----------

const KEPT = 'trip-rows-v2';
function keptRows() {
  try {
    const kept = JSON.parse(localStorage.getItem(KEPT) || 'null');
    return kept && Array.isArray(kept.rows) && Date.now() - kept.at < 45 * 864e5 ? kept : null;
  } catch (error) { return null; }
}
function keepRows(rows) {
  try { localStorage.setItem(KEPT, JSON.stringify({ at: Date.now(), rows })); } catch (error) { /* private window or full storage: fine */ }
}
const KEPT_PHOTOS = 'trip-photos-v2';
function keptPhotos() {
  try {
    const kept = JSON.parse(localStorage.getItem(KEPT_PHOTOS) || 'null');
    return kept && Array.isArray(kept.list) && Date.now() - kept.at < 45 * 864e5 ? kept.list : null;
  } catch (error) { return null; }
}
function keepPhotos(list) {
  try { localStorage.setItem(KEPT_PHOTOS, JSON.stringify({ at: Date.now(), list })); } catch (error) { /* fine */ }
}

/** Build (or rebuild) everything from sheet rows. Returns false, changing nothing, if the rows are unusable. */
function useRows(rows, from) {
  let trip;
  try { trip = normalizeRows(rows); } catch (error) { return false; }
  // Compare what the page uses, not the raw rows: the sheet's travel-time column changes between reads without meaning anything.
  const json = JSON.stringify([trip.stops, trip.someday]);
  if (model && json === rowsJson) { source = from; renderFoot(); return true; }       // the sheet has not changed since the copy we opened with
  const before = model && !state.live ? { playing: state.playing, t: model.dateOf(state.u), stop: state.playing ? null : model.at(state.u).stop } : null;
  let next;
  try { next = buildModel(trip, Date.now()); } catch (error) { return false; }
  model = next; rowsJson = json; source = from; cardKey = '';
  if (trip.notes.length) console.info('Travel sheet notes:\n' + trip.notes.join('\n'));
  globe.setModel(model);
  renderAll();
  setSky();
  // whatever the visitor was looking at stays put: the same stop, or the same date in a replay that is under way
  const again = before && before.stop && model.bySlug.get(before.stop.slug);
  state.playing = false; lastKey = '';
  if (again) { state.live = false; state.u = model.stayStart(again.i) + 1e-3; }
  else if (before) {
    state.live = false; state.playing = before.playing; state.u = model.uOf(before.t);
    state.limit = state.endLive ? model.uNow : model.uEnd - 1e-4;
  }
  else { state.live = true; state.u = model.uNow; }
  sync(true);
  requestFrame();
  return true;
}

async function loadImage(file) {
  const response = await fetch(asset(file));
  if (!response.ok) throw new Error(file + ' ' + response.status);
  const blob = await response.blob();
  if (window.createImageBitmap) {
    // for WebGL, ask for the pixels exactly as stored so the upload is a straight copy; older browsers do not take options
    try { return await createImageBitmap(blob, globe.earth.kind === 'canvas' ? {} : { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }); }
    catch (error) { return createImageBitmap(blob); }
  }
  return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = URL.createObjectURL(blob); });
}

// The Earth arrives in steps: small maps first so the globe is dressed quickly on any connection, sharper ones after.
const dataSaver = () => Boolean(navigator.connection && navigator.connection.saveData);
let dayDetail = 0;
async function showDay(detail, file) {
  if (detail <= dayDetail) return;
  const image = await loadImage(file);
  if (detail > dayDetail) { dayDetail = detail; globe.setTexture('day', image); }       // a sharper map may have landed while this one loaded
}
async function loadEarth() {
  try {
    await showDay(1, 'earth/day-1k.webp');
    globe.setTexture('night', await loadImage('earth/night-1k.webp'));
    // WebGL has pixels to spare: once the opener has settled, bring in maps with twice the detail
    if (globe.earth.kind === 'canvas' || dataSaver()) return;
    await new Promise(resolve => setTimeout(resolve, 1500));
    await showDay(2, 'earth/day-2k.webp');
    globe.setTexture('night', await loadImage('earth/night-2k.webp'));
  } catch (error) {
    console.warn('Globe: a map image did not load.', error);
  }
}
/** The first time the globe is zoomed in: the 4k map for WebGL, the 2k one for the simple renderer. */
let sharpened = false;
function sharpenEarth() {
  if (sharpened || !dayDetail) return;
  sharpened = true;
  const simple = globe.earth.kind === 'canvas';
  if (simple) showDay(2, 'earth/day-2k.webp').catch(() => {});
  else if (globe.earth.kind === 'webgl2' && !dataSaver() && !globe.earth.software && globe.earth.maxTextureSize >= 4096) showDay(4, 'earth/day-4k.webp').catch(() => {});
}

async function showAccount() {
  try {
    const response = await fetch('/api/auth/session');
    if (!response.ok) return;
    const user = (await response.json()).user;
    if (!user) return;
    const item = $('account');
    item.textContent = '';
    const profile = el('a', null, user.name ? `Signed in as ${user.name}` : 'Your profile');
    profile.href = '/profile';
    item.appendChild(profile);
    const add = (text, href) => { const li = el('li'), a = el('a', null, text); a.href = href; li.appendChild(a); item.after(li); };
    add('Sign out', '/api/auth/signout');
    if (user.role === 'admin') add('Admin', '/admin');
  } catch (error) { /* signed out, or not on the site itself */ }
}
function countVisit() {
  try {
    const path = location.pathname;
    if (sessionStorage.getItem('visitor_tracked_' + path)) return;
    fetch('/api/track-visitor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path, referrer: document.referrer }) })
      .then(() => sessionStorage.setItem('visitor_tracked_' + path, 'true')).catch(() => {});
  } catch (error) { /* no storage */ }
}

// ---------- wiring ----------

function wire() {
  $('play').addEventListener('click', togglePlay);
  $('prev').addEventListener('click', () => step(-1));
  $('next').addEventListener('click', () => step(1));
  $('today').addEventListener('click', () => { goLive(); $('play').focus(); });
  $('speed').addEventListener('click', () => {
    state.speed = state.speed === 1 ? 2 : state.speed === 2 ? 4 : 1;
    $('speed').textContent = `Speed ${state.speed}x`;
    globe.view.speed = state.speed;
  });
  const scrub = $('scrub');
  scrub.addEventListener('input', () => {
    const value = +scrub.value;
    if (value === todayValue() && !model.stale) { goLive(); return; }
    // find the moment that calendar day falls on: the stop whose dates cover it, else the move in between
    const day = dayIndex(model.startIso) + value;
    const stop = model.stops.find(s => s.i > 0 && day >= dayIndex(s.arr) && day < dayIndex(s.dep));
    if (stop && stop === model.current && !model.stale) { goLive(); return; }       // anywhere in the stay we are in is "right now"
    let t;
    if (stop) t = stop.a + (stop.d - stop.a) * ((day - dayIndex(stop.arr)) / Math.max(1, dayIndex(stop.dep) - dayIndex(stop.arr)));
    else {
      const before = [...model.stops].reverse().find(s => dayIndex(s.dep) <= day) || model.stops[0];
      const after = model.stops[before.i + 1];
      t = after && after.a > before.d ? before.d + (after.a - before.d) * clamp((day - dayIndex(before.dep)) / Math.max(1, dayIndex(after.arr) - dayIndex(before.dep)), 0, 0.999) : before.d;
    }
    state.live = false; state.playing = false; state.u = model.uOf(t + 1);
    globe.follow(); sync(); requestFrame();
  });
  scrub.addEventListener('keydown', event => {              // by keyboard the slider moves a stop at a time, not a day at a time
    const moves = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -5, PageUp: 5 };
    if (event.key in moves) step(moves[event.key]);
    else if (event.key === 'Home') goStop(0);
    else if (event.key === 'End') goLive();
    else return;
    event.preventDefault();
  });
  $('zin').addEventListener('click', () => globe.zoomBy(1.5));
  $('zout').addEventListener('click', () => globe.zoomBy(1 / 1.5));
  $('whole').addEventListener('click', () => globe.showWhole());
  wireStrip();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (state.playing) { state.playing = false; sync(true); } return; }
    requestFrame();                                          // phones drop the canvas of a page in the background
    freshen(15);
  });
  window.addEventListener('pageshow', event => { if (event.persisted) requestFrame(); });
  window.addEventListener('hashchange', () => openHash());
  if (window.IntersectionObserver) new IntersectionObserver(entries => { heroVisible = entries[0].isIntersecting; }).observe($('stage'));
  if (window.ResizeObserver) new ResizeObserver(drawStars).observe($('sky')); else window.addEventListener('resize', drawStars);
  if (window.ResizeObserver) new ResizeObserver(() => { if (model) renderTicks(); }).observe($('ticks'));      // which labels fit depends on how wide the slider is
  const dark = matchMedia('(prefers-color-scheme: dark)');
  if (dark.addEventListener) dark.addEventListener('change', requestFrame);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(requestFrame);

  // the clock: check a few times a minute, act when the minute turns
  let minute = Math.floor(Date.now() / 60000);
  setInterval(() => {
    const now = Math.floor(Date.now() / 60000);
    if (now === minute || !model) return;
    minute = now;
    const today = model.today, current = model.current, stale = model.stale;
    model.setNow(Date.now());
    if (model.today !== today || model.current !== current || model.stale !== stale) { renderAll(); lastKey = ''; }
    if (state.live) { state.u = model.uNow; sync(); if (model.current) askWeather(model.current); }
    updateClock(); setSky(); requestFrame();
    if (!document.hidden) freshen(30);
  }, 5000);
}

function tooltip(place, x, y) {
  const tip = $('tip');
  if (!place) { tip.hidden = true; return; }
  tip.textContent = `${place.name}, ${place.region}`;
  const past = place.visits.filter(v => v.i > 0 && v.a <= model.now);
  const nights = past.reduce((n, v) => n + stats.nightsSoFar(v), 0);
  const first = place.visits.find(v => v.a > model.now);
  tip.appendChild(el('span', null, place.someday ? 'Someday' : past.length ? `${plural(past.length, 'stay')}, ${plural(nights, 'night')}` : first ? `Planned for ${dMY(first.arr)}` : 'Where it all started'));
  tip.style.transform = `translate(${x}px, ${y}px) translate(-50%, -135%)`;
  tip.hidden = false;
}

async function start() {
  linked = location.hash;                // read before anything else: showing "right now" clears a stop link from the address
  seedPhotos();
  const lastPhotos = keptPhotos();
  if (lastPhotos) useSitePhotos(lastPhotos);
  viewer = createViewer($('viewer'), { onShowOnGlobe: photo => { if (photo.stop) goStop(photo.stop.i, { focus: true }); } });
  globe = new Globe($('globe'), {
    requestFrame,
    onPick(place) { const past = place.visits.filter(v => v.a <= model.now); goStop((past.length ? past[past.length - 1] : place.visits[0]).i); },
    onHover: tooltip,
  }, { reducedMotion: reduced, renderer: new URLSearchParams(location.search).get('globe') || undefined });
  loadEarth();
  fetch(asset('data/borders.json')).then(r => r.json()).then(lines => globe.setBorders(lines)).catch(() => {});
  fetch(asset('data/states.json')).then(r => r.json()).then(data => { statesData = data; if (stats) renderStates(); }).catch(() => {});
  wire();
  await new Promise(resolve => setTimeout(resolve, 0));      // two short turns rather than one long one, so a slow phone stays responsive

  // open at once with the freshest copy there is (this browser's, or the one that ships with the site), then swap in the live sheet
  const kept = keptRows(), shipped = Date.parse(SNAPSHOT.asOf + 'T12:00:00Z') || 0;
  if (!(kept && kept.at >= shipped && useRows(kept.rows, 'kept'))) useRows(SNAPSHOT.rows, 'saved');
  if (model) {
    globe.view.pos = model.at(state.u);
    globe.spinIn();
    linkOpened = openHash(linked);
    requestFrame();
  } else {
    $('place').textContent = 'Finding us'; $('region').textContent = 'One moment';
  }
  drawStars();
  window.__trip = { state, globe, goStop, goLive, togglePlay, get model() { return model; }, get stats() { return stats; }, get source() { return source; }, get gallery() { return gallery; } };
  document.documentElement.classList.remove('failed');      // in case something unrelated tripped the page's alarm before this code ran

  if (offline) { sheetAnswered = false; if (model) renderFoot(); return; }
  const early = window.__early || {};
  loadPhotos(early.photos);
  showAccount();
  countVisit();
  const hadModel = Boolean(model);
  await loadSheet(early.travel);
  if (!model) { $('place').textContent = 'Map unavailable'; $('region').textContent = 'Please try again in a little while'; return; }
  if (!hadModel) { globe.view.pos = model.at(state.u); globe.spinIn(); requestFrame(); }
}

// ---------- asking the site, patiently ----------
// The site's data comes from a service that goes to sleep when nobody has visited for a while. Its first answer after a
// nap can take ten seconds or more, or fail outright, and the next one is quick. So: a second request if the first is
// slow, two more tries if it fails, and a fresh look when the page has been open a long time.

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const ask = (url, ms) => (window.__early && window.__early.get ? window.__early.get(url, ms) : Promise.resolve({ ok: false }));
async function fromSite(url, first, ms) {
  const patient = pending => new Promise(resolve => {
    let open = 1, done = false;
    const settle = result => { open--; if (done) return; if (result.ok || open === 0) { done = true; clearTimeout(second); resolve(result); } };
    const second = setTimeout(() => { open++; ask(url, ms).then(settle); }, 5000);
    pending.then(settle);
  });
  let result = await patient(first || ask(url, ms));
  for (const gap of [1200, 3000]) {
    if (result.ok) break;
    await pause(gap);
    result = await ask(url, ms);
  }
  return result;
}

let linked = '', linkOpened = false;
let sheetAt = 0, sheetTriedAt = 0, sheetBusy = false;
async function loadSheet(first) {
  if (sheetBusy) return;
  sheetBusy = true; sheetTriedAt = Date.now();
  try {
    const result = await fromSite('/api/travel-data', first, 20000);
    const good = Boolean(result.ok && useRows(result.value, 'live'));
    if (good) { sheetAt = Date.now(); sheetAnswered = true; keepRows(result.value); }
    else if (sheetAnswered === null) sheetAnswered = false;
    if (model) renderFoot();
    // a link to a stop that only the live sheet knows about
    if (good && linked && !linkOpened && state.live && !state.playing) linkOpened = openHash(linked);
  } finally { sheetBusy = false; }
}
async function loadPhotos(first) {
  const result = await fromSite('/api/photos', first, 45000);
  if (!result.ok || !Array.isArray(result.value)) return;
  const list = useSitePhotos(result.value);
  if (list) keepPhotos(list);
}
/** Look again if the sheet's last answer is older than `minutes` (and we have not just tried). */
function freshen(minutes) {
  if (offline || !model || sheetBusy || Date.now() - sheetAt < minutes * 60000 || Date.now() - sheetTriedAt < 5 * 60000) return;
  loadSheet().then(() => loadPhotos());
}

// Start once the browser has painted the page's own words (the wordmark, the tagline), so a slow phone shows something
// before this code takes its turn. A tab opened in the background never paints, so there it starts at once.
let started = false;
function begin() {
  if (started) return;
  started = true;
  start().catch(error => { console.error(error); if (window.__fail) window.__fail(); });
}
if (document.visibilityState !== 'visible') begin();
else {
  try {
    if (performance.getEntriesByName('first-contentful-paint').length) begin();
    else new PerformanceObserver((list, observer) => { if (list.getEntriesByName('first-contentful-paint').length) { observer.disconnect(); begin(); } }).observe({ type: 'paint', buffered: true });
  } catch (error) {
    requestAnimationFrame(() => setTimeout(begin, 0));         // a browser that does not report paints
  }
  setTimeout(begin, 400);                                       // whatever happens, do not wait long
}

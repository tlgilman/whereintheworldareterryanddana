// The globe: camera, the route and place overlay, and mouse / touch / keyboard handling.
// The Earth image itself is drawn by earth.js on a canvas underneath; this file draws everything on top of it
// (borders, routes, dots, labels) on a second canvas, using the same orthographic view.
// Nothing here runs on a timer: the page asks for a frame only when something has changed.

import { DEG, RAD, lonLat, slerp, vec, viewBasis } from './geo.js';
import { subsolar } from './sun.js';
import { createEarth } from './earth.js';
import { DAY } from './model.js';

const ZOOM_MIN = 1, ZOOM_MAX = 5, FOLLOW_ZOOM = 2.9;
const SPHERE = 0.9;                  // at zoom 1 the sphere fills this share of the round window, leaving room for the glow
const LIFT = 0.09;                   // how far a flight path rises off the surface, as a share of the radius
const MARIGOLD = '#F6B817', CASING = 'rgba(4, 10, 24, 0.72)';
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
// one side of a small plane seen from above, nose toward +x; the other side is its mirror image
const PLANE = [[12, 0], [4, 2.3], [0, 11], [-3.4, 11], [-1.6, 2.3], [-8, 1.9], [-10.4, 5.4], [-12.2, 5.4], [-11, 0]];

export class Globe {
  /**
   * box: element containing <canvas class="earth">, <canvas class="lines"> and <div class="pulse">.
   * hooks: requestFrame() is called whenever the globe needs redrawing; onPick(place) when a dot is clicked;
   *        onHover(place | null, x, y) as the pointer moves over dots.
   */
  constructor(box, hooks, { reducedMotion = false, renderer } = {}) {
    this.box = box;
    this.hooks = hooks;
    this.reducedMotion = reducedMotion;
    // renderer (for tests): 'canvas' forces the simple renderer, 'webgl' forces WebGL, 'sharp' is WebGL that never lowers its resolution
    this.earth = createEarth(box.querySelector('.earth'), renderer === 'canvas' ? 'canvas' : renderer === 'webgl' || renderer === 'sharp' ? 'webgl' : undefined);
    this.quiet = reducedMotion || this.earth.kind === 'canvas';       // open in place, no swing or fades: every frame of the simple renderer costs the page time
    this.lines = box.querySelector('.lines');
    this.ctx = this.lines.getContext('2d');
    this.pulse = box.querySelector('.pulse');
    this.model = null;
    this.view = { u: 0, live: true, playing: false, speed: 1, pos: null };
    this.cam = { lon: -60, lat: 36, zoom: 1, toLon: -60, toLat: 36, toZoom: 1, mode: 'overview', followZoom: FOLLOW_ZOOM };
    this.geom = { w: 0, h: 0, dpr: 1, cx: 0, cy: 0, lens: 100 };
    this.borders = null;
    this.night = 1;                    // 1 = real day and night, 0 = lit everywhere
    this.fade = 0;                     // the map fading in once it has loaded
    this.fixedQuality = renderer === 'sharp';          // for screenshots: never trade resolution for speed
    this.scale = this.earth.software && this.earth.kind !== 'canvas' && !this.fixedQuality ? 0.6 : 1;   // share of full resolution the Earth image is drawn at
    this.slowFrames = 0;
    this.hits = [];                    // dots on screen, for hover and click
    this.hover = null;
    this.pageWheelAt = -1e9;
    this.maps = {};                    // the map images as given, in case the renderer has to be replaced
    this.shownAt = performance.now();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.shownAt = performance.now(); });
    this.watch();
    const fit = () => { this.resize(); hooks.requestFrame(); };
    if (window.ResizeObserver) new ResizeObserver(fit).observe(box); else window.addEventListener('resize', fit);
    this.resize();
    this.listen();
  }

  // ---- data ----

  setModel(model) { this.model = model; this.hooks.requestFrame(); }

  /** lines: { q, countries: [[x0, y0, dx, dy, ...], ...], states: [...] } as written by tools/geo.mjs */
  setBorders(lines) {
    const decode = list => list.map(line => {
      const out = new Float32Array(line.length / 2 * 3);
      let x = 0, y = 0;
      for (let i = 0; i < line.length; i += 2) {
        x = i ? x + line[i] : line[i];
        y = i ? y + line[i + 1] : line[i + 1];
        out.set(vec(x / lines.q, y / lines.q), i / 2 * 3);
      }
      return out;
    });
    this.borders = { countries: decode(lines.countries), states: decode(lines.states) };
    this.hooks.requestFrame();
  }

  setTexture(name, image) {
    this.maps[name] = image;
    this.earth.setTexture(name, image);
    this.hooks.requestFrame();
  }

  /** A phone can take the graphics context away. It usually hands it back; if it has not after a few seconds in view, carry on with the simple renderer. */
  watch() {
    this.earth.onRestore = () => this.hooks.requestFrame();
    this.earth.onLost = () => {
      const check = () => {
        if (!this.earth.lost) return;
        if (document.hidden || performance.now() - this.shownAt < 3000) { setTimeout(check, 1000); return; }
        const old = this.earth.canvas, fresh = old.cloneNode(false);
        old.replaceWith(fresh);
        this.earth = createEarth(fresh, 'canvas');
        this.quiet = true; this.scale = 1; this.fade = 1;
        for (const name of Object.keys(this.maps)) { try { this.earth.setTexture(name, this.maps[name]); } catch (error) { /* that image is gone too */ } }
        this.resize();
        this.hooks.requestFrame();
      };
      setTimeout(check, 3000);
    };
  }

  // ---- geometry ----

  resize() {
    const rect = this.box.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    if (!w || !h) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const [canvas, k] of [[this.earth.canvas, dpr * this.scale], [this.lines, dpr]]) {
      const cw = Math.round(w * k), ch = Math.round(h * k);
      if (canvas.width !== cw) canvas.width = cw;
      if (canvas.height !== ch) canvas.height = ch;
    }
    const lens = Math.max(60, Math.min(w / 2, h / 2) - 6);
    // In a box wider than the globe, sit to the right so the photo has room on the left. On screens where the page
    // hangs the photo below the globe instead (it says so with --photo), stay in the middle.
    const spare = w - 2 * lens, below = getComputedStyle(this.box).getPropertyValue('--photo').trim() === 'below';
    const cx = below || spare <= 0 ? w / 2 : w - lens - Math.min(40, spare * 0.12);
    this.geom = { w, h, dpr, lens, cx, cy: h / 2 };
    this.box.style.setProperty('--globe-x', cx + 'px');
    this.box.style.setProperty('--globe-y', h / 2 + 'px');
    this.box.style.setProperty('--globe-r', lens + 'px');
  }

  get radius() { return this.geom.lens * SPHERE * this.cam.zoom; }

  /**
   * Tell the globe how long the last animation frame took. If the device cannot keep up, the Earth image is drawn
   * at a lower resolution (the lines and labels on top stay sharp), which is far better than a stuttering globe.
   */
  noteFrame(ms) {
    if (this.earth.kind === 'canvas' || this.scale <= 0.4 || this.fixedQuality) return;
    this.slowFrames = ms > 55 ? this.slowFrames + 1 : 0;
    if (this.slowFrames < 5) return;
    this.slowFrames = 0;
    this.scale = Math.max(0.4, this.scale * 0.7);
    this.resize();
  }

  inLens(x, y, margin = 0) {
    const { cx, cy, lens } = this.geom;
    return (x - cx) ** 2 + (y - cy) ** 2 < (lens - margin) ** 2;
  }

  /** The place on the globe under a point of the box, as a unit vector, or null if that point is off the sphere. */
  unproject(x, y) {
    const { cx, cy } = this.geom, R = this.radius;
    const dx = (x - cx) / R, dy = (cy - y) / R, r2 = dx * dx + dy * dy;
    if (r2 >= 1) return null;
    const z = Math.sqrt(1 - r2), { east, north, out } = viewBasis(this.cam.lon, this.cam.lat);
    return [east[0] * dx + north[0] * dy + out[0] * z, east[1] * dx + north[1] * dy + out[1] * z, north[2] * dy + out[2] * z];
  }

  /** Turn the globe so that a given place sits under a given point: what makes zooming feel anchored, like a map. */
  pin(place, x, y) {
    if (!place) return;
    const { cx, cy } = this.geom, cam = this.cam;
    for (let i = 0; i < 4; i++) {
      const R = this.radius, { east, north } = viewBasis(cam.lon, cam.lat);
      const px = cx + R * (place[0] * east[0] + place[1] * east[1]);
      const py = cy - R * (place[0] * north[0] + place[1] * north[1] + place[2] * north[2]);
      cam.lon -= (x - px) / R * DEG / Math.max(0.35, Math.cos(cam.lat * RAD));
      cam.lat = clamp(cam.lat + (y - py) / R * DEG, -80, 80);
    }
  }

  // ---- camera ----

  /** Point the camera's target at what the page is showing. In 'free' mode the visitor is steering, so do nothing. */
  aim() {
    const cam = this.cam, pos = this.view.pos;
    if (cam.mode === 'free' || !pos) return;
    const [lon, lat] = lonLat(pos.v);
    if (cam.mode === 'overview') {
      cam.toLon = lon + 22; cam.toLat = clamp(lat + 2, -40, 46); cam.toZoom = 1;
      return;
    }
    cam.toLon = lon; cam.toLat = lat;
    // on a long hop pull back far enough to see both ends
    cam.toZoom = pos.leg ? clamp(0.62 / Math.max(0.12, pos.leg.ang), 1, cam.followZoom) : cam.followZoom;
  }

  /** Move the camera toward its target. Returns true while it is still moving. */
  step(dt) {
    const cam = this.cam;
    const rate = 3.2 * (this.view.playing ? Math.max(1, this.view.speed * 0.8) : 1);
    const k = this.reducedMotion ? 1 : 1 - Math.exp(-dt * rate);
    let moving = false;
    if (cam.mode !== 'free') {
      if (cam.lon > 180 || cam.lon < -180) cam.lon = ((cam.lon % 360) + 540) % 360 - 180;       // keep the turn count from piling up
      const dLon = (((cam.toLon - cam.lon) % 360) + 540) % 360 - 180, dLat = cam.toLat - cam.lat;     // the short way round
      if (Math.abs(dLon) > 0.01 || Math.abs(dLat) > 0.01) { cam.lon += dLon * k; cam.lat += dLat * k; moving = true; }
    }
    const dZoom = cam.toZoom - cam.zoom;
    if (Math.abs(dZoom) > 0.002) { cam.zoom += dZoom * k; moving = true; }

    const night = this.view.live ? 1 : 0;                          // day and night only make sense for "right now"
    if (this.night !== night) { this.night = this.quiet ? night : clamp(this.night + Math.sign(night - this.night) * dt * 1.8, 0, 1); moving = true; }
    if (this.earth.has.day && this.fade < 1) { this.fade = this.quiet ? 1 : Math.min(1, this.fade + dt * 2.2); moving = true; }
    return moving;
  }

  zoomBy(factor) {
    const cam = this.cam;
    if (cam.mode === 'overview' && factor > 1 && this.view.pos) {
      // From the whole-Earth view, zooming in closes in on the place the page is showing, not on the middle of the picture.
      cam.mode = 'follow';
      cam.followZoom = clamp(cam.toZoom * factor, 1.4, ZOOM_MAX);
    } else if (cam.mode === 'follow') {
      // While following, the buttons set how close the camera keeps to each stop (on a long hop it still pulls back to show both ends).
      if (factor < 1 && cam.followZoom <= 1.4 + 1e-6) { this.showWhole(); return; }       // already as far out as following goes
      cam.followZoom = clamp(cam.followZoom * factor, 1.4, ZOOM_MAX);
    } else {
      cam.toZoom = clamp(cam.toZoom * factor, ZOOM_MIN, ZOOM_MAX);
      if (cam.mode === 'overview') cam.mode = 'free';
    }
    this.hooks.requestFrame();
  }
  get canZoomIn() { return (this.cam.mode === 'follow' ? this.cam.followZoom : this.cam.toZoom) < ZOOM_MAX - 0.01; }
  get canZoomOut() { return this.cam.mode === 'follow' || this.cam.toZoom > ZOOM_MIN + 0.01; }

  showWhole() { this.cam.mode = 'overview'; this.cam.followZoom = FOLLOW_ZOOM; this.hooks.requestFrame(); }
  follow() { if (this.cam.mode !== 'follow') { this.cam.mode = 'follow'; this.hooks.requestFrame(); } }

  /** Start a quarter turn away, so the globe swings into place when the page opens. */
  spinIn() {
    this.aim();
    const cam = this.cam;
    cam.lon = cam.toLon - (this.quiet ? 0 : 100); cam.lat = cam.toLat; cam.zoom = cam.toZoom;
  }

  // ---- drawing ----

  /** moving: true while an animation is under way (the simple renderer draws coarser then). */
  draw(moving = false) {
    const { model, view, cam, ctx } = this;
    const { w, h, dpr, cx, cy, lens } = this.geom;
    if (!w) return;
    const R = this.radius;
    const basis = viewBasis(cam.lon, cam.lat), E = basis.east, N = basis.north, O = basis.out;
    const [sunLon, sunLat] = subsolar(Date.now());
    const k = dpr * this.scale;
    this.earth.draw({
      width: this.earth.canvas.width, height: this.earth.canvas.height, cx: cx * k, cy: cy * k,
      radius: R * k, lens: lens * k, basis, sun: vec(sunLon, sunLat), night: this.night, fade: this.fade, moving,
    });

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    this.hits = [];
    if (!model) { if (this.pulse) this.pulse.hidden = true; return; }
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, lens, 0, 7); ctx.clip();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    // borders: countries always (they also give the globe its shape before the map has arrived), state lines once there is room
    if (this.borders) {
      const trace = lines => {
        ctx.beginPath();
        for (const line of lines) {
          let pen = false;
          for (let i = 0; i < line.length; i += 3) {
            const x = line[i], y = line[i + 1], z = line[i + 2];
            if (x * O[0] + y * O[1] + z * O[2] <= 0.02) { pen = false; continue; }
            const X = cx + R * (x * E[0] + y * E[1]), Y = cy - R * (x * N[0] + y * N[1] + z * N[2]);
            if (pen) ctx.lineTo(X, Y); else { ctx.moveTo(X, Y); pen = true; }
          }
        }
      };
      ctx.strokeStyle = '#FFFFFF';
      trace(this.borders.countries); ctx.globalAlpha = 0.28; ctx.lineWidth = 0.9; ctx.stroke();
      if (cam.zoom > 1.3) { trace(this.borders.states); ctx.globalAlpha = clamp((cam.zoom - 1.3) * 0.5, 0, 0.32); ctx.lineWidth = 0.8; ctx.stroke(); }
      ctx.globalAlpha = 1;
    }

    // routes
    const showPlan = view.u >= model.uNow - 1e-3;
    const traceLeg = (leg, upto) => {
      const { pts, n } = leg, last = upto * n, lift = leg.fly ? LIFT * Math.min(1, leg.ang / 1.1) : 0;
      let pen = false;
      for (let k = 0; k <= Math.ceil(last - 1e-9); k++) {
        const t = Math.min(k, last), i0 = Math.floor(t), i1 = Math.min(n, i0 + 1), f = t - i0;
        const x = pts[i0 * 3] + (pts[i1 * 3] - pts[i0 * 3]) * f, y = pts[i0 * 3 + 1] + (pts[i1 * 3 + 1] - pts[i0 * 3 + 1]) * f, z = pts[i0 * 3 + 2] + (pts[i1 * 3 + 2] - pts[i0 * 3 + 2]) * f;
        const vx = x * E[0] + y * E[1], vy = x * N[0] + y * N[1] + z * N[2], vz = x * O[0] + y * O[1] + z * O[2];
        const rise = 1 + lift * Math.sin(Math.PI * t / n);
        // on the near side, or lifted far enough off the surface to show over the edge
        if (!(vz > 0 || rise * Math.hypot(vx, vy) > 1.004)) { pen = false; continue; }
        const X = cx + R * vx * rise, Y = cy - R * vy * rise;
        if (pen) ctx.lineTo(X, Y); else { ctx.moveTo(X, Y); pen = true; }
      }
    };
    const driven = [], flown = [], booked = [], pencilled = [];
    for (const leg of model.legs) {
      if (leg.b.a <= model.now) {
        const f = model.legProgress(leg, view.u);
        if (f > 0) (leg.fly ? flown : driven).push([leg, f]);
      } else if (showPlan) (leg.b.booked ? booked : pencilled).push([leg, 1]);
    }
    const width = clamp(1.3 + cam.zoom * 0.55, 1.8, 3.4);
    const strokeAll = (list, paint) => { if (!list.length) return; ctx.beginPath(); for (const [leg, f] of list) traceLeg(leg, f); paint(); };
    strokeAll(flown, () => { ctx.strokeStyle = 'rgba(4, 10, 24, 0.5)'; ctx.lineWidth = 3.4; ctx.stroke(); ctx.strokeStyle = 'rgba(255, 255, 255, 0.94)'; ctx.lineWidth = 1.6; ctx.stroke(); });
    strokeAll(driven, () => { ctx.strokeStyle = CASING; ctx.lineWidth = width + 2.2; ctx.stroke(); ctx.strokeStyle = MARIGOLD; ctx.lineWidth = width; ctx.stroke(); });
    const planWidth = Math.max(1.5, width - 0.8);
    strokeAll(booked, () => { ctx.setLineDash([6, 5]); ctx.strokeStyle = CASING; ctx.lineWidth = planWidth + 1.6; ctx.stroke(); ctx.strokeStyle = MARIGOLD; ctx.lineWidth = planWidth; ctx.stroke(); });
    strokeAll(pencilled, () => { ctx.setLineDash([1.5, 5]); ctx.strokeStyle = CASING; ctx.lineWidth = planWidth + 1.4; ctx.stroke(); ctx.strokeStyle = MARIGOLD; ctx.lineWidth = planWidth; ctx.stroke(); });
    ctx.setLineDash([]);

    // places
    const when = model.dateOf(view.u), dotScale = clamp(0.75 + cam.zoom * 0.25, 0.9, 1.5);
    const labels = [];
    const place = p => {
      const v = p.v, vz = v[0] * O[0] + v[1] * O[1] + v[2] * O[2];
      if (vz <= 0.03) return;
      const x = cx + R * (v[0] * E[0] + v[1] * E[1]), y = cy - R * (v[0] * N[0] + v[1] * N[1] + v[2] * N[2]);
      if (!this.inLens(x, y, 2)) return;
      let nights = 0, seen = false, planned = false;
      for (const visit of p.visits) {
        if (visit.i === 0) { seen = true; continue; }
        if (visit.a <= when + 1) { seen = true; nights += Math.max(0, Math.min(visit.d, when) - visit.a) / DAY; }
        else if (visit.a > model.now) planned = true;
      }
      if (seen) {
        const r = (2.4 + Math.sqrt(nights) / 3.4) * dotScale;
        ctx.beginPath(); ctx.arc(x, y, r + 1.5, 0, 7); ctx.fillStyle = CASING; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = '#FFFFFF'; ctx.fill();
        this.hits.push({ place: p, x, y, r: Math.max(r, 3) });
        labels.push([p, x, y, Math.max(r, 3), nights]);
      } else if (showPlan && (planned || p.someday)) {
        const r = 3.4 * dotScale;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = 'rgba(4, 10, 24, 0.62)'; ctx.fill();
        ctx.setLineDash(p.someday ? [1.5, 3] : []); ctx.strokeStyle = MARIGOLD; ctx.lineWidth = 1.7; ctx.stroke(); ctx.setLineDash([]);
        this.hits.push({ place: p, x, y, r });
        labels.push([p, x, y, r, -1]);
      }
    };
    for (const p of model.places.values()) place(p);
    for (const p of model.someday) place(p);

    // where they are on the date being shown
    const pos = view.pos;
    let marker = null;
    if (pos) {
      const project = (v, t) => {
        const vx = v[0] * E[0] + v[1] * E[1], vy = v[0] * N[0] + v[1] * N[1] + v[2] * N[2], vz = v[0] * O[0] + v[1] * O[1] + v[2] * O[2];
        const rise = pos.leg && pos.leg.fly ? 1 + LIFT * Math.min(1, pos.leg.ang / 1.1) * Math.sin(Math.PI * t) : 1;
        return [cx + R * vx * rise, cy - R * vy * rise, vz];
      };
      const [x, y, vz] = project(pos.v, pos.f);
      if (vz > 0.03 && this.inLens(x, y, 4)) {
        if (pos.leg && pos.leg.fly) {                              // in the air: a little plane, pointing the way it is going
          const f0 = Math.max(0, pos.f - 0.02), f1 = Math.min(1, pos.f + 0.02);
          const [ax, ay] = project(slerp(pos.leg.a.v, pos.leg.b.v, f0), f0), [bx, by] = project(slerp(pos.leg.a.v, pos.leg.b.v, f1), f1);
          ctx.save();
          ctx.translate(x, y); ctx.rotate(Math.atan2(by - ay, bx - ax));
          ctx.beginPath();
          PLANE.forEach(([px, py], i) => (i ? ctx.lineTo(px, -py) : ctx.moveTo(px, -py)));
          for (let i = PLANE.length - 2; i > 0; i--) ctx.lineTo(PLANE[i][0], PLANE[i][1]);
          ctx.closePath();
          ctx.lineWidth = 3.2; ctx.strokeStyle = CASING; ctx.stroke();
          ctx.fillStyle = MARIGOLD; ctx.fill();
          ctx.restore();
        } else {
          ctx.beginPath(); ctx.arc(x, y, 8.5, 0, 7); ctx.fillStyle = CASING; ctx.fill();
          ctx.beginPath(); ctx.arc(x, y, 6.2, 0, 7); ctx.fillStyle = MARIGOLD; ctx.fill();
        }
        marker = [x, y];
      }
    }
    if (this.pulse) {
      const show = Boolean(marker) && !view.playing;
      this.pulse.hidden = !show;
      if (show) this.pulse.style.transform = `translate(${marker[0].toFixed(1)}px, ${marker[1].toFixed(1)}px)`;
    }

    // labels: the stop being shown always; places abroad from far out; everything once zoomed in. Biggest stays first, none overlapping.
    const current = pos && pos.stop ? pos.stop.place : null;
    ctx.font = '600 13px Overpass, "Helvetica Neue", Arial, sans-serif';
    ctx.textBaseline = 'middle';
    const abroad = p => p.country && p.country !== 'United States' && p.country !== 'Canada';
    labels.sort((a, b) => (b[0] === current) - (a[0] === current) || abroad(b[0]) - abroad(a[0]) || b[4] - a[4]);
    const taken = marker ? [[marker[0] - 10, marker[1] - 10, marker[0] + 10, marker[1] + 10]] : [];
    for (const [p, x, y, r] of labels) {
      if (p !== current && cam.zoom < 1.9 && !abroad(p)) continue;
      const textWidth = ctx.measureText(p.name).width;
      let left = x + r + 7;
      if (!this.inLens(left + textWidth + 2, y, 6)) left = x - r - 7 - textWidth;        // no room on the right: put the name on the left
      const boxed = [left - 2, y - 9, left + textWidth + 2, y + 9];
      if (!this.inLens(boxed[0], y, 6) || !this.inLens(boxed[2], y, 6)) continue;
      if (p !== current && taken.some(o => !(boxed[2] < o[0] || boxed[0] > o[2] || boxed[3] < o[1] || boxed[1] > o[3]))) continue;
      taken.push(boxed);
      ctx.lineWidth = 3.6; ctx.strokeStyle = 'rgba(4, 10, 24, 0.88)'; ctx.strokeText(p.name, left, y + 0.5);
      ctx.fillStyle = p === current ? MARIGOLD : '#FFFFFF'; ctx.fillText(p.name, left, y + 0.5);
    }
    ctx.restore();

    if (R > lens) {                    // zoomed in: a thin rim around the window
      ctx.beginPath(); ctx.arc(cx, cy, lens - 0.75, 0, 7); ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)'; ctx.lineWidth = 1.5; ctx.stroke();
    }
  }

  // ---- mouse, wheel, touch and keys ----

  nearest(x, y) {
    let best = null, bestDistance = 18 * 18;
    for (const hit of this.hits) {
      const d = (hit.x - x) ** 2 + (hit.y - y) ** 2;
      if (d < bestDistance) { bestDistance = d; best = hit; }
    }
    return best;
  }

  listen() {
    const canvas = this.lines, cam = this.cam, hooks = this.hooks;
    const local = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    let drag = null, pinch = null;
    const setHover = hit => {
      if ((hit && hit.place) === (this.hover && this.hover.place)) return;
      this.hover = hit;
      canvas.classList.toggle('hit', Boolean(hit));
      hooks.onHover(hit ? hit.place : null, hit ? hit.x : 0, hit ? hit.y : 0);
    };
    const stopDrag = () => { drag = null; canvas.classList.remove('drag'); };

    canvas.addEventListener('pointerdown', e => {
      if (pinch || e.button !== 0 || !e.isPrimary) return;       // left button or first finger only
      const [x, y] = local(e);
      if (!this.inLens(x, y)) return;
      drag = { id: e.pointerId, x, y, lon: cam.lon, lat: cam.lat, moved: false, touch: e.pointerType === 'touch' };
      try { canvas.setPointerCapture(e.pointerId); } catch (error) { /* the pointer is already gone */ }
    });
    canvas.addEventListener('pointermove', e => {
      if (pinch) return;
      const [x, y] = local(e);
      if (drag && e.pointerId === drag.id) {
        if (e.pointerType === 'mouse' && !(e.buttons & 1)) { stopDrag(); return; }   // the button was released somewhere we did not see
        const dx = x - drag.x, dy = y - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) < 6) return;
        drag.moved = true; cam.mode = 'free'; canvas.classList.add('drag'); setHover(null);
        cam.lon = drag.lon - dx / this.radius * DEG;
        if (!drag.touch) cam.lat = clamp(drag.lat + dy / this.radius * DEG, -80, 80);   // a finger moving up or down scrolls the page instead
        cam.toZoom = cam.zoom;
        hooks.requestFrame();
        return;
      }
      if (!drag && e.pointerType !== 'touch') setHover(this.inLens(x, y) ? this.nearest(x, y) : null);
    });
    const endDrag = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const was = drag; stopDrag();
      if (pinch || was.moved || e.type === 'pointercancel') return;
      const hit = this.nearest(was.x, was.y);
      if (hit && hit.place.visits.length) { setHover(null); hooks.onPick(hit.place); }
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('pointerleave', () => { if (!drag) setHover(null); });
    canvas.addEventListener('contextmenu', stopDrag);

    // Wheel zoom, anchored under the cursor, the way a map does it. Two things keep the page scrollable:
    // a scroll that was already under way when it reached the globe carries on scrolling, and once the globe
    // is zoomed all the way out, scrolling down moves the page again.
    window.addEventListener('wheel', e => {
      if (e.target !== canvas) { this.pageWheelAt = performance.now(); return; }
      const [x, y] = local(e);
      if (!this.inLens(x, y)) this.pageWheelAt = performance.now();
    }, { capture: true, passive: true });
    canvas.addEventListener('wheel', e => {
      const [x, y] = local(e);
      if (!this.inLens(x, y)) return;
      const now = performance.now();
      if (now - this.pageWheelAt < 400) { this.pageWheelAt = now; return; }
      const delta = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
      const zoom = clamp(cam.zoom * Math.exp(-delta * (e.ctrlKey ? 0.01 : 0.0016)), ZOOM_MIN, ZOOM_MAX);
      if (zoom === cam.zoom) {
        if (delta > 0 && !e.ctrlKey) { this.pageWheelAt = now; return; }      // fully zoomed out: hand the wheel back to the page
        e.preventDefault(); return;
      }
      e.preventDefault();
      const under = this.unproject(x, y);
      cam.zoom = cam.toZoom = zoom; cam.mode = 'free';
      this.pin(under, x, y);
      setHover(null);
      hooks.onZoom && hooks.onZoom();
      hooks.requestFrame();
    }, { passive: false });

    // two fingers on the globe: pinch to zoom, anchored between the fingers
    const twoFingers = e => {
      const r = canvas.getBoundingClientRect(), a = e.targetTouches[0], b = e.targetTouches[1];
      return { x: (a.clientX + b.clientX) / 2 - r.left, y: (a.clientY + b.clientY) / 2 - r.top, spread: Math.max(1, Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)) };
    };
    canvas.addEventListener('touchstart', e => {
      if (e.targetTouches.length !== 2) return;
      if (e.cancelable) e.preventDefault();
      const mid = twoFingers(e);
      stopDrag(); setHover(null);
      pinch = { spread: mid.spread, zoom: cam.zoom, under: this.unproject(mid.x, mid.y) };
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
      if (!pinch || e.targetTouches.length !== 2) return;
      if (e.cancelable) e.preventDefault();
      const mid = twoFingers(e);
      cam.zoom = cam.toZoom = clamp(pinch.zoom * mid.spread / pinch.spread, ZOOM_MIN, ZOOM_MAX); cam.mode = 'free';
      this.pin(pinch.under, mid.x, mid.y);
      hooks.onZoom && hooks.onZoom();
      hooks.requestFrame();
    }, { passive: false });
    const endPinch = e => { if (pinch && e.targetTouches.length < 2) { pinch = null; stopDrag(); } };
    canvas.addEventListener('touchend', endPinch);
    canvas.addEventListener('touchcancel', endPinch);

    // keys, when the globe has focus: arrows turn it, plus and minus zoom, 0 shows the whole globe
    this.box.addEventListener('keydown', e => {
      if (e.target !== this.box || e.altKey || e.ctrlKey || e.metaKey) return;
      const turn = 18 / cam.zoom;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { cam.mode = 'free'; cam.lon += e.key === 'ArrowLeft' ? -turn : turn; }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { cam.mode = 'free'; cam.lat = clamp(cam.lat + (e.key === 'ArrowUp' ? turn : -turn) * 0.6, -80, 80); }
      else if (e.key === '+' || e.key === '=') this.zoomBy(1.5);
      else if (e.key === '-' || e.key === '_') this.zoomBy(1 / 1.5);
      else if (e.key === '0' || e.key === 'Home') this.showWhole();
      else return;
      e.preventDefault();
      hooks.onZoom && hooks.onZoom();
      hooks.requestFrame();
    });
  }
}

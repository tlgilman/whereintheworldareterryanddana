// Draws the Earth itself: a lit, textured sphere in an orthographic view.
//
// WebGL path: one triangle covers the canvas and the fragment shader works out, for every pixel, which point of the
// globe it shows, then looks that point up in a day map and a night map. No geometry, no library.
// Simple path (no WebGL, or WebGL that the browser would have to emulate in software, which is slower than doing the
// work here): the same lookup in JavaScript at reduced resolution, with the same day, night and city lights.

const VERTEX = `
ATTRIBUTE vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAGMENT = `
precision highp float;
uniform vec2 uCenter;        // centre of the globe, device pixels, origin bottom-left
uniform float uRadius;       // radius of the sphere, device pixels
uniform float uLens;         // radius of the round window the globe is seen through
uniform vec3 uEast, uNorth, uOut, uSun;
uniform float uNight;        // 0 = lit everywhere (replay), 1 = real day and night (right now)
uniform float uFade;         // 0..1 while the map fades in
uniform float uHasNight;
uniform sampler2D uDay, uNightMap;
const float PI = 3.141592653589793;

vec3 grade(vec3 c) {                                   // a little more air and colour than the raw satellite composite
  c = pow(c, vec3(0.86));
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  return mix(vec3(l), c, 1.16) * 1.08;
}

void main() {
  vec2 px = gl_FragCoord.xy - uCenter;
  float dist = length(px);
  vec2 d = px / uRadius;
  float r = length(d);
  float z = sqrt(max(0.0, 1.0 - r * r));

  // the point of the globe under this pixel, and its place on the map
  vec3 w = uEast * d.x + uNorth * d.y + uOut * z;
  float u = atan(w.y, w.x) / (2.0 * PI) + 0.5;
  float v = acos(clamp(w.z, -1.0, 1.0)) / PI;
  SAMPLE_SETUP
  vec3 day = SAMPLE(uDay);
  vec3 nightMap = SAMPLE(uNightMap);

  float s = dot(w, uSun);
  float dayAmount = mix(1.0, smoothstep(-0.10, 0.20, s), uNight);
  vec3 lit = grade(day) * (0.90 + 0.10 * z);
  // In the night map the moonlit ground and sea are blue; only man-made light has any red in it.
  float city = smoothstep(0.06, 0.30, nightMap.r);
  vec3 dark = mix(day * vec3(0.05, 0.07, 0.13), nightMap * 0.72 + vec3(1.0, 0.86, 0.60) * city * 1.6, uHasNight);
  vec3 rgb = mix(dark, lit, dayAmount);
  float twilight = uNight * smoothstep(-0.12, 0.02, s) * (1.0 - smoothstep(0.02, 0.24, s));
  rgb += vec3(0.95, 0.45, 0.18) * twilight * 0.16;
  float sunSide = mix(1.0, 0.22 + 0.78 * smoothstep(-0.25, 0.35, s), uNight);
  rgb += vec3(0.30, 0.56, 1.0) * pow(1.0 - z, 2.6) * 0.62 * sunSide;                 // air, seen edge-on at the limb
  rgb = mix(mix(vec3(0.03, 0.10, 0.22), vec3(0.07, 0.26, 0.46), z), rgb, uFade);    // plain ocean ball until the map arrives

  // glow of the atmosphere just outside the sphere
  vec2 dir = d / max(r, 1e-4);
  float limbSun = mix(1.0, 0.18 + 0.82 * smoothstep(-0.35, 0.35, dot(uEast * dir.x + uNorth * dir.y, uSun)), uNight);
  float glow = exp(-max(r - 1.0, 0.0) * 30.0) * 0.72 * limbSun;
  vec4 halo = vec4(vec3(0.44, 0.70, 1.0) * glow, glow);

  float onSphere = clamp((1.0 - r) * uRadius + 0.5, 0.0, 1.0);                     // one soft pixel at the edge
  vec4 col = mix(halo, vec4(rgb, 1.0), onSphere);

  // zoomed in, the sphere is bigger than the window: shade the rim like a porthole
  float zoomedIn = clamp((uRadius - uLens) / (0.25 * uLens), 0.0, 1.0);
  col.rgb *= 1.0 - 0.55 * zoomedIn * smoothstep(0.80, 1.0, dist / uLens);
  col *= clamp(uLens - dist + 0.5, 0.0, 1.0);
  OUT = col;
}`;

const GL2 = {
  vertex: '#version 300 es\n' + VERTEX.replace('ATTRIBUTE', 'in'),
  fragment: '#version 300 es\n' + FRAGMENT
    .replace('const float PI', 'out vec4 fragColor;\nconst float PI')
    // The map wraps at 180°, where u jumps from 1 to 0. Taking the texture gradient from whichever of two
    // parametrisations is continuous here keeps a seam from appearing along the date line.
    .replace('SAMPLE_SETUP', `float uAlt = fract(u + 0.5) - 0.5;
  vec2 gA = vec2(dFdx(u), dFdy(u)), gB = vec2(dFdx(uAlt), dFdy(uAlt));
  vec2 gU = dot(gA, gA) < dot(gB, gB) ? gA : gB;
  vec2 gx = vec2(gU.x, dFdx(v)), gy = vec2(gU.y, dFdy(v));`)
    .replace(/SAMPLE\((\w+)\)/g, 'textureGrad($1, vec2(u, v), gx, gy).rgb')
    .replace('OUT = col', 'fragColor = col'),
};
const GL1 = {
  vertex: VERTEX.replace('ATTRIBUTE', 'attribute'),
  fragment: FRAGMENT
    .replace('SAMPLE_SETUP', '')
    .replace(/SAMPLE\((\w+)\)/g, 'texture2D($1, vec2(u, v)).rgb')
    .replace('OUT = col', 'gl_FragColor = col'),
};

function compile(gl, source) {
  const program = gl.createProgram(), shaders = [];
  for (const [type, text] of [[gl.VERTEX_SHADER, source.vertex], [gl.FRAGMENT_SHADER, source.fragment]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, text);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
    shaders.push(shader);
  }
  gl.bindAttribLocation(program, 0, 'p');
  gl.linkProgram(program);
  // One question to the graphics process instead of three: the link fails if either shader did, and only then do we ask why.
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(shaders.map(shader => gl.getShaderInfoLog(shader)).join(' ') || gl.getProgramInfoLog(program) || 'the shaders did not build');
  }
  return program;
}

function createGlEarth(canvas, evenInSoftware) {
  const options = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'default' };
  let gl = canvas.getContext('webgl2', options), isGl2 = Boolean(gl);
  if (!gl) gl = canvas.getContext('webgl', options);
  if (!gl) return null;

  // A computer without a usable graphics chip emulates WebGL in software. That is slower, and stalls the page more,
  // than the simple renderer below, so hand over to it. Firefox names the chip directly; Chrome and Safari through an extension.
  let renderer = String(gl.getParameter(gl.RENDERER) || '');
  if (!renderer || /^webkit webgl$/i.test(renderer)) {
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    if (info) renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) || '');
  }
  const software = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer);
  if (software && !evenInSoftware) {
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return 'software';
  }

  // Older phones only promise medium precision in fragment shaders; the globe still draws, slightly less crisply when zoomed in.
  const precise = isGl2 || gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT).precision > 0;
  const shaders = isGl2 ? GL2 : { vertex: GL1.vertex, fragment: precise ? GL1.fragment : GL1.fragment.replace('precision highp float', 'precision mediump float') };
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  let sharp = null, sharpness = 0;

  const sources = {};          // name -> image, kept so the maps can be uploaded again after a lost context
  let program, uniforms, textures;

  function setUp() {
    // Asked for here, before any map upload (asking after one would make the page wait for that upload to finish),
    // and so asked for again when a lost context is handed back.
    sharp = isGl2 && !software ? gl.getExtension('EXT_texture_filter_anisotropic') : null;
    sharpness = sharp ? Math.min(4, gl.getParameter(sharp.MAX_TEXTURE_MAX_ANISOTROPY_EXT)) : 0;
    program = compile(gl, shaders);
    gl.useProgram(program);
    uniforms = {};
    for (const name of ['uCenter', 'uRadius', 'uLens', 'uEast', 'uNorth', 'uOut', 'uSun', 'uNight', 'uFade', 'uHasNight', 'uDay', 'uNightMap']) {
      uniforms[name] = gl.getUniformLocation(program, name);
    }
    gl.uniform1i(uniforms.uDay, 0);
    gl.uniform1i(uniforms.uNightMap, 1);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.BLEND);
    textures = {};
    for (const [name, unit] of [['day', 0], ['night', 1]]) {      // a dark placeholder pixel until the real map is in
      textures[name] = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, textures[name]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([8, 28, 60, 255]));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    for (const name of Object.keys(sources)) upload(name);
  }

  function upload(name) {
    const image = sources[name];
    gl.activeTexture(gl.TEXTURE0 + (name === 'day' ? 0 : 1));
    gl.bindTexture(gl.TEXTURE_2D, textures[name]);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (isGl2) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      if (sharp) gl.texParameterf(gl.TEXTURE_2D, sharp.TEXTURE_MAX_ANISOTROPY_EXT, sharpness);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  }

  try { setUp(); } catch (error) { console.warn('Globe: WebGL set-up failed, using the simple renderer.', error); return 'failed'; }

  const earth = {
    kind: isGl2 ? 'webgl2' : 'webgl',
    canvas,
    software,
    lost: false,
    has: { day: false, night: false },
    maxTextureSize,
    onRestore: null,
    onLost: null,
    setTexture(name, image) {
      sources[name] = image;
      if (earth.lost) return;
      upload(name);
      earth.has[name] = true;
    },
    /** frame: { width, height (device px), cx, cy (device px from the top-left), radius, lens, basis, sun, night, fade } */
    draw(frame) {
      if (earth.lost) return;
      gl.viewport(0, 0, frame.width, frame.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uniforms.uCenter, frame.cx, frame.height - frame.cy);
      gl.uniform1f(uniforms.uRadius, frame.radius);
      gl.uniform1f(uniforms.uLens, frame.lens);
      gl.uniform3fv(uniforms.uEast, frame.basis.east);
      gl.uniform3fv(uniforms.uNorth, frame.basis.north);
      gl.uniform3fv(uniforms.uOut, frame.basis.out);
      gl.uniform3fv(uniforms.uSun, frame.sun);
      gl.uniform1f(uniforms.uNight, frame.night);
      gl.uniform1f(uniforms.uFade, earth.has.day ? frame.fade : 0);
      gl.uniform1f(uniforms.uHasNight, earth.has.night ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); earth.lost = true; if (earth.onLost) earth.onLost(); });
  canvas.addEventListener('webglcontextrestored', () => {
    try { setUp(); earth.lost = false; for (const name of Object.keys(sources)) earth.has[name] = true; if (earth.onRestore) earth.onRestore(); }
    catch (error) { console.warn('Globe: could not restore WebGL.', error); }
  });
  return earth;
}

// ---- the simple renderer ----

const TONE = new Uint8Array(256);                    // the same lift the shader gives the satellite colours
for (let i = 0; i < 256; i++) TONE[i] = Math.min(255, Math.round(Math.pow(i / 255, 0.86) * 270));
const AIR = new Float32Array(257);                   // air seen edge-on at the limb, by how squarely the surface faces us
for (let i = 0; i <= 256; i++) AIR[i] = Math.pow(1 - i / 256, 2.6) * 0.62 * 255;
const DOWN = new Float32Array(4097);                 // how far down the map (0 at the north pole, 1 at the south) for each height on the globe
for (let i = 0; i <= 4096; i++) DOWN[i] = Math.acos(Math.max(-1, Math.min(1, i / 2048 - 1))) / Math.PI;
const TURN = 1 / (2 * Math.PI);
const smooth = (lo, hi, x) => { const t = Math.max(0, Math.min(1, (x - lo) / (hi - lo))); return t * t * (3 - 2 * t); };
const CITY = new Uint8Array(256);                    // man-made light, from how red a night-map pixel is: the moonlit ground and sea are blue
for (let i = 0; i < 256; i++) CITY[i] = Math.min(255, smooth(0.06, 0.30, i / 255) * 1.6 * 255);

function createSoftEarth(canvas) {
  const ctx = canvas.getContext('2d');
  const scratch = document.createElement('canvas'), pen = scratch.getContext('2d');
  let day = null, dayW = 0, dayH = 0;                // the day map as RGBA pixels
  let night = null, nightW = 0, nightH = 0;          // the night map
  let image = null, shape = '';
  const read = source => {                           // at most 2048 across: more would only cost memory here
    const w = Math.min(2048, source.width || 1024), h = w / 2;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(source, 0, 0, w, h);
    return { pixels: g.getImageData(0, 0, w, h).data, w, h };
  };
  const earth = {
    kind: 'canvas',
    canvas,
    software: true,
    has: { day: false, night: false },
    maxTextureSize: 2048,
    setTexture(name, source) {
      const map = read(source);
      if (name === 'day') { day = map.pixels; dayW = map.w; dayH = map.h; earth.has.day = true; return; }
      night = map.pixels; nightW = map.w; nightH = map.h;
      earth.has.night = true;
    },
    /** Same frame as the WebGL renderer, plus `moving`: true while the globe is animating, when a coarser picture is fine. */
    draw(frame) {
      const { width, height, cx, cy, radius, lens, basis: { east, north, out }, sun, night: dark, moving } = frame;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const reach = Math.min(radius, lens), whole = radius <= lens;
      if (whole) {                                    // the glow of the atmosphere around the edge
        const glow = ctx.createRadialGradient(cx, cy, radius * 0.985, cx, cy, radius * 1.14);
        glow.addColorStop(0, 'rgba(112, 178, 255, 0.62)'); glow.addColorStop(0.2, 'rgba(112, 178, 255, 0.30)');
        glow.addColorStop(0.5, 'rgba(112, 178, 255, 0.10)'); glow.addColorStop(1, 'rgba(112, 178, 255, 0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, radius * 1.14, 0, 7); ctx.fill();
      }
      const ball = ctx.createRadialGradient(cx, cy, 0, cx, cy, reach);       // plain ocean until the map arrives
      ball.addColorStop(0, '#124275'); ball.addColorStop(1, '#081A38');
      ctx.fillStyle = ball; ctx.beginPath(); ctx.arc(cx, cy, reach, 0, 7); ctx.fill();
      if (!day || frame.fade <= 0) return;

      // at most about 300 samples across at rest and 200 while moving, whatever the screen: this runs on the main thread
      const step = Math.max(moving ? 3 : 2, Math.ceil(reach * 2 / (moving ? 200 : 300))), size = Math.ceil(reach * 2 / step);
      const now = `${size}:${radius.toFixed(2)}`;
      if (!image || scratch.width !== size) { scratch.width = scratch.height = size; image = pen.createImageData(size, size); }
      else if (now !== shape) image.data.fill(0);
      shape = now;
      const px = image.data;
      const e0 = east[0], e1 = east[1], n0 = north[0], n1 = north[1], n2 = north[2], o0 = out[0], o1 = out[1], o2 = out[2];
      const s0 = sun[0], s1 = sun[1], s2 = sun[2], lit = dark > 0;
      // at rest, when the map is being magnified, blend neighbouring map pixels so coasts do not turn into staircases
      const blend = !moving && radius * 2 * Math.PI / dayW > step * 0.75;
      const lastRow = dayH - 1, lastCol = dayW - 1;
      for (let j = 0; j < size; j++) {
        const dy = (reach - (j + 0.5) * step) / radius, dy2 = dy * dy;
        const ax = n0 * dy, ay = n1 * dy, az = n2 * dy;
        let to = j * size * 4;
        for (let i = 0; i < size; i++, to += 4) {
          const dx = ((i + 0.5) * step - reach) / radius, r2 = dx * dx + dy2;
          if (r2 >= 1) continue;
          const z = Math.sqrt(1 - r2);
          const wx = e0 * dx + ax + o0 * z, wy = e1 * dx + ay + o1 * z, wz = az + o2 * z;
          const u = Math.atan2(wy, wx) * TURN + 0.5, v = DOWN[((wz + 1) * 2048) | 0];
          let r, g, b;
          if (blend) {
            const fx = u * dayW - 0.5, fy = v * dayH - 0.5;
            let x0 = Math.floor(fx), y0 = Math.floor(fy);
            const kx = fx - x0, ky = fy - y0;
            let x1 = x0 + 1, y1 = y0 + 1;
            if (x0 < 0) x0 = lastCol; if (x1 > lastCol) x1 = 0;
            if (y0 < 0) y0 = 0; if (y1 > lastRow) y1 = lastRow;
            const p = (y0 * dayW + x0) * 4, q = (y0 * dayW + x1) * 4, m = (y1 * dayW + x0) * 4, n = (y1 * dayW + x1) * 4;
            const k00 = (1 - kx) * (1 - ky), k10 = kx * (1 - ky), k01 = (1 - kx) * ky, k11 = kx * ky;
            r = TONE[(day[p] * k00 + day[q] * k10 + day[m] * k01 + day[n] * k11 + 0.5) | 0];
            g = TONE[(day[p + 1] * k00 + day[q + 1] * k10 + day[m + 1] * k01 + day[n + 1] * k11 + 0.5) | 0];
            b = TONE[(day[p + 2] * k00 + day[q + 2] * k10 + day[m + 2] * k01 + day[n + 2] * k11 + 0.5) | 0];
          } else {
            let tx = (u * dayW) | 0, ty = (v * dayH) | 0;
            if (tx > lastCol) tx = lastCol; if (ty > lastRow) ty = lastRow;
            const from = (ty * dayW + tx) * 4;
            r = TONE[day[from]]; g = TONE[day[from + 1]]; b = TONE[day[from + 2]];
          }
          const shade = 0.90 + 0.10 * z;
          r *= shade; g *= shade; b *= shade;
          let air = AIR[(z * 256) | 0];
          if (lit) {
            const s = wx * s0 + wy * s1 + wz * s2;
            if (s < 0.24) {                              // twilight and night: a dark Earth with its city lights
              const k = smooth(-0.10, 0.20, s) * dark + (1 - dark), d = 1 - k;
              let nr, ng, nb;
              if (night) {
                let tx = (u * nightW) | 0, ty = (v * nightH) | 0;
                if (tx >= nightW) tx = nightW - 1; if (ty >= nightH) ty = nightH - 1;
                const at = (ty * nightW + tx) * 4, glow = CITY[night[at]];
                nr = night[at] * 0.72 + glow; ng = night[at + 1] * 0.72 + glow * 0.86; nb = night[at + 2] * 0.72 + glow * 0.60;
              } else { nr = r * 0.05; ng = g * 0.07; nb = b * 0.13; }
              r = r * k + nr * d; g = g * k + ng * d; b = b * k + nb * d;
              const dusk = smooth(-0.12, 0.02, s) * (1 - smooth(0.02, 0.24, s)) * dark * 0.16 * 255;
              r += 0.95 * dusk; g += 0.45 * dusk; b += 0.18 * dusk;
            }
            if (s < 0.35) air *= 1 - dark + dark * (0.22 + 0.78 * smooth(-0.25, 0.35, s));
          }
          px[to] = r + 0.30 * air; px[to + 1] = g + 0.56 * air; px[to + 2] = b + air; px[to + 3] = 255;
        }
      }
      pen.putImageData(image, 0, 0);
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, reach - 0.5, 0, 7); ctx.clip();
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.globalAlpha = Math.min(1, frame.fade);
      ctx.drawImage(scratch, cx - reach, cy - reach, size * step, size * step);
      ctx.globalAlpha = 1;
      if (!whole) {                                   // zoomed in: shade the rim like a porthole
        const depth = Math.min(1, (radius - lens) / (0.25 * lens));
        const rim = ctx.createRadialGradient(cx, cy, lens * 0.8, cx, cy, lens);
        rim.addColorStop(0, 'rgba(0, 0, 0, 0)'); rim.addColorStop(1, `rgba(0, 0, 0, ${(0.55 * depth).toFixed(3)})`);
        ctx.fillStyle = rim; ctx.fillRect(cx - lens, cy - lens, lens * 2, lens * 2);
      }
      ctx.restore();
    },
  };
  return earth;
}

/**
 * Returns the best renderer for this browser; `earth.canvas` is the canvas it draws on (not always the one passed in).
 * prefer: 'canvas' forces the simple renderer; 'webgl' keeps WebGL even where the browser emulates it in software.
 */
export function createEarth(canvas, prefer) {
  const gl = prefer === 'canvas' ? null : createGlEarth(canvas, prefer === 'webgl');
  if (gl && typeof gl === 'object') return gl;
  if (gl) {                              // 'failed' or 'software': a canvas that has handed out a WebGL context cannot give a 2D one
    const fresh = canvas.cloneNode(false);
    canvas.replaceWith(fresh);
    canvas = fresh;
  }
  return createSoftEarth(canvas);
}

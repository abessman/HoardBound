/* 3D map test (index.html?scene=map3d, or Settings → 3D map test): the parchment as a plane seen at a steep angle, the
 * map's mountains, trees, places, the legendary peaks and the dragon standing on it and facing the camera. Turn it
 * (two-finger twist, ⟲ ⟳, Q/E), zoom (pinch, wheel, + −; the paper flattens as you zoom out), Overview for the
 * whole world with far less detail. A throwaway experiment to judge the look and the iPad's speed: the live map
 * (mapview.js) is untouched. The ground is the live map's own chunk drawing (renderChunk) with the standing symbols
 * taken out and recorded where it placed them; it is shown with WebGL and the symbols are drawn over it as upright
 * sprites. Reads the campaign, never writes it. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;

  const STAND = ['mountain', 'mountainJagged', 'hill', 'treeRound', 'treePine', 'treeBare', 'treeBurned'];
  const QUIET = ['blossom']; // flecks on tree tops: left out for now
  const TILTS = [{ name: 'steep', near: 62, far: 32 }, { name: 'medium', near: 52, far: 27 }, { name: 'gentle', near: 40, far: 22 }];
  const FOV = 34 * Math.PI / 180;
  const D_MIN = 6, D_MAX = 60, D_BAKE = 72, D_OVER = 200; // camera distance in cells; past D_BAKE symbols lie flat on the paper
  const RES = 3, BASE = 30;                                 // standing symbols are cached 30 map px wide at 3×
  const PAPER_K = 33 / 512;                                 // paper texels per cell, as on the live map (texel = zoom / 1.5 px)
  const CY = 0.58;                                          // the point you look at sits a little below the middle: more land ahead
  const rad = (d) => d * Math.PI / 180, dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

  // ---------- WebGL ground
  function makeGL() {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl', { alpha: false, antialias: true, preserveDrawingBuffer: true, premultipliedAlpha: false });
    if (!gl) return null;
    const VS = `attribute vec2 aPos; attribute vec2 aUV; uniform mat4 uVP; uniform vec3 uCam; varying vec2 vW; varying vec2 vUV; varying float vD;
      void main() { vW = aPos; vUV = aUV; vD = distance(vec3(aPos, 0.0), uCam); gl_Position = uVP * vec4(aPos, 0.0, 1.0); }`;
    const FS = `precision mediump float;
      uniform sampler2D uTex; uniform sampler2D uPaper; uniform sampler2D uFog; uniform vec2 uWorld; uniform float uChunk; uniform vec2 uHaze; uniform float uFogOn;
      varying vec2 vW; varying vec2 vUV; varying float vD;
      void main() {
        vec3 paper = texture2D(uPaper, vW * ${PAPER_K.toFixed(6)}).rgb;
        vec2 fw = vW / uWorld;
        float inside = step(0.0, fw.x) * step(0.0, fw.y) * step(fw.x, 1.0) * step(fw.y, 1.0);
        float rev = mix(1.0, texture2D(uFog, fw).r, uFogOn) * inside;
        vec4 ink = uChunk > 0.5 ? texture2D(uTex, vUV) : vec4(0.0);
        vec3 col = paper * (1.0 - ink.a * rev) + ink.rgb * rev;
        col = mix(col, col * 0.78 + vec3(1.0, 0.98, 0.92) * 0.22, 1.0 - rev);
        col = mix(col, paper * 0.94 + vec3(0.06), smoothstep(uHaze.x, uHaze.y, vD));
        gl_FragColor = vec4(col, 1.0);
      }`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const loc = {}; for (const n of ['uVP', 'uCam', 'uTex', 'uPaper', 'uFog', 'uWorld', 'uChunk', 'uHaze', 'uFogOn']) loc[n] = gl.getUniformLocation(prog, n);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    const aPos = gl.getAttribLocation(prog, 'aPos'), aUV = gl.getAttribLocation(prog, 'aUV');
    gl.enableVertexAttribArray(aPos); gl.enableVertexAttribArray(aUV);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0); gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 16, 8);
    gl.uniform1i(loc.uTex, 0); gl.uniform1i(loc.uPaper, 1); gl.uniform1i(loc.uFog, 2);
    const aniso = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
    return { gl, canvas: c, loc, aniso, maxAniso: aniso ? gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 1, quad: new Float32Array(16) };
  }
  function texFrom(G, src, repeat) {
    const gl = G.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const wrap = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE; gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    if (G.aniso) gl.texParameterf(gl.TEXTURE_2D, G.aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, G.maxAniso));
    return t;
  }
  // column-major 4×4 matrices
  function perspective(fovy, aspect, near, far) { const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far); return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]; }
  function mul(a, b) { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }

  class Map3DScene {
    constructor(state, o = {}) {
      this.state = state; this.opaque = true; this.ui = new HB.ui.UI(); this.t = 0; this.frames = 0; this.fps = 0; this.fpsT = 0; this.fpsN = 0;
      const W = state.world, H = W.home;
      this.cam = { x: H.x + 0.5, y: H.y + 0.5, heading: 0, dist: 16, tdist: null };
      this.tilt = 0; this.fog = true; this.flat = false; this.over = false;
      // the live map's chunk drawing, borrowed: renderChunk needs only the state, the domain marks and a zoom (2× raster)
      this.helper = Object.create(HB.MapScene.prototype); this.helper.state = state; this.helper.mark = HB.domain ? HB.domain.markField(state) : null; this.helper.cam = { zoom: 2 };
      this.chunks = new Map(); this.order = []; this.sprites = new Map(); this.stats = { sprites: 0, chunks: 0 };
      try { this.G = makeGL(); } catch (e) { this.G = null; this.glError = String(e && e.message || e); }
      if (this.G) {
        const gl = this.G.gl;
        gl.activeTexture(gl.TEXTURE1); this.paperTex = texFrom(this.G, HB.parchment.tile, true);
        gl.activeTexture(gl.TEXTURE2); this.fogTex = gl.createTexture(); this.uploadFog(); gl.activeTexture(gl.TEXTURE0);
      }
      this.edges = this.fogEdges();
      this.buildHud();
    }
    /** the test world for ?scene=map3d: a fresh campaign with a good stretch around the lair revealed (saves to the test slot only) */
    static testState(params) {
      const st = HB.game.newCampaign({ seed: (params && params.get('seed')) || 'ember-quill-42', name: 'Vorthax', breed: 'red' });
      st.flags.test = true;
      const preset = params && params.get('preset'); if (preset && HB.presets) HB.presets.apply(st, preset);
      HB.world.reveal(st, st.world.home.x, st.world.home.y, +(params && params.get('reveal')) || 30);
      return st;
    }
    buildHud() {
      const ui = this.ui; ui.clear();
      const b = (x, w, label, fn, tip) => ui.add(new HB.ui.Button({ x, y: 664, w, h: 40, label, onClick: fn, tooltip: tip }));
      b(16, 110, 'Back', () => this.back());
      b(134, 140, this.over ? 'Close up' : 'Overview', () => { this.over = !this.over; this.cam.tdist = this.over ? D_OVER : 18; this.buildHud(); }, 'A high view of the whole world, with far less detail');
      b(282, 56, '⟲', () => { this.cam.theading = (this.cam.theading !== undefined && this.cam.theading !== null ? this.cam.theading : this.cam.heading) + Math.PI / 4; }, 'Turn the parchment');
      b(346, 56, '⟳', () => { this.cam.theading = (this.cam.theading !== undefined && this.cam.theading !== null ? this.cam.theading : this.cam.heading) - Math.PI / 4; }, 'Turn the parchment');
      b(410, 96, 'North', () => { this.cam.theading = Math.round(this.cam.heading / (2 * Math.PI)) * 2 * Math.PI; });
      b(514, 160, 'Tilt: ' + TILTS[this.tilt].name, () => { this.tilt = (this.tilt + 1) % TILTS.length; this.buildHud(); }, 'How steeply you look at the paper');
      b(682, 150, this.flat ? 'Symbols: flat' : 'Symbols: standing', () => { this.flat = !this.flat; this.buildHud(); }, 'Standing sprites, or painted flat on the paper as on today\'s map');
      b(840, 110, this.fog ? 'Fog: on' : 'Fog: off', () => { this.fog = !this.fog; this.buildHud(); }, 'Show the whole world');
      b(958, 56, '+', () => { this.cam.tdist = HB.clamp((this.cam.tdist || this.cam.dist) / 1.4, D_MIN, D_MAX); this.over = false; });
      b(1022, 56, '−', () => { this.cam.tdist = HB.clamp((this.cam.tdist || this.cam.dist) * 1.4, D_MIN, D_MAX); });
    }
    /** back where it was opened from (Settings), or to the title when opened from the address */
    back() { if (HB.scenes.stack.length > 1) HB.scenes.pop(this); else HB.scenes.replace(new HB.TitleScene()); }
    // ---------- camera
    pitch(D) {
      const T = TILTS[this.tilt];
      if (D <= D_MAX) { const t = Math.pow(HB.clamp((D - D_MIN) / (D_MAX - D_MIN), 0, 1), 0.8); return rad(T.near + (T.far - T.near) * t); }
      return rad(T.far + (10 - T.far) * HB.clamp((D - D_MAX) / (D_OVER - D_MAX), 0, 1));
    }
    view() {
      const c = this.cam, D = c.dist, ph = this.pitch(D), g = [Math.sin(c.heading), -Math.cos(c.heading)];
      const C = [c.x - g[0] * D * Math.sin(ph), c.y - g[1] * D * Math.sin(ph), D * Math.cos(ph)];
      const f = [g[0] * Math.sin(ph), g[1] * Math.sin(ph), -Math.cos(ph)], r = [-g[1], g[0], 0], u = cross(f, r);
      const F = (HB.H / 2) / Math.tan(FOV / 2);
      return { C, f, r, u, F, D, ph };
    }
    project(V, x, y, z = 0) {
      const v = [x - V.C[0], y - V.C[1], z - V.C[2]], zc = dot(v, V.f); if (zc < 0.5) return null;
      return { x: HB.W / 2 + V.F * dot(v, V.r) / zc, y: HB.H * CY - V.F * dot(v, V.u) / zc, z: zc, s: V.F / zc };
    }
    /** the ground point under a screen point (null above the horizon) */
    unproject(V, sx, sy) {
      const a = (sx - HB.W / 2) / V.F, b = (sy - HB.H * CY) / V.F, d = [V.f[0] + V.r[0] * a - V.u[0] * b, V.f[1] + V.r[1] * a - V.u[1] * b, V.f[2] + V.r[2] * a - V.u[2] * b];
      if (d[2] >= -1e-4) return null; const t = -V.C[2] / d[2]; return [V.C[0] + d[0] * t, V.C[1] + d[1] * t];
    }
    // ---------- chunks: the live map's ground drawing, its standing symbols recorded instead of drawn
    renderGround(cx, cy, lod, baked) {
      const A = HB.mapart, Gd = HB.MapScene.GRID, cp = lod === 0 ? Gd.CELL : Gd.LOD1_CELL, x0 = cx * Gd.CHUNK - Gd.MARGIN, y0 = cy * Gd.CHUNK - Gd.MARGIN, k = Gd.CELL / cp, saved = {}, recs = [];
      if (!baked) {
        for (const n of STAND) { saved[n] = A[n]; A[n] = function (ctx, x, y, a, b, rng, o) { const tree = n.startsWith('tree'); recs.push({ n, x: x0 + x / cp, y: y0 + y / cp, w: a * k, h: tree ? 0 : b * k, opts: tree ? null : (n === 'hill' ? null : o), key: tree ? arguments[5] : n === 'hill' ? o : (o && o.key), tone: A.tone }); }; }
        for (const n of QUIET) { saved[n] = A[n]; A[n] = () => {}; }
      }
      let c; try { this.helper.cam.zoom = lod === 0 ? 2 : 1; c = this.helper.renderChunk(cx, cy, lod); } finally { for (const n in saved) A[n] = saved[n]; }
      // the chunk's core (no margin), scaled into a power-of-two texture for mipmaps
      const m = Gd.MARGIN * cp * c.rasterScale, core = Gd.CHUNK * cp * c.rasterScale, size = lod === 0 ? 512 : 128;
      const pc = document.createElement('canvas'); pc.width = pc.height = size; const pg = pc.getContext('2d'); pg.imageSmoothingEnabled = true; pg.imageSmoothingQuality = 'high'; pg.drawImage(c, m, m, core, core, 0, 0, size, size);
      return { tex: this.G ? texFrom(this.G, pc, false) : null, recs, lod };
    }
    chunk(cx, cy, lod, baked, budget) {
      const key = `${baked ? 1 : 0}:${lod}:${cx},${cy}`; let e = this.chunks.get(key);
      if (e) { const i = this.order.indexOf(key); if (i >= 0) { this.order.splice(i, 1); this.order.push(key); } return e; }
      if (performance.now() > budget.until) return null;
      e = this.renderGround(cx, cy, lod, baked); this.chunks.set(key, e); this.order.push(key);
      while (this.order.length > 140) { const k = this.order.shift(), old = this.chunks.get(k); if (old && old.tex) this.G.gl.deleteTexture(old.tex); this.chunks.delete(k); }
      return e;
    }
    chunkRevealed(cx, cy) {
      const W = this.state.world, K = this.state.know.revealed, Gd = HB.MapScene.GRID;
      for (let y = cy * Gd.CHUNK; y < Math.min(W.h, (cy + 1) * Gd.CHUNK); y++) for (let x = cx * Gd.CHUNK; x < Math.min(W.w, (cx + 1) * Gd.CHUNK); x++) if (K[y * W.w + x]) return true;
      return false;
    }
    uploadFog() {
      const gl = this.G.gl, W = this.state.world, K = this.state.know, a = new Uint8Array(W.w * W.h);
      for (let i = 0; i < a.length; i++) a[i] = K.revealed[i] ? 255 : K.rumor && K.rumor[i] ? 50 : 0;
      gl.bindTexture(gl.TEXTURE_2D, this.fogTex); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, W.w, W.h, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, a);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    /** hidden cells beside revealed land: clouds stand there */
    fogEdges() {
      const W = this.state.world, K = this.state.know.revealed, out = [];
      for (let y = 1; y < W.h - 1; y += 1) for (let x = 1; x < W.w - 1; x += 1) {
        const i = y * W.w + x; if (K[i]) continue;
        if (K[i - 1] || K[i + 1] || K[i - W.w] || K[i + W.w]) { const h = HB.hash32('c' + i); if ((h & 3) !== 0) out.push({ x: x + 0.5 + ((h >> 4) & 15) / 30 - 0.25, y: y + 0.5 + ((h >> 8) & 15) / 30 - 0.25, v: (h >> 12) % 4, r: 0.75 + ((h >> 16) & 7) / 20 }); }
      }
      return out;
    }
    // ---------- standing sprites: each kind drawn once at a fixed size and reused, scaled to each symbol
    sprite(r) {
      const A = HB.mapart, tree = r.n.startsWith('tree'), o = r.opts || {}, sig = ['snow', 'big', 'small', 'deep', 'pennant'].filter(k => o[k]).join('');
      const asp = tree ? 0 : Math.round(HB.clamp(r.h / Math.max(1, r.w), 0.2, 1.4) * 5) / 5, vi = HB.hash32(String(r.key)) % 4;
      const key = `${r.n}|${sig}|${asp}|${vi}|${r.tone || ''}`;
      let s = this.sprites.get(key); if (s) return s;
      const w = tree ? 6 : BASE, h = tree ? 0 : BASE * asp;
      const padX = tree ? w * 2.6 : w * 0.85 + 4, up = tree ? w * 4.6 : h * 1.5 + 8, down = tree ? w * 1.4 : 5;
      const c = document.createElement('canvas'); c.width = Math.ceil(padX * 2 * RES); c.height = Math.ceil((up + down) * RES);
      const g = c.getContext('2d'); g.scale(RES, RES); A.setup(g); A.lineScale = 1; A.tone = r.tone || null;
      const rng = new HB.RNG(HB.hash32(key)), k = 'b' + vi;
      try { if (tree) A[r.n](g, padX, up, w, rng, k); else if (r.n === 'hill') A.hill(g, padX, up, w, h, rng, k); else A[r.n](g, padX, up, w, h, rng, Object.assign({}, o, { key: k })); } finally { A.tone = null; }
      s = { c, ax: padX * RES, ay: up * RES, base: w }; this.sprites.set(key, s); return s;
    }
    landmarkSprite(i) {
      const key = 'legend|' + i; let s = this.sprites.get(key); if (s) return s;
      const w = 66, h = 57.2, padX = w * 0.75, up = h * 1.45, down = 6, c = document.createElement('canvas'); c.width = Math.ceil(padX * 2 * RES); c.height = Math.ceil((up + down) * RES);
      const g = c.getContext('2d'); g.scale(RES, RES); HB.mapart.setup(g); HB.mapart.lineScale = 1;
      HB.mapart.landmarkPeak(g, padX, up, w, h, new HB.RNG(HB.hash32(`${this.state.seed}:legend:${i}`)), 'legend' + i);
      s = { c, ax: padX * RES, ay: up * RES, base: w }; this.sprites.set(key, s); return s;
    }
    cloudSprite(v) {
      const key = 'cloud|' + v; let s = this.sprites.get(key); if (s) return s;
      const r = 16, c = document.createElement('canvas'); c.width = c.height = Math.ceil(r * 3.4 * RES);
      const g = c.getContext('2d'); g.scale(RES, RES); HB.mapart.setup(g); HB.mapart.cloud(g, r * 1.7, r * 1.7, r, new HB.RNG(31 + v * 7), {});
      s = { c, ax: c.width / 2, ay: c.height / 2, base: r }; this.sprites.set(key, s); return s;
    }
    // ---------- update
    update(dt) {
      this.t += dt; this.fpsT += dt; this.fpsN++; if (this.fpsT >= 0.5) { this.fps = Math.round(this.fpsN / this.fpsT); this.fpsT = 0; this.fpsN = 0; }
      const inp = HB.input, p = inp.pointer, c = this.cam;
      this.ui.update(dt);
      const overUi = this.ui.hoverWidget || this.ui.consumedPointer;
      const V = this.view();
      if (!overUi) {
        if (p.down && p.dragging && (p.dx || p.dy)) { const a = this.unproject(V, p.x - p.dx, p.y - p.dy), b = this.unproject(V, p.x, p.y); if (a && b) { c.x += a[0] - b[0]; c.y += a[1] - b[1]; } }
        if (p.wheel) { this.over = false; c.tdist = null; c.dist = HB.clamp(c.dist * Math.pow(1.15, p.wheel), D_MIN, c.dist > D_MAX ? D_OVER : D_MAX); }
        if (p.pinch) { this.over = false; c.tdist = null; c.dist = HB.clamp(c.dist / (1 + p.pinch), D_MIN, c.dist > D_MAX ? D_OVER : D_MAX); }
        if (p.twist) { c.theading = null; c.heading -= p.twist; }
      }
      const K = inp.keysDown, sp = c.dist * 0.9 * dt, g = [Math.sin(c.heading), -Math.cos(c.heading)], r = [-g[1], g[0]];
      if (K.has('KeyQ')) { c.theading = null; c.heading += dt * 1.4; } if (K.has('KeyE')) { c.theading = null; c.heading -= dt * 1.4; }
      if (inp.held('up')) { c.x += g[0] * sp; c.y += g[1] * sp; } if (inp.held('down')) { c.x -= g[0] * sp; c.y -= g[1] * sp; }
      if (inp.held('right')) { c.x += r[0] * sp; c.y += r[1] * sp; } if (inp.held('left')) { c.x -= r[0] * sp; c.y -= r[1] * sp; }
      if (inp.pressed('zoomIn')) c.tdist = HB.clamp(c.dist / 1.4, D_MIN, D_MAX); if (inp.pressed('zoomOut')) c.tdist = HB.clamp(c.dist * 1.4, D_MIN, D_MAX);
      if (inp.pressed('cancel')) this.back();
      if (c.tdist) { c.dist = HB.lerp(c.dist, c.tdist, Math.min(1, dt * 4)); if (Math.abs(c.dist - c.tdist) < 0.05) { c.dist = c.tdist; c.tdist = null; } }
      if (c.theading !== null && c.theading !== undefined) { c.heading = HB.lerp(c.heading, c.theading, Math.min(1, dt * 6)); if (Math.abs(c.heading - c.theading) < 0.002) { c.heading = c.theading; c.theading = null; } }
      const W = this.state.world; c.x = HB.clamp(c.x, 0, W.w); c.y = HB.clamp(c.y, 0, W.h);
    }
    // ---------- draw
    draw(ctx) {
      const V = this.view(), st = this.state, W = st.world, baked = this.flat || V.D > D_BAKE;
      ctx.fillStyle = '#e3d1a6'; ctx.fillRect(0, 0, HB.W, HB.H);
      if (!this.G) { HB.text.draw(ctx, 'WebGL is not available here: ' + (this.glError || ''), HB.W / 2, HB.H / 2, { size: 18, align: 'center' }); this.ui.draw(ctx); return; }
      // the view's footprint on the ground: chunks to draw
      const far = V.D * 5 + 40, pts = [];
      for (const [sx, sy] of [[0, 0], [HB.W, 0], [0, HB.H], [HB.W, HB.H], [HB.W / 2, 0]]) { const q = this.unproject(V, sx, sy); if (q && Math.hypot(q[0] - V.C[0], q[1] - V.C[1]) < far) pts.push(q); else { const a = (sx - HB.W / 2) / V.F, d = [V.f[0] + V.r[0] * a, V.f[1] + V.r[1] * a], n = Math.hypot(d[0], d[1]) || 1; pts.push([V.C[0] + d[0] / n * far, V.C[1] + d[1] / n * far]); } }
      pts.push([V.C[0], V.C[1]]);
      const Gd = HB.MapScene.GRID, CH = Gd.CHUNK;
      const cx0 = Math.max(0, Math.floor(Math.min(...pts.map(q => q[0])) / CH)), cx1 = Math.min(Math.ceil(W.w / CH) - 1, Math.floor(Math.max(...pts.map(q => q[0])) / CH));
      const cy0 = Math.max(0, Math.floor(Math.min(...pts.map(q => q[1])) / CH)), cy1 = Math.min(Math.ceil(W.h / CH) - 1, Math.floor(Math.max(...pts.map(q => q[1])) / CH));
      const budget = { until: performance.now() + 14 }, list = [];
      for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
        if (this.fog && !this.chunkRevealed(cx, cy)) continue;
        const ccx = (cx + 0.5) * CH, ccy = (cy + 0.5) * CH, pr = this.project(V, ccx, ccy); if (!pr && Math.hypot(ccx - V.C[0], ccy - V.C[1]) > CH * 1.5) continue;
        const dist = Math.hypot(ccx - V.C[0], ccy - V.C[1], V.C[2]);
        const lod = baked && V.D > D_BAKE ? 1 : dist < 34 ? 0 : 1;
        let e = this.chunk(cx, cy, lod, baked, budget);
        if (!e) e = this.chunks.get(`${baked ? 1 : 0}:${1 - lod}:${cx},${cy}`) || null;
        if (e) list.push({ cx, cy, e });
      }
      this.stats.chunks = list.length;
      // ground (WebGL), copied into the game's canvas
      const G = this.G, gl = G.gl, cw = ctx.canvas.width, chh = ctx.canvas.height;
      if (G.canvas.width !== cw || G.canvas.height !== chh) { G.canvas.width = cw; G.canvas.height = chh; }
      gl.viewport(0, 0, cw, chh); gl.clearColor(0.89, 0.82, 0.65, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      const view = [V.r[0], V.u[0], -V.f[0], 0, V.r[1], V.u[1], -V.f[1], 0, V.r[2], V.u[2], -V.f[2], 0, -dot(V.r, V.C), -dot(V.u, V.C), dot(V.f, V.C), 1];
      const shift = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -(CY - 0.5) * 2, 0, 1]; // the off-centre view point, in clip space
      const VP = mul(shift, mul(perspective(FOV, HB.W / HB.H, 0.5, V.D * 12 + 400), view));
      gl.uniformMatrix4fv(G.loc.uVP, false, new Float32Array(VP)); gl.uniform3f(G.loc.uCam, V.C[0], V.C[1], V.C[2]);
      gl.uniform2f(G.loc.uWorld, W.w, W.h); gl.uniform1f(G.loc.uFogOn, this.fog ? 1 : 0);
      const hz0 = V.D * 2.6 + 20, hz1 = V.D * 4.6 + 60; gl.uniform2f(G.loc.uHaze, hz0, hz1);
      // things far off fade into the haze with the paper
      const fade = (p) => { const d = Math.hypot(p.z, 0); const t = HB.clamp((d - hz0) / (hz1 - hz0), 0, 1); return 1 - t * t * (3 - 2 * t); };
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.paperTex); gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.fogTex); gl.activeTexture(gl.TEXTURE0);
      const quad = (x0, y0, x1, y1) => { const q = G.quad; q.set([x0, y0, 0, 0, x1, y0, 1, 0, x0, y1, 0, 1, x1, y1, 1, 1]); gl.bufferData(gl.ARRAY_BUFFER, q, gl.DYNAMIC_DRAW); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
      gl.uniform1f(G.loc.uChunk, 0); quad(-120, -120, W.w + 120, W.h + 120);
      gl.uniform1f(G.loc.uChunk, 1);
      for (const { cx, cy, e } of list) { gl.bindTexture(gl.TEXTURE_2D, e.tex); quad(cx * CH, cy * CH, (cx + 1) * CH, (cy + 1) * CH); }
      ctx.drawImage(G.canvas, 0, 0, HB.W, HB.H);
      // standing things, far to near
      const items = [], K = st.know.revealed, seen = (x, y) => !this.fog || K[(Math.floor(y)) * W.w + Math.floor(x)];
      if (!baked) for (const { e } of list) for (const r of e.recs) {
        const p = this.project(V, r.x, r.y); if (!p || p.x < -80 || p.x > HB.W + 80 || p.y < -40 || p.y > HB.H + 160) continue;
        if (!seen(r.x, r.y)) continue;
        const px = p.s / Gd.CELL * r.w; if (px < 1.6) continue; // too small to see: dropped
        const al = fade(p); if (al < 0.03) continue;
        items.push({ z: p.z, draw: () => { const s = this.sprite(r), k = p.s / Gd.CELL * (r.w / s.base) / RES; ctx.globalAlpha = al; ctx.drawImage(s.c, p.x - s.ax * k, p.y - s.ay * k, s.c.width * k, s.c.height * k); ctx.globalAlpha = 1; } });
      }
      // the legendary peaks
      if (HB.mapLegendaryPeaks) for (const L of HB.mapLegendaryPeaks(W).list) {
        if (!seen(L.x, L.y)) continue; const p = this.project(V, L.x + 0.5, L.y + 0.92); if (!p) continue;
        items.push({ z: p.z, draw: () => { const s = this.landmarkSprite(L.i), k = p.s / Gd.CELL * (66 / s.base) / RES; ctx.drawImage(s.c, p.x - s.ax * k, p.y - s.ay * k, s.c.width * k, s.c.height * k); } });
      }
      // places
      const labels = [];
      for (const L of W.locations) {
        if (!seen(L.x, L.y)) continue; const p = this.project(V, L.x + 0.5, L.y + 0.85); if (!p || p.x < -60 || p.x > HB.W + 60 || p.y < -60 || p.y > HB.H + 80) continue;
        const ts = L.type === 'farm' ? 0.75 : L.type === 'city' ? 1.15 : L.type === 'hold' || L.type === 'rivalLair' ? 1.1 : 1, sz = HB.clamp(p.s * 0.3 * ts, 2, 60);
        const minor = ['farm', 'camp', 'mine', 'shrine', 'monastery', 'ruin', 'tower'].includes(L.type);
        if (V.D > D_BAKE && minor) continue;
        const f = L.factionId >= 0 ? W.factions[L.factionId] : null;
        items.push({ z: p.z - 0.01, draw: () => { if (sz < 4) { ctx.fillStyle = HB.palette.ink; ctx.beginPath(); ctx.arc(p.x, p.y - 2, 2, 0, Math.PI * 2); ctx.fill(); return; } HB.mapart.settlement(ctx, L, p.x, p.y, sz, new HB.RNG(HB.hash32('loc' + L.id)), { flagColor: f ? f.color : undefined }); } });
        if (p.s > 17 && L.name && (!minor || p.s > 30)) labels.push({ p, text: L.type === 'lair' ? 'Your Lair' : L.name, size: HB.clamp(p.s * 0.34, 11, 17) * (minor ? 0.9 : 1), dy: sz * 0.5 + 4, al: fade(p) });
      }
      // clouds at the edge of what you know
      if (this.fog) for (const c of this.edges) {
        const p = this.project(V, c.x, c.y, 0.25); if (!p || p.x < -80 || p.x > HB.W + 80 || p.y < -80 || p.y > HB.H + 120) continue; if (p.s < 3) continue;
        items.push({ z: p.z, draw: () => { const s = this.cloudSprite(c.v), k = p.s / Gd.CELL * (22 * c.r / s.base) / RES; ctx.globalAlpha = 0.92; ctx.drawImage(s.c, p.x - s.ax * k, p.y - s.ay * k, s.c.width * k, s.c.height * k); ctx.globalAlpha = 1; } });
      }
      // the dragon, circling the lair above the paper, its shadow on it
      const H = W.home, a = this.t * 0.45, dx = H.x + 0.5 + Math.cos(a) * 2.6, dy = H.y + 0.5 + Math.sin(a) * 1.8, alt = Math.min(1.4, V.C[2] * 0.3);
      const dp = this.project(V, dx, dy, alt), sp = this.project(V, dx, dy, 0), ahead = this.project(V, H.x + 0.5 + Math.cos(a + 0.1) * 2.6, H.y + 0.5 + Math.sin(a + 0.1) * 1.8, alt);
      if (dp && sp) {
        items.push({ z: sp.z + 0.02, draw: () => { ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#2b1a0e'; ctx.beginPath(); ctx.ellipse(sp.x, sp.y, sp.s * 0.55, sp.s * 0.55 * Math.cos(V.ph), 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } });
        items.push({ z: dp.z - 0.5, draw: () => { const spec = HB.dragonArt.specOf(st), frame = Math.floor(this.t * 8) % 4, scale = dp.s / Gd.CELL * 1.05; HB.dragonArt.draw(ctx, spec, 'fly', frame, dp.x, dp.y, scale, ahead && ahead.x < dp.x ? -1 : 1); } });
      }
      items.sort((p, q) => q.z - p.z);
      for (const it of items) it.draw();
      this.stats.sprites = items.length;
      // names face you: places, then the regions from mid distance out
      // nearest first; a name that would overlap one already placed is left out
      const placed = []; labels.sort((p, q) => p.p.z - q.p.z);
      for (const l of labels) {
        if (l.al < 0.1) continue; const w = HB.text.width ? HB.text.width(ctx, l.text, { size: l.size }) : l.text.length * l.size * 0.5, x0 = l.p.x - w / 2 - 3, y0 = l.p.y + l.dy, rect = [x0, y0, w + 6, l.size + 6];
        if (placed.some(q => rect[0] < q[0] + q[2] && q[0] < rect[0] + rect[2] && rect[1] < q[1] + q[3] && q[1] < rect[1] + rect[3])) continue; placed.push(rect);
        ctx.globalAlpha = l.al; HB.text.draw(ctx, l.text, l.p.x, l.p.y + l.dy + l.size, { size: l.size, align: 'center', color: HB.palette.ink, shadow: 'rgba(242,229,196,0.85)' }); ctx.globalAlpha = 1;
      }
      for (const R of W.regions) {
        if (this.fog && !(st.know.regionSeen && st.know.regionSeen[R.id])) continue;
        const p = this.project(V, R.cx, R.cy); if (!p || p.x < -200 || p.x > HB.W + 200 || p.y < -40 || p.y > HB.H + 40) continue;
        const al = HB.clamp((V.D - 14) / 16, 0, 0.75); if (al <= 0.02) continue;
        ctx.save(); ctx.globalAlpha = al; HB.text.draw(ctx, R.name, p.x, p.y, { size: HB.clamp(p.s * 1.1, 13, 34), align: 'center', family: 'display', color: HB.palette.ink }); ctx.restore();
      }
      // the compass turns with the paper; the frame
      HB.parchment.vignette(ctx, 0, 0, HB.W, HB.H, 0.3);
      ctx.save(); ctx.translate(HB.W - 70, 92); ctx.rotate(-this.cam.heading); HB.mapart.compassRose(ctx, 0, 0, 34); ctx.restore();
      HB.parchment.border(ctx, 6, 6, HB.W - 12, HB.H - 12, { width: 2, flourish: 12 });
      HB.parchment.panel(ctx, 16, 14, 470, 64, { shadow: false, stains: false, vignette: 0.05, flourish: 0 });
      HB.text.draw(ctx, '3D map test', 30, 40, { size: 20, family: 'sc', color: HB.palette.ink });
      HB.text.draw(ctx, 'Drag to move · pinch or wheel to zoom · twist, ⟲ ⟳ or Q/E to turn', 30, 64, { size: 13, color: HB.palette.ink });
      HB.text.draw(ctx, `${this.fps} fps · ${this.stats.sprites} things · ${this.stats.chunks} tiles · distance ${V.D.toFixed(0)} · tilt ${(V.ph * 180 / Math.PI).toFixed(0)}°`, 474, 40, { size: 13, align: 'right', color: HB.palette.inkSoft || HB.palette.ink });
      this.ui.draw(ctx);
    }
  }
  HB.Map3DScene = Map3DScene;
})();

/* Pixel-art helpers and the sprite registry (with hook for PNG/JSON overrides). */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;

  const px = HB.px = {
    create(w, h) {
      const c = document.createElement('canvas');
      c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0);
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      c.ctx = ctx;
      return c;
    },
    /** Build a canvas from rows of characters. map: { char: color }, '.' or ' ' = transparent. */
    fromGrid(rows, map) {
      const h = rows.length, w = Math.max(...rows.map(r => r.length));
      const c = px.create(w, h);
      const ctx = c.ctx;
      for (let y = 0; y < h; y++) {
        const row = rows[y];
        for (let x = 0; x < row.length; x++) {
          const ch = row[x];
          if (ch === '.' || ch === ' ') continue;
          const col = map[ch];
          if (!col) continue;
          ctx.fillStyle = col;
          ctx.fillRect(x, y, 1, 1);
        }
      }
      return c;
    },
    /** 1px outline around opaque pixels, drawn onto a new canvas (1px padding). */
    outline(canvas, color = HB.px_palette.outline) {
      const w = canvas.width, h = canvas.height;
      const src = canvas.ctx.getImageData(0, 0, w, h).data;
      const out = px.create(w + 2, h + 2);
      const octx = out.ctx;
      octx.fillStyle = color;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (src[(y * w + x) * 4 + 3] > 0) continue;
        let near = false;
        for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (src[(ny * w + nx) * 4 + 3] > 0) { near = true; break; }
        }
        if (near) octx.fillRect(x + 1, y + 1, 1, 1);
      }
      octx.drawImage(canvas, 1, 1);
      return out;
    },
    flipX(canvas) {
      const c = px.create(canvas.width, canvas.height);
      c.ctx.translate(canvas.width, 0); c.ctx.scale(-1, 1); c.ctx.drawImage(canvas, 0, 0);
      c.ctx.setTransform(1, 0, 0, 1, 0, 0);
      return c;
    },
    /** recolour by exact mapping {fromHex: toHex} */
    recolor(canvas, mapping) {
      const w = canvas.width, h = canvas.height;
      const img = canvas.ctx.getImageData(0, 0, w, h);
      const d = img.data;
      const table = {};
      for (const k in mapping) { const a = hexToRgb(k), b = hexToRgb(mapping[k]); table[(a[0] << 16) | (a[1] << 8) | a[2]] = b; }
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] === 0) continue;
        const t = table[(d[i] << 16) | (d[i + 1] << 8) | d[i + 2]];
        if (t) { d[i] = t[0]; d[i + 1] = t[1]; d[i + 2] = t[2]; }
      }
      const out = px.create(w, h); out.ctx.putImageData(img, 0, 0); return out;
    },
    /** draw canvas scaled with nearest neighbour at integer-ish scale */
    blit(ctx, canvas, x, y, scale = 1, flip = false, alpha = 1) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      if (alpha !== 1) ctx.globalAlpha *= alpha;
      if (flip) { ctx.translate(x + canvas.width * scale, y); ctx.scale(-1, 1); ctx.drawImage(canvas, 0, 0, canvas.width * scale, canvas.height * scale); }
      else ctx.drawImage(canvas, x, y, canvas.width * scale, canvas.height * scale);
      ctx.restore();
    },
    hexToRgb,
    rgbToHex(r, g, b) { return '#' + [r, g, b].map(v => HB.clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join(''); },
    shade(hex, amt) { const [r, g, b] = hexToRgb(hex); return px.rgbToHex(r + amt, g + amt, b + amt); },
    mix(hexA, hexB, t) { const a = hexToRgb(hexA), b = hexToRgb(hexB); return px.rgbToHex(HB.lerp(a[0], b[0], t), HB.lerp(a[1], b[1], t), HB.lerp(a[2], b[2], t)); },
    /** draw a filled ellipse in pixel space */
    ellipse(ctx, cx, cy, rx, ry, color) {
      ctx.fillStyle = color;
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
        const dy = (y + 0.5 - cy) / ry;
        if (Math.abs(dy) > 1) continue;
        const hw = rx * Math.sqrt(1 - dy * dy);
        const x0 = Math.round(cx - hw), x1 = Math.round(cx + hw);
        if (x1 > x0) ctx.fillRect(x0, y, x1 - x0, 1);
      }
    },
    /** pixel line */
    line(ctx, x0, y0, x1, y1, color, thickness = 1) {
      ctx.fillStyle = color;
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx - dy;
      const t = Math.max(1, Math.round(thickness));
      const off = Math.floor(t / 2);
      for (; ;) {
        ctx.fillRect(x0 - off, y0 - off, t, t);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx) { err += dx; y0 += sy; }
      }
    },
    /** tapered polyline (for tails, necks) — points [{x,y,r}] */
    taper(ctx, pts, color) {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)));
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          px.ellipse(ctx, HB.lerp(a.x, b.x, t), HB.lerp(a.y, b.y, t), HB.lerp(a.r, b.r, t), HB.lerp(a.r, b.r, t), color);
        }
      }
    },
  };

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  /* Sprite registry. define(id, builder, meta) where builder(...args) returns a canvas. get(id, ...args) caches by args.
   * Every sprite is also listed in HB.art (below) so the pixel editor can redraw it; meta: { group, editable: false
   * for builders that take sizes (houses, walls, ground) }. */
  const sprites = HB.sprites = {
    defs: {},
    cache: new Map(),
    overrides: new Map(),  // id -> {image, x, y, w, h, ax, ay}
    overrideMeta: new Map(), // id -> {frames, fps} of a drawing from the pixel editor (src/art/pixelart.js)
    define(id, builder, meta = {}) {
      sprites.defs[id] = builder;
      if (meta.editable !== false) art.define(id, { kind: 'sprite', group: meta.group || 'Props', gen: () => builder() });
    },
    /** put already-defined sprites into editor groups: { People: ['villager', ...], ... } */
    groups(map) { for (const g in map) for (const id of map[g]) { const e = art.entries.get(id); if (e) e.group = g; } },
    has(id) { return !!sprites.defs[id] || sprites.overrides.has(id); },
    get(id, ...args) {
      const key = args.length ? id + '|' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join('|') : id;
      let c = sprites.cache.get(key);
      if (c) return c;
      const ov = sprites.overrides.get(key) || sprites.overrides.get(id);
      if (ov) {
        c = px.create(ov.w, ov.h);
        c.ctx.drawImage(ov.image, ov.x, ov.y, ov.w, ov.h, 0, 0, ov.w, ov.h);
        c.anchorX = ov.ax || 0; c.anchorY = ov.ay || 0;
      } else {
        const b = sprites.defs[id];
        if (!b) { c = px.create(4, 4); c.ctx.fillStyle = '#f0f'; c.ctx.fillRect(0, 0, 4, 4); }
        else c = b(...args);
      }
      if (sprites.cache.size > 4000) sprites.cache.clear();
      sprites.cache.set(key, c);
      return c;
    },
    invalidate(prefix) {
      for (const k of [...sprites.cache.keys()]) if (!prefix || k.startsWith(prefix)) sprites.cache.delete(k);
    },
    /** Load assets/sprites/manifest.json: [{ "sheet": "file.png", "atlas": "file.json" }]. Atlas: { id: {x,y,w,h,ax,ay} } */
    async loadOverrides() {
      try {
        const res = await fetch('assets/sprites/manifest.json');
        if (!res.ok) return;
        const manifest = await res.json();
        for (const entry of manifest) {
          const img = new Image();
          await new Promise((ok, fail) => { img.onload = ok; img.onerror = fail; img.src = 'assets/sprites/' + entry.sheet; });
          const atlas = await (await fetch('assets/sprites/' + entry.atlas)).json();
          for (const id in atlas) sprites.overrides.set(id, Object.assign({ image: img }, atlas[id]));
        }
        sprites.cache.clear();
      } catch (e) { /* no overrides present (also fails silently on file://) */ }
    },
  };

  /* Art registry: everything drawn in pixels that the pixel editor (editor/index.html) can redraw. Register new art
   * here (HB.sprites.define does it for sprites) and it appears in the editor by itself.
   *   define(id, { kind, group, label, frames, fps, note, framesAre, gen(k, opts) })
   * kind 'sprite': one frame, replaces the sprite id; 'dragon': dragon.<tier>.<pose>, frame k; 'anim': any other
   * picture or animation, frame k (framesAre: 'levels' when frame k is used at level k instead of in time).
   * gen(k, opts) draws the game's own frame k (a canvas; anchorX/anchorY where it is placed). */
  const art = HB.art = {
    entries: new Map(),
    define(id, o) { art.entries.set(id, Object.assign({ id, kind: 'anim', group: 'Other', label: id, frames: 1, fps: 2 }, o)); },
    list() { return [...art.entries.values()]; },
    /** how many frames and how fast: the editor drawing's if there is one, else the registered ones */
    frames(id) { const m = sprites.overrideMeta.get(id), e = art.entries.get(id); return (m && m.frames) || (e && e.frames) || 1; },
    fps(id) { const m = sprites.overrideMeta.get(id), e = art.entries.get(id); return (m && m.fps) || (e && e.fps) || 2; },
    /** frame k (wrapped) of an art id: the editor's drawing when there is one, else the generated frame.
     *  opts go to gen; optsKey must change whenever opts change the drawing (it is part of the cache key). */
    frame(id, k = 0, opts, optsKey = '', tone = null) {
      const n = art.frames(id); k = ((Math.floor(k) % n) + n) % n;
      const tm = tone && sprites.overrideMeta.get(`${id}@${tone}`); // a drawn good or evil version loops its own frames
      const ov = (tone && sprites.overrides.get(`${id}.${tm ? k % tm.frames : k}.${tone}`)) || sprites.overrides.get(`${id}.${k}`) || (k === 0 ? sprites.overrides.get(id) : null);
      const key = `art|${id}|${k}|${ov ? 'ov' + (tone || '') : optsKey}`;
      let c = sprites.cache.get(key);
      if (c) return c;
      if (ov) { c = px.create(ov.w, ov.h); c.ctx.drawImage(ov.image, ov.x, ov.y, ov.w, ov.h, 0, 0, ov.w, ov.h); c.anchorX = ov.ax || 0; c.anchorY = ov.ay || 0; }
      else { const e = art.entries.get(id); c = e && e.gen ? e.gen(Math.min(k, e.frames - 1), opts) : px.create(4, 4); }
      if (sprites.cache.size > 4000) sprites.cache.clear();
      sprites.cache.set(key, c);
      return c;
    },
    /** the frame to show at time t (seconds) */
    at(id, t, opts, optsKey, tone) { return art.frame(id, Math.floor(t * art.fps(id)), opts, optsKey, tone); },
    /** the tone drawn art takes for a dragon of this alignment (−100 cruel … 100 kind): 'evil', 'good' or null */
    toneOf(alignment) { return alignment <= -30 ? 'evil' : alignment >= 30 ? 'good' : null; },
  };
})();

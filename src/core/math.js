/* Small math and formatting helpers. */
(function () {
  const HB = globalThis.HB;
  HB.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  HB.lerp = (a, b, t) => a + (b - a) * t;
  HB.unlerp = (a, b, v) => a === b ? 0 : (v - a) / (b - a);
  HB.remap = (v, a, b, c, d) => c + (d - c) * HB.clamp((v - a) / (b - a), 0, 1);
  HB.smoothstep = (a, b, v) => { const t = HB.clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  HB.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  HB.dist2 = (x1, y1, x2, y2) => (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  HB.sign = (v) => v < 0 ? -1 : v > 0 ? 1 : 0;
  HB.round = (v, d = 0) => { const m = Math.pow(10, d); return Math.round(v * m) / m; };
  HB.mod = (a, n) => ((a % n) + n) % n;
  HB.angleLerp = (a, b, t) => { let d = HB.mod(b - a + Math.PI, Math.PI * 2) - Math.PI; return a + d * t; };
  HB.ease = {
    inOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    out: (t) => 1 - (1 - t) * (1 - t),
    in: (t) => t * t,
    outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    outElastic: (t) => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
  };
  HB.pointInRect = (px, py, x, y, w, h) => px >= x && py >= y && px < x + w && py < y + h;
  HB.rectsOverlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  HB.fmt = {
    int: (n) => Math.round(n).toLocaleString('en-US'),
    gold: (n) => Math.round(n).toLocaleString('en-US') + ' gold',
    signed: (n, d = 0) => (n > 0 ? '+' : '') + HB.round(n, d),
    pct: (n) => Math.round(n * 100) + '%',
    years: (n) => n === 1 ? '1 year' : n + ' years',
    plural: (n, s, p) => n === 1 ? `1 ${s}` : `${n} ${p || s + 's'}`,
    list: (arr) => arr.length <= 1 ? (arr[0] || '') : arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1],
    cap: (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s,
    /** 'a' or 'an' + word */
    a: (s) => (/^[aeiou]/i.test(s) ? 'an ' : 'a ') + s,
  };

  /** simple seeded-id generator for entities */
  let idCounter = 1;
  HB.nextId = (prefix) => `${prefix || 'id'}${idCounter++}`;
  HB.setIdCounter = (n) => { idCounter = n; };
  HB.getIdCounter = () => idCounter;

  /** deep clone plain data */
  HB.clone = (o) => JSON.parse(JSON.stringify(o));

  /** 2D grid helper */
  class Grid {
    constructor(w, h, Type) { this.w = w; this.h = h; this.data = Type ? new Type(w * h) : new Array(w * h).fill(0); }
    idx(x, y) { return y * this.w + x; }
    inBounds(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
    get(x, y) { return this.data[y * this.w + x]; }
    set(x, y, v) { this.data[y * this.w + x] = v; }
    fill(v) { this.data.fill(v); return this; }
  }
  HB.Grid = Grid;
})();

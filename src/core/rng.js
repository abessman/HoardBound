/* Seeded random numbers. sfc32 generator with save/restore so the "play" stream can be persisted. */
(function () {
  const HB = globalThis.HB;

  // xmur3 string hash -> 32-bit
  HB.hash32 = function (str) {
    str = String(str);
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };

  class RNG {
    constructor(seed) { this.reseed(seed === undefined ? Date.now() : seed); }
    reseed(seed) {
      let h = typeof seed === 'string' ? HB.hash32(seed) : (Number(seed) >>> 0);
      this.a = (h ^ 0x9E3779B9) >>> 0;
      this.b = (Math.imul(h, 0x85EBCA6B) ^ 0x6C078965) >>> 0;
      this.c = (h ^ 0x27D4EB2F) >>> 0;
      this.d = 1;
      for (let i = 0; i < 16; i++) this.next();
      return this;
    }
    next() {
      let a = this.a >>> 0, b = this.b >>> 0, c = this.c >>> 0, d = this.d >>> 0;
      let t = (a + b) | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      d = (d + 1) | 0;
      t = (t + d) | 0;
      c = (c + t) | 0;
      this.a = a >>> 0; this.b = b >>> 0; this.c = c >>> 0; this.d = d >>> 0;
      return (t >>> 0) / 4294967296;
    }
    /** float in [a,b) */
    range(a, b) { return a + (b - a) * this.next(); }
    /** integer in [0,n) */
    int(n) { return Math.floor(this.next() * n); }
    /** integer in [a,b] inclusive */
    between(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
    chance(p) { return this.next() < p; }
    pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
    /** weighted pick: items [{w, ...}] or weights fn */
    weighted(items, weightFn) {
      let total = 0;
      for (const it of items) total += weightFn ? weightFn(it) : it.w;
      let r = this.next() * total;
      for (const it of items) {
        r -= weightFn ? weightFn(it) : it.w;
        if (r <= 0) return it;
      }
      return items[items.length - 1];
    }
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(this.next() * (i + 1));
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    }
    /** approx normal, mean 0 sd 1 */
    gauss() {
      let u = 0, v = 0;
      while (u === 0) u = this.next();
      while (v === 0) v = this.next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    /** derive an independent child generator */
    fork(label) { return new RNG(HB.hash32(label + ':' + this.next())); }
    getState() { return [this.a, this.b, this.c, this.d]; }
    setState(s) { this.a = s[0]; this.b = s[1]; this.c = s[2]; this.d = s[3]; return this; }
  }
  HB.RNG = RNG;
})();

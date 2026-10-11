/* 2D gradient noise (Perlin-style) with fbm, seeded from an RNG. */
(function () {
  const HB = globalThis.HB;

  class Noise2D {
    constructor(rng) {
      const perm = new Uint8Array(512);
      const p = [];
      for (let i = 0; i < 256; i++) p[i] = i;
      rng.shuffle(p);
      for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
      this.perm = perm;
      // gradient directions
      this.gx = new Float32Array(256);
      this.gy = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const a = rng.next() * Math.PI * 2;
        this.gx[i] = Math.cos(a); this.gy[i] = Math.sin(a);
      }
    }
    static fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    grad(hash, x, y) { const h = hash & 255; return this.gx[h] * x + this.gy[h] * y; }
    /** returns roughly [-1,1] */
    at(x, y) {
      const X = Math.floor(x), Y = Math.floor(y);
      const xf = x - X, yf = y - Y;
      const xi = X & 255, yi = Y & 255;
      const p = this.perm;
      const aa = p[p[xi] + yi], ab = p[p[xi] + yi + 1];
      const ba = p[p[xi + 1] + yi], bb = p[p[xi + 1] + yi + 1];
      const u = Noise2D.fade(xf), v = Noise2D.fade(yf);
      const x1 = HB.lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u);
      const x2 = HB.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u);
      return HB.lerp(x1, x2, v) * 1.41;
    }
    /** fractal brownian motion, output roughly [-1,1] */
    fbm(x, y, octaves = 4, lacunarity = 2.0, gain = 0.5) {
      let amp = 1, freq = 1, sum = 0, norm = 0;
      for (let i = 0; i < octaves; i++) {
        sum += this.at(x * freq, y * freq) * amp;
        norm += amp;
        amp *= gain; freq *= lacunarity;
      }
      return sum / norm;
    }
    /** ridged noise [0,1], good for mountain ranges */
    ridged(x, y, octaves = 4) {
      let amp = 0.5, freq = 1, sum = 0;
      for (let i = 0; i < octaves; i++) {
        const n = 1 - Math.abs(this.at(x * freq, y * freq));
        sum += n * n * amp;
        amp *= 0.5; freq *= 2.1;
      }
      return sum;
    }
  }
  HB.Noise2D = Noise2D;
})();

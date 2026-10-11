/* Synthesised sound effects (WebAudio). Nothing plays until the player interacts; mute in settings. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;

  const audio = HB.audio = {
    ctx: null, enabled: true, master: null, unlocked: false, lastPlay: {},
    init() {
      audio.enabled = HB.settings.sound !== false;
      const unlock = () => { if (audio.unlocked) return; try { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; audio.ctx = new AC(); audio.master = audio.ctx.createGain(); audio.master.gain.value = HB.settings.volume || 0.6; audio.master.connect(audio.ctx.destination); audio.unlocked = true; } catch (e) { /* no audio */ } };
      window.addEventListener('pointerdown', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
    },
    setEnabled(v) { audio.enabled = v; },
    tone(freq, dur, type = 'sine', vol = 0.3, slide = 0, delay = 0) {
      if (!audio.ctx) return;
      const t0 = audio.ctx.currentTime + delay;
      const o = audio.ctx.createOscillator(), g = audio.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t0); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(audio.master); o.start(t0); o.stop(t0 + dur + 0.02);
    },
    noise(dur, vol = 0.2, lp = 1200, delay = 0) {
      if (!audio.ctx) return;
      const t0 = audio.ctx.currentTime + delay;
      const n = audio.ctx.sampleRate * dur;
      const buf = audio.ctx.createBuffer(1, n, audio.ctx.sampleRate);
      const d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const src = audio.ctx.createBufferSource(); src.buffer = buf;
      const f = audio.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp;
      const g = audio.ctx.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f); f.connect(g); g.connect(audio.master); src.start(t0);
    },
    play(name) {
      if (!audio.enabled || !audio.ctx) return;
      const now = performance.now();
      if (audio.lastPlay[name] && now - audio.lastPlay[name] < 60) return;
      audio.lastPlay[name] = now;
      switch (name) {
        case 'click': audio.tone(880, 0.05, 'square', 0.08); break;
        case 'coin': audio.tone(1320, 0.08, 'sine', 0.2); audio.tone(1760, 0.1, 'sine', 0.15, 0, 0.06); break;
        case 'fire': audio.noise(0.7, 0.3, 900); audio.tone(120, 0.5, 'sawtooth', 0.08, -60); break;
        case 'roar': audio.tone(90, 0.8, 'sawtooth', 0.25, 40); audio.noise(0.6, 0.15, 500); break;
        case 'wing': audio.noise(0.25, 0.12, 400); audio.noise(0.25, 0.1, 300, 0.3); break;
        case 'hit': audio.noise(0.12, 0.3, 2000); audio.tone(200, 0.12, 'square', 0.12, -120); break;
        case 'bell': audio.tone(1100, 0.8, 'sine', 0.15); audio.tone(1650, 0.6, 'sine', 0.08); break;
        case 'sleep': audio.tone(220, 1.2, 'sine', 0.08, -60); break;
        case 'wake': audio.tone(330, 0.3, 'triangle', 0.15, 110); audio.tone(495, 0.4, 'triangle', 0.12, 0, 0.25); break;
        case 'bad': audio.tone(160, 0.4, 'square', 0.1, -60); break;
        case 'good': audio.tone(660, 0.12, 'triangle', 0.12); audio.tone(990, 0.2, 'triangle', 0.1, 0, 0.1); break;
      }
    },
  };
})();

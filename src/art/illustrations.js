/* Pixel illustrations for card events: a small painter with sky, distance, ground and props, plus the dragon. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;
  const px = HB.px, P = HB.px_palette, S = HB.sprites;

  const PW = 360, PH = 100; // pixel canvas; scaled to fit the frame

  function sky(g, kind, t) {
    const grad = g.createLinearGradient(0, 0, 0, PH);
    if (kind === 'night') { grad.addColorStop(0, '#1a2140'); grad.addColorStop(1, '#3a3f66'); }
    else if (kind === 'dusk') { grad.addColorStop(0, '#5a4a7a'); grad.addColorStop(0.6, '#e7a56b'); grad.addColorStop(1, '#f1c98a'); }
    else if (kind === 'storm') { grad.addColorStop(0, '#3b4150'); grad.addColorStop(1, '#6f7686'); }
    else { grad.addColorStop(0, '#6fa3d2'); grad.addColorStop(1, '#c9e0ee'); }
    g.fillStyle = grad; g.fillRect(0, 0, PW, PH);
    if (kind === 'night') { g.fillStyle = P.white; const rng = new HB.RNG(9); for (let i = 0; i < 40; i++) g.fillRect(rng.int(PW), rng.int(PH * 0.6), 1, 1); px.ellipse(g, PW - 50, 18, 7, 7, '#f3efd8'); }
    if (kind === 'day') { const rng = new HB.RNG(3); for (let i = 0; i < 4; i++) { const c = S.get('cloud', 36 + rng.int(30), i); px.blit(g, c, ((rng.int(PW) + t * 3 * (1 + i * 0.2)) % (PW + 60)) - 60, 6 + rng.int(30), 1, false, 0.9); } }
    if (kind === 'storm') { const rng = new HB.RNG(5); g.fillStyle = 'rgba(30,32,45,0.6)'; for (let i = 0; i < 6; i++) px.ellipse(g, rng.int(PW), 10 + rng.int(20), 30 + rng.int(40), 12, 'rgba(40,42,58,0.8)'); g.fillStyle = 'rgba(200,210,230,0.5)'; for (let i = 0; i < 60; i++) { const x = (rng.int(PW) + t * 120) % PW, y = (rng.int(PH) + t * 200) % PH; g.fillRect(x, y, 1, 3); } if (Math.floor(t * 2) % 7 === 0) { g.fillStyle = P.white; let x = 240, y = 0; for (let k = 0; k < 8; k++) { g.fillRect(x, y, 1, 6); y += 6; x += (k % 2 ? 3 : -2); } } }
  }
  function distance(g, kind, seed = 1) {
    const m = S.get('mountainsSilhouette', PW, 50, kind === 'night' ? '#2e3450' : kind === 'storm' ? '#5a6070' : '#8a93a6', seed);
    px.blit(g, m, 0, PH - 70);
    const h = S.get('hillsSilhouette', PW, 40, kind === 'night' ? '#26352c' : kind === 'storm' ? '#4c5e48' : '#5f7f5a', seed + 1);
    px.blit(g, h, 0, PH - 48);
  }
  function ground(g, kind = 'grass', seed = 1) { px.blit(g, S.get('ground', PW, kind, seed), 0, PH - 24); }
  function dragon(g, x, y, t, pose = 'fly', scale = 1) {
    const st = HB.state; if (!st) return;
    const spec = HB.dragonArt.specOf(st);
    const f = Math.floor(t * 8) % 4;
    HB.dragonArt.draw(g, spec, pose, pose === 'fly' ? f : 0, x, y + (pose === 'fly' ? Math.sin(t * 6) * 2 : 0), scale, 1);
  }
  function people(g, ids, x, y, gap = 10) { ids.forEach((id, i) => px.blit(g, S.get(id), x + i * gap, y)); }
  function shadow(g, x, y, w) { px.ellipse(g, x, y, w, w * 0.3, 'rgba(0,0,0,0.25)'); }

  const scenes = {
    generic(g, t) { sky(g, 'day', t); distance(g, 'day', 1); ground(g, 'grass', 1); dragon(g, 180, 45, t); },
    merchant(g, t) { sky(g, 'day', t); distance(g, 'day', 2); ground(g, 'dirt', 2); px.blit(g, S.get('wagon'), 200, PH - 34); px.blit(g, S.get('horse'), 218, PH - 31); px.blit(g, S.get('villager'), 206, PH - 36); px.blit(g, S.get('chest'), 207, PH - 40); shadow(g, 140, PH - 20, 18); dragon(g, 140, 40, t); },
    patrol(g, t) { sky(g, 'day', t); distance(g, 'day', 3); ground(g, 'dirt', 3); people(g, ['guard', 'archer', 'archer', 'guard', 'archer'], 190, PH - 36, 12); px.blit(g, S.get('banner'), 250, PH - 44); for (let i = 0; i < 3; i++) px.blit(g, S.get('arrow'), 200 + i * 20, 40 + ((t * 120 + i * 30) % 60) - 40); dragon(g, 150, 30, t); },
    storm(g, t) { sky(g, 'storm', t); distance(g, 'storm', 4); ground(g, 'grass', 4); dragon(g, 170, 48, t); },
    smoke(g, t) { sky(g, 'dusk', t); distance(g, 'day', 5); ground(g, 'grass', 5); px.blit(g, S.get('house', 20, 12, 0), 250, PH - 48); for (let i = 0; i < 6; i++) px.blit(g, S.get('smoke'), 262 + Math.sin(t + i) * 3, PH - 60 - i * 9 - (t * 10 % 9), 1, false, 0.6 - i * 0.08); dragon(g, 120, 40, t); },
    flyer(g, t) { sky(g, 'day', t); distance(g, 'day', 6); px.blit(g, S.get('mountainsSilhouette', PW, 70, '#6b7386', 9), 0, PH - 70); ground(g, 'stone', 6); dragon(g, 120, 50, t); const gx = 230 + Math.sin(t * 2) * 8, gy = 30 + Math.cos(t * 3) * 4; px.ellipse(g, gx, gy, 9, 4, P.straw); px.ellipse(g, gx + 8, gy - 2, 4, 3, P.white); g.fillStyle = P.outline; g.fillRect(gx + 11, gy - 2, 2, 1); g.fillStyle = P.straw; const wf = Math.floor(t * 10) % 2; g.fillRect(gx - 12, gy - 6 + wf * 6, 10, 2); g.fillRect(gx + 2, gy - 6 + wf * 6, 10, 2); },
    pursuer(g, t) { sky(g, 'dusk', t); distance(g, 'day', 7); ground(g, 'grass', 7); for (let i = 0; i < 3; i++) { px.blit(g, S.get('horse'), 200 + i * 24 - (t * 20 % 10), PH - 31); px.blit(g, S.get('knight'), 203 + i * 24 - (t * 20 % 10), PH - 40); } dragon(g, 110, 35, t); shadow(g, 110, PH - 22, 16); },
    shelter(g, t) { sky(g, 'dusk', t); distance(g, 'day', 8); ground(g, 'stone', 8); g.fillStyle = P.stone; g.fillRect(200, PH - 70, 140, 50); g.fillStyle = P.outline; g.fillRect(200, PH - 70, 140, 2); px.ellipse(g, 250, PH - 30, 26, 14, P.outline); dragon(g, 250, PH - 36, t, 'land', 0.9); },
    flock(g, t) { sky(g, 'day', t); distance(g, 'day', 9); ground(g, 'grass', 9); for (let i = 0; i < 6; i++) px.blit(g, S.get('sheep'), 190 + i * 16 + (i % 2) * 4 + (t * 15 % 6), PH - 30 + (i % 3) * 2); px.blit(g, S.get('villager2'), 290 + (t * 30 % 20), PH - 36); dragon(g, 130, 42, t); },
    roost(g, t) { sky(g, 'night', t); distance(g, 'night', 10); ground(g, 'grass', 10); dragon(g, 180, PH - 30, t, 'sleep', 1); px.blit(g, S.get('smoke'), 200, PH - 48 - (t * 8 % 12), 1, false, 0.4); },
    home(g, t) { g.fillStyle = '#2a1c22'; g.fillRect(0, 0, PW, PH); g.fillStyle = P.dark; for (let i = 0; i < 20; i++) g.fillRect(i * 20, 0, 12, 10 + (i % 3) * 6); ground(g, 'stone', 11); px.blit(g, S.get('coins'), 150, PH - 30, 2); dragon(g, 200, PH - 32, t, 'idle', 1); },
    raidDone(g, t) { sky(g, 'dusk', t); distance(g, 'day', 12); ground(g, 'grass', 12); dragon(g, 200, 40, t); px.blit(g, S.get('coins'), 60, PH - 30); },
    hunters(g, t) { sky(g, 'night', t); distance(g, 'night', 13); ground(g, 'grass', 13); people(g, ['hero', 'knight', 'archer', 'archer'], 220, PH - 36, 14); px.blit(g, S.get('lantern'), 212, PH - 42); px.blit(g, S.get('bannerBlue'), 270, PH - 44); },
    thieves(g, t) { g.fillStyle = '#1a1420'; g.fillRect(0, 0, PW, PH); ground(g, 'stone', 14); px.blit(g, S.get('villager'), 200, PH - 36); px.blit(g, S.get('villager2'), 214, PH - 36); px.blit(g, S.get('lantern'), 196, PH - 40); px.blit(g, S.get('coins'), 120, PH - 30, 2); dragon(g, 90, PH - 32, t, 'sleep', 1); },
    keeper(g, t) { g.fillStyle = '#2a1c22'; g.fillRect(0, 0, PW, PH); ground(g, 'stone', 15); px.blit(g, S.get('child'), 240, PH - 32); px.blit(g, S.get('lantern'), 250, PH - 36); px.blit(g, S.get('coins'), 150, PH - 30, 2); dragon(g, 110, PH - 32, t, 'sleep', 1); },
    petition(g, t) { sky(g, 'day', t); distance(g, 'day', 16); ground(g, 'dirt', 16); people(g, ['noble', 'guard', 'priest'], 230, PH - 36, 14); px.blit(g, S.get('chest'), 212, PH - 32); dragon(g, 120, PH - 32, t, 'idle', 1); },
    ransom(g, t) { sky(g, 'dusk', t); distance(g, 'day', 17); ground(g, 'dirt', 17); people(g, ['knight', 'noble', 'guard'], 240, PH - 36, 14); px.blit(g, S.get('chest'), 222, PH - 32); px.blit(g, S.get('noble'), 150, PH - 36); dragon(g, 100, PH - 32, t, 'idle', 1); },
    war(g, t) { sky(g, 'dusk', t); distance(g, 'day', 18); ground(g, 'grass', 18); people(g, ['knight', 'guard', 'archer', 'guard'], 180, PH - 36, 11); people(g, ['guard', 'knight', 'archer'], 260, PH - 36, 11); px.blit(g, S.get('banner'), 170, PH - 44); px.blit(g, S.get('bannerBlue'), 300, PH - 44); px.blit(g, S.get('corpse'), 225, PH - 30); },
    monastery(g, t) { sky(g, 'day', t); distance(g, 'day', 19); ground(g, 'grass', 19); px.blit(g, S.get('house', 40, 20, 1), 220, PH - 54); px.blit(g, S.get('towerSeg', 14, 40, 0), 206, PH - 76); people(g, ['priest', 'priest'], 262, PH - 36, 12); dragon(g, 120, 40, t); },
    ruin(g, t) { sky(g, 'dusk', t); distance(g, 'day', 20); ground(g, 'stone', 20); g.fillStyle = P.stone; g.fillRect(210, PH - 60, 8, 36); g.fillRect(240, PH - 48, 8, 24); g.fillRect(270, PH - 66, 8, 42); g.fillStyle = P.outline; g.fillRect(206, PH - 62, 16, 3); g.fillRect(266, PH - 68, 16, 3); px.blit(g, S.get('skull'), 250, PH - 28); px.blit(g, S.get('chest'), 228, PH - 32); dragon(g, 130, 44, t); },
    sleep(g, t) { g.fillStyle = '#1a1420'; g.fillRect(0, 0, PW, PH); ground(g, 'stone', 21); px.blit(g, S.get('coins'), 130, PH - 30, 2); px.blit(g, S.get('coins'), 200, PH - 28, 2); dragon(g, 170, PH - 32, t, 'sleep', 1); for (let i = 0; i < 3; i++) { const k = (t * 0.4 + i * 0.33) % 1; g.fillStyle = `rgba(230,220,200,${0.6 - k * 0.6})`; g.fillRect(205 + k * 10, PH - 48 - k * 24, 2, 2); } },
    awaken(g, t) { sky(g, 'day', t); distance(g, 'day', 22); ground(g, 'grass', 22); dragon(g, 180, PH - 32, t, 'roar', 1); },
    defeat(g, t) { sky(g, 'dusk', t); distance(g, 'day', 23); ground(g, 'dirt', 23); dragon(g, 180, PH - 30, t, 'hurt', 1); px.blit(g, S.get('arrow'), 170, PH - 34); },
  };

  HB.illustrations = {
    draw(ctx, kind, x, y, w, h, t, data) {
      const key = 'illu:' + kind;
      let c = HB.sprites.cache.get(key);
      if (!c) { c = px.create(PW, PH); HB.sprites.cache.set(key, c); }
      const g = c.ctx; g.clearRect(0, 0, PW, PH);
      (scenes[kind] || scenes.generic)(g, t, data);
      ctx.save(); ctx.imageSmoothingEnabled = false;
      const s = Math.max(w / PW, h / PH);
      ctx.drawImage(c, x + (w - PW * s) / 2, y + (h - PH * s) / 2, PW * s, PH * s);
      ctx.restore();
    },
    kinds: Object.keys(scenes),
  };
})();

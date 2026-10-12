/* Fine native ink details for the Illuminated pack. PNGs carry the illustrations; these small, dynamic
 * marks retain faction colours, readable alerts, seeded terrain details and state-specific damage.
 * Nothing in this file writes campaign state or consumes the campaign/placement RNG. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;
  const ink = '#493522', paper = '#f0e3c3';
  const nativeIds = [
    'map.terrain.grass', 'map.terrain.swamp', 'map.terrain.dune', 'map.terrain.snow', 'map.terrain.wave',
    'map.terrain.field', 'map.terrain.ash', 'map.terrain.blossom',
    ...['protected', 'allied', 'tributary', 'occupied'].map(s => 'map.marker.pennant.' + s),
    'map.marker.crossedSwords', 'map.marker.threat', 'map.marker.rumor',
    'map.marker.seal.story', 'map.marker.seal.story.locked', 'map.marker.seal.shadow', 'map.marker.seal.crystal',
    'map.fog.cloud', 'map.fog.cloud.storm', 'map.fog.lightning', 'map.decoration.compass',
  ];
  const supported = new Set(nativeIds), treatments = new WeakMap();
  const line = (g, pts, close = false, fill = false) => {
    g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
    if (close) g.closePath(); if (fill) g.fill(); g.stroke();
  };
  function letter(g, str, size, y, scale, color) {
    g.font = `${Math.max(13, size * scale) / scale}px ${HB.text.families.sc}`; g.textAlign = 'center'; g.fillStyle = color; g.fillText(str, 0, y);
  }
  function flag(g, col, mark) {
    g.strokeStyle = ink; g.fillStyle = col || '#a58c41';
    line(g, [[0, 0], [0.03, -2.05]]);
    g.beginPath(); g.moveTo(.03, -2.05); g.bezierCurveTo(.45, -2.2, .7, -1.75, 1.24, -1.96);
    g.lineTo(.99, -1.6); g.lineTo(1.23, -1.34); g.bezierCurveTo(.65, -1.17, .45, -1.68, .02, -1.49); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(240,227,195,.45)'; line(g, [[.15, -1.91], [.49, -1.83], [.83, -1.72]]);
    if (mark) { g.fillStyle = '#efe0a3'; g.beginPath(); g.ellipse(.43, -1.73, .13, mark === 'eye' ? .07 : .13, 0, 0, Math.PI * 2); g.fill(); }
  }
  function swords(g) {
    g.strokeStyle = '#85412c'; g.fillStyle = '#eadfc7';
    for (const sign of [-1, 1]) {
      g.save(); g.rotate(sign * .72);
      line(g, [[-.075, .42], [-.075, -.7], [0, -1.03], [.075, -.7], [.075, .42]], true, true);
      line(g, [[-.29, .48], [.28, .48]]); line(g, [[0, .5], [0, .9]]);
      g.beginPath(); g.arc(0, .94, .07, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
    }
  }
  const I = HB.mapInk = {
    nativeIds,
    enabled() { return !!(HB.mapAssets && HB.mapAssets.packStyle && HB.mapAssets.packStyle.inkFinish); },
    supports(id) { return supported.has(id); },
    draw(g, ids, x, y, s, o = {}) {
      if (!I.enabled()) return null;
      const id = ids.find(v => supported.has(v)); if (!id) return null;
      const rng = new HB.RNG(HB.hash32('ink:' + id + ':' + (o.key || '')));
      g.save(); g.translate(x, y); g.scale(s, s);
      g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = Math.max(.065, .55 / s);
      g.strokeStyle = ink; g.fillStyle = paper;
      if (id.startsWith('map.marker.pennant.')) {
        const colours = { protected: '#a8a25d', allied: '#8d9d64', tributary: '#b49554', occupied: '#914b37' };
        flag(g, o.tint || colours[id.split('.').pop()], o.mark || (id.endsWith('occupied') ? 'eye' : 'sun'));
      } else if (id === 'map.marker.crossedSwords' || id === 'map.marker.threat') swords(g);
      else if (id === 'map.marker.rumor') {
        g.globalAlpha *= .8; g.setLineDash([.14, .24]); g.beginPath(); g.ellipse(0, -.58, .8, .87, -.1, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
        letter(g, '?', 1.3, -.04, s, ink);
      } else if (id.startsWith('map.marker.seal.')) {
        const shadow = id.endsWith('shadow'), crystal = id.endsWith('crystal');
        g.fillStyle = shadow ? '#5f4569' : crystal ? '#5d7953' : '#983f29';
        const pts = []; for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, r = k % 2 ? .88 : .98; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
        line(g, pts, true, true); g.strokeStyle = 'rgba(245,228,190,.4)'; g.beginPath(); g.arc(0, 0, .7, 0, Math.PI * 2); g.stroke(); g.fillStyle = '#f5e6c2';
        if (crystal) line(g, [[0, -.52], [.28, -.12], [.16, .48], [-.16, .48], [-.28, -.12]], true, true);
        else if (shadow) line(g, [[-.37, .45], [-.3, -.26], [-.15, -.12], [0, -.53], [.15, -.12], [.3, -.26], [.37, .45]], true, true);
        else letter(g, id.endsWith('locked') ? '?' : '!', 1.3, .43, s, '#f5e6c2');
      } else if (id.startsWith('map.fog.cloud')) {
        const c = o.cloud || {}, storm = id.endsWith('storm');
        g.globalAlpha *= c.alpha === undefined ? .55 : c.alpha;
        g.fillStyle = c.fill || (storm ? '#b5a489' : '#eee3c9'); g.strokeStyle = storm ? 'rgba(74,56,42,.7)' : 'rgba(99,79,54,.37)';
        // Long, irregular scroll-like cloud banks, rather than repeated outlined bubbles.
        const k = rng.range(.88, 1.1);
        g.beginPath(); g.moveTo(-1.25, .25); g.bezierCurveTo(-1.58, -.13, -1.16, -.51, -.86, -.37);
        g.bezierCurveTo(-.95, -.91 * k, -.28, -1.04 * k, -.05, -.64);
        g.bezierCurveTo(.21, -.92, .77, -.7, .72, -.34); g.bezierCurveTo(1.25, -.47, 1.48, -.05, 1.17, .26);
        g.bezierCurveTo(.92, .69, .37, .45, .03, .59); g.bezierCurveTo(-.42, .77, -.71, .42, -1.05, .49); g.closePath(); g.fill();
        if (c.outline !== false) g.stroke();
        g.globalAlpha *= .45; g.beginPath(); g.moveTo(-.83, .21); g.bezierCurveTo(-.45, .02, -.2, .44, .18, .27); g.bezierCurveTo(.45, .1, .6, .28, .9, .17); g.stroke();
      } else if (id === 'map.fog.lightning') {
        g.strokeStyle = '#75634f'; g.fillStyle = '#eee2ba'; line(g, [[.12, 0], [-.39, .88], [-.02, .76], [-.24, 1.55], [.57, .48], [.19, .62]], true, true);
      } else if (id === 'map.decoration.compass') {
        g.strokeStyle = '#65513c'; g.lineWidth = .018;
        for (const r of [.91, 1]) { g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); }
        for (let k = 0; k < 8; k++) { g.save(); g.rotate(k * Math.PI / 4); const len = k % 2 ? .58 : .88; g.fillStyle = k % 2 ? '#a38b61' : '#55402a'; line(g, [[0, -len], [.11, -.11], [0, 0], [-.11, -.11]], true, true); g.restore(); }
        g.fillStyle = paper; g.beginPath(); g.arc(0, 0, .095, 0, Math.PI * 2); g.fill(); g.stroke();
        letter(g, 'N', .36, -1.19, s, ink);
      } else if (id === 'map.terrain.field') {
        g.rotate(-.13); g.fillStyle = 'rgba(167,149,66,.17)';
        line(g, [[-.99,-.5],[1,-.43],[.91,.5],[-1,.43]], true, true);
        g.strokeStyle = 'rgba(99,105,48,.7)'; for(let j=0;j<5;j++) line(g,[[-.8,-.31+j*.16],[.77,-.27+j*.16]]);
      } else if (id === 'map.terrain.wave' || id === 'map.terrain.dune') {
        g.strokeStyle = id.endsWith('wave') ? 'rgba(77,112,130,.6)' : 'rgba(119,91,52,.66)';
        g.beginPath(); g.moveTo(id.endsWith('wave') ? 0 : -1, 0); g.bezierCurveTo(.18,-.32,.43,-.33,.56,-.06); g.bezierCurveTo(.76,.14,.92,-.06,1,0); g.stroke();
        g.globalAlpha *= .45; line(g, [[.35,.18],[.7,.23],[.88,.2]]);
      } else if (id === 'map.terrain.snow' || id === 'map.terrain.ash') {
        g.strokeStyle = id.endsWith('ash') ? 'rgba(75,53,40,.65)' : 'rgba(114,126,125,.42)';
        for(let k=0;k<5;k++){const xx=rng.range(-1,1), yy=rng.range(-.5,.5);line(g,[[xx,yy],[xx+.13,yy-.06]]);}
      } else if (id === 'map.terrain.blossom') {
        g.fillStyle = '#b49b46'; for(let k=0;k<5;k++){const a=k*Math.PI*.4;g.beginPath();g.ellipse(Math.cos(a)*.12,Math.sin(a)*.12,.08,.045,a,0,Math.PI*2);g.fill();}
      } else {
        const marsh = id.endsWith('swamp'); g.strokeStyle = marsh ? '#7f7c4e' : '#808053';
        for(let k=0;k<(marsh?5:3);k++){const xx=(k-1)*.31;g.beginPath();g.moveTo(xx,0);g.quadraticCurveTo(xx+(k%2?.2:-.2),-.55,xx+(k%2?.3:-.32),-.88-rng.next()*.25);g.stroke();if(marsh){g.fillStyle='#72563c';g.fillRect(xx-.035,-.86,.07,.23);}}
        if(marsh){g.strokeStyle='rgba(78,109,119,.5)';line(g,[[-1,.19],[-.5,.24],[.18,.18],[.95,.2]]);}
      }
      g.restore(); return { id, native: true };
    },
    /** Rendering states reuse their exact building art and anchor, with missing roofs and char rather than a
     * pristine building under smoke. Cached per source frame; no extra PNG downloads per state. */
    treat(v, tint) {
      let cache = treatments.get(v.img); if (!cache) { cache = new Map(); treatments.set(v.img, cache); }
      const key = v.rect.join(',') + ':' + v.treatment + ':' + (tint || '');
      if (cache.has(key)) return cache.get(key);
      const c = document.createElement('canvas'); c.width = v.sw; c.height = v.sh; const g = c.getContext('2d');
      g.drawImage(v.img, ...v.rect, 0, 0, v.sw, v.sh);
      const damage = v.treatment === 'burned' || v.treatment === 'ruin' || v.treatment === 'spent';
      if (damage) {
        g.globalCompositeOperation = 'destination-in'; g.fillStyle = '#000'; g.beginPath();
        g.moveTo(0, v.sh); g.lineTo(0,v.sh*.46);
        for(let k=0;k<=18;k++)g.lineTo(v.sw*k/18,v.sh*(.31+((k*7)%5)*.035));
        g.lineTo(v.sw,v.sh); g.closePath();g.fill();
      }
      if (v.treatment === 'spent') { g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.fillRect(v.sw*.45,v.sh*.36,v.sw*.12,v.sh*.37); }
      if (tint || damage || v.treatment === 'dark' || v.treatment === 'deep') {
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = tint || (v.treatment === 'burned' ? '#443a33' : v.treatment === 'ruin' ? '#ada58b' : '#403329');
        g.globalAlpha = tint ? .34 : v.treatment === 'burned' ? .62 : .32; g.fillRect(0,0,c.width,c.height);
      }
      if(cache.size>=24)cache.delete(cache.keys().next().value);cache.set(key,c);return c;
    },
    smoke(g, x, y, s) {
      g.save(); g.strokeStyle='rgba(70,55,41,.42)'; g.lineWidth=Math.max(.6,s*.035);
      for(let k=0;k<3;k++){const xx=x+(k-1)*s*.55;g.beginPath();g.moveTo(xx,y-s*.7);g.bezierCurveTo(xx-s*.4,y-s*1.2,xx+s*.6,y-s*1.5,xx+s*.1,y-s*2.1);g.stroke();}
      g.restore();
    },
    decorate(g, decor, x, y, s, o) {
      g.save();g.translate(x,y);g.scale(s,s);g.lineWidth=.075;g.strokeStyle=ink;g.fillStyle=paper;
      if(decor==='army'){g.translate(.18,-.62);g.scale(.64,.64);flag(g,o.tint||'#8f4a36');}
      else if(decor==='rich'){g.fillStyle=o.tint||'#795c85';line(g,[[-.25,-.95],[.25,-.95],[.25,-.38],[0,-.25],[-.25,-.38]],true,true);g.fillStyle='#dbc06a';g.beginPath();g.arc(0,-.58,.08,0,Math.PI*2);g.fill();}
      else if(decor==='fields'){g.restore();I.draw(g,['map.terrain.field'],x-s*2.1,y+s*.3,s*.62);I.draw(g,['map.terrain.field'],x+s*2.1,y+s*.3,s*.62);return;}
      else if(decor==='rubble'){g.fillStyle='#c8b897';for(let k=0;k<5;k++){const xx=-1+k*.46;line(g,[[xx,0],[xx+.08,-.15],[xx+.28,-.12],[xx+.34,.03]],true,true);}}
      else if(decor==='military'){g.translate(1.05,-.4);g.scale(.52,.52);flag(g,o.tint||'#8c543b');}
      else if(decor==='hunter'){line(g,[[1,-.2],[1.25,-1],[1.5,-.2]]);line(g,[[1,-.2],[1.5,-.2]]);}
      else if(decor==='bandit'){g.translate(1,-.36);g.scale(.32,.32);swords(g);}
      else if(decor==='goblin'){for(let k=0;k<5;k++)line(g,[[-1.3+k*.6,.05],[-1.26+k*.6,-.5]]);}
      g.restore();
    },
  };
})();

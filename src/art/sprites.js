/* Hand-authored pixel sprites for scenes and illustrations (people, animals, props). Palette-indexed grids. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;
  const px = HB.px, S = HB.sprites, P = HB.px_palette;

  const base = { o: P.outline, k: P.skin, K: P.skinDark, h: P.hair, H: P.hairLight, c: P.cloth, C: P.clothBlue, g: P.clothGreen, y: P.clothYellow, p: P.clothPurple, i: P.iron, I: P.ironLight, d: P.ironDark, w: P.wood, W: P.woodLight, v: P.woodHi, s: P.stone, S: P.stoneLight, t: P.straw, G: P.gold, Y: P.goldLight, D: P.goldDark, r: P.gemRed, b: P.gem, e: P.gemGreen, f: P.fire, F: P.fireHot, x: P.white, n: P.night, m: P.smoke, q: P.blood, l: P.leaf, L: P.leafLight, u: P.dirt, U: P.dirtLight, a: P.sand, z: P.grassDark, Z: P.grassLight };

  const grid = (rows, extra) => px.fromGrid(rows, Object.assign({}, base, extra || {}));
  const def = (id, rows, extra) => S.define(id, () => grid(rows, extra));

  // ---- people (8 wide x 12 tall, facing right)
  def('villager', [
    '..ooo...',
    '.ohhho..',
    '.okkko..',
    '.okKko..',
    '..ccc...',
    '.occco..',
    'okcccko.',
    '.occco..',
    '..ccc...',
    '..c.c...',
    '..u.u...',
    '..o.o...',
  ]);
  // an outlaw: dark hood, mask, a blade in hand
  def('bandit', [
    '..ooo...',
    '.onnno..',
    '.onkko..',
    '.ommmo..',
    '..ddd...',
    '.odddo.I',
    'okdddkoI',
    '.ouduo.o',
    '..ddd...',
    '..d.d...',
    '..u.u...',
    '..o.o...',
  ]);
  def('villager2', [
    '..ooo...',
    '.oHHHo..',
    '.okkko..',
    '.okKko..',
    '..ggg...',
    '.ogggo..',
    'okgggko.',
    '.ogggo..',
    '..ggg...',
    '..g.g...',
    '..u.u...',
    '..o.o...',
  ]);
  def('guard', [
    '..ooo...',
    '.oiiio..',
    '.oIkko..',
    '.okKko..',
    '..iii...',
    '.oiCio..',
    'okiiik.o',
    '.oiCio.o',
    '..iii..o',
    '..i.i..o',
    '..d.d..o',
    '..o.o...',
  ]);
  def('archer', [
    '..ooo...',
    '.ogggo..',
    '.okkko..',
    '.okKko..',
    '..ggg.o.',
    '.ogggow.',
    'okgggkw.',
    '.oggg.w.',
    '..ggg.o.',
    '..g.g...',
    '..u.u...',
    '..o.o...',
  ]);
  def('knight', [
    '..ooo...',
    '.oIIIo..',
    '.oIdIo..',
    '.oIIIo..',
    '..III...',
    '.oIcIo..',
    'oIIIIIoo',
    '.oIcIo.I',
    '..III..o',
    '..I.I...',
    '..d.d...',
    '..o.o...',
  ]);
  def('noble', [
    '..oGo...',
    '.ohhho..',
    '.okkko..',
    '.okKko..',
    '..ppp...',
    '.opppo..',
    'okpYpko.',
    '.opppo..',
    '..ppp...',
    '..p.p...',
    '..d.d...',
    '..o.o...',
  ]);
  def('hero', [
    '..ooo...',
    '.oHHHo..',
    '.okkko..',
    '.okKko..',
    '..cIc..o',
    '.ocIco.I',
    'okcIckoI',
    '.ocIco.I',
    '..ccc..o',
    '..c.c...',
    '..d.d...',
    '..o.o...',
  ]);
  def('priest', [
    '..ooo...',
    '.oxxxo..',
    '.okkko..',
    '.okKko..',
    '..xxx...',
    '.oxxxo..',
    'okxxxko.',
    '.oxxxo..',
    '..xxx...',
    '..xxx...',
    '..x.x...',
    '..o.o...',
  ]);
  def('dwarf', [
    '..ooo...',
    '.oiiio..',
    '.okkko..',
    '.oHHHo..',
    '.oHHHo..',
    '.occco..',
    'okcccko.',
    '.occco..',
    '..c.c...',
    '..o.o...',
  ]);
  def('goblin', [
    '.o..o...',
    '.oeeeo..',
    '.oeqeo..',
    '..eee...',
    '.ouuuo..',
    'oeuuueo.',
    '.ouuuo..',
    '..u.u...',
    '..o.o...',
  ], { e: '#7a9a3a' });
  // the Hollow King's warbands: grey-green skin, iron, a blade
  def('orc', [
    '..ooo...',
    '.ojjjo..',
    '.ojjjo..',
    '.ojqjo..',
    '..iii...',
    '.oiiio.I',
    'ojiiijoI',
    '.oiuio.o',
    '..ddd...',
    '..d.d...',
    '..u.u...',
    '..o.o...',
  ], { j: '#6f8a4a' });
  // the Warlord: bigger, horned, a great cleaver
  def('warlord', [
    'o........o',
    'oo.oooo.oo',
    '.ooiiiioo.',
    '..ojjjjo..',
    '..ojqjqo..',
    '..ojjjjo..',
    '...oiio..I',
    '.oiiIIiioI',
    'ojiiIIiijI',
    'ojidIIdijo',
    '.o.iiii.o.',
    '...iiii...',
    '...dd.dd..',
    '...dd.dd..',
    '...uu.uu..',
    '...oo.oo..',
  ], { j: '#5f7a3a' });
  // a warden of a sanctuary: hooded in white and green, a staff
  def('warden', [
    '..ooo..o',
    '.oLLLo.W',
    '.okkko.W',
    '.okKko.W',
    '..xxx..W',
    '.oxgxo.W',
    'okxgxkoW',
    '.oxgxo.W',
    '..xgx..W',
    '..x.x..W',
    '..u.u..W',
    '..o.o..o',
  ]);
  // a Crystal of Life on its altar stone
  def('crystal', [
    '...o...',
    '..oeo..',
    '.oeLeo.',
    '.oeLeo.',
    'oeLxLeo',
    'oeLLLeo',
    '.oeLeo.',
    '.oeeeo.',
    '..oeo..',
    '.osSso.',
    'ooooooo',
  ]);
  def('child', [
    '..ooo...',
    '.ohhho..',
    '.okkko..',
    '..ccc...',
    '.occco..',
    '..ccc...',
    '..c.c...',
    '..o.o...',
  ]);
  def('corpse', [
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
    'oooooooo',
    'okcccciuo',
    'ohccccdo',
    '.oooooo.',
  ]);
  // ---- animals
  def('sheep', [
    '..oooo..',
    '.oxxxxoo',
    'oxxxxxho',
    'oxxxxxho',
    '.oxxxxo.',
    '..o..o..',
  ]);
  def('cow', [
    '.oooooo..',
    'oUUUUUUoo',
    'oUxUUUUho',
    'oUUUUUUho',
    '.oUUUUo..',
    '..o..o...',
  ]);
  def('horse', [
    '......oo..',
    '.....oHHo.',
    '.oooooHHKo',
    'oHHHHHHHo.',
    'oHHHHHHo..',
    '.oHooHo...',
    '..o..o....',
  ]);
  // ---- props
  def('chest', [
    '.oooooo.',
    'oWWWWWWo',
    'owwGwwwo',
    'oooooooo',
    'owwwwwwo',
    'owwGwwwo',
    '.oooooo.',
  ]);
  def('chestOpen', [
    'oWWWWWWo',
    'oGYGYGYo',
    'oooooooo',
    'owwwwwwo',
    'owwGwwwo',
    '.oooooo.',
  ]);
  def('coins', [
    '...GY...',
    '.oGGYGo.',
    'oGYGGYGo',
    'oGGYGGGo',
    '.oDGGDo.',
  ]);
  def('goblet', ['.oYo.', 'oYGYo', '.oGo.', '..G..', '.oGo.']);
  def('crate', ['oooooo', 'oWwwWo', 'owWWwo', 'owWWwo', 'oWwwWo', 'oooooo']);
  def('barrel', ['.oooo.', 'owiwwo', 'owwwwo', 'oiwwio', 'owwwwo', '.oooo.']);
  def('sack', ['..oo..', '.oWWo.', 'oWttWo', 'oWttWo', '.oooo.']);
  def('banner', ['o.....', 'occcc.', 'occc..', 'occ...', 'oc....', 'o.....', 'o.....', 'o.....']);
  def('bannerBlue', ['o.....', 'oCCCC.', 'oCCC..', 'oCC...', 'oC....', 'o.....', 'o.....', 'o.....']);
  def('tent', [
    '.....o......',
    '....oWo.....',
    '...oWWWo....',
    '..oWWWWWo...',
    '.oWWWWWWWo..',
    'oWWWWoWWWWo.',
    'oooooooooooo',
  ]);
  def('tentDark', [
    '.....o......',
    '....ouo.....',
    '...ouuuo....',
    '..ouuuuuo...',
    '.ouuuuuuuo..',
    'ouuuuouuuuo.',
    'oooooooooooo',
  ]);
  def('campfire', [
    '...F...',
    '..FfF..',
    '.FffFf.',
    '.fFffF.',
    'oowwwoo',
    '.ooooo.',
  ]);
  def('wagon', [
    '..oooooooooo....',
    '.oWWWWWWWWWWo...',
    'oWWWWWWWWWWWWo..',
    'oWwwwwwwwwwwWooo',
    'owwwwwwwwwwwwo.o',
    'oooooooooooooooo',
    '.ooo.......ooo..',
    'oiiioo....oiiio.',
    'oiiio.....oiiio.',
    '.ooo.......ooo..',
  ]);
  def('wagonRich', [
    '..oooooooooo....',
    '.opppppppppppo..',
    'opppYpppppYpppo.',
    'oWwwwwwwwwwwWooo',
    'owwwwwwwwwwwwo.o',
    'oooooooooooooooo',
    '.ooo.......ooo..',
    'oiiioo....oiiio.',
    'oiiio.....oiiio.',
    '.ooo.......ooo..',
  ]);
  def('ballista', [
    '.o.........o.',
    '.oo.......oo.',
    '..ooWWWWWoo..',
    '...oWwwwWo...',
    '....oWWWo....',
    '...oowwwoo...',
    '..oiiwwwiio..',
    '..o.ooooo.o..',
  ]);
  def('arrow', ['oooI']);
  def('bolt', ['ooooooI']);
  def('smoke', ['.mm.', 'mmmm', 'mmmm', '.mm.']);
  def('hay', ['..tt..', '.tttt.', 'tttttt', 'tttttt', '.oooo.']);
  def('well', ['..oo..', '.owwo.', 'ossssо', 'osSSso', 'ossssо', 'oooooo'], { 'о': P.outline });
  def('tree', [
    '....ooo....',
    '..ooLLLoo..',
    '.oLLlLLLLo.',
    'oLlLLLlLLLo',
    'oLLLlLLLLlo',
    '.oLLLLLlLo.',
    '..ooLLLoo..',
    '....oWo....',
    '....oWo....',
    '....oWo....',
  ]);
  def('pine', [
    '....o....',
    '...oLo...',
    '..oLlLo..',
    '.oLLLLLo.',
    '..oLlLo..',
    '.oLLlLLo.',
    'oLLLLLLLo',
    '....oWo..',
    '....oWo..',
  ]);
  def('bush', ['.ooo.', 'oLLLo', 'oLlLo', '.ooo.']);
  def('rock', ['.oooo.', 'osSSso', 'osssso', '.oooo.']);
  def('gravestone', ['.ooo.', 'oSSSo', 'osSso', 'ossso', 'ooooo']);
  def('skull', ['.ooo.', 'oxxxo', 'oxoxo', '.oxo.']);
  def('lantern', ['.o.', 'oYo', 'oFo', '.o.']);
  def('key', ['oGo.', 'oGGG', 'oGo.']);
  def('book', ['oooooo', 'occcco', 'oxxxxo', 'occcco', 'oooooo']);
  def('crown', ['G.G.G', 'GYGYG', 'GGGGG']);
  def('gem', ['.b.', 'bxb', '.b.']);
  def('gemRed', ['.r.', 'rxr', '.r.']);
  def('gemGreen', ['.e.', 'exe', '.e.']);
  def('ring', ['.GG.', 'G..G', '.GG.'], {});
  def('signet', ['.Gr', 'G.G', '.G.']);
  def('sceptre', ['.Y.', 'YrY', '.G.', '.G.', '.G.', '.D.']);
  def('bell', ['..o..', '.oGo.', '.GYG.', 'oGGGo', 'ooooo', '..o..']);
  def('helm', ['.ooo.', 'oIIIo', 'oIdIo', 'oI.Io']);
  def('plate', ['.ooooo.', 'oSSSSSo', 'oSIIISo', '.ooooo.']);
  def('pearl', ['.o.', 'oxo', '.o.']);
  def('chalice', ['oYGYo', '.oGo.', '..G..', '.oGo.']);
  def('sword', ['...I', '..Io', '.Io.', 'oo..']);
  def('shield', ['ooooo', 'oiCio', 'oiCio', '.oio.', '..o..']);
  def('pick', ['..oo', '.oW.', 'oW..', 'o...']);
  def('scroll', ['ooooo', 'oxxxo', 'oxxxo', 'ooooo']);

  /** scene-building helpers: buildings are generated rather than hand-drawn so they can vary in size */
  S.define('house', (w = 24, h = 16, variant = 0) => {
    const c = px.create(w + 2, h + 10); const g = c.ctx;
    const wall = variant === 1 ? P.stoneLight : variant === 2 ? P.sand : P.straw;
    g.fillStyle = P.outline; g.fillRect(0, 9, w + 2, h + 1);
    g.fillStyle = wall; g.fillRect(1, 10, w, h - 1);
    // timber frame
    g.fillStyle = P.wood; for (let x = 4; x < w; x += 7) g.fillRect(x, 10, 1, h - 1); g.fillRect(1, 10 + Math.floor(h / 2), w, 1);
    // roof
    g.fillStyle = P.outline; for (let i = 0; i < 10; i++) g.fillRect(i, 9 - i, w + 2 - i * 2, 1);
    g.fillStyle = variant === 1 ? P.ironDark : P.woodLight; for (let i = 1; i < 9; i++) g.fillRect(i + 1, 10 - i, w - i * 2, 1);
    g.fillStyle = variant === 1 ? P.iron : P.woodHi; for (let i = 2; i < 9; i += 2) g.fillRect(i + 2, 10 - i, Math.max(1, w - i * 2 - 2), 1);
    // door + window
    g.fillStyle = P.outline; g.fillRect(Math.floor(w / 2) - 2, h + 3, 5, 7); g.fillStyle = P.wood; g.fillRect(Math.floor(w / 2) - 1, h + 4, 3, 6);
    g.fillStyle = P.outline; g.fillRect(3, h - 2, 5, 5); g.fillStyle = P.skyLight; g.fillRect(4, h - 1, 3, 3);
    if (w > 20) { g.fillStyle = P.outline; g.fillRect(w - 7, h - 2, 5, 5); g.fillStyle = P.skyLight; g.fillRect(w - 6, h - 1, 3, 3); }
    return c;
  }, { editable: false });
  S.define('wallSegment', (w = 32, h = 20) => {
    const c = px.create(w, h); const g = c.ctx;
    g.fillStyle = P.outline; g.fillRect(0, 0, w, h);
    g.fillStyle = P.stone; g.fillRect(1, 4, w - 2, h - 5);
    g.fillStyle = P.stoneLight; for (let y = 5; y < h - 1; y += 4) for (let x = (y / 4) % 2 ? 1 : 4; x < w - 1; x += 6) g.fillRect(x, y, 4, 2);
    // crenellations
    for (let x = 0; x < w; x += 6) { g.fillStyle = P.outline; g.fillRect(x, 0, 4, 4); g.fillStyle = P.stone; g.fillRect(x + 1, 1, 2, 3); }
    return c;
  }, { editable: false });
  S.define('towerSeg', (w = 18, h = 48, flag = 1) => {
    const c = px.create(w + 8, h + 12); const g = c.ctx;
    g.fillStyle = P.outline; g.fillRect(0, 12, w, h);
    g.fillStyle = P.stone; g.fillRect(1, 13, w - 2, h - 2);
    g.fillStyle = P.stoneLight; for (let y = 14; y < h + 10; y += 4) for (let x = (y / 4) % 2 ? 1 : 4; x < w - 1; x += 6) g.fillRect(x, y, 3, 2);
    g.fillStyle = P.ironDark; g.fillRect(Math.floor(w / 2) - 1, 24, 3, 6); // window
    for (let x = 0; x < w; x += 5) { g.fillStyle = P.outline; g.fillRect(x, 8, 4, 5); g.fillStyle = P.stone; g.fillRect(x + 1, 9, 2, 4); }
    if (flag) { g.fillStyle = P.outline; g.fillRect(Math.floor(w / 2), 0, 1, 9); g.fillStyle = P.cloth; g.fillRect(Math.floor(w / 2) + 1, 1, 6, 4); }
    return c;
  }, { editable: false });
  S.define('gate', (w = 20, h = 24) => {
    const c = px.create(w, h); const g = c.ctx;
    g.fillStyle = P.outline; g.fillRect(0, 0, w, h);
    g.fillStyle = P.stone; g.fillRect(1, 1, w - 2, h - 2);
    g.fillStyle = P.outline; g.fillRect(4, 8, w - 8, h - 8);
    g.fillStyle = P.wood; g.fillRect(5, 9, w - 10, h - 9);
    g.fillStyle = P.ironDark; for (let y = 11; y < h; y += 5) g.fillRect(5, y, w - 10, 1);
    return c;
  }, { editable: false });
  S.define('ground', (w = 320, kind = 'grass', seed = 1) => {
    const c = px.create(w, 24); const g = c.ctx; const rng = new HB.RNG(seed);
    const top = kind === 'grass' ? P.grass : kind === 'dirt' ? P.dirtLight : kind === 'sand' ? P.sand : kind === 'stone' ? P.stoneLight : kind === 'snow' ? P.white : P.grass;
    const body = kind === 'grass' ? P.grassDark : kind === 'dirt' ? P.dirt : kind === 'sand' ? P.dirtLight : kind === 'stone' ? P.stone : kind === 'snow' ? P.skyLight : P.grassDark;
    g.fillStyle = body; g.fillRect(0, 0, w, 24); g.fillStyle = top; g.fillRect(0, 0, w, 3);
    g.fillStyle = kind === 'grass' ? P.grassLight : P.stoneLight;
    for (let i = 0; i < w / 3; i++) { const x = rng.int(w), y = 3 + rng.int(18); g.fillRect(x, y, 1 + rng.int(2), 1); }
    if (kind === 'grass') { g.fillStyle = P.grassLight; for (let i = 0; i < w / 6; i++) { const x = rng.int(w); g.fillRect(x, 0, 1, 2); } }
    return c;
  }, { editable: false });
  S.define('hillsSilhouette', (w = 320, h = 40, color = '#5f7f5a', seed = 2) => {
    const c = px.create(w, h); const g = c.ctx; const rng = new HB.RNG(seed); const noise = new HB.Noise2D(rng);
    g.fillStyle = color;
    for (let x = 0; x < w; x++) { const y = h * (0.45 + noise.fbm(x / 60, 0, 3) * 0.35); g.fillRect(x, Math.round(y), 1, h); }
    return c;
  }, { editable: false });
  S.define('mountainsSilhouette', (w = 320, h = 60, color = '#8a93a6', seed = 3) => {
    const c = px.create(w, h); const g = c.ctx; const rng = new HB.RNG(seed); const noise = new HB.Noise2D(rng);
    g.fillStyle = color;
    for (let x = 0; x < w; x++) { const y = h * (0.35 + noise.ridged(x / 45, 0.5, 3) * -0.5 + 0.35); g.fillRect(x, Math.round(HB.clamp(y, 4, h)), 1, h); }
    g.fillStyle = P.white; for (let x = 0; x < w; x++) { const y = h * (0.35 + noise.ridged(x / 45, 0.5, 3) * -0.5 + 0.35); if (y < h * 0.3) g.fillRect(x, Math.round(HB.clamp(y, 4, h)), 1, 2); }
    return c;
  }, { editable: false });
  S.define('cloud', (w = 30, seed = 1) => {
    const c = px.create(w, Math.round(w * 0.45)); const g = c.ctx; const rng = new HB.RNG(seed);
    for (let i = 0; i < 5; i++) { const r = w * (0.12 + rng.next() * 0.14); px.ellipse(g, w * (0.2 + rng.next() * 0.6), c.height * 0.6, r, r * 0.7, P.white); }
    px.ellipse(g, w / 2, c.height * 0.65, w * 0.42, c.height * 0.3, P.white);
    return c;
  }, { editable: false });

  // groups in the pixel editor's list (new sprites default to Props)
  S.groups({
    People: ['villager', 'villager2', 'bandit', 'guard', 'archer', 'knight', 'noble', 'hero', 'priest', 'dwarf', 'goblin', 'orc', 'warlord', 'warden', 'child', 'corpse'],
    Animals: ['sheep', 'cow', 'horse'],
    Treasure: ['chest', 'chestOpen', 'coins', 'goblet', 'crown', 'gem', 'gemRed', 'gemGreen', 'ring', 'signet', 'sceptre', 'bell', 'helm', 'plate', 'pearl', 'chalice', 'sword', 'shield', 'key', 'book', 'scroll', 'crystal'],
  });
})();

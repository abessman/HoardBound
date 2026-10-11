/* New world screen: seed, dragon name, breed, options. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;

  const BREEDS = [
    { id: 'red', name: 'Red', desc: 'Ember-scaled. Fire comes easily: +5% breath power.' },
    { id: 'green', name: 'Green', desc: 'Forest-born. Hunters find the lair less easily: −5% attention.' },
    { id: 'black', name: 'Black', desc: 'Night-hued. Raids raise alarm a little slower.' },
    { id: 'gold', name: 'Gold', desc: 'Regal. Nobles pay a little more ransom: +5% dominance.' },
    { id: 'blue', name: 'Blue', desc: 'Storm-wing. Flight costs 5% less stamina.' },
  ];
  HB.BREEDS = BREEDS;

  class SwatchButton extends HB.ui.Button {
    constructor(o) { super(o); this.breed = o.breed; this.selectedFn = o.selectedFn; }
    draw(ctx) {
      const p = HB.palette, pp = HB.px_palette;
      const sel = this.selectedFn();
      HB.parchment.plaque(ctx, this.x, this.y, this.w, this.h, { fill: sel ? 'rgba(220,170,70,0.35)' : this.hover || this.focused ? 'rgba(255,250,235,0.78)' : 'rgba(255,246,222,0.45)', color: this.focused ? p.focus : sel ? p.ink : p.inkSoft, width: this.focused ? 2.5 : sel ? 2 : 1 });
      // egg
      const cx = this.x + this.w / 2, cy = this.y + 34;
      const base = pp[this.breed.id] || '#888', light = pp[this.breed.id + 'Light'] || '#aaa', dark = pp[this.breed.id + 'Dark'] || '#444';
      ctx.save();
      ctx.beginPath(); ctx.ellipse(cx, cy, 15, 20, 0, 0, Math.PI * 2); ctx.fillStyle = dark; ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx - 1, cy - 2, 13, 17, 0, 0, Math.PI * 2); ctx.fillStyle = base; ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx - 5, cy - 8, 4, 6, -0.4, 0, Math.PI * 2); ctx.fillStyle = light; ctx.fill();
      ctx.fillStyle = dark; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(cx - 6 + i * 4, cy + 4 + Math.sin(i * 2) * 3, 1.6, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = p.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(cx, cy, 15, 20, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      HB.text.draw(ctx, this.breed.name, cx, this.y + this.h - 8, { size: 14, family: 'sc', align: 'center', color: p.ink });
    }
    tooltipText() { return this.breed.desc; }
  }

  class NewGameScene {
    constructor() {
      this.opaque = true; this.ui = new HB.ui.UI();
      this.rng = new HB.RNG();
      this.opts = { seed: randomSeedWord(this.rng), name: HB.names.dragon(this.rng), breed: 'red', keeper: HB.settings.keeper, deathMode: HB.settings.deathMode };
    }
    enter() {
      const o = this.opts;
      const w = 640, x = (HB.W - w) / 2, y0 = 80; this.x = x; this.y = y0; this.w = w; this.h = 560;
      let y = y0 + 92;
      // seed
      this.seedField = this.ui.add(new HB.ui.TextField({ x: x + 40, y, w: 400, h: 36, label: 'World seed', value: o.seed, maxLength: 32, onChange: v => { o.seed = v; }, tooltip: 'Any word or number. The same seed makes the same world.' }));
      this.ui.add(new HB.ui.Button({ x: x + 452, y, w: 148, h: 36, label: 'Random', size: 15, onClick: () => { o.seed = randomSeedWord(this.rng); this.seedField.value = o.seed; } }));
      y += 66;
      this.nameField = this.ui.add(new HB.ui.TextField({ x: x + 40, y, w: 400, h: 36, label: 'Your dragon’s name', value: o.name, maxLength: 20, onChange: v => { o.name = v; } }));
      this.ui.add(new HB.ui.Button({ x: x + 452, y, w: 148, h: 36, label: 'Random', size: 15, onClick: () => { o.name = HB.names.dragon(this.rng); this.nameField.value = o.name; } }));
      y += 62;
      this.breedY = y;
      const bw = 104, gap = 10, total = BREEDS.length * bw + (BREEDS.length - 1) * gap, bx0 = x + (w - total) / 2;
      BREEDS.forEach((b, i) => this.ui.add(new SwatchButton({ x: bx0 + i * (bw + gap), y: y + 22, w: bw, h: 84, breed: b, selectedFn: () => o.breed === b.id, onClick: () => { o.breed = b.id; } })));
      y += 126;
      const keeperT = this.ui.add(new HB.ui.Toggle({ x: x + 40, y, w: w - 80, label: 'Keeper episodes during sleep', value: o.keeper, onChange: v => { o.keeper = v; }, tooltip: 'Optional short care episodes while the dragon sleeps. Can be changed later in Settings.' }));
      y += 46;
      const deathT = this.ui.add(new HB.ui.Toggle({ x: x + 40, y, w: w - 80, label: 'Death rules', value: o.deathMode, onChange: v => { o.deathMode = v; }, tooltip: 'Legend: a slain sleeping dragon ends the campaign. Mythic: being slain becomes a forced century of slumber with a plundered lair.' }));
      deathT.setOptions([{ label: 'Legend', value: 'legend' }, { label: 'Mythic', value: 'mythic' }], o.deathMode);
      y += 70;
      this.ui.add(new HB.ui.Button({ x: x + 40, y, w: 200, h: 44, label: 'Back', onClick: () => HB.scenes.pop(this) }));
      this.ui.add(new HB.ui.Button({ x: x + w - 280, y, w: 240, h: 44, label: 'Hatch', primary: true, size: 20, onClick: () => this.start() }));
      this.ui.onCancel = () => HB.scenes.pop(this);
      this.ui.setFocus(this.ui.widgets[this.ui.widgets.length - 1]);
    }
    start() {
      const o = Object.assign({}, this.opts);
      if (!o.seed.trim()) o.seed = randomSeedWord(this.rng);
      if (!o.name.trim()) o.name = HB.names.dragon(this.rng);
      HB.settings.keeper = o.keeper; HB.settings.deathMode = o.deathMode; HB.settings.save();
      if (HB.flow && HB.flow.startCampaign) HB.flow.startCampaign(o);
      else HB.notice('Not yet', 'The world generator is not loaded in this build.');
    }
    update(dt) { this.ui.update(dt); }
    draw(ctx) {
      const p = HB.palette;
      HB.parchment.fill(ctx, 0, 0, HB.W, HB.H, 'dark');
      HB.parchment.vignette(ctx, 0, 0, HB.W, HB.H, 0.5);
      HB.parchment.panel(ctx, this.x, this.y, this.w, this.h, { title: 'A New World', tone: 'light' });
      HB.text.draw(ctx, 'Breed', this.x + 40, this.breedY + 12, { size: 14, family: 'sc', color: p.inkSoft });
      HB.text.draw(ctx, 'Every world is drawn fresh from its seed. You hatch small, hungry and unknown.', this.x + this.w / 2, this.y + 56, { size: 15, italic: true, align: 'center', color: p.inkSoft });
      this.ui.draw(ctx);
    }
  }
  HB.NewGameScene = NewGameScene;

  const seedWords = ['ember', 'thorn', 'gilded', 'hollow', 'wyrm', 'amber', 'cinder', 'gloam', 'brass', 'quill', 'moth', 'fathom', 'bramble', 'tallow', 'vellum', 'sable', 'onyx', 'ashen', 'kestrel', 'lantern'];
  function randomSeedWord(rng) { return rng.pick(seedWords) + '-' + rng.pick(seedWords) + '-' + rng.between(10, 99); }
})();

/* Settings screen (also used as the in-game options panel). */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;

  class SettingsScene {
    constructor(opts = {}) { this.opaque = false; this.ui = new HB.ui.UI(); this.inGame = !!opts.inGame; }
    enter() {
      const S = HB.settings;
      const w = 520, x = (HB.W - w) / 2, y0 = 120;
      this.x = x; this.y = y0; this.w = w; this.h = 568;
      let y = y0 + 60;
      const row = (label, value, onChange, options, tooltip) => {
        const t = new HB.ui.Toggle({ x: x + 40, y, w: w - 80, label, value, onChange, tooltip });
        if (options) t.setOptions(options, value);
        this.ui.add(t); y += 46; return t;
      };
      row('Sound effects', S.sound, v => { S.sound = v; S.save(); if (HB.audio) HB.audio.setEnabled(v); }, null, 'Synthesised sound effects. Nothing plays until you interact.');
      row('Keeper episodes during sleep', S.keeper, v => { S.keeper = v; S.save(); }, null, 'Optional short care episodes while the dragon sleeps. They change the same sleep simulation.');
      row('Death rules', S.deathMode, v => { S.deathMode = v; S.save(); }, [{ label: 'Legend', value: 'legend' }, { label: 'Mythic', value: 'mythic' }],
        'Legend: a slain sleeping dragon ends the campaign. Mythic: being slain becomes a century of forced slumber and a plundered lair instead.');
      row('Tutorial hints', S.hints, v => { S.hints = v; S.save(); }, null, 'Short guidance during the first expeditions.');
      row('Default travel speed', S.travelSpeed, v => { S.travelSpeed = v; S.save(); }, [{ label: 'Slow', value: 0.6 }, { label: 'Normal', value: 1 }, { label: 'Brisk', value: 1.6 }], 'How fast map flights play by default. You can always change speed during a flight.');
      row('Reduce motion', S.reduceMotion, v => { S.reduceMotion = v; S.save(); }, null, 'Shortens transitions and flashes; on the map, ink and watercolour fade in instead of flowing.');
      const packs = [{ label: 'Original ink', value: 'none' }].concat((HB.MAP_PACKS || []).map(p => ({ label: p.label || p.name, value: p.name })));
      if (packs.length > 1) row('Map art', packs.some(p => p.value === S.mapPack) ? S.mapPack : 'none', v => { S.mapPack = v; S.save(); if (HB.mapAssets) HB.mapAssets.use(v); }, packs, 'Choose the map illustrations. Original ink restores the earlier artwork; your campaign stays the same.');
      row('Time of day on the map', ['day', 'dusk', 'night'].includes(S.mapLight) ? S.mapLight : 'day', v => { S.mapLight = v; S.save(); }, [{ label: 'Day', value: 'day' }, { label: 'Dusk', value: 'dusk' }, { label: 'Night', value: 'night' }],
        'A preview of the map at dusk or night: campfires, lit windows and lanterns glow. Drawings show the lights you mark in the pixel editor; other places get a few by kind.');
      y += 10;
      // a dev tool for now: the owner draws the game's pixel art there (docs/pixel-editor.md)
      this.ui.add(new HB.ui.Button({ x: x + w / 2 - 230, y, w: 220, h: 40, label: 'Pixel editor', onClick: () => HB.openEditor(),
        tooltip: 'Draw the game’s pixel art (the dragon, the lair, raid sprites, map symbols) and save it to the game. Opens in a new tab where the browser allows it.' }));
      // an experiment: the map as a tilted parchment with standing symbols (src/views/map3d.js); your campaign if one is open
      this.ui.add(new HB.ui.Button({ x: x + w / 2 + 10, y, w: 220, h: 40, label: '3D map test', onClick: () => { const m = this.inGame && HB.flow && HB.flow.map; HB.scenes.push(new HB.Map3DScene(m && m.state ? m.state : HB.Map3DScene.testState())); },
        tooltip: 'Try the map as a tilted parchment with its mountains, trees and places standing on it. Only a test: nothing in your campaign changes.' }));
      y += 52;
      this.ui.add(new HB.ui.Button({ x: x + w / 2 - 230, y, w: 220, h: 40, label: 'Reset to defaults', onClick: () => { S.reset(); if (HB.mapAssets && HB.mapAssets.packName !== S.mapPack) HB.mapAssets.use(S.mapPack); HB.scenes.pop(this); HB.scenes.push(new SettingsScene({ inGame: this.inGame })); } }));
      this.ui.add(new HB.ui.Button({ x: x + w / 2 + 10, y, w: 220, h: 40, label: 'Back', primary: true, onClick: () => HB.scenes.pop(this) }));
      this.ui.onCancel = () => HB.scenes.pop(this);
      this.ui.focusFirst();
    }
    update(dt) { this.ui.update(dt); }
    draw(ctx) {
      ctx.fillStyle = 'rgba(15,8,4,0.5)'; ctx.fillRect(0, 0, HB.W, HB.H);
      HB.parchment.panel(ctx, this.x, this.y, this.w, this.h, { title: 'Settings', tone: 'light' });
      this.ui.draw(ctx);
    }
  }
  HB.SettingsScene = SettingsScene;

  /** open the pixel editor (editor/index.html): in a new tab where the browser allows it, else in this one, after
   *  saving the campaign in progress (the game's buttons act a frame after the tap, which some browsers treat as a popup) */
  HB.openEditor = function () {
    const url = 'editor/index.html';
    let tab = null;
    try { tab = window.open(url, '_blank'); } catch (e) { tab = null; }
    if (tab) return;
    const st = HB.flow && HB.flow.map && HB.flow.map.state;
    if (st && HB.save) HB.save.autosave(st);
    location.href = url;
  };
})();

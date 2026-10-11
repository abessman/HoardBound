/* In-game menu, save/load menu, chronicle, realms. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;

  class MenuScene {
    constructor(state) { this.state = state; this.opaque = false; this.ui = new HB.ui.UI(); }
    enter() {
      const w = 360, x = (HB.W - w) / 2, y0 = 150; this.x = x; this.y = y0; this.w = w; this.h = 420;
      let y = y0 + 60;
      const add = (label, onClick, opts = {}) => { this.ui.add(new HB.ui.Button(Object.assign({ x: x + 40, y, w: w - 80, h: 42, label, size: 17, onClick }, opts))); y += 50; };
      add('Return to the world', () => HB.scenes.pop(this), { primary: true });
      add('Save world', () => HB.scenes.push(new SaveMenuScene({ mode: 'save', state: this.state })));
      add('Load world', () => HB.scenes.push(new SaveMenuScene({ mode: 'load' })));
      add('Settings', () => HB.scenes.push(new HB.SettingsScene({ inGame: true })));
      add('Export save file', () => HB.save.exportFile(this.state));
      add('Quit to title', () => HB.confirm('Quit?', 'Return to the title screen? Unsaved progress since the last autosave is lost.', () => { HB.save.autosave(this.state); HB.scenes.replace(new HB.TitleScene()); }));
      this.ui.onCancel = () => HB.scenes.pop(this);
      this.ui.focusFirst();
    }
    update(dt) { this.ui.update(dt); }
    draw(ctx) { ctx.fillStyle = 'rgba(15,8,4,0.5)'; ctx.fillRect(0, 0, HB.W, HB.H); HB.parchment.panel(ctx, this.x, this.y, this.w, this.h, { title: 'Menu', tone: 'light' }); HB.text.draw(ctx, `HoardBound version ${HB.VERSION}`, this.x + this.w / 2, this.y + this.h - 14, { size: 13, italic: true, align: 'center', color: HB.palette.inkSoft }); this.ui.draw(ctx); }
  }
  HB.MenuScene = MenuScene;

  class SaveMenuScene {
    constructor(o) { this.o = o; this.opaque = false; this.ui = new HB.ui.UI(); }
    enter() {
      const w = 620, x = (HB.W - w) / 2, y0 = 110; this.x = x; this.y = y0; this.w = w; this.h = 500;
      const slots = HB.save.slots();
      const items = this.o.mode === 'save' ? [{ slot: 'slot' + Date.now(), fresh: true }].concat(slots) : slots;
      this.list = this.ui.add(new HB.ui.ListBox({ x: x + 30, y: y0 + 60, w: w - 60, h: 340, items, itemHeight: 56, emptyText: 'No saved worlds.',
        onSelect: (m) => { if (this.o.mode === 'save') { if (m.fresh) { HB.save.write(this.o.state, m.slot); } else HB.confirm('Overwrite?', `Overwrite the save of ${m.dragon}, Year ${m.year}?`, () => { HB.save.write(this.o.state, m.slot); HB.scenes.pop(this); }); if (m.fresh) { HB.scenes.pop(this); HB.notice('Saved', 'The world is written down.'); } } else { HB.scenes.pop(this); HB.save.loadSlot(m.slot); } },
        drawItem: (ctx, m, x, y, w, h) => { if (m.fresh) { HB.text.draw(ctx, 'New save', x + 12, y + 32, { size: 16, family: 'sc' }); return; } HB.text.draw(ctx, `${m.dragon}, ${HB.TIERS[m.tier].name.toLowerCase()} — Year ${m.year}`, x + 12, y + 22, { size: 15, family: 'sc' }); HB.text.draw(ctx, `${m.slot === 'auto' ? 'Autosave · ' : ''}seed ${m.seed} · ${HB.fmt.int(m.hoard)} gold · ${new Date(m.savedAt).toLocaleString()}`, x + 12, y + 42, { size: 12, italic: true, color: HB.palette.inkSoft }); } }));
      this.ui.add(new HB.ui.Button({ x: x + 30, y: y0 + 420, w: 160, h: 40, label: 'Back', onClick: () => HB.scenes.pop(this) }));
      if (this.o.mode === 'load') this.ui.add(new HB.ui.Button({ x: x + 200, y: y0 + 420, w: 180, h: 40, label: 'Import file', onClick: () => { HB.scenes.pop(this); HB.save.importFile(); } }));
      this.ui.add(new HB.ui.Button({ x: x + w - 190, y: y0 + 420, w: 160, h: 40, label: 'Delete', disabled: !slots.length, onClick: () => { const m = this.list.items[this.list.selected]; if (!m || m.fresh) return; HB.confirm('Delete?', `Delete the save of ${m.dragon}, Year ${m.year}?`, () => { HB.save.remove(m.slot); HB.scenes.pop(this); HB.scenes.push(new SaveMenuScene(this.o)); }); } }));
      this.ui.onCancel = () => HB.scenes.pop(this);
      this.ui.focusFirst();
    }
    update(dt) { this.ui.update(dt); }
    draw(ctx) { ctx.fillStyle = 'rgba(15,8,4,0.5)'; ctx.fillRect(0, 0, HB.W, HB.H); HB.parchment.panel(ctx, this.x, this.y, this.w, this.h, { title: this.o.mode === 'save' ? 'Save World' : 'Load World', tone: 'light' }); this.ui.draw(ctx); }
  }
  HB.SaveMenuScene = SaveMenuScene;

  class ChronicleScene {
    constructor(state) { this.state = state; this.opaque = false; this.ui = new HB.ui.UI(); }
    enter() {
      const w = 820, x = (HB.W - w) / 2, y0 = 60; this.x = x; this.y = y0; this.w = w; this.h = 600;
      const entries = this.state.chronicle.slice().reverse();
      this.ui.add(new HB.ui.ListBox({ x: x + 30, y: y0 + 60, w: w - 60, h: 450, items: entries, itemHeight: 44, emptyText: 'Nothing has happened yet.', focusable: true,
        drawItem: (ctx, e, x, y, w, h) => { HB.text.draw(ctx, `Year ${e.year}`, x + 10, y + 27, { size: 13, family: 'sc', color: HB.palette.inkSoft }); HB.text.paragraph(ctx, e.text, x + 90, y + 6, w - 100, { size: 14, maxLines: 2, lineHeight: 16 }); } }));
      this.ui.add(new HB.ui.Button({ x: x + w / 2 - 80, y: y0 + 530, w: 160, h: 40, label: 'Close', primary: true, onClick: () => HB.scenes.pop(this) }));
      this.ui.onCancel = () => HB.scenes.pop(this);
      this.ui.focusFirst();
    }
    update(dt) { this.ui.update(dt); }
    draw(ctx) {
      ctx.fillStyle = 'rgba(15,8,4,0.5)'; ctx.fillRect(0, 0, HB.W, HB.H);
      HB.parchment.panel(ctx, this.x, this.y, this.w, this.h, { title: `The Chronicle of ${this.state.dragon.name}`, tone: 'light' });
      const c = this.state.counters;
      HB.text.draw(ctx, `${HB.fmt.plural(c.raids, 'raid')} · ${HB.fmt.int(c.goldStolen)} gold stolen · ${HB.fmt.plural(c.sleeps, 'sleep')} · ${HB.fmt.plural(c.artifactsFound, 'artifact')} found · ${c.burned} buildings burned · ${c.released} captives released`, this.x + this.w / 2, this.y + 50, { size: 13, italic: true, align: 'center', color: HB.palette.inkSoft });
      this.ui.draw(ctx);
    }
  }
  HB.ChronicleScene = ChronicleScene;

  class RealmsScene {
    constructor(state) { this.state = state; this.opaque = false; this.ui = new HB.ui.UI(); }
    enter() {
      const w = 900, x = (HB.W - w) / 2, y0 = 50; this.x = x; this.y = y0; this.w = w; this.h = 620;
      const W = this.state.world;
      const known = W.factions.filter(f => f.dragon.known || f.subregions.some(s => this.state.know.subSeen[s]));
      this.ui.add(new HB.ui.ListBox({ x: x + 30, y: y0 + 60, w: w - 60, h: 480, items: known, itemHeight: 74, emptyText: 'You know of no realms yet. Fly, and the map will tell you who rules the vales.',
        drawItem: (ctx, f, x, y, w, h) => {
          const cap = f.capitalId !== null && f.capitalId !== undefined ? W.locations[f.capitalId] : null;
          HB.text.draw(ctx, `${f.name} — ${f.kind === 'human' ? 'a kingdom of men' : f.kind === 'dwarf' ? 'a dwarven realm' : f.kind === 'elf' ? 'an elven realm' : 'a goblin host'}, ruled by ${f.ruler.title} ${f.ruler.name}${cap ? ` from ${cap.name}` : ''}`, x + 10, y + 20, { size: 14, family: 'sc', maxWidth: w - 20 });
          HB.text.draw(ctx, HB.preview.moodText(f), x + 10, y + 40, { size: 13, maxWidth: w - 20 });
          const learned = []; if (f.learned.escorts) learned.push('caravans ride escorted'); if (f.learned.vaults) learned.push('valuables locked in vaults'); if (f.learned.rescue) learned.push('nobles kept close'); if (f.learned.hunters) learned.push(`hunters funded (${f.learned.hunters})`);
          const wars = (f.atWar || []).map(id => W.factions[id].name);
          HB.text.draw(ctx, `${learned.length ? 'Learned: ' + learned.join(', ') + '. ' : ''}${wars.length ? 'At war with ' + HB.fmt.list(wars) + '.' : 'At peace.'} ${f.history.length ? f.history[f.history.length - 1].text : ''}`, x + 10, y + 60, { size: 12, italic: true, color: HB.palette.inkSoft, maxWidth: w - 20 });
        } }));
      this.ui.add(new HB.ui.Button({ x: x + w / 2 - 80, y: y0 + 560, w: 160, h: 40, label: 'Close', primary: true, onClick: () => HB.scenes.pop(this) }));
      this.ui.onCancel = () => HB.scenes.pop(this);
      this.ui.focusFirst();
    }
    update(dt) { this.ui.update(dt); }
    draw(ctx) {
      ctx.fillStyle = 'rgba(15,8,4,0.5)'; ctx.fillRect(0, 0, HB.W, HB.H);
      HB.parchment.panel(ctx, this.x, this.y, this.w, this.h, { title: 'Realms', tone: 'light' });
      const m = this.state.memory;
      HB.text.draw(ctx, `${m.grudges.length ? 'Grudges: ' + m.grudges.slice(-3).map(g => g.name).join(', ') + '. ' : ''}${m.loyalties.length ? 'Loyal to you: ' + m.loyalties.slice(-3).map(g => g.name).join(', ') + '.' : ''}`, this.x + this.w / 2, this.y + 50, { size: 13, italic: true, align: 'center', color: HB.palette.inkSoft, maxWidth: this.w - 60 });
      this.ui.draw(ctx);
    }
  }
  HB.RealmsScene = RealmsScene;
})();

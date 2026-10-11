/* Aims: the growth milestone with its real requirements, a board of concrete opportunities tagged by aim, and renown. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;

  class AimsScene {
    constructor(state, map) { this.state = state; this.map = map || HB.flow.map; this.opaque = true; this.ui = new HB.ui.UI(); this.t = 0; }
    enter() {
      const st = this.state, ui = this.ui;
      this.m = HB.goals.milestone(st);
      this.opps = HB.goals.opportunities(st).sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));
      this.cols = { goal: { x: 20, y: 20, w: 400, h: 630 }, opp: { x: 432, y: 20, w: 470, h: 630 }, ren: { x: 914, y: 20, w: 346, h: 630 } };
      const c = this.cols.opp;
      this.list = ui.add(new HB.ui.ListBox({ x: c.x + 14, y: c.y + 70, w: c.w - 28, h: c.h - 86, items: this.opps, itemHeight: 110, gap: 6, selected: 0, emptyText: 'Fly out and explore: there is nothing in sight yet.',
        onSelect: (o) => this.go(o),
        drawItem: (ctx, o, x, y, w, h) => this.drawOpp(ctx, o, x, y, w, h),
        itemTooltip: (o) => o.ref ? (o.ref.kind === 'tab' ? 'Open the lair.' : 'Show it on the map.') : '' }));
      ui.add(new HB.ui.Button({ x: 20, y: HB.H - 58, w: 200, h: 40, label: 'Back to map', size: 16, hotkey: 'cancel', hotkeyLabel: 'Esc', onClick: () => HB.scenes.pop(this) }));
      ui.focusFirst();
      ui.onCancel = () => HB.scenes.pop(this);
    }
    go(o) {
      const st = this.state, map = this.map;
      HB.scenes.pop(this);
      if (!o.ref) return;
      if (o.ref.kind === 'tab') { if (HB.LairScene) HB.scenes.push(new HB.LairScene(st, { tab: o.ref.tab, upgrade: o.ref.upgrade })); return; }
      const t = o.ref.kind === 'loc' ? st.world.locations[o.ref.id] : st.entities.find(e => e.id === o.ref.id);
      if (t && map) { map.select(t); map.centerOn(t.x + 0.5, t.y + 0.5, Math.max(map.cam.zoom, 1.4)); }
    }
    update(dt) { this.t += dt; this.ui.update(dt); }
    drawOpp(ctx, o, x, y, w, h) {
      const P = HB.palette, A = HB.AIMS[o.aim];
      const label = A.label.toUpperCase();
      const cw = HB.text.width(label, 11, { family: 'sc' }) + 16;
      ctx.save(); ctx.fillStyle = A.color; HB.parchment.roundRect(ctx, x + 10, y + 9, cw, 18, 3); ctx.fill(); ctx.restore();
      HB.text.draw(ctx, label, x + 10 + cw / 2, y + 22, { size: 11, family: 'sc', align: 'center', color: '#f6ecd2' });
      const uw = o.urgent ? 50 : 0;
      if (o.urgent) HB.text.draw(ctx, 'urgent', x + w - 12, y + 22, { size: 12, italic: true, align: 'right', color: P.bad });
      HB.text.draw(ctx, o.title, x + 20 + cw, y + 23, { size: 15, family: 'sc', maxWidth: w - 32 - cw - uw });
      const dh = HB.text.paragraph(ctx, o.desc, x + 12, y + 34, w - 24, { size: 13, maxLines: 2, lineHeight: 16, color: P.ink });
      HB.text.paragraph(ctx, '→ ' + o.yields, x + 12, y + 38 + Math.max(dh, 16), w - 24, { size: 13, maxLines: 3, lineHeight: 16, italic: true, color: o.aim === 'fear' ? P.warn : P.good });
    }
    draw(ctx) {
      const st = this.state, P = HB.palette, m = this.m;
      HB.parchment.fill(ctx, 0, 0, HB.W, HB.H);
      HB.parchment.vignette(ctx, 0, 0, HB.W, HB.H, 0.4);
      // ---- goal
      let c = this.cols.goal, x = c.x + 22, w = c.w - 44;
      HB.parchment.panel(ctx, c.x, c.y, c.w, c.h, { tone: 'light', title: 'Your Goal' });
      let y = c.y + 52;
      HB.text.draw(ctx, m.title, c.x + c.w / 2, y + 26, { size: 28, family: 'display', align: 'center' }); y += 46;
      for (const r of m.reqs) {
        HB.text.draw(ctx, r.label, x, y + 14, { size: 15, family: 'sc' });
        HB.text.draw(ctx, r.done ? 'done' : `${HB.fmt.int(r.cur)} / ${HB.fmt.int(r.need)}${r.unit ? ' ' + r.unit : ''}`, x + w, y + 14, { size: 15, align: 'right', color: r.done ? P.good : P.ink });
        y += 20;
        bar(ctx, x, y, w, 16, r.cur, r.need, r.key === 'hoard' ? '#9c6b1c' : '#3f6d3a', r.carried || 0);
        y += 22;
        if (r.carried && !r.done) { HB.text.draw(ctx, `+${HB.fmt.int(r.carried)} carried, counts once stored`, x, y + 11, { size: 12, italic: true, color: P.inkSoft }); y += 16; }
        y += HB.text.paragraph(ctx, r.hint, x, y, w, { size: 13, italic: true, color: P.inkSoft, lineHeight: 16 }) + 12;
      }
      HB.parchment.rule(ctx, x, y, w, { ornament: false }); y += 14;
      HB.text.draw(ctx, 'Next step', x, y + 14, { size: 15, family: 'sc' }); y += 22;
      y += HB.text.paragraph(ctx, m.nextStep, x, y, w, { size: 15 }) + 14;
      if (m.unlocks.length) {
        HB.text.draw(ctx, 'Growing gives you', x, y + 14, { size: 15, family: 'sc' }); y += 24;
        for (const u of m.unlocks) { if (y > c.y + c.h - 30) break; ctx.fillStyle = P.good; ctx.beginPath(); ctx.arc(x + 4, y + 8, 2.6, 0, Math.PI * 2); ctx.fill(); y += HB.text.paragraph(ctx, u, x + 14, y, w - 14, { size: 13, lineHeight: 16 }) + 4; }
      }
      // ---- opportunities
      c = this.cols.opp;
      HB.parchment.panel(ctx, c.x, c.y, c.w, c.h, { tone: 'light', title: 'What You Could Do' });
      HB.text.draw(ctx, `${HB.input.lastDevice === 'touch' ? 'Tap' : 'Choose'} one to find it on the map.`, c.x + c.w / 2, c.y + 60, { size: 13, italic: true, align: 'center', color: P.inkSoft });
      // ---- renown
      c = this.cols.ren; x = c.x + 20; w = c.w - 40;
      HB.parchment.panel(ctx, c.x, c.y, c.w, c.h, { tone: 'light', title: 'Renown' });
      y = c.y + 52;
      y += HB.text.paragraph(ctx, HB.renown.displayName(st), x, y, w, { size: 19, family: 'sc' }) + 8;
      const R = HB.renown.get(st);
      if (!R.titles.length) y += HB.text.paragraph(ctx, 'Nobody tells stories about you yet. Deeds earn names, and names change how people answer you.', x, y, w, { size: 13, italic: true, color: P.inkSoft, lineHeight: 16 }) + 8;
      for (const t of R.titles.slice().reverse()) {
        if (y > c.y + 330) break;
        HB.text.draw(ctx, HB.fmt.cap(t.name), x, y + 14, { size: 15, family: 'sc', color: P.good, maxWidth: w }); y += 20;
        y += HB.text.paragraph(ctx, HB.TITLE_BY_ID[t.id].effect, x, y, w, { size: 12, lineHeight: 15, color: P.inkSoft, maxLines: 3 }) + 6;
      }
      HB.parchment.rule(ctx, x, y + 2, w, { ornament: false }); y += 14;
      HB.text.draw(ctx, 'Who knows of you', x, y + 14, { size: 14, family: 'sc' }); y += 22;
      const known = st.world.factions.filter(f => f.dragon.known).sort((a, b) => (b.dragon.fear + b.dragon.hostility + b.dragon.trust) - (a.dragon.fear + a.dragon.hostility + a.dragon.trust));
      if (!known.length) { HB.text.draw(ctx, 'No one. Not yet.', x, y + 12, { size: 13, italic: true, color: P.inkSoft }); y += 20; }
      for (const f of known.slice(0, 4)) {
        const m2 = f.dragon, word = m2.trust > Math.max(m2.fear, m2.hostility) && m2.trust >= 8 ? 'trusts you' : m2.hostility >= 25 ? 'hates you' : m2.fear >= 20 ? 'fears you' : 'has heard of you';
        HB.text.draw(ctx, `${f.name}`, x, y + 13, { size: 13, family: 'sc', maxWidth: w * 0.58 });
        HB.text.draw(ctx, word, x + w, y + 13, { size: 13, italic: true, align: 'right', color: word === 'trusts you' ? P.good : word === 'hates you' ? P.bad : word === 'fears you' ? P.warn : P.inkSoft });
        y += 19;
      }
      const reacts = (st.reactions || []).slice(-3).reverse();
      if (reacts.length && y < c.y + c.h - 90) {
        HB.parchment.rule(ctx, x, y + 4, w, { ornament: false }); y += 16;
        HB.text.draw(ctx, 'How the world answered', x, y + 14, { size: 14, family: 'sc' }); y += 22;
        for (const r of reacts) {
          if (y > c.y + c.h - 40) break;
          y += HB.text.paragraph(ctx, r.text, x, y, w, { size: 12, lineHeight: 15, maxLines: 2 });
          if (r.cause) y += HB.text.paragraph(ctx, HB.fmt.cap(r.cause) + '.', x, y, w, { size: 12, lineHeight: 15, italic: true, color: P.inkSoft, maxLines: 2 });
          y += 6;
        }
      }
      // the names still to be earned, and what each would change
      const open = HB.TITLES.filter(T => !HB.renown.has(st, T.id));
      if (open.length && y < c.y + c.h - 80) {
        HB.parchment.rule(ctx, x, y + 4, w, { ornament: false }); y += 16;
        HB.text.draw(ctx, 'Names you could earn', x, y + 14, { size: 14, family: 'sc' }); y += 22;
        for (const T of open.map(T => ({ T, p: HB.renown.progress(st, T) })).sort((a, b) => b.p.frac - a.p.frac).map(o => o.T)) {
          if (y > c.y + c.h - 44) break;
          const p = HB.renown.progress(st, T);
          HB.text.draw(ctx, HB.fmt.cap(T.name(st, '…')), x, y + 13, { size: 13, family: 'sc', maxWidth: w - 60 });
          HB.text.draw(ctx, `${p.n}/${p.need}`, x + w, y + 13, { size: 13, align: 'right', color: P.inkSoft });
          y += 17;
          y += HB.text.paragraph(ctx, `${T.verb}: ${T.effect.charAt(0).toLowerCase() + T.effect.slice(1)}`, x, y, w, { size: 12, lineHeight: 14, italic: true, color: P.inkSoft, maxLines: 2 }) + 6;
        }
      }
      this.ui.draw(ctx);
    }
  }

  function bar(ctx, x, y, w, h, v, m, color, pending) {
    const P = HB.palette;
    HB.parchment.plaque(ctx, x, y, w, h, { fill: 'rgba(60,40,20,0.2)', color: P.ink, width: 1, radius: 2 });
    const f = HB.clamp(v / Math.max(1e-6, m), 0, 1), f2 = HB.clamp((v + pending) / Math.max(1e-6, m), 0, 1);
    if (f2 > f) { ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = color; ctx.fillRect(x + 2 + (w - 4) * f, y + 2, (w - 4) * (f2 - f), h - 4); ctx.restore(); }
    ctx.fillStyle = color; ctx.fillRect(x + 2, y + 2, (w - 4) * f, h - 4);
  }
  HB.goalBar = bar;
  HB.AimsScene = AimsScene;
})();

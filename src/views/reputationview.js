/* Reputation (map HUD → Reputation, F): how the world sees you. Three tabs:
 *  Your name: benevolence, titles and what they do, who has heard of you, who knows where you sleep, who is loyal;
 *  Realms: each realm's fear, trust, hostility and heat, what it has learned, its wars;
 *  Grudges: the grievance ledger (src/game/history.js), everyone sworn against you, and weregild where it can end it. */
(function () {
  const HB = globalThis.HB;
  if (!HB.isBrowser) return;

  const bar = (ctx, x, y, w, h, frac, col) => {
    ctx.fillStyle = 'rgba(90,70,40,0.15)'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = col; ctx.fillRect(x, y, Math.max(0, Math.min(1, frac)) * w, h);
    ctx.strokeStyle = 'rgba(43,26,14,0.45)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  };
  const STATUS = { sworn: ['Sworn', '#8f2b1f'], hunting: ['Hunting you now', '#8f2b1f'], dead: ['Dead', '#6a5a4a'], forgiven: ['Forgiven', '#5a7a2a'], inherited: ['Passed to an heir', '#7a5a3a'] };

  class ReputationScene {
    constructor(state, opts = {}) { this.state = state; this.opaque = false; this.ui = new HB.ui.UI(); this.tab = opts.tab || 'name'; }
    enter() { this.build(); }
    build() {
      const ui = this.ui, st = this.state; ui.clear();
      const w = 960, h = 640, x = (HB.W - w) / 2, y = (HB.H - h) / 2; Object.assign(this, { x, y, w, h });
      const tabs = [['name', 'Your name'], ['realms', 'Realms'], ['grudges', `Grudges (${st.memory.grudges.filter(g => g.active).length})`]];
      tabs.forEach(([id, label], i) => ui.add(new HB.ui.Button({ x: x + 30 + i * 196, y: y + 34, w: 186, h: 34, label, size: 15, primary: this.tab === id, onClick: () => { this.tab = id; this.build(); } })));
      ui.add(new HB.ui.Button({ x: x + w / 2 - 90, y: y + h - 54, w: 180, h: 40, label: 'Close', primary: true, hotkey: 'cancel', hotkeyLabel: 'Esc', onClick: () => HB.scenes.pop(this) }));
      ui.onCancel = () => HB.scenes.pop(this);
      if (this.tab === 'realms') this.buildRealms();
      if (this.tab === 'grudges') this.buildGrudges();
    }
    buildRealms() {
      const st = this.state, W = st.world, { x, y, w } = this;
      const known = W.factions.filter(f => f.dragon.known || f.subregions.some(s => st.know.subSeen[s]));
      known.sort((a, b) => (b.dragon.fear + b.dragon.trust + b.dragon.hostility) - (a.dragon.fear + a.dragon.trust + a.dragon.hostility));
      this.ui.add(new HB.ui.ListBox({ x: x + 24, y: y + 82, w: w - 48, h: 486, items: known, itemHeight: 92, emptyText: 'You know of no realms yet. Fly, and the map will tell you who rules the vales.',
        drawItem: (ctx, f, ix, iy, iw) => {
          const P = HB.palette, cap = f.capitalId !== null && f.capitalId !== undefined ? W.locations[f.capitalId] : null;
          HB.text.draw(ctx, `${f.name} — ${f.kind === 'human' ? 'a kingdom of men' : f.kind === 'dwarf' ? 'a dwarven realm' : f.kind === 'elf' ? 'an elven realm' : 'a goblin host'}, ruled by ${f.ruler.title} ${f.ruler.name}${cap ? ` from ${cap.name}` : ''}`, ix + 10, iy + 18, { size: 14, family: 'sc', maxWidth: iw - 20 });
          const D = f.dragon, cols = [['Fear', D.fear, '#7a3820'], ['Trust', D.trust, '#6a7a2a'], ['Hostility', D.hostility, '#8f2b1f']];
          cols.forEach(([label, v, col], k) => { const bx = ix + 10 + k * 190; HB.text.draw(ctx, `${label} ${Math.round(v)}`, bx, iy + 38, { size: 13, color: P.ink }); bar(ctx, bx + 92, iy + 29, 86, 10, v / 100, col); });
          const hl = HB.heat ? HB.heat.level(f) : null;
          if (hl) HB.text.draw(ctx, `${hl.name}: ${hl.effect}`, ix + 590, iy + 38, { size: 13, color: hl.id === 'calm' ? P.inkSoft : hl.id === 'hunting' ? P.bad : P.warn, maxWidth: iw - 600 });
          const learned = []; if (f.learned.lairFound) learned.push('knows where you sleep'); if (f.learned.escorts) learned.push('caravans ride escorted'); if (f.learned.vaults) learned.push('valuables locked in vaults'); if (f.learned.rescue) learned.push('nobles kept close'); if (f.learned.hunters) learned.push(`hunters funded (${f.learned.hunters})`);
          const wars = (f.atWar || []).map(id => W.factions[id].name);
          HB.text.draw(ctx, HB.preview.moodText(f), ix + 10, iy + 58, { size: 13, maxWidth: iw - 20 });
          HB.text.draw(ctx, `${learned.length ? HB.fmt.cap(learned.join(', ')) + '. ' : ''}${wars.length ? 'At war with ' + HB.fmt.list(wars) + '.' : 'At peace.'}`, ix + 10, iy + 77, { size: 12, italic: true, color: f.learned.lairFound ? P.bad : P.inkSoft, maxWidth: iw - 20 });
        } }));
    }
    ledger() {
      const H = HB.history, G = this.state.memory.grudges.slice();
      G.sort((a, b) => (b.active - a.active) || (b.active ? (b.level || 0) - (a.level || 0) : (b.year || 0) - (a.year || 0)));
      return G;
    }
    buildGrudges() {
      const st = this.state, W = st.world, H = HB.history, { x, y, w } = this;
      this.ui.add(new HB.ui.ListBox({ x: x + 24, y: y + 104, w: w - 48, h: 464, items: this.ledger(), itemHeight: 76, emptyText: 'Nobody has sworn vengeance on you yet. Burn enough, break a promise, or let a hunter live, and someone will.',
        onSelect: (g) => this.openGrudge(g),
        drawItem: (ctx, g, ix, iy, iw) => {
          const P = HB.palette, s = H.statusOf(g), [sl, sc] = STATUS[s] || STATUS.dead, f = g.factionId >= 0 ? W.factions[g.factionId] : null;
          ctx.save(); if (!g.active) ctx.globalAlpha *= 0.62;
          HB.text.draw(ctx, HB.fmt.cap(H.title(g)), ix + 10, iy + 19, { size: 15, family: 'sc', maxWidth: iw - 260 });
          HB.text.draw(ctx, sl, ix + iw - 10, iy + 19, { size: 13, align: 'right', family: 'sc', color: sc });
          if (g.active) for (let k = 0; k < Math.min(9, g.level || 1); k++) { ctx.fillStyle = '#8f2b1f'; ctx.beginPath(); ctx.arc(ix + iw - 16 - k * 11, iy + 34, 3.6, 0, Math.PI * 2); ctx.fill(); }
          HB.text.draw(ctx, `${H.KIND_NAMES[g.kind] || 'A grudge'}: ${g.text}${f ? ` (${f.name})` : ''}.`, ix + 10, iy + 40, { size: 13, maxWidth: iw - 130, color: P.ink });
          const last = g.log && g.log.length > 1 ? g.log[g.log.length - 1] : null;
          HB.text.draw(ctx, `Since Year ${g.year}${g.from ? ` · from ${g.from}` : ''}${g.meetings ? ` · survived you ${HB.fmt.plural(g.meetings, 'time')}` : ''}${last ? ` · Year ${last.year}: ${last.text}` : ''}`, ix + 10, iy + 60, { size: 12, italic: true, color: P.inkSoft, maxWidth: iw - 20 });
          ctx.restore();
        },
        itemTooltip: (g) => `${HB.fmt.cap(H.title(g))}. Tap for their story${H.canAmend(st, g).show ? ' and to offer weregild' : ''}.` }));
    }
    openGrudge(g) {
      const st = this.state, H = HB.history, c = H.canAmend(st, g);
      const story = (g.log || [{ year: g.year, text: g.text }]).map(e => `Year ${e.year}: ${e.text}.`).join('\n');
      const why = g.kind === 'hunter' ? (g.active ? `\n\nStrength ${g.level}. Sworn hunters cannot be bought; they lead attacks on your lair while you sleep, stronger each time they survive you.` : '') : g.active ? '\n\nA family, a betrayed village or a broken rising: weregild from your hoard can end it.' : '';
      const buttons = [];
      if (c.show) buttons.push({ label: `Pay weregild (${c.cost} gold)`, primary: c.ok, disabled: !c.ok, onClick: () => { const t = H.amend(st, g); HB.notice(HB.fmt.cap(H.title(g)), t, () => this.build()); if (HB.save) HB.save.autosave(st); } });
      buttons.push({ label: 'Close', cancel: true, primary: !c.ok });
      HB.modal({ title: HB.fmt.cap(H.title(g)), text: `${story}${why}${c.show && !c.ok ? `\n\n${c.reason}` : ''}`, buttons });
    }
    update(dt) { this.ui.update(dt); }
    draw(ctx) {
      const st = this.state, P = HB.palette, { x, y, w, h } = this;
      ctx.fillStyle = 'rgba(15,8,4,0.5)'; ctx.fillRect(0, 0, HB.W, HB.H);
      HB.parchment.panel(ctx, x, y, w, h, { title: 'Reputation', tone: 'light' });
      if (this.tab === 'name') this.drawName(ctx);
      if (this.tab === 'grudges') {
        const A = st.memory.grudges.filter(g => g.active), lead = HB.history.leadHunter(st), orders = HB.history.activeOrders(st);
        HB.text.paragraph(ctx, `${A.length ? `${HB.fmt.cap(HB.fmt.plural(A.length, 'grudge'))} still sworn against you.` : 'No grudge is sworn against you now.'}${lead ? ` The strongest, ${HB.history.title(lead)}, would lead the next hunt on your lair.` : ''}${orders.length ? ` Orders that train to kill dragons: ${HB.fmt.list(orders.map(o => o.name))}.` : ''}`, x + 30, y + 80, w - 60, { size: 13, italic: true, color: P.inkSoft, lineHeight: 16, maxLines: 2 });
      }
      this.ui.draw(ctx);
    }
    drawName(ctx) {
      const st = this.state, P = HB.palette, d = st.dragon, R = HB.renown, D = HB.domain, { x, y, w } = this;
      const lx = x + 30, lw = 440, rx = x + 500, rw = w - 530;
      let ly = y + 96;
      HB.text.draw(ctx, R ? R.displayName(st) : d.name, lx, ly, { size: 22, family: 'sc' }); ly += 14;
      // benevolence: feared ← → trusted
      const lean = D ? D.leaning(st) : null, a = d.alignment;
      HB.text.draw(ctx, `${lean ? lean.name : ''}: benevolence ${Math.round(a)}`, lx, ly + 18, { size: 14, color: a >= 10 ? '#5a6a1a' : a <= -10 ? '#7a2418' : P.inkSoft }); ly += 38;
      const gw = lw, gx = lx, g = ctx.createLinearGradient(gx, 0, gx + gw, 0);
      g.addColorStop(0, 'rgba(122,56,32,0.75)'); g.addColorStop(0.5, 'rgba(128,104,70,0.35)'); g.addColorStop(1, 'rgba(138,150,58,0.75)');
      ctx.fillStyle = g; ctx.fillRect(gx, ly, gw, 12); ctx.strokeStyle = P.inkSoft; ctx.strokeRect(gx + 0.5, ly + 0.5, gw - 1, 11);
      const mx = gx + (a + 100) / 200 * gw; ctx.fillStyle = P.ink; ctx.beginPath(); ctx.moveTo(mx, ly - 2); ctx.lineTo(mx - 6, ly - 10); ctx.lineTo(mx + 6, ly - 10); ctx.closePath(); ctx.fill();
      HB.text.draw(ctx, 'Feared', gx, ly + 28, { size: 12, italic: true, color: P.inkSoft }); HB.text.draw(ctx, 'Trusted', gx + gw, ly + 28, { size: 12, italic: true, align: 'right', color: P.inkSoft });
      ly += 44;
      HB.text.draw(ctx, 'Your names', lx, ly + 14, { size: 15, family: 'sc' }); ly += 22;
      const titles = R ? R.get(st).titles : [];
      if (!titles.length) { ly += HB.text.paragraph(ctx, 'No title yet. Deeds earn names, and names change how the world answers you (the Aims board shows how).', lx, ly, lw, { size: 13, italic: true, color: P.inkSoft, lineHeight: 16 }) + 4; }
      for (const t of titles.slice(-5)) { const T = HB.TITLE_BY_ID[t.id]; HB.text.draw(ctx, t.name, lx, ly + 13, { size: 14, family: 'sc', color: '#6a5414' }); ly += 17; ly += HB.text.paragraph(ctx, T ? T.effect : '', lx + 10, ly, lw - 10, { size: 12, italic: true, color: P.inkSoft, lineHeight: 14, maxLines: 2 }) + 4; }
      if (R) {
        const next = HB.TITLES.filter(T => !R.has(st, T.id)).map(T => ({ T, p: R.progress(st, T) })).filter(o => o.p.n > 0).sort((p, q) => q.p.frac - p.p.frac).slice(0, 2);
        for (const o of next) { HB.text.draw(ctx, `Toward a name: ${o.T.verb.toLowerCase()} (${o.p.n} of ${o.p.need})`, lx, ly + 13, { size: 13, color: P.inkSoft, maxWidth: lw }); ly += 18; }
      }
      // what the tales are made of
      const c = st.counters || {}, deeds = R ? R.get(st).deeds : {};
      const rows = [['Raids', c.raids], ['Gold stolen', c.goldStolen], ['Buildings burned', c.burned], ['Captives released', c.released], ['Villages defended', deeds.defended], ['Places protected', deeds.protected], ['Tributes won', c.tributes], ['Heroes slain', deeds.heroes]].filter(r => r[1]);
      if (rows.length) {
        ly += 10; HB.text.draw(ctx, 'What the tales are made of', lx, ly + 14, { size: 15, family: 'sc' }); ly += 22;
        rows.forEach(([label, v], i) => HB.text.draw(ctx, `${label}: ${HB.fmt.int(v)}`, lx + (i % 2) * 220, ly + 13 + Math.floor(i / 2) * 18, { size: 13, color: P.ink }));
      }
      // right column: who knows you, your lair, who is loyal, your domain
      let ry = y + 96;
      HB.text.draw(ctx, 'Who speaks of you', rx, ry, { size: 15, family: 'sc' }); ry += 8;
      const kb = R ? R.knownBy(st).slice(0, 4) : [];
      if (!kb.length) { ry += HB.text.paragraph(ctx, 'Nobody yet: you are a rumour in the hills.', rx, ry, rw, { size: 13, italic: true, color: P.inkSoft }) + 4; }
      for (const o of kb) { HB.text.draw(ctx, `${o.f.name}: ${HB.fmt.plural(o.n, 'deed')} told`, rx, ry + 14, { size: 13, maxWidth: rw }); ry += 18; }
      ry += 10; HB.text.draw(ctx, 'Your lair', rx, ry + 6, { size: 15, family: 'sc' }); ry += 12;
      const lf = D ? D.get(st).lairFound : null, known = D ? D.lairKnown(st) : false;
      const lairText = !known ? 'Hidden: nobody knows where you sleep. No offerings come, and no hunters.' : lf ? `Known since Year ${lf.year}: ${lf.how}. Offerings come to your hill, and so will hunters.` : 'Known: the people who live and pay around your hill know where you sleep. Offerings come, and so will hunters.';
      ry += HB.text.paragraph(ctx, lairText, rx, ry, rw, { size: 13, color: known ? P.ink : P.inkSoft, lineHeight: 16, maxLines: 3 }) + 6;
      HB.text.draw(ctx, 'Loyal to you', rx, ry + 10, { size: 15, family: 'sc' }); ry += 16;
      const loy = st.memory.loyalties.slice(-4);
      if (!loy.length) { ry += HB.text.paragraph(ctx, 'Nobody owes you their loyalty yet. Release captives, protect villages, keep your word.', rx, ry, rw, { size: 13, italic: true, color: P.inkSoft, lineHeight: 16, maxLines: 2 }) + 4; }
      for (const l of loy) { ry += HB.text.paragraph(ctx, `${HB.fmt.cap(l.name)} ${l.text}.`, rx, ry, rw, { size: 13, lineHeight: 16, maxLines: 2 }) + 3; }
      if (D) {
        ry += 8; HB.text.draw(ctx, 'Your domain', rx, ry + 10, { size: 15, family: 'sc' }); ry += 16;
        const counts = {}; for (const m of D.members(st)) counts[m.status] = (counts[m.status] || 0) + 1;
        const parts = Object.keys(counts).map(k => `${counts[k]} ${HB.DOMAIN_STATUSES[k].name.toLowerCase()}`);
        HB.text.paragraph(ctx, parts.length ? `${HB.fmt.cap(HB.fmt.list(parts))}. Your territory reaches ${Math.round(D.lairRadius(st).r)} leagues from the lair.` : `No settlement is yours yet. Your territory reaches ${Math.round(D.lairRadius(st).r)} leagues from the lair.`, rx, ry, rw, { size: 13, lineHeight: 16, maxLines: 3 });
      }
    }
  }
  HB.ReputationScene = ReputationScene;
  HB.RealmsScene = ReputationScene; // the map's Realms button and the F key open it
})();

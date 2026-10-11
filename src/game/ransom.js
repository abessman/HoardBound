/* Captives and ransom: demands, likely ranges, risks, one-time resolution. Headless-safe. */
(function () {
  const HB = globalThis.HB;

  const ransom = HB.ransom = {
    payerName(state, c) {
      const f = c.factionId >= 0 ? state.world.factions[c.factionId] : null;
      const k = HB.CAPTIVE_KINDS[c.kind] || HB.CAPTIVE_KINDS.noble;
      if (k.payer === 'house' && c.house) return c.house;
      if (k.payer === 'guild') return `the merchants of ${c.from || (f ? f.name : 'the realm')}`;
      if (k.payer === 'church') return 'the faithful';
      return f ? f.name : 'their people';
    },
    /** likely gold range for a captive */
    range(state, c) {
      const k = HB.CAPTIVE_KINDS[c.kind] || HB.CAPTIVE_KINDS.noble;
      const s = state.dragon.stats;
      const f = c.factionId >= 0 ? state.world.factions[c.factionId] : null;
      const wealthMul = f ? 1 + Math.min(1, (f.subregions.length || 10) / 30) : 1;
      const dom = 1 + s.dominance / 150 + (s.ransomBonus || 0);
      const lo = Math.round(k.ransom[0] * wealthMul * dom), hi = Math.round(k.ransom[1] * wealthMul * dom);
      return [lo, hi];
    },
    options(state, c) {
      const [lo, hi] = ransom.range(state, c);
      const f = c.factionId >= 0 ? state.world.factions[c.factionId] : null;
      const rescueRisk = f ? Math.min(0.6, 0.08 + f.learned.rescue * 0.12 + (f.dragon.hostility > 40 ? 0.1 : 0)) : 0.05;
      const opts = [
        { id: 'gold', label: 'Demand gold', desc: `Likely ${HB.fmt.int(lo)}–${HB.fmt.int(hi)} gold from ${ransom.payerName(state, c)}.`, amount: Math.round((lo + hi) / 2), accept: 0.7 },
        { id: 'high', label: 'Demand a king’s ransom', desc: `Ask for ${HB.fmt.int(hi * 2)} gold. They may refuse, stall, or cheat you.`, amount: hi * 2, accept: 0.35 },
        { id: 'treasure', label: 'Demand a treasure', desc: 'Ask for a named heirloom or jewel instead of coin. Worth more to the hoard; harder to get.', accept: 0.45 },
        { id: 'livestock', label: 'Demand livestock', desc: 'A herd driven to the foot of the hill: food for a year, little gold. Easily granted.', accept: 0.9 },
        { id: 'concession', label: 'Demand a concession', desc: f ? `${f.name} calls off its hunters and lowers its hostility toward you. Needs a captive they care about.` : 'No realm to bargain with.', accept: 0.5, disabled: !f || !(c.kind === 'noble' || c.kind === 'official' || c.kind === 'knight' || c.kind === 'heir') },
      ];
      return { opts, rescueRisk, lo, hi };
    },
    demand(state, c, opt) {
      if (c.pending) return { ok: false, reason: 'A demand is already out' };
      const { rescueRisk } = ransom.options(state, c);
      c.pending = { kind: opt.id, amount: opt.amount || 0, daysLeft: 8 + Math.round(HB.game.rng.between(6, 30)), accept: Math.min(0.97, opt.accept + (HB.renown && HB.renown.has(state, 'merciful') ? 0.15 : 0)), rescueRisk, sent: state.time.totalDays };
      HB.game.chronicle(state, `Sent a ransom demand for ${c.name} to ${ransom.payerName(state, c)}.`, 'ransom');
      return { ok: true, days: c.pending.daysLeft };
    },
    release(state, c) {
      const i = state.lair.captives.indexOf(c); if (i >= 0) state.lair.captives.splice(i, 1);
      const f = c.factionId >= 0 ? state.world.factions[c.factionId] : null;
      if (f) { if (HB.factions) HB.factions.adjust(state, f, { trust: 6, hostility: -4 }, `released ${c.name}`); else { f.dragon.trust += 6; f.dragon.hostility = Math.max(0, f.dragon.hostility - 4); } }
      state.dragon.alignment = HB.clamp(state.dragon.alignment + 4, -100, 100);
      state.counters.released++;
      if (HB.history) HB.history.onRelease(state, c);
      if (HB.renown) HB.renown.record(state, 'released', { factionId: c.factionId, place: c.from });
      if (HB.consequences) HB.consequences.react(state, `${c.house || 'The family of ' + c.name} remembers your mercy. They may send gifts, and warning of hunters.`, `because you let ${c.name} go unharmed`);
      HB.game.chronicle(state, `Released ${c.name} unharmed.`, 'ransom');
    },
    /** resolve pending demands as days pass; returns events */
    tickDays(state, days) {
      const ev = [];
      const rng = HB.game.rng;
      for (const c of state.lair.captives.slice()) {
        if (!c.pending) continue;
        c.pending.daysLeft -= days;
        if (c.pending.daysLeft > 0) continue;
        const p = c.pending; c.pending = null;
        const f = c.factionId >= 0 ? state.world.factions[c.factionId] : null;
        const roll = rng.next();
        const remove = () => { const i = state.lair.captives.indexOf(c); if (i >= 0) state.lair.captives.splice(i, 1); c.ransomed = true; state.counters.ransoms++; };
        if (roll < p.rescueRisk) {
          // rescue attempt against the lair
          const def = HB.lair.values(state).defense + (state.phase === 'home' ? 15 : 0);
          const strength = 20 + rng.int(30) + (f ? f.learned.rescue * 8 : 0);
          if (strength > def) { remove(); ev.push({ text: `A rescue party slipped into the lair while you were away and freed ${c.name}. The ransom is lost.`, bad: true }); if (f) f.learned.hunters++; }
          else { ev.push({ text: `A rescue party tried the lair for ${c.name} and was driven off by your defences. ${f ? f.name : 'They'} will pay now.` }); const g = Math.round(p.amount * 0.8); state.hoard.gold += g; remove(); if (f && HB.factions) HB.factions.adjust(state, f, { hostility: 5, fear: 4 }, 'failed rescue'); }
          continue;
        }
        if (roll < p.rescueRisk + (1 - p.accept) * 0.7) {
          // refusal or stalling
          if (rng.chance(0.5)) ev.push({ text: `${HB.fmt.cap(ransom.payerName(state, c))} refused your demand for ${c.name}. They remain your captive; you could ask for less, or let them go.`, bad: true });
          else { c.pending = Object.assign({}, p, { daysLeft: 10 + rng.int(20) }); ev.push({ text: `${HB.fmt.cap(ransom.payerName(state, c))} asks for more time to raise the ransom for ${c.name}.` }); }
          continue;
        }
        if (rng.chance(0.15 + (f ? f.dragon.hostility / 300 : 0))) {
          // deception: short payment
          const g = Math.round(p.amount * 0.4); state.hoard.gold += g; remove();
          ev.push({ text: `A chest arrived for ${c.name}: ${HB.fmt.int(g)} gold under a thin layer of real coin and a thick layer of lead. You released the captive before you counted it.`, bad: true });
          if (f && HB.factions) HB.factions.adjust(state, f, { fear: 2 }, 'cheated the dragon');
          continue;
        }
        // paid
        if (p.kind === 'gold' || p.kind === 'high') { state.hoard.gold += p.amount; remove(); ev.push({ text: `${HB.fmt.cap(ransom.payerName(state, c))} paid ${HB.fmt.int(p.amount)} gold for ${c.name}. The coin lies at the foot of the hill, and so does their goodwill.` }); if (f && HB.factions) HB.factions.adjust(state, f, { hostility: 3, fear: 3 }, 'paid ransom'); }
        else if (p.kind === 'treasure') { const it = HB.hoard.makeItem(rng.pick(HB.LOOT.royal.concat(HB.LOOT.gems)), rng, `ransom of ${c.name}`, state.time.year); it.value = Math.round(it.value * 1.6); HB.hoard.addToHoard(state, it); remove(); ev.push({ text: `For ${c.name}, ${ransom.payerName(state, c)} sent ${HB.hoard.itemLabel(it)}.` }); if (f && HB.factions) HB.factions.adjust(state, f, { hostility: 3, fear: 3 }, 'paid ransom'); }
        else if (p.kind === 'livestock') { state.lair.larderStock = (state.lair.larderStock || 0) + 4; state.dragon.health = state.dragon.stats.maxHealth; remove(); ev.push({ text: `A herd was driven to the foot of the hill for ${c.name}. You eat well for a season.` }); }
        else if (p.kind === 'concession') { if (f) { if (HB.factions) HB.factions.adjust(state, f, { hostility: -20, trust: 4 }, 'concession'); else f.dragon.hostility = Math.max(0, f.dragon.hostility - 20); f.learned.hunters = Math.max(0, f.learned.hunters - 1); } remove(); ev.push({ text: `${f ? f.name : 'They'} agreed: the hunters are called off and ${c.name} walks home.` }); state.dragon.alignment = HB.clamp(state.dragon.alignment + 2, -100, 100); }
        HB.stats.recompute(state);
        HB.game.chronicle(state, ev[ev.length - 1].text, 'ransom');
      }
      return ev;
    },
    describe(state, c) {
      const k = HB.CAPTIVE_KINDS[c.kind] || HB.CAPTIVE_KINDS.noble;
      return `${c.name}, ${k.label} taken at ${c.from} in Year ${c.year}. ${k.desc}${c.pending ? ` A demand is out (${Math.max(1, Math.ceil(c.pending.daysLeft))} days until an answer).` : ''}`;
    },
  };
})();

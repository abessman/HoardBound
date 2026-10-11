/* Heat, hunting parties and pursuit: how realms answer a dragon in the short term, while it is awake. Headless-safe.
 * Heat rises with thefts and fire, cools with time and good deeds, and steps through Calm → Wary → Guarded → Hunting.
 * Each step changes the world (escorts, locked valuables, a named party that tracks you across the map). */
(function () {
  const HB = globalThis.HB;

  HB.HEAT_LEVELS = [
    { id: 'calm', name: 'Calm', min: 0, effect: 'Going about their business.' },
    { id: 'wary', name: 'Wary', min: 25, effect: 'Merchants hire more guards.' },
    { id: 'guarded', name: 'Guarded', min: 50, effect: 'Caravans ride in convoys; villages lock their valuables away and post watchmen.' },
    { id: 'hunting', name: 'Hunting', min: 75, effect: 'A hunting party is tracking you across the map.' },
  ];

  const heat = HB.heat = {
    get(f) { return f && f.dragon ? f.dragon.heat || 0 : 0; },
    levelOf(f) { const h = heat.get(f); let i = 0; for (let k = 0; k < HB.HEAT_LEVELS.length; k++) if (h >= HB.HEAT_LEVELS[k].min) i = k; return i; },
    level(f) { return HB.HEAT_LEVELS[heat.levelOf(f)]; },
    /** change a realm's heat; stepping up a level changes the world and is logged with its cause */
    add(state, f, amount, cause) {
      if (!f || !amount) return 0;
      const before = heat.levelOf(f);
      f.dragon.heat = HB.clamp(heat.get(f) + amount, 0, 100);
      const after = heat.levelOf(f);
      if (after > before) for (let lv = before + 1; lv <= after; lv++) heat.onLevelUp(state, f, lv, cause);
      if (after < 3 && before >= 3) heat.callOff(state, f);
      return after - before;
    },
    onLevelUp(state, f, lv, cause) {
      const L = HB.HEAT_LEVELS[lv];
      const why = cause ? `because ${cause}` : '';
      if (lv === 1) {
        for (const e of state.entities) if (e.kind === 'caravan' && e.factionId === f.id && !e.dead) e.escort = Math.min(5, (e.escort || 0) + 1);
        HB.consequences.react(state, `${f.name} is wary of you. Its merchants hire more guards.`, why);
      } else if (lv === 2) {
        for (const e of state.entities) if (e.kind === 'caravan' && e.factionId === f.id && !e.dead) { e.escort = Math.min(5, (e.escort || 0) + 1); e.convoy = true; }
        HB.consequences.react(state, `${f.name} is on guard: caravans ride in convoys, and villages lock their valuables away and post watchmen.`, why);
      } else if (lv === 3) {
        const e = HB.hunters.spawn(state, { factionId: f.id, level: 1 + state.dragon.tier + Math.min(2, Math.floor(f.learned.hunters / 2)), reason: `${f.name} wants you dead`, mercenary: true });
        if (e) f.dragon.huntParty = e.id;
        HB.consequences.react(state, `${f.name} has sent ${e ? e.name : 'hunters'} after you. They are tracking you across the map.`, why);
      }
      if (HB.isBrowser && HB.flow && HB.flow.map && state.phase !== 'sleeping') HB.flow.map.showToast(`${f.name}: ${L.name}`, 3.5);
    },
    /** cooled below Hunting: hired hunters go home (sworn enemies do not) */
    callOff(state, f) {
      const e = state.entities.find(x => x.id === f.dragon.huntParty && !x.dead);
      if (e && e.mercenary) { e.dead = true; HB.consequences.react(state, `${e.name} gave up the hunt and went home.`, `because ${f.name} has calmed down`); }
      f.dragon.huntParty = null;
    },
    /** heat cools with time: about a level a season while awake; a long sleep resets it */
    decay(state, days) {
      for (const f of state.world.factions) {
        if (!heat.get(f)) continue;
        const before = heat.levelOf(f);
        f.dragon.heat = Math.max(0, heat.get(f) - (days >= 300 ? 60 : days * 0.28));
        if (before >= 3 && heat.levelOf(f) < 3) heat.callOff(state, f);
      }
    },
    /** words for a realm's state, for previews and the Aims board */
    describe(f) { const L = heat.level(f); return L.id === 'calm' ? '' : `${L.name}: ${L.effect.charAt(0).toLowerCase() + L.effect.slice(1)}`; },
  };

  // ---------------------------------------------------------------- hunting parties
  const hunters = HB.hunters = {
    /** a named party that walks toward the dragon (or its lair) until it catches up, gives up, or is beaten */
    spawn(state, o) {
      const W = state.world, d = state.dragon, rng = HB.game.rng;
      const f = o.factionId >= 0 ? W.factions[o.factionId] : null;
      let from = o.from || null;
      if (!from && f) { const cands = W.locations.filter(L => L.factionId === f.id && ['castle', 'town', 'city', 'hold'].includes(L.type) && L.state === 'normal'); cands.sort((a, b) => Math.hypot(a.x - d.x, a.y - d.y) - Math.hypot(b.x - d.x, b.y - d.y)); from = cands[0] || null; }
      if (!from) { const n = HB.world.nearest(W, d.x, d.y, L => L.type !== 'lair' && Math.hypot(L.x - d.x, L.y - d.y) > 10); from = n ? n.L : null; }
      if (!from) return null;
      const culture = f ? f.culture : 'westron';
      const leader = o.leader || HB.names.person(rng, culture, false);
      const e = { id: HB.nextId('ent'), kind: 'hunters', name: o.name || `${leader}’s riders`, leader, level: Math.max(1, o.level || 1), factionId: o.factionId === undefined ? -1 : o.factionId, x: from.x, y: from.y, speed: 4 + (o.level || 1) * 0.5, reason: o.reason || 'hunting you', mercenary: !!o.mercenary, sitId: o.sitId || null, since: state.time.totalDays, giveUpDay: state.time.totalDays + (o.days || 60), restUntil: 0, lance: (o.level || 1) >= 2, dead: false };
      state.entities.push(e);
      // a sworn hunter outlives the season: they lead attacks on the sleeping dragon too
      if (!o.mercenary && HB.history) state.memory.grudges.push({ id: HB.nextId('gr'), name: leader, kind: 'hunter', from: from.name, factionId: e.factionId, year: state.time.year, level: e.level + 1, text: o.reason || 'swore to kill the dragon', active: true, entityId: e.id });
      return e;
    },
    /** daily movement; sets state.ambush when a party reaches the dragon */
    tick(state, days) {
      const W = state.world, d = state.dragon, now = state.time.totalDays;
      const away = Math.hypot(d.x - W.home.x, d.y - W.home.y) > 0.5;
      for (const e of state.entities) {
        if (e.kind !== 'hunters' || e.dead) continue;
        if (now >= e.giveUpDay) { e.dead = true; HB.consequences.react(state, `${e.name} gave up the hunt.`, 'because they could not find you'); continue; }
        if (now < e.restUntil) continue;
        const tx = away ? d.x : W.home.x, ty = away ? d.y : W.home.y;
        const dx = tx - e.x, dy = ty - e.y, dist = Math.hypot(dx, dy);
        const step = Math.min(dist, e.speed * days);
        if (dist > 1e-6) { e.x += dx / dist * step; e.y += dy / dist * step; }
        if (Math.hypot(d.x - e.x, d.y - e.y) < 1.5 && state.phase !== 'sleeping' && !state.ambush) state.ambush = e.id;
      }
    },
    find(state, id) { return state.entities.find(e => e.id === id && !e.dead) || null; },
    /** what the party is, in words */
    describe(state, e) { const f = e.factionId >= 0 ? state.world.factions[e.factionId] : null; return `${e.name}${f ? ' of ' + f.name : ''}: ${e.reason}. ${e.level >= 3 ? 'Veterans with dragon-lances.' : e.level >= 2 ? 'Armed for dragons.' : 'Brave, and not much more.'}`; },
    /** answer an ambush: 'fight' starts the raid (returns the raid headless), 'flee', or 'pay' */
    resolveAmbush(state, choice, map) {
      const e = hunters.find(state, state.ambush); state.ambush = null;
      if (!e) return 'They are gone.';
      const d = state.dragon;
      if (choice === 'fight') { state.phase = 'planning'; return HB.encounter.begin(state, e, map, { direct: true }); }
      if (choice === 'pay') {
        const cost = hunters.price(e);
        if (!e.mercenary || state.cargo.gold < cost) return 'They will not be bought.';
        state.cargo.gold -= cost; e.dead = true;
        const f = e.factionId >= 0 ? state.world.factions[e.factionId] : null;
        if (f) heat.add(state, f, -25);
        HB.game.chronicle(state, `Paid ${e.name} ${HB.fmt.int(cost)} gold to go home.`, 'hunters');
        return `${e.leader} weighs the gold and turns away. "We never found you."`;
      }
      // flee: costs stamina; the smoke-glass shakes them off for good
      d.stamina = Math.max(0, Math.round(d.stamina - d.stats.maxStamina * 0.25));
      if (HB.caps.has(state, 'smoke')) { e.dead = true; HB.consequences.react(state, `${e.name} lost your trail for good.`, 'because the Smoke-Glass hid you'); return 'You look through the Smoke-Glass and are suddenly somewhere else. Behind you, the riders argue about which way you went.'; }
      const ang = Math.atan2(e.y - d.y, e.x - d.x);
      e.x = d.x + Math.cos(ang) * 7; e.y = d.y + Math.sin(ang) * 7; e.restUntil = state.time.totalDays + 4;
      return `You climb hard and leave them shouting below. They will pick up your trail again in a few days.`;
    },
    price(e) { return 80 + e.level * 60; },
  };

  // ---------------------------------------------------------------- pursuit after a raid
  const pursuit = HB.pursuit = {
    LOSE_DIST: 8, GIVE_UP_DAYS: 6,
    /** riders set out after a loud raid. Returns a sentence for the summary. */
    start(state, target, r) {
      if (!r || !r.pursued || r.outcome === 'defeated') return null;
      const f = target.factionId >= 0 ? state.world.factions[target.factionId] : null;
      if (HB.caps.has(state, 'smoke')) return 'Riders set out after you, and lose you at once: the Smoke-Glass hides your going.';
      state.pursuit = { factionId: f ? f.id : -1, fromX: target.x, fromY: target.y, since: state.time.totalDays, from: target.name || 'the road' };
      return null;
    },
    active(state) { return !!state.pursuit; },
    /** landing far enough from the raid breaks the trail */
    onArrive(state, L) {
      const p = state.pursuit; if (!p || L.type === 'lair') return null;
      if (Math.hypot(L.x - p.fromX, L.y - p.fromY) >= pursuit.LOSE_DIST) { state.pursuit = null; return `You lose the riders from ${p.from}.`; }
      return null;
    },
    tick(state) { const p = state.pursuit; if (p && state.time.totalDays - p.since >= pursuit.GIVE_UP_DAYS) { state.pursuit = null; return true; } return false; },
    /** arriving home with riders on your trail shows them where you sleep */
    onHome(state) {
      const p = state.pursuit; if (!p) return null;
      state.pursuit = null;
      const f = p.factionId >= 0 ? state.world.factions[p.factionId] : null;
      state.lair.attention = (state.lair.attention || 0) + 4;
      if (f) { f.learned.lairFound = (f.learned.lairFound || 0) + 1; HB.consequences.react(state, `Riders from ${f.name} followed you home. They know where you sleep.`, `because you flew straight home from ${p.from} with them on your trail`); }
      HB.game.chronicle(state, `Riders followed the dragon home from ${p.from}.`, 'hunters');
      return `Riders${f ? ' of ' + f.name : ''} followed you home from ${p.from}. They know where you sleep now: thieves and hunters will find the lair more easily.`;
    },
    short(state) { const p = state.pursuit; if (!p) return ''; const left = Math.max(1, pursuit.GIVE_UP_DAYS - (state.time.totalDays - p.since)); return `Riders from ${p.from} are on your trail: land ${pursuit.LOSE_DIST}+ leagues away or wait ${HB.fmt.plural(Math.ceil(left), 'day')}, or they follow you home.`; },
    hint(state) {
      const p = state.pursuit; if (!p) return '';
      const left = Math.max(1, pursuit.GIVE_UP_DAYS - (state.time.totalDays - p.since));
      return `Riders from ${p.from} are on your trail. Fly home now and they follow. To lose them, land somewhere ${pursuit.LOSE_DIST}+ leagues from ${p.from}, or rest until they give up (${HB.fmt.plural(Math.ceil(left), 'day')}).`;
    },
    /** how many realms know where you sleep */
    /** how many realms know where you sleep (each counts once, however often they followed you) */
    lairFoundCount(state) { return state.world.factions.reduce((a, f) => a + (f.learned.lairFound ? 1 : 0), 0); },
  };
})();

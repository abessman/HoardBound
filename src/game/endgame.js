/* The great struggle (endgame). One opposition per world, fixed when the dragon comes into its power (adult) with
 * its rule leaning one way: a kind dragon faces the Hollow King and three lieutenants who sustain him; a cruel dragon
 * hunts the six Crystals of Life, after which the god of the world answers. Headless-safe.
 * Tables: src/data/endgame.js. How it plays: docs/systems/endgame.md. Prototype: one lieutenant (the Warlord) and
 * one crystal (Greenmarrow) can be fought; the others are placed, named and described; the final battles are not built. */
(function () {
  const HB = globalThis.HB;
  const TT = () => HB.TERRAIN;
  const TERR = (names) => names.map(n => ({ plains: TT().PLAINS, forest: TT().FOREST, pine: TT().PINE, hills: TT().HILLS, mountains: TT().MOUNTAINS, peaks: TT().PEAKS, swamp: TT().SWAMP }[n]));

  const eg = HB.endgame = {
    fresh() { return { path: null, foreshadowed: false, began: null, announced: true, foe: null, god: null, fortressId: null, lieutenants: [], crystals: [] }; },
    get(state) { if (!state.endgame) state.endgame = eg.fresh(); return state.endgame; },
    active(state) { return !!eg.get(state).path; },
    signature(state) { const E = eg.get(state); return `${E.path}|${E.lieutenants.map(l => l.alive ? 1 : 0).join('')}|${E.crystals.map(c => c.taken ? 1 : 0).join('')}`; },
    lieutenantDef(id) { return HB.ENDGAME.shadow.lieutenants.find(l => l.id === id); },
    crystalDef(id) { return HB.ENDGAME.crystals.list.find(c => c.id === id); },
    lieutenantAt(state, L) { return eg.get(state).lieutenants.find(l => l.locId === L.id) || null; },
    crystalAt(state, L) { return eg.get(state).crystals.find(c => c.locId === L.id) || null; },
    isPlace(state, L) { return !!L && (L.type === 'stronghold' || L.type === 'sanctuary' || L.type === 'fortress'); },
    living(state) { return eg.get(state).lieutenants.filter(l => l.alive); },
    taken(state) { return eg.get(state).crystals.filter(c => c.taken); },
    /** what is needed before the struggle begins */
    ready(state) { const p = HB.domain ? HB.domain.path(state).id : 'undecided'; return { adult: state.dragon.tier >= 2, leaning: p !== 'undecided', pathId: p }; },
    // ---------- beginning
    /** check on every return home and every sleeping year; returns the text if something happened */
    check(state, rng, log) {
      const E = eg.get(state);
      if (E.path) return null;
      const f = eg.foreshadow(state, log);
      const r = eg.ready(state);
      if (!r.adult || !r.leaning) return f;
      return eg.begin(state, r.pathId === 'benevolent' ? 'shadow' : 'crystals', rng, log);
    },
    /** before it begins: a rumour of what is coming, once */
    foreshadow(state, log) {
      const E = eg.get(state), d = state.dragon;
      if (E.foreshadowed || E.path || d.tier < 1 || d.age < 25) return null;
      const lean = HB.domain ? HB.domain.leaning(state).id : 'undecided';
      if (lean === 'undecided') return null;
      E.foreshadowed = true;
      const text = lean === 'benevolent' ? 'Refugees from the far places speak of ash on the wind, and of a king under the mountains who will not stay dead.' : 'In every realm priests pray over six Crystals of Life, and pray that no dragon ever learns where they lie.';
      if (HB.consequences) HB.consequences.react(state, text, 'because you are becoming a power the world will have to answer');
      if (log) log(text);
      return text;
    },
    begin(state, path, rng, log) {
      const E = eg.get(state), D = HB.ENDGAME, year = state.time.year;
      E.path = path; E.began = year; E.announced = false;
      let text;
      if (path === 'shadow') {
        const foe = rng.pick(D.shadow.foe.names);
        E.foe = { name: foe, title: D.shadow.foe.title };
        const fort = eg.makePlace(state, rng, 'fortress', D.shadow.foe.place, { far: true, maxTier: 2, terrains: ['mountains', 'hills', 'plains'] }, { foe: true });
        E.fortressId = fort ? fort.id : null;
        const where = { warlord: { minD: 22, maxD: 55, maxTier: 2, terrains: ['plains', 'hills'] }, sorcerer: { minD: 45, maxD: 110, maxTier: 2, terrains: ['hills', 'mountains', 'plains'] }, blightmother: { minD: 40, maxD: 110, maxTier: 2, terrains: ['swamp', 'forest'] } };
        E.lieutenants = D.shadow.lieutenants.map((def, i) => { const name = rng.pick(def.names); const L = eg.makePlace(state, rng, 'stronghold', def.siteName(name), where[def.id], { lieutenant: def.id }); return { id: def.id, name, locId: L ? L.id : null, alive: true, found: i === 0, defeatedYear: null }; });
        const first = E.lieutenants[0];
        if (first.locId !== null) eg.reveal(state, state.world.locations[first.locId], true);
        if (fort) eg.reveal(state, fort, false);
        text = D.shadow.intro(foe, D.shadow.foe.title);
      } else {
        E.god = Object.assign({}, D.crystals.god);
        const used = new Set();
        E.crystals = D.crystals.list.map((def, i) => {
          const o = i === 0 ? { minD: 18, maxD: 55, maxTier: 2 } : def.far ? { minTier: 3, far: true } : { minD: 35, maxD: 150, minTier: 1, maxTier: i < 3 ? 2 : 3 };
          const L = eg.makePlace(state, rng, 'sanctuary', def.siteName.charAt(0).toUpperCase() + def.siteName.slice(1), Object.assign({ terrains: def.terrain, avoidRegions: used }, o), { crystal: def.id });
          if (L) used.add(L.regionId);
          return { id: def.id, locId: L ? L.id : null, found: i === 0, taken: null };
        });
        const first = E.crystals[0];
        if (first.locId !== null) eg.reveal(state, state.world.locations[first.locId], true);
        for (const f of state.world.factions) if (f.dragon.known) f.dragon.hostility = Math.min(100, f.dragon.hostility + 5);
        text = `The Crystals of Life have been named to you. ${D.crystals.intro()}`;
      }
      HB.game.chronicle(state, text, 'legend');
      if (HB.consequences) HB.consequences.react(state, text, path === 'shadow' ? 'because you came into your power as a protector, and the dark answers protectors' : 'because you came into your power as a tyrant, and only the world’s heart still stands against you');
      if (log) log(text);
      if (HB.domain) HB.domain.bump(state);
      return text;
    },
    /** make a new place for the struggle on a suitable empty cell (positions are saved; see save.js DYN_FIELDS) */
    makePlace(state, rng, type, name, o, extra) {
      const W = state.world, H = W.home, terrains = o.terrains ? TERR(o.terrains) : null;
      const pick = (strict) => {
        const cands = [];
        for (let t = 0; t < 7000 && cands.length < 400; t++) {
          const i = rng.int(W.w * W.h), tt = W.terrain[i];
          if (!HB.isLand(tt) || W.locAt[i] >= 0) continue;
          const rid = W.region[i]; if (rid < 0) continue;
          const tier = W.regions[rid].tier;
          if (tier > (o.maxTier !== undefined ? o.maxTier : 3) || tier < (o.minTier || 0)) continue;
          if (strict && o.avoidRegions && o.avoidRegions.has(rid)) continue;
          if (strict && terrains && !terrains.includes(tt)) continue;
          const x = i % W.w, y = (i / W.w) | 0, d = Math.hypot(x - H.x, y - H.y);
          if (!o.far && (d < (o.minD || 0) || d > (o.maxD || 999))) continue;
          if (HB.world.locationsNear(W, x, y, 2.5).length) continue;
          cands.push({ i, x, y, d, rid });
        }
        return cands;
      };
      let cands = pick(true); if (!cands.length) cands = pick(false);
      if (!cands.length) return null;
      cands.sort((a, b) => o.far ? b.d - a.d : a.d - b.d);
      const c = cands[o.far ? 0 : Math.min(cands.length - 1, rng.int(Math.min(6, cands.length)))];
      const S = W.subregions[W.sub[c.i]];
      const L = Object.assign({ id: W.locations.length, type, name, x: c.x, y: c.y, cell: c.i, subId: S.id, regionId: c.rid, factionId: S.factionId, tier: 3, pop: 0, wealth: 2000, wealthMax: 2000, defense: 80, defenseBase: 80, state: 'normal', special: null, ruler: null, memory: [], fear: 0, trust: 0, lastRaidYear: -999, knowledge: { seen: false, scoutedYear: -1, raided: false }, flags: {}, founded: state.time.year, capital: false }, extra || {});
      W.locations.push(L); W.locAt[c.i] = L.id; S.locations.push(L.id);
      if (state.know.revealed[c.i]) L.knowledge.seen = true;
      return L;
    },
    /** make a place known: seen (with a little of the land around it), or only rumoured */
    reveal(state, L, seen) {
      if (!L) return;
      if (seen && HB.world.canEnterRegion(state, L.regionId)) HB.world.sight(state, L, 1.6);
      HB.world.rumor(state, L.x, L.y, 4); L.knowledge.rumored = true;
    },
    // ---------- while the struggle goes on
    /** the Warlord's hosts march on the places that trust you */
    tickDays(state, days, rng) {
      const E = eg.get(state);
      if (E.path !== 'shadow') return;
      const wl = E.lieutenants.find(l => l.id === 'warlord' && l.alive);
      if (!wl || state.world.locations.some(L => L.threat && L.threat.host)) return;
      if (rng.chance(days >= 300 ? 0.5 : Math.min(0.4, days * 0.01))) eg.hostStrike(state, rng, wl, days >= 300);
    },
    hostStrike(state, rng, wl, asleep) {
      const W = state.world, H = W.home, now = state.time.totalDays;
      const kind = HB.domain ? HB.domain.members(state).filter(m => (m.status === 'protected' || m.status === 'allied') && m.L.state === 'normal' && !m.L.threat).map(m => m.L) : [];
      let L = kind.length ? rng.pick(kind) : null;
      if (!L) { const n = HB.world.nearest(W, H.x, H.y, V => (V.type === 'farm' || V.type === 'village' || V.type === 'town') && V.state === 'normal' && !V.threat && V.knowledge.seen); L = n && n.d <= 30 ? n.L : null; }
      if (!L) return null;
      const camp = W.locations[wl.locId];
      L.threat = { campId: camp ? camp.id : -1, campName: `the host of ${wl.name}`, goblin: false, orc: true, host: true, since: now, until: now + (asleep ? 30 : 18), raiders: 4 + L.tier };
      const text = `Orcs of ${wl.name}’s host are sacking ${L.name}.`;
      if (HB.consequences) HB.consequences.react(state, text, `because ${wl.name} serves ${eg.get(state).foe.name}, and ${L.name} trusts you`);
      if (HB.isBrowser && HB.flow && HB.flow.map && state.phase !== 'sleeping') HB.flow.map.showToast(`${L.name} is under attack`, 4);
      return L;
    },
    /** each sleeping year */
    yearly(state, rng) {
      const ev = [], log = (text, bad) => ev.push({ text, kind: 'endgame', bad: !!bad });
      eg.check(state, rng, (t) => log(t));
      return ev;
    },
    // ---------- deeds that move it
    /** after a raid on one of its places: a lieutenant slain, a crystal taken */
    onRaidEnd(state, target, r) {
      if (!eg.isPlace(state, target) || r.outcome === 'defeated') return;
      const notes = r.storyNotes = r.storyNotes || [];
      const lt = eg.lieutenantAt(state, target);
      if (lt && lt.alive && r.bossSlain) for (const n of eg.lieutenantSlain(state, lt, target)) notes.push(n);
      const c = eg.crystalAt(state, target);
      if (c && !c.taken && (r.tags || []).includes('crystal:' + c.id)) for (const n of eg.crystalTaken(state, c, target)) notes.push(n);
    },
    lieutenantSlain(state, lt, L) {
      const E = eg.get(state), W = state.world, def = eg.lieutenantDef(lt.id), year = state.time.year;
      lt.alive = false; lt.defeatedYear = year; L.state = 'ruin';
      for (const V of W.locations) if (V.threat && V.threat.host && V.threat.campId === L.id) { V.threat = null; V.flags.noThreatUntil = state.time.totalDays + 360; }
      if (HB.domain) for (const m of HB.domain.members(state)) if (m.status === 'protected' || m.status === 'allied') m.L.trust = Math.min(100, m.L.trust + 10);
      for (const f of W.factions) if (f.dragon.known) HB.factions.adjust(state, f, { trust: 4 }, `killed ${lt.name}`);
      state.dragon.prestige += 20; state.dragon.alignment = HB.clamp(state.dragon.alignment + 6, -100, 100);
      const next = E.lieutenants.find(l => l.alive && !l.found && l.locId !== null);
      if (next) { next.found = true; eg.reveal(state, W.locations[next.locId], false); }
      HB.stats.recompute(state);
      const left = eg.living(state).length;
      const text = `${lt.name}, ${def.title}, is dead. ${def.defeatText}`;
      HB.game.chronicle(state, text, 'legend', L.id);
      if (HB.consequences) HB.consequences.react(state, text, `because you broke ${L.name}`);
      if (HB.domain) HB.domain.bump(state);
      return [{ text, tone: 'good' }, { text: `Lieutenants defeated: ${3 - left} of 3. ${left ? `${E.foe.name} still has ${HB.fmt.list(eg.living(state).map(l => eg.lieutenantDef(l.id).power.toLowerCase()))}.` : `${E.foe.name} stands alone.`}${next ? ` Rumours point to ${W.locations[next.locId].name}.` : ''}`, tone: 'good' }];
    },
    crystalTaken(state, c, L) {
      const E = eg.get(state), W = state.world, def = eg.crystalDef(c.id), year = state.time.year;
      c.taken = year; L.state = 'ruin'; L.flags.crystalTaken = year;
      // its realm withers: every settlement there is poorer for good
      const R = W.regions[L.regionId], hit = new Set();
      for (const V of W.locations) {
        if (V.regionId !== L.regionId || !['farm', 'village', 'town', 'city', 'castle', 'hold', 'glade', 'monastery', 'mine'].includes(V.type)) continue;
        V.wealthMax = Math.round(V.wealthMax * 0.75); V.wealth = Math.min(V.wealth, V.wealthMax); V.flags.withered = year;
        if (V.factionId >= 0) hit.add(V.factionId);
      }
      for (const fid of hit) { const f = W.factions[fid]; HB.factions.adjust(state, f, { hostility: 20, fear: 10 }, `took ${def.name}`); f.learned.hunters += 2; }
      for (const f of W.factions) if (f.dragon.known && !hit.has(f.id)) f.dragon.hostility = Math.min(100, f.dragon.hostility + 6);
      state.dragon.alignment = HB.clamp(state.dragon.alignment - 8, -100, 100);
      const next = E.crystals.find(x => !x.taken && !x.found && x.locId !== null);
      if (next && next.locId !== null) { next.found = true; eg.reveal(state, W.locations[next.locId], false); }
      const n = eg.taken(state).length;
      const text = `You took ${def.name} from ${L.name}. ${def.loss}`;
      HB.game.chronicle(state, text, 'legend', L.id);
      if (HB.consequences) HB.consequences.react(state, `${def.name} is gone from ${R.name}. ${def.loss} Every realm that knows you hates you more, and hires hunters.`, `because you took its Crystal of Life`);
      if (HB.domain) HB.domain.bump(state);
      return [{ text, tone: 'warn' }, { text: `Crystals of Life taken: ${n} of 6. Stored in your hoard it gives ${eg.effectText(HB.CRYSTAL_ARTIFACTS.find(a => a.id === 'crystal_' + c.id).effect)}.${next ? ` It pulls toward another: ${W.locations[next.locId].name}.` : n >= 6 ? ` All six are yours: ${E.god.name}, ${E.god.title}, will come for you.` : ''}`, tone: 'good' }];
    },
    /** arrival-card choices at a place of the struggle. A choice with raid: true starts the raid scene. */
    choicesFor(state, L) {
      const out = [];
      const lt = eg.lieutenantAt(state, L), c = eg.crystalAt(state, L), E = eg.get(state);
      if (lt && lt.alive) {
        const def = eg.lieutenantDef(lt.id);
        if (def.playable) out.push({ raid: true, label: `Attack ${L.name}`, desc: `Kill ${lt.name} and ${def.power.toLowerCase()} end. The camp will be awake unless your allies’ scouts lead you in.`, tooltip: `${def.powerText} ${def.defeatText}` });
        else out.push({ label: `Attack ${L.name}`, desc: 'This battle is not in the game yet.', disabled: true, disabledReason: `${lt.name} cannot be fought in this version yet`, onChoose: () => '' });
      }
      if (c && !c.taken) {
        const def = eg.crystalDef(c.id), a = HB.CRYSTAL_ARTIFACTS.find(x => x.id === 'crystal_' + c.id);
        if (def.playable) out.push({ raid: true, label: `Assault ${L.name}`, desc: `Kill ${def.guardian} to break the ward, and take ${def.name}. ${def.loss}`, tooltip: `${a.lore} In your hoard: ${eg.effectText(a.effect)}.` });
        else out.push({ label: `Assault ${L.name}`, desc: 'This sanctuary cannot be taken in this version yet.', disabled: true, disabledReason: 'Not in the game yet', onChoose: () => '' });
      }
      if (L.type === 'fortress') {
        const living = eg.living(state);
        out.push({ label: `Challenge ${E.foe ? E.foe.name : 'the Hollow King'}`, desc: living.length ? `The last battle is not in the game yet. Now you would face ${HB.fmt.list(living.map(l => eg.lieutenantDef(l.id).power.toLowerCase()))} as well.` : 'The last battle is not in the game yet.', disabled: true, disabledReason: 'The final battle is not built yet', onChoose: () => '' });
      }
      return out;
    },
    effectText(effect) {
      const names = { maxHealth: 'health', maxStamina: 'stamina', defense: 'defence', breath: 'breath', bite: 'bite', prestige: 'prestige', dominance: 'dominance', healRate: 'faster healing' };
      const parts = [];
      for (const k in effect) { if (k === 'mul') { if (effect.mul.staminaCost) parts.push(`flights cost ${Math.round((1 - effect.mul.staminaCost) * 100)}% less`); continue; } parts.push(k === 'healRate' ? 'faster healing' : `+${effect[k]} ${names[k] || k}`); }
      return parts.join(', ');
    },
    /** what the place is, for the arrival card and the preview */
    describe(state, L) {
      const E = eg.get(state), lt = eg.lieutenantAt(state, L), c = eg.crystalAt(state, L);
      if (lt) { const def = eg.lieutenantDef(lt.id); return lt.alive ? `${lt.name}, ${def.title}, holds this place. ${def.power}: ${def.powerText}` : `${lt.name} died here in Year ${lt.defeatedYear}.`; }
      if (c) { const def = eg.crystalDef(c.id); return c.taken ? `The altar is empty: you took ${def.name} in Year ${c.taken}.` : `${def.name}, a Crystal of Life, is kept here by ${def.guardian}. ${def.benefit}`; }
      if (L.type === 'fortress' && E.foe) { const living = eg.living(state); return `${E.foe.name}, ${E.foe.title}, waits here. ${living.length ? `While ${HB.fmt.plural(living.length, 'lieutenant')} live${living.length === 1 ? 's' : ''} he keeps ${HB.fmt.list(living.map(l => eg.lieutenantDef(l.id).power.toLowerCase()))}.` : 'His lieutenants are dead.'}`; }
      return '';
    },
    /** marks for the map: the land around a taken crystal withers */
    paintMarks(state, paint) {
      const E = eg.get(state), W = state.world;
      for (const c of E.crystals) if (c.taken && c.locId !== null) { const L = W.locations[c.locId]; paint(L.x, L.y, 12, -1); }
    },
    // ---------- goals
    /** one line for the goal panel, or '' */
    hint(state) {
      const E = eg.get(state), W = state.world;
      if (E.path === 'shadow') { const l = eg.living(state), n = l.find(x => x.found && x.locId !== null); return `${E.foe.name}: lieutenants ${3 - l.length} of 3 defeated${n ? ` · ${n.name} at ${W.locations[n.locId].name}` : ''}.`; }
      if (E.path === 'crystals') { const n = E.crystals.find(c => !c.taken && c.found && c.locId !== null); return `Crystals of Life: ${eg.taken(state).length} of 6${n ? ` · next: ${W.locations[n.locId].name}` : ''}.`; }
      return '';
    },
    opportunities(state) {
      const E = eg.get(state), W = state.world, d = state.dragon, out = [];
      const dist = (L) => Math.round(Math.hypot(L.x - d.x, L.y - d.y));
      if (!E.path) {
        if (d.tier >= 2 && !eg.ready(state).leaning) out.push({ aim: 'endgame', title: 'Choose what you are', desc: 'You are grown, but known as neither kind nor cruel. The great struggle begins once your name leans one way (benevolence 10 either way).', yields: 'A kind dragon faces an ancient evil and its lieutenants; a cruel one hunts the six Crystals of Life.' });
        return out;
      }
      if (E.path === 'shadow') {
        const lt = E.lieutenants.find(l => l.alive && l.found && l.locId !== null);
        if (lt) { const L = W.locations[lt.locId], def = eg.lieutenantDef(lt.id); out.push({ aim: 'endgame', title: `${def.playable ? 'Defeat' : 'Find a way to'} ${lt.name}`, desc: `${def.title}, at ${L.name}, ${dist(L)} leagues away. ${def.powerText}`, yields: `${def.defeatText} Lieutenants: ${3 - eg.living(state).length} of 3.`, ref: { kind: 'loc', id: L.id }, urgent: false }); }
        const host = W.locations.find(L => L.threat && L.threat.host);
        if (host) out.push({ aim: 'endgame', title: `Drive the host from ${host.name}`, desc: `Orcs of ${host.threat.campName.replace(/^the host of /, '')}’s host are sacking it.`, yields: `${host.name} keeps its trust in you; left alone, it is sacked or burned.`, ref: { kind: 'loc', id: host.id }, urgent: true });
      } else {
        const c = E.crystals.find(x => !x.taken && x.found && x.locId !== null);
        if (c) { const L = W.locations[c.locId], def = eg.crystalDef(c.id); out.push({ aim: 'endgame', title: `Take ${def.name}`, desc: `${L.name}, ${dist(L)} leagues away, kept by ${def.guardian}.`, yields: `A Crystal of Life for your hoard. ${def.loss} Crystals: ${eg.taken(state).length} of 6.`, ref: { kind: 'loc', id: L.id } }); }
      }
      return out;
    },
  };
})();

/* World simulation: moving entities (caravans, heroes, armies), daily ticks. Yearly development lives in sleep.js. */
(function () {
  const HB = globalThis.HB;

  /** who is raiding: orcs of a warlord's host, goblins, or outlaws */
  HB.raiderWord = (t) => t && t.orc ? 'orc' : t && t.goblin ? 'goblin' : 'outlaw';

  const sim = HB.worldsim = {
    init(state) {
      state.entities = [];
      sim.spawnCaravans(state, 1);
      sim.spawnHeroes(state);
    },
    /** road edges suitable for trade */
    tradeRoads(state) { const W = state.world; return W.roads.filter(r => !r.lane && W.locations[r.a].tier >= 1 && W.locations[r.b].tier >= 1); },
    spawnCaravans(state, density = 1) {
      const W = state.world, rng = HB.game.rng;
      const roads = sim.tradeRoads(state);
      const want = Math.round(roads.length * 0.22 * density);
      const have = state.entities.filter(e => e.kind === 'caravan' && !e.dead).length;
      for (let i = have; i < want; i++) {
        const R = rng.pick(roads); if (!R) break;
        const A = W.locations[R.a], B = W.locations[R.b];
        const origin = rng.chance(0.5) ? A : B;
        const f = origin.factionId >= 0 ? W.factions[origin.factionId] : null;
        const wealth = Math.round(rng.between(120, 320) * (1 + (A.tier + B.tier) * 0.4) * (1 + W.regions[origin.regionId].tier * 0.3));
        state.entities.push({ id: HB.nextId('ent'), kind: 'caravan', name: `caravan of ${origin.name}`, roadIdx: W.roads.indexOf(R), dir: origin === A ? 1 : -1, t: rng.next(), speed: 6, wealth, escort: f ? Math.min(3, f.learned.escorts) + (wealth > 500 ? 1 : 0) : 0, factionId: origin.factionId, originId: origin.id, x: 0, y: 0, dead: false, raided: false });
      }
      for (const e of state.entities) if (e.kind === 'caravan') sim.placeOnRoad(state, e);
    },
    spawnHeroes(state) {
      const W = state.world, rng = HB.game.rng;
      const have = state.entities.filter(e => e.kind === 'hero' && !e.dead).length;
      const want = 2 + Math.floor(state.dragon.tier * 1.5) + Math.floor((state.lair.attention || 0) / 6);
      const roads = sim.tradeRoads(state);
      for (let i = have; i < want; i++) {
        // prefer roads in the home region early
        const near = roads.filter(R => W.locations[R.a].regionId === 0 || W.regions[W.locations[R.a].regionId].tier <= state.dragon.tier);
        const R = rng.pick(near.length ? near : roads); if (!R) break;
        const culture = W.locations[R.a].factionId >= 0 ? W.factions[W.locations[R.a].factionId].culture : 'westron';
        const level = 1 + (rng.chance(0.3) ? 1 : 0) + state.dragon.tier + (HB.renown && HB.renown.has(state, 'herobane') ? 1 : 0);
        state.entities.push({ id: HB.nextId('ent'), kind: 'hero', name: HB.names.person(rng, culture, false), level, lance: rng.chance(0.15 + state.dragon.tier * 0.1), roadIdx: W.roads.indexOf(R), dir: rng.chance(0.5) ? 1 : -1, t: rng.next(), speed: 8, factionId: W.locations[R.a].factionId, x: 0, y: 0, dead: false, culture });
      }
      for (const e of state.entities) if (e.kind === 'hero') sim.placeOnRoad(state, e);
    },
    placeOnRoad(state, e) {
      const R = state.world.roads[e.roadIdx]; if (!R) { e.dead = true; return; }
      const i = HB.clamp(Math.floor(e.t * (R.cells.length - 1)), 0, R.cells.length - 1);
      e.x = R.cells[i][0]; e.y = R.cells[i][1];
    },
    /** days of simulated time pass during travel/rest */
    tickDays(state, days) {
      const W = state.world, rng = HB.game.rng;
      for (const e of state.entities) {
        if (e.dead || e.kind === 'hunters' || e.kind === 'army') continue; // hunters walk cross-country; armies move yearly
        const R = W.roads[e.roadIdx]; if (!R) { e.dead = true; continue; }
        const len = Math.max(1, R.cells.length);
        e.t += e.dir * (e.speed * days) / len;
        if (e.t >= 1 || e.t <= 0) {
          // arrive: pick a connecting road from the endpoint
          const endLoc = e.t >= 1 ? R.b : R.a;
          const next = W.roads.map((r, i) => ({ r, i })).filter(o => !o.r.lane && (o.r.a === endLoc || o.r.b === endLoc) && o.i !== e.roadIdx);
          if (e.kind === 'caravan' && (rng.chance(0.35) || !next.length)) { e.dead = true; continue; }
          if (!next.length) { e.dir *= -1; e.t = HB.clamp(e.t, 0, 1); }
          else { const n = rng.pick(next); e.roadIdx = n.i; e.dir = n.r.a === endLoc ? 1 : -1; e.t = e.dir === 1 ? 0.01 : 0.99; }
        }
        sim.placeOnRoad(state, e);
      }
      if (HB.hunters) HB.hunters.tick(state, days);
      state.entities = state.entities.filter(e => !e.dead);
      if (HB.endgame) HB.endgame.tickDays(state, days, rng);
      sim.updateThreats(state, days, rng);
      if (HB.heat) HB.heat.decay(state, days);
      if (HB.pursuit && HB.pursuit.tick(state) && HB.isBrowser && HB.flow && HB.flow.map) HB.flow.map.showToast('The riders give up the chase', 3);
      if (HB.situations) HB.situations.tick(state, days);
      if (HB.tribute && HB.tribute.accrueOfferings) HB.tribute.accrueOfferings(state, days);
      if (HB.domain) HB.domain.accrue(state, days);
      sim.spawnCaravans(state, 1);
      if (rng.chance(days * 0.05)) sim.spawnHeroes(state);
      if (HB.lair && HB.lair.tickDays) { const done = HB.lair.tickDays(state, days); if (done.length && HB.isBrowser && HB.flow.map) HB.flow.map.showToast(`${HB.UPGRADE_BY_ID[done[0].id].name} is finished`); }
      if (HB.ransom) { const ev = HB.ransom.tickDays(state, days); if (ev.length && HB.isBrowser && HB.notice) HB.notice('Word from the realms', ev.map(e => e.text).join('\n\n')); }
      if (HB.factions && HB.factions.tickDays) HB.factions.tickDays(state, days);
      if (HB.cheats) HB.cheats.topUp(state);
    },
    tickRealtime(state, dt) { /* nothing continuous yet */ },
    // ---------- outlaw raids on farms and villages: a problem you can solve (or ignore)
    /** the camp whose outlaws would raid L */
    threatSource(state, L) {
      const W = state.world;
      const n = HB.world.nearest(W, L.x, L.y, C => (C.type === 'camp' && C.camp !== 'hunter' || C.type === 'warren') && C.state === 'normal');
      return n && n.d <= 24 ? n.L : null;
    },
    /** start a raid on a farm or village near home (or near the dragon); opts.first picks the one glimpsed from the cave */
    spawnThreat(state, rng, opts = {}) {
      const W = state.world, H = W.home, d = state.dragon;
      const ok = (L) => (L.type === 'farm' || L.type === 'village') && L.state === 'normal' && !L.threat && !(L.flags.noThreatUntil > state.time.totalDays) && HB.world.canEnterRegion(state, L.regionId);
      let L = null;
      if (opts.first) {
        const n = HB.world.nearest(W, H.x, H.y, C => ok(C) && C.knowledge.seen);
        L = n && n.d <= 18 ? n.L : null;
        if (!L) { const m = HB.world.nearest(W, H.x, H.y, ok); L = m && m.d <= 20 ? m.L : null; }
      } else {
        const cx = rng.chance(0.5) ? d.x : H.x, cy = rng.chance(0.5) ? d.y : H.y;
        const cands = HB.world.locationsNear(W, cx, cy, 26, ok).map(o => o.L);
        L = cands.length ? rng.pick(cands.slice(0, 8)) : null;
      }
      if (!L) return null;
      const camp = sim.threatSource(state, L);
      const goblin = camp && (camp.type === 'warren' || camp.camp === 'goblin');
      const campName = camp ? camp.name : 'the hills';
      L.threat = { campId: camp ? camp.id : -1, campName, goblin: !!goblin, since: state.time.totalDays, until: state.time.totalDays + (opts.first ? 40 : 14 + rng.int(12)), raiders: opts.first ? 3 : 2 + L.tier + rng.int(2) };
      if (opts.first) { HB.world.sight(state, L, 1.6); if (camp) HB.world.sight(state, camp, 1.2); }
      if (L.knowledge.seen && !opts.first && state.phase !== 'sleeping') {
        const msg = `${goblin ? 'Goblins' : 'Outlaws'} from ${campName} are sacking ${L.name}. Drive them off and its people will remember.`;
        if (HB.isBrowser && HB.flow && HB.flow.map && state.phase !== 'sleeping') HB.flow.map.showToast(`${L.name} is under attack`, 4);
        if (HB.consequences) HB.consequences.react(state, msg, 'outlaws grow bold where no lord keeps the roads');
      }
      return L;
    },
    updateThreats(state, days, rng) {
      const W = state.world, now = state.time.totalDays;
      for (const L of W.locations) if (L.threat && now >= L.threat.until) sim.threatFalls(state, L, rng);
      const active = W.locations.reduce((a, L) => a + (L.threat ? 1 : 0), 0);
      if (active < 2 && rng.chance(days >= 300 ? 0.15 : Math.min(0.5, days * 0.015))) sim.spawnThreat(state, rng);
    },
    /** nobody came: the raiders take what they want */
    /** chance a village that trusts you drives raiders off without you (your guards, its guardians, its own pluck) */
    repelChance(state, L) {
      const pact = L.tribute && L.tribute.willing && !L.tribute.lapsed;
      if (L.trust < 30 && !pact) return 0;
      const guards = HB.lair ? HB.lair.guardStrength(state) : 0;
      const guardians = state.memory.loyalties.filter(l => l.kind === 'guardians').length;
      const allied = L.flags.allied && pact ? 0.15 : 0; // sworn to you: your settlement's militia rides to help
      const host = L.threat && L.threat.host ? 0.15 : 0;  // a warlord's host is harder to turn back
      return HB.clamp(0.15 + guards / 30 + guardians * 0.15 + (pact ? 0.1 : 0) + allied - host, 0, 0.85);
    },
    threatFalls(state, L, rng) {
      if (rng.chance(sim.repelChance(state, L))) {
        const t0 = L.threat; L.threat = null; L.flags.noThreatUntil = state.time.totalDays + 360; L.trust = Math.min(100, L.trust + 3);
        if (HB.consequences) HB.consequences.react(state, `${L.name} drove off the raiders of ${t0.campName} without you.`, 'because they trust you, and your guards and their own people stood together');
        return;
      }
      const W = state.world, t = L.threat; L.threat = null; L.flags.noThreatUntil = state.time.totalDays + 360;
      const loss = Math.round(L.wealth * 0.4);
      L.wealth -= loss;
      const camp = t.campId >= 0 ? W.locations[t.campId] : null;
      if (camp) camp.wealth += Math.round(loss * 0.5);
      if (rng.chance(t.host ? 0.6 : L.tier === 0 ? 0.5 : 0.3)) { L.state = 'burned'; L.flags.burnedYear = state.time.year; }
      L.memory.push({ year: state.time.year, kind: 'sacked', by: t.campName });
      if (L.memory.length > 12) L.memory.shift();
      const protectedByYou = L.tribute && L.tribute.willing && !L.tribute.lapsed;
      if (protectedByYou) { L.trust = Math.max(0, L.trust - 15); }
      const cared = L.trust >= 10 || protectedByYou || L.memory.some(m => m.kind === 'defended');
      if (L.knowledge.seen && cared && HB.consequences) HB.consequences.react(state, `${L.name} was ${L.state === 'burned' ? 'burned' : 'sacked'} by raiders from ${t.campName}${camp ? `, and ${camp.name} grew richer` : ''}.${protectedByYou ? ' They had trusted you to keep the raiders off; their trust falls.' : ''}`, 'nobody drove the raiders off');
    },
    /** yearly development of settlements; returns events */
    yearly(state, rng) {
      const W = state.world, ev = [], year = state.time.year;
      const tierUp = { farm: 'village', village: 'town', town: 'city' };
      for (const L of W.locations) {
        if (L.type === 'lair' || L.type === 'rivalLair') continue;
        if (L.type === 'battlefield') { if (L.flags.expires && year >= L.flags.expires) { L.type = 'ruin'; L.name = L.name.replace('Field', 'Barrow'); L.wealth = 50; } continue; }
        // memory fades
        L.fear = Math.max(0, L.fear - 3); L.trust = Math.max(0, L.trust - 1);
        if (L.state === 'burned') {
          L.flags.burnedYears = (L.flags.burnedYears || 0) + 1;
          const f = L.factionId >= 0 ? W.factions[L.factionId] : null;
          if (L.flags.burnedYears >= 3 + rng.int(6)) {
            if (rng.chance(0.2 + (f && f.dragon.fear > 50 ? 0.2 : 0)) && L.type !== 'castle' && L.type !== 'city') { L.state = 'abandoned'; L.pop = 0; ev.push({ text: `${L.name} was abandoned; its people never came back.`, kind: 'world', bad: true }); }
            else { L.state = 'normal'; L.wealth = Math.round(L.wealthMax * 0.45); L.flags.burnedYears = 0; if (L.knowledge.seen) ev.push({ text: `${L.name} was rebuilt.`, kind: 'world' }); }
          }
          continue;
        }
        if (L.state === 'abandoned') { L.flags.abandonedYears = (L.flags.abandonedYears || 0) + 1; if (L.flags.abandonedYears > 15) { L.state = 'ruin'; L.type = 'ruin'; L.name = 'Ruins of ' + L.name.replace(/^(Castle |Fort |Keep of )/, ''); L.wealth = Math.round(L.wealthMax * 0.3); L.defense = 20; L.tier = 0; } continue; }
        if (L.state === 'besieged') { L.wealth = Math.round(L.wealth * 0.9); continue; }
        // growth toward max, slower in famine
        const famine = L.flags.famine && year - L.flags.famine < 5;
        L.wealth = Math.round(Math.min(L.wealthMax, L.wealth + (L.wealthMax - L.wealth) * (famine ? 0.05 : 0.14) + L.wealthMax * 0.01));
        if (L.pop) L.pop = Math.round(L.pop * (famine ? 0.98 : 1.02));
        // tier changes
        const next = tierUp[L.type];
        if (next && L.wealth > L.wealthMax * 0.95 && rng.chance(0.07) && L.state === 'normal') {
          L.type = next; L.tier++; L.wealthMax = Math.round(L.wealthMax * 2.4); L.defenseBase += 10; L.defense = L.defenseBase; L.pop = Math.round(L.pop * 2.5);
          if (L.type !== 'village' && !L.ruler) L.ruler = { name: HB.names.person(rng, (L.factionId >= 0 ? W.factions[L.factionId] : { culture: 'westron' }).culture, false), title: 'Reeve', house: '', since: year };
          if (L.knowledge.seen) ev.push({ text: `${L.name} has grown into a ${HB.world.locTypeName(L)}.`, kind: 'world' });
        }
        L.flags.poorYears = L.wealth < L.wealthMax * 0.2 ? (L.flags.poorYears || 0) + 1 : 0;
        if (L.flags.poorYears >= 5 && L.tier > 0 && (L.type === 'town' || L.type === 'city')) { L.type = L.type === 'city' ? 'town' : 'village'; L.tier--; L.wealthMax = Math.round(L.wealthMax / 2.4); L.flags.poorYears = 0; if (L.knowledge.seen) ev.push({ text: `${L.name} has dwindled into a ${HB.world.locTypeName(L)}.`, kind: 'world', bad: true }); }
        // rulers
        if (L.ruler && rng.chance(0.035)) { const f = L.factionId >= 0 ? W.factions[L.factionId] : null; const culture = f ? f.culture : 'westron'; const sameHouse = rng.chance(0.7); L.ruler = { name: HB.names.person(rng, culture, false), title: L.ruler.title, house: sameHouse ? L.ruler.house : HB.names.house(rng, culture), since: year }; if (L.capital && f) { f.ruler = { name: L.ruler.name, title: f.ruler.title, house: L.ruler.house }; f.rulerSince = year; ev.push({ text: `${f.ruler.title} ${f.ruler.name} now rules ${f.name}.`, kind: 'world' }); } }
        // defences drift toward base + learning
        const f = L.factionId >= 0 ? W.factions[L.factionId] : null;
        const target = L.defenseBase + (f ? f.learned.hunters * 2 + (f.dragon.fear > 50 ? 5 : 0) : 0) + (L.flags.repelled ? 4 : 0);
        L.defense = Math.round(L.defense + (target - L.defense) * 0.3);
      }
      return ev;
    },
    afterSleep(state) {
      // refresh moving things after a long sleep
      state.entities = state.entities.filter(e => e.kind === 'army');
      sim.spawnCaravans(state, 1); sim.spawnHeroes(state);
      state.ambush = null; state.pursuit = null;
      if (HB.situations) HB.situations.afterSleep(state, HB.game.rng);
      // hunting parties from grudges appear on the roads near the lair
      const W = state.world, rng = HB.game.rng;
      const lead = HB.history ? HB.history.leadHunter(state) : null;
      if (lead && rng.chance(0.5)) {
        const roads = sim.tradeRoads(state).filter(R => Math.hypot(W.locations[R.a].x - W.home.x, W.locations[R.a].y - W.home.y) < 25);
        const R = roads.length ? rng.pick(roads) : null;
        if (R) { const e = { id: HB.nextId('ent'), kind: 'hero', name: lead.name, level: lead.level, lance: true, roadIdx: W.roads.indexOf(R), dir: 1, t: 0.5, speed: 6, factionId: lead.factionId, x: 0, y: 0, dead: false, grudgeId: lead.id }; sim.placeOnRoad(state, e); state.entities.push(e); }
      }
    },
    /** entities visible on the map (within revealed cells) */
    visibleEntities(state) { const W = state.world, K = state.know.revealed, d = state.dragon; return state.entities.filter(e => !e.dead && HB.world.inBounds(W, Math.round(e.x), Math.round(e.y)) && (K[Math.round(e.y) * W.w + Math.round(e.x)] || ((e.kind === 'hunters' || e.sitId) && Math.hypot(e.x - d.x, e.y - d.y) <= 30))); },
    drawEntities(ctx, map, state) {
      const A = HB.mapart, z = HB.MAP_CELL * map.cam.zoom;
      const s = Math.max(3, Math.min(9, 7 * Math.sqrt(map.cam.zoom)));
      for (const e of sim.visibleEntities(state)) {
        const p = map.worldToScreen(e.x + 0.5, e.y + 0.8);
        if (p.x < -40 || p.x > HB.W + 40 || p.y < -40 || p.y > HB.H + 40) continue;
        ctx.save(); A.setup(ctx);
        const key = 'ent' + e.id; // stable art-pack variant per entity
        // the way it goes (8 directions from its movement, kept by the map view): for art drawn in directions
        const H = map.entHeading || (map.entHeading = new Map()), h = H.get(e.id) || { x: e.x, y: e.y, vx: 1, vy: 0, dir: 'e' }, mx = e.x - h.x, my = e.y - h.y;
        if (Math.hypot(mx, my) > 1e-3 && Math.hypot(mx, my) < 3) { h.vx += (mx - h.vx) * 0.3; h.vy += (my - h.vy) * 0.3; if (HB.pixelArt) h.dir = HB.pixelArt.dirOf(h.vx, h.vy); }
        h.x = e.x; h.y = e.y; H.set(e.id, h); const f = { dir: h.dir, facing: h.vx < 0 ? -1 : 1 };
        if (e.kind === 'caravan') A.wagon(ctx, p.x, p.y, s, e.wealth > 500 ? '#6a4a85' : undefined, key, f);
        else if (e.kind === 'hero') A.walker(ctx, p.x, p.y, s, e.lance ? '#7a2418' : undefined, key, f);
        else if (e.kind === 'army') A.banner(ctx, p.x, p.y, s, e.color, key, f);
        else if (e.kind === 'hunters') A.walker(ctx, p.x, p.y, s, '#7a2418', key, f);
        ctx.restore();
        if (map.cam.zoom > 0.8 && (map.hoverEntity === e || map.selected === e)) HB.text.draw(ctx, e.name, p.x, p.y - s * 2.6, { size: 12, italic: true, align: 'center', stroke: 'rgba(240,228,200,0.7)', strokeWidth: 2.5 });
      }
    },
    entityAtScreen(map, state, sx, sy) {
      const p = map.screenToWorld(sx, sy); const z = HB.MAP_CELL * map.cam.zoom;
      let best = null, bd = Math.max(1.2, 16 / z);
      for (const e of sim.visibleEntities(state)) { const d = Math.hypot(e.x + 0.5 - p.x, e.y + 0.5 - p.y); if (d < bd) { bd = d; best = e; } }
      return best;
    },
  };
})();

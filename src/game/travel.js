/* Map travel: visible flight along world coordinates, stamina and time cost, reveal, events, return, arrival. */
(function () {
  const HB = globalThis.HB;

  const BASE_CELLS_PER_SEC = 2.6; // at normal speed, zoom-independent

  const travel = HB.travel = {
    /** cost to fly from (x0,y0) to (x1,y1): stamina and days */
    cost(state, x0, y0, x1, y1) {
      const s = state.dragon.stats, W = state.world;
      const dist = Math.hypot(x1 - x0, y1 - y0);
      const terrainF = HB.world.flightCostFactor(W, x0, y0, x1, y1);
      const load = HB.game.cargoWeight(state) / Math.max(1, s.capacity);
      const loadF = 1 + load * 0.5;
      const season = HB.world.seasonName(state.time.day) === 'Winter' ? 1.15 : 1;
      const perCell = 1.6 * terrainF * loadF * season * (s.staminaCost || 1) * (1 + state.dragon.injury * 0.3);
      return { dist, stamina: dist * perCell, days: dist / Math.max(1, s.speed), perCell };
    },
    estimate(state, L) {
      const d = state.dragon, W = state.world, H = W.home;
      const there = travel.cost(state, d.x, d.y, L.x, L.y);
      const back = travel.cost(state, L.x, L.y, H.x, H.y);
      const blocked = HB.world.flightBlockedAt(state, d.x, d.y, L.x, L.y);
      return { there, back, roundTrip: there.stamina + back.stamina, blocked, canReach: !blocked && there.stamina <= d.stamina + 1e-6, canReturn: !blocked && there.stamina + back.stamina <= d.stamina + 1e-6 };
    },
    canBegin(state, L) {
      if (!(state.phase === 'home' || state.phase === 'planning' || state.phase === 'traveling' || state.phase === 'returning')) return 'You cannot fly right now.';
      if (L.type === 'lair' && state.phase === 'home') return 'You are already home.';
      if (L.kind === 'point' && Math.hypot(L.x - state.dragon.x, L.y - state.dragon.y) < 1) return 'You are already here.';
      const e = travel.estimate(state, L);
      if (e.blocked) { const R = state.world.regions[e.blocked.regionId]; return `The storms over ${R.name} will not let ${HB.fmt.a(HB.TIERS[state.dragon.tier].name.toLowerCase())} pass. Grow, or find a way through.`; }
      if (L.flags && L.flags.requires === 'wind' && !(HB.caps && HB.caps.has(state, 'wind'))) return `Winds tear around the crag of ${L.name}. No wings your size can climb them — but the Gale-Feather Charm would carry you.`;
      // home is always reachable: if stamina runs out you come down, rest, and fly on
      if (!e.canReach && L.type !== 'lair') return `Too far: that flight needs ${Math.ceil(e.there.stamina)} stamina and you have ${Math.floor(state.dragon.stamina)}. Rest first, or pick somewhere closer.`;
      return null;
    },
    /** an arbitrary map point to explore toward */
    makePoint(state, x, y) {
      const W = state.world;
      const cx = HB.clamp(x, 0, W.w - 1), cy = HB.clamp(y, 0, W.h - 1);
      const sid = HB.world.subAt(W, cx, cy);
      const known = HB.world.isRevealed(state, cx, cy);
      const S = sid >= 0 ? W.subregions[sid] : null;
      const terr = HB.TERRAIN_NAMES[HB.world.terrainAt(W, cx, cy)];
      const name = known && S ? S.name : known ? HB.fmt.cap(terr) : 'Unexplored land';
      return { kind: 'point', id: 'pt', x: cx, y: cy, name, terrain: terr, known };
    },
    /** rest where you are (away from home): days pass, stamina returns */
    restInWild(state, map) {
      const d = state.dragon, W = state.world;
      if (state.phase !== 'planning') return 'You can only rest when you are on the ground.';
      const days = 2;
      HB.game.advanceDays(state, days); if (HB.worldsim) HB.worldsim.tickDays(state, days);
      // a village that trusts you lets you rest in its barn: full strength, and nobody talks
      const roost = W.locations.find(L => L.flags.roost && L.state === 'normal' && Math.hypot(L.x - d.x, L.y - d.y) < 1.5);
      d.stamina = Math.min(d.stats.maxStamina, Math.round(d.stamina + d.stats.maxStamina * (roost ? 1 : 0.5)));
      d.health = Math.min(d.stats.maxHealth, Math.round(d.health + d.stats.maxHealth * (roost ? 0.4 : 0.1)));
      const fid = HB.world.factionAt(W, d.x, d.y);
      if (fid >= 0 && !roost) state.lair.attention = (state.lair.attention || 0) + 0.5;
      if (roost) { const msg = `You rest two days in ${roost.name}'s barn. Stamina ${Math.floor(d.stamina)}/${d.stats.maxStamina}; nobody will tell.`; if (map) map.showToast(msg, 3); return msg; }
      const sid = HB.world.subAt(W, d.x, d.y);
      const msg = `You rest two days in ${sid >= 0 ? W.subregions[sid].name : 'the wilds'}. Stamina ${Math.floor(d.stamina)}/${d.stats.maxStamina}.`;
      if (map) map.showToast(msg, 3);
      return msg;
    },
    begin(state, L, map) {
      const d = state.dragon;
      const home = L.type === 'lair';
      state.phase = home ? 'returning' : 'traveling';
      const isPt = L.kind === 'point', isEnt = !!L.kind && !isPt;
      state.travel = { targetKind: isPt ? 'pt' : isEnt ? 'ent' : 'loc', point: isPt ? L : null, targetId: L.id, fromX: d.x, fromY: d.y, toX: L.x, toY: L.y, traveled: 0, length: Math.hypot(L.x - d.x, L.y - d.y), paused: false, speedMul: HB.settings.travelSpeed || 1, cellAcc: 0, dayAcc: 0, lastEventAt: 0, eventsSeen: [], startDay: state.time.totalDays };
      d.facing = L.x >= d.x ? 1 : -1;
      if (map) { map.selected = null; map.cam.tx = null; map.showToast(home ? 'Flying home' : isPt ? (L.known ? `Flying to ${L.name}` : 'Flying into unexplored land') : `Flying to ${L.name}`); }
      if (HB.audio) HB.audio.play('wing');
      return state.travel;
    },
    /** resolve the travel target (location or moving entity); null if it no longer exists */
    target(state) {
      const tr = state.travel; if (!tr) return null;
      if (tr.targetKind === 'pt') return tr.point;
      if (tr.targetKind === 'ent') { const e = state.entities.find(x => x.id === tr.targetId && !x.dead); return e || null; }
      return state.world.locations[tr.targetId] || null;
    },
    returnHome(state, map) { const lair = state.world.locations[state.world.home.locId]; return travel.begin(state, lair, map); },
    /** turn back toward home mid-flight (always allowed; may roost on the way) */
    turnBack(state, map) { if (state.phase === 'traveling') { travel.returnHome(state, map); if (map) map.showToast('Turning back'); } },
    divert(state, L, map) { const err = travel.canBegin(state, L); if (err) { if (map) map.showToast(err); return false; } travel.begin(state, L, map); return true; },
    togglePause(state) { if (state.travel) state.travel.paused = !state.travel.paused; },
    setSpeed(state, mul) { if (state.travel) state.travel.speedMul = mul; },

    update(state, dt, map) {
      const tr = state.travel;
      if (!tr || !(state.phase === 'traveling' || state.phase === 'returning')) return;
      if (tr.paused || travel.modalOpen) return;
      if (state.ambush) { state.travel = null; state.phase = 'planning'; return; }
      const inp = HB.isBrowser ? HB.input : null;
      if (inp) {
        if (inp.pressed('pause')) { tr.paused = true; return; }
        const hold = inp.held('speed') ? 3 : inp.held('slow') ? 0.35 : 1;
        tr.hold = hold;
      }
      const d = state.dragon;
      // moving targets: follow the entity's current position
      const tgt = travel.target(state);
      if (!tgt) { state.travel = null; state.phase = 'planning'; if (map) map.showToast('Your quarry is gone. You circle, then choose another course.'); return; }
      if (tr.targetKind === 'ent') { tr.toX = tgt.x; tr.toY = tgt.y; }
      const speed = BASE_CELLS_PER_SEC * tr.speedMul * (tr.hold || 1) * (0.85 + d.tier * 0.15);
      const remaining = Math.hypot(tr.toX - d.x, tr.toY - d.y);
      const step = Math.min(speed * dt, remaining);
      const prevX = d.x, prevY = d.y;
      if (remaining > 1e-6) { d.x += (tr.toX - d.x) / remaining * step; d.y += (tr.toY - d.y) / remaining * step; }
      d.facing = tr.toX >= d.x - 0.01 ? (tr.toX > d.x + 0.01 ? 1 : d.facing) : -1;
      tr.traveled += step;
      tr.progress = remaining - step <= 0.05 ? 1 : Math.min(0.999, tr.traveled / Math.max(0.1, tr.traveled + remaining - step));
      // per-cell costs
      const moved = Math.hypot(d.x - prevX, d.y - prevY);
      tr.cellAcc += moved;
      const c = travel.cost(state, prevX, prevY, d.x, d.y);
      d.stamina = Math.max(0, d.stamina - moved * c.perCell);
      tr.dayAcc += moved / Math.max(1, d.stats.speed);
      if (tr.dayAcc >= 1) { const days = Math.floor(tr.dayAcc); tr.dayAcc -= days; HB.game.advanceDays(state, days); if (HB.worldsim && HB.worldsim.tickDays) HB.worldsim.tickDays(state, days); }
      // reveal
      if (tr.cellAcc >= 0.5) {
        tr.cellAcc = 0;
        const res = HB.world.reveal(state, d.x, d.y, d.stats.vision);
        if (map && (res.cells.length || res.subs.length)) map.onReveal(res);
        for (const lid of res.locations) { const L = state.world.locations[lid]; if (map && (L.tier >= 2 || L.type === 'castle' || L.type === 'rivalLair' || L.type === 'hold')) map.showToast(`You sight ${L.name}`); }
      }
      // exhaustion: roost
      if (d.stamina <= 0 && tr.progress < 1) { travel.roost(state, map); return; }
      // events
      if (tr.traveled - tr.lastEventAt >= 4.5 && remaining > 2) {
        tr.lastEventAt = tr.traveled;
        if (HB.game.rng.chance(0.16)) travel.maybeEvent(state, map);
      }
      if (tr.progress >= 1) travel.arrive(state, map);
    },
    roost(state, map) {
      const d = state.dragon, W = state.world;
      const S = W.subregions[HB.world.subAt(W, d.x, d.y)];
      const ev = Object.assign({}, HB.ROOST_EVENT, { text: HB.ROOST_EVENT.text.replace('{place}', S ? S.name : 'the wilds') });
      travel.showEvent(state, ev, map, { terrain: HB.TERRAIN_NAMES[HB.world.terrainAt(W, d.x, d.y)] });
    },
    maybeEvent(state, map) {
      const d = state.dragon, W = state.world, tr = state.travel;
      const terrain = HB.TERRAIN_NAMES[HB.world.terrainAt(W, d.x, d.y)];
      let nearRoad = false;
      for (let dy = -1; dy <= 1 && !nearRoad; dy++) for (let dx = -1; dx <= 1; dx++) { const x = Math.round(d.x) + dx, y = Math.round(d.y) + dy; if (HB.world.inBounds(W, x, y) && W.road[y * W.w + x]) { nearRoad = true; break; } }
      const fid = HB.world.factionAt(W, d.x, d.y);
      const f = fid >= 0 ? W.factions[fid] : null;
      const ctx = { terrain: terrain === 'pine forest' ? 'forest' : terrain, nearRoad, factionHostility: f ? f.dragon.hostility : 0, hasCargo: HB.game.cargoWeight(state) > 0.5, heavyCargo: HB.game.cargoWeight(state) > d.stats.capacity * 0.7, tier: d.tier, staminaFrac: d.stamina / Math.max(1, d.stats.maxStamina), unknownNearby: HB.world.locationsNear(W, d.x, d.y, 8, L => !L.knowledge.seen).length > 0, realm: f ? f.name : 'the realm' };
      const pool = HB.TRAVEL_EVENTS.filter(e => (!e.when || e.when(ctx)) && !tr.eventsSeen.includes(e.id));
      if (!pool.length) return;
      const ev = HB.game.rng.weighted(pool, e => e.weight);
      tr.eventsSeen.push(ev.id);
      travel.showEvent(state, ev, map, ctx);
    },
    showEvent(state, ev, map, ctx) {
      travel.modalOpen = true;
      if (!HB.isBrowser || !HB.CardScene) { travel.applyChoice(state, ev, ev.choices[0], ctx, map); travel.modalOpen = false; return; }
      const fill = (s) => (s || '').replace('{dragon}', state.dragon.name).replace('{realm}', ctx.realm || 'the realm');
      HB.scenes.push(new HB.CardScene({
        title: ev.title, illustration: ev.illustration, text: fill(ev.text),
        choices: ev.choices.map(ch => ({ label: ch.label, desc: ch.desc, disabled: ch.requires && !ch.requires(ctx), disabledReason: ch.requireText, onChoose: () => travel.applyChoice(state, ev, ch, ctx, map) })),
        onClose: () => { travel.modalOpen = false; },
      }));
    },
    applyChoice(state, ev, ch, ctx, map) {
      const e = ch.effect || {}, d = state.dragon, rng = HB.game.rng, W = state.world;
      const out = [];
      const rangeVal = (v) => Array.isArray(v) ? Math.round(rng.between(v[0], v[1])) : v;
      if (e.gold) { const g = rangeVal(e.gold); state.cargo.gold += g; out.push(`+${g} gold in your claws`); }
      if (e.stamina) { if (e.stamina === 'half') d.stamina = Math.round(d.stats.maxStamina * 0.5); else d.stamina = HB.clamp(d.stamina + rangeVal(e.stamina), 0, d.stats.maxStamina); out.push(`${e.stamina === 'half' ? 'stamina half restored' : (rangeVal(e.stamina) > 0 ? '+' : '') + rangeVal(e.stamina) + ' stamina'}`); }
      if (e.staminaGain) { d.stamina = Math.min(d.stats.maxStamina, d.stamina + e.staminaGain); out.push(`+${e.staminaGain} stamina`); }
      if (e.health) { const h = rangeVal(e.health); d.health = HB.clamp(d.health + h, 1, d.stats.maxHealth); out.push(`${h > 0 ? '+' : ''}${h} health`); }
      if (e.time) { HB.game.advanceDays(state, e.time); if (HB.worldsim && HB.worldsim.tickDays) HB.worldsim.tickDays(state, e.time); out.push(`${HB.fmt.plural(e.time, 'day')} pass`); }
      const fid = HB.world.factionAt(W, d.x, d.y);
      const f = fid >= 0 ? W.factions[fid] : null;
      if (f && (e.fear || e.hostility)) { if (HB.factions) HB.factions.adjust(state, f, { fear: e.fear || 0, hostility: e.hostility || 0 }, ev.title); else { f.dragon.fear += e.fear || 0; f.dragon.hostility += e.hostility || 0; } out.push(`${f.name} ${e.hostility ? 'resents' : 'fears'} you a little more`); }
      if (e.kills) state.counters.kills += e.kills;
      if (e.attention) { state.lair.attention = (state.lair.attention || 0) + e.attention; out.push('your lair is a little easier to find'); }
      if (e.prestige) d.prestige += e.prestige;
      if (e.dropCargo) { const dropped = HB.hoard.dropCargo(state, HB.game.cargoWeight(state) * e.dropCargo); out.push(dropped.length ? `you let fall ${HB.fmt.list(dropped.map(i => i.name))} and pull away` : 'there was nothing to drop'); }
      if (e.revealUnknown) { const near = HB.world.locationsNear(W, d.x, d.y, 9, L => !L.knowledge.seen); if (near.length) { const L = near[0].L; const res = HB.world.reveal(state, L.x, L.y, 2.2); L.knowledge.seen = true; if (map) { map.onReveal(res); map.centerOn(L.x + 0.5, L.y + 0.5); } out.push(`you find ${L.name}`); } else out.push('nothing but empty country'); }
      if (ev.id === 'roost') { out.push('you take wing again'); }
      HB.game.chronicle(state, `${ev.title}: ${ch.label}.`, 'travel');
      return out.length ? HB.fmt.cap(HB.fmt.list(out)) + '.' : 'Nothing comes of it.';
    },
    arrive(state, map) {
      const L = travel.target(state);
      state.travel = null;
      const d = state.dragon;
      if (!L) { state.phase = 'planning'; return; }
      d.x = L.x; d.y = L.y;
      if (L.type === 'lair') { travel.arriveHome(state, map); return; }
      const lost = HB.pursuit ? HB.pursuit.onArrive(state, L) : null;
      if (lost && map) map.showToast(lost, 3);
      if (L.kind === 'point') {
        state.phase = 'planning';
        const res = HB.world.reveal(state, d.x, d.y, d.stats.vision + 0.5);
        if (map) map.onReveal(res);
        const sid = HB.world.subAt(state.world, d.x, d.y);
        const found = res.locations.map(id => state.world.locations[id]);
        if (map) map.showToast(found.length ? `You find ${HB.fmt.list(found.slice(0, 2).map(x => x.name))}${found.length > 2 ? ' and more' : ''}` : `You circle over ${sid >= 0 ? state.world.subregions[sid].name : 'empty country'}`, 3);
        if (HB.save && HB.save.autosave) HB.save.autosave(state);
        return;
      }
      state.phase = 'encounter';
      const res = HB.world.reveal(state, d.x, d.y, d.stats.vision);
      if (map) map.onReveal(res);
      if (L.knowledge && (!L.knowledge.scoutedYear || L.knowledge.scoutedYear < state.time.year)) L.knowledge.scoutedYear = state.time.year;
      if (HB.encounter && HB.encounter.begin) HB.encounter.begin(state, L, map);
      else { if (map) map.showToast(`You arrive at ${L.name}. (Encounters not built yet.)`); state.phase = 'planning'; }
    },
    arriveHome(state, map) {
      const d = state.dragon;
      state.phase = 'home';
      const energyBefore = Math.round(HB.stats.hoardEnergy(state));
      const followed = HB.pursuit ? HB.pursuit.onHome(state) : null;
      const offerings = HB.tribute && HB.tribute.collectOfferings ? HB.tribute.collectOfferings(state) : { total: 0, names: [] };
      const summary = HB.hoard.deposit(state);
      if (HB.lair && HB.lair.onReturn) HB.lair.onReturn(state, map);
      // people may settle at the foot of the hill now (shown after the home notice)
      const domainText = HB.domain ? HB.domain.advance(state, HB.game.rng) : null;
      if (domainText && HB.isBrowser && HB.notice) HB.notice(HB.domain.home(state).stage === 1 ? 'People Come to Your Hill' : 'Your Domain Grows', `${domainText}\n\n${HB.domain.stageInfo(state).gives.map(g => '• ' + g).join('\n')}\n\nSee Lair → Domain for what it gives and how it grows.`);
      // automatic rest: stamina refills 30%/day, health heals 12%/day
      let days = 0;
      while ((d.stamina < d.stats.maxStamina || d.health < d.stats.maxHealth) && days < 12) { days++; d.stamina = Math.min(d.stats.maxStamina, d.stamina + d.stats.maxStamina * 0.3); d.health = Math.min(d.stats.maxHealth, d.health + d.stats.maxHealth * 0.12 * (1 + (d.stats.healRate || 0))); }
      d.stamina = Math.round(d.stamina); d.health = Math.round(d.health);
      if (days) { HB.game.advanceDays(state, days); if (HB.worldsim && HB.worldsim.tickDays) HB.worldsim.tickDays(state, days); }
      if (d.injury > 0) d.injury = Math.max(0, d.injury - 0.5);
      if (summary.value > 0) {
        const deltas = summary.diff.map(x => `${x.label} ${HB.fmt.signed(x.delta, 1)}`).join(', ');
        HB.game.chronicle(state, `Returned home with ${HB.fmt.int(summary.value)} gold worth of plunder${summary.items.filter(i => i.named).length ? ', including ' + summary.items.filter(i => i.named).map(i => i.name).join(' and ') : ''}.`, 'return');
        state.lastDeposit = { lines: HB.consequences ? HB.consequences.depositSummary(state, summary, energyBefore) : [], days };
        if (HB.isBrowser && HB.notice) {
          const m = HB.goals ? HB.goals.milestone(state) : null;
          HB.notice('Home', `${state.lastDeposit.lines.join('\n')}${offerings.total ? `\nOfferings waiting at the foot of the hill from ${HB.fmt.list(offerings.names)}: ${HB.fmt.int(offerings.total)} gold.` : ''}${days ? `\nYou rest for ${HB.fmt.plural(days, 'day')}.` : ''}${followed ? `\n\n${followed}` : ''}${summary.rumors ? '\n\nThe maps you carried sketch lands you have not flown.' : ''}${m ? `\n\nNext: ${m.nextStep}` : ''}`);
        }
      } else if (HB.isBrowser && HB.notice && (followed || offerings.total)) HB.notice('Home', `${offerings.total ? `Offerings waiting at the foot of the hill from ${HB.fmt.list(offerings.names)}: ${HB.fmt.int(offerings.total)} gold.` : ''}${followed ? `${offerings.total ? '\n\n' : ''}${followed}` : ''}`);
      else if (map) map.showToast(days ? `Home. You rest for ${HB.fmt.plural(days, 'day')}.` : 'Home.');
      state.lastHome = { followed, offerings, domain: domainText };
      if (HB.petitions) { HB.petitions.expire(state); const p = HB.petitions.onReturn(state, map); if (p) HB.petitions.show(state, p, map); }
      if (HB.save && HB.save.autosave) HB.save.autosave(state);
    },
    /** draw route line, range ring and travel controls hint */
    draw(ctx, map, state) {
      const d = state.dragon, tr = state.travel;
      if (map.selected && (state.phase === 'home' || state.phase === 'planning' || state.phase === 'traveling' || state.phase === 'returning')) {
        const L = map.selected;
        const a = map.worldToScreen(d.x + 0.5, d.y + 0.5), b = map.worldToScreen(L.x + 0.5, L.y + 0.5);
        const e = travel.estimate(state, L);
        ctx.save(); ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5; ctx.strokeStyle = e.canReach ? (e.canReturn ? HB.palette.inkSoft : HB.palette.warn) : HB.palette.bad;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore();
      }
      // range ring from current position: how far stamina carries (one way)
      if (state.phase === 'home' || state.phase === 'planning') {
        const perCell = travel.cost(state, d.x, d.y, d.x + 1, d.y).perCell;
        const range = d.stamina / Math.max(0.01, perCell);
        const p = map.worldToScreen(d.x + 0.5, d.y + 0.5);
        const z = HB.MAP_CELL * map.cam.zoom;
        ctx.save(); ctx.setLineDash([3, 6]); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(43,26,14,0.35)';
        ctx.beginPath(); ctx.arc(p.x, p.y, range * z, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.arc(p.x, p.y, range * z / 2, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      if (tr) {
        const a = map.worldToScreen(tr.fromX + 0.5, tr.fromY + 0.5), b = map.worldToScreen(tr.toX + 0.5, tr.toY + 0.5);
        ctx.save(); ctx.setLineDash([4, 6]); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(43,26,14,0.45)'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore();
      }
    },
  };
})();

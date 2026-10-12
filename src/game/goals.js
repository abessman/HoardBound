/* Goals: the current growth milestone (requirements, progress, next step, what growth unlocks) and a board of concrete
 * opportunities, each tagged with the aim it serves. Headless-safe. */
(function () {
  const HB = globalThis.HB;

  HB.AIMS = {
    grow: { label: 'Grow stronger', color: '#9c6b1c' },
    trust: { label: 'Build trust', color: '#3f6d3a' },
    fear: { label: 'Build fear', color: '#8f2b1f' },
    secure: { label: 'Secure your sleep', color: '#2f4a66' },
    renown: { label: 'Become known', color: '#6a4a85' },
    domain: { label: 'Grow your domain', color: '#7a5a14' },
    endgame: { label: 'The great struggle', color: '#4a2a5a' },
  };
  const pct = (p) => Math.round(p * 100) + '%';

  const goals = HB.goals = {
    pct,
    /** what growing from one tier to the next gives you, as plain lines */
    unlocks(state, fromTier, toTier) {
      const a = HB.TIERS[fromTier], b = HB.TIERS[toTier], W = state.world, out = [];
      if (!a || !b) return out;
      out.push(`Stamina ${a.stamina} → ${b.stamina}: fly about ${(b.stamina / a.stamina).toFixed(1)}× as far`);
      out.push(`Carry ${a.capacity} → ${b.capacity}: bigger hauls each trip`);
      out.push(`Breath ${a.breath} → ${b.breath}, bite ${a.bite} → ${b.bite}, health ${a.health} → ${b.health}`);
      out.push(`See ${a.vision} → ${b.vision} leagues around you as you fly`);
      const regions = W.regions.filter(R => R.tier === toTier);
      if (regions.length) {
        const seen = regions.filter(R => state.know.regionSeen[R.id]).map(R => R.name);
        out.push(`Cross the storm walls into ${seen.length ? HB.fmt.list(seen.slice(0, 2)) + (regions.length > seen.length ? ' and lands beyond' : '') : HB.fmt.plural(regions.length, 'new land') + ' beyond your vale'}`);
      }
      if (toTier === 1) out.push('Demand tribute from settlements that fear you', 'Your territory widens, and people camp around your hill: pilgrims if they trust you, a cult if they fear you (your domain)', 'Sleep up to 50 years at a time');
      if (toTier === 2) out.push('Bring villages, towns and some castles of your home region into your fold (oaths, fealty, occupation); your camps become a village', 'The great struggle begins: a kind dragon faces an ancient evil and its lieutenants; a cruel one hunts the six Crystals of Life');
      if (toTier === 2) out.push('Land and smash open vaults, gates and wagons', 'Make caravans pay tolls', 'Sleep up to a century');
      if (toTier === 3) out.push('A castle or a dark tower rises beside your lair', 'Your territory reaches its widest', 'Sleep up to two centuries');
      return out;
    },
    /** the current milestone */
    milestone(state) {
      const d = state.dragon, next = HB.TIERS[d.tier + 1];
      const cargo = state.cargo.gold + state.cargo.items.reduce((s, i) => s + i.value * (i.cat === 'artifacts' ? 2 : 1), 0);
      if (!next) {
        const legend = state.flags.legend;
        return { title: legend ? 'Rule as a legend' : 'Become a legend', reqs: [], nextStep: legend ? 'Nothing is left to prove. Take what you like.' : 'Find the elder wyrm in its far lair and kill it.', unlocks: [] };
      }
      const energy = Math.round(HB.stats.hoardEnergy(state));
      const reqs = [
        { key: 'hoard', label: 'Hoard strength', cur: energy, need: next.energy, done: energy >= next.energy, carried: Math.round(cargo), hint: 'The worth of the treasure stored in your lair; named artifacts count double. What you carry counts only once it is home.' },
        { key: 'age', label: 'Age', cur: Math.floor(d.age * 10) / 10, need: next.minAge, unit: 'years', done: d.age >= next.minAge, hint: 'Days pass slowly while you fly and years pass quickly while you sleep.' },
      ];
      let nextStep;
      if (energy < next.energy) {
        const short = next.energy - energy;
        if (cargo >= short) nextStep = `Fly home: what you carry (${HB.fmt.int(cargo)}) is enough once it is stored.`;
        else if (cargo > 0) nextStep = `Gather ${HB.fmt.int(short - cargo)} more treasure, then fly home to store the ${HB.fmt.int(cargo)} you carry.`;
        else nextStep = `Gather ${HB.fmt.int(short)} more treasure and bring it home.`;
      } else if (d.age < next.minAge) {
        const yrs = Math.ceil(next.minAge - d.age);
        const opt = HB.sleep ? HB.sleep.durations(state).find(o => o.allowed && o.years >= yrs) : null;
        const sleepFor = opt ? opt.label.toLowerCase() : yrs + ' years';
        const exposed = HB.lair && !HB.lair.level(state, 'entrance') && !state.lair.construction.some(c => c.id === 'entrance');
        const spare = energy - next.energy;
        const t = HB.sleep ? HB.sleep.threatEstimate(state) : { hunt: 0 };
        const chamber = HB.lair && (HB.lair.level(state, 'sleeping') || state.lair.construction.some(c => c.id === 'sleeping'));
        const hunted = state.entities.some(e => e.kind === 'hunters' && !e.dead) || (HB.history && HB.history.leadHunter(state));
        if ((t.hunt >= 0.06 || hunted) && !chamber) nextStep = `Hunters will come for you while you sleep (${Math.round(t.hunt * 100)}% a year${hunted ? ', and someone has sworn to kill you' : ''}): build a sleeping chamber, deal with them first, or let your realms cool down. Then sleep ${sleepFor}.`;
        else if (exposed) nextStep = `Before you sleep, reinforce the entrance (Lair → Build): thieves who rob you before you come of age stop the change. Then sleep ${sleepFor}.`;
        else if (spare < 250) nextStep = `Gather a little more (only ${HB.fmt.int(spare)} to spare against thieves), or sleep ${sleepFor} now and hope the door holds.`;
        else nextStep = `Sleep ${sleepFor} in your lair to come of age.`;
      } else nextStep = `You are ready. Sleep in your lair to grow into ${HB.fmt.a(next.name.toLowerCase())}.`;
      return { title: `Become ${HB.fmt.a(next.name.toLowerCase())}`, tier: next.id, reqs, nextStep, unlocks: goals.unlocks(state, d.tier, next.id), energy, need: next.energy };
    },
    /** gold worth you could bring back from a target, given what you can still carry */
    haulOf(state, t) {
      const room = Math.max(0, state.dragon.stats.capacity - HB.game.cargoWeight(state));
      const w = t.kind === 'caravan' ? t.wealth * 0.6 : (t.knowledge && t.knowledge.seen ? t.wealth : t.wealth * 0.7) * 0.5;
      return Math.round(Math.min(w, room * 110));
    },
    /** concrete things to do now, each tagged with the aim it serves */
    opportunities(state) {
      const W = state.world, d = state.dragon, out = [];
      const known = W.locations.filter(L => L.type !== 'lair' && HB.world.known(L) && HB.world.canEnterRegion(state, L.regionId));
      const reach = (t) => { const e = HB.travel.estimate(state, t); return { ok: !e.blocked && e.canReach, back: e.canReturn }; };
      const dist = (t) => Math.round(Math.hypot(t.x - d.x, t.y - d.y));
      const m = goals.milestone(state);
      // ---- local stories first: each approach is its own opportunity
      if (HB.situations) out.push(...HB.situations.opportunities(state));
      if (HB.endgame) out.push(...HB.endgame.opportunities(state));
      if (HB.domain) out.push(...HB.domain.opportunities(state));
      // ---- grow stronger: the best haul for its danger that you can reach
      const prey = [];
      for (const e of (HB.worldsim ? HB.worldsim.visibleEntities(state) : [])) if (e.kind === 'caravan' && !e.tolled) { const r = reach(e); if (r.ok) prey.push({ t: e, haul: goals.haulOf(state, e), risk: 8 + (e.escort || 0) * 12, back: r.back }); }
      for (const L of known) if (['farm', 'village', 'camp', 'warren', 'mine', 'ruin', 'shrine', 'monastery'].includes(L.type) && L.state === 'normal' && !L.threat && L.trust < 20) { const r = reach(L); if (r.ok) prey.push({ t: L, haul: goals.haulOf(state, L), risk: L.defense + 5, back: r.back }); }
      prey.sort((a, b) => (b.back - a.back) || (b.haul / Math.sqrt(b.risk) - a.haul / Math.sqrt(a.risk)));
      for (const p of prey.slice(0, 2)) {
        const t = p.t, car = t.kind === 'caravan';
        const after = m.need ? ` (hoard strength ${HB.fmt.int(m.energy)} → about ${HB.fmt.int(m.energy + p.haul)} of ${HB.fmt.int(m.need)})` : '';
        out.push({ aim: 'grow', title: car ? `Rob the ${t.name}` : `Raid ${t.name}`, desc: `${car ? `${t.escort ? HB.fmt.cap(HB.fmt.plural(t.escort, 'guard')) : 'Barely guarded'}, ${dist(t)} leagues away.` : `${HB.fmt.cap((t.knowledge.seen ? '' : 'rumoured ') + HB.world.locTypeName(t))}, ${dist(t)} leagues away, defences ${t.defense > 30 ? 'strong' : t.defense > 14 ? 'fair' : 'weak'}.`}${p.back ? '' : ' You would have to rest before flying home.'}`, yields: `About ${HB.fmt.int(p.haul)} gold worth once stored${after}. ${car ? 'Merchants will hire more guards.' : 'They will be poorer and angrier.'}`, ref: { kind: car ? 'ent' : 'loc', id: t.id } });
      }
      // ---- build trust: villages under attack, captives, pacts, caravans to guard
      const threatened = known.filter(L => L.threat).sort((a, b) => dist(a) - dist(b));
      for (const L of threatened.slice(0, 2)) {
        const days = Math.max(1, Math.round(L.threat.until - state.time.totalDays));
        out.push({ aim: 'trust', title: `Save ${L.name} from the raiders`, desc: `${HB.fmt.cap(HB.fmt.plural(L.threat.raiders, HB.raiderWord(L.threat)))} from ${L.threat.campName} are sacking it; about ${HB.fmt.plural(days, 'day')} before it falls. ${reach(L).ok ? dist(L) + ' leagues away.' : 'Out of reach right now: rest first.'}`, yields: `${L.name}’s trust: willing workers, a pact of protection with yearly gifts, and the name Guardian of ${L.name}.`, ref: { kind: 'loc', id: L.id }, urgent: true });
      }
      for (const c of state.lair.captives.filter(c => !c.pending).slice(0, 1)) out.push({ aim: 'trust', title: `Release ${c.name}`, desc: `Held in your lair since Year ${c.year}.`, yields: `Trust with ${c.factionId >= 0 ? W.factions[c.factionId].name : 'their people'}; their family sends gifts and warnings. Two releases make you known as the Merciful.`, ref: { kind: 'tab', tab: 'captives' } });
      if (HB.tribute) { const L = known.find(L => (L.trust >= 15 || (HB.renown && HB.renown.guardianOf(state).includes(L.name))) && HB.tribute.canProtect(state, L).ok); if (L) out.push({ aim: 'trust', title: `Offer ${L.name} your protection`, desc: `They trust you (${Math.round(L.trust)}).`, yields: `About ${HB.fmt.int(Math.max(10, Math.round(L.wealth * 0.04)))} gold a year in gifts, and watchers on the roads to your lair.`, ref: { kind: 'loc', id: L.id } }); }
      if (!threatened.length) { const car = (HB.worldsim ? HB.worldsim.visibleEntities(state) : []).filter(e => e.kind === 'caravan' && !e.escorted && reach(e).ok).sort((a, b) => dist(a) - dist(b))[0]; if (car) out.push({ aim: 'trust', title: `Guard the ${car.name}`, desc: `Two days flying above its wagons, ${dist(car)} leagues away.`, yields: `Trust with ${car.factionId >= 0 ? W.factions[car.factionId].name : 'its people'} and a small gift. Three guarded caravans make you Warden of the Roads.`, ref: { kind: 'ent', id: car.id } }); }
      // ---- build fear
      if (HB.tribute && d.tier >= 1) { const L = known.find(L => HB.tribute.canDemand(state, L).ok); if (L) { const t = HB.tribute.canDemand(state, L); out.push({ aim: 'fear', title: `Demand tribute from ${L.name}`, desc: `They are ${t.chanceText} to bow.`, yields: `About ${HB.fmt.int(t.amount)} gold a year without lifting a claw. Their realm fears and resents you; tribute stops if they stop fearing you or grow too poor.`, ref: { kind: 'loc', id: L.id } }); } }
      else { const v = known.filter(L => (L.type === 'village' || L.type === 'farm') && L.state === 'normal' && !L.threat && reach(L).ok).sort((a, b) => dist(a) - dist(b))[0]; if (v) out.push({ aim: 'fear', title: `Terrorise ${v.name}`, desc: 'Burn a barn or the granary; roar over the rooftops.', yields: 'Fear makes tribute possible once you are older, and five burnings make your name a terror. But they grow poorer, hate you, and pay hunters.', ref: { kind: 'loc', id: v.id } }); }
      // ---- secure your sleep: upgrades that answer something that has happened (or is about to)
      if (HB.lair && HB.sleep) {
        const cur = HB.sleep.stopChances(state);
        const order = ['entrance', 'strongroom', 'sleeping', 'chamber', 'traps', 'concealed', 'lookout', 'guardpost'];
        const cands = order.map(id => ({ id, u: HB.UPGRADE_BY_ID[id], lv: HB.lair.level(state, id), why: HB.lair.whyNow(state, id) }))
          .filter(o => o.lv < o.u.levels.length && !state.lair.construction.some(c => c.id === o.id) && o.why);
        for (const o of cands.slice(0, 2)) {
          const next = o.u.levels[o.lv], can = HB.lair.canBuild(state, o.id);
          out.push({ aim: 'secure', title: `${o.lv ? 'Improve' : 'Build'} the ${o.u.name.toLowerCase()} (${HB.fmt.int(next.cost)} gold)`, desc: o.why, yields: `${goals.upgradeEffect(state, o.id, cur)}${can.ok ? '' : ` ${can.reason}.`}`, ref: { kind: 'tab', tab: 'build', upgrade: o.id } });
        }
        if (!state.lair.workers.length) { const offer = HB.lair.hireOffers(state).find(o => o.available); if (offer) out.push({ aim: 'secure', title: `Hire ${HB.WORKER_TYPES[offer.type].name.toLowerCase()} from ${offer.from}`, desc: offer.willing ? `They offer to work for you: no fee, ${offer.count * offer.wage} gold a year.` : `${offer.fee} gold, then ${offer.count * offer.wage} gold a year.`, yields: `Building goes ${HB.lair.buildRateWith(state, offer).toFixed(1)}× as fast; they can stand guard while you sleep.`, ref: { kind: 'tab', tab: 'workers' } }); }
      }
      // ---- become known: the nearest titles, with a target where there is one
      if (HB.renown) {
        const cands = HB.TITLES.filter(T => !HB.renown.has(state, T.id)).map(T => ({ T, p: HB.renown.progress(state, T) })).sort((a, b) => b.p.frac - a.p.frac || a.T.need - b.T.need);
        for (const { T, p } of cands.slice(0, 2)) {
          let ref = null, where = '';
          if (T.deed === 'heroes') { const h = (HB.worldsim ? HB.worldsim.visibleEntities(state) : []).find(e => e.kind === 'hero'); if (h) { ref = { kind: 'ent', id: h.id }; where = ` ${h.name} wanders the roads nearby.`; } }
          if (T.deed === 'castles') { const c = known.filter(L => L.type === 'castle').sort((a, b) => dist(a) - dist(b))[0]; if (c) { ref = { kind: 'loc', id: c.id }; where = ` The goblet on ${c.name}’s parapet is within a hatchling’s reach.`; } }
          if (T.deed === 'defended' && threatened.length) ref = { kind: 'loc', id: threatened[0].id };
          if (T.deed === 'released' && state.lair.captives.length) ref = { kind: 'tab', tab: 'captives' };
          out.push({ aim: 'renown', title: `${T.verb}: ${p.n} of ${p.need}`, desc: `Be known as ${T.name(state, threatened[0] ? threatened[0].name : '…')}.${where}`, yields: T.effect, ref });
        }
      }
      return out;
    },
    /** what an upgrade's next level does, in terms of the threats it answers */
    upgradeEffect(state, id, cur) {
      cur = cur || HB.sleep.stopChances(state);
      const v = HB.lair.valuesWith(state, id), after = HB.sleep.stopChances(state, v);
      const parts = [];
      if (after.thief - cur.thief >= 0.01) parts.push(`turns back ${pct(cur.thief)} → ${pct(after.thief)} of thieves`);
      if (after.hunt - cur.hunt >= 0.01) parts.push(`${pct(cur.hunt)} → ${pct(after.hunt)} of hunting parties`);
      if (id === 'strongroom') parts.push(`locks your ${v.strongroom} most prized treasures behind iron`);
      if (id === 'sleeping') parts.push('hunters who get in must breach a second door, and you wake to fight');
      if (id === 'chamber') parts.push(`room for ${HB.fmt.int(v.space)} spaces of treasure`);
      if (id === 'concealed') parts.push('fewer people learn where you sleep');
      if (id === 'lookout') parts.push('one more warning before hunters reach you');
      if (id === 'guardpost') parts.push('guards count for three times as much; fewer escapes');
      return parts.length ? HB.fmt.cap(HB.fmt.list(parts)) + '.' : HB.UPGRADE_BY_ID[id].mitigates;
    },
  };
})();

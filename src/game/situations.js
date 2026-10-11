/* Local situations: small conflicts generated from the world around the lair, each with several ways in that open
 * different futures. One is chosen for each new world (so starts differ); more appear later. Headless-safe.
 * A situation: { id, t (template), status 'open'|'done'|'failed', outcome, created, deadline, a: actors/notes }. */
(function () {
  const HB = globalThis.HB;

  // ---------------------------------------------------------------- capabilities granted by treasures
  const caps = HB.caps = {
    has(state, cap) { return state.hoard.items.some(i => i.capability === cap) || state.cargo.items.some(i => i.capability === cap); },
    NAMES: { wind: 'the Gale-Feather Charm', seal: 'the Deepwarden’s Seal', smoke: 'the Smoke-Glass' },
  };

  const W_ = (state) => state.world;
  const loc = (state, id) => (id === undefined || id === null || id < 0) ? null : state.world.locations[id];
  const ent = (state, id) => state.entities.find(e => e.id === id && !e.dead) || null;
  const daysLeft = (state, sit) => Math.max(0, Math.round(sit.deadline - state.time.totalDays));
  const cultureOf = (state, L) => L && L.factionId >= 0 ? state.world.factions[L.factionId].culture : 'westron';
  const ok = (state, L) => L && L.state === 'normal' && HB.world.canEnterRegion(state, L.regionId) && !L.flags.sit;
  const nearOf = (state, x, y, r, pred) => HB.world.locationsNear(state.world, x, y, r, L => ok(state, L) && pred(L)).map(o => o.L);
  const outlawCamp = (L) => (L.type === 'camp' && L.camp !== 'hunter') || L.type === 'warren';
  const smallPlace = (L) => L.type === 'farm' || L.type === 'village';
  const oldPlace = (L) => ['ruin', 'tower', 'shrine'].includes(L.type);
  const react = (state, t, c) => HB.consequences && HB.consequences.react(state, t, c);
  const artifactItem = (state, aid, source) => HB.hoard.makeArtifact(aid, source, state.time.year);

  /** a place that could only be reached (or opened) with a capability */
  function gate(state, L, cap, boost) {
    L.flags.requires = cap;
    L.wealth = Math.max(L.wealth, 300) + boost; L.wealthMax = Math.max(L.wealthMax, L.wealth);
    HB.world.rumor(state, L.x, L.y, 1);
    L.knowledge.rumored = true;
  }

  const T = HB.SITUATIONS = {
    // ------------------------------------------------------------ outlaws sacking a farm or village
    raidedFarm: {
      title: 'Raiders at the farm',
      pick(state) { const H = state.world.home; return nearOf(state, H.x, H.y, 20, smallPlace).length > 0; },
      start(state, sit, rng) {
        const L = HB.worldsim.spawnThreat(state, rng, { first: true });
        if (!L) return false;
        sit.a = { villageId: L.id, camp: L.threat.campName };
        sit.deadline = L.threat.until;
        sit.title = `Raiders at ${L.name}`;
        return true;
      },
      short(state, sit) { const V = loc(state, sit.a.villageId); return V && V.threat ? `${V.name} is being sacked: ${HB.fmt.plural(daysLeft(state, sit), 'day')} left.` : ''; },
      hint(state, sit) { const V = loc(state, sit.a.villageId); return V && V.threat ? `Outlaws from ${sit.a.camp} are sacking ${V.name}: ${HB.fmt.plural(daysLeft(state, sit), 'day')} before it falls.` : ''; },
      tick(state, sit) { const V = loc(state, sit.a.villageId); if (V && !V.threat) { sit.status = V.flags.savedYear ? 'done' : 'failed'; sit.outcome = V.flags.savedYear ? 'saved' : 'fell'; } },
      opportunities() { return []; }, // goals.js lists threatened villages already
    },

    // ------------------------------------------------------------ a village's tribute chest held by an outlaw captain
    stolenChest: {
      title: 'The stolen tribute',
      pick(state) { return !!T.stolenChest.actors(state, null); },
      actors(state, rng) {
        const H = state.world.home;
        const camps = nearOf(state, H.x, H.y, 22, outlawCamp);
        for (const C of camps) {
          const V = nearOf(state, C.x, C.y, 22, smallPlace).filter(L => !L.threat)[0];
          const K = nearOf(state, H.x, H.y, 30, oldPlace).filter(L => L !== C && L !== V)[0];
          if (V && K) return { C, V, K };
        }
        return null;
      },
      start(state, sit, rng) {
        const a = T.stolenChest.actors(state, rng); if (!a) return false;
        const { C, V, K } = a;
        const captain = C.ruler ? C.ruler.name : HB.names.person(rng, cultureOf(state, C), false);
        sit.a = { campId: C.id, villageId: V.id, cragId: K.id, captain, reeve: HB.names.person(rng, cultureOf(state, V), false), chest: 160 + rng.int(140), charm: 'galefeather' };
        sit.deadline = state.time.totalDays + 40 + rng.int(15);
        sit.title = `The tribute of ${V.name}`;
        C.flags.sit = V.flags.sit = sit.id;
        gate(state, K, 'wind', 260); K.flags.sitGate = sit.id;
        HB.world.sight(state, C, 1.2); HB.world.sight(state, V, 1.4);
        return true;
      },
      short(state, sit) { const A = sit.a, C = loc(state, A.campId), V = loc(state, A.villageId); if (A.pact) return `Bargain with Captain ${A.captain}: a cut each season.`; return !A.chestTaken ? `${V.name}’s tribute chest is at ${C.name}; buyer in ${HB.fmt.plural(daysLeft(state, sit), 'day')}. The captain wears a wind charm.` : ''; },
      hint(state, sit) {
        const C = loc(state, sit.a.campId), V = loc(state, sit.a.villageId), A = sit.a;
        if (A.pact) return `You have a bargain with Captain ${A.captain}: a cut of what the outlaws steal.`;
        if (!A.chestTaken) return `Captain ${A.captain} holds ${V.name}’s tribute chest at ${C.name}; a buyer comes in ${HB.fmt.plural(daysLeft(state, sit), 'day')}. The captain wears the Gale-Feather Charm.`;
        return '';
      },
      tick(state, sit) {
        const A = sit.a, C = loc(state, A.campId), V = loc(state, A.villageId);
        if (A.revengeAt && state.time.totalDays >= A.revengeAt && !A.revengeSent && !A.captainDead) {
          A.revengeSent = true;
          HB.hunters.spawn(state, { name: `Captain ${A.captain}’s men`, leader: `Captain ${A.captain}`, factionId: C ? C.factionId : -1, from: C, level: 1 + state.dragon.tier, reason: `Captain ${A.captain} wants the chest back`, sitId: sit.id, days: 90 });
          react(state, `Captain ${A.captain} is hunting the thief who took the chest.`, 'because you took the chest and left the captain alive');
        }
        if (A.pact && state.time.totalDays >= (A.nextCut || 0)) {
          A.nextCut = state.time.totalDays + 90;
          const cut = Math.round(25 + (C ? C.wealth * 0.08 : 0));
          state.pactGold = (state.pactGold || 0) + cut;
          if (HB.game.rng.chance(0.15)) { A.talks = (A.talks || 0) + 1; state.lair.attention = (state.lair.attention || 0) + 3; react(state, `One of Captain ${A.captain}’s men was taken and talked about the band’s dealings with a dragon.`, 'because your bargain with outlaws is not a secret they can keep'); if (A.talks >= 2) { A.pact = false; sit.status = 'done'; sit.outcome = 'pact-ended'; react(state, `Captain ${A.captain} was hanged, and your bargain with the gallows.`, 'because the outlaws talked too often'); } }
        }
        if (sit.status === 'open' && !A.chestTaken && !A.pact && state.time.totalDays >= sit.deadline) {
          if (C) { C.wealth += A.chest; C.defense += 4; }
          sit.status = 'failed'; sit.outcome = 'sold';
          if (V && V.knowledge.seen) react(state, `${V.name}’s tribute chest was sold to a buyer from the hills. Its lord blames the village.`, 'because nobody took it back in time');
        }
      },
      opportunities(state, sit) {
        const A = sit.a, C = loc(state, A.campId), V = loc(state, A.villageId), K = loc(state, A.cragId), out = [];
        if (sit.status === 'open' && !A.chestTaken && !A.pact) {
          out.push({ aim: 'grow', story: true, title: `Steal ${V.name}’s tribute chest`, desc: `About ${A.chest} gold, by Captain ${A.captain}’s fire at ${C.name}. ${HB.fmt.plural(daysLeft(state, sit), 'day')} until the buyer comes.`, yields: `Treasure now. If the captain lives, the thief will be hunted.`, ref: { kind: 'loc', id: C.id } });
          out.push({ aim: 'trust', story: true, title: `Kill Captain ${A.captain}, return the chest`, desc: `The captain wears the Gale-Feather Charm. ${V.name} lost the chest; their reeve, ${A.reeve}, is desperate.`, yields: `The charm; a quarter of the chest as thanks; ${V.name}’s trust, a hidden ruin and a safe place to rest.`, ref: { kind: 'loc', id: C.id } });
          out.push({ aim: 'fear', story: true, title: `Parley with Captain ${A.captain}`, desc: `Outlaws respect teeth. The captain would rather pay you than fight you.`, yields: 'A cut of the chest now and of everything they steal each season. Merchants suffer, and outlaws talk.', ref: { kind: 'loc', id: C.id } });
        }
        if (K && !caps.has(state, 'wind') && K.flags.requires === 'wind') out.push({ aim: 'grow', story: true, title: `The crag of ${K.name}`, desc: 'Something glitters on a wind-torn crag that no hatchling can climb.', yields: `About ${HB.fmt.int(K.wealth)} gold worth, reachable with the Gale-Feather Charm.`, ref: { kind: 'loc', id: K.id } });
        return out;
      },
      /** extra choices on the arrival card */
      choices(state, sit, target, map, card) {
        const A = sit.a, out = [];
        if (target.id !== A.campId || target.kind || sit.status !== 'open') return out;
        if (!A.pact && !A.chestTaken) out.push({ label: `Parley with Captain ${A.captain}`, desc: `A cut of the chest (${Math.round(A.chest * 0.3)}) now and of their takings each season.`, tooltip: 'Bloodless and profitable. The outlaws keep raiding the roads and farms; merchants of the realm will hire guards; and men who deal with dragons talk.', onChoose: () => T.stolenChest.parley(state, sit) });
        if (!caps.has(state, 'wind') && !A.captainDead && !A.charmSold) out.push({ label: 'Buy the Gale-Feather Charm', desc: '300 gold from what you carry.', disabled: state.cargo.gold < 300, disabledReason: 'You need 300 gold in your claws to buy it', onChoose: () => { state.cargo.gold -= 300; state.cargo.items.push(artifactItem(state, A.charm, `Captain ${A.captain}`)); A.charmSold = true; state.phase = 'planning'; return `The captain pulls the feather from a collar and drops it in front of you. "Fly well, worm," says the captain, counting your gold twice.`; } });
        return out;
      },
      parley(state, sit) {
        const A = sit.a, C = loc(state, A.campId), V = loc(state, A.villageId);
        A.pact = true; sit.outcome = 'pact'; A.nextCut = state.time.totalDays + 90;
        const cut = Math.round(A.chest * 0.3); state.cargo.gold += cut;
        const f = V && V.factionId >= 0 ? state.world.factions[V.factionId] : null;
        if (f) { HB.heat.add(state, f, 20, `you made a bargain with the outlaws of ${C.name}`); f.learned.escorts++; react(state, HB.consequences.LEARNED.escorts(f), `because outlaws with a dragon behind them prey on the roads`); }
        state.dragon.alignment = HB.clamp(state.dragon.alignment - 3, -100, 100);
        HB.game.chronicle(state, `Made a bargain with Captain ${A.captain} of ${C.name}.`, 'deed', C.id);
        state.phase = 'planning';
        return `Captain ${A.captain} laughs, then sees you are serious, and stops. ${cut} gold now, the captain says, and a share of every purse the band cuts. ${V.name}’s chest goes to the buyer.`;
      },
      onRaidEnd(state, sit, target, r, map, then) {
        const A = sit.a;
        if (target.id !== A.campId || target.kind || r.outcome === 'defeated') return false;
        if (r.leaderKilled) { A.captainDead = true; react(state, `Captain ${A.captain} is dead and the outlaws are scattering.`, `because you killed the captain at ${target.name}`); }
        if (A.pact) { A.pact = false; sit.outcome = 'betrayed'; if (!A.captainDead) { A.revengeAt = state.time.totalDays + 4; } }
        const took = (r.tags || []).includes('chest:' + sit.id);
        if (!took) return false;
        A.chestTaken = true; A.chestGold = A.chest;
        if (!A.captainDead) A.revengeAt = state.time.totalDays + 5;
        // the chest is in your claws: give it back or keep it
        const V = loc(state, A.villageId);
        const giveBack = () => {
          const g = Math.min(state.cargo.gold, A.chest); state.cargo.gold -= g;
          const thanks = Math.round(A.chest * 0.25); state.cargo.gold += thanks;
          V.trust = Math.min(100, V.trust + 25 * HB.renown.trustMul(state)); V.flags.roost = true;
          const f = V.factionId >= 0 ? state.world.factions[V.factionId] : null;
          if (f) { HB.factions.adjust(state, f, { trust: 5 }, `returned ${V.name}’s tribute chest`); HB.heat.add(state, f, -10); }
          state.dragon.alignment = HB.clamp(state.dragon.alignment + 4, -100, 100);
          const hidden = nearOf(state, state.world.home.x, state.world.home.y, 28, L => oldPlace(L) && !L.knowledge.seen && L.id !== A.cragId)[0];
          if (hidden) { hidden.wealth = Math.max(hidden.wealth, 250) + 200; hidden.wealthMax = Math.max(hidden.wealthMax, hidden.wealth); HB.world.sight(state, hidden, 1.4); hidden.flags.revealedBy = V.name; A.hiddenId = hidden.id; }
          sit.status = 'done'; sit.outcome = 'returned';
          (r.storyNotes = r.storyNotes || []).push({ text: `You returned ${V.name}’s tribute chest. They pressed ${thanks} gold on you, their barn is yours to rest in${hidden ? `, and ${A.reeve} told you of ${hidden.name}` : ''}.${A.captainDead ? '' : ` Captain ${A.captain} is alive and will come looking for the chest.`}`, tone: 'good' });
          HB.game.chronicle(state, `Returned ${V.name}’s tribute chest.`, 'deed', V.id);
          react(state, `${V.name} trusts you. Their barn is yours to rest in${hidden ? `, and ${A.reeve} told you of ${hidden.name}` : ''}.`, `because you brought back their tribute chest`);
          return `${A.reeve}, the reeve, weeps when the chest is set down in front of the mill. They press a quarter of it on you anyway. ${hidden ? `Then ${A.reeve} draws you a map: ${hidden.name}, a place nobody goes, and why. ` : ''}"Rest in our barn whenever you like," the reeve says. "Nobody will tell."`;
        };
        const keep = () => { sit.status = 'done'; sit.outcome = 'kept'; (r.storyNotes = r.storyNotes || []).push({ text: `You kept ${V ? V.name : 'the village'}’s tribute chest.${A.captainDead ? '' : ` Captain ${A.captain} is alive and will come looking for it.`}`, tone: 'warn' }); if (V) V.wealth = Math.round(V.wealth * 0.85); react(state, `${V ? V.name : 'The village'}’s lord taxed them a second time to replace the lost tribute.`, 'because you kept their chest'); return `You keep it. Somewhere below, ${A.reeve} explains to the lord’s bailiff why there is nothing to collect.`; };
        if (!HB.isBrowser || !HB.CardScene || !map) { (A.headlessChoice === 'keep' ? keep : giveBack)(); if (then) then(); return true; }
        HB.scenes.push(new HB.CardScene({ title: `The Tribute of ${V.name}`, illustration: 'petition', text: `You carry ${V.name}’s tribute chest: about ${A.chest} gold.${A.captainDead ? ` Captain ${A.captain} will not want it back.` : ` Captain ${A.captain} is alive, and will want it back.`}`, choices: [
          { label: `Return it to ${V.name}`, desc: 'A quarter back as thanks; their trust; a hidden place; a safe barn.', onChoose: giveBack },
          { label: 'Keep it', desc: 'All of it, for the hoard.', onChoose: keep },
        ], onClose: () => { if (then) then(); } }));
        return true;
      },
    },

    // ------------------------------------------------------------ a dwarven envoy held for ransom by outlaws
    takenEnvoy: {
      title: 'The taken envoy',
      pick(state) { return !!T.takenEnvoy.actors(state); },
      actors(state) {
        const W = state.world, H = W.home;
        const D = W.factions.find(f => f.kind === 'dwarf'); if (!D) return null;
        const camps = nearOf(state, H.x, H.y, 22, outlawCamp).sort((a, b) => (b.type === 'warren' || b.camp === 'goblin' ? 1 : 0) - (a.type === 'warren' || a.camp === 'goblin' ? 1 : 0));
        const C = camps[0]; if (!C) return null;
        const S = nearOf(state, H.x, H.y, 30, L => L.type === 'ruin' || L.type === 'mine').filter(L => L !== C)[0];
        if (!S) return null;
        return { C, D, S };
      },
      start(state, sit, rng) {
        const a = T.takenEnvoy.actors(state); if (!a) return false;
        const { C, D, S } = a;
        sit.a = { campId: C.id, factionId: D.id, vaultId: S.id, envoy: HB.names.person(rng, D.culture, false) };
        sit.deadline = state.time.totalDays + 45;
        sit.title = `The envoy of ${D.name}`;
        C.flags.sit = sit.id;
        gate(state, S, 'seal', 380); S.flags.sitGate = sit.id;
        HB.world.sight(state, C, 1.2);
        D.dragon.known = true;
        return true;
      },
      short(state, sit) { const C = loc(state, sit.a.campId); return sit.a.carried ? `Free or ransom ${sit.a.envoy} (Lair → Captives).` : `${C.name} holds a dwarf envoy with a seal: ${HB.fmt.plural(daysLeft(state, sit), 'day')} left.`; },
      hint(state, sit) { const C = loc(state, sit.a.campId), D = state.world.factions[sit.a.factionId]; return sit.a.carried ? `You hold ${sit.a.envoy}, envoy of ${D.name}. Release or ransom the envoy from your lair.` : `${C.name} holds ${sit.a.envoy}, an envoy of ${D.name}, for ransom: ${HB.fmt.plural(daysLeft(state, sit), 'day')} left. The envoy carries a dwarven seal.`; },
      tick(state, sit) {
        const A = sit.a;
        if (sit.status === 'open' && !A.carried && state.time.totalDays >= sit.deadline) {
          sit.status = 'failed'; sit.outcome = 'ransomed-by-dwarves';
          const C = loc(state, A.campId); if (C) C.wealth += 400;
          react(state, `${state.world.factions[A.factionId].name} paid the outlaws of ${C ? C.name : 'the hills'} for ${A.envoy}. The seal went home with the envoy.`, 'because nobody else got there first');
        }
      },
      opportunities(state, sit) {
        const A = sit.a, C = loc(state, A.campId), D = state.world.factions[A.factionId], S = loc(state, A.vaultId), out = [];
        if (sit.status === 'open' && !A.carried) {
          out.push({ aim: 'trust', story: true, title: `Free ${A.envoy} from ${C.name}`, desc: `Seize the envoy in a raid on the camp (weight 2), then release them from your lair.`, yields: `${D.name}’s gratitude: the Deepwarden’s Seal, which opens the sealed door at ${S.name}, and dwarves who will work for you without a fee.`, ref: { kind: 'loc', id: C.id } });
          out.push({ aim: 'grow', story: true, title: `Ransom ${A.envoy} yourself`, desc: 'Seize the envoy in the same raid, then send your own demand.', yields: `A dwarf’s ransom (about 400 to 900 gold). ${D.name} will hate you, and the seal stays locked.`, ref: { kind: 'loc', id: C.id } });
        } else if (A.carried && sit.status === 'open') out.push({ aim: 'trust', story: true, title: `Decide ${A.envoy}’s fate`, desc: 'The envoy is in your lair.', yields: 'Release: the seal and dwarven friendship. Ransom: gold, and their enmity.', ref: { kind: 'tab', tab: 'captives' } });
        if (S && S.flags.requires === 'seal') out.push({ aim: 'grow', story: true, title: `The sealed door at ${S.name}`, desc: 'Dwarf-runes on a door of black iron. Something heavy lies behind it.', yields: caps.has(state, 'seal') ? `About ${HB.fmt.int(S.wealth)} gold worth: you hold the seal.` : 'Opens with the Deepwarden’s Seal.', ref: { kind: 'loc', id: S.id } });
        return out;
      },
      onCaptured(state, sit, c) { if (c.sitId === sit.id) sit.a.carried = true; },
      onRelease(state, sit, c) {
        if (c.sitId !== sit.id) return;
        const A = sit.a, D = state.world.factions[A.factionId];
        HB.factions.adjust(state, D, { trust: 20, hostility: -10 }, `freed ${A.envoy}`);
        HB.hoard.addToHoard(state, artifactItem(state, 'deepseal', D.name));
        D.dragon.friend = true;
        sit.status = 'done'; sit.outcome = 'freed';
        react(state, `${D.name} sent you the Deepwarden’s Seal and will lend you workers without a fee.`, `because you freed their envoy ${A.envoy}`);
      },
      onRansomed(state, sit, c) {
        if (c.sitId !== sit.id) return;
        const D = state.world.factions[sit.a.factionId];
        HB.factions.adjust(state, D, { hostility: 15 }, `ransomed ${sit.a.envoy}`);
        sit.status = 'done'; sit.outcome = 'ransomed';
        react(state, `${D.name} paid for ${sit.a.envoy}, and will not forget it.`, 'because you sold their envoy back to them');
      },
    },

    // ------------------------------------------------------------ a dragon-slayer raising a bounty from the villages
    slayerBounty: {
      title: 'The slayer’s purse',
      pick(state) { return !!T.slayerBounty.actors(state); },
      actors(state) {
        const W = state.world, H = W.home;
        const funders = nearOf(state, H.x, H.y, 25, L => L.type === 'farm' || L.type === 'village' || L.type === 'town').slice(0, 2);
        const roads = HB.worldsim.tradeRoads(state).filter(R => Math.hypot(W.locations[R.a].x - H.x, W.locations[R.a].y - H.y) < 26 && HB.world.canEnterRegion(state, W.locations[R.a].regionId));
        if (funders.length < 2 || !roads.length) return null;
        return { funders, roads };
      },
      start(state, sit, rng) {
        const a = T.slayerBounty.actors(state); if (!a) return false;
        const W = state.world, R = rng.pick(a.roads);
        const culture = cultureOf(state, W.locations[R.a]);
        const name = HB.names.person(rng, culture, false);
        const e = { id: HB.nextId('ent'), kind: 'hero', name, level: 2, lance: true, roadIdx: W.roads.indexOf(R), dir: 1, t: 0.4, speed: 3, factionId: W.locations[R.a].factionId, x: 0, y: 0, dead: false, culture, sitId: sit.id, purse: 120 };
        HB.worldsim.placeOnRoad(state, e); state.entities.push(e);
        HB.world.reveal(state, e.x, e.y, 1.5);
        sit.a = { heroId: e.id, hero: name, funders: a.funders.map(L => L.id), withdrawn: [] };
        sit.deadline = state.time.totalDays + 40;
        sit.title = `The slayer ${name}`;
        for (const L of a.funders) { L.flags.sit = sit.id; HB.world.sight(state, L, 1.3); }
        return true;
      },
      short(state, sit) { const A = sit.a; return A.hunting ? `${A.hero} the slayer is hunting you.` : `A dragon-slayer is raising a bounty: ${HB.fmt.plural(daysLeft(state, sit), 'day')} until the hunt.`; },
      hint(state, sit) {
        const A = sit.a, names = A.funders.filter(id => !A.withdrawn.includes(id)).map(id => loc(state, id).name);
        if (A.hunting) return `${A.hero} is coming for you.`;
        const e = ent(state, A.heroId);
        return `${A.hero}, a dragon-slayer, is raising a bounty from ${HB.fmt.list(names)} (purse ${e ? e.purse : '?'}). In ${HB.fmt.plural(daysLeft(state, sit), 'day')} the slayer comes for you.`;
      },
      tick(state, sit, days) {
        const A = sit.a, e = ent(state, A.heroId);
        if (sit.status !== 'open') return;
        if (!e && !A.hunting) { sit.status = 'done'; sit.outcome = sit.outcome || 'gone'; return; }
        if (e && !A.hunting) e.purse += Math.round(days * 4);
        if (!A.hunting && state.time.totalDays >= sit.deadline && e) {
          A.hunting = true; e.dead = true;
          const h = HB.hunters.spawn(state, { name: `${A.hero} the slayer`, leader: A.hero, factionId: e.factionId, from: { x: e.x, y: e.y, name: 'the road' }, level: 2 + state.dragon.tier, reason: `paid by ${A.funders.length - A.withdrawn.length} villages to kill you`, sitId: sit.id, days: 120 });
          if (h) { A.hunterId = h.id; h.purse = e.purse; }
          react(state, `${A.hero} has taken the villages’ gold and is coming for you.`, 'because the bounty was raised and nobody stopped it');
        }
        if (A.hunting && A.hunterId && !ent(state, A.hunterId) && !A.slain) { sit.status = 'done'; sit.outcome = sit.outcome || 'escaped'; }
      },
      opportunities(state, sit) {
        const A = sit.a, out = [];
        if (sit.status !== 'open') return out;
        const e = ent(state, A.heroId) || ent(state, A.hunterId);
        const left = A.funders.filter(id => !A.withdrawn.includes(id)).map(id => loc(state, id));
        if (e) out.push({ aim: 'renown', story: true, title: `Ambush ${A.hero} ${A.hunting ? 'before the slayer finds you' : 'on the road'}`, desc: `A dragon-slayer with a lance and a purse of ${e.purse || '?'} gold. The slayer carries the Smoke-Glass.`, yields: `The purse and the Smoke-Glass (riders and hunters lose your trail). The slayer’s friends may swear an oath.`, ref: { kind: 'ent', id: e.id } });
        if (!A.hunting && left.length) out.push({ aim: 'trust', story: true, title: `Turn ${HB.fmt.list(left.map(L => L.name))} against the bounty`, desc: 'Ask them (they must trust you a little), or frighten them into withdrawing.', yields: `With no purse, ${A.hero} rides away and sends you word of other hunters.`, ref: { kind: 'loc', id: left[0].id } });
        if (!A.hunting) out.push({ aim: 'secure', story: true, title: `Let ${A.hero} come`, desc: `The slayer sets out in about ${HB.fmt.plural(daysLeft(state, sit), 'day')} and tracks you across the map.`, yields: 'Fight when the slayer catches you, or flee and be followed.', ref: null });
        return out;
      },
      choices(state, sit, target) {
        const A = sit.a, out = [];
        if (sit.status !== 'open' || A.hunting || target.kind || !A.funders.includes(target.id) || A.withdrawn.includes(target.id)) return out;
        const L = target, s = state.dragon.stats;
        const pFear = HB.clamp(0.35 + L.fear / 100 + s.dominance / 150, 0.1, 0.9);
        out.push({ label: 'Ask them to withdraw the bounty', desc: L.trust >= 15 ? 'They trust you enough to listen.' : `They do not trust you (trust ${Math.round(L.trust)} of 15).`, disabled: L.trust < 15, disabledReason: 'Earn their trust first: defend them, guard their caravans, return what was taken', onChoose: () => T.slayerBounty.withdraw(state, sit, L, 'asked') });
        out.push({ label: 'Frighten them into withdrawing', desc: `Roar over the rooftops (${pFear > 0.65 ? 'likely' : pFear > 0.4 ? 'uncertain' : 'unlikely'}). Fear and anger both grow.`, onChoose: () => { if (HB.game.rng.chance(pFear)) return T.slayerBounty.withdraw(state, sit, L, 'frightened'); const e = ent(state, A.heroId); if (e) e.purse += 100; L.fear = Math.min(100, L.fear + 5); const f = L.factionId >= 0 ? state.world.factions[L.factionId] : null; if (f) HB.factions.adjust(state, f, { hostility: 4 }, `roared over ${L.name}`); state.phase = 'planning'; return `They bar the doors and add another hundred to the slayer’s purse.`; } });
        return out;
      },
      withdraw(state, sit, L, how) {
        const A = sit.a; A.withdrawn.push(L.id);
        const f = L.factionId >= 0 ? state.world.factions[L.factionId] : null;
        if (how === 'asked') { L.trust = Math.min(100, L.trust + 5); state.dragon.alignment = HB.clamp(state.dragon.alignment + 2, -100, 100); }
        else { L.fear = Math.min(100, L.fear + 12); if (f) HB.factions.adjust(state, f, { fear: 3, hostility: 3 }, `frightened ${L.name}`); state.dragon.alignment = HB.clamp(state.dragon.alignment - 2, -100, 100); }
        state.phase = 'planning';
        let text = how === 'asked' ? `The elders of ${L.name} talk long into the night, then send a boy after the slayer to take their silver back.` : `You roar once over ${L.name}. By morning their silver is on its way back from the slayer’s camp.`;
        if (A.funders.every(id => A.withdrawn.includes(id))) {
          const e = ent(state, A.heroId); if (e) e.dead = true;
          sit.status = 'done'; sit.outcome = 'abandoned';
          state.memory.loyalties.push({ id: HB.nextId('loy'), name: A.hero, kind: 'house', factionId: f ? f.id : -1, year: state.time.year, strength: 1, text: 'gave up the hunt and warns the dragon of other hunters' });
          react(state, `${A.hero} gave up the hunt and rode away. Word of other hunters will reach you now.`, how === 'asked' ? 'because the villages trusted you more than the slayer' : 'because the villages feared you more than they believed in the slayer');
          text += ` With nobody left to pay, ${A.hero} rides west, leaving a note under a stone at the foot of your hill: no more hunting, and word will come of anyone who tries.`;
        }
        return text;
      },
      onRaidEnd(state, sit, target, r) {
        const A = sit.a;
        if (target.id !== A.heroId && target.id !== A.hunterId) return false;
        if (r.kills > 0 && r.outcome !== 'defeated') { A.slain = true; sit.status = 'done'; sit.outcome = 'slain'; target.dead = true; react(state, `${A.hero} the slayer is dead.`, 'because you met the slayer first'); return false; }
        if ((r.loot.items.some(i => i.capability === 'smoke') || r.loot.gold > 0) && r.outcome !== 'defeated' && !A.hunting) {
          A.hunting = true; target.dead = true;
          const h = HB.hunters.spawn(state, { name: `${A.hero} the slayer`, leader: A.hero, factionId: target.factionId, from: { x: target.x, y: target.y, name: 'the road' }, level: 3 + state.dragon.tier, reason: 'wants back what you stole', sitId: sit.id, days: 120 });
          if (h) A.hunterId = h.id;
          react(state, `${A.hero} is hunting you, angrier than before.`, 'because you took the chest and left the captain alive');
        }
        return false;
      },
    },
  };

  // ---------------------------------------------------------------- the situation list
  const sits = HB.situations = {
    TEMPLATES: ['raidedFarm', 'stolenChest', 'takenEnvoy', 'slayerBounty'],
    list(state) { if (!state.situations) state.situations = []; return state.situations; },
    open(state) { return sits.list(state).filter(s => s.status === 'open'); },
    get(state, id) { return sits.list(state).find(s => s.id === id) || null; },
    /** pick and start a situation (seeded); opts.first for the opening of a new world; opts.only to force a template */
    spawn(state, rng, opts = {}) {
      const used = new Set(sits.list(state).map(s => s.t));
      let ids = opts.only ? [opts.only] : sits.TEMPLATES.slice();
      if (!opts.only && !opts.first) ids = ids.filter(id => !used.has(id) || id === 'raidedFarm');
      const order = rng.shuffle(ids.slice());
      for (const id of order) {
        const tpl = T[id];
        if (!tpl.pick(state)) continue;
        const sit = { id: HB.nextId('sit'), t: id, status: 'open', outcome: null, created: state.time.totalDays, deadline: state.time.totalDays + 40, a: {}, title: tpl.title };
        if (!tpl.start(state, sit, rng)) continue;
        sits.list(state).push(sit);
        if (!opts.first) react(state, `A new story in your valley: ${sit.title}.`, '');
        return sit;
      }
      return null;
    },
    tick(state, days) {
      for (const s of sits.list(state)) if (s.status === 'open' || (s.a && (s.a.pact || (s.a.revengeAt && !s.a.revengeSent)))) { const tpl = T[s.t]; if (tpl.tick) tpl.tick(state, s, days); }
    },
    afterSleep(state, rng) { if (!sits.open(state).length) sits.spawn(state, rng); },
    hint(state, short) {
      const open = sits.open(state).map(s => ({ s, d: s.deadline - state.time.totalDays })).sort((a, b) => a.d - b.d);
      for (const { s } of open) { const tpl = T[s.t]; const h = short && tpl.short ? tpl.short(state, s) : tpl.hint(state, s); if (h) return h; }
      return '';
    },
    opportunities(state) {
      const out = [];
      for (const s of sits.list(state)) { const tpl = T[s.t]; if (tpl.opportunities) out.push(...tpl.opportunities(state, s).map(o => Object.assign({ sitTitle: s.title }, o))); }
      return out;
    },
    choicesFor(state, target, map) {
      const out = [];
      for (const s of sits.list(state)) { const tpl = T[s.t]; if (tpl.choices) out.push(...tpl.choices(state, s, target, map)); }
      // a sealed or wind-gated place
      if (!target.kind && target.flags && target.flags.requires === 'seal') {
        const has = caps.has(state, 'seal');
        out.push({ label: has ? 'Press the Deepwarden’s Seal to the door' : 'Try the sealed door', desc: has ? 'The runes know the seal.' : 'A door of black iron with no handle. Dwarf-runes: opened by the seal of the Deepwardens.', disabled: !has, disabledReason: 'You need the Deepwarden’s Seal', onChoose: () => sits.openVault(state, target) });
      }
      return out;
    },
    /** something to say on arrival at a story place */
    arrivalText(state, target) {
      for (const s of sits.open(state)) { const A = s.a || {}; if ([A.campId, A.villageId, A.vaultId, A.cragId].includes(target.id) || (A.funders || []).includes(target.id)) return T[s.t].hint(state, s); }
      return '';
    },
    isStoryPlace(state, L) { if (L.flags && (L.flags.requires || L.flags.revealedBy)) return true; for (const s of sits.open(state)) { const A = s.a || {}; if ([A.campId, A.villageId, A.vaultId, A.cragId].includes(L.id) || (A.funders || []).includes(L.id)) return true; } return false; },
    openVault(state, S) {
      S.flags.requires = null; S.flags.opened = state.time.year;
      const room = Math.max(0, state.dragon.stats.capacity - HB.game.cargoWeight(state)) * 100;
      const g = Math.round(Math.min(room, S.wealth * 0.5)); state.cargo.gold += g; S.wealth -= g;
      let text = `The runes flare, and the door swings in on hinges that have not moved in three hundred years. Inside: dwarf-gold in iron-bound chests. You take ${HB.fmt.int(g)} gold${S.wealth > 50 ? `; about ${HB.fmt.int(S.wealth)} more waits for another trip` : ''}.`;
      const gem = HB.hoard.makeItem(['a dwarf-cut sapphire', 'gems', 180, 260, 0.1], HB.game.rng, S.name, state.time.year);
      if (HB.hoard.canCarry(state, gem.weight)) { state.cargo.items.push(gem); text += ` And ${HB.hoard.itemLabel(gem)}.`; }
      HB.game.chronicle(state, `Opened the sealed door at ${S.name}.`, 'deed', S.id);
      state.phase = 'planning';
      return text;
    },
    /** raid ended: let situations react; returns true if one of them shows its own card first (then calls `then`) */
    onRaidEnd(state, target, r, map, then) {
      for (const s of sits.list(state)) { const tpl = T[s.t]; if (tpl.onRaidEnd && tpl.onRaidEnd(state, s, target, r, map, then)) return true; }
      return false;
    },
    onCaptured(state, c) { for (const s of sits.open(state)) { const tpl = T[s.t]; if (tpl.onCaptured) tpl.onCaptured(state, s, c); } },
    onRelease(state, c) { for (const s of sits.open(state)) { const tpl = T[s.t]; if (tpl.onRelease) tpl.onRelease(state, s, c); } },
    onRansomed(state, c) { for (const s of sits.open(state)) { const tpl = T[s.t]; if (tpl.onRansomed) tpl.onRansomed(state, s, c); } },
    /** decorate a raid scene with situation actors (the chest, the captain's charm, the envoy, the slayer's glass) */
    decorateScene(state, target, scene, rng) {
      for (const s of sits.list(state)) {
        const A = s.a || {};
        if (s.t === 'stolenChest' && target.id === A.campId && !target.kind) {
          const lead = scene.entities.find(e => e.leader);
          if (lead && !A.captainDead && !A.charmSold) { lead.label = `Captain ${A.captain}`; lead.personName = A.captain; lead.hp = Math.max(lead.hp || 0, 18); const it = HB.hoard.makeArtifact(A.charm, `Captain ${A.captain}`, state.time.year); lead.drop = { item: it, value: it.value, weight: it.weight, label: it.name }; }
          if (s.status === 'open' && !A.chestTaken && !A.pact) scene.entities.push({ kind: 'chest', x: 170, y: HB.raid.GROUND, w: 10, h: 8, loot: { gold: A.chest, value: A.chest, weight: Math.max(0.3, A.chest / 100), tag: 'chest:' + s.id }, access: 'exposed', label: `${loc(state, A.villageId).name}’s tribute chest`, watchers: 4 });
        }
        if (s.t === 'takenEnvoy' && target.id === A.campId && !target.kind && s.status === 'open' && !A.carried) {
          const D = state.world.factions[A.factionId];
          scene.entities.push({ kind: 'noble', x: 210, y: HB.raid.GROUND, w: 8, h: 12, label: `Envoy ${A.envoy}`, sprite: 'dwarf', captive: true, captiveKind: 'envoy', captiveWeight: 2, captiveDesc: `An envoy of ${D.name}, taken on the road. Release the envoy for their gratitude, or ransom them.`, personName: `Envoy ${A.envoy}`, captiveFaction: D.id, sitId: s.id });
        }
        if (s.t === 'slayerBounty' && (target.id === A.heroId || target.id === A.hunterId) && target.kind) {
          const it = HB.hoard.makeArtifact('smokeglass', A.hero, state.time.year);
          scene.entities.push({ kind: 'artifact', x: 150, y: HB.raid.GROUND, w: 10, h: 10, loot: { item: it, value: it.value, weight: it.weight }, access: 'exposed', label: 'the Smoke-Glass in the slayer’s pack', artifact: true });
          const hero = scene.entities.find(e => e.kind === 'hero'); const purse = target.purse || 0;
          if (hero && purse) hero.drop = { gold: purse, value: purse, weight: Math.max(0.3, purse / 100), label: 'the bounty purse' };
        }
      }
    },
  };
})();

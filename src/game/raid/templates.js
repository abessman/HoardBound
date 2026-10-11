/* Raid scene templates: build an entity layout from a location (or entity) and its faction's learned defences. */
(function () {
  const HB = globalThis.HB;
  const G = () => HB.raid.GROUND;

  const T = HB.raidTemplates = {
    /** pick template id for a target */
    pick(target) {
      if (target.kind === 'caravan') return 'caravan';
      if (target.kind === 'hero' || target.kind === 'hunters') return 'hero';
      if (target.kind === 'army') return 'battlefield';
      const m = { farm: 'village', village: 'village', town: 'village', city: 'village', castle: 'castle', camp: 'camp', warren: 'camp', mine: 'mine', battlefield: 'battlefield', rivalLair: 'dragonDuel' };
      return m[target.type] || null;
    },
    build(state, target, rng) {
      const id = T.pick(target);
      const builder = T.builders[id];
      const scene = builder(state, target, rng, T.ctx(state, target));
      scene.templateId = id;
      scene.entities.forEach((e, i) => { e.id = i + 1; });
      return scene;
    },
    ctx(state, target) {
      const W = state.world;
      const f = target.factionId >= 0 ? W.factions[target.factionId] : null;
      return { W, f, learned: f ? f.learned : { escorts: 0, vaults: 0, rescue: 0, hunters: 0, wards: 0 }, tier: state.dragon.tier, year: state.time.year, hostility: f ? f.dragon.hostility : 0, fear: f ? f.dragon.fear : 0 };
    },
    // helpers
    lootNode(rng, item, x, access, label, extra) { return Object.assign({ kind: item.gold ? 'coins' : item.cat === 'gems' ? 'gem' : item.cat === 'royal' ? 'crown' : item.cat === 'books' ? 'book' : item.cat === 'arms' ? 'sword' : 'chest', x, y: G(), w: 10, h: 8, loot: item.gold ? { gold: item.gold, value: item.gold, weight: Math.max(0.3, item.gold / 100) } : { item, value: item.value, weight: item.weight }, access: access || 'exposed', label: label || (item.gold ? `${HB.fmt.int(item.gold)} gold` : HB.hoard.itemLabel(item)) }, extra || {}); },
    person(kind, x, label, extra) { return Object.assign({ kind, x, y: G(), w: 8, h: 12, label }, extra || {}); },
    /** split location wealth into loot nodes: returns {gold piles, items} */
    lootFor(state, target, rng, fraction) {
      const loot = HB.hoard.generateLoot(rng, target, fraction, state.time.year);
      const piles = [];
      let g = loot.gold;
      while (g > 0) { const take = Math.min(g, Math.max(20, Math.round(g * (0.4 + rng.next() * 0.4)))); piles.push({ gold: take }); g -= take; if (piles.length > 6) { piles[piles.length - 1].gold += g; g = 0; } }
      return { piles, items: loot.items };
    },
    artifactNode(state, target, x, access, extra) {
      if (!target.special) return null;
      const it = HB.hoard.makeArtifact(target.special, target.name, state.time.year);
      return Object.assign({ kind: 'artifact', x, y: G(), w: 10, h: 10, loot: { item: it, value: it.value, weight: it.weight }, access, label: it.name, artifact: true }, extra || {});
    },
    captiveFor(target, kindKey, x, rng, culture) {
      const k = HB.CAPTIVE_KINDS[kindKey];
      const name = HB.names.person(rng, culture || 'westron', false);
      const title = kindKey === 'noble' ? (rng.chance(0.5) ? 'Lady ' : 'Lord ') : kindKey === 'knight' ? 'Sir ' : '';
      return T.person(kindKey === 'knight' ? 'knight' : kindKey === 'smith' || kindKey === 'engineer' || kindKey === 'miner' ? 'worker' : kindKey === 'priest' ? 'priest' : 'noble', x, title + name, { captive: true, captiveKind: kindKey, captiveWeight: k.weight, captiveDesc: k.desc, personName: title + name, house: target.ruler ? target.ruler.house : null, defender: kindKey === 'knight' });
    },

    builders: {
      caravan(state, target, rng, ctx) {
        const wealth = target.wealth || 300;
        const escorts = (target.escort || 0) + ctx.learned.escorts;
        const ents = [];
        const length = 300 + Math.min(4, 1 + Math.floor(wealth / 250)) * 70;
        const wagons = Math.min(4, 1 + Math.floor(wealth / 250));
        const loot = T.lootFor(state, Object.assign({}, target, { type: 'town', name: 'the caravan' }), rng, 1);
        const items = loot.items.slice(); const piles = loot.piles.slice();
        for (let i = 0; i < wagons; i++) {
          const x = 90 + i * 70;
          const rich = i === wagons - 1 && wagons > 1;
          ents.push({ kind: 'wagon', x, y: G(), w: 16, h: 12, label: rich ? 'the rich wagon' : `wagon ${i + 1}`, building: true, sprite: rich ? 'wagonRich' : 'wagon', contents: rich ? 'The best goods ride in the last wagon.' : 'Goods and a strongbox.' });
          ents.push(T.person('horse', x + 22, 'a draft horse'));
          ents.push(T.person('merchant', x - 12, 'the driver'));
          // exposed loot on the first wagon, inside for the rest
          const pile = piles.shift(); const item = items.shift();
          if (i === 0) { if (pile) ents.push(T.lootNode(rng, pile, x + 4, 'exposed', 'the strongbox on the seat')); }
          else { if (pile) ents.push(T.lootNode(rng, pile, x + 2, 'inside', null, { insideOf: null, container: 'the wagon' })); }
          if (item) ents.push(T.lootNode(rng, item, x + 8, rich ? 'inside' : (i === 0 ? 'exposed' : 'inside'), null, { container: 'the wagon' }));
          // guards
          const n = i === 0 ? Math.min(2, escorts) : 1 + Math.min(3, escorts + (rich ? 1 : 0));
          for (let k = 0; k < n; k++) ents.push(T.person(k === 0 && rich && escorts >= 2 ? 'knight' : 'guard', x + 30 + k * 10, k === 0 && rich && escorts >= 2 ? 'the escort knight' : 'a caravan guard'));
          if (escorts >= 2 && i > 0) ents.push(T.person('archer', x - 24, 'an escort archer'));
        }
        // mark loot inside wagons
        for (const e of ents) if (e.loot && e.access === 'inside') { const w = ents.find(o => o.building && Math.abs(o.x - e.x) < 14); if (w) e.insideOf = w.id === undefined ? (w.id = 500 + ents.indexOf(w)) : w.id; }
        // heir on a rich caravan
        if (wagons >= 3 && rng.chance(0.5)) ents.push(T.captiveFor(target, 'heir', 90 + (wagons - 1) * 70 - 6, rng, ctx.f ? ctx.f.culture : 'westron'));
        return { entities: ents, length, intro: `A caravan of ${wagons} wagon${wagons > 1 ? 's' : ''} winds along the road. ${escorts >= 2 ? 'It is well escorted.' : escorts ? 'A few guards walk beside it.' : 'It is barely guarded.'}`, backdrop: 'road', alarmBase: 1.4, escalations: [
          { at: 30, text: 'The guards close ranks around the wagons.' },
          { at: 60, text: 'Outriders gallop back to the fight.', spawn: [{ kind: 'knight', x: -30, label: 'an outrider' }, { kind: 'archer', x: length + 20, label: 'an outrider' }] },
          { at: 85, text: 'The caravan master breaks out crossbows.', spawn: [{ kind: 'archer', x: 100, label: 'a crossbowman' }, { kind: 'archer', x: 200, label: 'a crossbowman' }] },
        ] };
      },
      camp(state, target, rng, ctx) {
        const goblin = target.type === 'warren' || target.camp === 'goblin';
        const hunter = target.camp === 'hunter';
        const ents = [];
        const n = HB.clamp(Math.round((target.defense || 14) / 5), 2, 9);
        const length = 320 + n * 22;
        const loot = T.lootFor(state, target, rng, 1);
        const night = true;
        for (let i = 0; i < Math.ceil(n / 2) + 1; i++) ents.push({ kind: 'tent', x: 90 + i * 55, y: G(), w: 14, h: 10, label: i === 0 ? 'the captain’s tent' : 'a tent', building: true, sprite: goblin ? 'tentDark' : 'tent', contents: 'Bedrolls and whatever they stole.' });
        ents.push({ kind: 'campfire', x: 150, y: G(), w: 8, h: 6, label: 'the fire', decor: true });
        for (let i = 0; i < n; i++) {
          const asleep = night && i < Math.ceil(n * 0.6) && !hunter;
          const kind = goblin ? (i % 3 === 2 ? 'goblinArcher' : 'goblin') : hunter ? (i % 2 ? 'archer' : 'guard') : 'bandit';
          const x = 70 + i * (length - 100) / n + rng.int(14);
          ents.push(T.person(kind, x, goblin ? 'a goblin' : hunter ? 'a hunter' : 'a bandit', { state: asleep ? 'asleep' : 'idle' }));
        }
        const leaderX = 90;
        ents.push(T.person(goblin ? 'goblin' : 'captain', leaderX + 10, target.ruler ? target.ruler.name : 'the captain', { hp: goblin ? 14 : 20, attack: goblin ? 5 : 7, drop: loot.items[0] ? { item: loot.items[0], value: loot.items[0].value, weight: loot.items[0].weight, label: HB.hoard.itemLabel(loot.items[0]) } : null }));
        loot.piles.forEach((p, i) => ents.push(T.lootNode(rng, p, 100 + i * 60 + rng.int(20), i === 0 ? 'exposed' : 'exposed', i === 0 ? 'a sack of coin by the fire' : 'a strongbox')));
        loot.items.slice(1).forEach((it, i) => ents.push(T.lootNode(rng, it, 120 + i * 70, 'exposed')));
        const art = T.artifactNode(state, target, leaderX + 4, 'inside', { container: 'the captain’s chest', insideOf: null });
        if (art) { ents.push(art); const tent = ents[0]; art.insideOf = 500; tent.id = 500; }
        if (!goblin && rng.chance(0.3)) ents.push(T.person('villager', 200, 'a captive villager', { prisoner: true }));
        for (let i = 0; i < 2; i++) ents.push(T.person('horse', 260 + i * 16, 'a stolen horse'));
        return { entities: ents, length, intro: hunter ? 'A hunters’ camp. These people are awake and know what you are.' : `${goblin ? 'Goblin' : 'Bandit'} camp. ${night ? 'Most of them are asleep around the fire.' : 'They are awake.'}`, backdrop: night ? 'night' : 'forest', night, alarmBase: 1.3, escalations: [
          { at: 25, text: 'Someone shouts. The sleepers stir.', effect: (r) => { for (const e of r.entities) if (e.state === 'asleep') e.state = 'alert'; } },
          { at: 55, text: 'They form up with spears and bows.', spawn: [{ kind: goblin ? 'goblinArcher' : 'archer', x: 40, label: goblin ? 'a goblin archer' : 'a bandit archer' }] },
          { at: 85, text: 'Riders come in from the dark.', spawn: [{ kind: goblin ? 'goblin' : 'bandit', x: length + 10, label: 'a rider' }, { kind: goblin ? 'goblin' : 'bandit', x: length + 24, label: 'a rider' }] },
        ] };
      },
      castle(state, target, rng, ctx) {
        const ents = [];
        const def = target.defense || 55;
        const length = 520;
        const loot = T.lootFor(state, target, rng, 1);
        const culture = ctx.f ? ctx.f.culture : 'westron';
        // outer wall with towers
        ents.push({ kind: 'tower', x: 120, y: G(), w: 18, h: 60, label: 'the gate tower', building: true, sprite: 'towerSeg', contents: 'Archers on the top.' });
        ents.push({ kind: 'wall', x: 160, y: G(), w: 64, h: 24, label: 'the wall', decor: true, building: false });
        ents.push({ kind: 'tower', x: 200, y: G(), w: 18, h: 60, label: 'the east tower', building: true, sprite: 'towerSeg', contents: 'A lord’s goblet glints on the parapet.' });
        ents.push({ kind: 'keep', x: 340, y: G(), w: 40, h: 80, label: 'the keep', building: true, sprite: 'keep', contents: 'The vault and the lord’s family are inside.' });
        ents.push({ kind: 'house', x: 270, y: G(), w: 24, h: 16, label: 'the great hall', building: true, sprite: 'house', contents: 'Feast silver and tapestries.' });
        ents.push({ kind: 'house', x: 420, y: G(), w: 22, h: 14, label: 'the stables', building: true, sprite: 'house', contents: 'Horses.' });
        // exposed goblet on tower top (quick theft)
        const goblet = loot.items.find(i => i.cat === 'royal' || i.cat === 'gems') || loot.items[0];
        if (goblet) ents.push(T.lootNode(rng, goblet, 204, 'exposed', 'the goblet on the parapet', { y: G() - 56, onTower: true }));
        // vault inside the keep
        const vaultItems = loot.items.filter(i => i !== goblet);
        const keep = ents.find(e => e.kind === 'keep'); keep.id = 500;
        vaultItems.forEach((it, i) => ents.push(T.lootNode(rng, it, 330 + i * 6, 'inside', null, { insideOf: 500, container: 'the vault' })));
        loot.piles.forEach((p, i) => ents.push(T.lootNode(rng, p, 336 + i * 5, 'inside', 'the vault’s coin', { insideOf: 500, container: 'the vault' })));
        const art = T.artifactNode(state, target, 345, 'inside', { insideOf: 500, container: 'the vault' }); if (art) ents.push(art);
        // courtyard chest (exposed but guarded)
        if (loot.piles.length) { const p = { gold: Math.round(loot.piles[0].gold * 0.5) }; loot.piles[0].gold -= p.gold; ents.push(T.lootNode(rng, p, 300, 'exposed', 'the paymaster’s chest', { watchers: 6 })); }
        // defenders
        const archers = HB.clamp(Math.round(def / 18), 2, 6);
        for (let i = 0; i < archers; i++) ents.push(T.person('archer', i % 2 ? 200 + rng.int(8) : 120 + rng.int(8), 'a wall archer', { y: G() - 56, onTower: true, range: 170 }));
        const guards = HB.clamp(Math.round(def / 14), 2, 7);
        for (let i = 0; i < guards; i++) ents.push(T.person(i === 0 ? 'captain' : 'guard', 240 + i * 24, i === 0 ? 'the captain of the guard' : 'a man-at-arms'));
        if (def >= 55 || ctx.learned.hunters >= 1) ents.push({ kind: 'ballista', x: 160, y: G() - 22, w: 14, h: 10, label: 'the wall ballista', onWall: true });
        // noble on the keep balcony (capturable)
        ents.push(T.captiveFor(target, 'noble', 352, rng, culture));
        ents[ents.length - 1].y = G() - 40; ents[ents.length - 1].onBalcony = true;
        if (rng.chance(0.5)) ents.push(T.captiveFor(target, 'engineer', 440, rng, culture));
        for (let i = 0; i < 2; i++) ents.push(T.person('horse', 430 + i * 14, 'a warhorse'));
        ents.push(T.person('villager', 290, 'a servant')); ents.push(T.person('villager', 380, 'a page'));
        return { entities: ents, length, intro: `${target.name}. Archers on the towers, a goblet on the parapet, and the vault deep in the keep.`, backdrop: 'castle', alarmBase: 1.9, escalations: [
          { at: 25, text: 'Bells ring from the keep.' },
          { at: 50, text: 'Men-at-arms pour into the yard.', spawn: [{ kind: 'guard', x: 345, label: 'a man-at-arms' }, { kind: 'guard', x: 360, label: 'a man-at-arms' }, { kind: 'militia', x: 100, label: 'a levy' }] },
          { at: 70, text: 'Crossbows line the walls.', spawn: [{ kind: 'archer', x: 130, y: G() - 56, onTower: true, range: 180, label: 'a crossbowman' }, { kind: 'archer', x: 210, y: G() - 56, onTower: true, range: 180, label: 'a crossbowman' }] },
          { at: 88, text: `${target.ruler ? target.ruler.name : 'The lord'}’s champion rides out.`, spawn: [{ kind: 'hero', x: 460, label: 'the champion', hp: 40, attack: 11 }] },
        ] };
      },
      village(state, target, rng, ctx) {
        const ents = [];
        const tier = target.tier || 0;
        const culture = ctx.f ? ctx.f.culture : 'westron';
        const houses = tier === 0 ? 1 : tier === 1 ? 4 : tier === 2 ? 7 : 10;
        const length = 260 + houses * 48;
        const loot = T.lootFor(state, target, rng, 1);
        const items = loot.items.slice(), piles = loot.piles.slice();
        let x = 80;
        let hid = 500;
        for (let i = 0; i < houses; i++) {
          const w = 20 + rng.int(10);
          const h = { kind: 'house', x, y: G(), w, h: 16, label: tier === 0 ? 'the farmhouse' : i === Math.floor(houses / 2) && tier >= 1 ? 'the reeve’s house' : 'a house', building: true, sprite: 'house', variant: tier >= 2 && rng.chance(0.5) ? 1 : 0, contents: 'A family and their savings.', id: hid++ };
          ents.push(h);
          if (rng.chance(0.6)) { const p = piles.shift(); if (p) ents.push(T.lootNode(rng, p, x + 2, 'inside', 'the family’s savings', { insideOf: h.id, container: 'the house' })); }
          ents.push(T.person(rng.chance(0.5) ? 'villager' : 'merchant', x - 12 + rng.int(10), 'a villager', { insideOf: null, sprite: rng.chance(0.5) ? 'villager' : 'villager2' }));
          x += 48;
        }
        // livestock pen
        ents.push({ kind: 'barn', x: x + 10, y: G(), w: 26, h: 16, label: 'the barn', building: true, sprite: 'house', variant: 2, contents: 'Hay and animals.', id: hid++ });
        for (let i = 0; i < 3 + tier; i++) ents.push(T.person(i % 3 === 0 ? 'cow' : 'sheep', 40 + i * 12, i % 3 === 0 ? 'a cow' : 'a sheep'));
        // granary / treasury
        if (tier >= 1) { const g = { kind: 'granary', x: 100 + houses * 24, y: G(), w: 22, h: 20, label: 'the granary', building: true, sprite: 'house', variant: 2, granary: true, contents: 'The winter’s grain. Burn it and they starve.', id: hid++ }; ents.push(g); }
        if (tier >= 2) {
          const tr = { kind: 'keep', x: 140 + houses * 30, y: G(), w: 30, h: 40, label: tier >= 3 ? 'the treasury' : 'the town hall', building: true, sprite: 'keep', contents: 'The town’s coin, behind a barred door.', id: hid++ };
          ents.push(tr);
          items.splice(0, 3).forEach((it, i) => ents.push(T.lootNode(rng, it, tr.x + i * 5, 'inside', null, { insideOf: tr.id, container: 'the barred door' })));
          piles.splice(0, 2).forEach((p, i) => ents.push(T.lootNode(rng, p, tr.x + 3 + i * 5, 'inside', 'the town’s coin', { insideOf: tr.id, container: 'the barred door' })));
          ents.push(T.captiveFor(target, tier >= 3 ? 'noble' : 'official', tr.x + 20, rng, culture));
        }
        // market stall with exposed goods
        if (tier >= 1) { ents.push({ kind: 'stall', x: 60, y: G(), w: 14, h: 10, label: 'the market stall', building: true, sprite: 'crate', contents: 'Goods.', id: hid++ }); const it = items.shift(); if (it) ents.push(T.lootNode(rng, it, 66, 'exposed', null, { watchers: 2 })); const p = piles.shift(); if (p) ents.push(T.lootNode(rng, p, 50, 'exposed', 'the stallkeeper’s box')); }
        else { const p = piles.shift(); if (p) ents.push(T.lootNode(rng, p, 60, 'exposed', 'a purse on the fence')); }
        // remaining items scattered inside houses
        for (const it of items) { const h = ents.filter(e => e.kind === 'house')[rng.int(houses)]; if (h) ents.push(T.lootNode(rng, it, h.x + 3, 'inside', null, { insideOf: h.id, container: 'the house' })); }
        const art = T.artifactNode(state, target, 140 + houses * 30 + 4, 'inside', { insideOf: hid - 1, container: 'the vault' }); if (art && tier >= 2) ents.push(art);
        // defenders
        const def = target.defense || 10;
        const n = HB.clamp(Math.round(def / 9), tier === 0 ? 0 : 1, 7);
        for (let i = 0; i < n; i++) ents.push(T.person(tier >= 2 && i % 3 === 1 ? 'archer' : 'guard', 120 + i * (length - 160) / Math.max(1, n), tier >= 2 ? 'a watchman' : 'a militiaman', { hp: tier >= 2 ? 14 : 9, attack: tier >= 2 ? 5 : 3 }));
        if (tier >= 3) { ents.push({ kind: 'tower', x: 110, y: G(), w: 18, h: 60, label: 'the gate tower', building: true, sprite: 'towerSeg' }); ents.push(T.person('archer', 112, 'a tower archer', { y: G() - 56, onTower: true, range: 170 })); ents.push(T.person('archer', 118, 'a tower archer', { y: G() - 56, onTower: true, range: 170 })); if (def >= 55) ents.push({ kind: 'ballista', x: 160, y: G() - 22, w: 14, h: 10, label: 'the ballista', onWall: true }); }
        if (ctx.learned.vaults >= 1 && tier >= 1) for (const e of ents) if (e.loot && e.access === 'exposed' && e.loot.item && e.loot.item.cat === 'gems') { e.access = 'inside'; e.container = 'a locked chest'; }
        if (rng.chance(0.4 + tier * 0.2) && tier >= 1) ents.push(T.captiveFor(target, 'smith', 90 + rng.int(100), rng, culture));
        const nameType = HB.world.locTypeName(target);
        return { entities: ents, length, intro: `${target.name}, a ${nameType}. ${tier === 0 ? 'A farmhouse, a barn, a few animals.' : tier === 1 ? 'Houses, a granary, livestock in the pens.' : 'Streets, a market, a barred treasury.'}`, backdrop: tier >= 2 ? 'town' : 'village', alarmBase: 1.5 + tier * 0.2, escalations: [
          { at: 25, text: 'The bell rings. Doors slam.' },
          { at: 50, text: 'Militia gather with pitchforks and bows.', spawn: [{ kind: 'militia', x: -20, label: 'a militiaman' }, { kind: 'militia', x: length + 20, label: 'a militiaman' }, { kind: 'archer', x: length / 2, label: 'a hunter with a bow', hp: 8 }] },
          { at: 75, text: tier >= 2 ? 'The watch forms a shield wall.' : 'A rider gallops for help.', spawn: tier >= 2 ? [{ kind: 'guard', x: length / 2 - 20, label: 'a watchman' }, { kind: 'guard', x: length / 2 + 20, label: 'a watchman' }] : [] },
          { at: 90, text: tier >= 2 ? 'Knights ride in from the castle.' : 'A knight errant arrives.', spawn: [{ kind: 'knight', x: length + 30, label: 'a knight' }] },
        ] };
      },
      hero(state, target, rng, ctx) {
        const ents = [];
        const length = 300;
        const novice = (target.level || 1) <= 1;
        const hero = T.person('hero', 180, target.name || 'the hero', { hp: novice ? 22 : 40 + (target.level || 2) * 8, attack: novice ? 7 : 10 + (target.level || 2) * 2, range: 110, courage: novice ? 1.4 : 3, personName: target.name });
        if (target.lance) { hero.attack *= 1.8; hero.label += ' (dragon-lance)'; }
        ents.push({ kind: 'campfire', x: 160, y: G(), w: 8, h: 6, label: 'the fire', decor: true });
        ents.push(hero);
        ents.push(T.person('horse', 215, 'the hero’s horse'));
        const pack = { gold: Math.round(rng.between(40, 160) * (target.level || 1)) };
        hero.drop = { gold: pack.gold, value: pack.gold, weight: pack.gold / 100, label: 'the hero’s purse' };
        const it = HB.hoard.makeItem(rng.pick(HB.LOOT.arms), rng, target.name, state.time.year); it.value = Math.round(it.value * (1 + (target.level || 1) * 0.3));
        ents.push(T.lootNode(rng, it, 150, 'exposed', 'the hero’s pack'));
        return { entities: ents, length, intro: `${target.name || 'A wandering hero'} sits by a small fire${novice ? ', green but armed' : ', scarred and ready'}${target.lance ? ', with a long lance made for killing dragons' : ''}.`, backdrop: 'forest', alarmBase: 0.6, escalations: [
          { at: 40, text: `${target.name || 'The hero'} shouts a challenge.` },
          { at: 80, text: 'Companions come running.', spawn: novice ? [] : [{ kind: 'archer', x: 40, label: 'a companion' }, { kind: 'guard', x: 260, label: 'a companion' }] },
        ] };
      },
      mine(state, target, rng, ctx) {
        const ents = [];
        const length = 360;
        const loot = T.lootFor(state, target, rng, 1);
        ents.push({ kind: 'house', x: 90, y: G(), w: 24, h: 14, label: 'the foreman’s hut', building: true, sprite: 'house', variant: 1, contents: 'Wages for the month.', id: 500 });
        ents.push({ kind: 'keep', x: 300, y: G(), w: 34, h: 30, label: 'the mine mouth', building: true, sprite: 'gate', contents: 'Ore carts just inside.', id: 501, noBurn: true });
        loot.piles.forEach((p, i) => ents.push(T.lootNode(rng, p, i === 0 ? 96 : 150 + i * 20, i === 0 ? 'inside' : 'exposed', i === 0 ? 'the wage box' : 'an ore cart', i === 0 ? { insideOf: 500, container: 'the hut' } : {})));
        loot.items.forEach((it, i) => ents.push(T.lootNode(rng, it, 290 + i * 8, 'inside', null, { insideOf: 501, container: 'the mine' })));
        const art = T.artifactNode(state, target, 310, 'inside', { insideOf: 501, container: 'the mine' }); if (art) ents.push(art);
        for (let i = 0; i < 4; i++) ents.push(T.person('worker', 140 + i * 30, 'a miner', { sprite: ctx.f && ctx.f.kind === 'dwarf' ? 'dwarf' : 'villager' }));
        ents.push(T.captiveFor(target, 'miner', 200, rng, ctx.f ? ctx.f.culture : 'westron'));
        const n = HB.clamp(Math.round((target.defense || 12) / 8), 1, 4);
        for (let i = 0; i < n; i++) ents.push(T.person(ctx.f && ctx.f.kind === 'dwarf' ? 'dwarfWarrior' : 'guard', 120 + i * 60, ctx.f && ctx.f.kind === 'dwarf' ? 'a dwarf warden' : 'a mine guard'));
        return { entities: ents, length, intro: `${target.name}. Ore carts by the entrance, miners at work, a wage box in the foreman’s hut.`, backdrop: 'hills', alarmBase: 1.3, escalations: [
          { at: 30, text: 'Picks are dropped; shouts echo from the shaft.' },
          { at: 60, text: 'Miners come up with hammers and lamps.', spawn: [{ kind: 'militia', x: 300, label: 'a miner' }, { kind: 'militia', x: 310, label: 'a miner' }] },
          { at: 85, text: 'A wagon of guards arrives from the road.', spawn: [{ kind: 'guard', x: -20, label: 'a guard' }, { kind: 'archer', x: -30, label: 'a guard' }] },
        ] };
      },
      battlefield(state, target, rng, ctx) {
        const ents = [];
        const length = 400;
        for (let i = 0; i < 8; i++) ents.push({ kind: 'corpse', x: 60 + i * 42 + rng.int(20), y: G(), w: 10, h: 6, label: 'the fallen', decor: true });
        for (let i = 0; i < 5; i++) { const it = HB.hoard.makeItem(rng.pick(HB.LOOT.arms), rng, 'the battlefield', state.time.year); ents.push(T.lootNode(rng, it, 70 + i * 60, 'exposed')); }
        ents.push(T.lootNode(rng, { gold: Math.round(rng.between(60, 200)) }, 230, 'exposed', 'a paymaster’s chest'));
        for (let i = 0; i < 3; i++) ents.push(T.person('villager', 100 + i * 90, 'a scavenger'));
        for (let i = 0; i < 2; i++) ents.push(T.person('guard', 150 + i * 120, 'a wounded soldier', { hp: 7 }));
        return { entities: ents, length, intro: 'Crows over a battlefield. Arms and coin lie among the dead, and the living are too tired to care.', backdrop: 'dusk', alarmBase: 0.9, escalations: [
          { at: 50, text: 'A burial party arrives with an escort.', spawn: [{ kind: 'archer', x: -20, label: 'an escort archer' }, { kind: 'guard', x: -30, label: 'an escort' }] },
          { at: 85, text: 'Cavalry from the victorious host.', spawn: [{ kind: 'knight', x: length + 20, label: 'a knight' }, { kind: 'knight', x: length + 40, label: 'a knight' }] },
        ] };
      },
      dragonDuel(state, target, rng, ctx) {
        const ents = [];
        const length = 360;
        const rd = target.dragon || { name: 'the wyrm', tier: 2, breed: 'black' };
        const elder = rd.tier >= 3;
        ents.push({ kind: 'keep', x: 300, y: G(), w: 50, h: 40, label: 'the hoard chamber', building: true, sprite: 'gate', contents: 'The rival’s hoard.', id: 500, noBurn: true });
        const loot = T.lootFor(state, target, rng, 1);
        loot.piles.forEach((p, i) => ents.push(T.lootNode(rng, p, 290 + i * 6, 'inside', 'heaped gold', { insideOf: 500, container: 'the hoard chamber' })));
        loot.items.forEach((it, i) => ents.push(T.lootNode(rng, it, 300 + i * 6, 'inside', null, { insideOf: 500, container: 'the hoard chamber' })));
        const art = T.artifactNode(state, target, 320, 'inside', { insideOf: 500, container: 'the hoard chamber' }); if (art) ents.push(art);
        ents.push(T.person('rivalDragon', 180, rd.name, { hp: elder ? 420 : 200, attack: elder ? 34 : 22, range: 130, rate: elder ? 2.4 : 3, courage: 9, rival: rd, w: 30, h: 24, drop: null }));
        for (let i = 0; i < 2; i++) ents.push({ kind: 'corpse', x: 100 + i * 60, y: G(), w: 10, h: 6, label: 'a dead hero', decor: true });
        return { entities: ents, length, intro: `${rd.name}${elder ? ', the elder wyrm,' : ''} coils before the hoard chamber and does not look surprised.`, backdrop: 'night', night: true, alarmBase: 0.2, escalations: [{ at: 60, text: `${rd.name} roars; the mountain answers.` }], duel: true };
      },
    },
  };
})();

/* Card encounters for places that resolve by decision rather than an animated raid. Headless-safe data.
 * Each choice has a resolve(ctx) returning {text, ...effects}. ctx: {state, L, rng, stats, roll(p)}. */
(function () {
  const HB = globalThis.HB;

  const gold = (ctx, lo, hi) => Math.round(ctx.rng.between(lo, hi) * (1 + ctx.L.wealth / 2000));
  const takeGold = (ctx, g) => { ctx.state.cargo.gold += g; ctx.stolen += g; return g; };
  // what a place can give is bounded by what it has: a shrine does not hide a king's crown
  const fitting = (ctx, cat) => { const cap = Math.max(60, ctx.L.wealth * 0.6); const defs = HB.LOOT[cat].filter(d => d[2] <= cap); return { defs: defs.length ? defs : [HB.LOOT[cat].slice().sort((a, b) => a[2] - b[2])[0]], cap }; };
  const takeItems = (ctx, cat, n) => { const out = []; for (let i = 0; i < n; i++) { const { defs, cap } = fitting(ctx, cat); const it = HB.hoard.makeItem(ctx.rng.pick(defs), ctx.rng, ctx.L.name, ctx.state.time.year); it.value = Math.min(it.value, Math.round(Math.max(cap, 40))); if (!HB.hoard.canCarry(ctx.state, it.weight + ctx.extraWeight)) break; ctx.state.cargo.items.push(it); ctx.stolen += it.value; ctx.extraWeight += it.weight; out.push(it); } return out; };
  const takeArtifact = (ctx) => { if (!ctx.L.special) return null; const it = HB.hoard.makeArtifact(ctx.L.special, ctx.L.name, ctx.state.time.year); if (!HB.hoard.canCarry(ctx.state, it.weight + ctx.extraWeight)) return false; ctx.state.cargo.items.push(it); ctx.stolen += it.value; ctx.L.special = null; ctx.artifact = it; return it; };
  const hurt = (ctx, lo, hi) => { const d = Math.round(ctx.rng.between(lo, hi) - ctx.stats.defense * 0.5); const dmg = Math.max(1, d); ctx.state.dragon.health = Math.max(1, ctx.state.dragon.health - dmg); ctx.damage += dmg; return dmg; };
  const list = (items) => items.length ? HB.fmt.list(items.map(i => HB.hoard.itemLabel(i))) : 'nothing';

  HB.CARD_ENCOUNTERS = {
    monastery: {
      illustration: 'monastery',
      intro: (ctx) => `${ctx.L.name}. Bells, a walled garden, and a chapel where the brothers keep ${ctx.L.special ? 'a relic they will not name' : 'their books and silver'}.`,
      choices: [
        { label: 'Snatch the chapel silver', desc: 'Quick and loud. Books and plate; the brothers scatter.', resolve: (ctx) => { const items = takeItems(ctx, 'books', 1).concat(takeItems(ctx, 'royal', 1)); const g = takeGold(ctx, 40, 140); ctx.fear = 3; ctx.hostility = 2; return { text: `You crash through the chapel roof and leave with ${list(items)} and ${g} gold. Hymns turn to screams behind you.` }; } },
        { label: 'Demand the relic', desc: 'Dominance test. Works on frightened monks; fails on brave ones.', resolve: (ctx) => { const ok = ctx.roll(0.3 + ctx.stats.dominance / 100 + ctx.stats.prestige / 200); if (!ok) { ctx.hostility = 1; return { text: 'The abbot folds his hands and tells you to leave. Nobody moves. You find you have no answer but fire, and you do not use it.' }; } const art = takeArtifact(ctx); ctx.fear = 4; ctx.hostility = 3; if (art === false) return { text: 'They bring the relic out — and you cannot carry it with what you already bear.' }; if (art) return { text: `The abbot brings out ${art.name} with shaking hands. "Take it, and go."` }; const g = takeGold(ctx, 120, 300); return { text: `They have no relic worth the name, but they empty the alms box: ${g} gold.` }; } },
        { label: 'Burn the cloister', desc: 'Tyranny. Everything inside may burn, including the relic. The faithful will not forget.', resolve: (ctx) => { ctx.burned = 1; ctx.fear = 8; ctx.hostility = 8; ctx.alignment = -6; ctx.L.state = 'burned'; ctx.L.wealth = Math.round(ctx.L.wealth * 0.3); const art = ctx.rng.chance(0.4) ? takeArtifact(ctx) : null; if (ctx.L.special && !art) ctx.L.special = null; const g = takeGold(ctx, 60, 200); return { text: `The cloister burns. You pick ${g} gold from the ashes${art ? ` and find ${art.name} untouched among the embers` : ''}. Somewhere a bell cracks in the heat.` }; } },
        { label: 'Leave them be', desc: '', resolve: (ctx) => ({ text: 'You circle once and fly on. The brothers will tell it as a miracle.' }) },
      ],
    },
    shrine: {
      illustration: 'monastery',
      intro: (ctx) => `${ctx.L.name}: a stone, a star, offerings left by travellers. A single keeper sweeps the step.`,
      choices: [
        { label: 'Take the offerings', desc: 'Small, easy, slightly shameful.', resolve: (ctx) => { const g = takeGold(ctx, 20, 80); const items = takeItems(ctx, 'royal', ctx.rng.chance(0.4) ? 1 : 0); ctx.fear = 1; ctx.hostility = 1; ctx.alignment = -1; return { text: `You take ${g} gold${items.length ? ' and ' + list(items) : ''}. The keeper does not stop sweeping.` }; } },
        { label: 'Search for what lies beneath', desc: 'Old shrines hide old things. A guardian may object.', resolve: (ctx) => { if (ctx.roll(0.5 + ctx.stats.intel / 20)) { const art = takeArtifact(ctx); if (art) return { text: `Beneath the stone, wrapped in rotted cloth: ${art.name}.` }; const items = takeItems(ctx, 'gems', 1); return { text: `Beneath the stone: ${list(items)}.` }; } const d = hurt(ctx, 6, 16); return { text: `Something old and cold wakes under the stone and lashes out: ${d} damage. You leave with nothing.` }; } },
        { label: 'Leave an offering', desc: 'Costs 20 carried gold. Trust with the realm grows.', disabled: (ctx) => ctx.state.cargo.gold < 20, disabledReason: 'You carry no gold', resolve: (ctx) => { ctx.state.cargo.gold -= 20; ctx.trust = 3; ctx.alignment = 2; return { text: 'You leave gold on the step. The keeper bows to a dragon. Word of that will travel.' }; } },
        { label: 'Fly on', desc: '', resolve: () => ({ text: 'You fly on.' }) },
      ],
    },
    ruin: {
      illustration: 'ruin',
      intro: (ctx) => `${ctx.L.name}. Broken columns, a stair going down, and the smell of something that has lived here a long time.`,
      choices: [
        { label: 'Take what glitters near the entrance', desc: 'Safe. Small.', resolve: (ctx) => { const items = takeItems(ctx, 'arms', 1); const g = takeGold(ctx, 20, 90); return { text: `Among the rubble: ${list(items)} and ${g} gold in old coin.` }; } },
        { label: 'Go down the stair', desc: 'Guardians. The real treasure, if there is one, is below.', resolve: (ctx) => { const guardian = ctx.L.defense || 20; const win = ctx.roll(0.35 + (ctx.stats.bite + ctx.stats.breath) / (guardian * 2.2)); const d = hurt(ctx, guardian * 0.3, guardian * 0.7); if (!win) return { text: `Something in the dark fights back: ${d} damage. You retreat up the stair with nothing but a new scar.`, scar: true }; const art = takeArtifact(ctx); const items = takeItems(ctx, ctx.rng.pick(['gems', 'royal', 'books']), 2); const g = takeGold(ctx, 80, 300); ctx.kills = 1; return { text: `You kill the thing in the dark (${d} damage taken) and claim ${art ? art.name + ', ' : ''}${list(items)} and ${g} gold.` }; } },
        { label: 'Fly on', desc: '', resolve: () => ({ text: 'Some doors are better left closed.' }) },
      ],
    },
    tower: {
      illustration: 'ruin',
      intro: (ctx) => `${ctx.L.name}. A light burns in the top window. ${ctx.L.ruler ? ctx.L.ruler.name + ' ' + ctx.L.ruler.title : 'The sage'} is known to trade in knowledge.`,
      choices: [
        { label: 'Threaten the sage', desc: 'Dominance. Sages are stubborn and occasionally dangerous.', resolve: (ctx) => { if (ctx.roll(0.35 + ctx.stats.dominance / 90)) { const items = takeItems(ctx, 'books', 2); const art = ctx.rng.chance(0.5) ? takeArtifact(ctx) : null; ctx.fear = 3; ctx.hostility = 2; return { text: `The sage hands over ${list(items)}${art ? ' and ' + art.name : ''} with a look that says this is not over.` }; } const d = hurt(ctx, 8, 22); return { text: `Light flares from the tower window: ${d} damage. "Come back when you are older," says a voice.` }; } },
        { label: 'Trade a carried gem for maps', desc: 'Give one gem item; receive rumours of distant lands.', disabled: (ctx) => !ctx.state.cargo.items.some(i => i.cat === 'gems'), disabledReason: 'You carry no gems', resolve: (ctx) => { const i = ctx.state.cargo.items.findIndex(i => i.cat === 'gems'); const it = ctx.state.cargo.items.splice(i, 1)[0]; const n = HB.world.rumor(ctx.state, ctx.L.x + (ctx.rng.next() - 0.5) * 60, ctx.L.y + (ctx.rng.next() - 0.5) * 60, 14); ctx.trust = 2; return { text: `For ${HB.hoard.itemLabel(it)}, the sage unrolls charts of lands you have not seen. ${n ? 'Your map grows at the edges.' : 'You knew most of it already.'}` }; } },
        { label: 'Burn the tower', desc: 'Books burn well. So does whatever was in them.', resolve: (ctx) => { ctx.burned = 1; ctx.fear = 6; ctx.hostility = 6; ctx.alignment = -5; ctx.L.state = 'burned'; ctx.L.wealth = Math.round(ctx.L.wealth * 0.2); ctx.L.special = null; const g = takeGold(ctx, 40, 160); return { text: `The tower burns like a torch. ${g} gold in melted silver, and a great deal of knowledge gone to smoke.` }; } },
        { label: 'Fly on', desc: '', resolve: () => ({ text: 'The light in the window watches you go.' }) },
      ],
    },
    glade: {
      illustration: 'monastery',
      intro: (ctx) => `${ctx.L.name}. Elven lanterns hang in the trees and the air hums with wards. Arrows are already nocked.`,
      choices: [
        { label: 'Snatch the shrine-gems and go', desc: 'Fast. The archers will hit you anyway.', resolve: (ctx) => { const items = takeItems(ctx, 'gems', 2); const d = hurt(ctx, 10, 24); ctx.fear = 2; ctx.hostility = 5; return { text: `You tear ${list(items)} from the shrine tree and take ${d} damage from the archers on your way out.` }; } },
        { label: 'Land and speak', desc: 'Elves respect age and prestige. Hatchlings amuse them.', resolve: (ctx) => { if (ctx.roll(0.2 + ctx.stats.prestige / 150 + (ctx.state.dragon.alignment > 20 ? 0.2 : 0))) { const items = takeItems(ctx, 'books', 1); ctx.trust = 4; ctx.alignment = 1; return { text: `The warden speaks with you for an hour about the stars and gives you ${list(items)} as a gift. You are welcome here, which is rarer than gold.` }; } ctx.trust = 1; return { text: 'The warden listens politely and asks you to leave. The archers do not lower their bows.' }; } },
        { label: 'Burn the glade', desc: 'The wards will turn some of your fire back on you. Elves do not forgive.', resolve: (ctx) => { const d = hurt(ctx, 15, 30); ctx.burned = 1; ctx.fear = 6; ctx.hostility = 12; ctx.alignment = -8; ctx.L.state = 'burned'; ctx.L.wealth = Math.round(ctx.L.wealth * 0.3); const art = ctx.rng.chance(0.5) ? takeArtifact(ctx) : null; const items = takeItems(ctx, 'gems', 2); return { text: `The wards flash and your own fire scorches you (${d} damage), but the trees go up. You carry off ${list(items)}${art ? ' and ' + art.name : ''}. The elves will remember this for a thousand years.` }; } },
        { label: 'Fly on', desc: '', resolve: () => ({ text: 'You fly on. Somewhere behind you, a bow is unstrung.' }) },
      ],
    },
    hold: {
      illustration: 'ruin',
      intro: (ctx) => `${ctx.L.name}. A gate of iron in the mountainside, forges glowing within, and crossbows in every slit.`,
      choices: [
        { label: 'Raid the outer forge', desc: 'Weapons and armour from the yard. Crossbows will answer.', resolve: (ctx) => { const items = takeItems(ctx, 'arms', 2); const d = hurt(ctx, 12, 26); ctx.fear = 3; ctx.hostility = 5; return { text: `You snatch ${list(items)} from the forge yard and take ${d} damage from the crossbows.` }; } },
        { label: 'Break the gate', desc: 'Adult dragons only. The hold’s treasury is behind it, and so are its warriors.', disabled: (ctx) => ctx.state.dragon.tier < 2, disabledReason: 'Only an adult dragon can break an iron gate', resolve: (ctx) => { const def = ctx.L.defense || 70; const win = ctx.roll(0.3 + (ctx.stats.bite + ctx.stats.breath + ctx.stats.defense) / (def * 2.5)); const d = hurt(ctx, def * 0.35, def * 0.8); ctx.fear = 10; ctx.hostility = 12; ctx.kills = win ? 6 : 2; if (!win) return { text: `The gate holds and the warriors behind it do not: ${d} damage. You withdraw bleeding.`, scar: true }; const art = takeArtifact(ctx); const items = takeItems(ctx, 'gems', 2).concat(takeItems(ctx, 'arms', 2)); const g = takeGold(ctx, 600, 1800); ctx.L.wealth = Math.round(ctx.L.wealth * 0.6); return { text: `The gate buckles. You fight through the hall (${d} damage) and fly out with ${g} gold, ${list(items)}${art ? ' and ' + art.name : ''}. The dwarves will sing of this, bitterly.` }; } },
        { label: 'Offer to trade', desc: 'Give one carried gold-worth item; receive a dwarven weapon. Needs prestige.', disabled: (ctx) => !ctx.state.cargo.items.length, disabledReason: 'You carry nothing to trade', resolve: (ctx) => { if (!ctx.roll(0.3 + ctx.stats.prestige / 120)) return { text: 'The gate stays shut. A voice tells you that dwarves do not bargain with thieves.' }; const it = ctx.state.cargo.items.shift(); const got = HB.hoard.makeItem(['a dwarven axe', 'arms', 300, 500, 1.5], ctx.rng, ctx.L.name, ctx.state.time.year); ctx.state.cargo.items.push(got); ctx.trust = 3; return { text: `A hatch opens. You pass ${HB.hoard.itemLabel(it)} through it and receive ${HB.hoard.itemLabel(got)}. Nobody says thank you.` }; } },
        { label: 'Fly on', desc: '', resolve: () => ({ text: 'The crossbows track you until you are out of sight.' }) },
      ],
    },
    lair: null,
  };
})();

/* Optional Keeper episodes during sleep: a small avatar tends the sleeper; choices modify the same sleep simulation. */
(function () {
  const HB = globalThis.HB;

  const keeper = HB.keeper = {
    enabled(state) { return state.flags.keeper !== false && HB.settings.keeper !== false; },
    /** build an episode for the current sleep context; returns {title, text, illustration, choices:[{label, desc, apply(sl) -> text}]} */
    episode(state, sl, rng) {
      const v = HB.lair.values(state);
      const enslaved = state.lair.workers.find(w => w.status === 'enslaved');
      const paid = state.lair.workers.find(w => w.status === 'paid' && w.loyalty < 50);
      const gems = HB.stats.categoryTotals(state).gems;
      const pool = [];
      pool.push({ id: 'seal', w: 2, title: 'The Cracked Seal', text: 'The Keeper finds a crack running through the threshold stone. Cold air moves through it; so could a thief. There are gems in the hoard that would mend it, and the Keeper is small enough to carry one.',
        choices: [
          { label: 'Mend it with a gem from the hoard', desc: gems >= 150 ? 'Spend about 150 gold worth of gems; the ward and the door hold better this sleep.' : 'Not enough gems in the hoard.', disabled: gems < 150, apply: () => { keeper.spendGems(state, 150); sl.mods.defense += 8; sl.mods.ward += 6; return 'The Keeper works the gem into the stone. The crack seals with a sound like a sigh.'; } },
          { label: 'Pack it with mud and straw', desc: 'Free; a little help.', apply: () => { sl.mods.defense += 2; return 'A patch. It will hold if nobody looks closely.'; } },
          { label: 'Leave it', desc: '', apply: () => 'The Keeper decides the dragon would rather keep its gems.' },
        ] });
      if (state.dragon.health < state.dragon.stats.maxHealth * 0.8) pool.push({ id: 'injury', w: 3, title: 'An Old Wound', text: 'One of the dragon’s wounds has not closed. The Keeper knows a remedy that grows on the hillside outside, and knows that outside is where the hunters are.',
        choices: [
          { label: 'Go out for the remedy', desc: 'Heals the dragon fully. A small chance the Keeper is seen, which would reveal the lair.', apply: () => { state.dragon.health = state.dragon.stats.maxHealth; if (rng.chance(0.2)) { state.lair.attention = (state.lair.attention || 0) + 4; return 'The remedy works, but a shepherd saw a child climb into the hill. He will talk.'; } return 'The remedy works. The wound closes by morning.'; } },
          { label: 'Treat it with what is at hand', desc: 'Heals half the missing health. Safe.', apply: () => { const d = state.dragon; d.health = Math.min(d.stats.maxHealth, Math.round(d.health + (d.stats.maxHealth - d.health) / 2)); return 'Hot water and clean cloth. Not a cure, but better.'; } },
        ] });
      if (paid) pool.push({ id: 'wages', w: 2, title: 'Grumbling in the Dark', text: `The ${HB.WORKER_TYPES[paid.type].name.toLowerCase()} talk of leaving. The Keeper hears them at night. A gift from the hoard, or a promise, might keep them.`,
        choices: [
          { label: 'Give them 100 gold from the hoard', desc: state.hoard.gold >= 100 ? 'Loyalty rises sharply.' : 'Not enough gold.', disabled: state.hoard.gold < 100, apply: () => { state.hoard.gold -= 100; paid.loyalty = Math.min(100, paid.loyalty + 25); return 'Coin changes hands. The grumbling stops, for now.'; } },
          { label: 'Promise them the dragon’s favour', desc: 'Cheap; works a little; the Keeper is small and the promise is large.', apply: () => { paid.loyalty = Math.min(100, paid.loyalty + 8); return 'They laugh, but they stay.'; } },
        ] });
      if (enslaved) pool.push({ id: 'slaves', w: 2, title: 'Whispers of Escape', text: 'The Keeper finds a loosened bar and a hidden rope among the enslaved workers. Something is planned.',
        choices: [
          { label: 'Tell the guards', desc: 'The plan is broken; loyalty falls further.', apply: () => { enslaved.loyalty = Math.max(0, enslaved.loyalty - 10); sl.mods.unrest -= 1; return 'The rope is taken, the bar replaced. Nobody escapes this year. Nobody forgets, either.'; } },
          { label: 'Look the other way', desc: 'Some will escape and carry word of the lair. The Keeper sleeps easier.', apply: () => { const n = Math.min(enslaved.count, 2); enslaved.count -= n; state.lair.attention = (state.lair.attention || 0) + 2; state.dragon.alignment = HB.clamp(state.dragon.alignment + 2, -100, 100); if (enslaved.count <= 0) HB.lair.dismiss(state, enslaved); return `${n} slipped away in the night. The rest work with their heads down.`; } },
          { label: 'Free them all', desc: 'Lose the workers; trust with their realm grows.', apply: () => { HB.lair.dismiss(state, enslaved); const f = enslaved.factionId >= 0 ? state.world.factions[enslaved.factionId] : null; if (f) HB.factions.adjust(state, f, { trust: 5, hostility: -3 }, 'freed captives'); return 'The Keeper opens the door and points at the road. They do not thank anyone, but they go.'; } },
        ] });
      pool.push({ id: 'thieves', w: 2, title: 'Lights on the Hillside', text: 'Lanterns move on the slope below the cave, and the Keeper hears quiet voices discussing the entrance.',
        choices: [
          { label: 'Lay a false trail', desc: 'Thieves are less likely to find the hoard this sleep. Small risk the Keeper is caught.', apply: () => { if (rng.chance(0.15)) { sl.keeperCaught = true; state.lair.attention = (state.lair.attention || 0) + 5; return 'The Keeper is caught in the lantern light. They question the child, and learn where the dragon sleeps.'; } sl.mods.thiefMod -= 0.5; return 'The Keeper drags a sack of coin through the mud toward the river and leaves it in a hollow tree. The lanterns follow the trail and go away.'; } },
          { label: 'Wake the dragon', desc: 'Interrupt the sleep now; the thieves will not try a waking dragon.', apply: () => { sl.wakeRequested = true; return 'The Keeper puts a hand on the dragon’s brow and says its name.'; } },
          { label: 'Bar the door and wait', desc: '', apply: () => { sl.mods.defense += 3; return 'Stone against the door. The lanterns go up and down the hill all night and find nothing.'; } },
        ] });
      pool.push({ id: 'offering', w: 1.5, title: 'The Empty Bowl', text: 'The offering bowl before the sleeper is empty. The Keeper half-remembers that it should not be: the sleep goes deeper, and the growing goes better, when something is given.',
        choices: [
          { label: 'Fill it with 60 gold', desc: state.hoard.gold >= 60 ? 'The dragon grows a little faster this sleep.' : 'Not enough gold.', disabled: state.hoard.gold < 60, apply: () => { state.hoard.gold -= 60; sl.mods.growth += 0.1; return 'Coins in the bowl. The sleeper’s breathing slows and deepens.'; } },
          { label: 'Leave it empty', desc: '', apply: () => 'The bowl stays empty. Perhaps it never mattered.' },
        ] });
      const ep = rng.weighted(pool, p => p.w);
      return ep;
    },
    spendGems(state, value) {
      let left = value;
      state.hoard.items.sort((a, b) => a.value - b.value);
      for (let i = 0; i < state.hoard.items.length && left > 0; i++) { const it = state.hoard.items[i]; if (it.cat !== 'gems' || it.named) continue; left -= it.value; state.hoard.items.splice(i, 1); i--; }
      HB.stats.recompute(state);
    },
  };
})();

/* Lair upgrades and worker types. Editable data. */
(function () {
  const HB = globalThis.HB;

  // levels: array of {cost, days, effects}; effects keys: space (chamber room, in spaces), defense, concealment, traps, guard, sleepSafety, ward, forge, heal, warning
  HB.UPGRADES = [
    { id: 'chamber', name: 'Treasure Chamber', desc: 'A deeper chamber for the hoard. Treasure takes up room by its size, not its worth: a hundred coins fill a space, a sword or a shield fills about two, a ring hardly any. Whatever does not fit lies outside the chamber, where thieves take it easily.', mitigates: 'Theft of treasure that does not fit.', levels: [{ cost: 200, days: 20, effects: { space: 120 } }, { cost: 900, days: 40, effects: { space: 400 } }, { cost: 3500, days: 80, effects: { space: 1500 } }, { cost: 12000, days: 150, effects: { space: 6000 } }], icon: 'coins' },
    { id: 'entrance', name: 'Reinforced Entrance', desc: 'A narrowed, gated mouth. Thieves need tools and time; hunters need rams.', mitigates: 'Plunder and slaying attempts during sleep.', levels: [{ cost: 150, days: 15, effects: { defense: 8 } }, { cost: 500, days: 30, effects: { defense: 16 } }, { cost: 1500, days: 60, effects: { defense: 28 } }], icon: 'gate' },
    { id: 'concealed', name: 'Concealed Approach', desc: 'Brush, false trails and a hidden entrance. Fewer people learn where you sleep.', mitigates: 'Attention; the chance that hunters find the lair at all.', levels: [{ cost: 120, days: 12, effects: { concealment: 3 } }, { cost: 450, days: 25, effects: { concealment: 6 } }], icon: 'tree' },
    { id: 'traps', name: 'Traps', desc: 'Pits, falling stones, spring-blades in the passages. Engineers build the better ones.', mitigates: 'Intruders are wounded or killed before they reach the hoard.', levels: [{ cost: 180, days: 15, effects: { traps: 6 } }, { cost: 600, days: 30, effects: { traps: 12 }, needs: 'human' }, { cost: 1500, days: 50, effects: { traps: 20 }, needs: 'human' }], icon: 'pick' },
    { id: 'guardpost', name: 'Guard Post', desc: 'A watch-room by the entrance. Workers set to guard duty become worth something; captives escape less.', mitigates: 'Intrusions; captive escapes.', levels: [{ cost: 250, days: 20, effects: { guard: 10 } }], icon: 'shield' },
    { id: 'sleeping', name: 'Sleeping Chamber', desc: 'A chamber behind the hoard, with its own narrow door. Hunters must breach it to reach you, and you wake when they try.', mitigates: 'Slaying attempts; gives warning before the final breach.', levels: [{ cost: 400, days: 30, effects: { sleepSafety: 1, warning: 1 } }], icon: 'skull' },
    { id: 'ward', name: 'Magical Ward', desc: 'Runes cut around the threshold, fed by gems in the hoard. Turns away thieves who use magic and hides the cave from scrying.', mitigates: 'Magical thieves; sorcerous hunters; discovery by seers.', levels: [{ cost: 600, days: 20, effects: { ward: 10 }, needsGems: 500 }, { cost: 1800, days: 40, effects: { ward: 20 }, needsGems: 2000 }], icon: 'gem' },
    { id: 'forge', name: 'Forge', desc: 'A working forge. Dwarves and smiths make arms for the guard and repair what the traps break.', mitigates: 'Defence decay; adds defence each year while staffed.', levels: [{ cost: 350, days: 25, effects: { forge: 1 }, needs: 'dwarf-or-human' }], icon: 'sword' },
    { id: 'larder', name: 'Larder', desc: 'Cold storage for livestock and game. You heal faster at home and sleep better fed.', mitigates: 'Slow recovery; restless sleep.', levels: [{ cost: 150, days: 10, effects: { heal: 0.5 } }], icon: 'cow' },
    { id: 'lookout', name: 'Lookout', desc: 'A perch above the entrance with a view of the approaches. Workers on guard see hunters a day earlier.', mitigates: 'Surprise; gives an extra warning during sleep.', levels: [{ cost: 200, days: 12, effects: { warning: 1 } }], icon: 'lantern' },
  ];
  HB.UPGRADE_BY_ID = {}; for (const u of HB.UPGRADES) HB.UPGRADE_BY_ID[u.id] = u;
  HB.LAIR_BASE = { space: 40, defense: 4, concealment: 0, traps: 0, guard: 0, sleepSafety: 0, ward: 0, forge: 0, heal: 0, warning: 0 };

  // worker types: wage per head per year; build rate per head per day (fraction of a 'day of work'); traits
  HB.WORKER_TYPES = {
    dwarf: { name: 'Dwarves', single: 'dwarf', wage: 40, build: 1.6, guard: 1.2, scavenge: 0, desc: 'Excavate and fortify. Expensive, reliable, proud. They will not work beside goblins for long.', sprite: 'dwarf' },
    goblin: { name: 'Goblins', single: 'goblin', wage: 10, build: 0.7, guard: 0.6, scavenge: 1, desc: 'Cheap, cowardly, light-fingered. They scavenge a little gold and maintain crude defences, and they steal when nobody counts.', sprite: 'goblin' },
    human: { name: 'Human engineers', single: 'engineer', wage: 25, build: 1.0, guard: 0.8, scavenge: 0, desc: 'Build traps and mechanisms. Captive craftsmen can be put to this work unpaid, at a cost.', sprite: 'villager2' },
  };
  HB.WORKER_TASKS = {
    build: { name: 'Build', desc: 'Advance construction.' },
    guard: { name: 'Guard', desc: 'Defend the lair, especially while you sleep. Needs a guard post to count for much.' },
    scavenge: { name: 'Scavenge', desc: 'Goblins bring back a little gold from the countryside each year.' },
    maintain: { name: 'Maintain', desc: 'Keep traps and doors in repair so defences do not decay.' },
  };
})();

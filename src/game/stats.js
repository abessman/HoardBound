/* Dragon power: permanent tier stats + possession bonuses from stored treasure (diminishing returns) + artifact effects. */
(function () {
  const HB = globalThis.HB;

  HB.CATEGORIES = {
    gold: { name: 'Gold & silver', desc: 'Scale toughness and health', bonus: { defense: [12, 6000], health: [120, 9000] } },
    gems: { name: 'Gems', desc: 'Breath power and stamina', bonus: { breath: [18, 5000], stamina: [90, 7000] } },
    artifacts: { name: 'Ancient artifacts', desc: 'Unique effects and mutations', bonus: {} },
    arms: { name: 'Weapons & armour', desc: 'Bite, claw and defence', bonus: { bite: [20, 4000], defense: [8, 5000] } },
    books: { name: 'Books & knowledge', desc: 'Intelligence: better estimates, wider sight, ransom insight', bonus: { intel: [3, 2500], vision: [2.5, 4000] } },
    royal: { name: 'Royal treasures', desc: 'Prestige and dominance: ransom and tribute leverage', bonus: { dominance: [40, 6000], prestige: [30, 8000] } },
  };

  const stats = HB.stats = {
    /** cap * (1 - exp(-value/scale)) */
    diminishing(value, cap, scale) { return cap * (1 - Math.exp(-Math.max(0, value) / scale)); },
    categoryTotals(state) {
      const t = { gold: state.hoard.gold, gems: 0, artifacts: 0, arms: 0, books: 0, royal: 0 };
      for (const it of state.hoard.items) t[it.cat] = (t[it.cat] || 0) + it.value;
      return t;
    },
    /** compute full stat block; stored in state.dragon.stats */
    compute(state) {
      const d = state.dragon, tier = HB.TIERS[d.tier];
      const s = { tier: d.tier, maxHealth: tier.health, maxStamina: tier.stamina, breath: tier.breath, bite: tier.bite, defense: tier.defense, capacity: tier.capacity, vision: tier.vision, speed: tier.speed, intel: 0, dominance: 0, prestige: 0, roar: tier.roar, canLand: tier.land, gatePass: 0, alarmRate: 1, staminaCost: 1, attention: 1, ransomBonus: 0, breathElement: 'fire', bonuses: {}, artifactEffects: [] };
      // breed flavour
      if (d.breed === 'red') s.breath *= 1.05;
      if (d.breed === 'green') s.attention *= 0.95;
      if (d.breed === 'black') s.alarmRate *= 0.95;
      if (d.breed === 'gold') s.dominance += 5;
      if (d.breed === 'blue') s.staminaCost *= 0.95;
      // category possession bonuses
      const totals = stats.categoryTotals(state);
      for (const cat in HB.CATEGORIES) {
        const def = HB.CATEGORIES[cat];
        for (const stat in def.bonus) {
          const [cap, scale] = def.bonus[stat];
          const b = stats.diminishing(totals[cat] || 0, cap, scale);
          s.bonuses[stat] = (s.bonuses[stat] || 0) + b;
        }
      }
      s.maxHealth += s.bonuses.health || 0; s.maxStamina += s.bonuses.stamina || 0; s.breath += s.bonuses.breath || 0;
      s.bite += s.bonuses.bite || 0; s.defense += s.bonuses.defense || 0; s.intel += s.bonuses.intel || 0;
      s.vision += s.bonuses.vision || 0; s.dominance += s.bonuses.dominance || 0; s.prestige += s.bonuses.prestige || 0;
      // artifact effects
      for (const it of state.hoard.items) {
        if (!it.effect) continue;
        s.artifactEffects.push({ name: it.name, effect: it.effect });
        for (const k in it.effect) {
          const v = it.effect[k];
          if (k === 'mul') for (const kk in v) s[kk] *= v[kk];
          else if (typeof s[k] === 'number') s[k] += v;
          else s[k] = v;
        }
      }
      // age, deeds and named titles
      s.prestige += Math.min(60, d.age * 0.25) + Math.min(40, (state.counters.raids || 0) * 0.5);
      if (HB.renown) { const rb = HB.renown.bonuses(state); s.prestige += rb.prestige; s.dominance += rb.dominance; }
      s.dominance += s.prestige * 0.3 + Math.max(0, -d.alignment) * 0.2;
      // injury
      if (d.injury > 0) { s.maxStamina *= 1 - 0.3 * d.injury; s.speed *= 1 - 0.25 * d.injury; }
      s.maxHealth = Math.round(s.maxHealth); s.maxStamina = Math.round(s.maxStamina);
      s.breath = Math.round(s.breath * 10) / 10; s.bite = Math.round(s.bite * 10) / 10; s.defense = Math.round(s.defense * 10) / 10;
      s.capacity = Math.round(s.capacity * 10) / 10;
      return s;
    },
    recompute(state) {
      const old = state.dragon.stats;
      const s = stats.compute(state);
      state.dragon.stats = s;
      // keep current health/stamina proportional when the maximum changes
      if (old) {
        if (old.maxHealth !== s.maxHealth) state.dragon.health = HB.clamp(Math.round(state.dragon.health * s.maxHealth / old.maxHealth), 1, s.maxHealth);
        if (old.maxStamina !== s.maxStamina) state.dragon.stamina = HB.clamp(Math.round(state.dragon.stamina * s.maxStamina / old.maxStamina), 0, s.maxStamina);
      }
      state.dragon.health = Math.min(state.dragon.health, s.maxHealth);
      state.dragon.stamina = Math.min(state.dragon.stamina, s.maxStamina);
      return s;
    },
    /** what would the stats be with a hypothetical change (fn mutates a clone of hoard) */
    preview(state, mutate) {
      const saved = { gold: state.hoard.gold, items: state.hoard.items };
      state.hoard = { gold: saved.gold, items: saved.items.slice() };
      mutate(state.hoard);
      const s = stats.compute(state);
      state.hoard = saved;
      return s;
    },
    /** human-readable delta list between two stat blocks */
    diff(a, b) {
      const keys = [['maxHealth', 'Health'], ['defense', 'Defence'], ['breath', 'Breath'], ['bite', 'Bite'], ['maxStamina', 'Stamina'], ['vision', 'Sight'], ['intel', 'Intelligence'], ['dominance', 'Dominance'], ['prestige', 'Prestige'], ['capacity', 'Carry']];
      const out = [];
      for (const [k, label] of keys) { const dv = (b[k] || 0) - (a[k] || 0); if (Math.abs(dv) >= 0.05) out.push({ key: k, label, delta: Math.round(dv * 10) / 10 }); }
      return out;
    },
    /** hoard energy for maturation: total stored value with artifacts counting double */
    hoardEnergy(state) { let e = state.hoard.gold; for (const it of state.hoard.items) e += it.value * (it.cat === 'artifacts' ? 2 : 1); return e; },
  };
})();

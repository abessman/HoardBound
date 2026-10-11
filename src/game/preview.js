/* Target preview: what the dragon knows, what it guesses, and why a target is dangerous. */
(function () {
  const HB = globalThis.HB;

  const preview = HB.preview = {
    describe(state, target) {
      const W = state.world, d = state.dragon, s = d.stats;
      const lines = [];
      const isEnt = !!target.kind;
      const dist = Math.hypot(target.x - d.x, target.y - d.y);
      const est = HB.travel.estimate(state, target);
      const f = target.factionId >= 0 ? W.factions[target.factionId] : null;
      let subtitle = isEnt ? (target.kind === 'caravan' ? `Merchant caravan${f ? ' of ' + f.name : ''}` : target.kind === 'hero' ? `Wandering hero, level ${target.level}${target.lance ? ' — carries a long lance' : ''}` : target.kind) : HB.fmt.cap(HB.world.locTypeName(target)) + (f ? ` of ${f.name}` : ' (no realm)');
      if (!isEnt && target.state && target.state !== 'normal') subtitle += ` · ${target.state}`;
      // distance / cost
      lines.push({ label: 'Distance', text: `${Math.round(dist)} leagues · about ${Math.max(1, Math.round(est.there.days))} day${Math.round(est.there.days) !== 1 ? 's' : ''} of flight` });
      const costText = `${Math.ceil(est.there.stamina)} to get there, ${Math.ceil(est.back.stamina)} to fly home (you have ${Math.floor(d.stamina)})`;
      lines.push({ label: 'Stamina', text: costText, tone: est.canReturn ? 'good' : est.canReach ? 'warn' : 'bad' });
      if (est.blocked) lines.push({ text: `Storms wall off ${W.regions[est.blocked.regionId].name}. You are too small to cross them.`, tone: 'bad' });
      else if (est.canReach && !est.canReturn) lines.push({ text: 'You could reach it, but not fly home without resting somewhere on the way.', tone: 'warn' });
      if (target.type === 'lair') { return { subtitle: 'Your cave. Treasure stored here powers you; treasure carried does not.', lines, flyError: est.blocked ? 'blocked' : null }; }
      // knowledge
      const k = target.knowledge || { scoutedYear: state.time.year, raided: true };
      const intel = s.intel || 0;
      const stale = k.scoutedYear > 0 ? state.time.year - k.scoutedYear : 99;
      const fuzz = (v, pct) => { const r = new HB.RNG(HB.hash32(`${target.id}:${k.scoutedYear}:${Math.floor(intel)}`)); const e = pct * (1 - Math.min(0.8, intel / 12)); return [Math.round(v * (1 - e) * (0.9 + r.next() * 0.2)), Math.round(v * (1 + e) * (0.9 + r.next() * 0.2))]; };
      const wealth = isEnt ? target.wealth : target.wealth;
      const def = isEnt ? (target.kind === 'caravan' ? 8 + (target.escort || 0) * 12 : 20 + target.level * 15) : target.defense;
      if (k.raided || stale === 0 || isEnt) {
        lines.push({ label: 'Wealth', text: `about ${HB.fmt.int(wealth)} gold worth${stale > 0 ? ` (as of Year ${k.scoutedYear})` : ''}` });
      } else {
        const [lo, hi] = fuzz(wealth, 0.5);
        lines.push({ label: 'Wealth', text: `${HB.fmt.int(lo)}–${HB.fmt.int(hi)} gold worth, at a guess${stale < 99 ? ` (seen Year ${k.scoutedYear})` : ' (never scouted)'}` });
      }
      // defence explanation
      lines.push({ label: 'Defences', text: preview.defenceText(state, target, def, f, stale), tone: def > 45 ? 'bad' : def > 20 ? 'warn' : 'good' });
      // what is worth taking
      if (!isEnt) {
        if (target.special && (k.raided || intel >= 4)) { const a = HB.ARTIFACT_BY_ID[target.special]; lines.push({ label: 'Treasure', text: `${a.name} is kept here.`, tone: 'good' }); }
        else if (target.special && intel >= 2) lines.push({ label: 'Rumour', text: 'Something old and valuable is said to be kept here.' });
        const typeHint = { castle: 'A goblet glints on a tower parapet: a quick theft for a small dragon. The vault needs an adult to break in.', camp: 'Camps sleep at night. Isolated sleepers can be bitten before anyone wakes.', village: 'Livestock to eat, savings in the houses, grain in the granary. Burning the granary ruins them for years.', town: 'A market with exposed goods, a barred town hall with the real coin, a reeve worth a ransom.', city: 'Walls, towers, a treasury and nobles. Not a place for the small.', farm: 'A farmhouse and animals. Easy, and poor.', mine: 'Ore carts by the entrance; miners worth taking as workers.', monastery: 'Books, silver and perhaps a relic. The brothers do not fight; the faithful remember.', ruin: 'Old things below, and something guarding them.', tower: 'A sage who trades in knowledge and does not like threats.', glade: 'Elven wards and archers. Gems on the shrine tree.', hold: 'Iron gates and crossbows. Forges in the yard.', shrine: 'A keeper, a few offerings, and whatever lies beneath the stone.', rivalLair: 'Another dragon’s hoard, and the dragon.', warren: 'Goblins, crude loot, and more goblins.', battlefield: 'Arms and coin among the dead.' }[target.type];
        if (typeHint) lines.push({ text: typeHint, italic: true });
        // memory
        const mem = target.memory && target.memory[target.memory.length - 1];
        if (mem) lines.push({ label: 'History', text: `You ${mem.burned ? 'burned' : 'raided'} this place in Year ${mem.year}${mem.stolen ? `, taking ${HB.fmt.int(mem.stolen)} gold worth` : ''}.` });
        if (target.flags && target.flags.famine) lines.push({ text: `Famine since Year ${target.flags.famine}.`, tone: 'warn' });
        if (target.tribute) lines.push({ label: 'Tribute', text: `Pays you ${HB.fmt.int(target.tribute.amount)} gold a year.`, tone: 'good' });
      } else if (target.kind === 'caravan') lines.push({ text: `${target.escort >= 2 ? 'Well escorted — merchants here have learned.' : target.escort ? 'A few guards.' : 'Barely guarded.'} Strongbox on the first wagon; the best goods ride in the last.`, italic: true });
      else if (target.kind === 'hero') lines.push({ text: target.level <= 1 ? 'Green, but armed. Bite from the flank or frighten them off.' : 'Experienced. Companions may come running.', italic: true });
      if (f) lines.push({ label: 'Realm', text: preview.moodText(f) });
      const flyError = HB.travel.canBegin(state, target);
      return { subtitle, lines, flyError };
    },
    defenceText(state, target, def, f, stale) {
      const bits = [];
      if (target.kind === 'caravan') { bits.push(target.escort >= 2 ? 'knights and archers ride with it' : target.escort ? 'a few guards walk beside it' : 'no escort to speak of'); }
      else if (target.kind === 'hero') { bits.push(target.lance ? 'a dragon-lance: dangerous even for an adult' : target.level <= 1 ? 'a novice with a sword and a javelin' : 'a veteran'); }
      else {
        if (def < 12) bits.push('a few frightened people');
        else if (def < 25) bits.push('militia with bows and pitchforks');
        else if (def < 45) bits.push('a watch with archers');
        else if (def < 65) bits.push('walls, archers and men-at-arms');
        else bits.push('towers, crossbows and knights');
        if (def >= 55 || (f && f.learned.hunters >= 1 && target.type === 'castle')) bits.push('a ballista on the wall');
        if (f && f.learned.vaults >= 1 && (target.type === 'town' || target.type === 'city' || target.type === 'castle')) bits.push('valuables locked away since your last visits');
        if (target.flags && target.flags.repelled) bits.push(`they drove you off ${HB.fmt.plural(target.flags.repelled, 'time')} before`);
      }
      const tierNote = def > 45 && state.dragon.tier === 0 ? ' A hatchling should steal and leave, not fight.' : def > 65 && state.dragon.tier <= 1 ? ' Too strong to fight outright.' : '';
      return HB.fmt.cap(HB.fmt.list(bits)) + '.' + tierNote + (stale > 5 ? ' (old information)' : '');
    },
    moodText(f) {
      const m = f.dragon;
      const fear = m.fear > 60 ? 'terrified of you' : m.fear > 30 ? 'afraid of you' : m.fear > 10 ? 'wary of you' : 'barely aware of you';
      const host = m.hostility > 60 ? 'hunting you' : m.hostility > 30 ? 'hostile' : m.hostility > 10 ? 'resentful' : 'indifferent';
      const trust = m.trust > 40 ? ', and some trust you' : m.trust > 15 ? ', though a few speak well of you' : '';
      return `${f.name} is ${fear}, ${host}${trust}.`;
    },
  };
})();

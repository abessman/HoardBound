/* Save and load. The static world is regenerated from the seed; only mutable state is stored. */
(function () {
  const HB = globalThis.HB;
  const PREFIX = 'hoardbound.save.';
  const GEN_VERSION = 1;

  function b64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64'); }
  function unb64(str) { const s = typeof atob === 'function' ? atob(str) : Buffer.from(str, 'base64').toString('binary'); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
  const LOC_FIELDS = ['name', 'type', 'tier', 'pop', 'wealth', 'wealthMax', 'defense', 'defenseBase', 'state', 'special', 'ruler', 'memory', 'fear', 'trust', 'lastRaidYear', 'knowledge', 'flags', 'founded', 'capital', 'tribute', 'factionId', 'camp', 'dragon', 'ancient', 'threat', 'occupation'];
  // places made during play (battlefields) are not regenerated from the seed: their position is saved too
  const DYN_FIELDS = ['x', 'y', 'cell', 'subId', 'regionId'];

  const save = HB.save = {
    serialize(state) {
      const W = state.world;
      const genCount = W.genLocationCount || W.locations.length;
      const locs = W.locations.map(L => { const o = { id: L.id }; for (const k of LOC_FIELDS) if (L[k] !== undefined) o[k] = L[k]; if (L.id >= genCount) for (const k of DYN_FIELDS) o[k] = L[k]; return o; });
      const data = {
        v: 1, ver: HB.VERSION, gen: GEN_VERSION, seed: state.seed, size: W.w, name: state.name, created: state.created, savedAt: Date.now(),
        dragon: state.dragon, hoard: state.hoard, cargo: state.cargo, lair: state.lair, time: state.time, phase: state.phase === 'encounter' ? 'planning' : state.phase, travel: null,
        chronicle: state.chronicle, entities: state.entities, flags: state.flags, memory: state.memory, counters: state.counters,
        renown: state.renown, reactions: state.reactions, problems: state.problems,
        situations: state.situations || [], pursuit: state.pursuit || null, pactGold: state.pactGold || 0, domain: state.domain || null,
        locations: locs, factions: W.factions, extraLocations: W.locations.length,
        know: { revealed: b64(state.know.revealed), rumor: b64(state.know.rumor), subSeen: b64(state.know.subSeen), regionSeen: b64(state.know.regionSeen) },
        regionTiers: W.regions.map(R => R.tier), subFactions: W.subregions.map(S => S.factionId),
        playRng: HB.game.rng ? HB.game.rng.getState() : state.playRng, idCounter: HB.getIdCounter(), wars: W.wars || [],
      };
      return JSON.stringify(data);
    },
    deserialize(json) {
      const data = JSON.parse(json);
      const world = HB.worldgen.generate(data.seed, { size: data.size });
      // apply mutable fields
      for (const o of data.locations) {
        let L = world.locations[o.id];
        if (!L) {
          L = world.locations[o.id] = Object.assign({ id: o.id, memory: [], knowledge: {}, flags: {} }, o);
          // a place made during play: put it back on the map (saves before 0.8.0 lack its position; drop it then)
          if (L.cell === undefined && L.x !== undefined) L.cell = L.y * world.w + L.x;
          if (L.cell !== undefined && L.x !== undefined) { world.locAt[L.cell] = L.id; if (L.subId === undefined) L.subId = world.sub[L.cell]; if (L.regionId === undefined) L.regionId = world.region[L.cell]; const S = world.subregions[L.subId]; if (S && !S.locations.includes(L.id)) S.locations.push(L.id); }
          else { L.type = 'gone'; L.state = 'gone'; L.x = 0; L.y = 0; L.cell = 0; L.knowledge = { seen: false }; }
          continue;
        }
        for (const k in o) if (k !== 'id') L[k] = o[k];
      }
      world.factions = data.factions;
      data.regionTiers.forEach((t, i) => { if (world.regions[i]) world.regions[i].tier = t; });
      data.subFactions.forEach((f, i) => { if (world.subregions[i]) world.subregions[i].factionId = f; });
      world.wars = data.wars || [];
      const know = HB.world.newKnowledge(world);
      know.revealed.set(unb64(data.know.revealed)); know.rumor.set(unb64(data.know.rumor)); know.subSeen.set(unb64(data.know.subSeen)); know.regionSeen.set(unb64(data.know.regionSeen));
      for (let i = 0; i < know.revealed.length; i++) if (know.revealed[i]) { const s = world.sub[i]; if (s >= 0) know.subRevealedCount[s]++; const r = world.region[i]; if (r >= 0) know.regionRevealedCount[r]++; }
      const state = {
        version: 1, seed: data.seed, created: data.created, name: data.name, world, know,
        dragon: data.dragon, hoard: data.hoard, cargo: data.cargo, lair: data.lair, time: data.time, phase: data.phase || 'home', travel: null, encounter: null,
        chronicle: data.chronicle, entities: data.entities || [], flags: data.flags, memory: data.memory, counters: data.counters, playRng: data.playRng,
        situations: data.situations || [], pursuit: data.pursuit || null, pactGold: data.pactGold || 0, ambush: null, domain: data.domain || (HB.domain ? HB.domain.fresh() : null),
        renown: data.renown || { deeds: {}, titles: [], known: {}, places: {} }, reactions: data.reactions || [], problems: data.problems || { thefts: 0, stolenValue: 0, stolenNamed: [], hunts: 0, breaches: 0, escapes: 0, rescues: 0 },
      };
      HB.setIdCounter(Math.max(HB.getIdCounter(), data.idCounter || 1));
      HB.game.state = HB.state = state;
      HB.game.rng = new HB.RNG(1).setState(data.playRng);
      // the dragon is wherever it was; if mid-travel it is placed at home to be safe
      if (data.phase === 'traveling' || data.phase === 'returning') { state.dragon.x = world.home.x; state.dragon.y = world.home.y; state.phase = 'home'; }
      if (state.phase === 'planning' && Math.hypot(state.dragon.x - world.home.x, state.dragon.y - world.home.y) < 0.5) state.phase = 'home';
      HB.world.syncRumors(state);
      HB.stats.recompute(state);
      return state;
    },
    slotKey(slot) { return PREFIX + slot; },
    write(state, slot) {
      try { localStorage.setItem(save.slotKey(slot), save.serialize(state)); return true; } catch (e) { console.warn('save failed', e); return false; }
    },
    read(slot) { const raw = localStorage.getItem(save.slotKey(slot)); return raw ? save.deserialize(raw) : null; },
    meta(slot) { try { const raw = localStorage.getItem(save.slotKey(slot)); if (!raw) return null; const d = JSON.parse(raw); return { slot, name: d.name, dragon: d.dragon.name, tier: d.dragon.tier, year: d.time.year, savedAt: d.savedAt, seed: d.seed, hoard: d.hoard.gold }; } catch (e) { return null; } },
    slots() { const out = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(PREFIX)) { const m = save.meta(k.slice(PREFIX.length)); if (m) out.push(m); } } out.sort((a, b) => b.savedAt - a.savedAt); return out; },
    hasAny() { try { return save.slots().length > 0; } catch (e) { return false; } },
    autosave(state) { if (!HB.isBrowser) return; save.write(state, 'auto'); },
    continueLatest() { const s = save.slots()[0]; if (s) save.loadSlot(s.slot); },
    loadSlot(slot) { try { const state = save.read(slot); if (state) { HB.flow.enterWorld(state, false); return true; } } catch (e) { console.error(e); HB.notice('Load failed', 'That save could not be read: ' + e.message); } return false; },
    remove(slot) { localStorage.removeItem(save.slotKey(slot)); },
    exportFile(state) {
      const json = save.serialize(state);
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `hoardbound-${state.dragon.name}-year${state.time.year}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    },
    importFile() {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json';
      inp.onchange = () => { const f = inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const state = save.deserialize(r.result); save.write(state, 'imported'); HB.flow.enterWorld(state, false); } catch (e) { HB.notice('Import failed', e.message); } }; r.readAsText(f); };
      inp.click();
    },
    openLoadMenu() { if (HB.SaveMenuScene) HB.scenes.push(new HB.SaveMenuScene({ mode: 'load' })); },
  };
})();

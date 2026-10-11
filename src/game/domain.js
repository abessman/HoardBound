/* Domain: what each settlement is to you (allegiance), how far your influence reaches, the settlement that grows at
 * the foot of your hill, and the deeds that spread or lose your rule. Headless-safe.
 * Tables: src/data/domain.js. How it plays: docs/systems/domain-and-influence.md. */
(function () {
  const HB = globalThis.HB;

  const SETTLE = ['farm', 'village', 'town', 'city', 'castle', 'mine', 'hold', 'glade', 'monastery'];
  const PEOPLE = ['farm', 'village', 'town', 'city'];
  const OCCUPY = ['village', 'town', 'city', 'castle', 'mine'];
  // to grow from stage n to n+1 (n >= 1): years at the stage, settlements of your kind, a lair upgrade, and more
  const STAGE_REQ = [null,
    { years: 5, members: 1, up: 'guardpost' },
    { years: 10, members: 3, up: 'forge', safe: 10 },
    { years: 20, members: 5, up: 'entrance', upLv: 2, tier: 2 },
  ];
  const UP_WHY = {
    benevolent: { guardpost: 'a watch to keep the settlers safe', forge: 'workshops for its smiths', entrance: 'walls that can shelter them' },
    tyrannical: { guardpost: 'overseers to keep the camp in line', forge: 'furnaces for its forced labour', entrance: 'walls to hold them in' },
  };
  let cache = null; // influence, keyed on a signature of the domain

  const dom = HB.domain = {
    SETTLE, PEOPLE,
    fresh() { return { home: { stage: 0, path: null, character: 0, name: null, founded: null, stageYear: null, unrest: 0, lastRevolt: -99, lastBreach: -99, stored: 0, goldTotal: 0 }, ver: 0 }; },
    get(state) { if (!state.domain) state.domain = dom.fresh(); return state.domain; },
    home(state) { return dom.get(state).home; },
    /** something on the map changed: territory washes and glyphs are redrawn */
    bump(state) { dom.get(state).ver++; cache = null; },
    // ---------- who you are to them
    /** how your deeds read now (benevolence), regardless of what grows at home */
    leaning(state) { const a = state.dragon.alignment; return HB.DOMAIN_PATHS[a >= 10 ? 'benevolent' : a <= -10 ? 'tyrannical' : 'undecided']; },
    /** the path of your rule: the home settlement's once it exists */
    path(state) { const h = dom.home(state); return h.stage > 0 && h.path ? HB.DOMAIN_PATHS[h.path] : dom.leaning(state); },
    statusOf(state, L) {
      if (!L || L.type === 'lair' || !SETTLE.includes(L.type)) return null;
      if (L.state === 'burned' || L.state === 'abandoned') return 'ruined';
      if (L.occupation) return L.occupation.resisting ? 'resisting' : 'occupied';
      const t = L.tribute;
      if (t && !t.lapsed) return t.willing ? (L.flags.allied ? 'allied' : 'protected') : 'tributary';
      return null;
    },
    members(state) {
      const out = [];
      for (const L of state.world.locations) { const s = dom.statusOf(state, L); if (s && HB.DOMAIN_STATUSES[s].member) out.push({ L, status: s }); }
      return out;
    },
    /** members that count toward a home of this path: the protected and allied for a kind rule, the tributary and occupied for a cruel one */
    kindMembers(state, path) {
      const want = path === 'tyrannical' ? ['tributary', 'occupied'] : ['protected', 'allied'];
      return dom.members(state).filter(m => want.includes(m.status));
    },
    signature(state) {
      const h = dom.home(state);
      return `${dom.get(state).ver}|${h.stage}|${h.path}|${state.dragon.tier}|` + dom.members(state).map(m => m.L.id + m.status[0]).join(',');
    },
    // ---------- influence: territorial reach, by subregion, spreading from the lair and the places that serve you
    influence(state) {
      const sig = dom.signature(state);
      if (cache && cache.state === state && cache.sig === sig) return cache.inf;
      const W = state.world, S = W.subregions, h = dom.home(state);
      const str = new Map(), side = new Map(), wt = new Map(), from = new Map();
      const add = (sub, reach, sd, name) => {
        if (sub < 0 || reach <= 0) return;
        const q = [[sub, reach]], seen = new Set([sub]);
        while (q.length) {
          const [s, r] = q.shift();
          if (r > (str.get(s) || 0)) { str.set(s, r); from.set(s, name); }
          side.set(s, (side.get(s) || 0) + sd * r); wt.set(s, (wt.get(s) || 0) + r);
          if (r > 1) for (const n of S[s].neighbors) if (!seen.has(n)) { seen.add(n); q.push([n, r - 1]); }
        }
      };
      if (h.stage > 0 || state.dragon.tier >= 1) add(W.home.subId, h.stage >= 3 ? 3 : h.stage >= 1 ? 2 : 1, h.stage > 0 ? (h.path === 'tyrannical' ? -1 : 1) : 0, h.name || 'your lair');
      for (const m of dom.members(state)) { const st = HB.DOMAIN_STATUSES[m.status]; add(m.L.subId, st.reach, st.side, m.L.name); }
      const subs = new Map();
      for (const [s, r] of str) subs.set(s, { s: r, c: HB.clamp((side.get(s) || 0) / Math.max(1, wt.get(s) || 1), -1, 1), from: from.get(s) });
      const inf = { subs, count: subs.size };
      cache = { state, sig, inf };
      return inf;
    },
    reachOf(state, L) { const o = dom.influence(state).subs.get(L.subId); return o ? o.s : 0; },
    inInfluence(state, L) { return dom.reachOf(state, L) >= 1; },
    /** per-cell mark for the map: negative = blighted by tyranny, positive = flourishing; strongest near the lair */
    markField(state) {
      const W = state.world, f = new Int8Array(W.w * W.h), h = dom.home(state);
      const paint = (cx, cy, r, sign) => {
        const r2 = r * r;
        for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(W.h - 1, Math.ceil(cy + r)); y++) for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(W.w - 1, Math.ceil(cx + r)); x++) {
          const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy); if (d2 > r2) continue;
          const i = y * W.w + x; if (!HB.isLand(W.terrain[i])) continue;
          const v = sign * (d2 < r2 * 0.3 ? 2 : 1);
          if (Math.abs(v) > Math.abs(f[i])) f[i] = v;
        }
      };
      if (h.stage > 0) paint(W.home.x, W.home.y, 2 + h.stage * 2.5, h.path === 'tyrannical' ? -1 : 1);
      for (const m of dom.members(state)) {
        if (m.status === 'occupied') paint(m.L.x, m.L.y, 3, -1);
        else if (m.status === 'allied') paint(m.L.x, m.L.y, 2.5, 1);
      }
      return f;
    },
    // ---------- the settlement at the foot of your hill
    stageInfo(state) { const h = dom.home(state); return h.stage > 0 ? HB.HOME_STAGES[h.path][h.stage] : null; },
    /** who would come to found it, or null */
    foundingSource(state, path) {
      const W = state.world, H = W.home;
      if (path === 'benevolent') {
        const m = dom.kindMembers(state, 'benevolent')[0]; if (m) return { name: m.L.name, L: m.L };
        const n = HB.world.nearest(W, H.x, H.y, L => PEOPLE.includes(L.type) && L.state === 'normal' && L.trust >= 40 && L.knowledge.seen);
        return n && n.d <= 30 ? { name: n.L.name, L: n.L } : null;
      }
      if (path === 'tyrannical') {
        const m = dom.kindMembers(state, 'tyrannical')[0]; if (m) return { name: m.L.name, L: m.L };
        const held = state.lair.workers.filter(w => w.status === 'enslaved').reduce((a, w) => a + w.count, 0) + state.lair.captives.length;
        return held >= 2 ? { name: 'your captives', L: null } : null;
      }
      return null;
    },
    /** what the next stage needs: { path, target, reqs:[{label, done, cur?, need?, hint}] } */
    nextReqs(state) {
      const h = dom.home(state), d = state.dragon, year = state.time.year;
      const path = h.stage > 0 ? h.path : dom.leaning(state).id;
      const reqs = [];
      if (h.stage === 0) {
        reqs.push({ key: 'tier', label: 'Be a young dragon', done: d.tier >= 1, hint: 'People settle near a dragon big enough to protect them, or to be feared.' });
        if (path === 'undecided') reqs.push({ key: 'path', label: 'Be known as kind or as cruel', done: false, hint: `People settle near a dragon they trust or fear, and your name is neither yet (benevolence ${Math.round(d.alignment)}; it needs 10 either way). Defend villages, guard caravans and free captives; or burn, enslave and demand tribute.` });
        else if (path === 'benevolent') reqs.push({ key: 'source', label: 'People who trust you', done: !!dom.foundingSource(state, path), hint: 'A settlement under your protection, or one within 30 leagues of your lair that trusts you (trust 40).' });
        else reqs.push({ key: 'source', label: 'People to drive there', done: !!dom.foundingSource(state, path), hint: 'A settlement that pays you tribute, or two captives or enslaved workers in your lair.' });
        return { path, target: path === 'undecided' ? null : HB.HOME_STAGES[path][1], reqs };
      }
      if (h.stage >= 4) return { path, target: null, reqs };
      const T = STAGE_REQ[h.stage], years = year - h.stageYear, kind = dom.kindMembers(state, path).length;
      reqs.push({ key: 'years', label: `${T.years} years to grow`, cur: Math.max(0, years), need: T.years, done: years >= T.years, hint: 'Settlements grow while you sleep.' });
      reqs.push({ key: 'members', label: path === 'benevolent' ? `${HB.fmt.plural(T.members, 'settlement')} under your protection` : `${HB.fmt.plural(T.members, 'settlement')} paying you tribute or occupied`, cur: kind, need: T.members, done: kind >= T.members, hint: path === 'benevolent' ? 'Offer protection to places that trust you; take their oaths.' : 'Demand tribute from places that fear you; occupy them.' });
      const lv = HB.lair.level(state, T.up);
      reqs.push({ key: 'lair', label: `${HB.UPGRADE_BY_ID[T.up].name}${T.upLv ? ' level ' + T.upLv : ''} in your lair`, done: lv >= (T.upLv || 1), hint: `It needs ${UP_WHY[path][T.up]}.` });
      if (T.safe) {
        const since = path === 'benevolent' ? year - h.lastBreach : year - h.lastRevolt;
        reqs.push({ key: 'safe', label: path === 'benevolent' ? `No hunters inside the lair for ${T.safe} years` : `No revolt for ${T.safe} years`, done: since >= T.safe, hint: path === 'benevolent' ? 'Settlers do not stay where hunters walk through their village to your door.' : 'Guards and a guard post hold the camp down.' });
      }
      if (T.tier) reqs.push({ key: 'tier', label: 'Be an adult dragon', done: d.tier >= T.tier, hint: 'A castle is built around a dragon worth building it for.' });
      return { path, target: HB.HOME_STAGES[path][h.stage + 1], reqs };
    },
    /** found the settlement or grow it a stage, if it is ready; returns the text or null */
    advance(state, rng, log) {
      const h = dom.home(state), year = state.time.year, nr = dom.nextReqs(state);
      if (!nr.target || !nr.reqs.every(r => r.done)) return null;
      let text, cause;
      if (h.stage === 0) {
        const src = dom.foundingSource(state, nr.path);
        h.stage = 1; h.path = nr.path; h.founded = year; h.stageYear = year; h.character = state.dragon.alignment; h.unrest = 0;
        h.name = h.name || dom.makeName(state, rng);
        if (nr.path === 'benevolent') { text = `Families from ${src.name} have built huts at the foot of your hill and named the place ${h.name}: ${nr.target.noun}. It is the safest place they know.`; cause = `because they trust you, and you are big enough to keep them safe`; }
        else { text = `Your overseers have driven ${src.L ? 'people from ' + src.name : src.name} into a stockade below the cave: ${h.name}, ${nr.target.noun}.`; cause = 'because you hold people by fear, and fear needs a fence'; }
      } else {
        h.stage++; h.stageYear = year;
        const S = HB.HOME_STAGES[h.path][h.stage];
        text = `${h.name} has grown into ${S.noun}. ${S.text}`;
        cause = `because it had years to grow, ${HB.fmt.plural(dom.kindMembers(state, h.path).length, h.path === 'benevolent' ? 'settlement' : 'subject settlement')} behind it, and what it needed in your lair`;
      }
      if (log) log(text);
      HB.game.chronicle(state, text, 'domain');
      if (HB.consequences) HB.consequences.react(state, text, cause);
      dom.bump(state);
      return text;
    },
    makeName(state, rng) {
      const W = state.world, S = W.subregions[W.home.subId];
      const culture = S.factionId >= 0 ? W.factions[S.factionId].culture : (W.factions[0] ? W.factions[0].culture : 'westron');
      for (let i = 0; i < 6; i++) { const n = HB.names.place(rng, culture); if (!W.locations.some(L => L.name === n)) return n; }
      return HB.names.place(rng, culture);
    },
    bonuses(state) {
      const S = dom.stageInfo(state), b = { build: 0, guard: 0, defense: 0, warning: 0 };
      if (S) { b.build = S.build; b.guard = S.guard; b.defense = S.defense; b.warning = S.warning; }
      if (HB.renown && HB.renown.has(state, 'liege')) b.warning += 1;
      return b;
    },
    /** while awake: the home settlement's gifts or levies pile up, collected when you come home */
    accrue(state, days) { const S = dom.stageInfo(state); if (S && days < 300) dom.home(state).stored += S.gold * days / HB.DAYS_PER_YEAR; },
    collect(state) { const h = dom.home(state), g = Math.floor(h.stored || 0); if (g > 0) { h.stored -= g; h.goldTotal += g; } return g; },
    /** hunters got into the lair: settlers of a kind domain lose heart */
    onBreach(state, log) {
      const h = dom.home(state); h.lastBreach = state.time.year;
      if (h.stage > 0 && h.path === 'benevolent') { h.stageYear = state.time.year; if (log) log(`The people of ${h.name} watched hunters walk through their village to your door. Some packed up and left; it will take years to grow again.`, 'domain', true); }
    },
    // ---------- years passing (sleep)
    yearly(state, rng) {
      const ev = [], log = (text, bad) => ev.push({ text, kind: 'domain', bad: !!bad });
      const W = state.world, h = dom.home(state), year = state.time.year, R = HB.renown;
      if (h.stage > 0) {
        // a home follows your deeds; it can turn, at a cost
        h.character += (state.dragon.alignment - h.character) * 0.2;
        if (h.path === 'benevolent' ? h.character < -15 : h.character > 15) {
          const wasKind = h.path === 'benevolent';
          h.path = wasKind ? 'tyrannical' : 'benevolent'; h.stage = Math.max(1, h.stage - 1); h.stageYear = year; h.unrest = 0;
          const S = HB.HOME_STAGES[h.path][h.stage];
          const text = wasKind ? `The free people of ${h.name} fled your cruelty. Overseers hold what is left: ${S.noun}.` : `You let the people of ${h.name} go. Some stayed, as free folk: it is ${S.noun} now.`;
          log(text, wasKind); HB.game.chronicle(state, text, 'domain');
          if (HB.consequences) HB.consequences.react(state, text, `because your deeds turned (benevolence ${Math.round(state.dragon.alignment)})`);
          dom.bump(state);
        }
        const S = HB.HOME_STAGES[h.path][h.stage];
        state.hoard.gold += S.gold; h.goldTotal += S.gold;
        if (h.path === 'tyrannical') {
          const calm = HB.lair.guardStrength(state) / 3 + (HB.lair.level(state, 'guardpost') ? 3 : 0) + (R && R.has(state, 'tyrant') ? 2 : 0);
          h.unrest = HB.clamp(h.unrest + S.unrest - calm + rng.range(-2, 3), 0, 100);
          if (h.unrest >= 60) {
            const loss = Math.min(state.hoard.gold, S.gold * 3), drop = h.stage >= 2 && rng.chance(0.35);
            state.hoard.gold -= loss; state.lair.attention = (state.lair.attention || 0) + 3; h.unrest = 15; h.lastRevolt = year; h.stageYear = year;
            if (drop) h.stage--;
            if (state.problems) state.problems.escapes++;
            const text = `${h.name} rose against your overseers: they broke the storehouse, carried off ${HB.fmt.int(loss)} gold and fled into the hills to tell where you sleep.${drop ? ` It is only ${HB.HOME_STAGES[h.path][h.stage].noun} now.` : ''}`;
            log(text, true); HB.game.chronicle(state, text, 'domain');
            if (HB.consequences) HB.consequences.react(state, text, 'because unrest passed 60: forced labour breeds revolt, and guards and a guard post hold it down');
            dom.bump(state);
          }
          if (S.fear) for (const f of W.factions) if (f.dragon.known && f.subregions.some(s => dom.influence(state).subs.has(s))) f.dragon.fear = Math.min(100, f.dragon.fear + S.fear);
        }
        if (S.intel && rng.chance(0.4)) for (const m of dom.members(state)) if (m.status === 'allied') HB.world.rumor(state, m.L.x, m.L.y, 9);
      }
      for (const L of W.locations) {
        const o = L.occupation;
        if (o) {
          const f = L.factionId >= 0 ? W.factions[L.factionId] : null;
          if (L.state !== 'normal') { L.occupation = null; dom.bump(state); continue; }
          const fear = Math.max(L.fear, f ? f.dragon.fear : 0);
          o.years = (o.years || 0) + 1;
          const grow = (5 + L.tier * 2 - fear * 0.04 - (h.path === 'tyrannical' && h.stage >= 2 ? 1.5 : 0)) * (R && R.has(state, 'tyrant') ? 0.67 : 1);
          o.resistance = HB.clamp(o.resistance + grow + rng.range(-2, 2), 0, 100);
          if (!o.resisting && o.resistance >= 60) {
            o.resisting = true; o.resistYears = 0;
            if (f) { f.learned.hunters++; HB.factions.adjust(state, f, { hostility: 8 }, `${L.name} rose against your rule`); }
            const text = `${L.name} rose against your overseers. It pays nothing now and has sent for hunters.`;
            log(text, true); if (HB.consequences) HB.consequences.react(state, text, 'because occupation breeds resistance every year (it passed 60); fear slows it');
            dom.bump(state);
          } else if (o.resisting && ++o.resistYears >= 3) {
            L.occupation = null; L.tribute = null; L.defense = Math.min(100, L.defense + 8); L.flags.freed = year;
            const text = `${L.name} threw off your rule.`;
            log(text, true); HB.game.chronicle(state, text, 'domain', L.id);
            if (HB.consequences) HB.consequences.react(state, text, 'because you left its revolt unanswered for three years');
            dom.bump(state);
          }
          continue;
        }
        const s = dom.statusOf(state, L);
        if (s === 'protected' && L.trust >= 50 && year - (L.flags.protected || year) >= 3 && !L.flags.oathOffered) {
          L.flags.oathOffered = year;
          log(`${L.name} asks to swear an oath to you. Visit it to accept.`);
          if (HB.consequences) HB.consequences.react(state, `${L.name} asks to swear an oath to you and join your domain.`, 'because you have kept it safe for years');
        }
        if (s === 'allied' && L.trust < 25) {
          L.flags.allied = null;
          const text = `${L.name} no longer counts itself your ally.`;
          log(text, true); if (HB.consequences) HB.consequences.react(state, text, `because its trust in you wore thin (${Math.round(L.trust)})`);
          dom.bump(state);
        }
      }
      dom.advance(state, rng, (t) => log(t));
      return ev;
    },
    // ---------- deeds that spread or lose your rule (arrival-card choices)
    canOath(state, L) {
      if (dom.statusOf(state, L) !== 'protected') return { ok: false };
      const since = L.flags.protected || state.time.year;
      if (L.trust < 50) return { ok: false, reason: `They are not ready to swear (trust ${Math.round(L.trust)} of 50). Keep the raiders off them, give back what was stolen, guard their caravans.` };
      if (!L.flags.oathOffered && state.time.year - since < 1 && !(L.flags.savedYear >= since)) return { ok: false, reason: 'They swore to your protection only this year. Keep them safe a while.' };
      return { ok: true };
    },
    takeOath(state, L) {
      const f = L.factionId >= 0 ? state.world.factions[L.factionId] : null, h = dom.home(state);
      L.flags.allied = state.time.year; L.flags.oathOffered = null;
      L.trust = Math.min(100, L.trust + 10);
      if (L.tribute) L.tribute.amount = Math.max(L.tribute.amount, Math.round(L.wealth * 0.06));
      state.dragon.alignment = HB.clamp(state.dragon.alignment + 2, -100, 100);
      if (f) HB.factions.adjust(state, f, { trust: 3 }, `${L.name} swore itself to the dragon`);
      if (HB.renown) HB.renown.record(state, 'allied', { factionId: L.factionId, place: L.name });
      HB.game.chronicle(state, `${L.name} swore an oath to the dragon and joined its domain.`, 'domain', L.id);
      if (HB.consequences) HB.consequences.react(state, `${L.name} is sworn to you: it sends settlers to ${h.stage > 0 ? h.name : 'your hill'}, watches your approaches and brings news.`, 'because you kept your promise to protect it');
      dom.bump(state); state.phase = 'planning';
      return `The elders of ${L.name} kneel in the square, and the young ones copy them. They are yours now, and you are theirs: settlers, watchers and news, for as long as you keep them safe.`;
    },
    rebuildCost(L) { return Math.max(40, Math.min(300, Math.round(L.wealthMax * 0.3))); },
    canRebuild(state, L) {
      if (L.state !== 'burned' || !PEOPLE.includes(L.type)) return { ok: false };
      const cost = dom.rebuildCost(L), have = state.cargo.gold + state.hoard.gold;
      if (have < cost) return { ok: false, cost, reason: `It needs ${cost} gold for timber and seed; you have ${have} carried and stored.` };
      return { ok: true, cost };
    },
    rebuild(state, L) {
      const c = dom.canRebuild(state, L); if (!c.ok) return c.reason;
      const f = L.factionId >= 0 ? state.world.factions[L.factionId] : null;
      const fromCargo = Math.min(state.cargo.gold, c.cost); state.cargo.gold -= fromCargo; if (c.cost > fromCargo) HB.hoard.spend(state, c.cost - fromCargo);
      L.state = 'normal'; L.wealth = Math.max(L.wealth, Math.round(L.wealthMax * 0.5)); L.flags.burnedYears = 0; L.flags.rebuiltYear = state.time.year; L.flags.noThreatUntil = state.time.totalDays + 360;
      L.trust = Math.min(100, L.trust + 30 * (HB.renown ? HB.renown.trustMul(state) : 1)); L.fear = Math.max(0, L.fear - 10);
      state.dragon.alignment = HB.clamp(state.dragon.alignment + 4, -100, 100);
      if (f) { HB.factions.adjust(state, f, { trust: 5 }, `helped rebuild ${L.name}`); if (HB.heat) HB.heat.add(state, f, -10); }
      if (HB.renown) HB.renown.record(state, 'rebuilt', { factionId: L.factionId, place: L.name });
      HB.stats.recompute(state);
      HB.game.chronicle(state, `Paid ${c.cost} gold to rebuild ${L.name}.`, 'deed', L.id);
      if (HB.consequences) HB.consequences.react(state, `${L.name} rises from its ashes with your gold. Its people would accept your protection.`, `because you paid ${c.cost} gold to rebuild it`);
      dom.bump(state); state.phase = 'planning';
      return `Your ${c.cost} gold buys timber, seed and oxen from the next valley. Within a season there are roofs again in ${L.name}, and the people look up when you pass, without fear.`;
    },
    canOccupy(state, L) {
      const d = state.dragon, s = d.stats, f = L.factionId >= 0 ? state.world.factions[L.factionId] : null, st = dom.statusOf(state, L);
      if (d.tier < 1 || !OCCUPY.includes(L.type) || L.state !== 'normal' || L.occupation || st === 'protected' || st === 'allied') return { ok: false, show: false };
      const show = st === 'tributary' || L.fear >= 30 || dom.leaning(state).id === 'tyrannical';
      if (!dom.inInfluence(state, L)) return { ok: false, show, reason: 'Beyond your influence. Your rule spreads from your lair, and from the places that serve you, to their neighbours: bring a place nearer to it under your rule first.' };
      const fear = Math.max(L.fear, f ? f.dragon.fear : 0);
      const lev = fear + s.dominance * 0.8 + (st === 'tributary' ? 25 : 0) + (L.lastRaidYear === state.time.year ? 20 : 0) - L.defense * 0.6;
      if (lev < 30) return { ok: false, show, reason: `They would fight you street by street (fear ${Math.round(fear)}, dominance ${Math.round(s.dominance)} against defences ${L.defense}). Make them pay tribute first, or break their watch in a raid this year.` };
      return { ok: true, show: true, amount: Math.max(30, Math.round(L.wealth * 0.12)) };
    },
    occupy(state, L) {
      const c = dom.canOccupy(state, L); if (!c.ok) return c.reason;
      const W = state.world, f = L.factionId >= 0 ? W.factions[L.factionId] : null, year = state.time.year;
      L.occupation = { since: year, resistance: 15, years: 0, resisting: false };
      L.tribute = { amount: c.amount, since: year, lapsed: false, willing: false, paidTotal: 0 };
      L.fear = Math.min(100, L.fear + 15); L.trust = 0; L.flags.allied = null;
      const g = state.lair.workers.find(w => w.type === 'human' && w.status === 'enslaved');
      if (g) g.count += 2; else state.lair.workers.push({ id: HB.nextId('wg'), type: 'human', count: 2, status: 'enslaved', loyalty: 25, task: 'build', from: L.name, factionId: L.factionId, since: year, unpaidYears: 0 });
      state.dragon.alignment = HB.clamp(state.dragon.alignment - 6, -100, 100);
      if (f) { HB.factions.adjust(state, f, { fear: 6, hostility: 10 }, `occupied ${L.name}`); if (HB.heat) HB.heat.add(state, f, 20, `you occupied ${L.name}`); }
      state.counters.tributes++;
      if (HB.renown) HB.renown.record(state, 'occupied', { factionId: L.factionId, place: L.name });
      HB.stats.recompute(state);
      HB.game.chronicle(state, `Occupied ${L.name}: ${c.amount} gold a year and labour for the lair.`, 'domain', L.id);
      if (HB.consequences) HB.consequences.react(state, `${L.name} is occupied: ${c.amount} gold a year and two labourers for your works. Its resistance will grow every year.`, 'because they feared you more than they trusted their walls');
      dom.bump(state); state.phase = 'planning';
      return `You land in the square and do not leave. By evening your overseers hold the gate, the granary and the reeve’s house. ${L.name} will pay ${c.amount} gold a year, and two of its people walk ahead of you to your works.`;
    },
    crush(state, L) {
      const f = L.factionId >= 0 ? state.world.factions[L.factionId] : null, o = L.occupation;
      o.resistance = 10; o.resisting = false; o.resistYears = 0;
      L.fear = Math.min(100, L.fear + 20); L.wealth = Math.round(L.wealth * 0.85); L.pop = Math.round((L.pop || 0) * 0.95);
      state.dragon.alignment = HB.clamp(state.dragon.alignment - 4, -100, 100);
      if (f) { HB.factions.adjust(state, f, { fear: 4, hostility: 6 }, `crushed the resistance in ${L.name}`); if (HB.heat) HB.heat.add(state, f, 12, `you crushed ${L.name}`); }
      HB.game.chronicle(state, `Crushed the resistance in ${L.name}.`, 'domain', L.id);
      dom.bump(state); state.phase = 'planning';
      return `You come down on ${L.name} at dusk and burn the houses of those who spoke loudest. In the morning the rest go back to work, and pay.`;
    },
    ease(state, L) {
      L.occupation = null; L.tribute = { amount: Math.max(20, Math.round(L.wealth * 0.08)), since: state.time.year, lapsed: false, willing: false, paidTotal: 0 };
      L.fear = Math.max(0, L.fear - 5); L.trust = Math.min(100, L.trust + 5);
      state.dragon.alignment = HB.clamp(state.dragon.alignment + 2, -100, 100);
      HB.game.chronicle(state, `Withdrew the overseers from ${L.name}; it pays tribute instead.`, 'domain', L.id);
      if (HB.consequences) HB.consequences.react(state, `${L.name} pays you ${L.tribute.amount} gold a year under its own reeve.`, 'because you withdrew your overseers');
      dom.bump(state); state.phase = 'planning';
      return `You call your overseers home. ${L.name} still pays, ${L.tribute.amount} gold a year, but its own reeve keeps order, and the shutters open again.`;
    },
    raze(state, L) {
      const W = state.world, f = L.factionId >= 0 ? W.factions[L.factionId] : null, d = state.dragon;
      const lost = L.tribute && !L.tribute.lapsed ? L.tribute.amount : 0;
      const room = Math.max(0, d.stats.capacity - HB.game.cargoWeight(state)) * 100;
      const spoils = Math.round(Math.min(room, L.wealth * 0.5));
      state.cargo.gold += spoils;
      L.state = 'burned'; L.flags.burnedYear = state.time.year; L.wealth = Math.round(L.wealth * 0.2); L.pop = Math.round((L.pop || 0) * 0.5);
      L.occupation = null; L.tribute = null; L.flags.allied = null; L.fear = 100; L.trust = 0;
      L.memory.push({ year: state.time.year, kind: 'raid', stolen: spoils, burned: 5, killed: 6, outcome: 'razed' }); if (L.memory.length > 12) L.memory.shift();
      d.alignment = HB.clamp(d.alignment - 8, -100, 100);
      if (f) { HB.factions.adjust(state, f, { fear: 12, hostility: 18 }, `razed ${L.name}`); f.learned.hunters++; if (HB.heat) HB.heat.add(state, f, 25, `you razed ${L.name}`); if (HB.history) HB.history.onRaid(state, L, f, { burned: 5, kills: 6, civiliansKilled: 4, captured: 0 }); }
      state.counters.burned += 5;
      if (HB.renown) for (let i = 0; i < 3; i++) HB.renown.record(state, 'burned', { factionId: L.factionId, place: L.name });
      HB.game.chronicle(state, `Razed ${L.name}.`, 'raid', L.id);
      if (HB.consequences) HB.consequences.react(state, `You razed ${L.name}: ${spoils} gold now${lost ? `, and never again its ${lost} gold a year` : ''}.`, 'because you chose its ashes over its tribute');
      dom.bump(state); state.phase = 'planning';
      return `You burn ${L.name} from the gate to the granary. ${spoils ? `${spoils} gold comes out of the cellars and the strongboxes.` : 'You cannot carry anything more.'}${lost ? ` It will never pay you again.` : ''}`;
    },
    /** choices on the arrival card at a settlement */
    choicesFor(state, L) {
      const out = [], s = dom.statusOf(state, L);
      if (!L || L.type === 'lair') return out;
      if (s === 'protected') { const c = dom.canOath(state, L); out.push({ label: 'Take their oath', desc: c.ok ? `${L.name} joins your domain as an ally: settlers, watchers and news. You must keep it safe.` : c.reason, disabled: !c.ok, disabledReason: c.reason, tooltip: 'Allies spread your influence to their neighbours, help found and grow the settlement at your lair, and stand with you.', onChoose: () => dom.takeOath(state, L) }); }
      if (L.state === 'burned' && PEOPLE.includes(L.type)) { const c = dom.canRebuild(state, L), cost = dom.rebuildCost(L); out.push({ label: `Help rebuild (${cost} gold)`, desc: c.ok ? 'Paid from what you carry, then from your hoard. Its people will trust you deeply.' : c.reason, disabled: !c.ok, disabledReason: c.reason, tooltip: 'Gold spent here leaves your hoard (and your hoard strength). In return: a living settlement, its trust, and a place that would join your domain.', onChoose: () => dom.rebuild(state, L) }); }
      const oc = dom.canOccupy(state, L);
      if (oc.show) out.push({ label: 'Occupy', desc: oc.ok ? `Your overseers hold it: ${oc.amount} gold a year and labour for your works. Resistance grows every year.` : oc.reason, disabled: !oc.ok, disabledReason: oc.reason, tooltip: 'Occupied places spread your influence, feed a cruel settlement at your lair and pay heavily. They resist; left alone, a revolt breaks them free.', onChoose: () => dom.occupy(state, L) });
      if (s === 'occupied' || s === 'resisting') {
        const r = Math.round(L.occupation.resistance);
        out.push({ label: 'Crush the resistance', desc: `Resistance ${r} → 10. Fear grows; so does hatred, and they are poorer for it.`, onChoose: () => dom.crush(state, L) });
        out.push({ label: 'Ease the yoke', desc: `Withdraw your overseers: it pays ordinary tribute (about ${Math.max(20, Math.round(L.wealth * 0.08))} gold a year) and stops resisting.`, onChoose: () => dom.ease(state, L) });
      }
      if (s === 'occupied' || s === 'resisting' || s === 'tributary') {
        const lost = L.tribute && !L.tribute.lapsed && !(L.occupation && L.occupation.resisting) ? L.tribute.amount : 0;
        out.push({ label: 'Raze it', desc: `Take what you can carry now and burn the rest.${lost ? ` You lose its ${lost} gold a year for good.` : ''} Fear spreads; hunters come.`, onChoose: () => dom.raze(state, L) });
      }
      return out;
    },
    /** called when you raid a settlement (before the raid's damage is applied): broken promises, cowed subjects */
    onRaid(state, L, c) {
      const s = dom.statusOf(state, L);
      if (!(c.stolenValue > 0 || c.burned > 0 || c.kills > 0 || c.captured > 0)) return;
      if (s === 'protected' || s === 'allied') {
        L.tribute = null; L.flags.allied = null; L.flags.oathOffered = null; L.trust = 0;
        state.dragon.alignment = HB.clamp(state.dragon.alignment - 6, -100, 100);
        const others = dom.members(state).filter(m => m.status === 'protected' || m.status === 'allied');
        for (const m of others) m.L.trust = Math.max(0, m.L.trust - 15);
        HB.game.chronicle(state, `Raided ${L.name}, which it had sworn to protect.`, 'domain', L.id);
        if (HB.consequences) HB.consequences.react(state, `You raided ${L.name}, which you had sworn to protect. It owes you nothing now${others.length ? `, and ${HB.fmt.list(others.slice(0, 3).map(m => m.L.name))}${others.length > 3 ? ' and the rest' : ''} trust you less` : ''}.`, 'because you broke your word');
        dom.bump(state);
      } else if (s === 'occupied' || s === 'resisting') {
        const o = L.occupation; o.resistance = Math.max(0, o.resistance - 10);
      }
    },
    // ---------- words
    /** what the next stage still needs, as one line: "5 years to grow; Guard Post in your lair" */
    missingText(nr, skipYears) { return nr.reqs.filter(r => !r.done && !(skipYears && r.key === 'years')).map(r => r.label + (r.need !== undefined ? ` (${HB.fmt.int(r.cur)} of ${HB.fmt.int(r.need)})` : '')).join('; '); },
    statusLine(state, L) {
      const s = dom.statusOf(state, L);
      if (s) { const S = HB.DOMAIN_STATUSES[s]; let t = `${S.name}. ${S.text}`; if (L.occupation) t += ` Resistance ${Math.round(L.occupation.resistance)} of 60.`; return { label: 'Rule', text: t, tone: s === 'resisting' || s === 'ruined' ? 'bad' : S.side > 0 ? 'good' : 'warn' }; }
      if (!SETTLE.includes(L.type) || state.dragon.tier < 1 && !dom.members(state).length) return null;
      const r = dom.reachOf(state, L);
      return { label: 'Rule', text: r ? `Within your influence, but not part of your domain. Influence is only reach: they owe you nothing until they swear, pay or yield.` : 'Outside your influence.', tone: undefined };
    },
    /** concrete things to do for the domain, for the Aims board */
    opportunities(state) {
      const W = state.world, d = state.dragon, h = dom.home(state), out = [];
      const known = W.locations.filter(L => L.type !== 'lair' && HB.world.known(L) && L.knowledge.seen);
      const dist = (t) => Math.round(Math.hypot(t.x - d.x, t.y - d.y));
      const nr = dom.nextReqs(state);
      if (d.tier >= 1 && nr.target) {
        const miss = nr.reqs.filter(r => !r.done);
        out.push({ aim: 'domain', title: h.stage ? `Grow ${h.name} into ${nr.target.noun}` : `Found your domain: ${nr.target.noun}`, desc: miss.length ? `Still needed: ${dom.missingText(nr)}.` : 'Everything is ready: it happens on your next return home or during your next sleep.', yields: nr.target.gives.join('; ') + '.', ref: { kind: 'tab', tab: 'domain' } });
      } else if (d.tier >= 1 && nr.path === 'undecided') out.push({ aim: 'domain', title: 'Be known as kind or as cruel', desc: nr.reqs.find(r => r.key === 'path').hint, yields: 'People come to live at the foot of your hill: a refuge that grows into a castle, or a camp that grows into a dark stronghold.', ref: { kind: 'tab', tab: 'domain' } });
      for (const L of known) {
        const s = dom.statusOf(state, L);
        if (s === 'protected' && dom.canOath(state, L).ok) out.push({ aim: 'domain', title: `Take the oath of ${L.name}`, desc: `${L.name} trusts you (${Math.round(L.trust)})${L.flags.oathOffered ? ' and has asked to swear to you' : ''}. ${dist(L)} leagues away.`, yields: 'An ally: your influence spreads to its neighbours; settlers, watchers and news.', ref: { kind: 'loc', id: L.id } });
        if ((s === 'occupied' || s === 'resisting') && L.occupation.resistance >= 40) out.push({ aim: 'domain', title: `${s === 'resisting' ? 'Answer the revolt in' : 'Settle the unrest in'} ${L.name}`, desc: `Resistance ${Math.round(L.occupation.resistance)}${s === 'resisting' ? `: it pays nothing; free in ${3 - (L.occupation.resistYears || 0)} more years if left alone` : ' of 60'}.`, yields: 'Crush it (fear, hatred, poorer) or ease the yoke (ordinary tribute, no resistance).', ref: { kind: 'loc', id: L.id }, urgent: s === 'resisting' });
      }
      const burned = known.filter(L => L.state === 'burned' && PEOPLE.includes(L.type) && dist(L) <= 40).sort((a, b) => dist(a) - dist(b))[0];
      if (burned) out.push({ aim: 'domain', title: `Help rebuild ${burned.name} (${dom.rebuildCost(burned)} gold)`, desc: `Burned${burned.flags.burnedYear ? ' in Year ' + burned.flags.burnedYear : ''}; ${dist(burned)} leagues away.`, yields: 'Deep trust (+30), a kinder name, and a place that would accept your protection. The gold leaves your hoard.', ref: { kind: 'loc', id: burned.id } });
      if (d.tier >= 1) { const L = known.find(L => dom.canOccupy(state, L).ok); if (L) out.push({ aim: 'domain', title: `Occupy ${L.name}`, desc: `${dom.statusOf(state, L) === 'tributary' ? 'It already pays you tribute.' : 'It fears you.'} ${dist(L)} leagues away.`, yields: `About ${dom.canOccupy(state, L).amount} gold a year and forced labour; your influence spreads. It will resist.`, ref: { kind: 'loc', id: L.id } }); }
      return out;
    },
  };
})();

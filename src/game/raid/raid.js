/* Side-view raid simulation (headless-safe). The view renders it; this file owns the rules.
 * Scene space: pixels; ground line at GROUND; the dragon cruises at CRUISE_Y and swoops to act. */
(function () {
  const HB = globalThis.HB;

  const GROUND = 150, CRUISE_Y = 62, SLOW = 0.12, FAST = 2.6;
  const RANGE_AHEAD = 64, RANGE_BEHIND = 14;

  const raid = HB.raid = {
    GROUND, CRUISE_Y,
    create(state, target, scene) {
      const d = state.dragon, s = d.stats;
      const r = {
        state, target, scene, t: 0, timescale: 1, hold: 1, paused: false,
        dragon: { x: 10, y: CRUISE_Y, hp: d.health, stamina: d.stamina, facing: 1, busy: null, pose: 'fly', poseT: 0, hurtT: 0, speed: 24 + d.tier * 4, lowUntil: 0, lastRoar: -99, passes: 0, size: 0.6 + d.tier * 0.14 },
        entities: scene.entities, projectiles: [], particles: [], fx: [],
        alarm: 0, alarmStage: 0, log: [], messages: [],
        loot: { gold: 0, items: [], captives: [] },
        outcome: null, focusId: null, dismissed: new Set(), seen: new Set(), decision: false,
        kills: 0, civiliansKilled: 0, burned: 0, captured: 0, destroyedValue: 0, stolenValue: 0, usedBreath: 0, roars: 0, ate: 0, damageTaken: 0,
        camera: { x: 0 },
        length: scene.length, escalations: scene.escalations || [], nextEntityId: 1000,
        ended: false, endT: 0,
        mode: scene.mode || 'raid', fled: 0, recoveredValue: 0, recoveredGold: 0, raiderBurned: 0, raidersKilled: 0,
      };
      for (const e of r.entities) raid.initEntity(r, e);
      for (const e of r.entities) if (e.preBurning) { e.burning = e.preBurning; e.raiderFire = true; }
      raid.msg(r, scene.intro || 'The raid begins.');
      if (scene.hint) raid.msg(r, scene.hint, 'alarm');
      return r;
    },
    initEntity(r, e) {
      if (e.id === undefined) e.id = r.nextEntityId++;
      e.hp = e.hp === undefined ? (ARCH[e.kind] ? ARCH[e.kind].hp : 1) : e.hp;
      e.maxHp = e.hp;
      Object.assign(e, { state: e.state || (ARCH[e.kind] && ARCH[e.kind].defender ? 'idle' : 'idle'), cooldown: 0, fearT: 0, vx: 0, burning: 0, dead: false, y: e.y === undefined ? GROUND : e.y, w: e.w || 10, h: e.h || 12, home: e.x, facing: e.facing || -1 });
      const a = ARCH[e.kind] || {};
      e.attack = e.attack !== undefined ? e.attack : (a.attack || 0);
      e.range = e.range !== undefined ? e.range : (a.range || 0);
      e.speed = e.speed !== undefined ? e.speed : (a.speed || 0);
      e.courage = e.courage !== undefined ? e.courage : (a.courage || 1);
      e.rate = e.rate !== undefined ? e.rate : (a.rate || 2);
      e.defender = !!a.defender; e.civilian = !!a.civilian; e.ranged = !!a.ranged; e.melee = !!a.melee;
      e.person = !!a.person; e.animal = !!a.animal; e.loot = e.loot || null; e.building = !!a.building || !!e.building;
    },
    msg(r, text, kind = 'info') { r.messages.push({ text, kind, t: r.t }); if (r.messages.length > 6) r.messages.shift(); r.log.push(text); },

    // ---------- per frame
    update(r, dt, input) {
      if (r.ended) { r.endT += dt; return; }
      const D = r.dragon, st = r.state;
      // time scale: decision slow-motion, hold to speed
      r.hold = input && input.speed ? FAST : input && input.slow ? 0.35 : 1;
      const target = r.decision && !D.busy ? SLOW : r.hold;
      r.timescale = HB.lerp(r.timescale, target, Math.min(1, dt * 10));
      const sdt = dt * r.timescale;
      r.t += sdt;
      // dragon
      raid.updateDragon(r, sdt);
      // entities
      for (const e of r.entities) if (!e.dead) raid.updateEntity(r, e, sdt);
      // projectiles
      for (const p of r.projectiles) {
        p.x += p.vx * sdt; p.y += p.vy * sdt; p.t += sdt;
        if (p.t >= p.dur) {
          p.done = true;
          if (p.hitDragon) { raid.damageDragon(r, p.dmg, p.label); }
        }
      }
      r.projectiles = r.projectiles.filter(p => !p.done);
      for (const p of r.particles) { p.x += p.vx * sdt; p.y += p.vy * sdt; p.vy += (p.g || 0) * sdt; p.t += sdt; }
      r.particles = r.particles.filter(p => p.t < p.life);
      // alarm: rises slowly until you are noticed (alarm 25), then at the scene's rate
      const alarmRate = (r.scene.alarmBase || 1.6) * (st.dragon.stats.alarmRate || 1) * (r.alarm < 25 ? 0.45 : 1);
      r.alarm = Math.min(100, r.alarm + alarmRate * sdt);
      // defending: the bar is the raiders' progress, a clock your noise does not speed up
      if (r.mode === 'defend') { r.clock = (r.clock || 0) + alarmRate * sdt; r.alarm = Math.min(100, r.clock); }
      raid.checkEscalation(r);
      // opportunities
      raid.updateOpportunities(r);
      // defend: the village is saved when no raider is left
      if (r.mode === 'defend' && !r.outcome && !r.entities.some(e => e.raider && !e.dead)) { raid.msg(r, 'The last raider is gone.', 'good'); raid.end(r, 'defended'); }
      // death
      if (D.hp <= 0 && !r.outcome) raid.end(r, 'defeated');
    },
    updateDragon(r, dt) {
      const D = r.dragon;
      D.poseT += dt; if (D.hurtT > 0) D.hurtT -= dt;
      if (D.busy) { raid.updateAction(r, dt); return; }
      // cruise; turn around at the ends so the player can circle
      D.x += D.speed * D.facing * dt;
      if (D.x > r.length + 30 && D.facing > 0) { D.facing = -1; D.passes++; raid.msg(r, 'You wheel about for another pass.'); r.dismissed.clear(); }
      if (D.x < -30 && D.facing < 0) { D.facing = 1; D.passes++; r.dismissed.clear(); }
      D.y = HB.lerp(D.y, CRUISE_Y + Math.sin(r.t * 2.2) * 3, Math.min(1, dt * 3));
      D.pose = 'fly';
    },
    // ---------- entities
    updateEntity(r, e, dt) {
      const D = r.dragon;
      e.cooldown = Math.max(0, e.cooldown - dt);
      if (e.fearT > 0) e.fearT -= dt;
      if (e.burning > 0) {
        e.burning -= dt;
        if (r.t % 0.2 < dt) raid.spawnParticles(r, e.x + (Math.random() - 0.5) * e.w, e.y - e.h * 0.6, 2, 'fire');
        if (e.building && !e.burnedDown && e.burning < 0.1) { raid.buildingBurned(r, e); }
        if ((e.person || e.animal) && e.burning > 0 && !e.dead) { e.hp -= 6 * dt; if (e.hp <= 0) raid.kill(r, e, 'burned'); }
      }
      const dx = D.x - e.x, adx = Math.abs(dx);
      const dragonLow = D.y > GROUND - 40;
      if (e.dead || e.building || e.loot && !e.person && !e.animal) return;
      // fear / flee
      if (e.fearT > 0 || e.routed) {
        const dir = e.routed ? (e.fleeDir || (dx > 0 ? -1 : 1)) : dx > 0 ? -1 : 1;
        e.x += dir * (e.speed || 20) * 1.2 * dt; e.facing = dir; e.state = 'flee';
        if (e.raider && (e.x < -14 || e.x > r.length + 14)) raid.raiderGone(r, e);
        return;
      }
      if (e.state === 'asleep') { if (r.alarm >= 25 || adx < 18 && dragonLow) { e.state = 'alert'; raid.msg(r, `${e.label || e.kind} wakes.`); } return; }
      if (e.civilian || e.animal) {
        if (r.alarm >= 15 || adx < 50) { const dir = dx > 0 ? -1 : 1; e.x += dir * (e.speed || 14) * dt; e.facing = dir; e.state = 'flee'; e.x = HB.clamp(e.x, -20, r.length + 20); }
        else if (e.animal && Math.random() < 0.3 * dt) e.x += (Math.random() - 0.5) * 6;
        return;
      }
      if (!e.defender) return;
      // defenders: idle until the alarm is raised or the dragon comes close
      if (e.state === 'idle' && (r.alarm >= 25 || adx < 48 || (e.ranged && adx < 90 && r.alarm >= 12))) e.state = 'alert';
      if (e.state !== 'alert' && e.state !== 'aiming' && e.state !== 'reload') return;
      if (e.ranged) {
        if (e.kind === 'ballista') {
          if (r.alarm < 40) return; // nobody has manned it yet
          if (e.state === 'alert' && adx < e.range && e.cooldown <= 0) { e.state = 'aiming'; e.aimT = 1.6; raid.msg(r, 'The ballista swings toward you!', 'threat'); }
          else if (e.state === 'aiming') { e.aimT -= dt; if (e.aimT <= 0) { raid.fire(r, e, 'bolt'); e.state = 'alert'; e.cooldown = e.rate; } }
          return;
        }
        if (adx < e.range && e.cooldown <= 0) { raid.fire(r, e, e.kind === 'hero' ? 'javelin' : 'arrow'); e.cooldown = e.rate * (0.8 + Math.random() * 0.4); }
        if (e.melee && dragonLow && adx < 16 && e.cooldown <= 0) raid.meleeHit(r, e);
        return;
      }
      if (e.melee) {
        // approach the dragon's x if it is low or near
        if (adx > 12 && (dragonLow || r.alarm >= 40 || adx < 40)) { const dir = dx > 0 ? 1 : -1; e.x += dir * e.speed * dt; e.facing = dir; }
        if (dragonLow && adx < 16 && e.cooldown <= 0) raid.meleeHit(r, e);
      }
    },
    fire(r, e, kind) {
      const D = r.dragon, st = r.state;
      const dist = Math.hypot(D.x - e.x, D.y - (e.y - e.h * 0.6));
      const dur = kind === 'bolt' ? 0.35 : HB.clamp(dist / 140, 0.3, 0.9);
      const dmg = kind === 'bolt' ? 18 + Math.random() * 12 : kind === 'javelin' ? 7 + Math.random() * 4 : 4 + Math.random() * 4;
      const baseHit = (kind === 'bolt' ? 0.7 : kind === 'javelin' ? 0.6 : 0.5) * (0.55 + D.size * 0.55); // small dragons are hard to hit
      const moving = !D.busy ? 0.1 : 0;
      const evade = D.dodgeT > 0 ? 0.6 : 0;
      const hit = Math.random() < baseHit - moving - evade;
      const tx = hit ? D.x : D.x + (Math.random() - 0.5) * 30, ty = hit ? D.y : D.y + (Math.random() > 0.5 ? 14 : -16);
      const sx = e.x, sy = e.y - e.h * 0.7;
      r.projectiles.push({ kind, x: sx, y: sy, vx: (tx - sx) / dur, vy: (ty - sy) / dur, t: 0, dur, hitDragon: hit, dmg: Math.max(1, dmg - st.dragon.stats.defense * (kind === 'bolt' ? 0.5 : 0.6)), label: kind === 'bolt' ? 'a ballista bolt' : kind === 'javelin' ? `${e.label || 'the hero'}’s javelin` : 'an arrow' });
      if (kind === 'bolt') r.alarm = Math.min(100, r.alarm + 2);
    },
    meleeHit(r, e) {
      const st = r.state;
      e.cooldown = 1.2;
      const dmg = Math.max(1, e.attack * (0.8 + Math.random() * 0.4) - st.dragon.stats.defense * 0.6);
      raid.damageDragon(r, dmg, `${e.label || e.kind}’s blow`);
      raid.spawnParticles(r, r.dragon.x, r.dragon.y, 4, 'spark');
    },
    damageDragon(r, dmg, label) {
      const D = r.dragon;
      dmg = Math.round(dmg);
      D.hp -= dmg; D.hurtT = 0.25; r.damageTaken += dmg;
      raid.msg(r, `${HB.fmt.cap(label)} hits you for ${dmg}.`, 'hurt');
      if (D.hp <= 0) D.hp = 0;
    },
    kill(r, e, how) {
      e.dead = true; e.state = 'dead';
      if (e.civilian) { r.civiliansKilled++; }
      else if (e.defender) { r.kills++; if (e.raider) r.raidersKilled++; }
      if (e.animal) r.ate += 0;
      raid.msg(r, `${HB.fmt.cap(e.label || e.kind)} ${how === 'burned' ? 'burns' : 'falls'}.`);
      // loot carried by the fallen
      if (e.drop) { r.entities.push(raid.makeLoot(r, e.drop, e.x, 'exposed')); }
    },
    makeLoot(r, def, x, access) { const e = Object.assign({ kind: def.sprite || 'coins', x, y: GROUND, w: 10, h: 8, loot: def, access: access || def.access || 'exposed', label: def.label || def.name || 'treasure' }, {}); raid.initEntity(r, e); return e; },
    buildingBurned(r, e) {
      e.burnedDown = true; if (e.raiderFire) r.raiderBurned++; else r.burned++;
      let inside = r.entities.filter(o => o.insideOf === e.id && !o.dead && o.loot);
      for (const o of inside) {
        if (o.loot.gold) { const kept = Math.random() < 0.6; if (kept) { o.insideOf = null; o.access = 'exposed'; o.y = GROUND; o.x = e.x + (Math.random() - 0.5) * 20; raid.msg(r, `Coin spills from the burning ${e.label || 'building'}.`); } else { o.dead = true; r.destroyedValue += o.loot.value || 0; } }
        else { if (Math.random() < 0.35) { o.insideOf = null; o.access = 'exposed'; o.y = GROUND; o.x = e.x + (Math.random() - 0.5) * 20; raid.msg(r, `${HB.fmt.cap(o.label)} survives the fire.`); } else { o.dead = true; r.destroyedValue += o.loot.value || 0; raid.msg(r, `${HB.fmt.cap(o.label)} is lost to the flames.`); } }
      }
      for (const o of r.entities) if (o.insideOf === e.id && (o.person || o.animal) && !o.dead) { o.insideOf = null; o.x = e.x + (Math.random() - 0.5) * 20; o.fearT = 5; }
      if (e.granary) { r.famine = true; }
      r.alarm = Math.min(100, r.alarm + 8);
    },
    spawnParticles(r, x, y, n, kind) {
      for (let i = 0; i < n; i++) r.particles.push({ x, y, vx: (Math.random() - 0.5) * (kind === 'spark' ? 60 : 20), vy: kind === 'fire' ? -20 - Math.random() * 20 : kind === 'coin' ? -40 - Math.random() * 30 : (Math.random() - 0.5) * 40, g: kind === 'coin' ? 90 : kind === 'spark' ? 60 : -5, t: 0, life: kind === 'fire' ? 0.6 + Math.random() * 0.5 : 0.8, kind });
    },
    checkEscalation(r) {
      for (const esc of r.escalations) {
        if (esc.done || r.alarm < esc.at) continue;
        esc.done = true; r.alarmStage++;
        raid.msg(r, esc.text, 'alarm');
        if (esc.spawn) for (const sp of esc.spawn) { const e = Object.assign({}, sp); raid.initEntity(r, e); e.state = 'alert'; r.entities.push(e); }
        if (esc.effect) esc.effect(r);
      }
    },
    // ---------- opportunities & actions
    inRange(r, e) {
      const D = r.dragon; const dx = (e.x - D.x) * D.facing;
      return dx > -RANGE_BEHIND && dx < RANGE_AHEAD && !e.dead && !e.insideOf;
    },
    updateOpportunities(r) {
      const list = [];
      for (const e of r.entities) {
        if (!raid.inRange(r, e) || r.dismissed.has(e.id)) continue;
        const acts = raid.actionsFor(r, e).filter(a => a.enabled || a.showDisabled);
        if (acts.length) list.push(e);
      }
      // sort by what matters most, then by distance ahead
      const D = r.dragon;
      const prio = (e) => e.state === 'aiming' ? 0 : (e.loot && !e.person && !e.animal && e.access === 'exposed') ? 1 : e.captive ? 2 : e.defender && e.state === 'asleep' ? 3 : e.animal ? 4 : e.loot ? 5 : e.defender ? 6 : e.building ? 7 : 8;
      list.sort((a, b) => prio(a) - prio(b) || Math.abs(a.x - D.x) - Math.abs(b.x - D.x));
      r.opportunities = list;
      // threats are opportunities too (ballista aiming)
      const threat = r.entities.find(e => e.state === 'aiming' && !e.dead);
      if (threat && !list.includes(threat)) list.unshift(threat);
      const focus = list.find(e => e.id === r.focusId) || list[0] || null;
      if (focus && focus.id !== r.focusId) { r.focusId = focus.id; }
      if (!focus) r.focusId = null;
      r.decision = !!focus && !r.dragon.busy;
      if (focus && !r.seen.has(focus.id)) { r.seen.add(focus.id); }
    },
    focus(r) { return r.entities.find(e => e.id === r.focusId) || null; },
    cycleFocus(r, dir = 1) { const list = r.opportunities || []; if (!list.length) return; const i = list.findIndex(e => e.id === r.focusId); r.focusId = list[(i + dir + list.length) % list.length].id; },
    actionsFor(r, e) {
      const st = r.state, D = r.dragon, s = st.dragon.stats, out = [];
      const weightLeft = s.capacity - HB.game.cargoWeight(st) - raid.lootWeight(r);
      const stamOK = (n) => D.stamina >= n;
      const isolated = !r.entities.some(o => o !== e && o.defender && !o.dead && Math.abs(o.x - e.x) < 26 && o.state !== 'asleep');
      if (e.state === 'aiming') out.push({ id: 'dodge', label: 'Dodge the bolt', desc: 'Costs 5 stamina; the bolt will almost surely miss.', risk: 'safe', enabled: stamOK(5), reason: 'Not enough stamina' });
      if (e.loot && !e.person && !e.animal) {
        if (e.access === 'exposed') out.push({ id: 'grab', label: `${e.loot.recovered ? 'Take back' : 'Grab'} ${e.label}`, desc: `${e.loot.value ? HB.fmt.int(e.loot.value) + ' gold worth, ' : ''}weighs ${e.loot.weight}. ${e.loot.recovered ? 'Stolen from the village: afterwards you choose to return it or keep it.' : 'Alarm rises a little.'}`, risk: 'low', enabled: e.loot.weight <= weightLeft + 1e-6, reason: `Too heavy: ${e.loot.weight} with ${Math.max(0, weightLeft).toFixed(1)} left`, showDisabled: true });
        else if (e.access === 'inside') out.push({ id: 'smash', label: `Smash open ${e.container || 'it'}`, desc: 'Land and break it open. Takes time; defenders close in; alarm rises sharply.', risk: 'high', enabled: s.canLand && stamOK(10), reason: s.canLand ? 'Not enough stamina' : 'Only an adult dragon can land and smash', showDisabled: true });
      }
      if (e.building && !e.burnedDown && !e.burning) out.push({ id: 'breathe', label: `Burn ${e.label}`, desc: `${e.contents || 'What is inside may burn with it.'} Costs 12 stamina; alarm rises sharply; the realm will hate you for it.`, risk: 'mid', enabled: stamOK(12), reason: 'Not enough stamina' });
      if (e.defender && !e.dead) {
        out.push({ id: 'bite', label: `Bite ${e.label}`, desc: `${isolated || e.state === 'asleep' ? 'Isolated. ' : 'Others are near: they will strike back. '}Swoop low and tear.`, risk: isolated ? 'mid' : 'high', enabled: true });
        if (e.kind !== 'ballista') out.push({ id: 'breathe', label: `Breathe fire at ${e.label}`, desc: 'Costs 12 stamina; burns everyone close to them; alarm rises.', risk: 'mid', enabled: stamOK(12), reason: 'Not enough stamina' });
        else out.push({ id: 'breathe', label: 'Burn the ballista', desc: 'Costs 12 stamina; destroys it and its crew.', risk: 'mid', enabled: stamOK(12), reason: 'Not enough stamina' });
      }
      if (e.person && e.captive) out.push({ id: 'capture', label: `Seize ${e.label}`, desc: `${e.captiveDesc || 'Worth a ransom.'} Weighs ${e.captiveWeight || 2}; alarm rises sharply; riders will follow.`, risk: 'high', enabled: (e.captiveWeight || 2) <= weightLeft + 1e-6, reason: 'Too heavy to carry with your cargo', showDisabled: true });
      if (e.animal && !e.dead) out.push({ id: 'feed', label: `Eat ${e.label}`, desc: 'Land to feed: recover health and stamina. Takes a moment.', risk: 'low', enabled: D.hp < s.maxHealth || D.stamina < s.maxStamina, reason: 'You are not hungry' });
      if (e.person && e.civilian && !e.captive && !e.dead && e.kind !== 'corpse') { /* nothing to do with ordinary folk except frighten them */ }
      // roar is global but offered on any opportunity
      if (r.t - D.lastRoar > 8 && (e.defender || e.civilian)) out.push({ id: 'roar', label: 'Roar', desc: `Costs 6 stamina; everyone near flees or cowers for a while (strength ${s.roar}). Alarm rises.`, risk: 'low', enabled: stamOK(6), reason: 'Not enough stamina' });
      return out;
    },
    lootWeight(r) { let w = r.loot.gold / 100; for (const it of r.loot.items) w += it.weight; for (const c of r.loot.captives) w += c.weight; return w; },
    perform(r, actionId, e) {
      const D = r.dragon;
      if (D.busy || r.ended) return false;
      if (actionId === 'wait') { if (e) r.dismissed.add(e.id); r.decision = false; return true; }
      if (actionId === 'withdraw') { raid.withdraw(r); return true; }
      if (actionId === 'dodge') { D.stamina -= 5; D.dodgeT = 1.2; D.busy = { id: 'dodge', e, t: 0, dur: 0.5 }; raid.msg(r, 'You fold your wings and drop.'); return true; }
      const act = raid.actionsFor(r, e).find(a => a.id === actionId);
      if (!act || !act.enabled) return false;
      const dur = { grab: 1.0, breathe: 1.1, bite: 1.0, smash: 2.2, roar: 0.9, capture: 1.1, feed: 1.8 }[actionId] || 1;
      D.busy = { id: actionId, e, t: 0, dur, applied: false };
      if (actionId === 'breathe') { D.stamina -= 12; r.usedBreath++; }
      if (actionId === 'roar') { D.stamina -= 6; D.lastRoar = r.t; r.roars++; }
      if (actionId === 'smash') { D.stamina -= 10; }
      D.facing = e.x >= D.x ? 1 : -1;
      return true;
    },
    updateAction(r, dt) {
      const D = r.dragon, b = D.busy, e = b.e, st = r.state, s = st.dragon.stats;
      b.t += dt;
      const k = Math.min(1, b.t / b.dur);
      const low = ['grab', 'bite', 'smash', 'capture', 'feed'].includes(b.id);
      if (b.id === 'dodge') { D.dodgeT = Math.max(0, (D.dodgeT || 0) - dt); D.y = HB.lerp(D.y, CRUISE_Y + 40, Math.min(1, dt * 8)); D.pose = 'fly'; if (k >= 1) { D.busy = null; } return; }
      if (low) {
        const targetY = (b.id === 'smash' || b.id === 'feed') ? GROUND - 6 : GROUND - 18;
        const phase = k < 0.35 ? k / 0.35 : k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
        D.y = HB.lerp(CRUISE_Y, targetY, HB.ease.inOut(HB.clamp(phase, 0, 1)));
        D.x = HB.lerp(D.x, e.x - D.facing * 6, Math.min(1, dt * 4));
        D.pose = b.id === 'bite' ? 'bite' : b.id === 'smash' || b.id === 'feed' ? 'land' : 'grab';
      } else { D.pose = b.id === 'roar' ? 'roar' : 'breathe'; D.y = HB.lerp(D.y, CRUISE_Y + 10, Math.min(1, dt * 4)); }
      if (!b.applied && k >= 0.5) {
        b.applied = true;
        switch (b.id) {
          case 'grab': raid.takeLoot(r, e); break;
          case 'bite': raid.applyBite(r, e); break;
          case 'breathe': raid.applyBreath(r, e); break;
          case 'smash': raid.applySmash(r, e); break;
          case 'roar': raid.applyRoar(r); break;
          case 'capture': raid.applyCapture(r, e); break;
          case 'feed': raid.applyFeed(r, e); break;
        }
      }
      if (k >= 1) { D.busy = null; D.y = Math.min(D.y, CRUISE_Y + 20); }
    },
    takeLoot(r, e) {
      const L = e.loot;
      if (L.recovered) { r.recoveredValue += L.value || L.gold || 0; if (L.gold) r.recoveredGold += L.gold; else if (L.item) L.item.recovered = r.target.id; }
      if (L.gold) { r.loot.gold += L.gold; if (!L.recovered) r.stolenValue += L.gold; raid.msg(r, L.recovered ? `You take back ${HB.fmt.int(L.gold)} stolen gold.` : `You snatch ${HB.fmt.int(L.gold)} gold.`, 'good'); }
      else if (L.item) { r.loot.items.push(L.item); if (!L.recovered) r.stolenValue += L.item.value; raid.msg(r, `You take ${L.recovered ? 'back ' : ''}${L.item.name}.`, 'good'); if (L.item.named) r.tookArtifact = L.item; }
      e.dead = true; r.alarm = Math.min(100, r.alarm + 6);
      raid.spawnParticles(r, e.x, e.y - 6, 6, 'coin');
      if (L.watchers) r.alarm = Math.min(100, r.alarm + L.watchers);
    },
    applyBite(r, e) {
      const st = r.state, s = st.dragon.stats;
      const dmg = s.bite * (0.9 + Math.random() * 0.3) * (e.state === 'asleep' ? 2 : 1);
      e.hp -= dmg; e.state = e.state === 'asleep' ? 'alert' : e.state;
      raid.spawnParticles(r, e.x, e.y - 8, 5, 'spark');
      r.alarm = Math.min(100, r.alarm + 5);
      if (e.hp <= 0) raid.kill(r, e, 'bitten'); else { raid.msg(r, `You tear at ${e.label}.`); if (raid.maybeRout(r, e)) return; if (e.melee && e.cooldown <= 0) raid.meleeHit(r, e); }
    },
    applyBreath(r, e) {
      const st = r.state, s = st.dragon.stats, D = r.dragon;
      const elem = s.breathElement || 'fire';
      r.alarm = Math.min(100, r.alarm + 14);
      const x0 = D.x, dir = D.facing;
      for (const o of r.entities) {
        if (o.dead) continue;
        const dx = (o.x - x0) * dir;
        if (dx < -4 || dx > 62) continue;
        if (o.building) { if (!o.burning && !o.burnedDown) { o.burning = 3 + Math.random(); raid.msg(r, `${HB.fmt.cap(o.label)} catches fire.`); } continue; }
        if (o.loot && !o.person && !o.animal) { if (o.loot.gold) continue; if (Math.random() < 0.5) { o.dead = true; r.destroyedValue += o.loot.value || 0; raid.msg(r, `${HB.fmt.cap(o.label)} is destroyed by your breath.`); } continue; }
        const dmg = s.breath * (0.8 + Math.random() * 0.4) * (dx > 40 ? 0.6 : 1);
        o.hp -= dmg; if (o.person || o.animal) o.burning = Math.max(o.burning, 1.5);
        if (o.hp <= 0) raid.kill(r, o, 'burned'); else { o.fearT = Math.max(o.fearT, 1.5); raid.maybeRout(r, o); }
      }
      raid.spawnParticles(r, D.x + dir * 30, D.y, 12, 'fire');
      if (e && e.kind === 'ballista' && !e.dead) { e.hp = 0; raid.kill(r, e, 'burned'); }
    },
    applySmash(r, e) {
      r.alarm = Math.min(100, r.alarm + 18);
      // expose everything inside this container
      const id = e.containerId || e.id;
      let n = 0;
      for (const o of r.entities) if (o.insideOf === id && !o.dead) { o.insideOf = null; o.access = 'exposed'; o.y = GROUND; o.x = e.x + (n++ - 1) * 14; }
      if (e.loot && e.access === 'inside') { e.access = 'exposed'; }
      raid.msg(r, `You tear ${e.container || 'it'} open. ${n ? 'Treasure glitters within.' : ''}`, 'good');
      raid.spawnParticles(r, e.x, e.y - 10, 10, 'spark');
    },
    applyRoar(r) {
      const st = r.state, s = st.dragon.stats, D = r.dragon;
      r.alarm = Math.min(100, r.alarm + 8);
      let n = 0;
      for (const o of r.entities) {
        if (o.dead || !(o.person || o.animal)) continue;
        if (Math.abs(o.x - D.x) > 130) continue;
        const resist = (o.courage || 1) * (o.kind === 'hero' ? 1.5 : 1);
        if (s.roar * (0.7 + Math.random() * 0.6) >= resist) { o.fearT = 3 + s.roar; n++; if (o.state === 'aiming') o.state = 'alert'; if (o.raider) raid.rout(r, o); }
      }
      raid.msg(r, n ? `Your roar scatters ${n} of them.` : 'Your roar echoes. Nobody runs.', n ? 'good' : 'info');
    },
    applyCapture(r, e) {
      e.dead = true; r.captured++;
      const c = { id: HB.nextId('cap'), name: e.personName || e.label, kind: e.captiveKind || 'noble', weight: e.captiveWeight || 2, from: r.target.name || '', factionId: r.target.factionId !== undefined ? r.target.factionId : -1, house: e.house || null, year: r.state.time.year, ransomed: false };
      r.loot.captives.push(c);
      r.alarm = Math.min(100, r.alarm + 16);
      raid.msg(r, `You seize ${e.label}. Shouts go up behind you.`, 'good');
    },
    applyFeed(r, e) {
      const st = r.state, s = st.dragon.stats, D = r.dragon;
      e.dead = true; r.ate++;
      D.hp = Math.min(s.maxHealth, D.hp + Math.round(s.maxHealth * 0.15));
      D.stamina = Math.min(s.maxStamina, D.stamina + 10);
      r.alarm = Math.min(100, r.alarm + 4);
      raid.msg(r, `You feed on ${e.label}. Strength returns.`, 'good');
    },
    withdraw(r) {
      const D = r.dragon;
      D.busy = { id: 'withdraw', t: 0, dur: 1.2 };
      // override action update for withdraw
      raid.end(r, 'withdrew');
    },
    end(r, outcome) {
      if (r.ended) return;
      r.outcome = outcome; r.ended = true; r.endT = 0;
      // pursuit damage when leaving under high alarm
      if (outcome === 'withdrew' && r.alarm >= 60) {
        const archers = r.entities.filter(e => !e.dead && e.ranged && e.kind !== 'ballista').length;
        if (archers) { const dmg = Math.round(Math.max(0, archers * 2.2 - r.state.dragon.stats.defense * 0.5)); if (dmg > 0) { r.dragon.hp = Math.max(1, r.dragon.hp - dmg); r.damageTaken += dmg; raid.msg(r, `A parting volley follows you: ${dmg} damage.`, 'hurt'); } }
      }
      r.pursued = r.alarm >= 70 || r.captured > 0;
    },
    /** a wounded or terrified raider breaks and runs for the hills */
    maybeRout(r, e) { if (!e.raider || e.dead || e.routed) return false; if (e.hp < e.maxHp * 0.5 && Math.random() < 0.7) { raid.rout(r, e); return true; } return false; },
    rout(r, e) {
      if (e.routed) return;
      e.routed = true; e.fleeDir = e.x < r.length / 2 ? -1 : 1;
      if (e.drop && Math.random() < 0.5) { r.entities.push(raid.makeLoot(r, e.drop, e.x, 'exposed')); raid.msg(r, `${HB.fmt.cap(e.label)} drops what they stole and runs.`, 'good'); e.drop = null; }
      else raid.msg(r, `${HB.fmt.cap(e.label)} breaks and runs${e.drop ? ', still clutching the loot' : ''}.`, 'good');
    },
    raiderGone(r, e) { e.dead = true; e.fled = true; r.fled++; raid.msg(r, `${HB.fmt.cap(e.label)} flees into the hills${e.drop ? ' with what they stole' : ''}.`); },
    /** outlaws set a building alight (does not count as your burning) */
    raiderFire(r, kind) {
      const b = r.entities.find(e => e.building && !e.burning && !e.burnedDown && (!kind || e.kind === kind) && (kind || e.kind === 'house'));
      if (b) { b.burning = 8; b.raiderFire = true; }
    },
    stageName(r) {
      if (r.mode === 'defend') return r.alarm < 30 ? 'Raiders looting' : r.alarm < 60 ? 'Roofs burning' : r.alarm < 90 ? 'More raiders coming' : 'The village burns';
      return r.alarm < 25 ? 'Quiet' : r.alarm < 50 ? 'Bells ringing' : r.alarm < 70 ? 'Militia gathering' : r.alarm < 85 ? 'Archers organised' : 'Full alarm'; },
  };

  // archetypes
  const ARCH = HB.RAID_ARCH = {
    guard: { hp: 14, attack: 5, speed: 22, melee: true, defender: true, courage: 1.2, person: true },
    militia: { hp: 8, attack: 3, speed: 24, melee: true, defender: true, courage: 0.7, person: true },
    archer: { hp: 10, attack: 3, range: 150, rate: 2.4, ranged: true, melee: true, defender: true, courage: 1, person: true },
    knight: { hp: 30, attack: 9, speed: 16, melee: true, defender: true, courage: 2.2, person: true },
    hero: { hp: 26, attack: 8, range: 110, rate: 3.2, ranged: true, melee: true, defender: true, courage: 2.6, speed: 24, person: true },
    captain: { hp: 20, attack: 7, speed: 20, melee: true, defender: true, courage: 1.8, person: true },
    bandit: { hp: 11, attack: 4, speed: 24, melee: true, defender: true, courage: 0.9, person: true },
    goblin: { hp: 7, attack: 3, speed: 28, melee: true, defender: true, courage: 0.6, person: true },
    goblinArcher: { hp: 6, attack: 2, range: 120, rate: 2.6, ranged: true, defender: true, courage: 0.6, person: true },
    dwarfWarrior: { hp: 24, attack: 8, speed: 14, melee: true, defender: true, courage: 2.4, person: true },
    elfArcher: { hp: 12, attack: 4, range: 190, rate: 1.6, ranged: true, defender: true, courage: 1.6, person: true },
    ballista: { hp: 20, attack: 0, range: 190, rate: 4.5, ranged: true, defender: true, courage: 9 },
    villager: { hp: 5, speed: 16, civilian: true, person: true, courage: 0.3 },
    merchant: { hp: 5, speed: 14, civilian: true, person: true, courage: 0.4 },
    priest: { hp: 5, speed: 12, civilian: true, person: true, courage: 0.8 },
    noble: { hp: 6, speed: 14, civilian: true, person: true, courage: 0.6 },
    worker: { hp: 6, speed: 16, civilian: true, person: true, courage: 0.4 },
    sheep: { hp: 3, speed: 18, animal: true, courage: 0.1 },
    cow: { hp: 6, speed: 12, animal: true, courage: 0.2 },
    horse: { hp: 8, speed: 30, animal: true, courage: 0.3 },
    rivalDragon: { hp: 200, attack: 22, range: 120, rate: 3, ranged: true, melee: true, defender: true, courage: 9, speed: 18 },
    house: { building: true }, wagon: { building: true }, tent: { building: true }, tower: { building: true }, keep: { building: true }, granary: { building: true }, barn: { building: true }, stall: { building: true }, shrineB: { building: true },
  };
})();

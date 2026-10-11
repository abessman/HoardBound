# HoardBound — Design Document

*Working title: HoardBound. A dragon life simulator: hatch weak, steal, hoard, build, sleep through history, wake up legendary.*

This document records the design decisions agreed before the first full build. The original build brief
(`docs/BRIEF.md`) remains the specification for intent; where this document and the brief differ, this document
wins because it reflects later conversation.

## 1. Pillars

1. **Possessions are power.** The dragon's strength comes from what it holds in its cave, not an XP bar.
   Spending or losing treasure costs power immediately; age grows the body permanently.
2. **The world remembers.** Settlements, factions and named families record what the dragon did and respond
   with identifiable causes (escorts, vaults, hunters, tribute, guardians, grudges).
3. **Sleep is the defining choice.** Years pass, the dragon matures, civilisation develops, and the sleeping
   lair is vulnerable. Nothing resets.
4. **Discovery by flight.** The map is an enormous hand-drawn parchment that inks itself in as the dragon
   flies. A hatchling uncovers thin corridors; an ancient dragon uncovers provinces.
5. **Appearance is earned.** The dragon's look is a visible history: size from age, palette and horns from
   tyranny or benevolence, mutations from artifacts and treasure, scars from defeats.

## 2. Decisions from the design conversation

| Topic | Decision |
| --- | --- |
| Title | HoardBound |
| World shape | One finite continent plus overseas isles; enormous (default 200×200 leagues); seeded, different each world. Future expansions can add continents. |
| Geography tiers | **Regions** (≈12, spaced-capital names) → **subregions** (≈40 per region, named vales/moors/fells/woods) → **cells** (leagues). |
| Reveal | Vision radius grows with size tier. Unexplored land is hidden under cloud banks that roll back; cartography inks in behind them. Subregion names appear on first discovery; region names when enough of a region is known. |
| Gates | Region borders are storm walls, high mountain walls, or sea. Each region has a required size tier (home 0 → neighbours 1 → farther 2 → isles 3). Some artifacts lower the requirement. Inside a region, reach is limited only by stamina/range. |
| Rumours | Captives, stolen maps and books sketch far places in faint "uncharted" ink before the dragon can fly there. |
| Campaign length | Long. Many expeditions per age tier; 6–10+ sleeps from hatchling to ancient; hundreds of locations. |
| Raid control | Dragon auto-advances through a side-view scene; time drops to slow-motion when a new opportunity enters range; the player clicks a highlighted target or presses its hotkey/controller button; hold to speed, hover to wait. No twitch platforming. |
| Scenes vs cards | Full animated scenes: caravan, camp, castle, village/town/city, novice hero duel, battlefield, dragon duel. Illustrated decision cards: monastery/shrine, ruin, travel events, ransom, sleep events, keeper episodes, lair intrusions, petitioners. |
| Dragon on map | Small animated pixel sprite moving over the parchment with a soft shadow. |
| Dragon identity | Named at hatching. Breed colour chosen (red, green, black, gold, blue) — cosmetic plus a tiny flavour bonus. Breath is fire by default; artifacts can change breath colour/element. |
| Dragon appearance | 4 size tiers (hatchling, young, adult, ancient). Appearance layers: alignment axis (tyranny ↔ benevolence) shifts palette, eyes, horns and spines; artifacts add mutations (ember glow, stone plates, crystal growths, rune marks, crest/crown, frost breath); treasure-category thresholds add shimmer/crystals/claw blades; defeats add scars. Built from composable layers so hand-made art can replace them. |
| Tone | Tolkien geography and gravitas; brighter Zelda/Pokémon-like creature colours and readability. |
| Art pipeline | All pixel art generated in code from palette-indexed grids and procedural part drawing. The sprite registry accepts PNG+JSON overrides so real sprite sheets can replace generated ones later. |
| Platform | Browser now; everything renders to one `<canvas>` at a fixed 1280×720 virtual resolution with an in-canvas UI layer, so an Electron/Steam/console port does not depend on HTML widgets. Keyboard, mouse, gamepad from the start; touch via the same pointer code. |
| Fonts | IM Fell English / Italic / SC (OFL) bundled in `assets/fonts`, system serif fallback. |
| Endgame | Rival dragons in far regions and a final elder wyrm. Faction wars readable on the map and exploitable (depleted garrisons, battlefields, mercenary offers). |
| Factions | Human kingdoms (several), dwarven holds, elven realms, goblin/orc warbands, unclaimed wilds. |
| Seasons | Light: map tint and travel cost; winter slows caravans. |
| Death | **Legend** mode (default): raid defeat = injury, lost cargo, emergency return; slain while asleep ends the campaign with a chronicle. **Mythic** mode: being slain becomes a forced century-long slumber with a plundered lair. |
| Keeper | Optional (on by default): one or two illustrated care episodes per sleep that modify the same sleep simulation. Never a second RPG. |

## 3. Core loop

Explore → choose target → fly (visible, costs stamina, reveals) → raid / bargain / capture / retreat →
fly home with cargo → deposit (power recalculates) or spend (lair) → prepare sleep → years pass →
awaken older into a changed world → repeat.

## 4. World

### Generation
- Seeded. Elevation, moisture and temperature from layered gradient noise with a radial continent mask and a
  ragged coast; island blobs for isles.
- Terrain: water, plains, forest, pine forest, hills, mountains, peaks, swamp, desert, snow.
- Rivers flow downhill from highlands to sea; roads follow least-cost paths between settlements.
- Regions from ~12 seeds with terrain-weighted distance (mountains and water are barriers), so borders fall on
  natural walls. Subregions from ~40 seeds per region. Each gets a name in its faction's phonology and a
  flavour type (Vale, Moor, Fells, Wood, Marsh, Downs, Reach, Hollow…).
- Required tier per region = ring distance from the home region, capped at 3 (isles).
- Factions claim subregions by nearest capital with terrain cost. Dwarves favour mountains, elves deep forest,
  goblins swamps and badlands.
- Locations per subregion scale with land and faction: farms/hamlets, villages, towns, cities, castles,
  camps (bandit, hunter, military, goblin), mines, dwarven holds, monasteries/shrines, ruins, elven glades,
  towers, rival dragon lairs (far regions only).
- The home cave sits in hills in the home region with a guaranteed caravan road, camp, farm/village and a
  castle within young-dragon range.

### Knowledge
- Cells: unknown → revealed. Locations: unknown → seen (type and position) → scouted (wealth and defence
  estimates with a timestamp) → raided (exact). Estimates go stale across sleeps; the preview says "as of
  Year N" and marks uncertainty.

## 5. Dragon

### Stats
Permanent from age tier: size, base health, base stamina, base capacity, base breath, base bite, vision,
flight speed, available raid actions.

Possession bonuses from treasure stored at home (never from cargo), with diminishing returns per category:

| Category | Bonus |
| --- | --- |
| Gold & silver | Scale toughness (defence), health |
| Gems | Breath power, stamina |
| Ancient artifacts | Unique effects, mutations |
| Weapons & armour | Bite/claw, defence |
| Books & knowledge | Intel quality (estimate accuracy, reveal radius), ransom insight |
| Royal treasures | Prestige, dominance (ransom and tribute leverage) |

Formula shape: `bonus = cap * (1 - exp(-value / scale))` per category, plus flat artifact effects.

## 3b. The first valley: stories, heat, pursuit (0.7.0)

Agreed after the owner (and a second opinion from ChatGPT) found the early game a grind: rob without killing was
safe and optimal, and good play was a pay cut. The fix is *something you want next beyond the bar*, and a world
that answers.

- **Local situations** (`src/game/situations.js`): generated from real actors near the lair, one chosen per world
  (starts differ), more after long sleeps. Templates: *raided farm* (defend), *stolen tribute* (steal the chest
  and be hunted by the captain / kill the captain and return it for trust, a hidden ruin and a safe barn / parley
  for a seasonal cut that heats the realm and may talk), *taken envoy* (seize and free him for the Deepwarden's
  Seal and fee-less dwarves / ransom him for gold and dwarven hatred), *slayer's bounty* (ambush him for his purse
  and the Smoke-Glass / turn the paying villages by trust or fear / let him come). Each approach is listed on the
  Aims board with what it opens.
- **Capability treasures** open places: wind-gated crags (`L.flags.requires = 'wind'`), seal-gated vaults.
- **Heat** (`src/game/heat.js`, `f.dragon.heat`): thefts, fire and captives raise it; time and good deeds cool it.
  Calm → Wary (escorts) → Guarded (convoys; villages lock valuables away and post watchmen) → Hunting (a named
  party walks toward you; fight, flee, or pay mercenaries). Robbing outlaws cools it. Theft hurts a treasury that
  recovers; burning damages recovery itself.
- **Pursuit** replaces "kill witnesses": witnesses only add attention; riders follow a loud raid and, if you fly
  straight home, learn where you sleep (`learned.lairFound` raises sleep threats). Lose them by landing 8+ leagues
  away, waiting 6 days, or the Smoke-Glass.
- **Offerings** from trusting villages (trust ≥ 30, prosperous, unthreatened, within 30 leagues): seasonal while
  awake, yearly while asleep, shown as a range. Raiders may still ruin them while you sleep; your guards, loyal
  guardians and a protection pact raise their chance to hold.
- **Tuning from a headless robber bot**: always robbing and flying straight home reaches hoard strength 1 000 in
  ~10–18 trips but heats realms to Hunting, draws sworn hunters and usually fails the first growth sleep. The first
  sleep never kills (hunters who break in wake the hatchling to fight); later sleeps can.

## 3a. Goals and feedback (the opening cycle)

Agreed with the owner after the first playtest: systems alone did not give clear goals, understandable
consequences or satisfying milestones. At any moment the player should know **what they are trying to achieve,
how the next action helps, and what changed because of it**. Art waits until this loop works.

The opening is one cycle: *choose a useful target → make a consequential choice → bring home a meaningful
reward → see progress toward growth → prepare for sleep → awaken with a new capability and a visible world reaction.*

- **Milestone** (`src/game/goals.js`, map HUD panel under the status plaque, Aims board, lair status): "Become a
  young dragon — Hoard strength 240 / 1 000 · Age 3 / 8 — Next: …". The requirements are the real ones
  (`HB.TIERS`), what you carry is shown as pending until stored, and the board lists what growth unlocks (range,
  carry, breath, sight, the storm walls it opens, tribute, smashing, longer sleeps). The next step is concrete
  and changes with the situation (gather / fly home / reinforce the door / sleep N years).
- **Aims board** (G): concrete opportunities tagged by aim — *Grow stronger* (best haul for its danger, with the
  hoard-strength change), *Build trust* (villages under attack, captives to release, pacts, caravans to guard),
  *Build fear* (terrorise, tribute), *Secure your sleep* (only upgrades with a reason now), *Become known*
  (closest titles, with a target). Selecting one shows it on the map or opens the lair tab.
- **Good deeds are playable**: outlaw camps raid farms and villages (`L.threat`, one guaranteed at the start,
  visible from the cave); the **defend raid** (`templates.defend`, `raid.mode='defend'`) has raiders, stolen
  goods and a burning roof but no militia and nothing of the village's to take. Bite, burn, or roar to rout them;
  your fire still burns houses. Win when no raider is left; then choose to return or keep what you recovered.
  Rewards: village trust, realm trust, kinder name, the title Guardian of <place>, willing workers (no fee, lower
  wages) and a protection pact. Ignored threats sack the village (wealth, sometimes fire) and enrich the camp.
  Breaking the camp itself also spares its victims. Caravans can be robbed, **tolled** (needs the Road Thief or
  adulthood), **guarded** (trust, a small gift; three make you Warden of the Roads) or let pass.
- **Consequence summary** after every encounter (`src/game/consequences.js`, `ConsequenceScene`): a headline
  ("You robbed Stoneford's merchants."), what you carry and what it does once stored ("→ +2 defence. Hoard
  strength 240 → 425 of 1 000"), the place's change (poorer, burned, safe), each realm's fear/hostility/trust
  deltas and what it learned ("Caravans of X will ride with more guards"), "No trust gained" when none was,
  the shift in your name, title progress, wounds, and the next step. It reports; it does not moralise.
- **Renown** (`src/game/renown.js`): deeds earn named titles with real effects — the Road Thief (tolls),
  Guardian of <place> (willing workers, protection), the <Breed> Terror (fear ×1.5, tribute +15%), the Merciful
  (ransom acceptance +15%, trust ×1.5), the Castle-Thief and Bane of Heroes (+10 prestige; heroes come stronger),
  Warden of the Roads (merchants send gold each year), the Overlord (+10 dominance). The latest title shows with
  the name on the HUD; the Aims board shows who knows you and what each unearned name would change.
- **World reactions with causes** (`state.reactions`): every time a realm learns something, a title is earned, a
  pact or tribute starts, thieves rob you or a village you cared for is sacked, the reaction is logged with
  *why*. The awakening screen shows them ("How the world answered") plus **New capabilities** after growth.
- **Upgrades answer problems**: the Build tab lists upgrades with a reason first ("Thieves took the Ember Crown
  while you slept"; "Before you sleep: a hoard worth 1 196 draws thieves") and shows what the next level changes
  in the terms of the threat ("turns back 22% → 41% of thieves"). The sleep preview says what the door turns
  back and whether a theft before you come of age could stop the change.
- **Growth happens when you come of age during a sleep** (if the hoard can feed it then), so a theft in year 15
  of a 20-year sleep no longer undoes a change that happened in year 8. Hatchlings draw fewer, weaker burglars
  and fewer hunters unless they have made enemies.

### Age tiers (initial tuning)
| Tier | Age | Hoard energy needed | Vision | Capacity |
| --- | --- | --- | --- | --- |
| Hatchling | 0+ | — | 2.5 | 4 |
| Young | 8+ | 1 000 | 4.8 | 10 |
| Adult | 40+ | 6 000 | 7 | 25 |
| Ancient | 150+ | 30 000 | 11 | 60 |

(Raised from 400 / 3 000 / 20 000 so the first milestone takes roughly ten expeditions; "hoard energy" is shown
to the player as **hoard strength**.)

Sleeping with too little hoard energy heals and ages but does not advance the tier ("restless sleep").

### Alignment
`alignment` runs −100 (tyranny) … +100 (benevolence). Burning communities, enslaving, breaking ransom
bargains and killing captives push negative; protecting, fair bargains, releasing captives and honest tribute
push positive. It changes appearance and how factions interpret the dragon (fear vs trust gains).

## 6. Raids

Side-view pixel scene (320×180 logical, 4× scale). Meters: health, stamina (also breath), cargo, alarm.

Actions (shown only when relevant): swoop & grab, breathe fire, bite/claw, land & smash (adult+), roar,
wait/pass, capture, feed, withdraw. Alarm rises with time and noise: bells → militia → archers → ballista →
knights/hero. Alarm changes what is on screen. Withdraw is always available; pursuit depends on alarm.

Templates: caravan (exposed chest → guarded wagons), camp (sleepers → organised survivors), castle (exposed
tower goblet → vault/noble captive deeper), village/town/city (livestock → granary → treasury), novice hero
duel, battlefield (loot between armies), dragon duel (rival lair). Defences scale from faction learning and
resources, never from the dragon's age alone.

## 7. Lair

Pixel cutaway that grows with chambers. Upgrades: treasure chamber, reinforced entrance, concealed approach,
traps, guard post, sleeping chamber, magical ward, forge, larder. Each shows cost, resulting balance, stat
change and which risk it mitigates. Construction progresses over active days or sleep years.

Workers: dwarves (excavate, fortify), goblins (scavenge, crude defences), human engineers (traps,
mechanisms). Paid workers cost gold and stay loyal; enslaved workers are free but build unrest → sabotage,
escape, revolt and faction attention. Captives for ransom and workers for labour are separate roles.

## 8. Ransom and tribute

Captives occupy cargo. At home: demand gold, a treasure, livestock or a concession; see likely range,
family/faction and risks (delay, refusal, deception, rescue). Each captive resolves once. Paying families
resent; release builds trust. Strong, feared dragons can demand yearly tribute from a settlement's real
wealth; it lapses under new rulers or poverty. Protected prosperous settlements can pay willingly and
produce hereditary guardians.

## 9. Sleep

Durations: season nap, 5, 20, 50 years; adult adds 100, ancient 200. Prep panel shows expected growth,
healing, upkeep, defence readiness, worker stability and threat estimate. Per-year simulation: construction,
loyalty, settlements develop, rulers change, wars progress, tribute, thieves (targeted or plunder), hunters
(slaying attempts) resolved against defences; warnings allow voluntary interruption; a breach of the sleeping
chamber forces waking. Awakening screen compares before/after and reopens the same world.

## 10. World simulation

Settlement tiers rise and fall with wealth and safety; destroyed places recover slowly or are abandoned to
ruins. Faction memory (fear, hostility, trust) drives escorts, vaults, rescue efforts, hunter funding, route
shifts, petitioners, tribute and guardians. Named grudge and loyalty chains persist across years (a survivor
becomes a hunter; a hunter's students found an order; a protected family becomes guardians). Wars between
adjacent factions move borders, send armies that deplete garrisons, create battlefields and mercenary
offers. Rival dragons raid and hoard in far regions; the elder wyrm is the final duel. Legend status at
ancient tier with high prestige (or the elder wyrm slain) ends the chronicle with a legend; play continues.

## 11. Architecture

- Plain JavaScript, classic `<script>` tags in load order, one global namespace `HB`. Works from `file://`,
  a static server, or GitHub Pages. No build step, no backend, no API keys.
- One `<canvas>` at a fixed 1280×720 virtual resolution, letterboxed. All UI is drawn in-canvas by
  `src/core/ui.js` with keyboard/gamepad focus navigation and pointer support.
- Pixel scenes render to 320×180 offscreen buffers and scale 4× with nearest-neighbour.
- Authoritative campaign state in `HB.state`; views read it, systems mutate it through functions in
  `src/game/*`. Explicit phases: `home, planning, traveling, encounter, returning, sleeping, awakening`.
- Two RNG streams: `worldRng` (generation, reproducible from the seed) and `playRng` (outcomes, advancing).
- Logic modules never touch the DOM at load time, so Node can load them for headless simulation tests
  (`tools/headless-test.js`).
- Data (treasures, upgrades, workers, encounter templates, events) lives in `src/data/*` as editable tables.

```
index.html            entry; script load order
assets/fonts/         bundled OFL fonts
src/core/             namespace, rng, noise, math, input, audio, ui, text, loop, save
src/art/              palette, pixel helpers + sprite registry, sprites, dragon, mapart, parchment
src/world/            names, worldgen, world (fog/knowledge), factions, settlements, entities, history
src/game/             state, stats, hoard, lair, ransom, tribute, travel, sleep, keeper, events, raid/
src/views/            title, newgame, map, raid, card, lair, sleep, awaken, chronicle, hud, menus
src/data/             treasures, upgrades, workers, encounters, events, names
tools/                screenshot.mjs (Playwright), headless-test.js (Node)
docs/                 BRIEF.md (original brief), FEATURE_STATUS.md
```

### Replacing generated art
Sprites are registered by id in `HB.sprites`. Drop a PNG sheet and a JSON atlas (`{ "id": {x,y,w,h,
anchorX, anchorY} }`) into `assets/sprites/` and list them in `assets/sprites/manifest.json`; matching ids
override generated sprites at load. Dragon layers are keyed `dragon.<tier>.<part>.<pose>` and can be
overridden the same way.

## 12. Controls

Mouse/touch: click or tap targets and buttons; drag to pan the map; wheel or pinch to zoom.
Keyboard: arrows/WASD move the map cursor or focus; Enter/Space confirm; Esc back/menu; 1–9 raid actions;
Shift speed; P pause; H home/lair; C chronicle; F factions.
Gamepad: left stick move/focus; A confirm; B back; X action menu; Y lair; RB speed; Start menu.

## 13. Status

See `docs/FEATURE_STATUS.md` for what is functional, simplified and deferred in the current build, and `README.md`
for launching, controls, tools and how to continue development.

## 14. Deferred / future
Separate child-Keeper exploration, deep dynastic politics, dream worlds, autonomous servant societies,
multiplayer, additional continents (expansion hook exists in region tiers), real sound design beyond
synthesized SFX.

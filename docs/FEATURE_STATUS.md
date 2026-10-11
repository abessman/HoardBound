# Feature status

Honest accounting against the brief (`docs/BRIEF.md`) and the design conversation (`../DESIGN.md`).
**Functional** = implemented and exercised by `tools/test.js` or `tools/playthrough.mjs`. **Simplified** = works but shallower than the long-term intent. **Deferred** = not built; where it would go.

## Core loop

| Requirement | Status | Notes |
| --- | --- | --- |
| Hatch weak in a small cave | Functional | Tier 0 stats, 4 cargo, 2.6 sight; intro explains where to go, what to avoid, how to get home. |
| Seeded world, limited visibility, reachable openings | Functional | 200×200 world, ~800 locations, guaranteed camp/farm-or-village/castle near home; fog as cloud banks; rumours sketch faint terrain. |
| Inspect target wealth, defences, distance, uncertainty | Functional | Preview fuzzes estimates by intel; shows "as of Year N"; explains *why* a place is dangerous. |
| Visible travel costing time and stamina, revealing terrain | Functional | Straight-line flight in world coordinates, days pass, stamina by terrain/load/season/injury, pause/speed/turn-back, divert by selecting another target, roost when exhausted, road events (8 kinds). |
| Animated side-view raids with choices | Functional | 320×180 pixel scene, auto-advance with slow-motion opportunities, 9 action kinds, alarm with staged escalations, projectiles, fire, capture, feed. |
| Retreat, carry loot, deposit at home | Functional | Cargo capacity enforced; loot merges once; deposit recalculates stats and shows deltas. |
| Power from possessed treasure | Functional | Six categories with diminishing returns; artifacts with effects and visible mutations; spending/theft removes bonuses; age stats separate. |
| Spend on workers and lair with visible trade-offs | Functional | Cost, resulting balance, stat change and build time shown before purchase. |
| Multi-year sleep | Functional | Season, 5, 20, 50, 100, 200 years (gated by tier); legible preview of growth, wages, defences, threat likelihood. |
| World development and lair risks during sleep | Functional | Settlements grow/decline/burn/abandon/ruin; rulers change; wars; thieves (targeted or plunder); hunters with warning, sleeping-chamber breach, slaying; keeper episodes. |
| Awaken into the same changed world | Functional | Before/after summary: body, hoard gains/losses, finished upgrades, settlement changes, faction mood shifts, key events. |

## Encounters and travel

| Requirement | Status | Notes |
| --- | --- | --- |
| Caravan: easy chest, dangerous second wagon | Functional | Moving caravans on roads; escorts grow with faction learning. |
| Camp rewards timing/isolation | Functional | Sleepers; waking at alarm 25; isolated-bite rule. |
| Castle quick theft without conquest | Functional | Parapet goblet reachable by a hatchling; vault needs an adult to smash; ballista manned at alarm 40. |
| Novice hero | Functional | Wandering heroes on roads; lance variant; survivors become named hunters. |
| Village / monastery / ruin scenarios | Functional | Village/town/city scene (granary famine, barred treasury); monastery, shrine, ruin, tower, glade, hold as decision cards. |
| Animation reflects actions; alarm brings threats | Functional | Swoop, breath flame, roar rings, fire particles; escalation spawns militia/archers/knights/champion. |
| Cargo limits loot and captives | Functional | |
| Return journey consequences; drop loot | Functional | Load raises stamina cost; pursuit volley on withdrawal; a "Too Heavy to Outrun Them" road event offers dropping a third of the cargo when riders follow a burdened dragon. |
| Travel pause / accelerate / divert / turn back | Functional | |

## Economy and lair

| Requirement | Status | Notes |
| --- | --- | --- |
| Treasure categories with understandable bonuses | Functional | Shown in the Hoard tab with live numbers. |
| Named artifacts with identity, source, effect | Functional | 24 artifacts placed across the world; effects and lore shown; stolen artifacts travel to a named place and can be recovered. |
| Spending/losing removes bonus; age separate | Functional | |
| Paid vs enslaved workers | Functional | Wages, loyalty, quitting, pilfering goblins; enslaved: sabotage, escape, revolt, faction hostility. |
| Upgrades improve cave and defence outcomes | Functional | 10 upgrades; values feed thief/hunter resolution; cutaway shows them. |
| Ransom captures occupy cargo, resolve once | Functional | Five demand types; refusal, stalling, short-weighted chest, rescue attempt. |
| Destruction reduces wealth; tribute consumes real resources | Functional | Granary famine; burned state; tribute drawn from settlement wealth, lapses on poverty/new ruler/lost fear. |

## Sleep and world history

| Requirement | Status | Notes |
| --- | --- | --- |
| Sleep legible before commitment | Functional | |
| Construction and healing over sleep | Functional | |
| Theft and slaying affected by defences and behaviour | Functional | |
| Interrupting ≠ completing | Functional | Voluntary wake, keeper-requested wake, forced wake (breach), completed. Growth needs an unbroken sleep. |
| Size/abilities/range change with maturation | Functional | Four tiers; land & smash at adult; sleep limits per tier. |
| Settlements develop, decline, change ownership | Functional | Tier up/down, abandonment → ruin, war flips subregions and their settlements. |
| Factions respond to repeated behaviour | Functional | Escorts, vaults, rescue, hunters funded; fear/hostility/trust with decay. |
| Grudge / loyalty chains | Functional | Named survivors become hunters (lead slaying attempts, appear on roads after sleeps); slain heroes found orders; released captives' houses send gifts and warnings; protected settlements become guardians. |
| Awakening summarises changes | Functional | |

## Optional Keeper

| Requirement | Status |
| --- | --- |
| Small care episodes sharing campaign state | Functional — 6 episode types, 1–2 per sleep, toggle in settings/new game. |
| Keeper actions protect/care | Functional |
| Episodes advance time, no chores | Functional |
| Not a separate RPG | Yes |

## Reliability and delivery

| Requirement | Status | Notes |
| --- | --- | --- |
| No duplicate loot / ransom / stale actions | Functional | Tested headless. |
| No stamina or defeat softlock | Functional | Roosting restores stamina; defeat grants stamina to crawl home. |
| Pause / fast-forward consistent | Functional | |
| Save/load | Functional | Static world regenerated from seed; mutable state stored; export/import file. |
| Controls and goals explained in-game | Functional | Intro pages, tooltips, HUD hints. |
| Runnable build and source | Yes | Plain scripts; no build. |

## Beyond the brief (from the design conversation)

- Hand-drawn parchment map with cloud fog, storm walls at gated regions, rumours — functional.
- Enormous world with regions/subregions revealed incrementally; vision grows by tier — functional.
- Dragon appearance from alignment, artifacts, treasure thresholds and scars — functional (generated art; override hook for real sprites).
- Faction wars with fronts, marching armies that deplete garrisons, battlefields to loot, mercenary contracts — functional (armies are abstract markers; sieges reduce wealth).
- Rival dragons raiding the world; duel scene; elder wyrm legend ending — functional but lightly tested (duel balance is rough).
- Gamepad and touch — functional via the UI toolkit's focus navigation and pointer events; not hand-tested on hardware.
- Audio — synthesised effects with mute; no music.

## Simplified or deferred

- **Seasons** affect travel cost only (winter); no visual seasons on the map.
- **Armies** do not move day by day; they jump along their march each year and besiege abstractly.
- **Rival dragon lairs** cannot be looted without the duel; rivals never attack the player's lair directly (hunters do).
- **Dragon sprite art** is procedural and plain; the user intends to replace it. The title screen uses an ink drawing.
- **Hero lineages / orders** influence sleep attacks and road hunters but have no scenes of their own.
- **Mythic death mode** skips a century with a plundered lair; it does not simulate those years in detail.
- **Multiple continents / expansions**: region tiers and isles exist; nothing beyond the one continent.
- **Performance**: the whole-continent zoom (hundreds of chunks) runs at ~35–60 fps in headless Chromium; a persistent low-res overview canvas would make it cheaper.

## Known rough edges

- Raid balance is first-pass: castles are deadly to hatchlings who linger (by design), but town watchmen may still be too strong early.
- Labels can crowd at mid zoom in dense kingdoms.
- The wandering-hero duel uses the generic scene with a campfire; it needs more distinct staging.
- No hand testing on physical gamepads or touch screens yet.

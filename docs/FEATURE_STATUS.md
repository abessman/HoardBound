# Feature status

How each part works is in `docs/systems/`; this file is only the status. Honest accounting against the brief (`docs/BRIEF.md`) and the design conversation (`../DESIGN.md`).
**Functional** = implemented and exercised by `tools/test.js` or `tools/playthrough.mjs`. **Simplified** = works but shallower than the long-term intent. **Deferred** = not built; where it would go.

## Core loop

| Requirement | Status | Notes |
| --- | --- | --- |
| Hatch weak in a small cave | Functional | Tier 0 stats, 4 cargo, 2.6 sight; intro explains where to go, what to avoid, how to get home. |
| Seeded world, limited visibility, reachable openings | Functional | 200×200 world, ~800 locations; at hatching the nearest farm/village, camp and castle are glimpsed and places within 10 leagues are rumoured (dotted ? marks you can fly to); tap anywhere to fly there and chart the land along the path; rest in the wild to recover stamina. |
| Inspect target wealth, defences, distance, uncertainty | Functional | Preview fuzzes estimates by intel; shows "as of Year N"; explains *why* a place is dangerous. |
| Visible travel costing time and stamina, revealing terrain | Functional | Straight-line flight in world coordinates, days pass, stamina by terrain/load/season/injury, pause/speed/turn-back, divert by selecting another target, roost when exhausted, road events (8 kinds). |
| Animated side-view raids with choices | Functional | 320×180 pixel scene, auto-advance with slow-motion opportunities, 9 action kinds, alarm with staged escalations, projectiles, fire, capture, feed. |
| Retreat, carry loot, deposit at home | Functional | Cargo capacity enforced; loot merges once; deposit recalculates stats and shows deltas. |
| Power from possessed treasure | Functional | Six categories with diminishing returns; artifacts with effects and visible mutations; spending/theft removes bonuses; age stats separate. |
| Spend on workers and lair with visible trade-offs | Functional | Cost, resulting balance, stat change and build time shown before purchase. |
| Multi-year sleep | Functional | Season, 5, 20, 50, 100, 200 years (gated by tier); legible preview of growth, wages, defences, what the door turns back, threat likelihood, and whether a theft could stop growth. |
| World development and lair risks during sleep | Functional | Settlements grow/decline/burn/abandon/ruin; rulers change; wars; thieves (targeted or plunder); hunters with warning, sleeping-chamber breach, slaying; keeper episodes. |
| Awaken into the same changed world | Functional | Before/after summary: body, hoard gains/losses, finished upgrades, settlement changes, faction mood shifts, key events. |

## Goals, consequences and milestones (the opening cycle)

| Requirement | Status | Notes |
| --- | --- | --- |
| Visible first milestone with real requirements | Functional | "Become a young dragon": hoard strength x / 1 000 and age x / 8 on the map HUD, the Aims board and the lair; carried treasure shows as pending; the next step changes with the situation; what growth unlocks is listed. |
| Expeditions as purposeful choices | Functional | Aims board (G): opportunities tagged Grow stronger / Build trust / Build fear / Secure your sleep / Become known, each with what it yields; tap to find it on the map or open the lair tab. |
| Playable good deeds | Functional | Outlaw raids on farms and villages (one at the start, more over time; ignored ones sack the place); animated defend raid; return or keep recovered goods; guard caravans; release captives; protection pacts. Rewards: trust, willing workers, gifts, titles. |
| Consequence summary after every encounter | Functional | Raids, defends, cards, tolls, escorts, tribute and protection: headline, loot and its stored-at-home effect, place and realm changes, what realms learned, "No trust gained", name shift, title progress, wounds, next step. |
| Renown with identity and effects | Functional | Eight titles from deeds (Road Thief, Guardian of <place>, the <Breed> Terror, the Merciful, Castle-Thief, Bane of Heroes, Warden of the Roads, Overlord), each with a real mechanical effect; latest title shown with the name; who knows you; names still to earn. |
| World reactions with causes | Functional | Logged when realms learn, titles are earned, pacts/tribute start, thieves strike, cared-for villages fall; shown on the Aims board and on waking. |
| Upgrades tied to problems | Functional | Build tab sorts upgrades with a reason first and shows thief/hunter turn-back chances before and after; sleep preview shows what the door turns back and whether a theft could stop growth. |
| Awaken with new capabilities | Functional | Growth happens in the year you come of age during a sleep; the awakening lists new capabilities, world reactions with causes, and the next goal. |

## The first valley (0.7.0)

| Requirement | Status | Notes |
| --- | --- | --- |
| Different starts | Functional | Four opening templates generated from nearby actors; seeded choice per world; tested across seeds. |
| Something to want beyond gold | Functional | Capability treasures (wind charm, dwarven seal, smoke-glass) open crags, vaults and escapes. |
| Choices that change the future | Functional | Each story's approaches lead to different follow-ups (a hunting captain, a patron's hidden ruin and barn, a seasonal outlaw cut, a slayer who warns you). |
| Realms push back while you are awake | Functional | Heat steps with visible effects; named hunting parties on the map; ambush card (fight / flee / pay). |
| Pursuit and escape | Functional | Riders follow loud raids; flying home reveals the lair; lose them by distance, time or the Smoke-Glass. |
| Good-path income that is not a sleep machine | Functional | Offerings depend on trust, prosperity and safety; ranges shown; raids during sleep can ruin them. |
| Escort ambush scene | Functional | Guarding a caravan can become an animated defence. |

## The domain (0.8.0)

| Requirement | Status | Notes |
| --- | --- | --- |
| People build around the dragon | Functional | Once young: a refuge (trusted) or coerced camp (feared) at the hill, growing through four stages each (castle and sanctuary / dark stronghold) with years, members and lair upgrades; drawn beside the lair; Lair → Domain tab. |
| Influence shown as territory | Functional | Wash over the lands your rule reaches with a dotted edge and a key; toggle with *Territory* (T); colour by kind or feared rule. Influence is reach, not loyalty. |
| Settlement statuses | Functional | Protected, allied, tributary, occupied, resisting, ruined; shown in the preview, on arrival cards and as pennants. Undead: deferred. |
| Spread, convert, subjugate, destroy | Functional | Take oaths, help rebuild, occupy (inside influence), crush or ease resistance, raze; broken promises cost trust everywhere you protect. |
| Allegiance can weaken | Functional | Resistance grows yearly and ends in revolt and freedom; allies lapse when trust falls; a cruel home revolts; a home turns with your deeds. |
| Map changes with your rule | Functional | Burned and bare forests, jagged ash-dark mountains, ash near a tyrant; fuller groves and fields near a protector; strongest near the lair. |
| Sleep advances the domain | Functional | Growth, gifts, unrest, resistance, oaths during sleep; shown in the sleep preview and the awakening. |
| Endgames (lieutenants, crystals) | Simplified | 0.9.0 prototype: see the next table. |

## The great struggle (0.9.0, prototype)

| Requirement | Status | Notes |
| --- | --- | --- |
| One opposition per world, formed by your path | Functional | At adult with a leaning rule; fixed afterwards; foreshadowed at 25; announced with a card. |
| Kind path: an ancient evil and three lieutenants | Simplified | Hollow King, fortress and three strongholds placed and named; the Warlord is playable (hosts strike your allies; warcamp raid with a boss; real effects when he dies). Sorcerer, Blightmother and the final battle: described, not playable. |
| Cruel path: six Crystals of Life | Simplified | Six sanctuaries in different realms; Greenmarrow is playable (warded crystal, guardian boss, realm withers, map blight, hoard treasure with an effect). Five others and the god's challenge: described, not playable. |
| Allies matter to the struggle | Simplified | Allied scouts put warcamp guards to sleep; hosts target the places that trust you. No soldiers in the last battle yet. |
| Test starts for the later game | Functional | `?scene=map&preset=adult-kind` (and adult-cruel, young-kind, young-cruel); saved to a separate test slot. |

## Encounters and travel

| Requirement | Status | Notes |
| --- | --- | --- |
| Caravan: easy chest, dangerous second wagon | Functional | Moving caravans on roads; escorts grow with faction learning. On arrival: rob, demand a toll (Road Thief or adult), guard it for its realm's trust, or let it pass. |
| Camp rewards timing/isolation | Functional | Sleepers; waking at alarm 25; isolated-bite rule. |
| Castle quick theft without conquest | Functional | Parapet goblet reachable by a hatchling; vault needs an adult to smash; ballista manned at alarm 40. |
| Novice hero | Functional | Wandering heroes on roads; lance variant; survivors become named hunters; hunting parties and slayers fight in the same scene. |
| Village / monastery / ruin scenarios | Functional | Village/town/city scene (granary famine, barred treasury); defend scene for villages under outlaw attack; monastery, shrine, ruin, tower, glade, hold as decision cards (loot bounded by the place's wealth). |
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
| Upgrades improve cave and defence outcomes | Functional | 10 upgrades; values feed thief/hunter resolution; cutaway shows them. The treasure chamber holds treasure by bulk (100 coins per space, items by size), not value; whatever does not fit is easier for thieves to take. Value shows separately: the pile shifts from copper goods to gold to gem-studded with value per space, shows what it is made of (swords, books, chalices, sacks), and lights the cave in proportion to total worth; a trophy wall displays the most prized pieces (tap for details) and the dragon wears or guards its best one. The Strongroom locks the top 3/8/20 treasures away; thieves take whatever is worth most for its size, coin included, and never what is locked. |
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
- Opening pacing (tested by a headless bot): about 10–18 short expeditions to reach hoard strength 1 000; with a reinforced entrance, three of four seeds grew in the first 20-year sleep. Thieves can still undo an unprotected first sleep, which the preview now warns about.
- Story templates are few (four) and their scenes reuse the camp, hero and defend layouts; more templates and a seasonal calendar (tax convoy, harvest, pilgrims, winter) are next.
- Hunting parties walk straight toward you and ignore terrain; they vanish over a long sleep (sworn ones live on as grudges).
- Opportunity ranking is heuristic: it prefers reachable hauls with low risk and can suggest small farms repeatedly.
- Labels can crowd at mid zoom in dense kingdoms.
- The wandering-hero duel uses the generic scene with a campfire; it needs more distinct staging.
- No hand testing on physical gamepads or touch screens yet.
- Domain numbers (stage years, gold, unrest, resistance) are first guesses; influence by land can feel large.
- Endgame boss strength is tuned only with a simple bot; host frequency is a first guess.

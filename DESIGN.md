# HoardBound — Design Document

*Working title: HoardBound. A dragon life simulator: hatch weak, steal, hoard, build, sleep through history, wake up legendary.*

This document records the design decisions agreed with the owner: the pillars, the decisions table and the core
loop. How each part of the game works (rules, numbers, code, tests) lives in `docs/systems/`. The original build
brief (`docs/BRIEF.md`) remains the specification for intent; where this document and the brief differ, this
document wins because it reflects later conversation.

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
| Fonts | Alegreya / Alegreya SC for reading text; IM Fell English SC only for big titles and map region names (the owner found IM Fell hard to read small). Bundled in `assets/fonts` (OFL). |
| Endgame | Rival dragons in far regions and a final elder wyrm. Faction wars readable on the map and exploitable (depleted garrisons, battlefields, mercenary offers). |
| Factions | Human kingdoms (several), dwarven holds, elven realms, goblin/orc warbands, unclaimed wilds. |
| Seasons | Light: map tint and travel cost; winter slows caravans. |
| Death | **Legend** mode (default): raid defeat = injury, lost cargo, emergency return; slain while asleep ends the campaign with a chronicle. **Mythic** mode: being slain becomes a forced century-long slumber with a plundered lair. |
| Keeper | Optional (on by default): one or two illustrated care episodes per sleep that modify the same sleep simulation. Never a second RPG. |

## 3. Core loop

Explore → choose target → fly (visible, costs stamina, reveals) → raid / bargain / capture / retreat →
fly home with cargo → deposit (power recalculates) or spend (lair) → prepare sleep → years pass →
awaken older into a changed world → repeat.

## 4. Later decisions (design history)

| Version | Decision | Where it lives now |
| --- | --- | --- |
| 0.4 | Tap anywhere to explore; rumoured places; readable fonts | [map-and-exploration](docs/systems/map-and-exploration.md) |
| 0.4–0.5 | Treasure takes room by bulk, not value; value shown apart from size; Strongroom | [lair-and-economy](docs/systems/lair-and-economy.md) |
| 0.6 | Goals first: visible milestone, Aims board, playable good deeds, consequence summaries, renown with effects, upgrades tied to problems, growth when you come of age | [goals-stories-renown](docs/systems/goals-stories-renown.md), [sleep-and-growth](docs/systems/sleep-and-growth.md) |
| 0.6 | Young dragon needs hoard strength 1 000 (adult 6 000, ancient 30 000) | [sleep-and-growth](docs/systems/sleep-and-growth.md) |
| 0.7 | Different starts: generated local stories with capability treasures; good pays out over time, evil is fast but answered | [goals-stories-renown](docs/systems/goals-stories-renown.md) |
| 0.7 | Heat steps and hunting parties; pursuit instead of "kill witnesses" (from a ChatGPT review); offerings that depend on prosperity and protection; the first sleep never kills | [realms-and-memory](docs/systems/realms-and-memory.md), [travel](docs/systems/travel.md), [sleep-and-growth](docs/systems/sleep-and-growth.md) |
| 0.7.1 | Docs split: root CLAUDE.md as a map, folder CLAUDE.md files, one doc per system, `next_chat_kickoff.md` | [CLAUDE.md](CLAUDE.md) |

Ideas not built yet: [domain and endgame](docs/ideas/domain-and-endgame.md).

## 5. Where the details are

| Part of the game | Doc |
| --- | --- |
| World generation, fog, rumours, storm walls, the map | [map-and-exploration](docs/systems/map-and-exploration.md) |
| Flight, stamina, events, pursuit | [travel](docs/systems/travel.md) |
| Raids, defend and ambush scenes, cards, arrivals | [raids-and-encounters](docs/systems/raids-and-encounters.md) |
| Treasure as power, hoard, lair, workers, ransom, tribute, offerings | [lair-and-economy](docs/systems/lair-and-economy.md) |
| Tiers, sleep, thieves, hunters, keeper, awakening | [sleep-and-growth](docs/systems/sleep-and-growth.md) |
| Milestone, Aims, stories, summaries, titles, reactions | [goals-stories-renown](docs/systems/goals-stories-renown.md) |
| Factions, heat, hunters, grudges, wars, rivals, alignment | [realms-and-memory](docs/systems/realms-and-memory.md) |
| Generated art, dragon look, sprite replacement | [art-and-sprites](docs/systems/art-and-sprites.md) |

What works, what is simplified and what is deferred: [FEATURE_STATUS](docs/FEATURE_STATUS.md). Controls and how to
play: [README](README.md). Technical rules: [CLAUDE.md](CLAUDE.md).

## 6. Deferred / future
Separate child-Keeper exploration, deep dynastic politics, dream worlds, autonomous servant societies,
multiplayer, additional continents (expansion hook exists in region tiers), real sound design beyond
synthesized SFX.

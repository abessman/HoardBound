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
| The map in 3D (test view) | Simplified | 0.23: Settings → 3D map test: tilted parchment (WebGL ground from the live chunk drawing), standing symbols facing the camera, turning, tilt flattening with zoom, overview; no wash, travel or tapping yet ([idea](ideas/map-3d.md)). |
| Ink on paper while panning | Functional | 0.21: the parchment moves and scales with the map, so the drawing no longer floats over a still paper. |
| Symbols grouped like an old map | Functional | 0.25: mountain chains along crests with flanks, foothills and open paper; dense forests with clear edges; hill clumps. Tuning by eye; the owner compares with the Tolkien map. |
| Mountain variety and legendary peaks | Functional | 0.20: small, regular and large mountains, small ones usually round the large; one legendary peak per region, a landmark about three cells across (its own art, `map.landmark.peak`). What it does in play is deferred ([idea](ideas/landmarks.md)). |
| Map changes with your rule | Functional | Burned and bare forests, jagged ash-dark mountains, ash near a tyrant; fuller groves and fields near a protector; strongest near the lair. |
| Territory by life phase (0.11) | Functional | A watercolour wash that bleeds in: a little colour around a hatchling's lair, growing with the hoard; wider at each phase; lobes around the places that serve you; never beyond the home region. |
| Devoted camps → village → castle (0.11) | Functional | Young: pilgrims' or cult camps around the hill; adult: a village, then a town; ancient: a castle and sanctuary or a dark stronghold. Gifts from the hoard speed it; recruit its people. |
| Offerings once your lair is found (0.11) | Functional | From young, when hunters, thieves or riders found the lair (or people live by it): places that trust or fear you bring gifts; more as an adult. |
| Places in your territory answer you (0.11) | Functional | Young: ask for news, accept hospitality or demand a feast. Adult: oaths, castle fealty and occupation, only inside your territory and home region. |
| Reputation tracker (0.11) | Functional | Reputation (F): your name and titles, benevolence, who speaks of you, who knows your lair, loyalties; each realm's fear, trust, hostility and heat. |
| Grievance ledger, nemesis-like (0.11) | Functional | Everyone sworn against you with cause, place and story; hunters who survive you grow stronger with epithets and lead hunts on your lair; weregild ends a family's, a betrayed village's or a rebel's grudge. |
| Castle politics: lordships and feuds you can join | Deferred | Next update ([ideas](ideas/castle-politics.md)). |
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
| Debug tools | Functional | Menu → Debug tools: infinite gold, invincible, endless stamina, safe sleep, instant building; grow, age, benevolence, settlement, struggle, reveal, calm. Marked on the map and in the chronicle. |

## Map art (0.10.0)

| Requirement | Status | Notes |
| --- | --- | --- |
| Map symbols replaceable by PNG art, partial packs | Functional | Semantic ids for every terrain glyph, place and state, home stage, pennant, moving piece, seal, fog and the compass; procedural fallback for anything missing, broken or loading; Settings → Map art or `?mappack=`; works from `file://`. |
| Stable variants, resolution independence, states | Functional | Variant from the symbol's stable key; footprint from `logicalSize`; exact state → base → hand-drawn, with smoke or fade when art lacks the state. |
| Handoff package for an artist | Functional | `docs/map-art/`: measured catalog, contact sheets, art spec, replacement steps, implementation summary; `sample` and `test-broken` packs; validator and exporter. |
| Map preview scene | Functional | `?scene=mappreview` (fixed seed and camera, every domain state, `&chunks=1`). |
| Roads, rivers, coasts and washes as art | Simplified | Stay procedural so they join; restylable via a pack's `style` (0.12: the territory wash also takes textures and bloom masks from a pack). Parchment, labels and selection are not in packs. |
| Illustrated map artwork | Functional | 0.15: 39 illustrations, 96 manifest ids and 23 dynamic ink details cover all declared glyph families/states, including mines, carts, home stages and damage. Save-free art catalog; original art selectable. Physical iPad review pending. |

## Watercolour (0.12.0; reveal wash 0.13.0)

| Requirement | Status | Notes |
| --- | --- | --- |
| Territory as watercolour, tied to real state | Functional | `HB.mapWash` paints the live map's territory from `HB.domain.influence` sources; kind green/gold, cruel rust/charcoal, neutral sepia; blooms from what changed (a place joining or occupied, growth, a recolour); repaint spread over frames. |
| Newly explored land washes in | Functional | 0.13: the fog's paper over newly revealed cells dissolves along a soft irregular edge bleeding outward from the dragon, with a thin warm wash at the wet edge that dries away; clouds still mark the unknown; works with any symbol art (`HB.mapReveal`). Far views (zoom < 0.8) fade cell by cell. |
| Ink discovery (drops draining into the symbols) | Removed | Built in 0.12 for the preview only; dropped in 0.13 for the simpler reveal wash. Packs' `inkMask` / `revealMask` fields are ignored. |
| Watercolour contract for finished art | Functional | `docs/map-art/WASH.md`: the reveal wash needs no assets; territory coverage/pooling/hue textures and bloom order masks, validated by `tools/mappack.js`; placeholders in the sample pack. |
| Reduced motion for map effects | Functional | Settings → Reduce motion or `?reducedmotion=1`: revealed land and the territory fade in (0.3 s) without spreading or tint. |
| Finished watercolour textures | Deferred | Placeholder textures only; an artist's PNGs drop into a pack. |

## Lair views (0.17.0)

| Requirement | Status | Notes |
| --- | --- | --- |
| A large, detailed view of the dragon at home | Functional | The hoard close-up: the dragon at twice raid size perched on its generated hoard, idling (4 frames); trophy alcoves, torches, light shaft, workers; the chamber grows grander by level. |
| Sleeping on the hoard | Functional | The same chamber with the dragon asleep on its hoard, in the lair while it sleeps and on the sleep screen. |
| The lair zoomed out to every room | Functional | A cross-section of the hill: a room per upgrade (built by level, being dug with %, or dotted where it could be dug), passages, cells while holding captives; tap a room to open it in Build. |
| Final lair art and how upgrades look | Deferred | Generated placeholders; the owner will redraw them in the editor (Lair · dragon, Lair · places) and decide how upgrades should look. |

## Pixel editor (0.16.0)

| Requirement | Status | Notes |
| --- | --- | --- |
| Draw the game's pixel art in the browser | Functional | `editor/` ([guide](pixel-editor.md)): every dragon tier and pose with its frames, raid people, animals, treasure and props, map symbols; pencil, eraser, fill, eyedropper, box select, move, copy/cut/paste, flip, line, rectangle, ellipse (filled or not), mirror, brush sizes, colour picker and game palette, undo, onion skin, the game's drawing behind to trace; touch, pinch and keys. |
| See it move and in place | Functional | Play at the game's fps over a raid or parchment background; sample map of drawn map symbols; open the game's dragon sheet or map preview with unsaved drawings (`?drafts=1`). |
| Saved to GitHub, editable later | Functional | One readable file per sprite in `assets/pixelart/`, committed through the GitHub API with a fine-grained token kept in the browser; drafts kept locally until saved; brings in art saved from another device; checked by `tools/test.js`. |
| The game uses the drawings | Functional | Raid sprites (first frame), dragon frames per tier and pose (all breeds share one drawing), map symbols through the "Pixel art (editor)" map art pack (Settings → Map art). |
| New game art appears in the editor | Functional | 0.17: the editor lists the game's art registry (`HB.art`): sprites, dragon poses and the lair's pictures register where they are drawn. |
| Your own picture behind the pixels | Functional | 0.17: load any image per sprite (kept in the browser), opacity, size, move, on top; the eyedropper samples it on empty pixels. |
| Named layers, saved with the sprite | Functional | 0.18: a few named layers per sprite (show/hide, reorder, merge, rename); saved in the sprite's file; the game merges the visible ones, hidden layers stay out. |
| Picture → pixel art converter | Functional | 0.18: converts the picture behind the pixels on the sprite's grid: ink threshold and line pickup, paper removal, colour count or snap to sprite/game colours, colour boost, outline; live preview; keep lines and colours, lines only or colours only (0.18.1); lines and colours on separate layers by default, the colour layer filled under the lines. |
| Colour wheel and saved palettes | Functional | 0.19: hue/strength dial and brightness bar with a hex box (an unused colour edits in place; "change it everywhere" recolours live); named palettes saved to GitHub in `assets/pixelart/palettes.js`. |
| Crop, anchor and variant sizes | Functional | 0.20: crop to the drawing or a selected box; anchor at the foot or centre; each map variant is used at its own drawn size; mountain kinds listed by name with where the map uses them. |
| Parchment under, see-through pixels, spreadsheet selection | Functional | 0.21: the map's paper behind the drawing at map scale (eyedropper picks it); tap or drag to select, Ctrl/Cmd/Shift or ＋ Add to add, Select drawn; opacity slider for the selection (`#rrggbbaa` colours). |
| Layer opacity and wash | Functional | 0.22: per layer, in the editor and the game; layers stack with real transparency; a lower wash keeps a map symbol's layer clearer of the territory watercolour while the ground keeps it (previewed on parchment with Good/Evil). |
| Good and evil versions | Functional | 0.21: automatic tint, adjustable; 0.24: draw your own good or evil version of any sprite (or variant). The game uses them for drawn dragons by alignment, the lair by its dragon, map symbols in a protector's or tyrant's land (the tyrant's mountains and trees are the evil versions). Raid sprites not yet. |
| Map symbol variants as separate drawings | Functional | 0.24: + New variant / Duplicate / Delete in the editor, each with its own size and anchor; the map picks one at random per spot; older many-frame drawings split on open. |
| Undo and redo on the iPad | Functional | Buttons with step counts (≥ 20, up to 120), two-finger tap undo, three-finger tap redo; colour, fps and scale changes are undoable. |
| Breed colours, mutations and scars on drawn dragons | Deferred | Drawn art replaces the composed dragon whole (it takes the good or evil tone since 0.21); layers or palette swaps would bring the rest back. |
| Walk cycles for raid people | Deferred | The game shows one frame of a raid sprite; extra frames are kept but unused. |

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
- Enormous world of seven regions (0.11: your home region and six beyond storm walls that open two at a time as you grow; one Crystal of Life in each) with subregions revealed incrementally; vision grows by tier — functional.
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

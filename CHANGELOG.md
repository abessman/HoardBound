# Changelog

Versions are shown on the title screen and in the in-game menu (`HB.VERSION` in `src/core/namespace.js`).
While pre-1.0: **minor** (0.x.0) for a feature update, **patch** (0.x.y) for fixes and tweaks. Every pushed update
bumps the version and adds an entry here.

## 0.12.0 — 2026-10-12 · Ink and watercolour
- **Your territory is painted in watercolour.** Translucent, uneven washes on the parchment: green with gold blooms
  where your rule is kind, rust with charcoal edges where it is cruel, sepia while undecided. When the territory
  changes, the change blooms: a place that swears to you or is occupied spreads colour from itself, a new phase or a
  richer hoard spreads it outward from the old edge, turning kind or cruel recolours it from each source. Labels and
  symbols stay on top; the wash stays on your home region's land.
- **Ink discovery, in a preview for now** (`index.html?scene=inkpreview&mappack=sample`): land beside what you know
  shows as a faint sketch (never settlements); when it is revealed, a sepia-black ink drop pools there and drains
  along rivulets into the mountain, the trees and the village, running through their line work before the colours
  dry in. Revealed features stay drawn. The live map still lifts its clouds; it gets the ink next.
- **For artists:** the exact files a map art pack can add for both, with sizes, alignment, channels and fallbacks:
  `docs/map-art/INK_AND_WASH.md` (ink silhouette masks, reveal-order masks, tileable watercolour textures, bloom
  masks); preview steps in `docs/map-art/INK_PREVIEW.md`. The sample pack has placeholder masks of every kind, and
  `node tools/mappack.js` checks them.
- **Reduced motion** (Settings) now also covers the map: ink and watercolour fade in instead of flowing.
- Budget for the iPad: at most 24 symbols ink at once, at most 4 pools; a territory repaint is spread over several
  frames. Measured in `docs/map-art/ink-checks.json`.

## 0.11.0 — 2026-10-12 · Your territory
- **Seven large regions.** New worlds have your home region in the middle and six regions around it behind storm
  walls (two open to a young dragon, two to an adult, two to an ancient one). Two kingdoms rule inside your home
  region, so it has villages, towns and castles to win. One Crystal of Life lies in each of the six other regions;
  the Hollow King and his lieutenants live beyond your home. Storm clouds now line a wall where it meets open land.
  Older campaigns keep the world they were made in.
- **Territory by life phase**, drawn as a **watercolour wash** that bleeds in from the lair. A hatchling has a little
  colour around its cave, growing slightly with its hoard; it widens at each phase and around the places that serve
  you, and never leaves your home region (the rest is for your rivals). Colour: gold-green kind, rust cruel, sepia
  undecided.
- **Phase 2 (young):** pilgrims' camps (kind) or cult camps (cruel) gather around your hill; places inside your
  territory answer you (ask for news; accept hospitality or demand a feast); once your lair is found (hunters,
  thieves or riders who followed you home), places that trust or fear you bring offerings.
- **Phase 3 (adult):** the camps become a village (or a fortified settlement), then a town; more offerings; bestow
  gifts from your hoard (they count as years of growth) and recruit its people. You bring villages, towns and some
  castles into your fold: oaths, a castle's fealty (new) and occupation now need an adult and your territory.
- **Phase 4 (ancient):** a castle and sanctuary, or a dark stronghold, rises beside your lair.
- **Reputation** (was Realms, F): your name, titles and benevolence, who speaks of you, who knows where you sleep,
  who is loyal; each realm's fear, trust, hostility and heat; and the **grievance ledger**: everyone sworn against
  you with cause, place and story. Hunters who survive you grow stronger and earn epithets (the Scarred, Dragonfoe,
  Dragonbane) and lead hunts on your lair; broken promises, crushed risings and razed towns make new enemies;
  weregild ends a family's, a betrayed village's or a rebel's grudge.
- Castle politics (lordships, feuds you can join) is planned next: `docs/ideas/castle-politics.md`.

## 0.10.0 — 2026-10-11 · Swappable map art
- **Map art packs** (`map_update.md`): every symbol on the parchment map (terrain, places in each state, your
  settlement's stages, pennants, caravans, armies, seals, fog, compass) has a semantic id and can be replaced by a PNG
  in `assets/map/packs/<name>/` with a small manifest, one symbol at a time. Anything missing, broken or still loading
  is drawn by hand exactly as before. Choose a pack in Settings → Map art or with `?mappack=<name>`; works from
  `file://` too.
- Variants are chosen by each symbol's stable identity (never reshuffle); different resolutions keep the same
  footprint; burned and ruined places still show their state when the art lacks it; flags, pennants, washes and
  labels stay separate; roads, rivers, coasts and washes stay procedural and can be restyled.
- The **handoff package** for an artist: `docs/map-art/` (measured catalog, contact sheets at zoom 1, 2.5 and 4×,
  art spec, replacement steps, implementation summary), a working `sample` pack and a `test-broken` pack, the
  validator `node tools/mappack.js <pack>` and the exporter `node tools/mapart-export.mjs`.
- **Map preview scene** `?scene=mappreview` (fixed seed and camera, every domain state, a burned town, a raid, the
  dragon circling; `&chunks=1` shows chunk edges; saves only to the test slot).
- Rendering only: no world generation or save change. Terrain glyph wobble now has its own seed per glyph, so stroke
  jitter and coastal waves moved slightly once; positions and sizes are unchanged.

## 0.9.1 — 2026-10-11
- **Debug tools** (Menu → Debug tools) for testing: infinite gold, invincible, endless stamina, safe sleep, instant
  building; and do-it-now buttons: gold, grow one stage, age 10 years, heal, benevolence ±25, grow your settlement,
  start the great struggle, win its next step, reveal the whole map, calm every realm, pass a season, back to the
  lair. Toggles are saved with the campaign; the map shows "Debug: …" while any is on, and the chronicle notes once
  that debug tools were used.
- The Blightmother is confirmed as the Hollow King's third lieutenant.

## 0.9.0 — 2026-10-11 · The great struggle (prototype)
- When your dragon is grown (adult) and its rule leans kind or cruel, the world answers, once and for good:
  - **Kind:** the Hollow King wakes in a far fortress, sustained by three lieutenants (a Warlord, a Sorcerer, a
    Blightmother). The **Warlord** is playable: his orc hosts attack the places that trust you, and his warcamp is
    a hard animated fight; your allies' scouts lead you in while some of his warband sleep. Kill him and the hosts
    stop.
  - **Cruel:** six Crystals of Life in sanctuaries across the realms. **Greenmarrow** is playable: its crystal is
    warded until you kill the Warden of the Grove. Taking it withers its realm for good (poorer settlements,
    blighted land on the map, more hunters) and gives you its power once it is in your hoard.
  - The other lieutenants, the other crystals and the two final battles are placed and described but not playable
    yet. A rumour foreshadows the struggle at 25.
- On screen: an announcement card, seals and new glyphs on the map, a line under your goal, a *great struggle* aim,
  summary and waking lines.
- Test starts: `?scene=map&preset=adult-kind` (also `adult-cruel`, `young-kind`, `young-cruel`) to try the later
  game. Campaigns started from the URL save to their own slot and never overwrite your autosave.
- Fix: loot inside buildings (castle vaults, town halls, house savings, mine carts, a rival's hoard) could never be
  reached; burning now spills it and an adult can smash its way in, as intended.

## 0.8.0 — 2026-10-11 · The domain
- People build around you. Once you are a young dragon, families who trust you build a refuge at the foot of your
  hill (village → flourishing town → castle and sanctuary); people you hold by fear are driven into a coerced camp
  (fortified settlement → citadel → dark stronghold). It grows while you sleep, with years, the settlements that
  serve you and the right lair upgrades, and gives gold, faster building, guards, defence and warnings. A cruel
  one gathers unrest and can revolt; a kind one loses heart when hunters reach your door. It turns if your deeds do.
- What each settlement is to you: protected, allied, tributary, occupied, resisting or ruined, shown when you
  select it, on its arrival card and as a pennant on the map.
- New deeds: take the oath of a place you protect, help rebuild a burned village, occupy a place inside your
  influence, crush or ease its resistance, raze it (and lose its tribute for good). Raiding a place you swore to
  protect breaks your word with everyone you protect. Farms can now be protected.
- Your territory on the map: a light gold-green or rust wash with a dotted edge (toggle *Territory*, T), burned
  forests and jagged ash-dark mountains near a tyrant, fuller groves and fields near a protector.
- Lair → Domain tab; a *Grow your domain* aim on the Aims board; domain lines in summaries, the sleep preview and
  the awakening; two new titles (Liege of your vale, the Tyrant).
- Night raids say so: a *Night* tag with a moon in the raid, and the intro and preview mention it.
- Fixes: cards with many choices fit on the screen; battlefields made during play keep their place after a load.

## 0.7.1 — 2026-10-11
- iPad fix: dragging (especially with a mouse) or a long press could select the page and tint the whole map pale.
  The page can no longer be selected, dragged or long-pressed.
- Docs split: a short root `CLAUDE.md` that maps the docs, a `CLAUDE.md` in each code folder, one doc per game
  system in `docs/systems/`, `docs/ideas/` (the domain and endgame notes moved there unchanged), a trimmed
  `DESIGN.md` of decisions, and `next_chat_kickoff.md` holding where we left off and the current project's decisions.
- Tools: `tools/cyclebot.js` (opening-cycle bot) and `tools/docscheck.js` (doc budgets and links).

## 0.7.0 — 2026-10-11 · The first valley
- Every new world opens with one of four local stories built from the places around your cave: outlaws sacking a farm; a captain holding a village's tribute chest (and wearing a wind charm); a dwarf envoy held for ransom (with a seal that opens a vault); a dragon-slayer raising a bounty (carrying a smoke-glass). Each has several ways in that lead to different futures. A new story appears after each long sleep when none is open.
- Treasures that open things: the Gale-Feather Charm reaches a wind-locked crag, the Deepwarden's Seal opens a dwarf-sealed vault, the Smoke-Glass shakes off riders and hunters.
- Heat: realms step through Calm → Wary → Guarded → Hunting as you rob and burn. Escorts grow, villages lock valuables away and post watchmen, and a named hunting party tracks you across the map. Fight, flee or pay them off. Good deeds and time cool it.
- Pursuit: loud raids send riders after you. Fly straight home and they learn where you sleep (more thieves and hunters later). Land far away or wait them out to lose them.
- Offerings: villages that trust you bring gifts each season, and every year you sleep, while they prosper. When raiders strike them while you sleep, your guards help them hold.
- Guarding a caravan can turn into an animated ambush fight. Warden of the Roads now needs four guarded caravans.
- Map: story places marked, wind swirls on crags, hunters and slayers shown; a story line on the goal panel and an alerts panel for riders and hunters.
- The first sleep forgives: hunters who reach the sleeping hatchling wake it to fight instead of killing it. The next step warns when hunters are likely and someone has sworn to kill you.
- Fixes: armies no longer vanish at the first daily tick; gender-neutral story text.

## 0.6.1 — 2026-10-11
- Version number and date shown on the title screen and in the in-game menu; saves record the version they were made with.
- This changelog.

## 0.6.0 — 2026-10-11 · Goals, consequences, milestones
- Visible first milestone (become a young dragon: hoard strength 1 000, age 8) with next step and what growth unlocks.
- Aims board (G): opportunities tagged grow / trust / fear / secure / renown.
- Playable good deeds: outlaw raids on farms and villages, the defend raid, return or keep recovered goods, guarding and tolling caravans.
- Consequence summary after every encounter; world reactions logged with causes; awakening shows new capabilities.
- Renown: eight titles with real effects.
- Upgrades tied to problems (why-now reasons, turn-back chances); growth happens in the year you come of age during a sleep.
- Rebalance: tier energy 1 000 / 6 000 / 30 000; gentler thieves and hunters for hatchlings.

## 0.5.0 · Hoard value
- Value shown apart from size: richer piles, cave glow, trophy wall, the Strongroom; thieves take what is worth most for its size.

## 0.4.1 · Bulk chamber
- The treasure chamber holds treasure by bulk (100 coins per space), not by value.

## 0.4.0 · Explore anywhere
- Tap anywhere to fly and explore, rumoured places, rest in the wild, readable fonts (Alegreya), CLAUDE.md handoff notes.

## 0.3.1
- Burdened-pursuit road event; map toasts and flight buttons stay in sync under dialogs.

## 0.3.0
- Petitions, endgame legend, flight controls, raid target chips, headless tests, playthrough tool.

## 0.2.0
- Raid engine, encounters, lair economy, sleep simulation, world simulation, save/load, menus.

## 0.1.0
- Scaffold: canvas UI toolkit, seeded world generation, hand-drawn parchment map, pixel dragon, travel.

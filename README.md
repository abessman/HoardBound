# HoardBound

*A dragon's life, told in treasure.* Hatch as a vulnerable hatchling in a procedurally drawn fantasy world, steal from caravans and castles in animated side-view raids, carry treasure home, grow powerful from what you hoard, fortify your cave, and sleep through decades while the world grows, remembers you, and comes looking.

The map is a hand-drawn Tolkien-style parchment that inks itself in as you fly. The dragon and its hoard are pixel art that changes with age, deeds and treasure.

## The first goal

You hatch with one goal on screen: **become a young dragon** (hoard strength 1 000 stored at home, age 8). The panel under your name shows both and the next step; **Aims** (G) lists what you could do now, tagged by what it serves (grow stronger, build trust, build fear, secure your sleep, become known), and what each would bring. A farm or village near your cave is being sacked by outlaws on day one: drive them off and its people will trust you, work for you and give you a name. After every encounter a short summary says what changed. Reinforce the entrance before you sleep; you grow in the year you come of age.

## Play it

No install, no build step, no backend.

- **Simplest:** open `index.html` in a modern browser (Chrome, Edge, Firefox, Safari).
- **Or serve it:** `python3 -m http.server 8000` in this folder, then open `http://localhost:8000/`. Serving is only needed if you add PNG sprite overrides (browsers block `fetch` on `file://`).
- **GitHub Pages:** publish the repository root; `index.html` is the entry.

Saves live in the browser's localStorage (autosave on every return home and after sleeps; manual slots in the menu). Export/import a JSON save file from the in-game menu.

## Controls

| Where | Mouse / touch | Keyboard | Gamepad |
| --- | --- | --- | --- |
| Map | click/tap a place or caravan to inspect; click/tap empty land to fly there and explore; drag to pan; wheel/pinch to zoom | arrows/WASD pan, +/− zoom, **Q** next target, **Enter** fly, **H** lair, **G** aims, **C** chronicle, **F** realms, **T** territory, **Esc** menu | left stick pan, right stick zoom, A fly, Y lair, Start menu |
| Flight | Pause / Speed / Turn back buttons | **P** pause, hold **Shift** fast, hold **Ctrl** slow | RB fast, LB slow |
| Raid | click a highlighted target or a chip in the bar; click an action | **1–9** actions, **Space** pass, **Q** next target, **W** withdraw, **Shift** fast | A first action, X pass, B withdraw |
| Panels | click | arrows move focus, Enter select, Esc back | d-pad / stick, A, B |

Tooltips explain every action, cost and disabled button.

## The loop

0. Check your goal (panel under your name, or **Aims**): what you need, what you could do next, what each choice brings.
1. Inspect a target: distance, stamina there and back, estimated wealth and defences (uncertain until scouted), what makes it dangerous.
2. Fly there. The flight costs stamina, takes days, reveals the map and may trigger road events.
3. Raid: the dragon advances through a side-view scene; time slows when an opportunity appears. Grab exposed loot, bite isolated sleepers, burn buildings (and what is inside them), seize a noble, eat a sheep, roar, dodge the ballista, withdraw. Alarm rises; bells, militia, archers, ballistae and champions follow.
4. Read what changed: a summary after every encounter names the loot and its effect once stored, how each realm's fear, hostility and trust moved, what they learned, and any name you earned.
5. Fly home with what you can carry. Only treasure stored at home powers you.
6. At the lair: spend gold on upgrades (with cost, balance and stat change shown first), hire or enslave workers, ransom or release captives, demand tribute from the frightened or protection money from the grateful.
7. Sleep: five years, twenty, fifty, a century. You heal and grow (if the hoard can feed the change); towns grow, lords die, wars move borders, thieves and hunters test the lair. Wake into the same world, changed.
8. Build a domain (once you are a young dragon): people who trust you build a refuge at the foot of your hill, people you hold by fear are driven into a camp. Protect places and take their oaths, rebuild what burned, or make them pay and occupy them. Your territory shows on the map (**Territory**, T); the settlement grows while you sleep (Lair → Domain).

## Project layout

```
index.html            entry; script load order (plain scripts, one global `HB`)
src/core/             rng, noise, input, ui toolkit, text, loop, save, audio, settings
src/art/              palette, pixel helpers + sprite registry, sprites, dragon, map glyphs, parchment, illustrations
src/world/            worldgen (terrain, rivers, regions, factions, locations, roads), world helpers (fog, gating)
src/game/             state, stats, hoard, travel, preview, raid/ (engine + templates), encounter, lair, ransom, tribute,
                      factions, history, heat, worldsim, situations, keeper, sleep, petitions, renown, consequences, goals
src/views/            title, newgame, settings, generating, intro, cardview, raidview, lairview, sleepview, consequenceview,
                      aimsview, menus, mapview
src/data/             names, treasures (loot + artifacts), events (travel/roost), encounters (decision cards), upgrades/workers
tools/                screenshot.mjs, playthrough.mjs (Playwright), headless.js, test.js, cyclebot.js, worldstats.js,
                      docscheck.js (Node)
docs/                 systems/ (one doc per part of the game), ideas/ (not built yet), BRIEF.md, FEATURE_STATUS.md
DESIGN.md             the owner's pillars and decisions
CLAUDE.md             notes for Claude sessions (plus a CLAUDE.md in each code folder)
next_chat_kickoff.md  where we left off and the working decisions of the current project
CHANGELOG.md          version history (the version shows on the title screen)
```

### Tests and tools

- `node tools/test.js [seed]` — headless simulation: world generation, travel, raid, deposit, economy, ransom, sleep, save round-trip, card encounters, tribute, defeat safety, the goal milestone, the defend raid, renown, consequence summaries, why-now reasons.
- `node tools/worldstats.js [seed] [size] [--ascii]` — world generation report.
- `node tools/screenshot.mjs out.png "js" --url="index.html?debug=1&scene=map"` — headless screenshot after running JS in the page.
- `node tools/playthrough.mjs shots/` — scripted full run with screenshots at every stage.
- `node tools/cyclebot.js [seed]` — a robber bot plays the opening cycle and reports pacing.
- `node tools/docscheck.js` — doc size budgets and links.
- `index.html?debug=1&scene=dragons` — dragon sprite review sheet. `?scene=map&seed=…` jumps straight into a world.

### Replacing the generated art

All pixel art is generated in code. Drop PNG sheets + JSON atlases into `assets/sprites/` (see `assets/sprites/README.md`); matching ids override generated sprites. Dragon layers are keyed `dragon.<tier>.<part>.<pose>`. Details: `docs/systems/art-and-sprites.md`.

### Continuing development

Data tables are plain objects: `src/data/treasures.js` (artifacts and loot), `src/data/upgrades.js` (lair, workers), `src/data/encounters.js` (decision cards), `src/data/events.js` (road events), `src/game/raid/templates.js` (scene layouts). Tuning numbers for tiers live in `src/game/state.js` (`HB.TIERS`) and `src/game/stats.js` (`HB.CATEGORIES`). See `docs/FEATURE_STATUS.md` for what is complete, simplified or deferred.

Fonts (OFL, in `assets/fonts`): Alegreya and Alegreya SC for text, IM Fell English SC for display titles.

Starting a new Claude Code session? Say "Read next_chat_kickoff.md and continue." `CLAUDE.md` loads by itself and maps the rest: the hard rules, how to verify, versioning, and which doc in `docs/systems/` explains each part of the game.

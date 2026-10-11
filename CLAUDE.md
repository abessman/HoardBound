# HoardBound — notes for Claude sessions

Read this first in any new session. It is loaded automatically by Claude Code.

## What this is
A browser dragon-life simulator: hatch weak, explore a hand-drawn Tolkien-style parchment map that inks itself in as
you fly, raid in animated side-view pixel scenes, carry treasure home (stored treasure = power), build the lair, sleep
through decades while the world changes and remembers. Played on desktop and iPad (live at hoardbound.netlify.app).

- `DESIGN.md` — every design decision agreed with the owner (world shape, raid control, dragon appearance, tone…). Follow it.
- `docs/BRIEF.md` — the original build brief (intent; DESIGN.md wins where they differ).
- `docs/FEATURE_STATUS.md` — what is functional / simplified / deferred. Update it when you change features.
- `README.md` — how to play, controls, layout, tools.

## Tech rules
- Plain JavaScript, classic `<script>` tags, one global namespace `HB`. No framework, no bundler, no npm deps, no backend.
  Must work from `file://`, a static server, and Netlify.
- Everything renders into one `<canvas>` at a fixed 1280×720 virtual resolution with the in-canvas UI toolkit
  (`src/core/ui.js`). No HTML widgets (keeps a Steam/console port possible). Keyboard, mouse, touch and gamepad all
  go through `src/core/input.js`.
- **Load order matters.** A new file must be added to `index.html` in the right place, and if it is game logic also
  to `LOGIC_FILES` in `tools/headless.js`.
- Logic in `src/world/`, `src/game/`, `src/data/`, `src/core/save.js` must stay headless-safe: no DOM at load time,
  no canvas. Views and art (`src/views/`, `src/art/`) start with `if (!HB.isBrowser) return;`.
- Authoritative state is `HB.state` (built in `src/game/state.js`); views read it, systems mutate it.
  Randomness: `worldRng` for generation (seeded), `HB.game.rng` for outcomes (persisted in saves).
- Saves store only mutable state; the static world is regenerated from the seed (`src/core/save.js`). If you add
  fields to locations, add them to `LOC_FIELDS` there. If you change world generation, old saves will not match —
  bump `GEN_VERSION` and say so.
- Fonts: Alegreya / Alegreya SC for reading text, IM Fell English SC (`family: 'display'`) only for big titles and map
  region names. `HB.text.MIN_SIZE` is the readability floor. The owner found IM Fell hard to read at small sizes.
- All pixel art is generated in code. The owner plans to replace it with real sprites via `assets/sprites/`
  (PNG + JSON atlas overrides, see the README there). Keep sprite ids stable.

## Verify before pushing
```
node tools/test.js              # 109 headless checks: world, travel, raid, economy, ransom, sleep, save, defeat, goals/defend/renown/consequences
node tools/test.js other-seed   # try a second seed
for f in src/**/*.js; do node --check $f; done   # syntax (class bodies: no commas between methods!)
node tools/playthrough.mjs <outDir>              # scripted browser run with screenshots (Playwright, preinstalled Chromium)
node tools/screenshot.mjs out.png "js to run" --url="index.html?debug=1&scene=map&seed=ember-quill-42"
```
Look at the screenshots — layout bugs only show up visually. `?debug=1` shows fps; `?scene=dragons` is the dragon
sprite sheet; `?scene=map&seed=…` jumps straight into a world.

## Where things live
- World generation: `src/world/worldgen.js` (terrain, rivers, regions with tier gates, subregions, factions, locations, roads).
- Fog / knowledge / rumours / gating: `src/world/world.js`.
- Map rendering (chunk cache, ink glyphs, cloud fog, labels, previews, tap-to-explore): `src/views/mapview.js`, `src/art/mapart.js`.
- Travel (flight, stamina, events, roost, rest, points, arrival): `src/game/travel.js`; road events in `src/data/events.js`.
- Raids: engine `src/game/raid/raid.js`, layouts `src/game/raid/templates.js`, view `src/views/raidview.js`;
  decision-card places in `src/data/encounters.js`; dispatch and consequences in `src/game/encounter.js`.
- Power: `src/game/stats.js` (`HB.CATEGORIES`), tiers in `src/game/state.js` (`HB.TIERS`), treasure in `src/data/treasures.js`.
- Lair/workers/upgrades: `src/game/lair.js`, `src/data/upgrades.js`, view `src/views/lairview.js`.
- Ransom/tribute/petitions: `src/game/ransom.js`, `tribute.js`, `petitions.js`.
- Goals and feedback (see DESIGN §3a): milestone + Aims board `src/game/goals.js` / `src/views/aimsview.js`; consequence summaries and the world-reaction log `src/game/consequences.js` / `src/views/consequenceview.js`; titles `src/game/renown.js`; outlaw threats `worldsim.spawnThreat/updateThreats`; defend raid `templates.defend` + `raid.mode === 'defend'`; caravan toll/escort in `encounter.js`; why-now reasons `lair.whyNow`; turn-back chances `sleep.stopChances`.
- Sleep/keeper/awakening: `src/game/sleep.js`, `keeper.js`, view `src/views/sleepview.js`.
- World memory: `src/game/factions.js` (wars, armies, rivals), `history.js` (grudges, orders, loyal houses), `worldsim.js` (caravans, heroes, yearly settlement change).

## Owner preferences (from the design conversation)
- Goals first: at every moment the player should see what they are trying to achieve, how the next action helps, and what changed because of it. Good deeds must be playable, consequences reported plainly (not moralised), renown visible with real effects, upgrades tied to problems already met. Art waits until this loop works.
- Long campaign; enormous world revealed little by little; vision grows with size; storm walls gate regions by tier.
- Dragon appearance evolves with tyranny/benevolence, artifacts and treasure (Binding-of-Isaac-style mutations), 4 size tiers.
- Tone: Tolkien gravitas with lighter Zelda/Pokémon readability.
- Raids: auto-advance with slow-motion decision points, not twitch.
- Endgame matters: rival dragons, readable and exploitable faction wars.
- The owner tests on an iPad: check touch flows (tap to select, drag to pan) and readability at that size.

## Open backlog (most valuable next)
1. Playtest the opening cycle on iPad (defend raid feel, Aims board readability, summary length); tune hoard-strength pacing.
2. Raid balance pass (town watch may be too strong for hatchlings; castles are deadly by design).
3. Distinct staging for the wandering-hero duel and rival-dragon duel; more good deeds (rescue a captive from a camp, escort a pilgrim) and their own scenes.
4. Visual seasons on the map; armies that move day by day.
5. A persistent low-res overview canvas for the fully zoomed-out map (performance).
6. Hand-test gamepad and touch; pinch-zoom tuning on iPad.
7. More raid templates (monastery and glade as animated scenes), more artifacts and road events.

## Git
Work on the branch named in the session instructions; commit with clear messages; push when a change is verified.
Do not open PRs unless asked.

# HoardBound — notes for Claude sessions

Loaded automatically. Read `next_chat_kickoff.md` next: where we left off, and the working decisions of any
project in progress. Keep this file short; details live in the docs below.

## What this is
A browser dragon-life simulator: hatch weak, explore a hand-drawn parchment map that inks itself in as you fly,
raid in animated side-view pixel scenes, carry treasure home (stored treasure = power), build the lair, sleep
through decades while the world changes and remembers. Played on desktop and iPad (live at hoardbound.netlify.app).

## Doc map
| Need | Read |
| --- | --- |
| Where we left off, current project and its decisions, next tasks | `next_chat_kickoff.md` |
| The owner's pillars and design decisions | `DESIGN.md` |
| How one part of the game works: intent, rules and numbers, code, tests, known issues | `docs/systems/`: `map-and-exploration`, `travel`, `raids-and-encounters`, `lair-and-economy`, `sleep-and-growth`, `goals-stories-renown`, `realms-and-memory`, `art-and-sprites` |
| What is functional / simplified / deferred | `docs/FEATURE_STATUS.md` |
| Version history | `CHANGELOG.md` |
| Ideas not built yet | `docs/ideas/` |
| Original brief (intent; DESIGN.md wins) | `docs/BRIEF.md` |
| How to play, controls | `README.md` |

Folder rules load by themselves when you work there: `src/game/CLAUDE.md` (logic, state, saves),
`src/views/CLAUDE.md` (in-canvas UI, fonts, iPad), `src/art/CLAUDE.md` (generated art, sprite ids),
`tools/CLAUDE.md` (tests, bots, screenshots).

## Hard rules
- Plain JavaScript, classic `<script>` tags, one global namespace `HB`. No framework, no bundler, no npm deps, no
  backend. Must work from `file://`, a static server, and Netlify.
- Everything renders into one `<canvas>` at 1280×720 with the in-canvas UI toolkit (`src/core/ui.js`). No HTML
  widgets (keeps a Steam/console port possible). Keyboard, mouse, touch and gamepad all go through `src/core/input.js`.
- **Load order matters.** A new file goes into `index.html` in the right place, and if it is game logic also into
  `LOGIC_FILES` in `tools/headless.js`.

## Owner preferences
- Goals first: at every moment the player sees what they are trying to achieve, how the next action helps, and
  what changed because of it. Good play has its own actions and rewards; evil is tempting, its costs visible.
  Consequences are reported plainly, never moralised. Art waits until the loop is fun.
- Long campaign; enormous world revealed little by little; storm walls gate regions by size tier.
- Tone: Tolkien gravitas with lighter Zelda/Pokémon readability. Raids auto-advance with slow-motion decisions.
- Endgame matters: rival dragons, readable and exploitable faction wars.
- The owner plays on an iPad: check touch flows and readability at that size. Discuss big changes before building
  when asked to ("don't make anything yet" means talk only).

## Verify before pushing
```
node tools/test.js              # ~155 headless checks (count varies by seed)
node tools/test.js other-seed   # a second seed
for f in src/*/*.js src/game/raid/*.js; do node --check $f; done   # syntax (class bodies: no commas between methods!)
node tools/docscheck.js         # doc size budgets, links, system-doc sections
node tools/playthrough.mjs <outDir>   # scripted browser run with screenshots: look at them
```

## Versioning (keep doing this)
Every update you push bumps `HB.VERSION` and `HB.VERSION_DATE` in `src/core/namespace.js` (shown on the title
screen and in the in-game menu) and adds an entry to `CHANGELOG.md`. Pre-1.0: minor for a feature update, patch
for fixes and tweaks. Always tell the owner which version they are on after each update.

## End of every session (or update)
1. Version bump + `CHANGELOG.md` entry.
2. Update the `docs/systems/` doc(s) you touched and the `docs/FEATURE_STATUS.md` rows, in the same commit.
3. Rewrite `next_chat_kickoff.md`: state, current project and its working decisions, next tasks, open questions.
4. `node tools/docscheck.js` passes; tell the owner the version.

## Git
Work on the branch named in the session instructions; commit with clear messages; push when a change is verified.
Do not open PRs unless asked.

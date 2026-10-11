# src/game — game logic (also src/world, src/data, src/core/save.js)

Rules for logic code. Which system does what: `docs/systems/` (start from the root CLAUDE.md doc map).

## Headless-safe
- No DOM at load time, no canvas. Node loads these files for tests (`tools/headless.js`), so anything that pushes
  a scene must check `HB.isBrowser && HB.SomeScene` and have a headless path (resolve with a default choice).
- A new logic file goes into `index.html` and `LOGIC_FILES` in `tools/headless.js`, in dependency order. Calls
  between modules happen at runtime, so only top-level code cares about order.
- Data tables (treasures, upgrades, workers, encounter cards, road events, names) live in `src/data/`.

## State and randomness
- Authoritative state is `HB.state`, built in `src/game/state.js`; views read it, systems mutate it.
  Phases: `home, planning, traveling, encounter, returning, sleeping` (plus `dead`).
- Two RNG streams: `worldRng` (generation, reproducible from the seed) and `HB.game.rng` (outcomes, saved).
  Never use `Math.random` for outcomes that matter (the raid engine's cosmetic jitter is the exception).

## Saves
- Saves store only mutable state; the world is regenerated from the seed (`src/core/save.js`).
- A new `state` field: add it to `serialize` and `deserialize` with a default for old saves.
- A new location field: add it to `LOC_FIELDS`. Changing world generation breaks old saves: bump `GEN_VERSION` and say so.

## Making consequences legible
- When a system changes the world in a way the player should understand, log it with a cause:
  `HB.consequences.react(state, text, 'because …')`, and make sure the consequence summary can show it.
- Generated people can be any gender: write their text with names or roles ("the captain"), not he/she.

## Tests
- Add headless checks to `tools/test.js` for new rules (see `tools/CLAUDE.md`).

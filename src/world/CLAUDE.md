# src/world — world generation and knowledge

Logic rules are in `src/game/CLAUDE.md` (headless-safe, state, saves). How the world works: `docs/systems/map-and-exploration.md`.

- Generation uses the seeded `worldRng` only. Any change to generation means old saves no longer match:
  bump `GEN_VERSION` in `src/core/save.js` and tell the owner.
- New location fields that change during play go into `LOC_FIELDS` in `src/core/save.js`.

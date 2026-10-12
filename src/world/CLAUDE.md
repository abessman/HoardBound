# src/world — world generation and knowledge

Logic rules are in `src/game/CLAUDE.md` (headless-safe, state, saves). How the world works: `docs/systems/map-and-exploration.md`.

- Generation uses the seeded `worldRng` only. Saves store the generation version of their world (`HB.worldgen.GEN`,
  2 since 0.11) and regenerate that version. A change to generation goes behind a new version branch in
  `worldgen.generate` (keep the old path unchanged), bump `GEN` and `GEN_VERSION` in `src/core/save.js`, tell the owner.
- New location fields that change during play go into `LOC_FIELDS` in `src/core/save.js`.

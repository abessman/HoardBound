# src/art — generated art

How it works and how real sprites replace it: `docs/systems/art-and-sprites.md`.

- All pixel art is generated in code (palette-indexed grids, composable dragon layers, ink map glyphs).
- The owner plans to replace it with real sprites via `assets/sprites/` (PNG + JSON atlas overrides, see the
  README there). **Keep sprite ids stable**; add new ids rather than renaming old ones.
- Pixel scenes render at 320×180 and scale 4× nearest-neighbour; keep new sprites on that grid.
- Like views, art files start with `if (!HB.isBrowser) return;`.
- Map drawing (`mapart.js`) is wrapped for map art packs (`mapassets.js`, ids in `src/data/mapspec.js`): a new map
  glyph needs an id in mapspec, a `wrap(...)` line at the end of mapart.js and a recipe in `tools/mapart-page.js`;
  call it through `HB.mapart.x`, never `HB.mapart.proc.x`. Drawing must not consume the placement RNG.
- The watercolour lives in `mapfx.js`: `HB.mapWash` (territory) and `HB.mapReveal` (newly revealed land washing in).
  View-only, never write state; keep effects in world cells through `worldToScreen`, respect `HB.mapFx.reduced()`.
  Contract: `docs/map-art/WASH.md`. Keep the reveal independent of the symbol art (it is a mask over the map).
- Art work is paused while the gameplay loop is being fixed; only add art that a new mechanic needs
  (for example a distinct outlaw sprite so raiders read differently from villagers).

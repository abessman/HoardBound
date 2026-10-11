# Art and sprites

Generated pixel art, the dragon's evolving look, map glyphs, and how real sprites will replace them.

## Intent
- Appearance is earned: size from age, palette and horns from tyranny or benevolence, mutations from artifacts
  and treasure, scars from defeats (Binding-of-Isaac-style mutations).
- Tone: Tolkien gravitas with lighter Zelda/Pokémon readability.
- All art is generated in code for now; the owner will replace it with real sprites. Art work is paused while
  the gameplay loop is fixed.

## How it works
- Pixel scenes render to 320×180 offscreen buffers and scale 4× with nearest-neighbour.
- People, animals and props are palette-indexed grids (`src/art/sprites.js`); the dragon is drawn from composable
  layers per tier, pose, alignment and mutation (`src/art/dragon.js`, sheet at `?scene=dragons`).
- The map is Tolkien-style ink: glyphs, cloud fog and parchment (`src/art/mapart.js`, `src/art/parchment.js`).

### Replacing generated art
Sprites are registered by id in `HB.sprites`. Drop a PNG sheet and a JSON atlas (`{ "id": {x,y,w,h,
ax,ay} }`, `ax`/`ay` the anchor pixel) into `assets/sprites/` and list them in `assets/sprites/manifest.json`; matching ids
override generated sprites at load. Dragon layers are keyed `dragon.<tier>.<part>.<pose>` and can be
overridden the same way. Keep sprite ids stable. Details: `assets/sprites/README.md`.

## Code
- `src/art/` (palette, pixel helpers + sprite registry, sprites, dragon, mapart, parchment, illustrations).

## Tests
- Visual only: `node tools/screenshot.mjs` and `node tools/playthrough.mjs` (look at the shots).

## Known issues and tuning
- Procedural dragon art is plain; the title screen uses an ink drawing.

## Related
[map-and-exploration](map-and-exploration.md) · [raids-and-encounters](raids-and-encounters.md)

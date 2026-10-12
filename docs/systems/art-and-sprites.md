# Art and sprites

Generated pixel art, the dragon's evolving look, map glyphs, and how real sprites and map art packs replace them.

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

### Map art packs (0.10)
- Every map drawing function in `HB.mapart` is a wrapper: it asks `HB.mapAssets` for art by semantic id (the
  contract is `src/data/mapspec.js`) and otherwise calls the procedural original in `HB.mapart.proc`.
- A pack is `assets/map/packs/<name>/pack.json` + `pack.js` (the same JSON as a classic script, for `file://`) and
  PNGs. Chosen in Settings → Map art (`HB.settings.mapPack`, list in `assets/map/packs.js`) or `?mappack=<name>`.
- Draw rule: `k = param / ref`, `scale = logicalSize / sourceSize × k`, origin = anchor − anchorPx × scale; aspect
  kept unless `allowStretch`. Fallback: exact state → base id → procedural; places sub-kind + state → sub-kind →
  state → type, with the hand-drawn smoke or fade when the art lacks the state.
- Variant = hash of the symbol's stable key (terrain: seed, cell and glyph index; places: `loc<id>`). Terrain
  glyphs get their own drawing seed, so art never shifts placements. Terrain art may reach 2.2 cells from its anchor
  (the chunk margin, checked at both levels of detail); larger is refused.
- Images decode once; `HB.mapAssets.revision` bumps when one is ready or the pack changes, and the map redraws
  chunks built with older art, a few per frame. Problems are logged once with `[map art]` and fall back.
- Handoff for artists: `docs/map-art/README.md` (catalog, sheets, spec, steps, summary). Manifest fields:
  `assets/map/README.md`.

### Ink discovery and watercolour (0.12)
- `src/art/mapfx.js`. **Ink** (`HB.mapInk`): a feature (one symbol, in world cells) is drawn once into a work buffer
  (2 px per logical px, ≤ 160 px); its ink mask is the pack's `inkMask` or derived from the art's dark lines, its
  order the pack's `revealMask` or a flow through the line work from the side facing the pool. States: hidden →
  sketch (first strokes, faint; terrain within 3 cells of known land only, never places) → revealing → drawn. A
  discovery step drops one pool; rivulets carry the ink to each feature; wet ink runs ahead, colour dries 0.35 s
  behind. ≤ 24 features animate, ≤ 4 pools. Runs in the preview (`?scene=inkpreview`) only so far.
- **Watercolour** (`HB.mapWash.Layer`): painted from territory sources over a land mask, per-pixel wobbling circles,
  two colours per path mixed by a hue mask, coverage and pooling (pack textures, world-anchored, or noise); a
  changed source (new, grown, recoloured) blooms in its bloom order. Repaints are spread over frames (≤ 6 ms each).
  The live map's territory uses it (see [domain-and-influence](domain-and-influence.md)).
- Reduced motion (Settings, `?reducedmotion=1`, `HB.mapFx.reducedOverride`): no pools or spreading; fades.
- Contract for artists: `docs/map-art/INK_AND_WASH.md`; preview steps: `docs/map-art/INK_PREVIEW.md`.

### Replacing generated art
Sprites are registered by id in `HB.sprites`. Drop a PNG sheet and a JSON atlas (`{ "id": {x,y,w,h,
ax,ay} }`, `ax`/`ay` the anchor pixel) into `assets/sprites/` and list them in `assets/sprites/manifest.json`; matching ids
override generated sprites at load. Dragon layers are keyed `dragon.<tier>.<part>.<pose>` and can be
overridden the same way. Keep sprite ids stable. Details: `assets/sprites/README.md`.

## Code
- `src/art/` (palette, pixel helpers + sprite registry, sprites, dragon, mapart, parchment, illustrations).
- Map art: `src/data/mapspec.js` (contract), `src/art/mapassets.js` (loader, resolver), the wrappers at the end of
  `src/art/mapart.js`; `tools/mappack.js` (validator), `tools/mapart-export.mjs` + `tools/mapart-page.js` (handoff
  exporter); preview `?scene=mappreview` (`HB.debug.mapPreview` in `src/main.js`, `HB.presets.preview`).
- Ink and watercolour: `src/art/mapfx.js`, `src/views/inkpreview.js`; checks `tools/inkcheck-page.js` driven by
  `node tools/mapart-export.mjs --only=ink`.

## Tests
- Visual only: `node tools/screenshot.mjs` and `node tools/playthrough.mjs` (look at the shots).
- *map art* in `tools/test.js`: the contract is complete, every id the drawing asks for exists, the reach limit,
  the validator on the sample and broken packs, the preview campaign. `node tools/mapart-export.mjs --only=check`
  proves in Chromium that placements, hit areas and saves are identical with and without a pack. `--only=ink` steps
  the ink preview frame by frame: knowledge rules every frame, world anchoring, masks used, budget, reduced motion,
  the live map's wash following real territory, saves untouched (`docs/map-art/ink-checks.json`).

## Known issues and tuning
- Procedural dragon art is plain; the title screen uses an ink drawing.
- Map terrain is cached at 22 px per cell and scaled with the map, so terrain art is no sharper than 1× (as the ink).
- Still hand-coded on the map: parchment, roads, rivers, coasts, washes (restylable via a pack's `style`), labels,
  selection, far-view dots, the smoke overlay. List: `docs/map-art/IMPLEMENTATION.md`.
- The sample pack's art is deliberate test art, not a style proposal; so are its masks.
- Live-map ink discovery is not wired yet: the chunk cache would have to leave out cells still inking.

## Related
[map-and-exploration](map-and-exploration.md) · [raids-and-encounters](raids-and-encounters.md)

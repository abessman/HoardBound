# Art and sprites

Generated pixel art, the dragon's evolving look, map glyphs, and how real sprites and map art packs replace them.

## Intent
- Appearance is earned: size from age, palette and horns from tyranny or benevolence, mutations from artifacts
  and treasure, scars from defeats (Binding-of-Isaac-style mutations).
- Tone: Tolkien gravitas with lighter Zelda/Pokémon readability.
- Pixel scene art is generated until the owner redraws it in the pixel editor (0.16, below). The owner authorised a
  parchment map illustration pass in 0.14.

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

### Illuminated parchment (0.15)
- 39 transparent illustrations cover every terrain/place/traveler family and all eight home stages (96 manifest ids).
  `mapink.js` supplies 23 dynamic ink details (flags, fog, seals, compass, terrain accents); washes remain independent.
- Damage states share image decodes and cache missing roofs, char and rubble; a spent sanctuary loses its crystal.
  Army flags retain faction colours; dragon map markers use breed tint and tier size (pixel scenes unchanged).
- Inspect every symbol/state in `?scene=artcatalog&mappack=illuminated`; it creates no campaign and saves nothing.
  `assets/map/packs/illuminated/README.md` records prompts, scope, metadata and both rollback branches.
- New settings default to `illuminated`; existing preferences remain. URL `?mappack=illuminated` previews it without
  changing saved preferences. Settings → Map art → Original ink restores the earlier symbols.
- Close terrain is cached at 2× above zoom 1.3, bounded to 64 MiB of chunk bitmap storage. Anchors do not change.
- Choosing Original ink cancels a pending pack script or manifest request; a late load cannot restore that pack.

### Watercolour (0.12; reveal wash 0.13)
- `src/art/mapfx.js`. **Reveal wash** (`HB.mapReveal.Layer`, 0.13): newly revealed cells get a start time that grows
  with their distance from the dragon (0.08 s a cell, ≤ 0.7 s); over 1 s the blank paper over them dissolves in the
  order of a fixed 128 px noise (blobs, grain, speckle; world-anchored), drawn at 8 px a cell and masked onto the
  screen-aligned paper; a thin warm tint (`#8c6234`, ≤ 26%) sits behind the edge and dries within 0.75 s. Independent
  of the symbol art. The 0.12 ink discovery (pools, rivulets, ink masks) was removed in 0.13.
- **Territory watercolour** (`HB.mapWash.Layer`): painted from territory sources over a land mask, per-pixel wobbling circles,
  two colours per path mixed by a hue mask, coverage and pooling (pack textures, world-anchored, or noise); a
  changed source (new, grown, recoloured) blooms in its bloom order. Repaints are spread over frames (≤ 6 ms each).
  The live map's territory uses it (see [domain-and-influence](domain-and-influence.md)).
- Reduced motion (Settings, `?reducedmotion=1`, `HB.mapFx.reducedOverride`): no spreading or tint; fades.
- Contract for artists: `docs/map-art/WASH.md`; preview steps: `docs/map-art/WASH_PREVIEW.md`.
- Large pack art drawn far smaller (a 16× PNG in a map chunk) goes through halved copies (`HB.mapAssets.mip`), so fine
  lines do not shimmer: new sprites can be drawn at a generous resolution.

### Replacing generated art
Sprites are registered by id in `HB.sprites`. Drop a PNG sheet and a JSON atlas (`{ "id": {x,y,w,h,
ax,ay} }`, `ax`/`ay` the anchor pixel) into `assets/sprites/` and list them in `assets/sprites/manifest.json`; matching ids
override generated sprites at load. Dragon layers are keyed `dragon.<tier>.<part>.<pose>` and can be
overridden the same way. Keep sprite ids stable. Details: `assets/sprites/README.md`.

### Art registry (0.17)
- `HB.art` (`src/art/pixel.js`) lists everything drawn in pixels that the pixel editor can redraw, with its kind,
  group, frame count, fps, a note and `gen(k, opts)` (the game's own frame). `HB.sprites.define` registers sprites
  (`{ group, editable: false }` for builders that take sizes); `dragon.js` registers each tier × pose (`POSES`);
  `lairart.js` the lair pictures. **Register new art there and it shows in the editor by itself.**
- `HB.art.frame(id, k, opts, optsKey)` / `HB.art.at(id, t, …)` return the editor's drawing when there is one (its
  own frame count and fps, `HB.sprites.overrideMeta`), else the generated frame, cached.

### Lair pictures (0.17)
- `src/art/lairart.js`: `lair.dragon.<tier>.perch` and `.sleep` (4 frames; placeholder = the composed dragon at body
  length 40/60/84/104 in the breed's colours; anchor = where it rests on the pile), `lair.chamber` (frame = chamber
  level 0–4), `lair.hill` (rooms backdrop), `lair.room.<id>` (frame = level, from 0 for the entrance and the hoard).
  The hoard pile, trophies, torch flames, light, workers, captives and construction stay generated on top.
  How the lair views use them: [lair-and-economy](lair-and-economy.md).

### Pixel editor (0.16)
- `editor/index.html` (a dev tool, ordinary HTML; not part of the game): the owner draws the dragon frame by frame,
  the raid sprites and map symbols, and commits them to `assets/pixelart/` through the GitHub API (Git Data API, one
  commit per save; a fine-grained token kept in the browser). Guide: [pixel-editor](../pixel-editor.md).
- One readable file per sprite (`<id>.js`: `HB.pixelArt.add({ id, kind, w, h, anchor, palette, frames: [{ rows }] })`,
  `.` clear, `0-9a-zA-Z` palette index) plus `index.js`; classic scripts, so `file://` works. `src/art/pixelart.js`
  loads them at boot (after the PNG atlas) and puts them into `HB.sprites.overrides`:
  `sprite` → the id (frame 0; raidview stands sprites bottom-centre, anchors unused); `dragon` → `dragon.<tier>.<pose>.<k>`
  per frame, one drawing for every breed and alignment, placed by its anchor (body centre; fewer frames loop); `anim`
  (0.17) → `<id>.<k>` for any other registered picture, with the drawing's frame count and fps; `map` → the `pixel` map
  art pack (`HB.pixelArt.mapPack()`, built in memory by `HB.mapAssets.use('pixel')`; frames are variants, pixel
  sampling). 0.20: each variant is cut to the box drawn in its frame (stretched to hold the anchor; empty frames are
  skipped), so variants keep their own sizes; `logicalSize = cut size × scale / drawnK`, where `HB.mapDrawnK(id)` is
  the k the world usually draws that state at (small mountains 0.55, large 1.25: MAP_SPEC `drawnK`), so a drawing
  shows at about its drawn size.
- 0.21: palette colours may carry opacity (`#rrggbbaa`). Good and evil tones: `HB.pixelArt.TONES` (automatic hue, sat,
  light, tint, mix), per drawing `def.tones`; `PA.canvases(def, tone)` recolours through `PA.shiftHex`. `apply()` adds
  `<id>.<k>.good/.evil` overrides for dragon and anim kinds; `HB.art.frame(id, k, opts, key, tone)` and the dragon's
  `sprite()` pick them (`HB.art.toneOf(alignment)`: ±30); the lair passes its dragon's tone. The wrap sets `q.tone`
  from `HB.mapart.tone`, which the chunk renderer sets per glyph from the cell's domain mark.
- 0.24: separate drawings per id (`PA.parseId`/`idOf`): `<id>#n` variants (map symbols) and `<id>@good|@evil`
  versions; `apply()` lays drawn versions over the tints. The pixel pack groups by base id: `<base>`, `<base>@good`,
  `<base>@evil` (per variant the drawn version or its tint); `MA.draw` tries `<id>@<tone>` first when `o.tone`.
- 0.28: directions `<id>>dir` (ne, e… nw; the plain drawing faces east; `dirs` 2, 4, 8 on it): overrides
  `<id>>dir.<k>`, pixel-pack assets `<base>>dir`. `PA.pickDir(dir, has, mode, facing)` gives the drawing or a mirror;
  `dragonArt.facingPose`/`draw(…, dir)`, `MA.draw` with `o.dir` (`MA.dirBases`); headings from movement in mapview.
- 0.22: layers stack with real transparency (`PA.composite`: colours' alpha × layer `opacity`); a layer's `wash`
  (0–100) gives a cut-out (`PA.cuts`) that the pixel pack ships as `washCut`. `mapassets` draws it into the chunk's
  `washCut` canvas (`g.washCut` while the chunk renders, only when `MA.hasCuts`); `drawTerritory` paints the wash into
  a buffer, erases it through the visible chunks' cut-outs and lays it on, so the ground keeps its wash.
- 0.26: shading layers (`shade: { light, dark, hatch }`, marks 1 lit, 2 shadow, 3 deep): `PA.composite` leans the
  colours below toward a warm light or the map's ink (hatched lines when `hatch`); `swap` exchanges lit and shadow.
  `PA.canvases(def, tone, swap)`; the pixel pack gives a mirrorable shaded symbol a pre-mirrored, relit variant
  instead of `allowFlipX`. Shading marks stay out of `flatten` (crop boxes) and of the palette.
- 0.27: light layers (`light: { glow, size }`, marks 1 fire, 2 window, 3 lantern, 4 magic, 5 embers: `PA.LIGHTS`) stay
  out of the picture; `PA.lightsOf(def, k)` gives patches (`lightSpots`) and a glow canvas, which the pixel pack ships
  per variant (`lights`, `glowSrc`). `MA.drawResolved` reports them into `MA.lights` (device px) while mapview collects.
- Layers (0.18): `layers: [{ name, hidden?, frames }]` (bottom first) instead of `frames`; `add` flattens the visible
  colour layers into `frames` for bookkeeping (crop boxes). `?drafts=1` applies the editor's unsaved drafts
  (localStorage `hb.pixelart.drafts`, only drawings with something visible, `null` for a deletion; 0.26.1).

## Code
- `src/art/` (palette, pixel helpers + sprite registry, sprites, dragon, mapart, parchment, illustrations).
- Map art: `src/data/mapspec.js` (contract), `src/art/mapassets.js` (loader, resolver), the wrappers at the end of
  `src/art/mapart.js`; `tools/mappack.js` (validator), `tools/mapart-export.mjs` + `tools/mapart-page.js` (handoff
  exporter); preview `?scene=mappreview` (`HB.debug.mapPreview` in `src/main.js`, `HB.presets.preview`).
- Watercolour: `src/art/mapfx.js`, `src/views/washpreview.js`; checks `tools/washcheck-page.js` driven by
  `node tools/mapart-export.mjs --only=wash`.
- Art registry `HB.art` in `src/art/pixel.js`; lair pictures `src/art/lairart.js`.
- Pixel editor: `editor/` (index.html, editor.css, editor.js; uses the art files and `tools/mapart-page.js` recipes to
  draw map symbols as tracing guides), `src/art/pixelart.js` (game-side loader), `assets/pixelart/` (the art).

## Tests
- `node tools/illuminated-check.mjs`: full symbol/state coverage, catalog rendering, touch pagination, no save writes, file delivery and rollback.
- Visual only: `node tools/screenshot.mjs` and `node tools/playthrough.mjs` (look at the shots).
- *map art* in `tools/test.js`: the contract is complete, every id the drawing asks for exists, the reach limit,
  the validator on the sample and broken packs, the preview campaign. `node tools/mapart-export.mjs --only=check`
  proves in Chromium that placements, hit areas and saves are identical with and without a pack. `--only=wash` steps
  the watercolour preview frame by frame: nothing under the fog drawn, an irregular dissolving edge, spreading from the
  dragon, world anchoring, drying away, reduced motion; the live map's reveal and territory; saves untouched
  (`docs/map-art/wash-checks.json`).
- Pixel editor: browser-checked by hand and by throwaway Playwright scripts (draw, layers, lights, directions, drafts in
  the game with `?drafts=1`); `tools/test.js` validates every art file (ids, layers, marks, `dirs`).

## Known issues and tuning
- Procedural dragon art is plain; the title screen uses an ink drawing.
- Terrain uses 1× or 2× chunk bitmaps (maximum zoom enlarges the 2× cache slightly); iPad performance needs review.
- Still hand-coded on the map: parchment, roads, rivers, coasts, washes (restylable via a pack's `style`), labels,
  selection, far-view dots, the smoke overlay. List: `docs/map-art/IMPLEMENTATION.md`.
- Drawn dragon art ignores breed colours, alignment tints, mutations and scars (one drawing serves all); hurt shows the
  drawn hurt frames. Drawn animations play every frame at the drawing's fps (0.28.1: `dragonArt.frameAt`; a raid
  sprite with several frames loops them, one cycle for every state, not separate walk and idle). Last save wins.
- Editor map symbols are their own pack (`pixel`): choosing it shows undrawn symbols in the original ink, not Illuminated.
- Lights show for places, travellers and the dragon (drawn each frame); terrain symbols (chunks) and raid or lair art
  keep their light marks but do not glow yet.

## Related
[map-and-exploration](map-and-exploration.md) · [raids-and-encounters](raids-and-encounters.md)

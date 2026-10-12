# Replacing map art

How to swap the parchment map's symbols for PNG artwork, check it, and go back. The contract (manifest fields,
fallback rules): [assets/map/README.md](../../assets/map/README.md). Sizes: [CATALOG.md](CATALOG.md). Style:
[ART_SPEC.md](ART_SPEC.md).

## 1. What to supply

For each symbol you replace: one PNG per variant, and an entry in the pack's `pack.json`. Nothing else: no code.

1. Find the id in [CATALOG.md](CATALOG.md) (or on the contact sheets in [sheets/](sheets/)): for example
   `map.place.village`, `map.terrain.tree.pine`, `map.place.town.burned`.
2. Draw the PNG at 4× the "recommended logical" size, with the anchor at the "4× PNG · anchor" point (see
   [ART_SPEC.md](ART_SPEC.md)).
3. Add it to `assets/map/packs/<pack>/pack.json`:

```json
"map.place.village": { "variants": [
  { "id": "a", "src": "places/village-a@4x.png", "sourceSize": [124, 88], "logicalSize": [31, 22], "anchorPx": [65, 78] }
] }
```

`sourceSize` is the PNG's pixel size; `logicalSize` is `sourceSize / 4` if you drew at 4×; `anchorPx` is the anchor
pixel in the PNG, counted from its top-left corner including the transparent padding.

Optional, for the ink discovery (0.12): `"inkMask"` (alpha = the line work the ink becomes) and `"revealMask"`
(luminance = the order it is drawn in, black first), both exactly the PNG's size and pixel-aligned with it. Optional,
for the territory: tileable watercolour textures under `map.wash.benevolent`, `map.wash.tyrannical` and
`map.wash.neutral`, and bloom order masks under `map.wash.bloom`. The exact rules, with fallbacks:
[INK_AND_WASH.md](INK_AND_WASH.md); try them in the [ink and wash preview](INK_PREVIEW.md).

## 2. Add a variant

Append another object to `variants` with its own `id` and `src`. Variants may differ in resolution (a 2× file with
the same `logicalSize` covers the same ground) but should keep the same footprint. The engine picks one per symbol
from its stable identity (seed and cell, or the place's id), so the choice survives panning, zooming and reloading.

## 3. Check it

```
node tools/mappack.js <pack>          # validates every entry and PNG, then writes pack.js
```

It reports unknown or duplicate ids, missing files, PNG sizes that do not match `sourceSize` or `rect`, anchors
outside the frame, aspect mismatches and terrain art that reaches past the chunk margin. Errors mean the game will
fall back to the hand-drawn symbol for that variant. Ink and reveal masks of the wrong size are warnings (the engine
derives its own); watercolour textures that are not square, not a power of two or not their declared `size` are errors.

## 4. Select the pack

- In the game: Settings → Map art (packs listed in `assets/map/packs.js`; add `{ name, label }` for a new one).
- For one visit: `index.html?mappack=<pack>`; `?mappack=none` forces the hand-drawn art.
- Served over http(s) the game reads `pack.js`, or `pack.json` if `pack.js` is missing; from `file://` only `pack.js`
  works (browsers block reading JSON there), so always run `tools/mappack.js` after editing.

## 5. Look at it: the preview scene

```
index.html?scene=mappreview&mappack=<pack>
index.html?scene=mappreview&mappack=<pack>&chunks=1          # dashed lines on chunk edges: check for seams or clipping
index.html?scene=mappreview&mappack=<pack>&cam=~-3,0,2.6     # camera: ~ = offset from the lair in cells, then zoom
node tools/screenshot.mjs out.png --wait=2500 --url="index.html?scene=mappreview&mappack=<pack>"
```

Fixed seed (`ember-quill-42`); the camera frames the lair and the places the preview sets up: forests, hills and
mountains, fields flourishing under your protection, a chunk boundary, the fog's edge and the storm wall, your
territory's watercolour wash, protected villages with pennants, one settlement tributary, one occupied and one in
revolt, a burned town, a place under attack, story seals, labels, caravans and the dragon circling (zoom out for
the struggle's first lieutenant). It is a test campaign: it saves only to the `test` slot. `node tools/mapart-export.mjs` re-shoots the
screens and re-runs the checks in [checks.json](checks.json).

## 6. Refresh

Images load once in the background; when one is ready the map redraws its cached chunks by itself. After editing
files, reload the page (browsers may cache PNGs: a hard reload, or rename the file). Changing the pack in Settings
applies at once.

## 7. Go back to hand-drawn art

Settings → Map art → Hand-drawn, or `?mappack=none`. To drop one symbol from a pack, delete its entry from
`pack.json` and re-run `tools/mappack.js`.

## 8. Diagnose

- Open the browser console: every problem is logged once with `[map art]` and says what was wrong and what the game
  did (usually "procedural art is used").
- `?debug=1` adds a line at the bottom of the map: pack name, revision, ids loaded, warning count.
- In the console: `HB.mapAssets.report()` lists the pack, ids that draw, images, decoded memory and warnings.
- A symbol stays hand-drawn: wrong id (see the catalog), a state with no base art and no exact match, the image is
  still loading or failed, or terrain art was refused as oversized.
- A symbol is in the wrong place: `anchorPx` (it is measured in the PNG's pixels, from the top-left, padding
  included). It is the wrong size: `logicalSize` (screen px at zoom 1 at the family's `ref`).
- `assets/map/packs/test-broken/` is a pack of deliberate mistakes: `?scene=mappreview&mappack=test-broken` shows the
  warnings and the fallback, with the one valid pine drawn.

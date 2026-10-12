# Watercolour on the map: asset contract

Two watercolour effects sit on the parchment. Neither is part of the map's symbols, so both work with any art pack
and with new sprites unchanged:

- **The reveal wash.** Land the dragon uncovers is not popped in: the blank paper over it dissolves along a soft,
  irregular, speckled edge that bleeds outward from the dragon, with a thin warm wash at the wet edge that dries away
  in about a second. It needs **no assets**: it is a mask over whatever the map draws. The clouds still mark the edge of
  the unknown.
- **The territory wash.** Your territory is painted in translucent watercolour: green and gold where your rule is kind,
  rust and charcoal where it is cruel, sepia where it is neither. Its extent always comes from the real territory (your
  life phase, hoard and the places that serve you); when that changes, the change blooms from where it happened. A pack
  may supply the textures below; anything missing is procedural.

Try both in the preview: [WASH_PREVIEW.md](WASH_PREVIEW.md). The pack format itself (manifest, variants, anchors,
`logicalSize`) is in [assets/map/README.md](../../assets/map/README.md). Working examples of every file below are in the
[sample pack](../../assets/map/packs/sample/pack.json) (`wash/`): placeholders that show the format, not the look.

Units: *cells* are world map cells (22 screen px at zoom 1); *luminance* is (R + G + B) / 3 of a pixel, 0–255.

## 1. Territory texture masks (pack ids `map.wash.benevolent`, `map.wash.tyrannical`, `map.wash.neutral`)

One entry per path, each with one or more variants (the engine uses the first that loads):

```json
"map.wash.benevolent": { "variants": [
  { "id": "a", "coverage": "wash/kind-coverage.png", "pooling": "wash/kind-pooling.png", "hue": "wash/kind-hue.png",
    "size": [512, 512], "cellsPerTile": 8 }
] }
```

| | |
| --- | --- |
| Files | `coverage` required; `pooling` and `hue` optional. PNG, 8-bit, greyscale (or RGBA: luminance is read, alpha ignored) |
| Dimensions | square, 256, 512 or 1024 px (power of two), all files of a variant the same size; declare it in `size` |
| Tiling | seamless in both directions (the left edge continues the right, the top the bottom) |
| Alignment | **world-anchored**: texel (0, 0) sits on the top-left corner of world cell (0, 0); one tile spans `cellsPerTile` cells (default 8, so a 512 px tile is 64 px per cell). Never rotated or flipped; it does not move with the camera, the dragon or the bloom |
| `coverage` | luminance = pigment density inside the wash: 0 = paper shows through, 255 = full pigment. Granulation, brush flow, the cauliflower texture of wet-in-wet |
| `pooling` | luminance = where pigment collects as the wash dries: darkens and strengthens the wash near bloom edges and where the hue turns |
| `hue` | luminance = mix of the path's two colours: kind 0 green → 255 gold; cruel 0 rust → 255 charcoal; neutral 0 sepia → 255 umber |
| Colour | never painted into the masks: the engine tints with the pack's `style.wash` (defaults: kind `#6e8c3a` / `#c4a03a`, cruel `#b03010` / `#2c2420`, neutral `#806846` / `#604a30`; in `pack.json`: `"style": { "wash": { "benevolent": [[110, 140, 58], [196, 160, 58]] } }`, RGB 0–255) |
| Extent | never from the texture: the wash covers exactly your territory (with a soft wandering edge); outside it the masks are not drawn |
| Readability | the engine caps the wash's opacity at 0.45; labels, roads and symbols are drawn on top |
| Fallback | missing or failed: procedural noise (coverage = fractal noise, pooling = the drying rim, hue = slow noise) |

## 2. Bloom order masks (pack id `map.wash.bloom`, optional, any number of variants)

| | |
| --- | --- |
| Use | the order in which a bloom spreads from its source (your lair, or a place that changed allegiance) |
| File | PNG, 8-bit greyscale, square, 256 or 512 px; declare `sourceSize: [n, n]` |
| Alignment | the image centre sits on the source; the square's edge spans `span` × the source's radius (default 2.5, so fingers may run past the nominal edge); no rotation; mirrored per source if `allowFlipX` |
| Channels | **luminance = arrival order**: 0 at the centre wets first, 255 last; **alpha 0 = outside** the bloom (those pixels use the procedural order) |
| Effect | timing only: where the bloom has not arrived yet the paper is clean. It never adds or removes coverage |
| Choice | a variant per source from its stable key (like terrain variants) |
| Fallback | procedural: arrival = distance / radius, perturbed by fractal noise so the edge fingers out like wet pigment |

## 3. The reveal wash (no assets)

How it behaves, so art can be judged against it: each newly revealed cell starts uncovering a moment after the ones
nearer the dragon (0.08 s per cell, at most 0.7 s), takes 1 s to uncover, and its pixels go in the order of a fixed
noise (broad blobs, finer grain and a speckle), so the edge is irregular and stays put on the land. A thin warm wash
(`#8c6234`, at most 26% opacity) lies just behind the edge and dries away within 0.75 s more. Labels of places appear
once their cell is mostly uncovered. Nothing is drawn for land still under the fog.

## 4. Rules the engine keeps (artists need not do anything)

- **World-anchored.** Both washes are positioned in world cells and redrawn through the camera; panning and zooming
  never shifts them against the land.
- **Knowledge and saves.** The effects are view-only: they read what is revealed and the real territory, never
  change the campaign, and save nothing. Nothing about land under the fog is drawn.
- **Budget (iPad).** The reveal wash is drawn at 8 px per cell over the cells still uncovering only; the territory wash
  is repainted a few rows per frame when the territory changes (at most 6 ms a frame; the old painting shows
  meanwhile), then spreads, recomposed at most 20 times a second, at most 6 blooms at once. Measured costs:
  [wash-checks.json](wash-checks.json).
- **Reduced motion** (Settings → Reduce motion, or `?reducedmotion=1`): revealed land fades in within 0.3 s without
  spreading or tint; the territory fades in over 0.3 s.

## 5. Validation and fallback summary

`node tools/mappack.js <pack>` checks every wash file, PNG and size. In the browser the same problems are logged once
with `[map art]`.

| Problem | Result |
| --- | --- |
| wash file missing or not a PNG | coverage: the variant is refused; pooling or hue: a warning, procedural for that part |
| wash file not square, not a power of two, or sizes differ inside a variant | the variant is refused, procedural wash |
| bloom mask not square or not its `sourceSize` | refused; procedural bloom order |
| still loading | procedural until it loads, then the map redraws (no restart needed) |
| unknown wash id (e.g. `map.wash.kind`) | warning, ignored |

Ink discovery (0.12: ink silhouette and reveal-order masks, `inkMask`, `revealMask`, `inkEntryPx`) was removed in
0.13; packs that still carry those fields load, and the fields are ignored.

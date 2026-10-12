# Ink discovery and watercolour influence: asset contract

The exact files an artist (or ChatGPT) can add to a map art pack so the map's **ink discovery** and **watercolour
influence** use finished artwork. Every file here is optional: anything missing, broken or still loading falls back
to the engine's own derived masks or procedural textures, so a pack can add them one at a time. The pack format
itself (manifest, variants, anchors, `logicalSize`) is in [assets/map/README.md](../../assets/map/README.md); sizes
per symbol are in [CATALOG.md](CATALOG.md). Try everything in the preview: [INK_PREVIEW.md](INK_PREVIEW.md). Working
examples of every file below are in the [sample pack](../../assets/map/packs/sample/pack.json) (`terrain/mountain-a-ink@4x.png`,
`terrain/mountain-a-order@4x.png`, `places/village-*@4x.png`, `wash/`): placeholders that show the format, not the look.

Units: *source px* are pixels of your PNG; *cells* are world map cells (22 screen px at zoom 1); *luminance* is
(R + G + B) / 3 of a pixel, 0–255.

## What the engine does with them

**Discovery.** Terrain within 3 cells of what you have explored shows as a faint, incomplete *sketch*: only its first
strokes, broken up, in graphite-sepia. Settlements, labels and markers are never sketched; they do not exist on the
map until discovered. When an area is revealed, a small sepia-black **ink drop pools** near the new land, then
**drains** along thin rivulets into each feature there: the ink runs through the feature's line work in *reveal
order*, and the finished colours "dry" in behind it. Revealed features stay drawn. (0.12: discovery runs in the
[preview](INK_PREVIEW.md); the live map still lifts its clouds and adopts the ink next, with this same contract.)

**Influence.** Your territory is painted as translucent **watercolour blooms**: green and gold where your rule is
kind, rust and charcoal where it is cruel, sepia where it is neither. The coverage always comes from the real
territory (your life phase, hoard and the places that serve you); textures only change how the pigment sits inside
it. When the territory changes (it grows, a place swears to you, you occupy one), a bloom spreads from that place.

## 1. Ink silhouette mask (`inkMask`, per variant, optional)

| | |
| --- | --- |
| Used by | any terrain or place variant (markers ignore it) |
| File | PNG, 8-bit, RGBA or greyscale |
| Dimensions | exactly the art file's width × height. With `rect` (an atlas), a sheet of the same size; the same rect is read |
| Alignment | pixel for pixel with the art: same padding, same `anchorPx`, no trimming or offset |
| Channels | **alpha = ink amount** (0 none … 255 full ink); RGB ignored (paint it black). If the file has no alpha (every pixel opaque), **luminance is used inverted**: black = full ink, white = none |
| Content | the line work the ink becomes: outlines, ridge lines, hatching, windows, roof lines. Not colour fills or washes. It may spill up to 2 source px (at 4×) beyond the art's dark lines |
| Fallback | missing, failed or the wrong size (a warning is logged): derived from the art, ink = art alpha × darkness, darkness = clamp((200 − luminance) / 120, 0.15, 1), so dark lines are full ink and light fills a trace |

## 2. Reveal-order mask (`revealMask`, per variant, optional)

| | |
| --- | --- |
| Used by | any terrain or place variant |
| File | PNG, 8-bit; greyscale stored opaque is best |
| Dimensions, alignment | as the ink mask: the art file's size, pixel for pixel |
| Channels | **luminance = order**: 0 (black) is drawn first, 255 (white) last. **Alpha 0 = no order here**: those pixels take the derived order (below). Partial alpha counts as opaque |
| Content | a smooth gradient following the strokes from where the ink comes in (usually the base, or the side facing the lower left) out to the tips. Suggested bands: main silhouette outline 0–100, inner details and hatching 100–180, colour fills and shading 180–255 |
| Sketch | with a reveal mask, the faint pre-discovery sketch shows the pixels with order ≤ 107 (the first 42%) that carry ink, broken up by a fixed noise: make that band the recognisable outline. Without one, it shows the strongest line work (ink ≥ 0.6) |
| Fallback | missing, failed or wrong size: derived by flowing ink from an entry point (`inkEntryPx` if given, else the frame pixel nearest the ink pool, else the anchor) through the ink pixels: order = 0–200 by distance along the ink; pixels the ink does not reach get 200–255 by straight distance |
| `inkEntryPx` | optional `[x, y]` in source px: where the ink enters when there is no reveal mask |

Timing: a feature's ink front passes a pixel at (order / 255) of its ink time (0.9 s for terrain, 1.1 s for places);
its colours dry in 0.35 s behind the front. Features start when the pool's rivulet reaches them (0.6–0.9 s after
the pool appears, farther ones later).

## 3. Watercolour coverage masks (pack ids `map.wash.benevolent`, `map.wash.tyrannical`, `map.wash.neutral`)

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

## 4. Bloom order masks (pack id `map.wash.bloom`, optional, any number of variants)

| | |
| --- | --- |
| Use | the order in which a bloom spreads from its source (your lair, or a place that changed allegiance) |
| File | PNG, 8-bit greyscale, square, 256 or 512 px; declare `sourceSize: [n, n]` |
| Alignment | the image centre sits on the source; the square's edge spans `span` × the source's radius (default 2.5, so fingers may run past the nominal edge); no rotation; mirrored per source if `allowFlipX` |
| Channels | **luminance = arrival order**: 0 at the centre wets first, 255 last; **alpha 0 = outside** the bloom (those pixels use the procedural order) |
| Effect | timing only: where the bloom has not arrived yet the paper is clean. It never adds or removes coverage |
| Choice | a variant per source from its stable key (like terrain variants) |
| Fallback | procedural: arrival = distance / radius, perturbed by fractal noise so the edge fingers out like wet pigment |

## 5. Rules the engine keeps (artists need not do anything)

- **World-anchored.** Pools, rivulets, features and washes are positioned in world cells and redrawn through the
  camera; panning and zooming never shifts them against the land.
- **Knowledge and saves.** The effects are view-only: they read what is revealed and the real territory, never
  change the campaign, and save nothing. Sketches show terrain only; nothing about a place leaks before discovery.
- **Budget (iPad).** At most 24 features animate at once (more fade in), each in a work buffer of 2 px per logical
  px, at most 160 × 160; at most 4 pools at once. When the territory changes the wash is repainted a few rows per
  frame (at most 6 ms a frame; the old painting shows meanwhile), then spreads, recomposed at most 20 times a second,
  at most 6 blooms at once. Measured costs: [ink-checks.json](ink-checks.json).
- **Reduced motion** (Settings → Reduce motion, or `?reducedmotion=1`): no pools or rivulets; features cross-fade
  from sketch to drawn in 0.25 s; washes fade in over 0.3 s without spreading.

## 6. Validation and fallback summary

`node tools/mappack.js <pack>` checks every mask's file, PNG and size. In the browser the same problems are logged
once with `[map art]`.

| Problem | Result |
| --- | --- |
| mask file missing or not a PNG | warning; derived mask (ink, order) or procedural texture (wash) |
| ink or reveal mask not the art file's size | warning; derived mask |
| wash file not square, not a power of two, or sizes differ inside a variant | warning; that variant is refused, procedural wash |
| bloom mask not square | warning; procedural bloom order |
| still loading | procedural until it loads, then the map redraws (no restart needed) |
| unknown wash id (e.g. `map.wash.kind`) | warning, ignored |

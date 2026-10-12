# Map art: implementation summary (0.10.0; numbers re-measured in 0.11.0; watercolour 0.12–0.13)

What was built for [map_update.md](../../map_update.md), what is left hand-coded, and what was actually checked.
System doc: [docs/systems/art-and-sprites.md](../systems/art-and-sprites.md).

## Files

| file | change |
| --- | --- |
| `src/data/mapspec.js` (new, headless) | the contract: every family by semantic id with purpose, builder, layer, sampling, size parameter, `ref` (k = 1), largest k close up and in the far view, anchor, states; `HB.mapSpecFamily(id)`, `HB.mapTerrainReach(...)` |
| `src/art/mapassets.js` (new) | the loader and resolver `HB.mapAssets`: `use(name)`, `definePack`, validation, image loading, `revision`, `resolve` (variants, fallback chain), `drawResolved` (scale, anchor, flip, sampling, occlusion, tint), `placeIds`, `labelOffset`, `report`, the restylable `style` for roads, rivers, coasts, sea, washes and edges |
| `src/art/mapart.js` | the procedural functions are kept as `HB.mapart.proc`; every public drawing function is wrapped: art if the pack has it, else the procedural one. Seals, the threat mark and the rumour mark moved here from the map view (`seal`, `threatMark`, `rumorMark`); `stateOverlay` and `flag` split out |
| `src/views/mapview.js` | each terrain glyph gets its own drawing seed and stable key (placement still uses the cell's seed); the 2-cell chunk margin now also applies in the far view; chunks built before the latest `HB.mapAssets.revision` are redrawn a few per frame (the old ones show meanwhile, no blank flash); style from `HB.mapAssets.style`; `labelOffset`; preview dragon circle and chunk-edge lines; pack line in the `?debug=1` readout |
| `src/game/worldsim.js` | moving pieces pass their stable key |
| `src/game/presets.js` | `HB.presets.preview(state)`: the preview scene's campaign |
| `src/main.js`, `index.html`, `src/core/settings.js`, `src/views/settings.js` | load order, `?mappack=`, Settings → Map art (`mapPack`), `?scene=mappreview` |
| `assets/map/` | README (the contract), `packs.js`, the `sample` and `test-broken` packs |
| `tools/mappack.js` (new) | validator and `pack.js` writer, no dependencies |
| `tools/mapart-export.mjs`, `tools/mapart-page.js` (new) | the handoff exporter: catalog, sheets, sample art, screens, checks, perf |
| `tools/test.js`, `tools/headless.js` | the *map art* test section; mapspec in the headless load list |

No generation or save version change: art is not saved, world generation is untouched, raids and the flight demo
are untouched.

## Schema

Manifest: [assets/map/README.md](../../assets/map/README.md). Families and their numbers: `src/data/mapspec.js`
(rendered as [CATALOG.md](CATALOG.md)). Draw rule: `k = param / ref`, `scale = logicalSize / sourceSize × k`
(uniform unless `allowStretch`), origin = anchor − anchorPx × scale. Fallback: exact state → base id → procedural;
places: sub-kind + state → sub-kind → state → type, with the state overlay (smoke, faded ruin, besieged swords)
drawn when the chosen art lacks the state.

## Draw order (one map frame)

1. parchment fill
2. cached chunks (per chunk: sea wash, waves, coastline, rivers, roads, terrain glyphs sorted by their base line)
3. world edge, the territory watercolour (`HB.mapWash.Layer`, world-anchored) and its dotted edges
4. places (with state overlays), the home settlement, pennants and revolt swords
5. caravans, armies, heroes, hunters; the route preview; the dragon
6. fog (paper, clouds, lightning), places glimpsed in the fog
7. threat marks, story seals, struggle seals
8. labels, selection ring, vignette and border, compass, HUD

## Still hand-coded (not in packs)

- Parchment texture, vignette and border (`src/art/parchment.js`); the fog's paper fill under the cloud puffs.
- Roads, rivers, coastlines, the sea wash and influence edges: procedural by design so they join; colours and widths
  are restylable with the pack's `style`. The territory watercolour's extent is always the real territory; a pack
  may supply its textures and bloom order (0.12).
- Labels and the in-map words ("under attack", "in revolt", hunter names), the selection ring, the route line and
  the stamina ring, the world-edge dashes, the wind swirl around a wind-locked seal.
- Far-view simplifications: below zoom 0.55 minor places become ink dots (below 0.38 villages too).
- The burned-smoke and ruin-fade overlay used when art lacks the state; the faction flag on hand-drawn castles.
- The dragon: a pixel sprite from the sprite system (`assets/sprites/`), not a map asset.

## Known limits

- Terrain uses 22 logical px per cell (7 in the far view), with 2× backing bitmaps above zoom 1.3 since 0.14.
  Chunk keys include resolution; eviction caps backing bitmap storage at 64 MiB and 90 chunks. Maximum zoom still
  enlarges the 2× cache slightly. Placement, margin and hit-test coordinates remain logical.
- Terrain glyph wobble now comes from a per-glyph seed: positions and sizes are as before, the waves near coasts sit
  at slightly different spots and each stroke's jitter changed once (compare the two `adult-kind` screens).
- Places are capped at k = 1.2, so close zoom does not enlarge them further (unchanged).

## Screens

- Before (0.9.1) and after (0.10.0, no pack), same campaign: [before](screens/before-0.9.1-adult-kind.jpg),
  [after](screens/after-0.10.0-adult-kind-no-pack.jpg).
- Preview scene: [no pack](screens/preview-none.jpg), [sample pack](screens/preview-sample.jpg),
  [with chunk edges](screens/preview-sample-chunks.jpg), [close, no pack](screens/preview-none-close.jpg),
  [close, sample](screens/preview-sample-close.jpg), [far view, sample](screens/preview-sample-far.jpg),
  [broken pack](screens/preview-broken.jpg), [iPad-sized viewport, sample](screens/preview-sample-ipad.jpg).

## Watercolour (0.12; reveal wash 0.13)

0.12 painted the territory in watercolour and built an ink-discovery effect (ink drops draining into the symbols)
with its own mask contract; at the owner's request 0.13 replaced it with a plain **reveal wash**: new
land is uncovered by blank paper dissolving along a soft, irregular edge that bleeds outward from the dragon, with a
thin warm wash at the wet edge that dries away. It is a mask over the map, so it works with any symbol art and
needs no assets. Contract: [WASH.md](WASH.md); preview: [WASH_PREVIEW.md](WASH_PREVIEW.md).

| file | change |
| --- | --- |
| `src/art/mapfx.js` | `HB.mapFx` (limits, reduced motion), `HB.mapWash.Layer` (territory: painted from territory sources, blooms, repaint spread over frames), `HB.mapReveal.Layer` (0.13: the reveal wash, per-cell start times spreading from the dragon, a fixed noise for the dissolving edge, the wet tint) |
| `src/views/mapview.js` | the territory is drawn by the watercolour layer from `HB.domain.influence`; revealed cells go to the reveal layer (0.13), the fog's paper skips them and its clouds over them clear early, so the edge shows |
| `src/views/washpreview.js` (0.13) | `?scene=washpreview` (and the old `?scene=inkpreview`): a mountain, a forest, a village under the fog; fly, reset, slow motion, kind/cruel, grow, village joins, motion, art; pan, zoom, pinch |
| `src/art/mapassets.js` | `map.wash.*` variants (tileable textures, bloom masks); `washData`, `bloomData`, `pixels`; `style.wash` colour pairs; 0.13: big art drawn far smaller goes through halved copies (`mip`) so fine lines do not shimmer |
| `src/data/mapspec.js` | layer `wash`: `map.wash.benevolent`, `.tyrannical`, `.neutral`, `.bloom` |
| `tools/mappack.js`, `tools/test.js` | wash validation; the sample pack has 9 ids, the broken pack 9 errors |
| `tools/mapart-export.mjs`, `tools/washcheck-page.js`, `tools/mapart-page.js` | `--only=wash` (checks, costs, screens); placeholder wash textures in the sample pack |

Removed in 0.13: `HB.mapInk`, the ink preview, `inkMask` / `revealMask` / `inkEntryPx` (packs that still carry them
load; the fields are ignored) and the sample's ink masks. No save or generation change: the effects are view-only.

Checked in headless Chromium ([wash-checks.json](wash-checks.json), every frame of the preview drawn and checked):
nothing under the fog is drawn on any frame; the paper over a half-uncovered cell varies pixel to pixel (an irregular
edge, not a square fade) with a warm tint at it; land farther from the dragon starts later; panning mid-reveal moves the
wash exactly with the land; the wash dries away completely; reduced motion fades in 0.3 s without spreading or tint;
on the live map a flight uncovers land through the wash and leaves no fog on revealed land; the territory checks of
0.12 (blooms, growth, colours, the live territory, saves unchanged). Costs (software rendering, not an iPad): the
reveal layer about 2 ms a frame on the live map while land is uncovering, at most about 5 ms.

## Checks actually performed

- `node tools/test.js` on two seeds (the *map art* section: contract complete, ids the code asks for exist, reach
  limit, the validator on both packs, the preview campaign deterministic and saveable).
- In headless Chromium ([checks.json](checks.json)): the drawing is wrapped; no pack loads nothing; the 1 487 glyph
  calls of four chunks at both levels of detail are identical with no pack, the sample pack and the broken pack;
  selection hit areas identical; the sample pack loads 9 ids and 14 images with no warnings (0.12: with its watercolour
  textures); mountain variants at 4× and 2× draw at the same size and anchor; the broken pack draws only its valid
  pine and warns 12 times; campaign saves
  are identical with and without the pack and round-trip; no page errors.
- Performance ([perf.json](perf.json), 0.14, headless Chromium): Illuminated parchment drew at median 2.8 ms,
  rebuilt nine visible chunks in 19.4 ms, and used 1.43 MB of decoded pack images. Chunk bitmaps are bounded to
  64 MiB including mixed resolutions. These measurements are not a physical iPad benchmark.
- Illuminated integration ([illuminated-checks.json](illuminated-checks.json)): all nine images ready without warnings,
  four zoom levels retain their logical footprint and stay under budget; art switching preserves the save, switching
  to Original ink during a pending load works, and all images load from `file://`. No runtime errors.
- Desktop: the playthrough script and screenshots at 1280×720. iPad: only an iPad-sized viewport (1180×820 at 2×,
  touch enabled) in headless Chromium; **no physical iPad was used**. Touch input is unchanged (hit areas do not use
  art bounds), but the owner should look at the sample pack on the iPad.

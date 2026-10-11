# Map art: implementation summary (0.10.0)

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
3. world edge, territory washes and their dotted edges
4. places (with state overlays), the home settlement, pennants and revolt swords
5. caravans, armies, heroes, hunters; the route preview; the dragon
6. fog (paper, clouds, lightning), places glimpsed in the fog
7. threat marks, story seals, struggle seals
8. labels, selection ring, vignette and border, compass, HUD

## Still hand-coded (not in packs)

- Parchment texture, vignette and border (`src/art/parchment.js`); the fog's paper fill under the cloud puffs.
- Roads, rivers, coastlines, the sea wash, territory washes and influence edges: procedural by design so they join;
  colours and widths are restylable with the pack's `style`.
- Labels and the in-map words ("under attack", "in revolt", hunter names), the selection ring, the route line and
  the stamina ring, the world-edge dashes, the wind swirl around a wind-locked seal.
- Far-view simplifications: below zoom 0.55 minor places become ink dots (below 0.38 villages too).
- The burned-smoke and ruin-fade overlay used when art lacks the state; the faction flag on hand-drawn castles.
- The dragon: a pixel sprite from the sprite system (`assets/sprites/`), not a map asset.

## Known limits

- Terrain is cached at 22 px per cell (7 in the far view) and scaled with the map, so terrain art is no sharper than
  1× at zoom 1 and gets soft at zoom 3: the same as the hand-drawn glyphs. Raising the chunk resolution would cost
  about 4× the 66 MB cache bound; not done.
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

## Checks actually performed

- `node tools/test.js` on two seeds (the *map art* section: contract complete, ids the code asks for exist, reach
  limit, the validator on both packs, the preview campaign deterministic and saveable).
- In headless Chromium ([checks.json](checks.json)): the drawing is wrapped; no pack loads nothing; the 2 028 glyph
  calls of four chunks at both levels of detail are identical with no pack, the sample pack and the broken pack;
  selection hit areas identical; the sample pack loads 6 ids and 7 images with no warnings; mountain variants at 4×
  and 2× draw at the same size and anchor; the broken pack draws only its valid pine and warns 9 times; campaign saves
  are identical with and without the pack and round-trip; no page errors.
- Performance ([perf.json](perf.json), headless Chromium, software rendering, 30 fps cap): map draw median 2.5 ms
  both ways; rebuilding the 12 visible chunks 47 ms without a pack, 61 ms with the sample pack; sample pack decoded
  images 0.24 MB; chunk cache bound 90 × 440² px ≈ 66 MB (unchanged).
- Desktop: the playthrough script and screenshots at 1280×720. iPad: only an iPad-sized viewport (1180×820 at 2×,
  touch enabled) in headless Chromium; **no physical iPad was used**. Touch input is unchanged (hit areas do not use
  art bounds), but the owner should look at the sample pack on the iPad.

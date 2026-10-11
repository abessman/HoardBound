# Map art handoff package

Everything an artist (or an image model) needs to draw drop-in replacements for the parchment map's symbols, all
measured from the game (HoardBound 0.10.0). The brief this answers: [map_update.md](../../map_update.md).

| # | asked for | here |
| --- | --- | --- |
| 1 | asset catalog, JSON and table | [catalog.json](catalog.json), [CATALOG.md](CATALOG.md): id, purpose, builder, states, size parameter and `ref`, largest k, anchor, measured bounds and reach, recommended logical size and 4× PNG size with anchor, on-screen size at zoom 1 / 2.5 / 3.2, label rule, fallback |
| 2 | labelled contact sheets | [sheets/contact-zoom1.png](sheets/contact-zoom1.png) (default view), [sheets/contact-zoom2.5.png](sheets/contact-zoom2.5.png) (close view), [sheets/contact-detail-4x.png](sheets/contact-detail-4x.png) (export scale): every glyph with its id, measured bounding box, anchor cross and a one-cell scale bar |
| 3 | art specification | [ART_SPEC.md](ART_SPEC.md), palette swatches [sheets/palette.png](sheets/palette.png) |
| 4 | working sample pack | [assets/map/packs/sample/](../../assets/map/packs/sample/pack.json): two mountain variants at 4× and 2× (one transparent with an occlusion mask), a tree, a village, a castle with a flag point, a burned town (state variant) and a pixel-art wagon; and [test-broken](../../assets/map/packs/test-broken/pack.json), seven deliberate mistakes |
| 5 | repeatable preview scene | `index.html?scene=mappreview&mappack=sample` (details in [REPLACING.md](REPLACING.md#5-look-at-it-the-preview-scene)); screens in [screens/](screens/) |
| 6 | replacement instructions | [REPLACING.md](REPLACING.md), the manifest contract [assets/map/README.md](../../assets/map/README.md) |
| 7 | implementation summary | [IMPLEMENTATION.md](IMPLEMENTATION.md) |

Regenerate all of it with `node tools/mapart-export.mjs` (catalog, sheets, sample art, screens, [checks.json](checks.json),
[perf.json](perf.json)); validate a pack with `node tools/mappack.js <name>`.

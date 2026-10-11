# Map art packs

Artwork for the parchment world map, replaceable one symbol at a time without touching code. Anything a pack does
not supply, or supplies broken, is drawn by hand (procedurally) exactly as before. Pixel sprites for raids and the
dragon are a separate system: see [../sprites/README.md](../sprites/README.md).

What each symbol is, how big it is drawn and where its anchor sits: [docs/map-art/CATALOG.md](../../docs/map-art/CATALOG.md)
(measured) and the contact sheets in [docs/map-art/sheets/](../../docs/map-art/sheets/). Style rules:
[docs/map-art/ART_SPEC.md](../../docs/map-art/ART_SPEC.md). Step-by-step replacement and troubleshooting:
[docs/map-art/REPLACING.md](../../docs/map-art/REPLACING.md).

## Folder layout

```
assets/map/
  packs.js                  the packs Settings → Map art offers (HB.MAP_PACKS)
  packs/<name>/
    pack.json               the manifest (edit this)
    pack.js                 pack.json wrapped in a script tag, so the game also loads it from file:// (generated)
    terrain/ places/ markers/ fog/   your PNGs (any sub-folders; paths are relative to the pack)
```

Write `pack.json`, then run `node tools/mappack.js <name>`: it checks every entry and every PNG the way the game
does and writes `pack.js`. Choose the pack in Settings → Map art, or for one visit with `index.html?mappack=<name>`
(`?mappack=none` forces hand-drawn art).

## The manifest

```json
{
  "schemaVersion": 1,
  "name": "sample",
  "style": { "road": { "color": "#3a2412" } },
  "assets": {
    "map.terrain.mountain": {
      "variants": [
        { "id": "a", "src": "terrain/mountain-a@4x.png", "sourceSize": [128, 108], "logicalSize": [30, 25.3],
          "anchorPx": [64, 102], "contentBoundsPx": [3, 5, 122, 100], "occlusionMask": "terrain/mountain-a-mask@4x.png",
          "sampling": "smooth", "allowFlipX": true }
      ]
    }
  }
}
```

`assets` may also be an array of `{ "id": …, "variants": […] }`. Per variant:

| field | required | meaning |
| --- | --- | --- |
| `id` | no | a name for warnings (`"a"`, `"02"`) |
| `src` | yes | PNG path relative to the pack (or starting `assets/`) |
| `sourceSize` | yes* | `[width, height]` of the frame in source pixels; must equal the PNG's size |
| `rect` | no | `[x, y, width, height]` of the frame inside a larger sheet (atlas); replaces `sourceSize` |
| `logicalSize` | yes | `[width, height]` the frame is drawn at, in screen px at zoom 1, when the symbol's size parameter equals the family's `ref` (k = 1). Use the catalog's "recommended logical" size. |
| `anchorPx` | yes | the frame pixel that lands on the engine's anchor point, measured from the frame's top-left **including transparent padding** |
| `contentBoundsPx` | no | `[x, y, width, height]` of the visible ink, for tools and the catalog |
| `sampling` | no | `"smooth"` (ink, default) or `"pixel"` (nearest-neighbour, for pixel-art actors) |
| `allowFlipX` | no | the engine may mirror it (chosen per symbol, stable) |
| `allowStretch` | no | let width and height scale separately (mountains and hills have a height parameter). Default: the frame's aspect is kept and the width decides the scale. |
| `occlusionMask` | no | PNG the size of the frame; its opaque pixels are filled with paper colour `#f0e3c3` under the art, hiding what lies behind (a transparent ink mountain in front of trees) |
| `tintMask` | no | PNG whose opaque pixels take the faction colour (armies: `map.marker.banner`) |
| `labelOffset` | no | `[x, y]` logical px to move a place's name label |
| `attach.flag` | no | `[x, y]` source px where the engine plants the faction flag (castles) |
| `layer` | no | informative: the family decides the layer |

How it is drawn: `k = size parameter / ref`; `scale = logicalSize / sourceSize × k`; top-left =
anchor − anchorPx × scale. So a 128 px and a 64 px PNG with the same `logicalSize` cover the same ground.
Mountains and hills pass their width as the parameter (`w`, ref 26.4 for mountains, 18.7 for hills); trees and
tufts pass `s`; places pass `s = clamp(10·√zoom, 4, 12) ×` a type scale (ref 10 for most). The catalog lists `ref`
and the largest `k` for each id.

## Ids, states and fallback

Ids are semantic (`map.terrain.tree.pine`, `map.place.castle`, `map.home.benevolent.3`, `map.marker.pennant.allied`,
`map.fog.cloud`), never filenames. A state or sub-kind adds a part: `map.terrain.mountain.snow`,
`map.place.village.burned`, `map.place.camp.goblin`, `map.place.city.great`, `map.marker.wagon.rich`.

The engine asks for the most specific id first and falls back: **exact state → base id → hand-drawn**. Places try
sub-kind + state → sub-kind → state → type. If the art it lands on lacks the state, the state still shows: burned
places get the hand-drawn smoke and char over your art, ruins are faded. Several variants of one id are picked by the
symbol's stable identity (world seed and cell, or the place's id): they never reshuffle when you pan, zoom or reload.

## Rules that keep the map working

- No names, labels, selection rings or faction colours baked into the art. Flags, pennants, washes and labels are
  drawn by the engine on top.
- Terrain art (layer `terrain`) is cached in map chunks with a two-cell margin: it may reach at most 2.2 cells
  (≈ 30 logical px for a mountain) from its anchor at its largest size. Larger art is refused with a warning.
- Roads, rivers, coasts, the sea wash and territory washes stay procedural so they join up; a pack may restyle them
  with `style` (keys: `road`, `river`, `coast`, `water`, `wash`, `edge`; see `DEFAULT_STYLE` in `src/art/mapassets.js`).
- Art never changes where things are or what a tap selects: positions and hit areas come from the world.
- Mistakes (unknown or duplicate ids, missing files, wrong sizes, anchors outside the frame, oversized terrain) are
  reported in the browser console with `[map art]` and by `tools/mappack.js`; the symbol falls back, the rest load.

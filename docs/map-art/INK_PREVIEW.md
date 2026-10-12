# Ink and wash preview

An isolated sheet of parchment with **one mountain, one forest (seven trees) and one village**, for trying the ink
discovery and the watercolour influence with any art pack. It is not a campaign: nothing is saved and no game state
changes. What the masks are and how they must be made: [INK_AND_WASH.md](INK_AND_WASH.md).

## Open it

Serve the folder (`python3 -m http.server` in the repo, or the live site) and open:

| URL | what you get |
| --- | --- |
| `index.html?scene=inkpreview&mappack=sample` | the sample pack: placeholder art with ink and reveal masks on the mountain and the village, kind and cruel watercolour textures and a bloom mask |
| `index.html?scene=inkpreview&mappack=none` | the hand-drawn symbols; every mask derived by the engine |
| `index.html?scene=inkpreview&mappack=<yours>` | your pack (it must be listed in `assets/map/packs.js`) |
| add `&reducedmotion=1` | starts in reduced motion |
| add `&auto=1` | plays by itself: flies east at 0.8 s, the village joins at 7.5 s, the territory grows at 10.5 s |

It also works from `file://` (open `index.html` directly and add the query).

## Controls

| button | does |
| --- | --- |
| Fly east | the dragon flies across; land is revealed around it as on the map. An ink drop pools on the new land and drains into each feature it found |
| Reset | back to the start: only the west is known, the mountain is a sketch |
| Kind rule / Cruel rule | recolours the territory; the new colour blooms from each source |
| Grow | widens the lair's territory (as a new life phase or a richer hoard would); it spreads outward from the old edge |
| Village joins | the village swears to you (or is occupied): a bloom spreads from it. Refused until the village is discovered |
| Motion: full / reduced | reduced: no pools or spreading; features cross-fade from sketch to drawn in 0.25 s, washes fade in over 0.3 s |
| Art: … | switches between the hand-drawn symbols and the sample pack |
| drag, wheel, pinch, arrow keys, + / − | pan and zoom (0.6–3.2): the pool, the ink and the washes must stay on the land |

The status line (bottom right) shows how many features are animating, whether a pool or a bloom is running, the
script time per frame and the zoom.

## Testing your masks

1. Add `inkMask` and `revealMask` to the variant in your `pack.json` (and `map.wash.*` entries for watercolour),
   then run `node tools/mappack.js <pack>`: it reports a mask of the wrong size, a non-square or non-power-of-two
   wash texture, and missing files. Mask problems are warnings (the engine derives the mask); wash problems refuse
   the variant (procedural wash).
2. Open the preview with `&mappack=<pack>`. The preview's mountain uses key `pv:mtn`, its trees `pv:tree0`–`6`, the
   village `loc9001`: with several variants of an id, the same one is always chosen for the same key.
3. Watch for:
   - **Sketch** (before flying): only the first strokes of the mountain, faint and broken. If it shows fills or looks
     like a finished drawing, your reveal mask's first band (order 0–107) holds too much.
   - **Absorption**: the ink should enter on the side facing the pool and run along the outline, then the details,
     with the colours drying in behind. If it appears all at once, your reveal mask is too flat (a single grey); if it
     starts at the wrong end, invert or re-grade it.
   - **No leak**: the village and its name appear only once inked; it is never sketched.
   - **Watercolour**: pigment sits inside the territory with a soft edge; your coverage texture should show as
     granulation, not as a visible tile grid (check at zoom 0.6). Kind must read green and gold, cruel rust with
     charcoal edges. Labels must stay readable on top.
   - **Panning mid-animation**: drag while the ink runs; nothing may slide against the land.
4. Compare with `&mappack=none`: your art should take the same time and the same path as the derived masks, only
   look better.

## Automated checks

`node tools/mapart-export.mjs --only=ink` runs the preview frame by frame (the sample pack, reduced motion and no
pack), then the live map, and writes [ink-checks.json](ink-checks.json) and these screens:

| screen | moment |
| --- | --- |
| [ink-1-sketch.jpg](screens/ink-1-sketch.jpg) | before discovery: the mountain is a sketch, the rest unknown |
| [ink-2-pool.jpg](screens/ink-2-pool.jpg), [ink-3-drain.jpg](screens/ink-3-drain.jpg) | the drop pools, then drains along a rivulet |
| [ink-4-wet.jpg](screens/ink-4-wet.jpg) | the ink runs through the mountain's line work, colour drying behind |
| [ink-5-forest.jpg](screens/ink-5-forest.jpg) | one pool for the forest, rivulets fanning out to each tree |
| [ink-6-village.jpg](screens/ink-6-village.jpg), [ink-7-drawn.jpg](screens/ink-7-drawn.jpg) | the village inks in; everything drawn |
| [ink-8-bloom.jpg](screens/ink-8-bloom.jpg), [ink-9-wash-kind.jpg](screens/ink-9-wash-kind.jpg) | the village joins: its bloom mid-spread, then the kind wash |
| [ink-10-recolour.jpg](screens/ink-10-recolour.jpg), [ink-11-wash-cruel.jpg](screens/ink-11-wash-cruel.jpg) | turning cruel, then the cruel wash |
| [ink-12-reduced.jpg](screens/ink-12-reduced.jpg) | reduced motion: the mountain cross-fading |
| [ink-13-handdrawn-wet.jpg](screens/ink-13-handdrawn-wet.jpg) | no pack: the hand-drawn mountain inking with derived masks |
| [ink-14-live-occupy.jpg](screens/ink-14-live-occupy.jpg), [ink-15-live-cruel.jpg](screens/ink-15-live-cruel.jpg), [ink-16-live-kind.jpg](screens/ink-16-live-kind.jpg) | the live map: a bloom after occupying a place, the cruel and the kind territory |

## What the live game uses today

The **watercolour** is live: the map's territory is painted by the same layer, from the real territory (life phase,
hoard, the places that serve you), and blooms when it changes. **Ink discovery** runs in this preview only; the map
still uncovers land from under its clouds. Bringing the ink to the live map is the next step (see
[IMPLEMENTATION.md](IMPLEMENTATION.md#ink-discovery-and-watercolour-012)).

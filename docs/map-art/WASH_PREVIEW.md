# Watercolour preview

A small sheet of parchment with a mountain, a forest (seven trees) and a village under the fog, as on the map, for
trying the **reveal wash** and the **territory watercolour** with any art pack. It is not a campaign: nothing is saved and
no game state changes. What the effects are and which files a pack may add: [WASH.md](WASH.md).

## Open it

Serve the folder (`python3 -m http.server` in the repo, or the live site) and open:

| URL | what you get |
| --- | --- |
| `index.html?scene=washpreview` | the hand-drawn symbols |
| `index.html?scene=washpreview&mappack=sample` | the sample pack: its symbols and its placeholder watercolour textures |
| `index.html?scene=washpreview&mappack=<yours>` | your pack (it must be listed in `assets/map/packs.js`) |
| add `&slow=1` | starts in slow motion (a quarter of the speed) |
| add `&reducedmotion=1` | starts in reduced motion |
| add `&auto=1` | plays by itself: flies east at 0.8 s, the village joins at 7.5 s, the territory grows at 10.5 s |

The old address `?scene=inkpreview` opens the same scene. It also works from `file://`.

## Controls

| button | does |
| --- | --- |
| Fly east | the dragon flies across; the land it uncovers washes in |
| Reset | back to the start (only the west known); fly again to replay the reveal |
| Speed: 1× / ¼× | slow motion for everything, to look at the edge of the wash |
| Kind rule / Cruel rule | recolours the territory; the new colour blooms from each source |
| Grow | widens the lair's territory (as a new life phase or a richer hoard would); it spreads outward from the old edge |
| Village joins | the village swears to you (or is occupied): a bloom spreads from it. Refused until the village is discovered |
| Motion: full / reduced | reduced: land and washes fade in without spreading |
| Art: … | switches between the hand-drawn symbols and the sample pack: the washes do not depend on the symbols |
| drag, wheel, pinch, + / − | pan and zoom (0.8–4): the washes stay on the land |

## What to judge

- **The reveal**: newly uncovered land should wash in, softly and a little unevenly, from the dragon outward, then
  settle into the plain map with nothing left over. No hard squares, no flash.
- **The territory**: pigment inside the territory with a soft edge; kind reads green and gold, cruel rust with charcoal
  edges; labels readable on top; your textures (if any) show as granulation, not as a visible tile grid (check at zoom 0.8).

## Automated checks

`node tools/mapart-export.mjs --only=wash` steps the preview frame by frame (the sample pack and reduced motion), then
flies on the live map, and writes [wash-checks.json](wash-checks.json) and these screens:

| screen | moment |
| --- | --- |
| [wash-1-start.jpg](screens/wash-1-start.jpg) | before the flight: only the land around the lair is known |
| [wash-2-reveal.jpg](screens/wash-2-reveal.jpg), [wash-3-reveal.jpg](screens/wash-3-reveal.jpg) | the land washing in around the dragon |
| [wash-4-revealed.jpg](screens/wash-4-revealed.jpg) | everything uncovered, the wash dried |
| [wash-5-bloom.jpg](screens/wash-5-bloom.jpg), [wash-6-kind.jpg](screens/wash-6-kind.jpg), [wash-7-cruel.jpg](screens/wash-7-cruel.jpg) | the village joins (a bloom), kind and cruel territory |
| [wash-8-reduced.jpg](screens/wash-8-reduced.jpg) | reduced motion |
| [wash-9-live-reveal.jpg](screens/wash-9-live-reveal.jpg) | the live map during a flight |
| [wash-10-live-occupy.jpg](screens/wash-10-live-occupy.jpg), [wash-11-live-kind.jpg](screens/wash-11-live-kind.jpg) | the live map: a bloom after occupying a place, kind territory |

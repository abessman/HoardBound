# Landmarks (legendary places on the map)

Recorded 13 October 2026; not built yet beyond the picture. 0.20 draws one **legendary peak** per region: the region's
highest mountain, about three cells across, ringed by small mountains
([map-and-exploration](../systems/map-and-exploration.md)). It has no gameplay yet.

## The owner's words

> It might be fun to have a couple variants of things that drive engagement later... so like a legendary mountain or
> something.

> I want small and large mountain variants but then you can have also a legendary mountain or other things in the game
> that take up a significantly larger area... but that might just be its own sprite.. like a castle or something.

## What exists

- `map.landmark.*` ids in `src/data/mapspec.js`, layer `landmarks`: drawn every frame at the map's scale
  (`drawLandmarks` in `src/views/mapview.js`), so a landmark may be far bigger than terrain's two-cell reach. The owner
  draws them in the pixel editor (Map · landmarks).
- Placement is derived from the world (`HB.mapLegendaryPeaks`), so it needs no save change.

## Ideas to discuss (not decided)

- A legendary peak as a place: fly to it for a preview and a reason to go (a perch that widens sight, an old dragon's
  bones, a hoard-guarding wyrm, a storm-wall vantage), with a one-time discovery reward and a chronicle line.
- Claiming it: a lair you can move to at adult size; rivals contest it in the endgame.
- Other landmark kinds on the same layer: a great castle, a world tree, a ruined colossus, a crater lake. Each one
  a large hand-drawn piece with a story hook.
- Rumours point to the next region's landmark, giving the long campaign a visible goal behind each storm wall.

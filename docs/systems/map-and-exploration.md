# Map and exploration

World generation, fog and knowledge, rumours, storm walls, and the parchment map you explore by flying.

## Intent
- One finite continent plus overseas isles; enormous (default 200×200 leagues); seeded, different each world.
- Regions (≈12) → subregions (≈40 per region) → cells (leagues). A hatchling uncovers thin corridors; an ancient
  dragon uncovers provinces. Vision grows with size tier.
- Unexplored land hides under cloud banks that roll back; cartography inks in behind them. Region borders are
  storm walls, mountain walls or sea, each needing a size tier to cross.
- Full decisions table: [DESIGN.md §2](../../DESIGN.md).

## How it works
### Generation
- Seeded. Elevation, moisture and temperature from layered gradient noise with a radial continent mask and a
  ragged coast; island blobs for isles.
- Terrain: water, plains, forest, pine forest, hills, mountains, peaks, swamp, desert, snow.
- Rivers flow downhill from highlands to sea; roads follow least-cost paths between settlements.
- Regions from ~12 seeds with terrain-weighted distance (mountains and water are barriers), so borders fall on
  natural walls. Subregions from ~40 seeds per region. Each gets a name in its faction's phonology and a
  flavour type (Vale, Moor, Fells, Wood, Marsh, Downs, Reach, Hollow…).
- Required tier per region = ring distance from the home region, capped at 3 (isles).
- Factions claim subregions by nearest capital with terrain cost. Dwarves favour mountains, elves deep forest,
  goblins swamps and badlands.
- Locations per subregion scale with land and faction: farms/hamlets, villages, towns, cities, castles,
  camps (bandit, hunter, military, goblin), mines, dwarven holds, monasteries/shrines, ruins, elven glades,
  towers, rival dragon lairs (far regions only).
- The home cave sits in hills in the home region with a guaranteed caravan road, camp, farm/village and a
  castle within young-dragon range.

### Knowledge
- Cells: unknown → revealed. Locations: unknown → seen (type and position) → scouted (wealth and defence
  estimates with a timestamp) → raided (exact). Estimates go stale across sleeps; the preview says "as of
  Year N" and marks uncertainty.
- Rumours (captives, stolen maps, books, the tower sage) sketch far places in faint ink: dotted "?" marks you can
  fly to. At hatching the nearest farm/village, camp and castle are glimpsed and places within 10 leagues are rumoured.
- Sight radius by tier: 3.2 / 4.8 / 7 / 11 leagues (`HB.TIERS`), plus book bonuses.
- Tap or click empty land to fly there and chart the land along the path (`HB.travel.makePoint`).

### On the map
- Story places carry a red seal; wind-locked crags show swirls; places under outlaw attack show crossed swords;
  hunting parties and story heroes are drawn over the cloud when near (see [goals-stories-renown](goals-stories-renown.md)).

## Code
- World generation: `src/world/worldgen.js` (terrain, rivers, regions with tier gates, subregions, factions, locations, roads).
- Fog / knowledge / rumours / gating / sight: `src/world/world.js`.
- Map rendering (chunk cache, ink glyphs, cloud fog, labels, previews, tap-to-explore, HUD): `src/views/mapview.js`, `src/art/mapart.js`.
- Place previews: `src/game/preview.js`.
- Changing generation breaks old saves: bump `GEN_VERSION` in `src/core/save.js` and say so.

## Tests
- `tools/test.js` sections *world generation* and *travel*; `node tools/worldstats.js [seed] [size] [--ascii]` for a report.

## Known issues and tuning
- Labels can crowd at mid zoom in dense kingdoms; the whole-continent zoom is costly (a low-res overview canvas
  would help). See [FEATURE_STATUS](../FEATURE_STATUS.md).
- One seed in many lacks a rival lair (test "rival lairs exist" is seed-dependent).

## Related
[travel](travel.md) · [realms-and-memory](realms-and-memory.md) · [art-and-sprites](art-and-sprites.md)

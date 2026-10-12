# Map and exploration

World generation, fog and knowledge, rumours, storm walls, and the parchment map you explore by flying.

## Intent
- One finite continent plus overseas isles; enormous (default 200×200 leagues); seeded, different each world.
- Seven regions (0.11; older campaigns keep their 6–16) → subregions (≈40–60 per region) → cells (leagues). A hatchling uncovers thin corridors; an ancient
  dragon uncovers provinces. Vision grows with size tier.
- Unexplored land hides under cloud banks that roll back; the land behind them washes in like watercolour. Region borders are
  storm walls, mountain walls or sea, each needing a size tier to cross.
- Full decisions table: [DESIGN.md §2](../../DESIGN.md).

## How it works
### Generation
- Seeded. Elevation, moisture and temperature from layered gradient noise with a radial continent mask and a
  ragged coast; island blobs for isles.
- Terrain: water, plains, forest, pine forest, hills, mountains, peaks, swamp, desert, snow.
- Rivers flow downhill from highlands to sea; roads follow least-cost paths between settlements.
- Regions (gen 2): the home seed at the centre and six seeds spread over the mainland, relaxed toward the centres of
  their lands, then assigned with terrain-weighted distance (mountains and water are barriers), so borders fall on
  natural walls. Subregions from ~40 seeds per region. Each gets a name in its faction's phonology and a
  flavour type (Vale, Moor, Fells, Wood, Marsh, Downs, Reach, Hollow…).
- Required tier per region (gen 2): the two nearest regions open to a young dragon, the next two to an adult, the
  farthest two to an ancient one; where a closed region borders an open one, storm clouds line the wall. Gen 1:
  ring distance from home, capped at 3. Two kingdoms rule inside the home region (gen 2), away from the lair, so it
  has villages, towns and castles to win; the home region is the most your rule can reach ([domain](domain-and-influence.md)).
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
- Your territory (0.8.0): a light wash over the lands your rule reaches (gold-green kind, rust feared, sepia reach)
  with a dotted edge, toggled by *Territory* (T); pennants beside your settlements; the settlement at your hill
  beside the lair; blighted or flourishing glyphs near your rule. The chunk cache is cleared when the domain changes.
  See [domain-and-influence](domain-and-influence.md).

### Rendering and art packs (0.10)
- Terrain sits in cached chunks of 16×16 cells with a 2-cell margin (both levels of detail), at 22 px per cell
  (7 px below zoom 0.55); above zoom 1.3 a 2× backing canvas preserves fine ink details. The cache is bounded
  to 64 MiB and 90 chunks. Places, markers, fog and labels are drawn every frame. Glyph placement uses the cell's seed;
  each glyph draws with its own seed and stable key, so swapping its art never moves another glyph.
- Every symbol can be replaced by PNG art from a map art pack, with procedural fallback: see
  [art-and-sprites](art-and-sprites.md) and `docs/map-art/README.md`. Preview: `?scene=mappreview`.
- The reveal wash (0.13): land the dragon uncovers washes in. The fog's blank paper over newly revealed cells
  dissolves along a soft irregular edge that bleeds outward from the dragon, with a thin warm wash at the wet edge that
  dries away (`HB.mapReveal` in `src/art/mapfx.js`; `onReveal` → `revealWash.add`, the fog skips those cells and
  clears their clouds early). Preview: `?scene=washpreview`. Reduced motion: a 0.3 s fade.

## Code
- World generation: `src/world/worldgen.js` (terrain, rivers, regions with tier gates, subregions, factions, locations, roads).
- Fog / knowledge / rumours / gating / sight: `src/world/world.js`.
- Map rendering (chunk cache, ink glyphs, cloud fog, labels, previews, tap-to-explore, HUD): `src/views/mapview.js`, `src/art/mapart.js`; art packs `src/art/mapassets.js`, contract `src/data/mapspec.js`.
- Place previews: `src/game/preview.js`.
- Generation versions: `HB.worldgen.GEN` (2 since 0.11) and `GEN_VERSION` in `src/core/save.js`; saves store the
  version their world was made with and `deserialize` regenerates that version, so older campaigns keep their world.
  A further change to generation needs a new version branch in `worldgen.generate`.

## Tests
- `tools/test.js` sections *world generation* and *travel*; `node tools/worldstats.js [seed] [size] [--ascii]` for a report.

## Known issues and tuning
- Labels can crowd at mid zoom in dense kingdoms; the whole-continent zoom is costly (a low-res overview canvas
  would help). See [FEATURE_STATUS](../FEATURE_STATUS.md).
- One seed in many lacks a rival lair (test "rival lairs exist" is seed-dependent).
- The home settlement's name is drawn without label collision and can overlap "Your lair" at close zoom.

## Related
[travel](travel.md) · [realms-and-memory](realms-and-memory.md) · [art-and-sprites](art-and-sprites.md) · [domain-and-influence](domain-and-influence.md)

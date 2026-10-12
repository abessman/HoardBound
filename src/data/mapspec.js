/* The map-art contract: every replaceable piece of the parchment map, by semantic id. Editable data, headless-safe.
 * The loader (src/art/mapassets.js), the wrappers in src/art/mapart.js, the validator (tools/mappack.js) and the
 * handoff exporter (tools/mapart-export.mjs) all read this table. How to replace art: assets/map/README.md.
 *
 * Sizes: an asset's `logicalSize` is its size in screen pixels at zoom 1 when the drawing's size parameter equals
 * `ref`. The engine scales by k = (actual parameter) / ref, keeping the aspect ratio (unless the asset sets
 * allowStretch, then the height scales by paramY / refY where the family has one). `maxK` is the largest k the
 * engine uses in close detail; `lod1K` the largest in the far overview, where chunks hold 7 px per cell instead of 22.
 * Layer 'terrain' is drawn into cached map chunks, so its reach is limited (see marginCells); the others are drawn
 * every frame. Anchor: the point the engine passes, described in `anchor`. */
(function () {
  const HB = globalThis.HB;
  const C = 22; // map pixels per world cell at zoom 1 (HB.MAP_CELL)
  const T = (purpose, builder, o) => Object.assign({ layer: 'terrain', sampling: 'smooth', anchor: 'centre of the base, on the ground line', builder, purpose, states: [] }, o);
  const P = (purpose, ref, o) => Object.assign({ layer: 'places', sampling: 'smooth', param: 's', ref, maxK: 1.2, anchor: 'centre of the base (the ground under the symbol)', builder: 'HB.mapart.settlement(ctx, L, x, y, s)', purpose, states: ['burned', 'ruin'] }, o);
  const WASH = (purpose, o) => Object.assign({ layer: 'wash', kind: 'texture', sampling: 'smooth', anchor: 'world-anchored: texel (0, 0) on cell (0, 0)', builder: 'HB.mapWash (procedural noise)', purpose, states: [] }, o);
  const M = (purpose, ref, o) => Object.assign({ layer: 'markers', sampling: 'smooth', param: 's', ref, maxK: 1.3, anchor: 'centre of the base', purpose, states: [] }, o);

  HB.MAP_SPEC = {
    schemaVersion: 1,
    cell: C,
    lod1Cell: 7,      // pixels per cell in the far overview chunks (zoom below 0.55)
    marginCells: 2,   // chunks keep a 2-cell margin: terrain art may reach at most 2.2 cells from its anchor at either level of detail
    maxTerrainOverhang: 2 * C,
    families: {
      // ---- terrain (map chunks; positions come from the world, never from the art)
      'map.terrain.mountain': T('A mountain on mountain cells (one or two per cell)', 'HB.mapart.mountain(ctx, x, y, w, h, rng, opts)', { param: 'w', ref: 1.2 * C, refY: 0.95 * C, lod1K: 0.51, maxK: 1.25, states: ['snow', 'peak'] }),
      'map.terrain.mountain.jagged': T('A mountain drawn as jagged ash-dark teeth near a cruel ruler', 'HB.mapart.mountainJagged(ctx, x, y, w, h, rng, opts)', { param: 'w', ref: 1.35 * C, refY: 1.1 * C, maxK: 1.2, states: ['deep'] }),
      'map.terrain.hill': T('A hill on hill cells (one or two per cell)', 'HB.mapart.hill(ctx, x, y, w, h, rng)', { param: 'w', ref: 0.85 * C, refY: 0.27 * C, lod1K: 0.41, maxK: 1.3 }),
      'map.terrain.tree.round': T('A broadleaf tree (forests: one to three per cell)', 'HB.mapart.treeRound(ctx, x, y, s, rng)', { param: 's', ref: 0.17 * C, lod1K: 0.49, maxK: 1.35 }),
      'map.terrain.tree.pine': T('A pine (pine forests)', 'HB.mapart.treePine(ctx, x, y, s, rng)', { param: 's', ref: 0.15 * C, lod1K: 0.45, maxK: 1.35 }),
      'map.terrain.tree.bare': T('A dead tree at the edge of a cruel ruler’s land', 'HB.mapart.treeBare(ctx, x, y, s, rng)', { param: 's', ref: 0.17 * C, lod1K: 0.49, maxK: 1.2 }),
      'map.terrain.tree.burned': T('A burned husk deep in a cruel ruler’s land', 'HB.mapart.treeBurned(ctx, x, y, s, rng)', { param: 's', ref: 0.17 * C, lod1K: 0.49, maxK: 1.2 }),
      'map.terrain.grass': T('A grass tuft on some plains cells', 'HB.mapart.grassTuft(ctx, x, y, s, rng)', { param: 's', ref: 0.14 * C, maxK: 1.2 }),
      'map.terrain.swamp': T('A marsh tuft with water strokes', 'HB.mapart.swampTuft(ctx, x, y, s, rng)', { param: 's', ref: 0.18 * C, lod1K: 0.44, maxK: 1.2 }),
      'map.terrain.dune': T('A dune stroke on desert cells', 'HB.mapart.dune(ctx, x, y, s, rng)', { param: 's', ref: 0.4 * C, maxK: 1.1 }),
      'map.terrain.snow': T('Snow dots on snowfields', 'HB.mapart.snowDots(ctx, x, y, s, rng)', { param: 's', ref: 0.35 * C, maxK: 1.1 }),
      'map.terrain.wave': T('A wave stroke near coasts', 'HB.mapart.wave(ctx, x, y, len, rng, alpha)', { param: 'len', ref: 0.75 * C, lod1K: 0.42, maxK: 1.4, anchor: 'left end of the wave, on its centre line' }),
      'map.terrain.field': T('A cultivated field near a kind ruler’s settlement', 'HB.mapart.field(ctx, x, y, s, rng)', { param: 's', ref: 0.28 * C, maxK: 1.1, anchor: 'centre of the field' }),
      'map.terrain.ash': T('Scattered ash near a cruel ruler', 'HB.mapart.ash(ctx, x, y, s, rng)', { param: 's', ref: 0.3 * C, maxK: 1.1, anchor: 'centre of the scatter' }),
      'map.terrain.blossom': T('A gold fleck in a flourishing grove', 'HB.mapart.blossom(ctx, x, y, s)', { param: 's', ref: 0.19 * C, maxK: 1.3, anchor: 'centre of the fleck' }),
      // ---- places (drawn every frame; s = clamp(10·sqrt(zoom), 4, 12) × the type's scale)
      'map.place.farm': P('A farmstead', 7.5),
      'map.place.village': P('A village', 10),
      'map.place.town': P('A town', 10),
      'map.place.city': P('A city (state "great": a great city, tier 4+)', 11.5, { states: ['burned', 'ruin', 'great'] }),
      'map.place.castle': P('A castle (the faction flag is drawn by the engine at attach.flag if given)', 10),
      'map.place.camp': P('A camp (sub-ids: map.place.camp.bandit, .goblin, .hunter, .military)', 10),
      'map.place.mine': P('A mine', 10),
      'map.place.hold': P('A dwarven hold', 11),
      'map.place.glade': P('An elven glade', 10),
      'map.place.monastery': P('A monastery', 10),
      'map.place.shrine': P('A shrine', 10),
      'map.place.ruin': P('A ruin (a place to explore, not a burned settlement)', 10, { states: [] }),
      'map.place.warren': P('A goblin warren', 10),
      'map.place.tower': P('A sage’s tower', 10),
      'map.place.lair': P('Your lair (the settlement at your hill is map.home.*)', 10, { states: [] }),
      'map.place.rivalLair': P('Another dragon’s lair', 11, { states: ['ruin'] }),
      'map.place.battlefield': P('A battlefield', 10, { states: [] }),
      'map.place.fortress': P('The Hollow King’s fortress (the great struggle)', 10, { states: [] }),
      'map.place.stronghold': P('A lieutenant’s stronghold (sub-ids: map.place.stronghold.warlord, .sorcerer, .blightmother)', 10, { states: ['ruin'] }),
      'map.place.sanctuary': P('A sanctuary of a Crystal of Life (state "ruin": the crystal was taken)', 10, { states: ['ruin'] }),
      // ---- the settlement at the foot of your hill: map.home.<path>.<stage>
      'map.home.benevolent.1': P('Kind home settlement, stage 1: one pilgrims\' camp (drawn 1–3 times around the lair)', 8.5, { states: [], builder: 'HB.mapart.homeSettlement(ctx, x, y, s, stage, path)' }),
      'map.home.benevolent.2': P('Kind home settlement, stage 2: a village', 8.5, { states: [], builder: 'HB.mapart.homeSettlement' }),
      'map.home.benevolent.3': P('Kind home settlement, stage 3: a flourishing town', 8.5, { states: [], builder: 'HB.mapart.homeSettlement' }),
      'map.home.benevolent.4': P('Kind home settlement, stage 4: a castle and sanctuary', 8.5, { states: [], builder: 'HB.mapart.homeSettlement' }),
      'map.home.tyrannical.1': P('Cruel home settlement, stage 1: one cult camp (drawn 1–3 times around the lair)', 8.5, { states: [], builder: 'HB.mapart.homeSettlement' }),
      'map.home.tyrannical.2': P('Cruel home settlement, stage 2: a fortified settlement', 8.5, { states: [], builder: 'HB.mapart.homeSettlement' }),
      'map.home.tyrannical.3': P('Cruel home settlement, stage 3: a citadel', 8.5, { states: [], builder: 'HB.mapart.homeSettlement' }),
      'map.home.tyrannical.4': P('Cruel home settlement, stage 4: a dark stronghold', 8.5, { states: [], builder: 'HB.mapart.homeSettlement' }),
      // ---- markers (every frame)
      'map.marker.pennant.protected': M('Pennant beside a settlement under your protection', 7.5, { builder: 'HB.mapart.pennant(ctx, x, y, s, color, mark, status)', anchor: 'foot of the pole' }),
      'map.marker.pennant.allied': M('Pennant beside a settlement sworn to you', 7.5, { builder: 'HB.mapart.pennant', anchor: 'foot of the pole' }),
      'map.marker.pennant.tributary': M('Pennant beside a settlement paying you tribute', 7.5, { builder: 'HB.mapart.pennant', anchor: 'foot of the pole' }),
      'map.marker.pennant.occupied': M('Pennant beside a settlement you occupy', 7.5, { builder: 'HB.mapart.pennant', anchor: 'foot of the pole' }),
      'map.marker.crossedSwords': M('Crossed swords: a settlement in revolt', 5.5, { builder: 'HB.mapart.crossedSwords(ctx, x, y, s)', anchor: 'centre' }),
      'map.marker.wagon': M('A caravan on the road (state "rich": a rich caravan)', 7, { builder: 'HB.mapart.wagon(ctx, x, y, s, color)', states: ['rich'], anchor: 'centre of the wheels’ ground line' }),
      'map.marker.banner': M('An army (the faction colour is applied through tintMask if given)', 7, { builder: 'HB.mapart.banner(ctx, x, y, s, color)', anchor: 'foot of the pole' }),
      'map.marker.walker': M('A wandering hero (state "hunter": a hunting party or slayer, drawn in red)', 7, { builder: 'HB.mapart.walker(ctx, x, y, s, color)', states: ['hunter'], anchor: 'between the feet' }),
      'map.marker.seal.story': M('Red seal over a place in a local story (state "locked": a ? over a crag or sealed door)', 7, { builder: 'HB.mapart.seal(ctx, x, y, r, kind)', param: 'r', states: ['locked'], anchor: 'centre of the seal', maxK: 1.3 }),
      'map.marker.seal.shadow': M('Purple seal over a place of the Hollow King', 7.5, { builder: 'HB.mapart.seal(ctx, x, y, r, "shadow")', param: 'r', anchor: 'centre of the seal', maxK: 1.35 }),
      'map.marker.seal.crystal': M('Green seal over a sanctuary of a Crystal of Life', 7.5, { builder: 'HB.mapart.seal(ctx, x, y, r, "crystal")', param: 'r', anchor: 'centre of the seal', maxK: 1.35 }),
      'map.marker.threat': M('Red crossed swords over a place under outlaw attack (drawn pulsing)', 12, { builder: 'HB.mapart.threatMark(ctx, x, y, s)', anchor: 'centre', maxK: 1.2 }),
      'map.marker.rumor': M('Dotted ring with a question mark: a place known only by rumour', 9, { builder: 'HB.mapart.rumorMark(ctx, x, y, s)', anchor: 'centre of the base', maxK: 1.25 }),
      // ---- fog and decoration
      'map.fog.cloud': M('A cloud puff of the fog (state "storm": over lands behind a storm wall)', 16.5, { layer: 'fog', param: 'r', builder: 'HB.mapart.cloud(ctx, x, y, r, rng, opts)', states: ['storm'], anchor: 'centre of the puff', maxK: 3.7 }),
      'map.fog.lightning': M('Lightning in a storm wall', 8.25, { layer: 'fog', builder: 'HB.mapart.lightning(ctx, x, y, s, rng)', anchor: 'top of the bolt', maxK: 3.6 }),
      // ---- watercolour influence (0.12; contract: docs/map-art/WASH.md). Not glyphs: masks the wash reads
      'map.wash.benevolent': WASH('Watercolour masks for kind territory (coverage, pooling, hue; tileable)'),
      'map.wash.tyrannical': WASH('Watercolour masks for cruel territory (coverage, pooling, hue; tileable)'),
      'map.wash.neutral': WASH('Watercolour masks for territory that is neither kind nor cruel'),
      'map.wash.bloom': WASH('Bloom order masks: the order a bloom spreads from its source', { kind: 'bloom', anchor: 'centre on the source; edge = span × radius' }),
      'map.decoration.compass': M('The compass rose (top right of the screen)', 34, { layer: 'ui', param: 'r', builder: 'HB.mapart.compassRose(ctx, x, y, r)', anchor: 'centre', maxK: 1 }),
    },
  };
  /** how far terrain art reaches from its anchor, in cells, at the largest size either level of detail draws it.
   *  Shared by the loader and tools/mappack.js so both refuse the same art. */
  HB.mapTerrainReach = (spec, logicalSize, size, anchorPx, uniform) => {
    const S = HB.MAP_SPEC, ux = logicalSize[0] / size[0], uy = uniform ? ux : logicalSize[1] / size[1];
    const reach1 = Math.max(anchorPx[0] * ux, (size[0] - anchorPx[0]) * ux, anchorPx[1] * uy, (size[1] - anchorPx[1]) * uy); // px at k = 1
    const cells = reach1 * Math.max((spec.maxK || 1) / S.cell, (spec.lod1K || 0) / S.lod1Cell), limit = S.marginCells + 0.2;
    return { ok: cells <= limit, cells, px: reach1 * (spec.maxK || 1), limit };
  };
  /** the family a semantic id belongs to: exact id, else its longest registered prefix (map.place.camp.goblin → map.place.camp) */
  HB.mapSpecFamily = (id) => { const F = HB.MAP_SPEC.families; let k = id; while (k) { if (F[k]) return { id: k, spec: F[k] }; const i = k.lastIndexOf('.'); if (i < 0) break; k = k.slice(0, i); } return null; };
})();

# Map art replacement handoff

Status: implementation brief for Claude; no engine changes made by this document.
Requested by the owner, 2026-10-11. Scope: HoardBound's parchment overworld map.

## Goal and art direction

Make the individual map pieces replaceable with external artwork so an artist or ChatGPT can deliver PNGs and metadata without rewriting rendering code. Preserve procedural placement, world generation, travel, knowledge, saves, and gameplay.

The overworld remains a literary fantasy map: warm parchment, sepia ink, hand-drawn mountains and forests, illustrated settlements, restrained color washes, and readable labels. The separate flight/action prototype uses SNES-style pixel art; that is NOT a direction to turn the overworld into a pixel tile map. Original imagery inspired by classic fantasy cartography, not copied Tolkien geography or symbols.

Good influence can bring subtle green/gold and flourishing vegetation. Evil influence can bring muted rust, brown, charcoal, burned forests, and jagged mountains. Both must retain the parchment foundation. The moving dragon can remain a small colorful pixel character.

## Current implementation to inspect

Verified against the current repository; recheck these files before implementing:

- `src/art/mapart.js`: direct Canvas drawing through `HB.mapart`, including terrain glyphs, settlements, domain stages, moving pieces and compass.
- `src/views/mapview.js`: placement, chunk caching, zoom/LOD, territory overlays, fog, labels, input and map-to-screen transforms.
- `src/art/parchment.js`: parchment presentation.
- `src/art/pixel.js`: existing `HB.sprites` registry and PNG/JSON override loader.
- `assets/sprites/README.md`: existing sprite override contract.
- `docs/systems/art-and-sprites.md`, `map-and-exploration.md`, and `domain-and-influence.md`.

Current map measurements: 1280×720 main canvas; CELL=22 pixels per world cell at zoom 1; CHUNK=16 cells; MARGIN=2 cells; low-detail resolution 7 pixels per cell; zoom clamped to 0.22–3.2; terrain LOD changes below 0.55. Location symbols use their own scale formula, not simply CELL. Do not infer asset dimensions solely from these constants.

Existing sprite overrides use PNG sheets plus atlas entries with x/y/w/h/ax/ay, and fetch a manifest over HTTP(S). Map glyphs currently bypass that registry. Merely adding map PNGs to the sprite folder is insufficient.

## 1. Add a stable map-art contract

Introduce a map-specific resolver/draw adapter under HB, or extend the existing registry cleanly. Keep public map drawing call sites compatible where practical.

Separate:
1. World/state: what is here, who owns it, whether it burned, its stage.
2. Placement: world position, size, deterministic variation, draw order, visibility.
3. Appearance: external image or procedural fallback.

A missing, malformed, or failed asset must fall back to the current procedural drawing. An art pack can replace only mountains while everything else continues to work. Loading one broken asset must not prevent subsequent valid assets from loading.

Use semantic IDs, not filenames tied to coordinates. Suggested IDs (proposals, not existing API):
- map.terrain.mountain, mountain.snow, mountain.jagged, hill
- map.terrain.tree.round, tree.pine, tree.bare, tree.burned
- map.terrain.grass, swamp, dune, snow, wave, field
- map.place.farm, village, town, city, castle, camp, mine, hold, glade, monastery, shrine, ruin, warren, tower, lair, rivalLair
- map.place.battlefield, fortress, stronghold, sanctuary
- map.home.<existing-path-key>.<existing-stage-number>
- map.marker.wagon, banner, walker, dragon, pennant, crossedSwords, star
- map.fog.cloud, map.fog.lightning, map.decoration.compass

Inventory all actual call sites and states; this list is a starting checklist. Preserve existing domain path/stage keys, rather than inventing new campaign state. Keep map assets distinct from action-scene sprites.

Allow variants per semantic ID with deterministic selection based on world seed and stable cell/location identity. Never consume simulation RNG or change later placements because one external asset replaced a procedural drawing. Reserve procedural RNG streams or derive separate visual seeds. Variants must not reshuffle during pan, zoom, cache eviction or reload.

Support state lookup with documented precedence: exact state/variant, compatible base asset, procedural fallback. Missing burned artwork must still communicate the burned state through the existing fallback or overlay.

## 2. File and metadata format

Prefer transparent RGBA PNGs. Support individual PNG files first; atlas PNG + JSON is useful if it fits the existing loader. Avoid mandatory packing tools or new dependencies.

Suggested folder: `assets/map/`. Deliver a human-readable README and a manifest. To preserve `file://` play, retain procedural fallback when fetching is blocked. If choosing a classic-script manifest for local external art, document it; do not introduce a mandatory server.

For every asset define:
- Stable semantic ID, source path, variant and optional state.
- Source pixel dimensions; atlas rectangle if applicable.
- Logical draw width/height at a clearly defined base scale.
- Source-pixel anchor measured from the top-left of the frame, including transparent padding.
- Source-pixel content bounds, and maximum visual overhang.
- Layer, sampling mode, and any label attachment offset.
- Optional tintable mask/overlay and supported flips; default to no rotation or mirroring.
- Fallback ID or procedural builder.

Example proposed entry, purely illustrative — Claude must replace measurements with verified values:

```json
{
  "schemaVersion": 1,
  "assets": {
    "map.terrain.mountain": {
      "variants": [{
        "id": "01",
        "src": "assets/map/terrain/mountain-01.png",
        "sourceSize": [128, 128],
        "logicalSize": [32, 32],
        "anchorPx": [64, 112],
        "contentBoundsPx": [8, 8, 112, 108],
        "layer": "terrain",
        "sampling": "smooth",
        "allowFlipX": false
      }],
      "fallback": "procedural"
    }
  }
}
```

Define bounds as [x, y, width, height], sizes as [width, height]. Define anchor scaling unambiguously: draw origin = requested anchor position minus source anchor multiplied by source-to-draw scale. Do not silently crop transparent padding. Explain how existing w/h/s arguments map to logicalSize, including variable-width mountains. Preserve aspect ratio unless an asset explicitly permits stretching.

Parchment ink art may use smoothing; pixel actors use nearest-neighbor. Set and restore sampling per layer/draw. Do not globally force one style on every asset.

## 3. Layers, occlusion and color

Keep parchment, geographic washes, rivers/roads, terrain symbols, locations, state overlays, moving entities, fog, labels and interaction UI independently controllable. Document the actual draw order, preserving current knowledge/fog behavior.

- No baked-in names, faction names, selection circles or target indicators inside PNGs.
- Keep faction pennants/colors separate from building bodies.
- Keep territory washes separate from terrain symbols.
- Support complete settlement-symbol replacements now; modular roofs/walls are optional later.
- Transparent silhouettes should not bring rectangular patches of paper with them.
- Some buildings/mountains need opaque interiors to hide artwork behind them. Provide an optional occlusion mask or suitable fill strategy using the current paper color; do not assume fully transparent ink is sufficient.
- Keep generated roads, rivers, coastlines and borders connected. Expose their stroke/wash styling; do not replace them with disconnected decorative PNG fragments.
- Art bounds must not redefine travel coordinates, collision, or selection hit areas. Maintain touch-friendly selection independent of transparent margins.

## 4. Caching, loading and performance

Preload and decode each source once. No per-frame image loading or texture fetching. Publish a pack revision and invalidate affected map/sprite caches when assets become ready or the pack changes, including caches built using fallbacks.

Handle symbol overhang across chunk boundaries without clipping, doubled strokes or seams. The current two-cell margin is not a universal maximum: validate imported dimensions and adapt cache margins/culling or reject oversized entries with a useful diagnostic.

Keep existing LOD behavior. At far zoom, simplify or hide minor symbols rather than drawing dense unreadable detail. Avoid allocating large canvases per cell. Record atlas dimensions, decoded memory estimate, cache bounds, and desktop/iPad performance before and after.

Unknown IDs, duplicate IDs, bad dimensions, out-of-sheet rectangles, missing images, and invalid anchors should produce useful developer warnings and safe fallbacks.

## 5. Information to return for ChatGPT / the artist

After implementing, commit an asset handoff package in the repository. It must contain actual measured information, not just this request.

1. **Asset catalog JSON and Markdown table**: ID, purpose, current builder/call site, required states, variant count, source dimensions, logical size, anchor, bounds/overhang, layer, sampling, label offset, and fallback.
2. **Labeled contact sheets**: render every current glyph on parchment, with IDs, bounding boxes, anchor crosses and a scale reference. Include default zoom and typical close zoom. Export usable PNGs.
3. **A short art specification**: exact palette samples, ink thickness at normal zoom, transparency/occlusion convention, recommended export resolution, spacing/padding, and filename rules.
4. **Working sample pack**: actually replace at least a mountain, tree, village or castle, and one state variant through the public asset path. Use simple test art if needed. Prove partial replacement without editing render functions.
5. **A repeatable preview scene**: fixed seed, fixed camera, terrain variety, crowded settlement area, chunk boundary, fog edge, domain states, labels and a moving dragon. Provide the exact URL/command. Isolate preview saves.
6. **Replacement instructions**: exact files to supply, how to add a variant, select a pack, refresh caches, revert to procedural art, and diagnose failures.
7. **Implementation summary**: files changed, final schema, any remaining hard-coded map visuals, screenshots before/after, and desktop/iPad checks actually performed.

With these outputs, ChatGPT can create accurately sized PNGs and matching metadata for drop-in replacement. Do not ask the owner to measure sprites manually.

## 6. Verification and scope

Acceptance checks:
- With no art pack, existing map appearance and play still work.
- One PNG replaces one symbol family without engine edits; partial packs are supported.
- Different source resolutions preserve logical footprint and anchor.
- Invalid/missing assets fall back, and other valid assets still load.
- Seeded placements and simulation state are unchanged with overrides on/off.
- Pan/zoom, fog reveal, location selection, territory changes and save/load remain correct.
- No chunk seams, cropped mountains, stale fallback tiles or label displacement.
- Smooth parchment and nearest-neighbor actors coexist correctly.
- Desktop mouse/keyboard and iPad touch remain usable.

Follow the repository's implementation, verification, versioning, changelog and system-document rules when Claude makes the engine change. Do not bump generation/save versions for a rendering-only refactor.

This document authorizes no changes to the standalone flight demo, its controls, raid rules, fire-breath mechanics, or map generation. Those are separate work. The immediate deliverable is an extensible renderer and the measured asset handoff, with the current parchment aesthetic preserved.

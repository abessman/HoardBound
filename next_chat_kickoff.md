# Next chat kickoff

Start a new session with: **"Read next_chat_kickoff.md and continue."** (CLAUDE.md loads by itself.)

Updated 2026-10-11 · **Version 0.10.0** · Branch `claude/laughing-mayer-npu2ei` · The owner plays at hoardbound.netlify.app on an iPad.

## State in five lines
- Full loop works: explore the parchment map, raid in side-view scenes, store treasure, build the lair, sleep, wake.
- Goals (0.6), the first valley (0.7), the domain (0.8), the great struggle prototype (0.9), debug tools (0.9.1).
- Map art packs (0.10): every map symbol replaceable by PNG art with procedural fallback; artist handoff in
  `docs/map-art/README.md`; preview `?scene=mappreview`.
- 248 headless checks pass (249 on `other-seed`); the scripted browser run and the map-art browser checks pass.
- Saves and world generation unchanged since 0.8 (no GEN_VERSION bump).

## Current project: swappable map art (`map_update.md`) — done, awaiting real art
Built to the owner's brief; decisions by Claude (not yet confirmed):
- Packs live in `assets/map/packs/<name>/` (pack.json + generated pack.js so `file://` works); chosen in Settings →
  Map art or `?mappack=`. Ids and numbers: `src/data/mapspec.js`; loader `src/art/mapassets.js`.
- Sizes are logical px at zoom 1 at each family's `ref`; anchors in source px including padding; 4× export advised.
- Terrain art limited to 2.2 cells of reach (the chunk margin) at both levels of detail; refused beyond.
- Roads, rivers, coasts, washes stay procedural (restylable); labels, flags, pennants and washes never in the art.
- Terrain glyphs now draw with a per-glyph seed: stroke jitter and coastal waves moved once; positions unchanged.

Still open from the endgame project (`docs/ideas/domain-and-endgame.md`), decided by the owner:
- One opposition per world; three lieutenants open the demon king's battle (can be challenged early at a major
  disadvantage); six crystals open the god's challenge. Final battles not needed yet. Blightmother confirmed.
  Not near 1.0. Names in `src/data/endgame.js` are proposals.

## What the last session did
- 0.8.0 domain, 0.9.0 endgame prototype, 0.9.1 debug tools, 0.10.0 map art packs (contract, loader, wrappers,
  validator, exporter, catalog, contact sheets, art spec, sample and broken packs, preview scene).

## Next tasks (in order)
1. Owner: look at `?scene=mappreview&mappack=sample` on the iPad; hand `docs/map-art/` to the artist or ChatGPT.
2. When real art arrives: drop it in a new pack, run `node tools/mappack.js <pack>`, add it to `assets/map/packs.js`,
   check the preview, re-run `node tools/mapart-export.mjs --only=check,shots`.
3. Owner playtest of 0.8 and 0.9 (test starts, Menu → Debug tools); confirm the endgame names.
4. Remaining lieutenants and crystals with distinct guardians, then the two final battles.
5. Backlog: seasonal calendar events, more story templates, raid balance, duel staging, home-name label collision.

## Open questions for the owner
- Should the chosen map pack become the default for everyone once real art exists (Settings default is hand-drawn)?
- Sharper terrain at high zoom would need bigger chunk caches (about 4× memory): worth it on the iPad?
- Final battles: what should they look like? Allies' soldiers in the last battle?

## Check on the iPad
- `hoardbound.netlify.app/?scene=mappreview&mappack=sample`: test art replaces mountains, round trees, villages,
  castles (with their flag), the burned town and caravans; everything else hand-drawn. `&mappack=none` to compare.
- Settings → Map art: switches at once; back to Hand-drawn.
- `?scene=map&preset=adult-kind` / `adult-cruel`, Menu → Debug tools (0.9).

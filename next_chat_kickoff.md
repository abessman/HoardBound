# Next chat kickoff

Start a new session with: **"Read next_chat_kickoff.md and continue."** (CLAUDE.md loads by itself.)

Updated 2026-10-12 · **Version 0.12.0** · Branch `claude/laughing-mayer-npu2ei` · The owner plays at hoardbound.netlify.app on an iPad.

## State in five lines
- Full loop works: explore the parchment map, raid in side-view scenes, store treasure, build the lair, sleep, wake.
- Goals (0.6), first valley (0.7), domain (0.8), great struggle prototype (0.9), debug tools (0.9.1), map art packs
  (0.10), seven regions and territory by life phase with the grievance ledger (0.11).
- 0.12: the territory is painted by a watercolour layer (`src/art/mapfx.js`) from the real territory, blooming when
  it changes; ink discovery (sketch, pool, absorption) is built and checked in `?scene=inkpreview`, not yet on the map.
- 276 headless checks pass on the default seed; `node tools/mapart-export.mjs --only=ink` passes 20 browser checks.
- World generation is version 2 (seven regions); saves keep their version and older campaigns load their old world.

## Current project: ink discovery and watercolour (owner's request, 2026-10-12)
Asked for: discovery as faint incomplete sketches that leak nothing, then an ink drop that pools and drains into the
features (no circular wipe); revealed areas stay drawn; watercolour blooms green/gold (kind) and rust/charcoal
(cruel) tied to real territory; labels readable; placeholder art now, ChatGPT supplies PNGs and masks; a documented
asset contract (ink silhouette, reveal order, watercolour coverage) with sizes, alignment, channels, fallbacks; an
isolated preview with one mountain, forest and village; world-anchored; saves and knowledge kept; bounded for iPad;
reduced motion; reuse the art-pack system; contract and preview steps in `docs/map-art/`.
Working decisions by Claude (not confirmed):
- Contract: `docs/map-art/INK_AND_WASH.md`. Ink and reveal masks per variant, the art's exact size; wash textures
  `map.wash.benevolent|tyrannical|neutral` (square power of two, world-anchored, 8 cells per tile); bloom masks
  `map.wash.bloom`. Mask problems warn and derive; wash problems refuse the variant.
- Scope: the live map got the watercolour; the ink stays in the preview until it is wired into the chunk cache
  (cells still inking left out of the chunk, their glyphs drawn through `HB.mapInk` until drawn).
- Timings: pool 0.3 s, hold 0.15, drain 0.6; ink 0.9 s (terrain) / 1.1 s (places); colour dries 0.35 s behind.
  Caps: 24 features, 4 pools, 6 blooms, wash repaint ≤ 6 ms a frame. Cruel default colours `#b03010` / `#2c2420`.

## What the last session did
- 0.12.0: `HB.mapInk`, `HB.mapWash`, the ink preview, art-pack masks and wash ids, validator rules, sample masks,
  `--only=ink` checks and screens, the contract and preview docs.

## Next tasks (in order)
1. Owner looks at `index.html?scene=inkpreview&mappack=sample` on the iPad (Fly east, Village joins, Grow, Cruel
   rule, Motion: reduced, pan and pinch mid-animation) and the live map's watercolour; then decide on live-map ink.
2. Live-map ink discovery (if wanted): reveal events from travel → `HB.mapInk.reveal`; chunk cells held back while inking.
3. When ChatGPT's PNGs arrive: put them in a pack, `node tools/mappack.js <pack>`, judge them in the preview.
4. Castle politics (lordships, feuds, help a side or both) after the owner answers the questions in the ideas doc.
5. Backlog: remaining lieutenants and crystals, seasonal events, raid balance, home-name label collision.

## Open questions for the owner
- Should the ink replace the cloud fog on the live map, or play under the clouds as they roll back?
- Is the cruel wash rust enough (it reads rust-pink with the sample textures, deeper rust without)?
- Castle politics: feuds while you sleep too? Can a sworn castle fight in your name? How visible should borders be?

## Check on the iPad
- `index.html?scene=inkpreview&mappack=sample`: the sketch, the pool draining into the mountain, the forest's one
  pool, the village appearing with its name; buttons along the bottom; drag and pinch during the animation.
- `?scene=map&preset=adult-kind` / `adult-cruel`: the territory's watercolour; Territory (T) replays its bloom.
- Settings → Reduce motion, then the preview: fades instead of pools.

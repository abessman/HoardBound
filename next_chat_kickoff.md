# Next chat kickoff

Start a new session with: **"Read next_chat_kickoff.md and continue."** (CLAUDE.md loads by itself.)

Updated 2026-10-12 · **Version 0.13.0** · Branch `claude/laughing-mayer-npu2ei` · The owner plays at hoardbound.netlify.app on an iPad.

## State in five lines
- Full loop works: explore the parchment map, raid in side-view scenes, store treasure, build the lair, sleep, wake.
- Goals (0.6), first valley (0.7), domain (0.8), great struggle prototype (0.9), debug tools (0.9.1), map art packs
  (0.10), seven regions and territory by life phase with the grievance ledger (0.11), territory watercolour (0.12).
- 0.13: newly explored land washes in (a thin watercolour bleed from the dragon, `HB.mapReveal` in `src/art/mapfx.js`);
  the 0.12 ink discovery (drops, pools, rivulets, ink masks) was removed at the owner's request.
- 275 headless checks pass on the default seed; `node tools/mapart-export.mjs --only=wash` passes its browser checks.
- World generation is version 2 (seven regions); saves keep their version and older campaigns load their old world.

## Current project: the map's look (owner's direction, 2026-10-12)
The owner wants a **simple, thin watercolour wash that reveals new areas**, "slightly interesting", like a map
animation where colour bleeds over the parchment (an After Effects reference: a flat colour spreading with an uneven,
speckled edge). Explicitly not ink drops, streams or black ink; "we are overthinking this". The owner is **redoing the
sprites**; the art-pack system (PNG by semantic id) stays, and the washes must not depend on the art.
Working decisions by Claude (not confirmed):
- The clouds stay as the frontier of the unknown; only newly revealed land washes in (clouds over it clear early).
- Timing: 1 s to uncover a cell, starting 0.08 s later per cell from the dragon (≤ 0.7 s); tint `#8c6234` ≤ 26%,
  dries in 0.75 s. Far views (zoom < 0.8) fade cell by cell. Reduced motion: 0.3 s fade.
- 0.12's territory watercolour is unchanged (owner earlier: wants uneven pigment, pale interiors, pooled edges, small
  gaps, no blur or aura; not yet revisited).

## What the last session did
- 0.12.0 territory watercolour and ink discovery; then a stroke-based ink rebuild that the owner stopped (never pushed);
  0.13.0 the reveal wash, ink removed, `washpreview`, docs `docs/map-art/WASH.md` and `WASH_PREVIEW.md`.

## Next tasks (in order)
1. Owner looks at the live map on the iPad (fly somewhere new) and `?scene=washpreview&slow=1`; tune the wash (tint,
   speed, edge) to taste, or drop the clouds if the owner prefers land washing in from blank paper.
2. If wanted: the territory watercolour revisited along the owner's notes (uneven fronts, pale interiors, pooled edges).
3. New sprites: drop them into a pack (`assets/map/README.md`); validate with `node tools/mappack.js <pack>`.
4. Castle politics (lordships, feuds, help a side or both) after the owner answers the questions in the ideas doc.
5. Backlog: remaining lieutenants and crystals, seasonal events, raid balance, home-name label collision.

## Open questions for the owner
- Keep the clouds at the frontier, or let new land wash in straight from blank parchment?
- Is the wash's warm tint right, or should it be more colourful (like the reference's red) or fainter?
- Castle politics: feuds while you sleep too? Can a sworn castle fight in your name? How visible should borders be?

## Check on the iPad
- A campaign (or `?scene=map&preset=young-kind`): fly into unexplored land and watch it wash in behind the clouds.
- `index.html?scene=washpreview` (Fly east; Speed ¼× to see the edge; Motion: reduced).
- Settings → Reduce motion: new land fades in quickly instead.

# Next chat kickoff

Start a new session with: **"Read next_chat_kickoff.md and continue."** (CLAUDE.md loads by itself.)

Updated 2026-10-12 · **Version 0.16.0** · Branch `claude/laughing-mayer-npu2ei` (also the repo's default branch) ·
The owner plays at hoardbound.netlify.app on an iPad.

## State in five lines
- Full loop works: explore the parchment map, raid in side-view scenes, store treasure, build the lair, sleep, wake.
- Goals (0.6) … territory watercolour (0.12), reveal wash (0.13), Illuminated parchment map pack (0.14–0.15, by Codex).
- 0.16: the **pixel editor** (`editor/`, guide `docs/pixel-editor.md`) for the owner to redraw the game's pixel art and
  commit it to `assets/pixelart/` through the GitHub API; the game loads it at start (`src/art/pixelart.js`).
- 279 headless checks pass on both seeds (one more per drawn art file); `node tools/illuminated-check.mjs` covers the pack.
- World generation is version 2 (seven regions); saves keep their version and older campaigns load their old world.

## Two sessions push to this branch, and so does the owner's editor
- Codex sessions did 0.14–0.15; Claude did 0.16. The editor commits art straight to the default branch.
- **Always `git fetch` and rebase or merge before pushing; never reformat files in `assets/pixelart/`.**

## Current project: the owner redraws the pixel art (2026-10-12)
The owner disliked AI-generated art and asked for a simple in-house pixel tool: every frame of an animation, click a
frame and draw, copy between frames, colour picker and eyedropper, fill, box select, copy/paste, delete, shapes, play
the animation, a sample map for map sprites, saved in GitHub so it can be edited later. Asked about Supabase: answered
no (a backend breaks the no-backend rule; files in the repo are versioned for free).
Working decisions by Claude (not confirmed by the owner):
- Saving: one commit per save (Git Data API) with a fine-grained token (Contents read/write, this repo only) kept in
  localStorage. Last save wins; no merge of two devices' edits to the same sprite.
- New sprites start blank at the game's size and anchor, with the game's drawing faintly behind ("From game art"
  copies it in). Imports merge near-identical colours; up to 62 colours a sprite.
- Dragon: one drawing per tier × pose × frame serves every breed and alignment (no breed tint, mutations or scars on
  drawn art yet). Anchor = body centre. Raid sprites: frame 1 only, always bottom-centre (raidview ignores anchors).
- Map symbols: frames are variants in the separate "Pixel art (editor)" pack (pixel sampling, `scale` map px a pixel).
  A pack is chosen whole, so picking it means undrawn symbols fall back to the original ink, not to Illuminated.
- Previews: Play at the saved fps; Sample map; "in game" buttons open `?scene=dragons` or
  `?scene=mappreview&mappack=pixel` with `&drafts=1` (unsaved drafts from this browser).

## 0.15 Illuminated map (Codex, summary)
- Illuminated has 39 PNGs, 96 ids, ink details, every glyph family and state, all home stages; default for new
  settings. `?scene=artcatalog&mappack=illuminated` shows every symbol. Map dragon marker uses breed tint and tier scale.
- Backups: `backup/map-before-illuminated-2026-10-12` (0.13), `backup/map-first-art-pack-2026-10-12` (0.14).

## Next tasks (in order)
1. The owner sets up a token and draws; respond to what the editor lacks (likely: layers, breed palettes, walk cycles,
   scaling or rotating a selection, bigger canvases).
2. Let editor map symbols layer over another pack (drawn ids from `pixel`, the rest from Illuminated) if the owner
   wants both; discuss first.
3. If drawn dragons should keep breed colours: palette swap by breed or drawn layers; discuss before building.
4. Raid walk cycles: let raidview play a sprite's frames while moving (the editor already stores frames).
5. Owner review of Illuminated and the 0.13 wash on the iPad; castle politics after the ideas-doc questions.

## Open questions for the owner
- Should drawn dragons take the breed's colours automatically, or will you draw each breed?
- Do raid people need walk/attack frames in the game now that you can draw them?
- Map: your drawn symbols on top of Illuminated, or a pixel-art map of their own?
- Keep the clouds at the frontier? Is the wash tint right? Castle politics questions in the ideas doc.

## Check on the iPad
- https://hoardbound.netlify.app/editor/ → GitHub… (token) → "Dragon · Young · fly" → draw → ▶ Play → Dragons in
  game ↗ → Save to GitHub; after the redeploy (a minute or two) the game shows it.
- A map symbol: draw it, Sample map, Map in game ↗; in the game Settings → Map art → Pixel art (editor).

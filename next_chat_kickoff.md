# Next chat kickoff

Start a new session with: **"Read next_chat_kickoff.md and continue."** (CLAUDE.md loads by itself.)

Updated 2026-10-13 · **Version 0.23.0** · Branch `claude/laughing-mayer-npu2ei` (also the repo's default branch) ·
The owner plays at hoardbound.netlify.app on an iPad.

## State in five lines
- Full loop works: explore the parchment map, raid in side-view scenes, store treasure, build the lair, sleep, wake.
- … reveal wash (0.13), Illuminated map pack (0.14–0.15, Codex), pixel editor saving to GitHub (0.16).
- 0.17–0.19: lair dragon on its hoard and the rooms view; editor picture behind, undo/redo, layers, converter, colour
  wheel, saved palettes. 0.20: mountains in three sizes, one legendary peak per region (`map.landmark.peak`, idea doc
  `docs/ideas/landmarks.md`), crop and anchor buttons, variants at their drawn size (MAP_SPEC `drawnK`).
- The owner's art so far: `map.terrain.mountain` (64×54 canvas, drawing 55×32, layers "Layer 1" and "converted",
  scale 0.5, anchor 28,31 (mid-height; the foot would be 31,44)). It draws on every mountain kind until the others
  are drawn.
- 284 headless checks pass on both seeds (one more per drawn art file).
- World generation is version 2 (seven regions); saves keep their version and older campaigns load their old world.

## Several writers push to this branch
- Codex sessions (0.14–0.15), Claude (0.16–0.23), and the owner's editor (art commits to `assets/pixelart/`).
- **Always `git fetch` and rebase or merge before pushing; never reformat files in `assets/pixelart/`.**

## Editor working decisions (0.18, not confirmed by the owner)
- Layers: frames belong to every layer; Copy/Paste frame carry all layers; the eyedropper picks what is visible; a
  hidden layer is left out of the game (eye = in game). A single plain "Layer 1" is saved as `frames` as before.
- Converter defaults: 10 colours, dark lines 35, line pickup 22%, paper removal 30, colour boost 120%; Apply makes
  "lines" above "colours" layers (colours filled under the lines up to 4 px); pictures sampled up to 10×10 per pixel.

## Current project: the lair and the owner's art (2026-10-12)
Owner asked: new art should appear in the editor; a much larger, more detailed dragon in the lair, perched on its
hoard idling and sleeping on it; a more detailed lair that zooms out into a group of rooms for the add-ons ("not yet
sure how I want to visualize the addons", will draw and design later); the hoard stays generated; a picture behind
the pixels in the editor; undo/redo buttons with at least 10 steps.
Working decisions by Claude (not confirmed by the owner):
- Lair pictures are 345×194 shown at exactly 2× (crisp pixels); the dragon is about twice raid size (body length
  40/60/84/104 by tier); placeholders are the composed dragon drawn bigger, in the breed's colours. Drawn art replaces
  them for every breed (as with the raid dragon).
- Rooms view: fixed slots in `HB.lairArt.ROOMS` (entrance, guard post, lookout, hoard, strongroom, sleeping chamber,
  forge, larder, cells; traps, ward and concealment drawn on the passage and the mouth). Unbuilt rooms show as dotted
  outlines to show what is possible; tapping opens the Build tab. The dragon sleeps on the hoard even with a
  sleeping chamber built.
- Each room and both backdrops are editable art with one frame per level; the hoard, trophies, flames, workers,
  captives, construction and light stay generated on top.
- Editor picture behind: per sprite in IndexedDB (not in GitHub). Undo history ≥ 20 steps (≤ 120).

## Latest: the owner's asks of 2026-10-13 (0.21–0.22, built)
- The map's paper now moves and scales with the map (was still while the ink panned: "floats on top").
- Editor: parchment under the drawing (eyedropper picks it); spreadsheet selection (tap/drag, Ctrl/Cmd/Shift or ＋ Add,
  Select drawn); opacity slider for the selection; Show Normal/Good/Evil with an adjustable automatic tint.
Working decisions by Claude (not confirmed by the owner):
- Opacity is real transparency (`#rrggbbaa` palette colours), not baked with the paper: the owner leaned that way so a
  parchment change carries through; washes and fog show through too. The editor shows layers merged as the game does.
- Tones: good = hue +6, colour +15%, light +8%, 12% toward #e2c75c; evil = hue −12, colour −40%, light −18%, 20%
  toward #4a1c1c (`HB.pixelArt.TONES`). Used for drawn dragons (alignment ≤ −30 / ≥ 30), lair art (its dragon's),
  map symbols on blighted or flourishing cells. Raid sprites untinted. Jagged mountains fall back to the pack's mountain.
- Paper texel = zoom / 1.5 screen px (clamped 0.5–1.6); the editor's underlay uses the same scale for map symbols.
- 0.22 (owner: wash settable per sprite, by layer; transparency by layer): layers have opacity and wash (0–100,
  default 100); layers now stack with real transparency (was topmost pixel wins). The wash cut-out works for pixel-pack
  map symbols only (chunks carry a `washCut` canvas when any art uses it); places and landmarks are drawn over the
  wash and never washed. The editor previews the wash as a flat colour (kind 30%, cruel 36%), not the watercolour.

## 3D map test (0.23, owner asked for a separate test)
- Settings → 3D map test or `?scene=map3d`; design notes and open questions in `docs/ideas/map-3d.md`. The owner liked
  tilt flattening with zoom, a limited zoom with an Overview button, turning with names facing the camera.

## Next tasks (in order)
1. Owner looks at the lair (hoard and all rooms) and the sleep screen on the iPad, then draws: the lair dragon poses
   first (Lair · dragon), then the chamber and rooms. Adjust slots and sizes to the owner's drawings.
2. How upgrades should look in the rooms view (owner's design to come): possibly drawn room cards per level.
3. Raid walk cycles; breed palettes for drawn dragons; editor asks (layers, rotate or scale a selection).
4. Owner review of Illuminated and the 0.13 wash; castle politics after the ideas-doc questions.

## Open questions for the owner
- Are the automatic good and evil tints right? Should raid sprites (villagers, knights) take tones too, and from what?
- Converter: are the defaults close for your drawings (pencil vs ink, paper colour)? Want a dithering option?
- Is the lair dragon big enough? Should it sit (folded wings, curled tail) rather than stand on the pile?
- With a sleeping chamber built, should the dragon sleep there instead of on the hoard?
- Rooms view: is a hill cross-section the right picture, or a map of chambers, or room cards?
- Should drawn dragons take the breed's colours automatically, or will you draw each breed?

## Check on the iPad
- In a campaign: Lair (H) → the dragon on its hoard; All rooms (or pinch) → tap a room; Sleep → the sleep screen.
- Quick look without a campaign: `index.html?scene=lair&view=rooms` (or `&preset=none` for the hatchling's cave).
- https://hoardbound.netlify.app/editor/ → Lair · dragon → Image behind… → draw → two-finger tap to undo →
  Lair in game ↗.

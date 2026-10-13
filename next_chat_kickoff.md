# Next chat kickoff

Start a new session with: **"Read next_chat_kickoff.md and continue."** (CLAUDE.md loads by itself.)

Updated 2026-10-13 · **Version 0.25.0** · Branch `claude/laughing-mayer-npu2ei` (also the repo's default branch) ·
The owner plays at hoardbound.netlify.app on an iPad.

## State in five lines
- Full loop works: explore the parchment map, raid in side-view scenes, store treasure, build the lair, sleep, wake.
- … reveal wash (0.13), Illuminated map pack (0.14–0.15, Codex), pixel editor saving to GitHub (0.16).
- 0.17–0.19: lair dragon on its hoard and the rooms view; editor picture behind, undo/redo, layers, converter, colour
  wheel, saved palettes. 0.20: mountains in three sizes, one legendary peak per region (`map.landmark.peak`, idea doc
  `docs/ideas/landmarks.md`), crop and anchor buttons, variants at their drawn size (MAP_SPEC `drawnK`).
- The owner's art so far: `map.terrain.mountain` (55×30, layer "converted", scale 0.5, anchor at the foot; a second
  frame in the owner's unsaved draft becomes variant `#2` when the editor opens it). It draws on every mountain kind until the others are drawn.
- 285 headless checks pass on both seeds (one more per drawn art file).
- World generation is version 2 (seven regions); saves keep their version and older campaigns load their old world.

## Several writers push to this branch
- Codex sessions (0.14–0.15), Claude (0.16–0.25), and the owner's editor (art commits to `assets/pixelart/`).
- **Always `git fetch` and rebase or merge before pushing; never reformat files in `assets/pixelart/`.**

## Editor working decisions (0.18, not confirmed by the owner)
- Layers: frames belong to every layer; Copy/Paste frame carry all layers; the eyedropper picks what is visible; a
  hidden layer is left out of the game (eye = in game). A single plain "Layer 1" is saved as `frames` as before.
- Converter defaults: 10 colours, dark lines 35, line pickup 22%, paper removal 30, colour boost 120%; Apply makes
  "lines" above "colours" layers (colours filled under the lines up to 4 px); pictures sampled up to 10×10 per pixel.

## The lair (0.17, decisions not yet confirmed by the owner; details in docs/systems/lair-and-economy.md)
- Pictures 345×194 at 2×; lair dragon about twice raid size; rooms view with fixed slots (`HB.lairArt.ROOMS`), unbuilt
  rooms dotted, tap opens Build; rooms and backdrops are editable art per level, the hoard and light stay generated.

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
- 0.22: layer opacity and wash (0–100), real transparency between layers; wash cut-outs for pixel-pack map symbols
  only (places and landmarks are never washed); the editor previews the wash as a flat colour.

## 3D map test (0.23, owner asked for a separate test)
- Settings → 3D map test or `?scene=map3d`; design notes and open questions in `docs/ideas/map-3d.md`. The owner liked
  tilt flattening with zoom, a limited zoom with an Overview button, turning with names facing the camera.

## Variants and versions (0.24, owner's ask)
- Owner: variants must be separate sprites picked at random (large_mountain1, 2…), and Normal/Good/Evil must be real,
  drawable versions of any sprite ("more serene, pointier with a curl, lava…"), replacing the tyrant duplicates.
- Ids `<id>#n` and `<id>@good|@evil`, one file each; the tint stays the fallback per variant; FOLDED in editor.js hides
  the jagged mountains and bare/burned trees (still in mapspec for packs).

## Map groupings and lighting (0.25)
- Owner showed the Tolkien map: chains, dense forests, clumps, open paper (built, tune by eye). Shaded sprites must
  not mirror (now opt-in `mirror`). Owner asked (talk only) about outline + a shading mask for lighting: answered
  feasible (light/shadow mask painted for a light from the left; the game relights mirrored or turned sprites).

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

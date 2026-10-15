# Next chat kickoff

Start a new session with: **"Read next_chat_kickoff.md and continue."** (CLAUDE.md loads by itself.)

Updated 2026-10-15 · **Version 0.35.0** · Branch `claude/laughing-mayer-npu2ei` (also the repo's default branch) ·
The owner plays at hoardbound.netlify.app on an iPad.

## State in five lines
- Full loop works: explore the parchment map, raid in side-view scenes, store treasure, build the lair, sleep, wake.
- … reveal wash (0.13), Illuminated map pack (0.14–0.15, Codex), pixel editor saving to GitHub (0.16).
- 0.17–0.19: lair dragon on its hoard and the rooms view; editor picture behind, undo/redo, layers, converter, colour
  wheel, saved palettes. 0.20: mountains in three sizes, one legendary peak per region (`map.landmark.peak`, idea doc
  `docs/ideas/landmarks.md`), crop and anchor buttons, variants at their drawn size (MAP_SPEC `drawnK`).
- The owner's art so far: `map.terrain.mountain` (+ `#2`), `map.terrain.mountain.small`, `map.terrain.hill` and
  `dragon.0.idle` (60×60, 7 frames). The mountain draws on every mountain kind until the others are drawn.
- 292 headless checks pass on both seeds (one more per drawn art file).
- World generation is version 2 (seven regions); saves keep their version and older campaigns load their old world.

## Several writers push to this branch
- Codex sessions (0.14–0.15), Claude (0.16–0.30), and the owner's editor (art commits to `assets/pixelart/`).
- **Always `git fetch` and rebase or merge before pushing; never reformat files in `assets/pixelart/`.**

## Editor working decisions (0.18, not confirmed by the owner)
- Layers: frames belong to every layer; Copy/Paste frame carry all layers; the eyedropper picks what is visible; a
  hidden layer is left out of the game (eye = in game). A single plain "Layer 1" is saved as `frames` as before.
- Converter defaults: 10 colours, dark lines 35, pickup 22%, paper 30, boost 120%; Apply makes lines over colours.

## The lair (0.17, decisions not yet confirmed by the owner; details in docs/systems/lair-and-economy.md)
- Pictures 345×194 at 2×; lair dragon about twice raid size; rooms view with fixed slots (`HB.lairArt.ROOMS`), unbuilt
  rooms dotted, tap opens Build; rooms and backdrops are editable art per level, the hoard and light stay generated.

## Art decisions of 0.21–0.24 (Claude's, not confirmed unless said)
- The map's paper moves with the map (paper texel = zoom / 1.5 screen px, clamped 0.5–1.6). Editor: parchment under,
  spreadsheet selection, selection opacity = real transparency (`#rrggbbaa`, the owner leaned that way).
- Tones (`HB.pixelArt.TONES`): good = hue +6, colour +15%, light +8%, 12% toward #e2c75c; evil = hue −12, colour −40%,
  light −18%, 20% toward #4a1c1c; for drawn dragons (alignment ±30), lair art, map symbols on blighted or flourishing
  cells. 0.22: layer opacity and wash (pixel-pack map symbols only).
- 0.23 3D map test (Settings, `?scene=map3d`, `docs/ideas/map-3d.md`): the owner liked tilt flattening with zoom.
- 0.24 (owner's ask): variants are separate drawings `<id>#n` picked at random; Normal/Good/Evil are real drawable
  versions `<id>@good|@evil` (the tint stays the fallback); FOLDED hides the jagged mountains and bare/burned trees.

## Map groupings and lighting (0.25)
- Owner showed the Tolkien map: chains, dense forests, clumps, open paper (built, tune by eye). Shaded sprites must
  not mirror (now opt-in `mirror`). Owner asked (talk only) about outline + a shading mask for lighting: answered
  feasible; 0.26 built shading layers (marks 1/2/3 for a light from the left, `PA.composite`; mirrored symbols get a
  relit pre-mirrored variant). Next: relight with the 3D test's turning and for dragons facing the other way.

## Lighting (2026-10-14)
- Dynamic shading (a sun around outline-only symbols: etching, cel shading, a small 3D map) was tested on a page and
  **saved for a future project**: `docs/ideas/dynamic-shading.md` + the page `docs/ideas/dynamic-shading-test.html`.
  The owner keeps drawn (static) shadows for now but wants **local lights** around the map.
- 0.27 built them: + Light layers in the editor (marks 1 fire, 2 window, 3 lantern, 4 magic, 5 embers; glow, reach;
  night preview), Settings → Time of day on the map (Day / Dusk / Night, `?time=night`), lights glowing for places,
  travellers and the dragon; places without drawn lights get a few by kind. Claude's choices (not confirmed): the
  five kinds and colours, night = multiply toward rgb(72,80,128), pools 2.4× the light's reach. Not yet: glowing
  terrain symbols, lights in raids and the lair, a real day/night cycle.
- 0.28 (owner's ask): directional sprites. Facing 2 / 4 / 8 in the editor (compass grid), each direction its own
  drawing and animation (`<id>>n`, `dirs` on the plain east drawing); missing ones mirror or borrow (`PA.pickDir`).
  The overworld dragon turns 8 ways when `dragon.<tier>.fly` is drawn in directions (the drawn pose wins over the
  pack's marker); travellers turn with pixel-pack markers. Choices (not confirmed): 4 = E W N S (diagonals go to the
  side), new directions start as copies, map markers stay unanimated (frames are variants), raids face left or right.
- 0.28.1 (owner's ask): drawn animations play all frames at their fps (`HB.dragonArt.frameAt`; raids `HB.art.at`).
- 0.29 (owner's ask): drop pictures from Explorer onto frame boxes (`loadPics` in editor.js). Choices (not confirmed):
  name order, empty drawings take the picture's size, smaller ones bottom middle, bigger ones shrunk, k× read at 1×.
- 0.30 (owner: each GitHub push redeploys Netlify at a cost): editor Save locally (`hb.pixelart.local`), Settings →
  Your drawings → Local test (`artSource`, `PA.useSource`, live on `storage` events); 0.30.1 one tab each (`HB.openTab`).
  0.31-0.34: sepia, brightness per version; light intensity, smoke, Shows at day/dusk/night; Compare (in-game sizes).

## Next tasks (in order)
1. The owner tries Save locally + Local test, dropping pictures onto frames, Facing, and a light layer at night.
2. Owner looks at the lair (hoard and all rooms) and the sleep screen on the iPad, then draws: the lair dragon poses
   first (Lair · dragon), then the chamber and rooms. Adjust slots and sizes to the owner's drawings.
3. How upgrades should look in the rooms view (owner's design to come): possibly drawn room cards per level.
4. Raid sprites: separate walk/idle/fight animations (0.28.1 loops all frames); breed palettes for drawn dragons; editor asks (layers, rotate or scale a selection).
5. Owner review of Illuminated and the 0.13 wash; castle politics after the ideas-doc questions.

## Open questions for the owner
- Map look: quiet sepia terrain drawn bigger, thin roads, places with one accent colour? (editor's Map look test, 0.35)
- Are the automatic good and evil tints right? Should raid sprites (villagers, knights) take tones too, and from what?
- Is the lair dragon big enough? Should it sit (folded wings, curled tail) rather than stand on the pile?
- With a sleeping chamber built, should the dragon sleep there instead of on the hoard?
- Rooms view: is a hill cross-section the right picture, or a map of chambers, or room cards?
- Should drawn dragons take the breed's colours automatically, or will you draw each breed?

## Check on the iPad
- In a campaign: Lair (H) → the dragon on its hoard; All rooms (or pinch) → tap a room; Sleep → the sleep screen.
- Quick look without a campaign: `index.html?scene=lair&view=rooms` (or `&preset=none` for the hatchling's cave).
- https://hoardbound.netlify.app/editor/ → Lair · dragon → Image behind… → draw → two-finger tap to undo →
  Lair in game ↗.

# Next chat kickoff

Start a new session with: **"Read next_chat_kickoff.md and continue."** (CLAUDE.md loads by itself.)

Updated 2026-10-13 · **Version 0.18.1** · Branch `claude/laughing-mayer-npu2ei` (also the repo's default branch) ·
The owner plays at hoardbound.netlify.app on an iPad.

## State in five lines
- Full loop works: explore the parchment map, raid in side-view scenes, store treasure, build the lair, sleep, wake.
- … reveal wash (0.13), Illuminated map pack (0.14–0.15, Codex), pixel editor saving to GitHub (0.16).
- 0.17: the lair opens on a large dragon perched on its generated hoard (asleep on it while sleeping, also on the
  sleep screen); zoom out to every room of the hill; the art registry `HB.art` feeds the editor's list; the editor
  gained a picture behind the pixels and visible undo/redo with finger taps. 0.17.1: a Pixel Editor button on the
  title screen and in Settings (`HB.openEditor`, new tab or same tab after an autosave).
- 0.18 (editor): named layers saved in the sprite file (`layers`, bottom first; the game merges visible ones, hidden
  stay out), and a picture → pixels converter working from the image behind (ink threshold, line pickup, paper
  removal, colour count or palette snap, colour boost, outline; live preview; applies into a new layer).
- 280 headless checks pass on both seeds (one more per drawn art file).
- World generation is version 2 (seven regions); saves keep their version and older campaigns load their old world.

## Several writers push to this branch
- Codex sessions (0.14–0.15), Claude (0.16–0.18), and the owner's editor (art commits to `assets/pixelart/`).
- **Always `git fetch` and rebase or merge before pushing; never reformat files in `assets/pixelart/`.**

## Editor working decisions (0.18, not confirmed by the owner)
- Layers: frames belong to every layer; Copy/Paste frame carry all layers; the eyedropper picks what is visible; a
  hidden layer is left out of the game (eye = in game). A single plain "Layer 1" is saved as `frames` as before.
- Converter defaults: 10 colours, dark lines 35 (luma < 63), line pickup 22%, paper removal 30 (the corners' colour),
  colour boost 120%. 0.18.1: Keep (lines and colours / lines only / colours only); Apply defaults to two new layers,
  "lines" above "colours", the colour layer filled under the lines from neighbouring colours (up to 4 px).
  Large pictures are sampled up to 10×10 per pixel.

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

## Next tasks (in order)
1. Owner looks at the lair (hoard and all rooms) and the sleep screen on the iPad, then draws: the lair dragon poses
   first (Lair · dragon), then the chamber and rooms. Adjust slots and sizes to the owner's drawings.
2. How upgrades should look in the rooms view (owner's design to come): possibly drawn room cards per level.
3. Raid walk cycles; breed palettes for drawn dragons; editor asks (layers, rotate or scale a selection).
4. Owner review of Illuminated and the 0.13 wash; castle politics after the ideas-doc questions.

## Open questions for the owner
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

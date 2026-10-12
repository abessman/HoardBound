# Pixel editor

A drawing tool for the game's own pixel art: the dragon frame by frame, the lair (the big dragon on its hoard, the
chamber, the rooms), the raid sprites, and map symbols. Your
drawings are saved as small files in the repository (`assets/pixelart/`), so they are versioned like the code and
anyone (or any Claude session) can edit them later. Nothing else is needed: no account but GitHub, no backend.

Open it at **https://hoardbound.netlify.app/editor/** (or `editor/index.html` locally, even from `file://`).
Works with a mouse, a pen or a finger; the layout fits an iPad in landscape.

## First time: let it save to GitHub
1. GitHub → Settings → Developer settings → **Fine-grained tokens** → Generate new token.
2. Repository access: **Only select repositories** → `abessman/HoardBound`. Permissions → Repository →
   **Contents: Read and write** (nothing else). Pick an expiry you are comfortable with.
3. In the editor: **GitHub…** → paste the token → Keep. It stays in this browser only (localStorage) and is sent
   only to api.github.com. **Forget token** removes it. Do it once per device.

Without a token you can still draw: unsaved work is kept in the browser, and **Download** gives you the file to
commit by hand.

## Drawing
- **Left:** everything you can draw, grouped: the dragon by size (hatchling, young, adult, ancient) and pose; the lair
  (the dragon on its hoard and asleep on it, the chamber, the hill and every room); people, animals, treasure and
  props from the raids; map symbols. ● marks what you have drawn, ✎ what is unsaved. The list comes from the game
  itself, so new art added to the game shows up here without changing the editor.
- **Frames strip:** every frame of the animation (the dragon's poses have 2 or 4, as the game plays them). Tap a frame
  to draw on it. **Duplicate**, **+ Blank**, **Delete**, ◀ ▶ to reorder, **Copy frame / Paste frame** between frames
  or sprites, **From game art** to start from the game's current drawing.
- **Tools:** pencil, eraser, fill, eyedropper (or hold Alt), select a box, move, line, rectangle, filled box, ellipse,
  filled disc, anchor. Brush 1–3 px; **mirror** paints both halves at once. Shapes: drag; Shift keeps them square.
- **Select, copy, paste:** drag a box with Select; drag inside it to move those pixels; Copy / Cut / Paste / Delete /
  Flip. A paste floats until you tap elsewhere or press Enter, so you can drag it into place first.
- **Colours:** tap a swatch from this sprite's colours or from the game's palette, or pick any colour with the colour
  box. **Recolour swatch** changes that colour everywhere in the sprite. Up to 62 colours per sprite.
- **Helpers:** onion skin (the previous frame, faint), game art behind (the current drawing, faint, to trace or size
  against), grid, zoom (pinch, wheel, − Fit +), pan with two fingers or Space + drag.
- **Your own picture behind:** **Image behind…** loads any picture (a sketch, a photo of a drawing) behind the pixels
  to draw over. Set its opacity and size, **Move it** (then drag on the canvas), show it **On top** of the pixels, or
  remove it (✕). The eyedropper picks its colours where a pixel is still empty. Each sprite keeps its own picture in
  this browser (not saved to GitHub).
- **Preview:** ▶ Play runs the animation at its game speed (fps is saved with the sprite), at 1–4× over a raid,
  parchment, dark or checker background. **Sample map** shows your map symbols scattered over parchment at map zoom.
- **Dragons in game ↗ / Lair in game ↗ / Map in game ↗** open the game's dragon sheet, a test campaign's lair (the
  right dragon size, the rooms view for room art, asleep for the sleeping pose) or the map preview, with your unsaved
  drawings.
- **Undo / Redo** (top right, with how many steps there are): up to 120 steps per sprite (at least 20 on the biggest
  canvases), including colour, fps and scale changes. On the iPad: **tap with two fingers to undo, three to redo**.
  **Revert** drops a sprite's unsaved changes; **Delete art** removes your drawing so the game's own art comes back.
- Canvases go up to 512 × 512 (**Resize**).

Keys (with a keyboard): B pencil, E eraser, G fill, I eyedropper, M select, V move, L line, R / Shift+R rectangle /
box, O / Shift+O ellipse / disc, A anchor, P play, ← → frames, Ctrl/Cmd+Z / Shift+Z / Y undo / redo, Ctrl/Cmd+C X V,
Delete, Enter (drop a paste), Esc (cancel it), Ctrl/Cmd+S save.

## What the game does with it
- **Lair** (0.17): `lair.dragon.<size>.perch` is the dragon sitting on its hoard (frames loop at their fps) and
  `.sleep` asleep on it (also the sleep screen); put the anchor ⊕ where it rests on the pile. `lair.chamber` is the
  chamber behind it (345×194, frame 1 the bare cave, then one frame per Treasure Chamber level); `lair.hill` is the
  zoomed-out backdrop and `lair.room.<name>` each room (one frame per level). The hoard, trophies, torch flames,
  workers and light are drawn on top, so leave room for them.
- **Dragon** (`dragon.<tier>.<pose>`): frame k replaces that pose's frame k for every breed and alignment (the game's
  colour changes by breed and deed are not applied to drawn art yet). The anchor ⊕ marks the body centre: the
  game places and rotates the dragon around it. Size tiers 0–3 are hatchling to ancient; keep each tier's canvas
  size close to the game's (the editor starts from it).
- **Raid sprites** (people, animals, treasure, props): the first frame replaces the sprite. The game always stands a
  sprite on its bottom edge, centred, in the 320×180 scene drawn 4× larger: draw the feet on the last row.
- **Map symbols** (`map.…` ids): each frame is a variant; the map picks one per symbol and keeps it. They are drawn
  pixel-sharp at `scale` map pixels per pixel (map pixels at zoom 1; the cells are 22). Choose **Pixel art (editor)**
  in Settings → Map art to see them; anything you have not drawn stays hand-drawn. The anchor ⊕ sits on the symbol's
  spot (a mountain's foot, a village's centre). Terrain may reach about 2 cells from its anchor; bigger is refused.

## Saving
**Save to GitHub** commits every changed sprite in one commit to the repository's default branch (or the branch set
in GitHub…), with a message naming them. The site redeploys from it in a minute or two. Opening the editor with a
token also brings in drawings saved from another device that the site does not have yet. Unsaved changes stay in this
browser until you save or revert them (the editor says so when you come back). Two devices editing the same sprite:
the last save wins.

## The files
`assets/pixelart/index.js` lists the files; each `assets/pixelart/<id>.js` holds one sprite as readable text:
```js
HB.pixelArt && HB.pixelArt.add({
 "id": "knight", "kind": "sprite", "w": 8, "h": 12, "anchor": [4,12], "fps": 2,
 "palette": ["#2a1c22","#aab0bb","#4e535d","#8a3e3e"],
 "frames": [
  { "rows": [
   "..000...",
   ".01110..",
   …
  ] }
 ]
});
```
Each row is one character per pixel: `.` is clear, `0-9 a-z A-Z` index the palette. Map symbols add `scale` and
`flip` (may be mirrored); the dragon adds `bodyLength`. They are classic scripts, so the game loads them from
`file://` too (`src/art/pixelart.js`). Safe to edit by hand; the editor rewrites a file when you save that sprite.
`node tools/test.js` checks every file: rows and widths, palette indices, ids, the anchor, and that `index.js` lists
them all.

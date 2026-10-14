# Pixel editor

A drawing tool for the game's own pixel art: the dragon frame by frame, the lair (the big dragon on its hoard, the
chamber, the rooms), the raid sprites, and map symbols. Your
drawings are saved as small files in the repository (`assets/pixelart/`), so they are versioned like the code and
anyone (or any Claude session) can edit them later. Nothing else is needed: no account but GitHub, no backend.

Open it from the game (**Pixel Editor** on the title screen, or Settings → **Pixel editor**), or at
**https://hoardbound.netlify.app/editor/** (or `editor/index.html` locally, even from `file://`).
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
- **Variants strip** (map symbols, instead of frames): each variant is its own drawing with its own canvas, size,
  anchor and layers; the map picks one at random for each spot. **+ New variant** (blank, the size of this one),
  **Duplicate variant**, **Delete variant**. An older drawing with several frames is split into variants when opened.
  Variant 1 is the main drawing and stays while other variants exist. A deleted variant shows faded in the strip until
  you save; **Revert** brings it back.
- **Tools:** pencil, eraser, fill, eyedropper (or hold Alt), select a box, move, line, rectangle, filled box, ellipse,
  filled disc, anchor. Brush 1–3 px; **mirror** paints both halves at once. Shapes: drag; Shift keeps them square.
- **Select, copy, paste:** with Select, tap a pixel or drag a box; hold Ctrl, Cmd or Shift (or turn on **＋ Add**, for
  the iPad) to add more pixels or boxes; **Select drawn** takes every drawn pixel of this frame on your layer. Drag
  inside the selection to move those pixels; Copy / Cut / Paste / Delete / Flip work on any selection shape. A paste
  floats until you tap elsewhere or press Enter, so you can drag it into place first.
- **Opacity:** the slider sets how solid the selected pixels are (100% solid, lower lets what is under the sprite show
  through, such as the map's parchment). Each see-through colour is its own colour (`#rrggbbaa`, also typeable in
  the colour box), so the sprite's colours list shows it over a checker. They stay see-through in the game, so a
  later change to the paper or a territory wash shows through as well.
- **Versions: Normal / Good / Evil.** Every sprite (each variant too) has a good and an evil version, used in a kind or
  a cruel setting. Until you draw one, Good or Evil shows the game's automatic tint of the normal drawing, with sliders
  to adjust it (hue, colour, light, a tint colour and its strength; **Reset tint** goes back). **✎ Draw the evil
  version** makes it its own drawing, starting from the tinted picture: change it as much as you like (another
  shape, lava, a curl). **Use the automatic tint** removes your drawing again. The tyrant's mountains and the bare and
  burned trees are no longer separate entries: they are the mountain's and the broadleaf tree's evil versions.
- **Facing: 2, 4 or 8 directions** (dragons, lair pictures, raid sprites and the map's travellers and dragon marker).
  The plain drawing faces east (right). Pick how many directions the sprite uses, then tap a direction in the compass
  grid to draw it: each is its own drawing with its own frames (its own animation), size and anchor. A new direction
  starts as a copy of what the game shows there now (mirrored from the other side). Until you draw one, the game
  mirrors the other side (west from east, north-west from north-east) or borrows the nearest drawn direction; the
  grid shows those faded. On the map the dragon turns to the way it flies (your drawn flying pose wins over the map
  art's marker), and travellers turn as they go.
- **Colour wheel:** drag around the dial for the colour, towards the edge for a stronger one, and on the bar beside it
  for lighter or darker; or type a code (`#3366cc`). It changes the colour you draw with: a colour nothing is drawn in
  yet changes as you drag (no pile of in-between colours); a colour already in the drawing is left alone and you get a
  new one, unless you tick **change it everywhere**, which recolours that colour across the sprite as you drag (one
  undo step). The small swatch under the big one is the colour before your last change: tap it to go back.
- **Colours:** tap a swatch from this sprite's colours or the game's colours. Up to 62 colours per sprite.
- **Saved palettes:** keep sets of colours you like under a name (map, map good, map evil…). **+ New** starts one from
  this sprite's colours; **+ Colour** adds the colour you draw with; **− Colour** then a tap takes one out; tap a
  colour in it to draw with it; **Use all** puts them all in this sprite's colours; **Rename**, **Delete**. Palettes are
  saved to GitHub with your next **Save to GitHub** (in `assets/pixelart/palettes.js`), so every device has them.
- **Helpers:** onion skin (the previous frame, faint), game art behind (the current drawing, faint, to trace or size
  against), **parchment under** (the map's own paper behind the drawing at map scale; the eyedropper then picks the
  paper's colour where nothing is drawn, to match colours to it), grid, zoom (pinch, wheel, − Fit +), pan with two fingers or Space + drag.
- **Your own picture behind:** **Image behind…** loads any picture (a sketch, a photo of a drawing) behind the pixels
  to draw over. Set its opacity and size, **Move it** (then drag on the canvas), show it **On top** of the pixels, or
  remove it (✕). The eyedropper picks its colours where a pixel is still empty. Each sprite keeps its own picture in
  this browser (not saved to GitHub).
- **Layers** (right side): give a sprite a few named layers, for example a sketch, the lines and the colours. You
  draw on the highlighted one; tap a layer to switch, ◉ / ◌ to show or hide it, **+ New**, **Dup**, ▲ ▼ to reorder,
  **Rename**, **Merge down**, **Delete** (all undoable). Frames belong to every layer: adding, duplicating, deleting or
  moving a frame does it in all of them, and **Copy frame / Paste frame** carry every layer. The layers are saved in
  the sprite's file, so they are all there next time, on any device. The game stacks the visible layers with real
  transparency, as the editor shows them; **hidden layers stay out of the game**, so a hidden sketch layer is safe.
  Each layer has a **Layer opacity** and, for map symbols, **Wash on this layer**: how much of the map's territory
  watercolour (kind green, cruel rust) lands on its pixels. The ground keeps its wash; lower keeps the drawing clearer.
  With *parchment under* and Good or Evil shown, the editor shows the wash on the paper and on the drawing.
- **Shading layer** (**+ Shading**): a layer of light and shadow marks instead of colours, which lights the layers
  below it. Paint with **☀ Lit**, **◐ Shadow** and **● Deep** (the pencil, fill, shapes and eraser all work), as if the
  light came from the left; **Suggest shading** fills a start from the shape (lit on the left of each part, shadow on
  the right). **Light** and **Shadow** set how strongly the marks lean toward a warm light and toward ink; **hatched
  shadows** draws shadows as engraved lines. **show marks** shows where you painted (yellow, blue, purple); **light
  from ◀ ▶** previews the light from the other side. A symbol that **may be mirrored** gets a mirrored copy with lit
  and shadow swapped, so the light stays on its side.
- **Light layer** (**+ Light**, always on top): mark where light comes from with **Fire** (orange, flickers),
  **Window** (warm, steady), **Lantern** (small), **Magic** (blue, pulses) or **Embers** (dim red). By day nothing
  changes; at dusk and night (Settings → Time of day on the map) the game glows those pixels and casts a pool of light
  around each patch. **Glow** and **Reach** set how bright and how far; tick **night** above the canvas to preview it.
- **Picture → pixels:** **Convert to pixels…** turns your picture into pixel art on this sprite's grid, exactly where
  the picture sits behind the pixels (size and move it first with the Image behind controls; set the canvas size with
  **Resize**). With no picture yet it asks for one. Each pixel looks at the part of the picture under it:
  - **Dark lines** sets how dark counts as ink, and **Line pickup** how much of a pixel must be ink to become a line
    pixel (lower keeps thin lines, higher only bold ones). Lines take the **Line colour**.
  - **Remove background** drops the paper (the colour of the picture's corners) within that tolerance (0 keeps it).
  - **Colours** is how many colours the rest is reduced to; **Palette** can instead snap to this sprite's colours or
    the game's. **Colour boost** makes the colours richer (pixel art likes them strong). **Outline the shape** adds a
    line around the outside.
  - **Keep** chooses what comes out: lines and colours, **lines only** (no colours: just the ink, plus the outline if
    ticked), or colours only.
  - The preview updates as you move a slider (untick *preview* to compare with the picture). **Apply** puts the
    result, by default, in **two new layers: "lines" above "colours"**, so the outline can be redrawn, recoloured or
    hidden without touching the colours. Under the lines the colour layer carries on the neighbouring colours, so it
    has no gaps on its own. Or put it all in one new layer, or replace this layer's frame. Touch it up by hand, or undo
    and try other settings. ⇆ moves the panel to the other side.
- **Preview:** ▶ Play runs the animation at its game speed (fps is saved with the sprite), at 1–4× over a raid,
  parchment, dark or checker background. **Sample map** shows your map symbols scattered over parchment at map zoom.
- **Dragons in game ↗ / Lair in game ↗ / Map in game ↗** open the game's dragon sheet, a test campaign's lair (the
  right dragon size, the rooms view for room art, asleep for the sleeping pose) or the map preview, with your unsaved
  drawings.
- **Undo / Redo** (top right, with how many steps there are): up to 120 steps per sprite (at least 20 on the biggest
  canvases), including colour, fps and scale changes. On the iPad: **tap with two fingers to undo, three to redo**.
  **Revert** drops a sprite's unsaved changes; **Delete art** removes your drawing so the game's own art comes back.
- **Size and anchor:** canvases go up to 512 × 512 (**Resize**). **Crop to drawing** cuts the canvas down to what
  is drawn in every frame and layer; **Crop to box** cuts it to a box dragged with Select. The anchor stays on the same
  spot of the drawing. **⊕ Foot** puts the anchor at the bottom middle of the drawing (mountains, trees, places),
  **⊕ Centre** at its centre; or place it by hand with the Anchor tool (A). Raid sprites always stand on their bottom
  edge, so these are off for them.

Keys (with a keyboard): B pencil, E eraser, G fill, I eyedropper, M select, V move, L line, R / Shift+R rectangle /
box, O / Shift+O ellipse / disc, A anchor, P play, ← → frames, Ctrl/Cmd+Z / Shift+Z / Y undo / redo, Ctrl/Cmd+C X V,
Delete, Enter (drop a paste), Esc (cancel it), Ctrl/Cmd+S save.

## What the game does with it
- **Lair** (0.17): `lair.dragon.<size>.perch` is the dragon sitting on its hoard (frames loop at their fps) and
  `.sleep` asleep on it (also the sleep screen); put the anchor ⊕ where it rests on the pile. `lair.chamber` is the
  chamber behind it (345×194, frame 1 the bare cave, then one frame per Treasure Chamber level); `lair.hill` is the
  zoomed-out backdrop and `lair.room.<name>` each room (one frame per level). The hoard, trophies, torch flames,
  workers and light are drawn on top, so leave room for them.
- **Good and evil versions**: drawn dragons use the evil version from alignment −30 down and the good one from 30 up;
  the lair's pictures use their dragon's; map symbols use them in a tyrant's or a protector's land (the blighted or
  flourishing cells near your rule; under a tyrant the mountain's evil version stands where the jagged mountains
  were). Your own drawing when there is one, else the tint. Raid sprites do not use them yet.
- **Dragon** (`dragon.<tier>.<pose>`): frame k replaces that pose's frame k for every breed (breed colours are not
  applied to drawn art yet; the good and evil tones are). The game plays every frame you draw at the fps you set, so
  the animation is as long as you make it (the note above the canvas says how long one loop takes). The anchor ⊕ marks the body centre: the
  game places and rotates the dragon around it. Size tiers 0–3 are hatchling to ancient; keep each tier's canvas
  size close to the game's (the editor starts from it).
- **Raid sprites** (people, animals, treasure, props): the drawing replaces the sprite; with several frames the raid
  loops them at your fps (each person a little out of step). The game always stands a
  sprite on its bottom edge, centred, in the 320×180 scene drawn 4× larger: draw the feet on the last row.
- **Map symbols** (`map.…` ids): the variants are separate drawings; the map picks one per spot and keeps it. Each is
  cut to what is drawn in it, so variants of different sizes keep their sizes. They are drawn
  pixel-sharp at `scale` map pixels per pixel (map pixels at zoom 1; the cells are 22). Choose **Pixel art (editor)**
  in Settings → Map art to see them; anything you have not drawn stays hand-drawn. The anchor ⊕ sits on the symbol's
  spot (a mountain's foot, a village's centre). Terrain may reach about 2 cells from its anchor; bigger is refused.
  Symbols are never mirrored unless you tick **may be mirrored** (next to Scale): leave it off for shaded drawings.
- **Mountains** (Map · mountains): the world picks the *kind*, your variants give it variety. **Mountain** is most
  mountain cells and stands in for every kind you have not drawn. **Small mountain** (two or three a cell, round the
  large ones and at the edges of ranges) and **Large mountain** (high peaks) show at about the size you draw them;
  until drawn, the plain mountain is shrunk or enlarged. Snowy kinds are for cold lands; a cruel ruler's land uses
  each kind's evil version.
- **Landmarks** (Map · landmarks): big pieces drawn over the map like places, so they have no terrain size limit.
  **Legendary peak**: one per region, on its highest mountain, about 3 cells across, with small mountains round it;
  until drawn it is made of three of your mountains with a gold pennant.

## Saving
**Save to GitHub** commits every changed sprite in one commit to the repository's default branch (or the branch set
in GitHub…), with a message naming them. The site redeploys from it in a minute or two. Opening the editor with a
token also brings in drawings saved from another device that the site does not have yet. Unsaved changes stay in this
browser until you save or revert them (the editor says so when you come back). Two devices editing the same sprite:
the last save wins. A drawing with nothing visible is never saved (it would make the sprite vanish in the game): it
stays a draft and the save says so; **Delete art** is how to remove a saved drawing. A blank unsaved copy never hides a
saved drawing: the editor drops it when it opens (0.26.1).

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
A drawing with layers has `"layers": [{ "name": "lines", "frames": [...] }, { "name": "sketch", "hidden": true, ... }]`
(bottom layer first) instead of `"frames"`; the game stacks the visible ones. A layer may add `"opacity"` and `"wash"`
(0–100; 100 when left out). A shading layer adds `"shade": { "light": 35, "dark": 35, "hatch": false }` and its rows
hold marks: `1` lit, `2` shadow, `3` deep shadow. A light layer adds `"light": { "glow": 100, "size": 100 }` with marks
`1` fire, `2` window, `3` lantern, `4` magic, `5` embers. Directions are their own files too: `dragon.2.fly>n` in
`dragon.2.fly~n.js` (`>ne`, `>e`… `>nw`; the plain file faces east and holds `"dirs": 8`, or 2 or 4). A palette colour may carry opacity
(`#rrggbbaa`), and `"tones": { "good": {…}, "evil": {…} }` holds adjusted good and evil tints (hue, sat, light, tint, mix).
Variants and versions are their own files: `map.terrain.mountain#2` in `map.terrain.mountain~2.js`, its evil version
`map.terrain.mountain#2@evil` in `map.terrain.mountain~2~evil.js`, a dragon pose's good version `dragon.2.idle@good`.
Each row is one character per pixel: `.` is clear, `0-9 a-z A-Z` index the palette. Map symbols add `scale` and
`mirror` (true: the map may show it mirrored; off by default, since shading would swap sides; an older `flip` is
ignored); the dragon adds `bodyLength`. They are classic scripts, so the game loads them from
`file://` too (`src/art/pixelart.js`). Safe to edit by hand; the editor rewrites a file when you save that sprite.
`node tools/test.js` checks every file: rows and widths, palette indices, ids, the anchor, and that `index.js` lists
them all.

# Changelog

## 0.29.0 — 2026-10-14 · Drop pictures onto frames
- **Drag a saved picture from Explorer onto a frame box** in the pixel editor and it loads into that frame. Drop
  several at once and they fill that frame and the next ones in file-name order (frame2 before frame10), adding frames
  as needed. Drop on the strip beside the boxes to add them after the last frame, or on the canvas for the frame you
  are on. **Load picture…** does the same from a file picker (handy on the iPad).
- **Pixel for pixel.** A picture the sprite's size loads exactly, its colours added to the palette (half-clear pixels
  stay half-clear). A clean 2×, 3× or 4× enlargement is read back at 1×. A strip as wide as several frames (what the
  **PNG** button saves) splits into frames. An empty drawing takes the picture's size; a smaller picture sits at the
  bottom middle; a bigger one is shrunk to fit, and the editor says so. One undo takes the whole drop back.
- **Map symbols:** a picture dropped on a variant box loads into that variant; extra pictures become new variants.
- The frame boxes no longer call a dragon's or raid sprite's extra frames "unused": since 0.28.1 they all play.

## 0.28.1 — 2026-10-14 · Animations as long as you draw them
- **Drawn animations play every frame at your speed.** The game used a fixed number of frames per dragon pose (four
  for flying), so extra frames were cut and fewer frames repeated. Now a drawn pose plays all its frames at the fps
  you set, on the map, in raids, in the lair, on the sleep and awakening screens, and each direction or good or evil
  version uses its own frame count. The editor's note says how long one loop takes.
- **Raid people animate.** A raid sprite drawn with several frames now loops them in the raid at its fps, each
  person a little out of step with the others (one loop for everything they do, for now).

## 0.28.0 — 2026-10-14 · Sprites that face 2, 4 or 8 ways
- **Facing in the pixel editor.** Dragons, lair pictures, raid sprites and the map's travellers and dragon marker can
  face **2, 4 or 8** directions. The plain drawing faces east; tap a direction in the compass grid to draw it. Each
  direction is its own drawing with its own frames, so its own animation, size and anchor. A new direction starts as a
  copy of what the game shows there now (mirrored from the other side). Until you draw one, the game mirrors the other
  side or borrows the nearest drawn direction, and the grid shows those faded.
- **The dragon turns on the map.** Flying across the map, the dragon turns to one of eight directions when its flying
  pose is drawn in directions. Your drawn flying dragon is used on the map even with the Illuminated map art, so you
  see it turn. Wagons, walkers and banners turn as they go when you draw their markers in directions (pixel map art).

## 0.27.0 — 2026-10-14 · Lights: fires, windows and lanterns at night
- **Light layers in the pixel editor.** **+ Light** adds a layer where you mark where light comes from: **Fire**
  (orange, flickers), **Window** (warm and steady), **Lantern** (small), **Magic** (blue, pulses) and **Embers** (dim
  red). By day the drawing does not change. **Glow** and **Reach** set how bright and how far; tick **night** above the
  canvas to see it glow.
- **The map at dusk and night.** Settings → **Time of day on the map** (Day, Dusk, Night) dims the map toward a deep
  blue and lights it: the lights you mark glow on places, travellers and the dragon, with a pool of light around each,
  and places you have not drawn yet get a few by kind (a camp's fire, a town's windows). For now this is a view: the
  game has no day and night of its own yet.
- **The moving-sun shading test is saved for later** (`docs/ideas/dynamic-shading.md`, with the test page), as you
  asked: the map keeps your drawn shadows.
- Fixed: duplicating a shading layer made a colour layer of its marks.

## 0.26.1 — 2026-10-13 · A blank drawing no longer hides a saved one
- **Fixed: the editor could show a saved drawing as blank.** A blank copy kept in the browser's unsaved changes (from
  the first finger of a two-finger tap, or a variant left empty) hid the saved drawing, and opening a variant could
  start a blank one where a saved drawing existed. The editor now ignores and forgets blank unsaved copies, so the
  saved drawing shows again; nothing on GitHub was lost.
- **Deleted variants stay visible until you save.** A deleted variant shows faded in the strip with "deleted (Revert
  brings it back)", and the title says it goes on the next save. Variant 1 is the main drawing: Delete variant and
  Delete art leave it alone while other variants exist.

## 0.26.0 — 2026-10-13 · Shading layers
- **Shading layers in the pixel editor.** **+ Shading** adds a layer of light and shadow marks rather than colours:
  paint ☀ Lit, ◐ Shadow and ● Deep as if the light came from the left, and the game lights the layers below with them
  (toward a warm light and toward ink; **hatched shadows** for an engraved look). **Suggest shading** fills a start
  from the shape. **Light** and **Shadow** set the strength, **show marks** shows where you painted, and **light from ◀
  ▶** previews the light from the other side.
- **Mirrored symbols are relit, not flipped.** A shaded symbol that may be mirrored gets a mirrored copy with its
  light and shadow swapped, so the light stays on the same side across the map.
- **Fixed:** the editor's "may be mirrored" box (0.25) shared its name with the brush's mirror box, so one of them did
  not work.

## 0.25.0 — 2026-10-13 · Grouped like an old map; no mirrored shading
- **The map's symbols are grouped like a hand-drawn fantasy map.** Mountain ranges are chains of big peaks along their
  crests, with smaller mountains on the flanks, foothills at the edges and open paper in between, instead of a
  blanket of peaks. Forests are dense masses of small trees with a clear edge. Hills gather in small clumps with open
  country around them.
- **Drawings are no longer mirrored on the map.** A shaded drawing mirrored puts the light on the wrong side. Tick
  **may be mirrored** (next to Scale) for a symbol that looks right either way.

## 0.24.0 — 2026-10-13 · Variants and good and evil versions as real drawings
- **Variants are separate drawings.** For a map symbol the strip under the canvas now shows its variants, each its own
  drawing with its own size, anchor and layers (no more variants that behave like layers). **+ New variant**,
  **Duplicate variant**, **Delete variant**; the map picks one at random for each spot. Your mountain's two variants
  became variant 1 and variant 2.
- **Draw your own good and evil versions.** Every sprite and every variant has Normal / Good / Evil. Until you draw one,
  the game tints the normal drawing (adjustable, as before). **✎ Draw the evil version** makes it its own drawing,
  starting from the tinted picture, to change as much as you like; the game uses it in a cruel setting (a kind one
  for good): mountains and trees in a tyrant's or a protector's land, your dragon by its deeds, the lair by its
  dragon. **Use the automatic tint** removes it again.
- **The tyrant's mountains and the bare and burned trees** are no longer separate entries in the editor: they are the
  evil versions of the mountain and the broadleaf tree.

## 0.23.0 — 2026-10-13 · 3D map test
- **A test of the map in 3D** (Settings → 3D map test, with your campaign if one is open): the parchment lies at a
  steep angle and the mountains, hills, trees, places, legendary peaks and clouds stand up on it, facing you, with
  your dragon circling above its shadow. Turn the paper with a two-finger twist (or ⟲ ⟳); pinch to zoom, and the paper
  flattens as you go out; **Overview** shows the whole world with far less detail. Buttons compare tilts, standing
  versus flat symbols, and fog. It is only a test: the real map has not changed and nothing in your campaign is
  touched. The speed is shown in the corner.

## 0.22.0 — 2026-10-13 · Wash and opacity per layer
- **How much territory wash lands on a drawing.** On the map, your territory's watercolour (kind green, cruel rust) used
  to cover every symbol in it. Each layer of a drawing now has **Wash on this layer** (in the Layers panel). The ground
  keeps its wash as before, and a lower setting keeps that layer's pixels clearer, so a mountain can keep its own
  colours in a washed land, or keep them only on its snowcap.
- **Layer opacity.** Each layer has its own opacity, in the editor and in the game.
- **Layers stack with real transparency.** A see-through pixel or layer now shows the layer below it, as in a paint
  program, in the editor and in the game.
- **Preview the wash in the editor:** with *parchment under* and **Good** or **Evil** shown, the drawing sits on the
  map's paper with the kind or cruel wash over the ground and, by each layer's setting, over the drawing.

## 0.21.0 — 2026-10-13 · Ink on paper, see-through pixels, good and evil tones
- **The map's parchment moves with the map.** Dragging used to slide the ink over a paper that stayed still, so the
  drawing seemed to float above it. The paper now moves and scales with the map, so the drawing sits on it like ink.
- **Pixel editor: parchment under the drawing.** Tick *parchment under* to see a drawing on the map's own paper, at map
  scale. The eyedropper picks the parchment's colour where nothing is drawn, so colours can be matched to the paper.
- **Pixel editor: select like a spreadsheet.** With Select, tap a pixel or drag a box. Hold Ctrl, Cmd or Shift, or turn
  on **＋ Add** (for the iPad), to add more. **Select drawn** takes every drawn pixel. Copy, cut, move, flip and
  delete work on any selection shape.
- **Pixel editor: opacity.** The opacity slider makes the selected pixels see-through, so the parchment shows through
  and a sprite blends into the map. The pixels are truly see-through (not mixed with today's paper colour), so they
  stay right if the parchment or a territory wash changes.
- **Good and evil tones.** Show **Normal / Good / Evil** to see a drawing as the game tints it in a kind or a cruel
  setting. The shift is automatic (warmer and golden for good, darker and ash-red for evil); sliders adjust it for
  that drawing, and **Automatic** goes back. The game uses it for drawn dragons by their deeds, the lair's art by its
  dragon, and map symbols in a protector's or a tyrant's land. Until you draw the tyrant's mountains, your mountain
  stands in for them in the evil tone.

## 0.20.0 — 2026-10-13 · Mountains of every size, a legendary peak, crop and anchor
- **Small and large mountains.** Mountain ranges now mix three sizes. Small mountains, a clear step smaller, usually
  gather round the large mountains of the high peaks and along the edges of a range (two or three to a cell), and now
  and then turn up inside it.
- **A legendary peak in every region.** Each region's highest mountain is a landmark about three cells across, with
  two shoulders and a gold pennant, standing in a ring of small mountains so it reads from afar. It is its own piece
  of art ("Legendary peak" in the editor). It is drawn above the map like a place, so it can be far bigger than a
  terrain symbol. Until you draw it, it is made of three of your mountains. What it does in play comes later.
- **Pixel editor: Crop to drawing** cuts the canvas down to what is drawn (every frame and layer). **Crop to box**
  cuts it to a box you drag with Select. Either way the anchor stays on the same spot of the drawing.
- **Pixel editor: ⊕ Foot and ⊕ Centre** put the anchor at the bottom middle of the drawing (right for mountains,
  trees and places) or at its centre.
- **Variants keep their own sizes.** Each frame of a map symbol is a variant, cut to what is drawn in it. Big and small
  variants on one canvas show at their own sizes on the map, and the editor lists each variant's size.
- **Mountain kinds by name in the editor:** Mountain, Small mountain, Large mountain (high peaks), the snowy ones,
  the tyrant's mountains, and the Legendary peak. Each says where the map uses it. A kind you have not drawn uses the
  plain mountain, shrunk or enlarged. Small and large mountains show at about the size you draw them.
- **Fixed:** the editor's file list could keep naming a drawing that had been deleted. Saving now drops names that are
  not in the folder.

## 0.19.0 — 2026-10-13 · Colour wheel and saved palettes
- **Colour wheel in the pixel editor:** drag around the dial for any colour, outwards for a stronger one, the bar for
  lighter or darker, or type a colour code. A colour you have not drawn with yet changes as you drag, so the sprite's
  colours do not fill up with in-between shades; "change it everywhere" recolours a colour across the sprite live. The
  small swatch takes you back to the colour before your last change.
- **Saved palettes:** keep sets of colours under a name (map, map good, map evil…): start one from a sprite's colours,
  add or take out colours, rename, delete, or put a whole palette into the sprite you are drawing. They are saved to
  GitHub with your art, so they are on every device.
- **Fixed:** with the 3×3 brush, the outline showing where it would paint sat one pixel off from where it painted.
- **Fixed:** opening the editor with a GitHub token failed to bring in art saved from another device ("Could not read
  the latest art from GitHub").
- **Saving an empty drawing no longer replaces the game's art with nothing.** A drawing with nothing visible stays a
  draft, and the save says so. The young dragon's bite pose had been saved empty and was invisible in raids; it is
  back to the game's own drawing.

## 0.18.1 — 2026-10-13
- **Converter: lines only.** "Keep" chooses lines and colours, lines only (no colours, just the ink and the outline),
  or colours only.
- **Converter: lines and colours on their own layers.** Apply now puts the lines on a "lines" layer above a "colours"
  layer (or everything in one layer, or into this layer, as before). The colour layer is filled in under the lines,
  so it has no gaps when the lines are hidden or redrawn.

## 0.18.0 — 2026-10-13 · Layers and picture to pixels
- **Layers in the pixel editor.** Give a sprite a few named layers (say a sketch, the lines and the colours), draw on
  one at a time, show or hide them, reorder, rename, merge down or delete them. They are saved with the sprite, so
  they are all there next time, on any device. The game shows the visible layers merged; hidden layers stay out of the
  game. Frames belong to every layer, and copying a frame copies all its layers.
- **Picture → pixels.** "Convert to pixels…" turns your picture into pixel art on the sprite's grid, right where the
  picture sits behind the pixels. Sliders tune it while you watch: how dark counts as ink and how much ink makes a
  line pixel, removing the paper, how many colours (or snap to the sprite's or the game's colours), colour boost, and
  an outline around the shape. Apply puts the result in a new layer to touch up by hand.

## 0.17.1 — 2026-10-13
- **Pixel Editor button** on the title screen and in Settings (so also from the in-game menu). It opens the editor in
  a new tab; where the browser does not allow that, it saves your campaign and opens the editor in the same tab.

## 0.17.0 — 2026-10-12 · The dragon at home
- **A big, detailed view of your dragon in the lair.** The lair now opens on the hoard chamber with the dragon twice its
  raid size, sitting on its hoard and idling. The hoard is still generated from what is in it (size by how much room
  it takes, copper to gold by richness, swords, helms, books, chalices and gems sticking out), with your most prized
  piece glowing in front. Trophy alcoves line both walls, torches flicker, a shaft of daylight falls through the roof,
  workers go about the floor, and the chamber grows grander with each Treasure Chamber level.
- **Asleep on the hoard.** While it sleeps the dragon lies curled on its hoard, and the sleep screen now shows it there
  instead of a stock picture.
- **Zoom out to every room.** "All rooms" (or pinch in, or −) shows the hill in cross-section with a room for every
  upgrade: built rooms with their furnishings, rooms being dug with scaffolding and a percentage, and dotted outlines
  where the rest could be dug. Tap a room to open it in the Build tab; tap the hoard (or pinch out) to go back.
- **New art shows up in the pixel editor by itself.** The editor now lists whatever the game registers, so the new
  lair pictures are there: the dragon on the hoard and asleep on it for each size, the chamber (one frame per level),
  the hill, and every room (one frame per level). Your drawings replace them in the game, with their own frame count
  and speed.
- **Editor: your own picture behind the pixels.** "Image behind…" loads any picture to draw over; set its opacity and
  size, move it, or show it on top. The eyedropper picks its colours on empty pixels. Each sprite keeps its picture in
  your browser.
- **Editor: undo and redo where you can see them.** Big buttons at the top right with the number of steps (up to 120,
  at least 20), two-finger tap to undo and three-finger tap to redo on the iPad, and colour, speed and scale changes
  now undo too. Canvases up to 512 × 512. "Lair in game" opens a test lair with your unsaved art.

## 0.16.0 — 2026-10-12 · Pixel editor
- **Draw the game's pixel art yourself:** a pixel editor at `editor/` (https://hoardbound.netlify.app/editor/). Pick
  anything the game draws in pixels: each dragon size and pose with all its animation frames, the raid people,
  animals, treasure and props, or a map symbol. Tap a frame and draw: pencil, eraser, fill, eyedropper, box select,
  move, copy, cut and paste (also whole frames, between sprites), flip, lines, rectangles and ellipses (outlined or
  filled), mirror painting, brush sizes, any colour or the game's palette, 120 undo steps, onion skin, and the game's
  current drawing faintly behind to trace. Works with a finger, a pen or a mouse (pinch to zoom), and with keys.
- **See it:** Play runs the animation at its game speed over a raid, parchment or dark background; Sample map scatters
  your map symbols over parchment; "Dragons in game" and "Map in game" open the game with your unsaved drawings.
- **Saved in the GitHub repository:** Save to GitHub commits your changed sprites (one small readable file each, in
  `assets/pixelart/`), so they are versioned and can be edited again any time; the site redeploys with them. It needs
  a fine-grained GitHub token (Contents: read and write, this repository only), kept in your browser. Unsaved work
  stays in the browser until you save; drawings saved on another device are brought in when you open the editor.
- **The game uses them:** drawn raid sprites and dragon frames replace the generated ones at start; drawn map symbols
  appear with Settings → Map art → "Pixel art (editor)". Anything not drawn keeps its current art.
- `node tools/test.js` checks every drawn sprite file (rows, colours, ids, anchors, the list).

## 0.15.0 — 2026-10-12
- Complete the Illuminated map: 30 additional illustrations cover mines, caravans, cities, camps, holds,
  sacred sites, lairs, endgame strongholds, travelers, armies, dragon markers and corrupted terrain.
- All eight home stages and all declared map symbol states have matching art; damage removes roofs,
  adds char/rubble, and an emptied sanctuary loses its crystal. Fine ink details retain faction colours.
- Share image decodes across state variants. Add a touch-friendly, save-free art catalog:
  `index.html?scene=artcatalog&mappack=illuminated`.
- Preserve both pre-art (0.13) and first-art-pack (0.14) backup branches; Original ink remains selectable.

Versions are shown on the title screen and in the in-game menu (`HB.VERSION` in `src/core/namespace.js`).
While pre-1.0: **minor** (0.x.0) for a feature update, **patch** (0.x.y) for fixes and tweaks. Every pushed update
bumps the version and adds an entry here.

## 0.14.0 — 2026-10-12 · Illustrated parchment map
- New **Illuminated parchment** pack: nine transparent ink illustrations for mountains, hills, broadleaf and pine
  forests, farms, villages, towns and castles, with quieter roads and muted blue rivers. New settings default to it;
  existing choices are preserved. Choose it in Settings → Map art, or use `?mappack=illuminated`.
- Sharper terrain at close zoom (2× cache above zoom 1.3), with a 64 MiB cache budget. Symbol anchors, geography,
  labels, hit areas and saved games keep their existing coordinates.
- **Original ink** remains selectable. Switching away while art is loading now cancels that pack correctly.
- Exact 0.13.0 backup: `backup/map-before-illuminated-2026-10-12` at `cb0e5f4`; rollback steps and prompts in
  `assets/map/packs/illuminated/README.md`. Reveal and territory effects remain the 0.13 implementation.

## 0.13.0 — 2026-10-12 · Land washes in
- **Newly explored land washes in like watercolour.** As the dragon flies, the blank paper over the land it uncovers
  dissolves along a soft, uneven edge that bleeds outward from the dragon, with a thin warm wash at the wet edge that
  dries away in about a second. No more hard squares fading out. The clouds still mark the edge of the unknown. It
  works over any map art, so new sprites need nothing extra.
- **Ink discovery removed.** The 0.12 ink drops, pools and rivulets (preview only) are gone, along with their mask
  files; packs that still list `inkMask` or `revealMask` load as before and the fields are ignored.
- The preview is now `index.html?scene=washpreview` (the old `?scene=inkpreview` link still works): fly across a
  mountain, a forest and a village and watch them wash in; slow motion; the territory buttons as before.
- Big pack art drawn small on the map is scaled down in halving steps, so fine lines in high-resolution sprites do not
  shimmer.
- For artists: `docs/map-art/WASH.md` (the reveal needs no assets; the territory's optional textures) and
  `docs/map-art/WASH_PREVIEW.md`.

## 0.12.0 — 2026-10-12 · Ink and watercolour
- **Your territory is painted in watercolour.** Translucent, uneven washes on the parchment: green with gold blooms
  where your rule is kind, rust with charcoal edges where it is cruel, sepia while undecided. When the territory
  changes, the change blooms: a place that swears to you or is occupied spreads colour from itself, a new phase or a
  richer hoard spreads it outward from the old edge, turning kind or cruel recolours it from each source. Labels and
  symbols stay on top; the wash stays on your home region's land.
- **Ink discovery, in a preview for now** (`index.html?scene=inkpreview&mappack=sample`): land beside what you know
  shows as a faint sketch (never settlements); when it is revealed, a sepia-black ink drop pools there and drains
  along rivulets into the mountain, the trees and the village, running through their line work before the colours
  dry in. Revealed features stay drawn. The live map still lifts its clouds; it gets the ink next.
- **For artists:** the exact files a map art pack can add for both, with sizes, alignment, channels and fallbacks:
  `docs/map-art/INK_AND_WASH.md` (ink silhouette masks, reveal-order masks, tileable watercolour textures, bloom
  masks); preview steps in `docs/map-art/INK_PREVIEW.md`. The sample pack has placeholder masks of every kind, and
  `node tools/mappack.js` checks them.
- **Reduced motion** (Settings) now also covers the map: ink and watercolour fade in instead of flowing.
- Budget for the iPad: at most 24 symbols ink at once, at most 4 pools; a territory repaint is spread over several
  frames. Measured in `docs/map-art/ink-checks.json`.

## 0.11.0 — 2026-10-12 · Your territory
- **Seven large regions.** New worlds have your home region in the middle and six regions around it behind storm
  walls (two open to a young dragon, two to an adult, two to an ancient one). Two kingdoms rule inside your home
  region, so it has villages, towns and castles to win. One Crystal of Life lies in each of the six other regions;
  the Hollow King and his lieutenants live beyond your home. Storm clouds now line a wall where it meets open land.
  Older campaigns keep the world they were made in.
- **Territory by life phase**, drawn as a **watercolour wash** that bleeds in from the lair. A hatchling has a little
  colour around its cave, growing slightly with its hoard; it widens at each phase and around the places that serve
  you, and never leaves your home region (the rest is for your rivals). Colour: gold-green kind, rust cruel, sepia
  undecided.
- **Phase 2 (young):** pilgrims' camps (kind) or cult camps (cruel) gather around your hill; places inside your
  territory answer you (ask for news; accept hospitality or demand a feast); once your lair is found (hunters,
  thieves or riders who followed you home), places that trust or fear you bring offerings.
- **Phase 3 (adult):** the camps become a village (or a fortified settlement), then a town; more offerings; bestow
  gifts from your hoard (they count as years of growth) and recruit its people. You bring villages, towns and some
  castles into your fold: oaths, a castle's fealty (new) and occupation now need an adult and your territory.
- **Phase 4 (ancient):** a castle and sanctuary, or a dark stronghold, rises beside your lair.
- **Reputation** (was Realms, F): your name, titles and benevolence, who speaks of you, who knows where you sleep,
  who is loyal; each realm's fear, trust, hostility and heat; and the **grievance ledger**: everyone sworn against
  you with cause, place and story. Hunters who survive you grow stronger and earn epithets (the Scarred, Dragonfoe,
  Dragonbane) and lead hunts on your lair; broken promises, crushed risings and razed towns make new enemies;
  weregild ends a family's, a betrayed village's or a rebel's grudge.
- Castle politics (lordships, feuds you can join) is planned next: `docs/ideas/castle-politics.md`.

## 0.10.0 — 2026-10-11 · Swappable map art
- **Map art packs** (`map_update.md`): every symbol on the parchment map (terrain, places in each state, your
  settlement's stages, pennants, caravans, armies, seals, fog, compass) has a semantic id and can be replaced by a PNG
  in `assets/map/packs/<name>/` with a small manifest, one symbol at a time. Anything missing, broken or still loading
  is drawn by hand exactly as before. Choose a pack in Settings → Map art or with `?mappack=<name>`; works from
  `file://` too.
- Variants are chosen by each symbol's stable identity (never reshuffle); different resolutions keep the same
  footprint; burned and ruined places still show their state when the art lacks it; flags, pennants, washes and
  labels stay separate; roads, rivers, coasts and washes stay procedural and can be restyled.
- The **handoff package** for an artist: `docs/map-art/` (measured catalog, contact sheets at zoom 1, 2.5 and 4×,
  art spec, replacement steps, implementation summary), a working `sample` pack and a `test-broken` pack, the
  validator `node tools/mappack.js <pack>` and the exporter `node tools/mapart-export.mjs`.
- **Map preview scene** `?scene=mappreview` (fixed seed and camera, every domain state, a burned town, a raid, the
  dragon circling; `&chunks=1` shows chunk edges; saves only to the test slot).
- Rendering only: no world generation or save change. Terrain glyph wobble now has its own seed per glyph, so stroke
  jitter and coastal waves moved slightly once; positions and sizes are unchanged.

## 0.9.1 — 2026-10-11
- **Debug tools** (Menu → Debug tools) for testing: infinite gold, invincible, endless stamina, safe sleep, instant
  building; and do-it-now buttons: gold, grow one stage, age 10 years, heal, benevolence ±25, grow your settlement,
  start the great struggle, win its next step, reveal the whole map, calm every realm, pass a season, back to the
  lair. Toggles are saved with the campaign; the map shows "Debug: …" while any is on, and the chronicle notes once
  that debug tools were used.
- The Blightmother is confirmed as the Hollow King's third lieutenant.

## 0.9.0 — 2026-10-11 · The great struggle (prototype)
- When your dragon is grown (adult) and its rule leans kind or cruel, the world answers, once and for good:
  - **Kind:** the Hollow King wakes in a far fortress, sustained by three lieutenants (a Warlord, a Sorcerer, a
    Blightmother). The **Warlord** is playable: his orc hosts attack the places that trust you, and his warcamp is
    a hard animated fight; your allies' scouts lead you in while some of his warband sleep. Kill him and the hosts
    stop.
  - **Cruel:** six Crystals of Life in sanctuaries across the realms. **Greenmarrow** is playable: its crystal is
    warded until you kill the Warden of the Grove. Taking it withers its realm for good (poorer settlements,
    blighted land on the map, more hunters) and gives you its power once it is in your hoard.
  - The other lieutenants, the other crystals and the two final battles are placed and described but not playable
    yet. A rumour foreshadows the struggle at 25.
- On screen: an announcement card, seals and new glyphs on the map, a line under your goal, a *great struggle* aim,
  summary and waking lines.
- Test starts: `?scene=map&preset=adult-kind` (also `adult-cruel`, `young-kind`, `young-cruel`) to try the later
  game. Campaigns started from the URL save to their own slot and never overwrite your autosave.
- Fix: loot inside buildings (castle vaults, town halls, house savings, mine carts, a rival's hoard) could never be
  reached; burning now spills it and an adult can smash its way in, as intended.

## 0.8.0 — 2026-10-11 · The domain
- People build around you. Once you are a young dragon, families who trust you build a refuge at the foot of your
  hill (village → flourishing town → castle and sanctuary); people you hold by fear are driven into a coerced camp
  (fortified settlement → citadel → dark stronghold). It grows while you sleep, with years, the settlements that
  serve you and the right lair upgrades, and gives gold, faster building, guards, defence and warnings. A cruel
  one gathers unrest and can revolt; a kind one loses heart when hunters reach your door. It turns if your deeds do.
- What each settlement is to you: protected, allied, tributary, occupied, resisting or ruined, shown when you
  select it, on its arrival card and as a pennant on the map.
- New deeds: take the oath of a place you protect, help rebuild a burned village, occupy a place inside your
  influence, crush or ease its resistance, raze it (and lose its tribute for good). Raiding a place you swore to
  protect breaks your word with everyone you protect. Farms can now be protected.
- Your territory on the map: a light gold-green or rust wash with a dotted edge (toggle *Territory*, T), burned
  forests and jagged ash-dark mountains near a tyrant, fuller groves and fields near a protector.
- Lair → Domain tab; a *Grow your domain* aim on the Aims board; domain lines in summaries, the sleep preview and
  the awakening; two new titles (Liege of your vale, the Tyrant).
- Night raids say so: a *Night* tag with a moon in the raid, and the intro and preview mention it.
- Fixes: cards with many choices fit on the screen; battlefields made during play keep their place after a load.

## 0.7.1 — 2026-10-11
- iPad fix: dragging (especially with a mouse) or a long press could select the page and tint the whole map pale.
  The page can no longer be selected, dragged or long-pressed.
- Docs split: a short root `CLAUDE.md` that maps the docs, a `CLAUDE.md` in each code folder, one doc per game
  system in `docs/systems/`, `docs/ideas/` (the domain and endgame notes moved there unchanged), a trimmed
  `DESIGN.md` of decisions, and `next_chat_kickoff.md` holding where we left off and the current project's decisions.
- Tools: `tools/cyclebot.js` (opening-cycle bot) and `tools/docscheck.js` (doc budgets and links).

## 0.7.0 — 2026-10-11 · The first valley
- Every new world opens with one of four local stories built from the places around your cave: outlaws sacking a farm; a captain holding a village's tribute chest (and wearing a wind charm); a dwarf envoy held for ransom (with a seal that opens a vault); a dragon-slayer raising a bounty (carrying a smoke-glass). Each has several ways in that lead to different futures. A new story appears after each long sleep when none is open.
- Treasures that open things: the Gale-Feather Charm reaches a wind-locked crag, the Deepwarden's Seal opens a dwarf-sealed vault, the Smoke-Glass shakes off riders and hunters.
- Heat: realms step through Calm → Wary → Guarded → Hunting as you rob and burn. Escorts grow, villages lock valuables away and post watchmen, and a named hunting party tracks you across the map. Fight, flee or pay them off. Good deeds and time cool it.
- Pursuit: loud raids send riders after you. Fly straight home and they learn where you sleep (more thieves and hunters later). Land far away or wait them out to lose them.
- Offerings: villages that trust you bring gifts each season, and every year you sleep, while they prosper. When raiders strike them while you sleep, your guards help them hold.
- Guarding a caravan can turn into an animated ambush fight. Warden of the Roads now needs four guarded caravans.
- Map: story places marked, wind swirls on crags, hunters and slayers shown; a story line on the goal panel and an alerts panel for riders and hunters.
- The first sleep forgives: hunters who reach the sleeping hatchling wake it to fight instead of killing it. The next step warns when hunters are likely and someone has sworn to kill you.
- Fixes: armies no longer vanish at the first daily tick; gender-neutral story text.

## 0.6.1 — 2026-10-11
- Version number and date shown on the title screen and in the in-game menu; saves record the version they were made with.
- This changelog.

## 0.6.0 — 2026-10-11 · Goals, consequences, milestones
- Visible first milestone (become a young dragon: hoard strength 1 000, age 8) with next step and what growth unlocks.
- Aims board (G): opportunities tagged grow / trust / fear / secure / renown.
- Playable good deeds: outlaw raids on farms and villages, the defend raid, return or keep recovered goods, guarding and tolling caravans.
- Consequence summary after every encounter; world reactions logged with causes; awakening shows new capabilities.
- Renown: eight titles with real effects.
- Upgrades tied to problems (why-now reasons, turn-back chances); growth happens in the year you come of age during a sleep.
- Rebalance: tier energy 1 000 / 6 000 / 30 000; gentler thieves and hunters for hatchlings.

## 0.5.0 · Hoard value
- Value shown apart from size: richer piles, cave glow, trophy wall, the Strongroom; thieves take what is worth most for its size.

## 0.4.1 · Bulk chamber
- The treasure chamber holds treasure by bulk (100 coins per space), not by value.

## 0.4.0 · Explore anywhere
- Tap anywhere to fly and explore, rumoured places, rest in the wild, readable fonts (Alegreya), CLAUDE.md handoff notes.

## 0.3.1
- Burdened-pursuit road event; map toasts and flight buttons stay in sync under dialogs.

## 0.3.0
- Petitions, endgame legend, flight controls, raid target chips, headless tests, playthrough tool.

## 0.2.0
- Raid engine, encounters, lair economy, sleep simulation, world simulation, save/load, menus.

## 0.1.0
- Scaffold: canvas UI toolkit, seeded world generation, hand-drawn parchment map, pixel dragon, travel.

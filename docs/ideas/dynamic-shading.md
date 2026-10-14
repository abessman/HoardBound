# Symbols lit by a moving sun (saved for later)

Recorded 14 October 2026. Explored as a test page; the owner liked every option but chose to **keep the drawn
(static) shadows for now** and come back to this as a future project. Local lights (fires, windows, lanterns) were
built instead, in 0.27 (light layers, `docs/systems/art-and-sprites.md`).

## The owner's words

> I wanted to be able to have a mountain and then move a light source around it in 3d and be able to see shading and
> light highlights... maybe we could try just treating the shadow as etching that moves around as the light moves
> around... if you put the sun right in front of the mountain it would be almost no etching and if it moved to the
> left the etching would start going to the right... the angle would change the direction of the etching.

> Is there any way to do a more dramatic cell shading kind of look... a dark edge that can deepen and then some
> blending and then on the opposite side some white thin highlights?

Someone the owner showed it to preferred the static style. The owner's reason to want light anyway: small fires and
heroes with lanterns travelling the map, casting light.

## The test page

[dynamic-shading-test.html](dynamic-shading-test.html): open it in a browser (standalone, works from file://). Two
tabs: one mountain with a sun you drag around it, and a small 3D map (a tilted sheet with mountains, hills, a forest
and a river) you can turn. Everything is built from outlines only (the owner's sketch and the game mountains with
their painted shading removed).
- **Shape from the outline:** depth = distance to the outline (the ground line is not an edge), so ridges run down
  from each peak; sliders for depth, softer ridges and rocky bumps. Each point then has a facing (a normal).
- **Cel shading (default):** 2 or 3 flat tones, a hard to soft split, a dark edge on the shadow side (a band, or a
  thicker ink line) that widens as the sun swings away, and thin white highlights inside the outline on the sunny
  side (all round when the sun is behind), optionally glints on crests. Colour slider: warm light, cool shadow.
- **Etching:** strokes at fixed seeded places, shown where the face turns from the sun; direction = the sun's
  direction on screen bent toward the slope; more, longer and cross-hatched where darker.
- Smooth or pixel output; stippled or flat ground shadows that swing with the sun; "sun stays with the view" (the
  owner's choice for the 3D map) or on the map; each kind of symbol lit once per frame and copied to every spot.

## What it would take in the game

- The owner draws outline and flat fill (no painted shading) at any resolution; the light adds the shading.
- Light-independent data (normals, edge distance) cached per symbol and size; one sun relights each kind once.
- The weak point: the shape is guessed from the outline, so the shadow splits straight down under each peak. Bold
  cel tones show it most. Fix: ridge lines (or a rough facing layer) drawn in the editor.

## Open questions

- Where the sun comes from in the game: fixed on the screen (the owner preferred this in the 3D test), the time of
  day as you fly, or turning the map.
- 2 or 3 tones, band or thick line, highlights on the outline only or crests too: the owner wanted to test them all.
- Whether drawn and computed shading mix (painted symbols plus a computed rim from local lights).

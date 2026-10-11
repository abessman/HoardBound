# Sprite overrides

Generated pixel art can be replaced without touching code.

1. Put a PNG sprite sheet here, e.g. `dragon.png`.
2. Put a JSON atlas next to it, e.g. `dragon.json`:
   `{ "dragon.adult.body.fly0": { "x": 0, "y": 0, "w": 44, "h": 32, "ax": 22, "ay": 16 }, ... }`
   (`ax`/`ay` are the anchor pixel; optional.)
3. List both in `manifest.json`: `[{ "sheet": "dragon.png", "atlas": "dragon.json" }]`.

Any atlas id that matches a generated sprite id overrides it at load time. Ids are listed by
`HB.sprites.defs` in the browser console. Overrides load only when the game is served over http(s)
(browsers block `fetch` on `file://`).

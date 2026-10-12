# tools — tests, bots, screenshots, doc checks

- `node tools/test.js [seed]`: headless checks (~155; the count varies by seed because some story templates cannot
  be placed in every world and those checks are skipped). Sections follow the systems. Add checks for new rules.
  A few checks are seed-dependent by nature (e.g. "rival lairs exist" fails on some seeds; that is worldgen, not a bug).
- `tools/headless.js`: loads the logic files into a Node sandbox. New logic files must be added to `LOGIC_FILES`.
- `node tools/cyclebot.js [seed]`: a robber bot plays the opening cycle (story, raids until hoard strength 1 150,
  entrance, a 20-year sleep) and reports trips, heat, pursuit, hunters and the awakening. Use it to tune pacing.
- `node tools/playthrough.mjs <dir>`: scripted browser run (Playwright with the preinstalled Chromium) with a
  screenshot at every stage, following the opening story. Prints summaries and errors.
- `node tools/screenshot.mjs out.png "js to run" --url="index.html?debug=1&scene=map&seed=…"`: one screenshot.
  Add `&preset=adult-kind` (or `adult-cruel`, `young-kind`, `young-cruel`) to start later in the game (`src/game/presets.js`).
- In the game: Menu → Debug tools (`src/game/cheats.js`): toggles and jumps for hand testing; tested in *debug tools*.
  `?scene=dragons` is the dragon sheet; `?scene=map&seed=…` jumps into a world.
- `node tools/worldstats.js [seed] [size] [--ascii]`: world generation report.
- Map art: `node tools/mappack.js <pack>` validates a pack and writes pack.js; `node tools/mapart-export.mjs
  [--only=catalog,sheets,sample,shots,check,perf,ink]` rewrites `docs/map-art/` (re-run after changing map glyphs).
  Preview scene: `?scene=mappreview[&mappack=sample][&chunks=1][&cam=x,y,zoom or ~dx,dy,zoom from the lair]`.
  Ink and wash: `?scene=inkpreview[&mappack=sample][&reducedmotion=1][&auto=1]`; `--only=ink` steps it frame by frame
  through `tools/inkcheck-page.js`. Timing drawing into an offscreen canvas: read one pixel per frame, or the browser
  batches the drawing and its cost lands on some later call.
- `node tools/docscheck.js`: doc size budgets, broken relative links, the six sections in every system doc.
- Slow runs: each new world takes 1–2 s to generate; running several seeds can exceed two minutes.

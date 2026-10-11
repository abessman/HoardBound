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
  `?scene=dragons` is the dragon sheet; `?scene=map&seed=…` jumps into a world.
- `node tools/worldstats.js [seed] [size] [--ascii]`: world generation report.
- `node tools/docscheck.js`: doc size budgets, broken relative links, the six sections in every system doc.
- Slow runs: each new world takes 1–2 s to generate; running several seeds can exceed two minutes.

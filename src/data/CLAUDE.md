# src/data — editable tables

Treasures and artifacts, upgrades and workers, decision cards, road events, names. Logic rules: `src/game/CLAUDE.md`.

- Keep ids stable (saves and sprites refer to them). Capability treasures (`capability: 'wind' | 'seal' | 'smoke'`)
  have `placeIn: []` and are put in play by stories (`src/game/situations.js`), never placed at random.
- Card loot is bounded by the place's wealth (`fitting()` in `encounters.js`): do not hand a shrine a king's crown.

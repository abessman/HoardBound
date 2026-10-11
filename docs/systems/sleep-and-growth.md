# Sleep and growth

Size tiers, coming of age, the long sleep with its thieves and hunters, the keeper, and the awakening.

## Intent
- Sleep is the defining choice: years pass, the dragon matures, civilisation develops, and the sleeping lair is
  vulnerable. Nothing resets.
- Growth needs a hoard big enough and an age old enough; both are shown as the milestone (see goals-stories-renown).
- The first sleep teaches; it does not end the campaign.

## How it works
### Age tiers
| Tier | Age | Hoard strength needed | Sight | Carry |
| --- | --- | --- | --- | --- |
| Hatchling | 0+ | — | 3.2 | 4 |
| Young | 8+ | 1 000 | 4.8 | 10 |
| Adult | 40+ | 6 000 | 7 | 25 |
| Ancient | 150+ | 30 000 | 11 | 60 |

(Raised from 400 / 3 000 / 20 000 so the first milestone takes roughly ten expeditions; "hoard energy" in code is
shown to the player as **hoard strength**: stored value, artifacts double.) Growing consumes 10% of the next
tier's requirement in coin. Sleeping with too little hoard strength heals and ages but does not advance the tier
("restless sleep"). **Growth happens in the year you come of age during a sleep** (if the hoard can feed it then),
so a later theft cannot undo it.

### Sleep
Durations: season nap, 5, 20, 50 years; adult adds 100, ancient 200. Prep panel shows expected growth,
healing, upkeep, defence readiness, worker stability, what the door turns back, offerings, and whether a theft
before you come of age could stop the change. Per-year simulation: construction, loyalty, settlements develop,
rulers change, wars progress, tribute, offerings, thieves (targeted or plunder), hunters (slaying attempts)
resolved against defences; warnings allow voluntary interruption; a breach of the sleeping chamber forces waking.
Awakening screen compares before/after, lists new capabilities, how the world answered (with causes) and the next goal.

- Thieves: chance from hoard value, attention, overflow, concealment and realms that know the lair; strength
  6–26 + 6 per tier (+10 with magic) vs defence + traps + ward. Hatchlings draw fewer, smaller burglars.
- Hunters need a reason (hostility, funded hunters, attention, a sworn enemy, a known lair); hatchlings draw fewer.
  **The first sleep never kills**: hunters who break in wake the hatchling to fight; later sleeps can slay
  (Legend mode ends the campaign; Mythic mode forces a century's slumber).
- Keeper: optional, one or two illustrated care episodes per sleep that modify the same simulation.

## Code
- `src/game/sleep.js` (durations, preview, stopChances, stepYear, tryGrow, thieves, hunters, finish), `src/game/keeper.js`, view `src/views/sleepview.js`.
- Tiers: `HB.TIERS` in `src/game/state.js`.

## Tests
- `tools/test.js` *sleep*, *hoard value vs room, strongroom, thieves*, why-now and preview checks.
- `node tools/cyclebot.js [seed]`: a headless robber bot plays the opening cycle and reports pacing.

## Known issues and tuning
- From the bot: always robbing and flying straight home reaches 1 000 in ~10–18 trips but heats realms to
  Hunting, draws sworn hunters and usually fails the first growth sleep.
- Mythic death skips a century without simulating it in detail.

## Related
[lair-and-economy](lair-and-economy.md) · [realms-and-memory](realms-and-memory.md) · [goals-stories-renown](goals-stories-renown.md)

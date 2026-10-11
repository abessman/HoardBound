# Goals, stories and renown

The milestone and Aims board, local stories with their capability treasures, consequence summaries, titles, and
the log of how the world answered.

## Intent
Agreed with the owner after the first playtest: systems alone did not give clear goals, understandable
consequences or satisfying milestones. At any moment the player should know **what they are trying to achieve,
how the next action helps, and what changed because of it**. Art waits until this loop works.

The opening is one cycle: *choose a useful target → make a consequential choice → bring home a meaningful
reward → see progress toward growth → prepare for sleep → awaken with a new capability and a visible world reaction.*

Then (0.7.0, after the owner, and a second opinion from ChatGPT, found the early game a grind: rob without
killing was safe and optimal, and good play was a pay cut): give the player *something to want next beyond the
bar*, and a world that answers. Starts differ between worlds.

## How it works
- **Milestone** (map HUD panel under the status plaque, Aims board, lair status): "Become a young dragon —
  Hoard strength 240 / 1 000 · Age 3 / 8 — Next: …". The requirements are the real ones (`HB.TIERS`), what you
  carry is pending until stored, and the board lists what growth unlocks. The next step is concrete and changes
  with the situation (gather / fly home / reinforce the door / beware hunters / sleep N years). A **Story** line
  shows the most urgent local story.
- **Aims board** (G): concrete opportunities tagged by aim — *Grow stronger*, *Build trust*, *Build fear*,
  *Secure your sleep*, *Become known* — each saying what it yields. Urgent and story items first. Selecting one
  shows it on the map or opens the lair tab.
- **Local stories** (`HB.situations`): generated from real actors near the lair, one chosen per world, more after
  long sleeps. Templates:
  - *raided farm*: defend it (see raids-and-encounters).
  - *stolen tribute*: steal the chest and be hunted by the captain / kill the captain and return it for trust,
    a hidden ruin and a safe barn / parley for a seasonal cut that heats the realm and may talk / buy the charm.
  - *taken envoy*: seize and free the envoy for the Deepwarden's Seal and fee-less dwarves / ransom for gold
    and dwarven hatred.
  - *slayer's bounty*: ambush the slayer for the purse and the Smoke-Glass / turn the paying villages by trust
    or fear (the slayer leaves and warns you of hunters) / let the slayer come.
- **Capability treasures** open places: wind-gated crags (`L.flags.requires = 'wind'`, Gale-Feather Charm),
  seal-gated vaults (Deepwarden's Seal), escapes (Smoke-Glass). `HB.caps.has(state, cap)`.
- **Consequence summary** after every encounter (`ConsequenceScene`): a headline ("You robbed Stoneford's
  merchants."), what you carry and what it does once stored ("→ +2 defence. Hoard strength 240 → 425 of 1 000"),
  story outcomes, the place's change (poorer, burned, safe, trusts you less), each realm's fear/hostility/trust
  deltas, heat steps and what it learned ("Caravans of X will ride with more guards"), riders on your trail,
  "No trust gained" when none was, the shift in your name, title progress, wounds, and the next step. It
  reports; it does not moralise.
- **Renown** (`src/game/renown.js`): deeds earn named titles with real effects — the Road Thief (tolls),
  Guardian of <place> (willing workers, protection), the <Breed> Terror (fear ×1.5, tribute +15%), the Merciful
  (ransom acceptance +15%, trust ×1.5), the Castle-Thief and Bane of Heroes (+10 prestige; heroes come stronger),
  Warden of the Roads (4 guarded caravans; merchants send gold each year), the Overlord (+10 dominance), Liege of
  <your vale> (3 oaths; +1 warning while you sleep), the Tyrant (2 occupations; resistance grows a third slower). The latest
  title shows with the name on the HUD; the Aims board shows who knows you and what each unearned name would change.
- **World reactions with causes** (`state.reactions`): every time a realm learns something, a heat step is
  reached, a title is earned, a pact or tribute starts, thieves rob you or a village you cared for is sacked, the
  reaction is logged with *why*. Shown on the Aims board and the awakening screen.

## Code
- Milestone and opportunities `src/game/goals.js`, view `src/views/aimsview.js`.
- Stories `src/game/situations.js` (templates, `HB.caps`, scene decoration, hooks from encounter/ransom/worldsim).
- Summaries and reactions `src/game/consequences.js`, view `src/views/consequenceview.js`. Titles `src/game/renown.js`.

## Tests
- `tools/test.js` *goals, good deeds, renown, consequences* and *situations, heat, hunters, pursuit, offerings*
  (openings differ across seeds; every template exercised).

## Known issues and tuning
- Four story templates; scenes reuse the camp, hero and defend layouts. More templates and a seasonal calendar
  (tax convoy, harvest, pilgrims, winter) are next.
- Opportunity ranking is heuristic. The Aims board has a sixth aim, *Grow your domain* (found or grow the home
  settlement, take oaths, rebuild, occupy, answer revolts): see [domain-and-influence](domain-and-influence.md).

## Related
[raids-and-encounters](raids-and-encounters.md) · [realms-and-memory](realms-and-memory.md) · [lair-and-economy](lair-and-economy.md) · [domain-and-influence](domain-and-influence.md) · [ideas: domain and endgame](../ideas/domain-and-endgame.md)

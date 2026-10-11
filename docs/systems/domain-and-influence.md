# Domain and influence

What each settlement is to you (allegiance), how far your rule reaches (influence), the settlement that grows at
the foot of your hill, and how the map shows it. Built in 0.8.0 from [the domain and endgame ideas](../ideas/domain-and-endgame.md)
(sections 3–7 and 10–11); the endgame itself (sections 8–9) and undead settlements are not built yet.

## Intent
- Hoard becomes power, power becomes influence, influence becomes a domain: familiar actions (defend, protect,
  demand, raid, sleep) gain a long-term purpose without a separate city builder.
- Good and evil are two real paths with their own actions and rewards. Evil is faster and pays more; its costs
  (resistance, revolt, hunters, a ruined land) are visible and have causes.
- Influence is reach, not loyalty: a place inside the wash owes you nothing until it swears, pays or yields.
- The parchment map stays parchment: light washes, a dotted edge and changed ink glyphs, strongest near the lair.

## How it works
### Statuses (`HB.domain.statusOf`)
Derived from existing state, so nothing is stored twice:

| Status | From | Member | Influence reach |
| --- | --- | --- | --- |
| Protected | a willing tribute pact (`tribute.protect`; farms can be protected now) | yes | its own land |
| Allied | protected + an oath (`L.flags.allied`) | yes | its land and the neighbours |
| Tributary | unwilling tribute (`tribute.demand`) | yes | its own land |
| Occupied | `L.occupation` (new location field) | yes | its land and the neighbours |
| Resisting | an occupation in revolt (`L.occupation.resisting`) | no | none |
| Ruined | burned or abandoned | no | none |

### Influence (`HB.domain.influence`)
By subregion. The lair reaches its own land once the dragon is young (strength 1), its neighbours once a
settlement exists (2) and two lands out at stage 3 (3). Members add their reach; strength falls by one per
neighbouring land. Each land's colour comes from who projects into it: kind members and a kind home push it
gold-green, tributaries, occupations and a cruel home push it rust; reach alone is a faint sepia. Occupying a place
needs it to lie inside your influence, so rule spreads from neighbour to neighbour.

### The settlement at your hill (`state.domain.home`)
Founded when the dragon is young and its name leans one way (benevolence ≥ 10 or ≤ −10): a **refuge** if a
protected place or one within 30 leagues trusts you (trust 40); a **coerced camp** if a place pays tribute or two
captives or enslaved workers are held. It is checked on every return home and every sleeping year.

| Stage | Kind (gold a year) | Cruel (gold a year) | To reach it |
| --- | --- | --- | --- |
| 1 | Refuge (30) | Coerced Camp (50) | founding, above |
| 2 | Village (70) | Fortified Settlement (110) | 5 years, 1 member of your kind, Guard Post |
| 3 | Flourishing Town (140) | Citadel (220) | 10 years, 3 members, Forge, no breach / revolt for 10 years |
| 4 | Castle and Sanctuary (260) | Dark Stronghold (400) | 20 years, 5 members, Entrance level 2, adult dragon |

Each stage adds construction speed, guard strength, lair defence and warnings (`src/data/domain.js`). A kind
home offers its own people as willing workers; stage 3 makes allies sketch far lands as rumours. A cruel home builds
faster and pays more but gathers unrest each year (held down by guards and the guard post); at 60 it revolts:
gold lost, the lair's place told, progress reset, sometimes a stage lost. Its stage 3+ spreads fear to nearby realms.
Hunters getting inside the lair frighten a kind home's settlers (progress reset). Gifts or levies pile up while you
are awake and are collected with offerings when you come home; while you sleep they go straight to the hoard.

The home follows your deeds: its character drifts 20% a year toward your benevolence; past ±15 against its path
it turns (a refuge whose people flee your cruelty becomes a camp one stage lower, and the reverse).

### Deeds (arrival-card choices, `HB.domain.choicesFor`)
- **Take their oath** (protected, trust 50, a year under protection or saved from raiders): becomes allied.
  A protected place that has trusted you for three years asks to swear (reaction + Aims).
- **Help rebuild** a burned farm, village or town: 40–300 gold from what you carry, then the hoard; +30 trust.
- **Occupy** (young+, inside influence, leverage from fear, dominance, tribute or a raid this year against defences):
  12% of its wealth a year and two labourers (enslaved) for the lair; resistance starts at 15 and grows about
  5 + 2×tier a year minus fear; at 60 it revolts (pays nothing, funds hunters); three years unanswered and it is free.
- **Crush the resistance** (resistance → 10; fear, hatred, poorer) or **Ease the yoke** (back to tributary).
- **Raze it** (tributary or occupied): half its wealth now if you can carry it; its tribute is lost for good.
- **Broken promises**: raiding a protected or allied place ends the pact (trust 0) and every other protected place
  loses 15 trust. Raiding an occupied place lowers its resistance.

### On screen
- Map: territory wash (low-resolution overlay, smoothed) with a dotted edge, toggle `Territory` (T) and a small key;
  pennants beside members (gold with a sun = protected or allied, rust = tributary, black with a red eye =
  occupied, crossed swords = in revolt); the home settlement drawn beside the lair with its name.
- Glyphs (`HB.domain.markField`, chunks re-render when the domain changes): under tyranny bare and burned trees,
  jagged ash-dark mountains and ash near the lair and occupied places; under a protector fuller groves with gold
  flecks and cultivated fields near the lair and allies.
- Lair → Domain tab: the home, what it gives, what the next stage needs (✓/✗ with hints), your rule, members.
- Preview "Rule" line; arrival-card mood line; consequence summary lines (status changes, members lost, influence
  growing or shrinking); Aims board aim *Grow your domain*; sleep preview (growth, unrest, resistance); awakening.
- Titles: Liege of <your vale> (three oaths: +1 warning), the Tyrant (two occupations: resistance grows a third
  more slowly).

## Code
- Rules `src/game/domain.js`; tables `src/data/domain.js`.
- Hooks: `encounter.js` (arrival choices, broken promises, oath offers after a defence, place mood),
  `tribute.js` (farms can be protected, occupation pays and does not lapse, home gifts collected),
  `lair.js` (defence, guards, warnings, build rate, home workers), `worldsim.js` (accrual, allied help),
  `sleep.js` (yearly domain, breach, preview), `travel.js` (founding on return), `consequences.js`, `goals.js`,
  `preview.js`, `renown.js`, `save.js` (`state.domain`, `occupation`, positions of places made during play).
- Views: `mapview.js` (overlay, edge, key, pennants, home settlement, glyph variants), `mapart.js` (new glyphs),
  `lairview.js` (Domain tab), `sleepview.js` (awakening section).

## Tests
`tools/test.js` section *domain: allegiance, influence, the settlement at your hill*: founding both ways, oath and
influence, stage growth and bonuses, gifts, broken promises, the home turning, occupation, resistance and revolt,
crush, raze, rebuild, a revolting camp, save round trip (including places made during play).

## Known issues and tuning
- All numbers are first guesses: stage years, member counts, gold, unrest and resistance rates. Tune after the
  owner's playtest. Influence by subregion can feel large (a stage 1 home reaches about seven lands).
- No undead settlements yet (needs dark powers from the endgame). No lair exterior view; the home shows on the map.
- Allied places do not yet send soldiers to the endgame or ask you to defend them against a named enemy.

## Related
[realms-and-memory](realms-and-memory.md) · [lair-and-economy](lair-and-economy.md) · [goals-stories-renown](goals-stories-renown.md) · [map-and-exploration](map-and-exploration.md) · [ideas: domain and endgame](../ideas/domain-and-endgame.md)

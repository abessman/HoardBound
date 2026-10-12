# Domain and influence

What each settlement is to you (allegiance), how far your rule reaches (territory), the settlement that grows at
your hill, offerings, and how the map shows it. Built in 0.8.0 from [the domain and endgame ideas](../ideas/domain-and-endgame.md);
reworked in 0.11.0 to the owner's phases (below). Castle politics is the next update ([ideas](../ideas/castle-politics.md)).

## Intent
- Hoard becomes power, power becomes influence, influence becomes a domain: familiar actions (defend, protect,
  demand, raid, sleep) gain a long-term purpose without a separate city builder.
- Good and evil are two real paths with their own actions and rewards. Evil is faster and pays more; its costs
  (resistance, revolt, hunters, a ruined land) are visible and have causes.
- Influence is reach, not loyalty: a place inside the wash owes you nothing until it swears, pays or yields.
- It grows by life phase (owner, 0.11): **1 hatchling** a little colour around the lair, widening slightly with the
  hoard; **2 young** the circle grows, devoted camps gather around your hill, places inside it answer you, and
  offerings come once your lair is found; **3 adult** a village forms (good or bad style), more offerings, gifts and
  recruits, and you bring villages, towns and some castles into your fold; **4 ancient** a castle or dark tower
  rises beside the lair. Your rule never leaves your **home region** (one of seven): the rest is for your rivals.
- The map stays parchment: a watercolour wash that bleeds in, and changed ink glyphs near your rule.

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

### Territory (`HB.domain.influence`, 0.11)
A field over cells. The lair's circle has a radius by phase, growing within the phase with hoard strength toward
the next tier (`REACH`: hatchling 1.5→3.5 cells, young 4→8, adult 9→15, ancient 16→22), plus 0.8 per home stage;
its outline wobbles (fixed per world). Members add lobes (protected and tributary 2.5 cells, allied and occupied
4). Only land of the home region counts. Colour per cell: the strength-weighted side of its sources (a kind home
or members gold-green, cruel rust; before a home exists, your leaning, faint while undecided). `reachOf` gives 0–3,
`inInfluence` true inside, `outsideReason` says why not (past the region's storms, or past the edge).

### The settlement at your hill (`state.domain.home`)
Founded when the dragon is young and its name leans one way (benevolence ≥ 10 or ≤ −10): **pilgrims' camps** if a
protected place or one within 30 leagues trusts you (trust 40); **cult camps** if a place pays tribute or two
captives or enslaved workers are held. Stage 1 is drawn as one to three camps around the hill (more with years).
Checked on every return home and every sleeping year.

| Stage | Kind (gold a year) | Cruel (gold a year) | To reach it |
| --- | --- | --- | --- |
| 1 | Pilgrims' Camps (30) | Cult Camps (50) | young, founding above |
| 2 | Village (70) | Fortified Settlement (110) | adult, 3 years, 1 member of your kind, Guard Post |
| 3 | Flourishing Town (140) | Citadel (220) | adult, 10 years, 3 members, Forge, no breach / revolt for 10 years |
| 4 | Castle and Sanctuary (260) | Dark Stronghold (400) | ancient, 15 years, 5 members, Entrance level 2 |

**Gifts** (adult, stage 2+, Lair → Domain): 100 or 500 gold from the hoard counts as 1 or 3 years of growth (up to
60% of a stage's years); kind: the places that trust you +2/+6; cruel: unrest −12/−40. **Recruit** opens the
Workers tab, where the home's people are hired.

Each stage adds construction speed, guard strength, lair defence and warnings (`src/data/domain.js`). A kind
home offers its own people as willing workers; stage 3 makes allies sketch far lands as rumours. A cruel home builds
faster and pays more but gathers unrest each year (held down by guards and the guard post); at 60 it revolts:
gold lost, the lair's place told, progress reset, sometimes a stage lost. Its stage 3+ spreads fear to nearby realms.
Hunters getting inside the lair frighten a kind home's settlers (progress reset). Gifts or levies pile up while you
are awake and are collected with offerings when you come home; while you sleep they go straight to the hoard.

The home follows your deeds: its character drifts 20% a year toward your benevolence; past ±15 against its path
it turns (a refuge whose people flee your cruelty becomes a camp one stage lower, and the reverse).

### Offerings and your lair being found (0.11)
`state.domain.lairFound` is set, and reported once with its cause, when hunters or thieves reach the lair or riders
follow you home; a home settlement or members also make it known (`lairKnown`). From young on, with the lair known,
places of the home region within 20 + 5×tier leagues that trust you (30, gratitude) or fear you (40, appeasement)
bring offerings while they prosper (`tribute.offeringPlaces`); ×1.6 from adult.

### Deeds (arrival-card choices, `HB.domain.choicesFor`)
- **Young, inside your territory** (`asks`): *Ask for news* (trust 20 or fear 30; rumours 12 leagues around, once a
  year); *Accept their hospitality* (trust 30) or *Demand a feast* (fear 30): health and stamina, once a year; the
  feast costs trust and benevolence and raises fear.
- **Adult, inside your territory and home region** (the fold): oaths, fealty and occupation below.
- **Accept their fealty** (a castle, not a realm's seat, trust 55): an allied castle; its realm resents it.
- **Take their oath** (protected, trust 50, a year under protection or saved from raiders): becomes allied.
  A protected place that has trusted you for three years asks to swear (reaction + Aims).
- **Help rebuild** a burned farm, village or town: 40–300 gold from what you carry, then the hoard; +30 trust.
- **Occupy** (adult, inside your territory, leverage from fear, dominance, tribute or a raid this year against defences):
  12% of its wealth a year and two labourers (enslaved) for the lair; resistance starts at 15 and grows about
  5 + 2×tier a year minus fear; at 60 it revolts (pays nothing, funds hunters); three years unanswered and it is free.
- **Crush the resistance** (resistance → 10; fear, hatred, poorer) or **Ease the yoke** (back to tributary).
- **Raze it** (tributary or occupied): half its wealth now if you can carry it; its tribute is lost for good.
- **Broken promises**: raiding a protected or allied place ends the pact (trust 0), every other protected place
  loses 15 trust, and its elders enter the grievance ledger. Raiding an occupied place lowers its resistance.
  Crushing a rising (60%) and razing (50%) also make sworn enemies ([realms-and-memory](realms-and-memory.md)).

### On screen
- Map: a watercolour wash (`mapview.buildOverlay`: per-pixel wobbling circles at 6 px per cell, a wandering noisy
  edge, pigment pooled at the rim, blooms and paper grain), bleeding outward from the lair when it appears, is
  toggled on or grows; toggle `Territory` (T) and a small key;
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
- Views: `mapview.js` (overlay, edge, key, pennants, home settlement, glyph variants), `mapart.js` (new glyphs; all
  replaceable by map art packs as `map.home.<path>.<stage>`, `map.marker.pennant.<status>`, `map.terrain.*`),
  `lairview.js` (Domain tab), `sleepview.js` (awakening section).

## Tests
`tools/test.js` section *domain: allegiance, influence, the settlement at your hill*: territory by phase and hoard,
never outside the home region, founding both ways, oath and occupation only as an adult, stage growth, gifts,
broken promises, the home turning, resistance and revolt, crush, raze, rebuild, a revolting camp, save round trip.
*world of seven regions…*: news, hospitality and fealty; *situations…*: offerings only once the lair is found.

## Known issues and tuning
- All numbers are first guesses: radii by phase, stage years, member counts, gold, unrest and resistance rates,
  offering reach. Tune after the owner's playtest.
- Castles do not yet hold territories or go to war over villages (next update: [castle politics](../ideas/castle-politics.md)).
- No undead settlements yet (needs dark powers from the endgame). No lair exterior view; the home shows on the map.
- Allied places do not yet send soldiers to the endgame; the Warlord's hosts do strike them ([endgame](endgame.md)).

## Related
[realms-and-memory](realms-and-memory.md) · [lair-and-economy](lair-and-economy.md) · [goals-stories-renown](goals-stories-renown.md) · [map-and-exploration](map-and-exploration.md) · [endgame](endgame.md) · [ideas: domain and endgame](../ideas/domain-and-endgame.md)

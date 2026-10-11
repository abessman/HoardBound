# Lair and economy

Treasure as power, the hoard and its room, upgrades and workers, captives and ransom, tribute and offerings.

## Intent
- Possessions are power: strength comes from what is stored in the cave, never from cargo. Spending or losing
  treasure costs power immediately; age grows the body permanently.
- Wealth does not take the room that gold does: the chamber holds treasure by bulk, value shows separately.
- Upgrades must answer problems the player has met (thefts, hunters, a coming sleep), never be a checklist.

## How it works
### Power from treasure
Possession bonuses from treasure stored at home (never from cargo), with diminishing returns per category:

| Category | Bonus |
| --- | --- |
| Gold & silver | Scale toughness (defence), health |
| Gems | Breath power, stamina |
| Ancient artifacts | Unique effects, mutations; capability treasures open places (see goals-stories-renown) |
| Weapons & armour | Bite/claw, defence |
| Books & knowledge | Intel quality (estimate accuracy, reveal radius), ransom insight |
| Royal treasures | Prestige, dominance (ransom and tribute leverage) |

Formula shape: `bonus = cap * (1 - exp(-value / scale))` per category, plus flat artifact effects.

### Hoard and room
- Room is by bulk: 100 coins per space, items by weight. Base 40 spaces; chamber levels 120 / 400 / 1 500 / 6 000.
  What does not fit lies outside the chamber, easy for thieves.
- Value shows apart from size: the pile shifts from copper goods to gold to gem-studded with value per space,
  the cave glows with total worth, a trophy wall shows the prized pieces, the dragon wears or guards its best one.
- The Strongroom locks the top 3 / 8 / 20 treasures (named first, then by value); thieves take what is worth most
  for its size, coin included, never what is locked.

### Lair
Pixel cutaway that grows with chambers. Upgrades: treasure chamber, reinforced entrance, strongroom, concealed
approach, traps, guard post, sleeping chamber, magical ward, forge, larder, lookout. Each shows cost, resulting
balance, stat change and which risk it mitigates. Construction progresses over active days or sleep years.
The Build tab lists upgrades with a reason first ("Thieves took the Ember Crown while you slept"; "A hoard worth
1 196 draws thieves") and shows what the next level changes in the terms of the threat ("turns back 22% → 41% of thieves").

Workers: dwarves (excavate, fortify), goblins (scavenge, crude defences), human engineers (traps,
mechanisms). Paid workers cost gold and stay loyal; enslaved workers are free but build unrest → sabotage,
escape, revolt and faction attention. Captives for ransom and workers for labour are separate roles.
Villages that trust you (trust ≥ 30 or Guardian) send willing workers: no fee, lower wages. Grateful dwarves
(a freed envoy) send crews without a fee.

### Ransom, tribute, offerings
Captives occupy cargo. At home: demand gold, a treasure, livestock or a concession; see likely range,
family/faction and risks (delay, refusal, deception, rescue). Each captive resolves once. Paying families
resent; release builds trust. Strong, feared dragons can demand yearly tribute from a settlement's real
wealth; it lapses under new rulers or poverty. Protected prosperous settlements can pay willingly and
produce hereditary guardians.

**Offerings** from trusting villages (trust ≥ 30, prosperous, unthreatened, within 30 leagues): seasonal while
awake (collected at home), yearly while asleep, shown as a range. Raiders may still ruin them while you sleep;
your guards, loyal guardians and a protection pact raise their chance to hold. An outlaw pact pays a seasonal cut.

## Code
- Power: `src/game/stats.js` (`HB.CATEGORIES`); treasure tables `src/data/treasures.js`; hoard, bulk, trophies `src/game/hoard.js`.
- Lair, upgrades, workers, why-now reasons: `src/game/lair.js`, `src/data/upgrades.js`, view `src/views/lairview.js`.
- Ransom `src/game/ransom.js`; tribute, protection, offerings `src/game/tribute.js`; petitions `src/game/petitions.js`.

## Tests
- `tools/test.js` *economy*, *hoard value vs room, strongroom, thieves*, *tribute*, offerings checks.

## Known issues and tuning
- Opportunity and offering numbers are first guesses; offerings scale with village wealth (≈4% a season).

## Related
[sleep-and-growth](sleep-and-growth.md) · [goals-stories-renown](goals-stories-renown.md) · [realms-and-memory](realms-and-memory.md)

# Raids and encounters

Animated side-view raids (rob, defend, ambush, duel), decision cards, arrival choices, and what happens after.

## Intent
- Raid control: the dragon auto-advances through a side-view scene; time drops to slow-motion when a new
  opportunity enters range; the player clicks a highlighted target or presses its hotkey/controller button;
  hold to speed, hover to wait. No twitch platforming.
- Full animated scenes: caravan, camp, castle, village/town/city, defend, ambush, hero duel, battlefield, dragon duel.
  Illustrated decision cards: monastery/shrine, ruin, tower, glade, hold, travel events, ransom, sleep events,
  keeper episodes, lair intrusions, petitioners, arrival choices.
- Good deeds are playable scenes, not just declining to raid.

## How it works
Side-view pixel scene (320×180 logical, 4× scale). Meters: health, stamina (also breath), cargo, alarm.

Actions (shown only when relevant): swoop & grab, breathe fire, bite/claw, land & smash (adult+), roar,
wait/pass, capture, feed, withdraw. Alarm rises with time and noise: bells → militia → archers → ballista →
knights/hero. Alarm changes what is on screen. Withdraw is always available; pursuit depends on alarm.

Templates: caravan (exposed chest → guarded wagons), camp (sleepers → organised survivors), castle (exposed
tower goblet → vault/noble captive deeper), village/town/city (livestock → granary → treasury), novice hero
duel, battlefield (loot between armies), dragon duel (rival lair). Defences scale from faction learning and
resources, never from the dragon's age alone. A realm on Guard locks village valuables behind doors and posts watchmen.

- **Defend** (`templates.defend`, `raid.mode='defend'`): outlaws sacking a farm or village — raiders, stolen
  goods and a burning roof but no militia and nothing of the village's to take. Bite, burn, or roar to rout them;
  wounded or frightened raiders break and run (sometimes dropping loot). Your fire still burns houses. The bar is
  the raiders' progress, a clock your noise does not speed up. Win when no raider is left; then return or keep
  what you recovered.
- **Ambush** (`templates.ambush`): guarding a caravan can turn into a defence of its wagons.
- **Caravan arrival**: rob it, demand a toll (needs the Road Thief or adulthood), guard it (2 days; trust, a gift;
  may become an ambush), or let it pass.
- **Settlement / story arrival card**: drive off raiders, story choices (parley, buy a charm, sealed door…), raid
  or approach, tribute/protection where it makes sense, scout, fly on.
- **Decision cards** (`src/data/encounters.js`): loot is bounded by the place's wealth.
- After every encounter a consequence summary (see [goals-stories-renown](goals-stories-renown.md)).

## Code
- Engine `src/game/raid/raid.js`, layouts `src/game/raid/templates.js` (plus story decoration from `situations.decorateScene`), view `src/views/raidview.js`.
- Dispatch, arrival cards, tolls, escorts, consequences: `src/game/encounter.js`. Cards: `src/views/cardview.js`.

## Tests
- `tools/test.js` *raid*, *card encounters*, *defeat safety*, and the defend/caravan checks in *goals, good deeds, renown, consequences*.

## Known issues and tuning
- First-pass balance: castles are deadly to hatchlings who linger (by design); town watchmen may be too strong early.
- The hero duel and rival duel reuse generic staging; monastery and glade are cards, not scenes.

## Related
[travel](travel.md) · [realms-and-memory](realms-and-memory.md) · [lair-and-economy](lair-and-economy.md)

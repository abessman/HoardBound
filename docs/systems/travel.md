# Travel

Flight across the map: stamina and days, road events, roosting and resting, arriving, flying home, pursuit.

## Intent
- Travel is visible and costs something: stamina, days, and what the world does meanwhile.
- Home is always reachable (a forgiving rule): out of stamina, you come down, rest and fly on.
- A loud raid sends riders after you; how you fly home decides whether they learn where you sleep.

## How it works
- Cost per league = 1.6 × terrain factor × load (1 + carried/capacity × 0.5) × winter 1.15 × artifact/breed
  modifiers × injury. Days = distance / speed. The dotted rings on the map show one-way range and half of it.
- Road events roll during flight (8 kinds, `src/data/events.js`); the burdened-pursuit event offers dropping cargo.
- Exhausted mid-flight: roost (card) and continue. "Rest here" in the wild: 2 days, +50% stamina, +10% health,
  a little attention if inside a realm. A village that trusts you lets you rest in its barn: full stamina, no attention.
- Arriving home deposits cargo, rests up to 12 days, collects offerings and outlaw cuts, and shows what storing did.
- Arriving at a place starts its encounter (arrival card for settlements, story places and caravans).
- **Pursuit** (`HB.pursuit`): a raid ending under alarm ≥ 50 or with captives (and defenders still standing) sends
  riders. Flying straight home shows them the lair (`learned.lairFound`, +4 attention; each realm that knows
  raises sleep threats). Lose them by landing 8+ leagues from the raid, waiting 6 days, or with the Smoke-Glass.
- **Ambush**: a hunting party that reaches you stops the flight and opens the Hunters! card (fight / flee / pay).

## Code
- `src/game/travel.js` (cost, estimate, canBegin incl. wind gates, begin/update/arrive/arriveHome, roost, rest, points).
- Pursuit and hunting parties: `src/game/heat.js`. Road events: `src/data/events.js`.

## Tests
- `tools/test.js` *travel*, *return and deposit*, *defeat safety*, and pursuit checks in *situations, heat, hunters, pursuit, offerings*.

## Known issues and tuning
- Hunting parties walk straight toward you and ignore terrain.
- Lose-the-riders distance (8) and give-up time (6 days) are first guesses.

## Related
[map-and-exploration](map-and-exploration.md) · [realms-and-memory](realms-and-memory.md) · [raids-and-encounters](raids-and-encounters.md)

# Endgame: the great struggle

What the dragon fights for once it is grown. Built as a prototype in 0.9.0 from sections 8–10 of
[the domain and endgame ideas](../ideas/domain-and-endgame.md), with the owner's answers: one opposition per world,
and each path ends in one final challenge (the final battles are not built yet).

## Intent
- The domain prepares the dragon for a world-changing objective; the objective gives the long middle of the
  campaign a direction.
- **Whatever path you choose, the opposition forms when you reach that phase** (owner). It would not make sense
  to have both: a kind dragon faces the Hollow King, a cruel dragon hunts the Crystals of Life.
- **Three lieutenants open the final battle with the demon king; six crystals open the final challenge with the god
  of this world** (owner). The demon king can be challenged early, at a major disadvantage (owner; not built yet).
- Each victory has a visible mechanical effect; no three identical bosses chipping at one hidden health bar.

## How it works
### When it begins (`HB.endgame.check`)
On every return home and every sleeping year. Needs an adult dragon (tier 2) whose rule leans one way
(`HB.domain.path`: the home settlement's path, or benevolence ±10). Fixed for the campaign once it begins; a dragon
known as neither is told on the Aims board what is missing. Earlier, once a young dragon is 25 and leans one way, a
rumour foreshadows it (one reaction). On the map a card announces it with the whole structure.

### A kind dragon: the Hollow King (`state.endgame.path = 'shadow'`)
- New places (created at a suitable empty cell, positions saved): the **Hollow Throne** (a dark fortress, as far
  from the lair as an adult can fly) and three **strongholds**. Names come from small pools in `src/data/endgame.js`.
- **Warlord** (playable): his warbands march on the places that trust you (protected or allied; else the nearest
  village to the lair): an orc host threat about once every 80 days awake, half the years asleep. Hosts are
  tougher outlaws (orc raiders), harder to repel without you, and burn more. His **warcamp** is an animated raid:
  orc warriors and archers, war drums waking the camp, reinforcements, and the Warlord (a melee boss). Allied
  places' scouts lead you in at dusk: two sleepers per ally (up to four). Kill him and the rest flee: the hosts stop,
  places under your protection gain trust, realms that know you trust you more, the next lieutenant is rumoured.
- **Sorcerer** (wards over the throne) and **Blightmother** (renewal; a blight on fields) are placed and described;
  their battles are not built yet (their cards say so).
- The **fortress** card lists which powers still protect the king; the last battle is not built yet.

### A cruel dragon: the Crystals of Life (`path = 'crystals'`)
- Six **sanctuaries** in different realms: the first near enough for an adult, later ones farther, the last on the
  isles (needs an ancient dragon to cross the sea). Each crystal has a guardian, a benefit to its realm and a loss.
- **Greenmarrow** (playable): the grove is an animated raid with warden archers and the Warden of the Grove (a
  ranged boss). The crystal is **warded while the guardian lives** (grab disabled, with the reason); killing the
  guardian breaks the ward. Taking it: every settlement in that region loses a quarter of its maximum wealth for
  good, its realms gain hostility and hunters, every realm that knows you grows more hostile, the land around the
  sanctuary is blighted on the map, and the next sanctuary is rumoured. In the hoard it is a named treasure
  (3 000 gold, counts double for growth) with an effect (Greenmarrow: +60 health, faster healing). Thieves can steal
  it like any named treasure.
- The other five are placed and described; when all six are taken, Ysmera, the Heart of the World, comes (not built).

### On screen
Announcement card; a seal over each known place of the struggle (purple with a crown, green with a crystal);
glyphs for the fortress, warcamp, tower, fen and sanctuary; a line under the goal; an aim *The great struggle* on
the Aims board; a section on waking; summary lines after a boss falls or a crystal is taken.

### Test starts (`HB.presets`)
`index.html?scene=map&preset=adult-kind` (also `adult-cruel`, `young-kind`, `young-cruel`) jumps a new campaign to
that point: tier, age, upgrades, protected or tributary neighbours, the home settlement, and (adult) the struggle.
Campaigns started from the URL autosave to a `test` slot, never over the player's own autosave.

## Code
- Rules `src/game/endgame.js`; data, names, crystal treasures `src/data/endgame.js`; test starts `src/game/presets.js`.
- Scenes `warcamp` and `sanctuary` in `src/game/raid/templates.js`; bosses, wards, orcs in `src/game/raid/raid.js`.
- Hooks: `encounter.js` (struggle card, raid end), `worldsim.js` (hosts; host repel and burn), `sleep.js`, `travel.js`,
  `domain.js` (map marks, signature), `goals.js`, `preview.js`, `save.js` (`state.endgame`; `lieutenant`, `crystal`, `foe`).
- Views: `mapview.js` (card, seals, goal line), `mapart.js` (glyphs), `sprites.js` (orc, warlord, warden, crystal),
  `illustrations.js` (shadow, sanctuary), `raidview.js`, `sleepview.js`.

## Tests
`tools/test.js` section *endgame: the great struggle (prototype)*: no endgame for the young, the rumour, an
undecided adult waits, both paths begin with their places, hosts strike and are fought as orcs, the warcamp boss
falls and its effects, the path stays fixed, saves keep it, six sanctuaries in different realms, the ward, the realm
withering, map blight, the crystal's power in the hoard.

## Known issues and tuning
- Prototype: two of three lieutenants, five of six crystals and both final battles are not playable yet.
- Boss strength tuned with a simple bot: an adult kills the Warlord losing about two thirds of its health and the
  Warden of the Grove losing about 40%. Hosts' frequency is a first guess.
- Lieutenants do not yet react to each other's deaths; allies do not send soldiers to the last battle.

## Related
[domain-and-influence](domain-and-influence.md) · [raids-and-encounters](raids-and-encounters.md) · [realms-and-memory](realms-and-memory.md) · [ideas: domain and endgame](../ideas/domain-and-endgame.md)

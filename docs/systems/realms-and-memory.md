# Realms and memory

Factions and how they answer you (fear, hostility, trust, heat, hunting parties), named grudges and loyalties,
wars, settlements over the years, rival dragons, alignment.

## Intent
- The world remembers. Settlements, factions and named families record what the dragon did and respond with
  identifiable causes (escorts, vaults, hunters, tribute, guardians, grudges).
- Endgame matters: rival dragons and faction wars that are readable on the map and exploitable.
- Evil should be tempting and powerful, its costs visible and causal; good play has its own actions and rewards.

## How it works
### World simulation
Settlement tiers rise and fall with wealth and safety; destroyed places recover slowly or are abandoned to
ruins. Faction memory (fear, hostility, trust) drives escorts, vaults, rescue efforts, hunter funding, route
shifts, petitioners, tribute and guardians. Named grudge and loyalty chains persist across years (a survivor
becomes a hunter; a hunter's students found an order; a protected family becomes guardians). Wars between
adjacent factions move borders, send armies that deplete garrisons, create battlefields and mercenary
offers. Rival dragons raid and hoard in far regions; the elder wyrm is the final duel. Legend status at
ancient tier with high prestige (or the elder wyrm slain) ends the chronicle with a legend; play continues.

Outlaw camps raid nearby farms and villages (`L.threat`); ignored, the place is sacked and the camp grows richer;
villages that trust you may hold on their own while you sleep.

### Heat (short-term answer, while awake)
`f.dragon.heat`: thefts, fire and captives raise it; time (about a level a season), good deeds and robbing
outlaws cool it. Calm → **Wary** (merchants hire guards) → **Guarded** (convoys; villages lock valuables away and
post watchmen) → **Hunting** (a named party walks toward you; fight, flee, or pay mercenaries). Theft hurts a
treasury that recovers; burning damages recovery itself. Sworn hunters (a robbed captain, a slayer) are not
mercenaries: they cannot be bought, and they lead attacks on the sleeping dragon as grudges.

### Alignment
`alignment` runs −100 (tyranny) … +100 (benevolence). Burning communities, enslaving, breaking ransom
bargains and killing captives push negative; protecting, fair bargains, releasing captives and honest tribute
push positive. It changes appearance and how factions interpret the dragon (fear vs trust gains).

## Code
- Factions, wars, armies, rivals `src/game/factions.js`; grudges, orders, loyal houses `src/game/history.js`.
- Heat, hunting parties, pursuit `src/game/heat.js`.
- Caravans, heroes, threats, yearly settlement change `src/game/worldsim.js`.

## Tests
- `tools/test.js` heat, hunters and threat checks in *situations, heat, hunters, pursuit, offerings*.

## Known issues and tuning
- Armies jump along their march each year and besiege abstractly; rivals never attack the lair directly.
- Heat rates and hunter speed are first guesses; tune after playtests.

## Related
[raids-and-encounters](raids-and-encounters.md) · [sleep-and-growth](sleep-and-growth.md) · [ideas: domain and endgame](../ideas/domain-and-endgame.md)

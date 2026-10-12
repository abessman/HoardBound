# Realms and memory

Factions and how they answer you (fear, hostility, trust, heat, hunting parties), the grievance ledger and
loyalties, the Reputation screen, wars, settlements over the years, rival dragons, alignment.

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

### The grievance ledger (0.11, `HB.history`, Reputation → Grudges)
Everyone sworn against you, kept in `state.memory.grudges`: name, kind (*hunter* sworn to kill you, *house* a
family's grudge, *betrayed* people whose protection you broke, *rebel* a rising you crushed), cause, place, realm,
year, strength (2+), and a log of what they did since. Sources: survivors of burnings and sacks, houses of captives,
heroes who survive you, sworn hunting parties, the kin of slain heroes, broken promises, crushed risings, razed
towns. A hunter who survives a meeting grows stronger and earns an epithet (the Scarred, Dragonfoe, the Unbroken,
Dragonbane); the strongest leads the next hunt on your sleeping lair. It ends as *dead*, *forgiven* (weregild: 150
gold × strength from the hoard, for houses, the betrayed and rebels; sworn hunters cannot be bought) or *passed to an
heir* (old age). `grievance`, `escalate`, `end`, `amend`.

### Reputation (0.11, `src/views/reputationview.js`, the map's Reputation button, F)
*Your name*: benevolence from feared to trusted, titles and their effects, the next names in reach, who speaks of
you, whether your lair is known (and how), who is loyal, your domain, your deeds. *Realms*: each known realm's fear,
trust and hostility, its heat level and what it does, what it has learned (and whether it knows your lair), its
wars. *Grudges*: the ledger, active first, with strength pips; tap one for its story and weregild.

### Heat (short-term answer, while awake)
`f.dragon.heat`: thefts, fire and captives raise it; time (about a level a season), good deeds and robbing
outlaws cool it. Calm → **Wary** (merchants hire guards) → **Guarded** (convoys; villages lock valuables away and
post watchmen) → **Hunting** (a named party walks toward you; fight, flee, or pay mercenaries). Theft hurts a
treasury that recovers; burning damages recovery itself. Sworn hunters (a robbed captain, a slayer) are not
mercenaries: they cannot be bought, and they lead attacks on the sleeping dragon as grudges.

### Alignment
`alignment` runs −100 (tyranny) … +100 (benevolence). Burning communities, enslaving, breaking ransom
bargains and killing captives push negative; protecting, fair bargains, releasing captives and honest tribute
push positive. It changes appearance and how factions interpret the dragon (fear vs trust gains). It also decides
which kind of settlement grows at your hill (benevolence ≥ 10 a refuge, ≤ −10 a camp); what each settlement is to
you (protected, allied, tributary, occupied, resisting, ruined) is in [domain-and-influence](domain-and-influence.md).

## Code
- Factions, wars, armies, rivals `src/game/factions.js`; grievance ledger, orders, loyal houses `src/game/history.js`;
  the Reputation screen `src/views/reputationview.js`.
- Heat, hunting parties, pursuit `src/game/heat.js`.
- Caravans, heroes, threats, yearly settlement change `src/game/worldsim.js`.

## Tests
- `tools/test.js` heat, hunters and threat checks in *situations, heat, hunters, pursuit, offerings*; the ledger
  (epithets, strengthening, weregild, saves) in *world of seven regions, territory by phase, grudges*.

## Known issues and tuning
- Armies jump along their march each year and besiege abstractly; rivals never attack the lair directly.
- Heat rates and hunter speed are first guesses; tune after playtests.
- Ledger entries from before 0.11 lack a log and an epithet; they show their original text.
- Castle lordships and feuds you can join are the next update ([ideas](../ideas/castle-politics.md)).

## Related
[raids-and-encounters](raids-and-encounters.md) · [sleep-and-growth](sleep-and-growth.md) · [domain-and-influence](domain-and-influence.md) · [ideas: domain and endgame](../ideas/domain-and-endgame.md)

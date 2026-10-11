# HoardBound expansion notes

Recorded 11 October 2026.

## Purpose and status

This document records the proposed next expansion: a dragon's growing influence creates a domain, communities build around its lair, the parchment map reflects its character, and good and evil playstyles lead toward different endgame goals.

**Status (0.8.0):** the domain is built: allegiance statuses, influence, the settlement at your hill, territory
washes and glyphs, and the deeds that spread or lose your rule (sections 3–7, 10–11; see
[docs/systems/domain-and-influence.md](../systems/domain-and-influence.md)). Not built yet: the benevolent and tyrannical endgames
(sections 8–9) and undead settlements (section 7). The rest of this document is the original notes, unchanged.

These are design notes for future implementation. Adding this document does not implement any mechanics. Read DESIGN.md and CLAUDE.md alongside it. The player's latest ideas below establish the direction; suggested rules, pacing, and examples remain proposals until chosen or tested. Do not silently replace existing campaign rules or claim these features already work.

The goal is to give the dragon's activities an accumulating purpose: hoard becomes power, power becomes influence, influence becomes a domain, and the domain prepares the dragon for a world-changing objective.

## 1 The player request

At a certain point, people can build around the dragon: a town or castle with farms and other infrastructure. A good dragon can develop a flourishing castle settlement; a bad dragon can develop a dark fortress and a devastated surrounding landscape.

Show a light highlight of territory under the dragon's influence. As influence spreads, other towns can be converted, subjugated, or destroyed. Evil territory can contain burned forest husks, ash-dark land, and mountains drawn like jagged teeth. Destroyed towns might be raised as undead settlements.

Good territory should become holy, happy, and prosperous, potentially gaining restrained color on the map. Evil territory can also gain color, using darker red, brown, and black.

Possible evil endgame: conquer or destroy the world and break six crystals of life, adding their power or the crystals themselves to the hoard.

Possible good endgame: an evil force appears in the world. Approximately three lieutenants support it, such as a corrupted wizard and an orc king. Defeating each weakens the central enemy before the final confrontation.

The references to Mordor, Sauron, and Saruman communicate atmosphere and structure. Create original names, characters, geography, and lore rather than directly importing those characters.

## 2 The problem this expansion should solve

The player reported that the early build did not yet feel fun: no clear loop, unclear growth requirements, unclear renown, no obvious way to build trust or be good, and repeated burning for small amounts of gold. Workers and upgrades did not have an understandable purpose.

The player has asked Claude to address that earlier feedback. These expansion notes should connect to those improvements, not replace them with more invisible systems.

At any time the interface should make three things legible:

- What am I trying to achieve?
- How can the next expedition help?
- What changed because of my last action?

Territory and endgame objectives can provide medium- and long-term goals. They cannot compensate for unrewarding raids or confusing growth rules. Preserve a satisfying expedition, return, investment, sleep, and awakening loop.

## 3 When a domain begins

Suggested starting point: unlock domain development around the adult stage, after sufficient reputation and a stable lair. The exact age, tier, and thresholds are open.

Foreshadow it earlier through visitors, offerings, requests for protection, frightened neighboring rulers, and small groups wanting to settle nearby. Do not make a complete kingdom appear suddenly without a cause.

A suggested milestone sequence:

1. A vulnerable hatchling survives and gathers its first hoard.
2. A young dragon acquires recognizable local habits and relationships.
3. A powerful dragon attracts settlers or coerces a workforce.
4. A settlement develops around the lair.
5. Neighboring communities join or submit, extending the domain.
6. A regional power becomes involved in an endgame struggle.

The dragon remains the protagonist. Development should be partly automatic and responsive to choices, rather than requiring the player to place every farm or manage every resident.

## 4 Communities around the lair

| Aspect | Benevolent domain | Tyrannical domain |
| --- | --- | --- |
| Settlement identity | Protected village growing into a castle settlement | Encampment growing into an oppressive fortress |
| People arrive because of | Safety, trust, opportunity, prosperity | Fear, conquest, allegiance, forced relocation |
| Visible development | Farms, cottages, gardens, workshops, walls, castle | Mines, furnaces, barracks, towers, captive labor |
| Benefits | Willing workers, offerings, information, defenders | Tribute, soldiers, seized wealth, coerced labor |
| Main vulnerabilities | Broken promises, inadequate protection, hostile corruption | Revolt, sabotage, flight, resistance coalitions |

These are distinct strategic paths. Good play must have actions and benefits of its own; it should not merely mean declining profitable raids. Evil should be tempting and powerful, but its costs must be visible and causal.

Suggested settlement progression:

- Benevolent: refuge -> village -> flourishing town -> castle and sanctuary.
- Tyrannical: coerced camp -> fortified settlement -> citadel -> dark stronghold.

Progress can depend on security, resources, allegiance, and elapsed years. Keep the first implementation to a handful of milestones and visible additions. Existing lair upgrades can support this development rather than creating a second unrelated building economy.

Show farms, workshops, or barracks appearing in the surrounding map and, where practical, in a lair exterior view. Each milestone should explain why it occurred and what it enables.

## 5 Influence and allegiance

Influence is territorial reach. Trust, fear, hostility, and allegiance describe relationships. These are related but not identical.

A settlement inside an influence overlay is not automatically owned, loyal, prosperous, or safe. Show its actual status when selected: protected, allied, tributary, occupied, resisting, ruined, or undead.

Suggested benevolent expansion actions:

- Protect a town against bandits or a hostile army.
- Escort or defend trade.
- Rescue or release a captive.
- Honor an agreement.
- Help rebuild a devastated community.
- Accept a request for protection and fulfill it.

Suggested tyrannical expansion actions:

- Force a settlement into tribute.
- Defeat its defenders and occupy it.
- Capture strategic leaders or workers.
- Convert it into an outpost of the domain.
- Raze it, sacrificing its living economy.
- If dark powers have been unlocked, raise its ruins as an undead stronghold.

Spread should follow meaningful relationships, connected settlements, and successful deeds. Avoid expanding a circular radius solely because an invisible meter increased. A simple implementation can use settlement-centered influence connected by nearby routes or subregions.

Allegiance can weaken through neglect, betrayal, rebellion, rival influence, or inability to protect a settlement. Conquest should not be an effortless irreversible paint-the-map action.

## 6 Parchment map direction

The overworld remains a Tolkien-inspired literary fantasy map: warm aged parchment, fine sepia or black ink, hatched mountain symbols, repeated forest glyphs, thin rivers, dotted roads, small settlement marks, and elegant readable place names.

Do not turn this into a fully colored isometric landscape. The colorful earlier visual board was too far from the intended map. The revised example used parchment and ink with a small colorful dragon moving above it.

Territory should add subtle washes and symbol changes while preserving the paper beneath them.

| Area | Benevolent treatment | Tyrannical treatment |
| --- | --- | --- |
| Influence wash | Pale gold, faint soft green, restrained warm light | Rust red, umber, charcoal, muted black |
| Forest glyphs | Fuller canopies and flourishing groves | Bare trunks, burned husks, skeletal branches |
| Mountain glyphs | Existing geographic form, possibly cleaner light hatching | Sharper tooth-like silhouettes and ash-dark hatching |
| Settlements | Intact roofs, gardens, banners, repaired walls | Dark towers, damaged roofs, furnaces, occupation marks |
| Holy or corrupted sites | Small luminous or sacred ink accents | Small ominous rune or corruption accents |

The region must remain legible and recognizably cartographic. The dragon can remain a small saturated pixel-art accent. Boundaries should use light washes, subtle edging, or hatching rather than heavy opaque polygons.

Apply the strongest visual changes near the lair first; more distant territory transforms gradually. Preserve place identities and underlying geographic topology. Tooth-like mountains can be a stylized corruption treatment rather than an unexplained change in physical elevation.

Provide a territory overlay toggle if the wash obscures terrain or labels. Use symbols and text as well as color. Transformation should reflect persistent state, not temporary scene decoration.

## 7 Conversion destruction and undeath

Taking over a town should present different outcomes rather than always reducing it to rubble.

- Preserve and protect: retain living prosperity and earn voluntary benefits.
- Subjugate: retain an economy under tribute, with resentment and resistance.
- Convert: alter allegiance and development toward the dragon's domain.
- Destroy: gain immediate spoils or remove a threat, but lose its recurring economy.
- Raise the ruins: create an undead settlement if the dragon has earned the appropriate power.

Undeath is an exploratory possibility, not an approved universal action. It should require a meaningful artifact, ability, or campaign milestone, so every hatchling cannot immediately turn every village into an undead farm.

Suggested tradeoff: living communities produce commerce, willing expertise, and negotiations; undead strongholds offer persistent defenses or dark influence but no normal living prosperity. Details and balance remain open.

Consequences should persist across sleep. A raised town should be recognizable as the same former location, with a chronicle entry recording what happened.

## 8 Benevolent endgame

An original ancient evil becomes active in the world as the campaign develops. Its introduction should be foreshadowed through rumors, corruption, refugees, raids, or attacks on protected communities.

Approximately three lieutenants sustain the central enemy. The player suggested a wizard comparable in role to Saruman and an orc king or warlord; the third role remains open.

Suggested distinct functions:

| Lieutenant | Role | What defeating it removes |
| --- | --- | --- |
| Corrupted sorcerer | Wards and destructive magic | The central stronghold's magical protection |
| Warlord or orc king | Armies and military expansion | Reinforcements or major field armies |
| Third lieutenant, to be designed | A different source of enemy power | For example regeneration, supply, or corruption spread |

Each victory must have a visible mechanical effect. Avoid three identical bosses that merely reduce an unexplained final-boss health number.

Allied settlements provide intelligence, resources, defenders, and access. Their protection matters because the enemy threatens them. The dragon's benevolent domain becomes the coalition needed for the final confrontation.

Suggested objective presentation: locate and defeat the lieutenants, show which powers remain active, then assault the final stronghold. Whether attacking early is allowed remains open; if allowed, explain why it is harder.

Use the existing travel and animated encounter structure where possible. Distinct scenery, enemy behavior, and tactical choices can supply variety without creating three unrelated minigames.

## 9 Tyrannical endgame

Six crystals of life anchor the world's remaining protection or vitality. They are held in different realms or distinct sites. The evil dragon aims to conquer the world and seize or extinguish these sources.

The player's wording proposed destroying the crystals and adding them to the hoard. Resolve that physical ambiguity before implementation.

Suggested interpretation: break each crystal's protective binding, remove it from its sanctuary, and add the captured or corrupted crystal to the hoard. This preserves both the destruction of its world-protecting function and the collection fantasy. Actual destruction with collectible shards or absorbed essence is another possibility.

Each crystal should have:

- A distinct name and recognizable appearance.
- A location, guardian, and discovery method.
- A specific benefit to its realm before capture.
- A clear change to that realm after capture.
- A meaningful effect or mutation for the dragon.
- A visible place in the hoard and campaign progress display.

Do not make all six identical raids. Their guardians and defenses should offer different strategic problems. Specific elements, powers, names, and rewards are not yet decided.

As crystals fall, surviving realms respond through coalitions, hunters, fortification, evacuation, or changed tactics. Territorial expansion supports the campaign through bases, labor, intelligence, and resources.

Show a clear counter such as Life crystals claimed 2 / 6, with discovered targets and known barriers. Clarify whether capturing all six is sufficient for victory or whether total territorial conquest is also required. Do not require searching every map tile to discover one remaining invisible village.

## 10 Path identity and changing direction

A good or evil identity should emerge from behavior and relationships. Do not force an irreversible moral selection at hatching.

Possible identities include protector, collector, overlord, and scourge. Local relationships can differ: one town trusts a dragon that another fears. Territory appearance should reflect established rule and cumulative behavior, not flip instantly after a single kind or cruel action.

Open questions:

- When does an endgame path become active?
- Can a dragon change direction after developing a domain?
- Can both crystal guardians and the ancient evil exist in the same world?
- What happens if a formerly benevolent dragon captures a life crystal?
- How does redemption or betrayal affect existing followers?
- Is a neutral collector campaign supported?

Do not answer these by silently replacing the campaign with a rigid binary system. A small first implementation can support two clearly signposted routes while documenting how switching will work.

## 11 Connection to the core loop

The expansion should give familiar actions a purpose:

- Expeditions collect wealth, establish relationships, and remove threats.
- The hoard funds improvements while continuing to grant possession power.
- Workers and defenses make the growing settlement and sleeping dragon safer.
- Sleep lets communities develop and rivals act.
- Awakening reveals the domain's progress, damage, or rebellion.
- The player chooses a regional objective that advances the endgame.

Every major action needs a short consequence summary: treasure, power, trust or fear, allegiance, territory changes, and objective progress. Explain the reason for a change. Renown should identify who knows the dragon and what it is known for, with relevant opportunities unlocked.

A suggested midgame example:

1. Defend a village from a warband.
2. The village requests protection and joins the domain.
3. During sleep, its farms prosper and settlers arrive near the cave.
4. Awaken to a fortified settlement and new intelligence about the enemy.
5. Use that intelligence to locate a lieutenant.

A suggested evil example:

1. Defeat a town's watch and demand submission.
2. Establish an outpost; surrounding territory gains a faint rust wash.
3. During sleep, furnaces develop but resistance organizes.
4. Suppress or bargain with resistance while preparing to breach a crystal sanctuary.
5. Seize the crystal; show the corrupted realm and the new hoard object.

## 12 Suggested implementation order

This sequence is advice, not a claim that the player has authorized implementation in this documentation task.

1. Confirm that the revised opening has legible growth, trust, renown, rewards, and consequences.
2. Add settlement allegiance and one small domain around the lair.
3. Add gradual settlement milestones using the existing economy and time simulation.
4. Add subtle territory washes and transformed glyph variants.
5. Add a few actions that expand, protect, or subjugate the domain.
6. Prototype one crystal sanctuary and one lieutenant, with real consequences.
7. Expand to six crystals and roughly three lieutenants once their gameplay is satisfying.
8. Consider undead settlements after ordinary conversion and destruction work.

Keep state and rendering separate. Reuse existing faction, history, world simulation, lair, save, and encounter systems where practical. Store allegiance, transformations, domain milestones, and objective outcomes in persistent saves. Follow the repository's headless-safe logic and fixed-canvas architecture.

If the generation or save format changes, follow CLAUDE.md's compatibility instructions. Do not quietly invalidate existing campaigns. The exact module structure should be chosen from the current code when implementation begins.

## 13 Acceptance questions

Before calling the expansion successful, check:

- Does the player know how to gain influence through either playstyle?
- Does one meaningful action visibly change a settlement or relationship?
- Is the home settlement recognizably growing around the dragon?
- Can the player distinguish influence from actual allegiance?
- Do good actions create opportunities as useful as evil actions?
- Does burning a town sacrifice something valuable?
- Does the map retain its parchment and ink character after transformation?
- Does sleep preserve and advance domain consequences?
- Does defeating a lieutenant visibly weaken the central enemy?
- Does taking a crystal visibly change its realm and the hoard?
- Are long-term goals clear without making early raids irrelevant?
- Can the system be understood without several new unexplained meters?

## 14 Decisions still to make

Adult-stage unlocking, exact settlement tiers, influence calculations, growth costs, holy and corrupted mechanics, undead requirements, the third lieutenant, all six crystal identities, path-switching rules, final victory conditions, and the relationship to the existing elder-wyrm endgame remain open.

Preserve the idea's scope: a dragon becomes a force that shapes the map and its inhabitants. Build it through visible consequences of the existing loop rather than adding a separate city builder or grand-strategy game.

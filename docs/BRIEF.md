# Dragon Hoard — original build brief

*This is the specification the project started from (received as `Dragon_Hoard_Complete_Claude_Instructions.txt`).
Decisions made afterwards live in `../DESIGN.md`, which takes precedence where they differ.*

## How to use this file

The working title is Dragon Hoard or HOARD. The task is to build a playable draft, not merely write a design document. This brief includes the newest dragon simulator concept and preserves exploratory ideas without treating every suggestion as a settled requirement.

## Launch prompt

You are my game designer, gameplay programmer, systems designer, and art director. Build the most comprehensive, coherent, playable first draft of the game described in this attached brief that your environment can support. Make reasonable implementation choices and proceed to construction. Do not stop at a pitch, a plan, a mockup, or a list of questions.

The game is a dragon life simulator: hatch as a vulnerable baby dragon in a procedurally generated fantasy world; reveal a grid map; visibly fly from your cave to targets; conduct animated 2D raids with meaningful decisions; carry treasure home; gain power from the treasure you possess; expand and defend your lair; sleep through years of history; awaken older into a changed world.

The fantasy is becoming a legendary dragon through cunning, greed, survival, and time. A hatchling cannot simply burn every target. Early play should involve caravan ambushes, camp raids, quick castle thefts, ransom captures, and fights against inexperienced heroes. The player should feel vulnerable at first and increasingly formidable as the dragon matures.

The map must be an actual play space with a traveling dragon, moving targets, limited knowledge, and consequences. Raids must be animated side-view scenes in which the dragon advances and the player chooses actions. Do not replace these with a collection of static text cards. Choices and readable animation matter more than demanding arcade controls.

Include every core system in the brief at a lightweight but functional level. Preserve the optional child Keeper idea in an optional, small sleep encounter system or clearly documented extension if your environment cannot support it. Do not expand it into a second full RPG. Build depth through interacting simple rules rather than adding dozens of meters or disconnected minigames.

Use the attached brief as the authoritative specification. Values, formulas, sample names, and sample content marked as proposals are starting points you may tune. Explain material deviations. If a technical constraint forces a reduction, retain a complete playable loop and report precisely what works, what is simplified, and what is deferred. Never claim that a button or visual implements a system when it has no effect.

Deliver the runnable game, editable source in the format your environment supports, instructions, a compact feature status list, and a short explanation of how to continue development. Verify a complete run from hatching through raids, return, hoard growth, lair investment, sleep, world change, and awakening. Spend your effort building the game rather than restating this prompt.

## 1 Product intent and scope

This is the newest version of the idea: a dragon simulator with strategic map travel, animated tactical raids, a persistent lair, treasure-based power, and civilization evolving over time. An earlier idea focused on arranging individual artifacts in a dungeon with adjacency bonuses and tower defense. That earlier dungeon-builder concept is catalogued separately. Do not silently turn this version into that game. Significant treasures should be memorable, but a treasure-placement puzzle is not required here.

The core loop is:

1. Explore and choose an opportunity.
2. Fly there across the visible map.
3. Raid, bargain, capture, or retreat through an animated encounter.
4. Return home with what you can carry.
5. Add treasures to the hoard or spend some to improve the lair.
6. Prepare for sleep and advance years.
7. Awaken stronger, discover consequences, and repeat.

The three central systems must reinforce each other: possessions give power; settlements remember behavior; sleep grows the dragon while giving the world time to develop and threaten it.

Aim for a playable 30–60 minute draft with more than one sleep and meaningful replay variation. This duration is a prototype proposal, not a fixed production requirement. The long-term fantasy spans centuries. In the draft, accelerated time and a small simulated region can demonstrate it.

Use a persistent campaign within each generated world. Do not assume a roguelike reset after every sleep. Provide a new-world option and save/load if supported. No multiplayer, full 3D world, exhaustive dynastic simulation, or separate child RPG is needed.

## 2 Start as a vulnerable hatchling

The dragon hatches in a small cave. The world already contains communities, roads, wealth, defenders, and political affiliations. Begin with limited map visibility, low health and stamina, modest breath power, small carrying capacity, and a short practical flight range.

A few coins or one inherited relic can establish the hoard; this is optional flavor. Nearby opportunities must make the opening playable. Guarantee at least one manageable caravan, traveler, or camp and a route home. Do not generate an opening where every available action is lethal.

Early strength comes from choosing timing and targets. A lone novice hero is plausible prey. A guarded castle is a place for a quick theft through an exposed window, not a fortress a hatchling can conquer. An unfavorable encounter must allow recognition of danger and an attempt to withdraw.

Keep an adult dragon visually and mechanically different from a hatchling. Growth should change size, animation, range, carrying capacity, available raid actions, and how factions respond.

## 3 Procedural world map

Generate a seeded grid map with terrain such as forests, plains, hills, mountains, water, roads, settlements, and caves. A proposed first size is 24 by 24 tiles, adjustable for legibility and performance. The cave is the home anchor. Generate connected roads and enough reachable targets to support progression.

Include these location and encounter types across the content pool:

- Farms and villages.
- Moving caravans and individual travelers.
- Bandit, hunter, or military camps.
- Mines and dwarven settlements.
- Monasteries and shrines.
- Castles and larger towns or cities.
- Ruins holding older artifacts.
- Wandering heroes and organized hunting parties.
- Other creatures or rival dragons as advanced content.

Represent kingdoms or factions simply through ownership, relationships, resources, and response rules. The map need not simulate every citizen. Settlements should have a persistent identity, population or development tier, wealth, defenses, recovery state, faction, and memory of the dragon.

Use fog of war. Unexplored tiles are obscured. Flying reveals nearby terrain and points of interest. Previously explored areas remain known, but exact current wealth and defenses can become stale during sleep. Distinguish known information from estimated or outdated information. Do not give the player perfect global intelligence.

Selecting a target opens a compact preview: distance, likely wealth, estimated defenses, known special treasure, faction, recent history, and travel cost. State what is uncertain. Risk descriptions should explain why a target is dangerous rather than display an unexplained percentage.

## 4 Visible travel and getting home

When a destination is selected, animate the dragon flying slowly from point to point across the map. The flight must use world coordinates, consume time and stamina, reveal territory, and interact with actual map entities. Do not teleport directly into an encounter after a decorative transition.

Offer pause, normal speed, and fast-forward. Pause or slow automatically when a meaningful choice occurs. The animation should be satisfying on early journeys and tolerable on repeated ones.

Travel speed and cost can depend on age, stamina, weather, injury, distance, and carried load. Implement a small readable subset first. Show flight range or expected return cost before launch. The player should be able to turn back or divert toward a newly discovered opportunity when it is practical.

Possible travel events include a passing merchant wagon, road patrol, smoke from an unknown settlement, storm, shelter opportunity, hostile flying creature, or pursuer. Use a limited event pool with clear outcomes. Do not interrupt every tile with a pop-up.

Returning is part of the expedition. Loot occupies carrying capacity and can slow the dragon. Injuries and low stamina make the homeward flight riskier. A player may drop loot to escape or accept a detour. A successful raid does not deposit treasure into the cave instantly. Defenders may dispatch hunters after a conspicuous raid.

For the prototype, leave stamina recovery and emergency landings forgiving enough to prevent tedious softlocks. Carrying a captive consumes capacity. Treasure being carried contributes to cargo and risk; treasure safely stored at home contributes to stable hoard power. This distinction is a proposed implementation rule.

## 5 Animated 2D raid system

Use a side-view raid scene. The dragon moves forward through a location while buildings, wagons, defenders, civilians, obstacles, and loot animate. The player makes tactical interventions as opportunities appear. An auto-moving dragon with actions and optional pauses is the preferred starting interpretation of the conversation, not a mandatory twitch platformer.

Raids should feel like small unfolding stories with a readable physical scene. Let the player see a tower preparing a shot, a guard changing position, a wagon moving, a relic carrier fleeing, or reinforcements entering. Choosing an action visibly changes what happens.

Core actions, shown only when relevant:

- Swoop and grab exposed treasure.
- Breathe fire at a selected target.
- Bite or claw an isolated opponent.
- Land and smash when age and strength permit.
- Roar to frighten or disrupt.
- Dodge, wait, or pass an unfavorable opportunity.
- Capture a valuable person or skilled worker.
- Feed on livestock or available prey for recovery.
- Withdraw with the current cargo.

You do not need to expose every action in the first minute. Use encounter-specific buttons or hotkeys, recognizable target highlights, and short descriptions of likely benefits and dangers. Time should pause or slow during major decisions. Avoid hidden short timers that punish players for reading.

The main raid meters are health, stamina or breath energy, cargo, and alarm. Breath can use stamina in the draft to avoid redundant resource bars. The longer and louder a raid becomes, the greater the alarm: bells ring, militia gather, archers organize, a ballista prepares, or a hero arrives. Alarm must alter the scene and threats.

The central question is how greedy the player wants to be. A modest safe haul should be available before a more tempting dangerous opportunity. Every raid should offer an exit rather than demand total destruction.

Tradeoffs include extracting valuables versus destroying their source, removing defenses versus spending time, easy loot versus a special artifact, and profitable restraint versus terror. Burning a community may reduce future wealth and increase hostility. Precise theft can preserve its economy while attracting better guards later.

A castle encounter should support a quick grab-and-run route even when its main defenses are overwhelming. Risk information must distinguish a plausible theft from a suicidal attempt to conquer the castle.

## 6 Minimum encounter variety

Build several reusable scene templates with different layouts, animations, targets, and decisions. A common raid engine is appropriate; identical scenes with different titles are insufficient.

| Encounter | Early opportunity | Temptation or complication | Persistent consequence |
| --- | --- | --- | --- |
| Caravan | Grab an exposed chest | More wagons and guards behind it | Merchants improve escorts or alter routes |
| Camp | Strike sleeping or separated occupants | Armed survivors organize | Survivors warn their faction |
| Castle | Snatch a goblet from an exposed tower | Vault or noble captive deeper inside | Lord pays ransom or funds hunters |
| Novice hero | Defeat a lone inexperienced adventurer | Dangerous weapon despite low rank | Loot and a future grudge or hero lineage |
| Village or farm | Livestock or lightly guarded savings | Granary or communal treasury | Recovery, abandonment, fear, or tribute |
| Monastery or ruin | Relic with a special effect | Wards, guardians, or unknown curse | Religious attention or magical development |

A suggested initial pool is 12–20 targets across the region, six encounter templates, roughly 20 named treasures, and a dozen reusable consequence events. These are tuning targets. Include the first four encounter types as functional opening or early-game content.

## 7 Hoard and treasure based power

The dragon's power depends on what it possesses, not primarily on an experience bar. Use two complementary forms of wealth: accumulated currency and memorable named objects. Avoid requiring the player to position every coin on a grid.

The following affinities are proposed defaults from the discussion, not immutable lore:

| Treasure category | Suggested affinity |
| --- | --- |
| Gold and silver | Scale toughness and physical growth potential |
| Gems | Magical strength and breath abilities |
| Ancient artifacts | Special abilities or mutations |
| Weapons and armor | Combat prowess |
| Books and knowledge | Intelligence, magic, and better information |
| Royal treasures | Prestige, dominance, and influence |

Make individual artifacts tangible: a name, category, source, visible hoard representation, and an understandable effect. Example proposals include a sapphire that improves breath, a knight's shield that increases defense, a royal signet that improves ransom bargaining, a map that reveals ruins, or an old bell that strengthens a lair ward. These are illustrative content, not previously approved exact items.

Possession versus spending is essential. Wealth safely in the hoard supplies bonuses. Spending some to hire workers or expand the cave can reduce those bonuses immediately while improving future security and income. Before a purchase show cost, resulting balance, and resulting stat changes. Stealing an artifact from the cave removes its effect. Recovering it restores that effect.

Use diminishing returns so one repetitive gold farming strategy does not erase all other choices. Keep formulas explainable. A proposed model is permanent age-based stats plus bonuses calculated from current stored categories and unique artifact effects. Spending or theft removes possession bonuses; it does not physically shrink the dragon or reverse its biological age.

Sleep converts sufficient hoard energy and elapsed time into permanent maturation. If magic or treasure is consumed during sleep, disclose the cost beforehand. Do not silently destroy cherished named artifacts. Currency or a separate expendable magical offering can cover upkeep if needed.

## 8 Lair expansion and workers

Start with a cave barely large enough for the dragon and its hoard. Show it as a simple side-view or cutaway chamber that grows as the player improves it. The cave should feel like a sanctuary worth protecting, with visible treasure accumulation and dragon growth.

Allow expansion through workers rather than unexplained instant construction. Dwarves can excavate and fortify; goblins can scavenge and maintain crude defenses; human engineers can build traps or mechanisms. Implement a small number of worker groups with simple traits, cost, loyalty, and tasks rather than a population-management game.

The player may hire, bargain for, coerce, or enslave labor. Include paying and capturing workers in the draft at a lightweight level. Captives intended for ransom and workers intended for labor are different roles and should be represented clearly.

Paid workers cost wealth but are more reliable. Enslaved workers require less immediate payment but create unrest, sabotage, escape, rebellion, and hostile faction attention. These costs should visibly affect play, especially over sleep. Tyranny must not be a free efficiency bonus with cosmetic flavor.

Proposed upgrades: larger treasure chamber, reinforced entrance, concealed approach, traps, guard post, sleeping chamber, and magical ward. Explain which risks each mitigates. Construction can finish over active travel time or years of sleep. Give workers one or two useful assignments, such as excavation, defense maintenance, or treasure recovery.

Do not turn the lair into the earlier adjacency-puzzle game. Named objects can be displayed around the dragon without requiring a new placement system.

## 9 Ransom tribute and alternatives to destruction

Let the dragon capture a maiden, noblewoman, prince, merchant heir, or important official during suitable encounters. Treat this as a fantasy hostage-and-ransom system, without sexual content. Resolve captivity through a small panel and world events.

Capturing consumes carrying space and creates pursuit risk. Back home, the player can demand gold, a special treasure, livestock, or a concession. Display a likely ransom range, family or faction, and risk of delay, refusal, deception, or a rescue attempt. A few simple rules are enough.

Paying a ransom can leave the family resentful and able to finance a dragon hunter. Releasing someone or accepting a bargain can improve relations. A hostage should not be an effortless recurring income exploit.

Stronger dragons can demand recurring tribute instead of repeated raids. Tribute is paid from a settlement's actual resources, may lapse under a new ruler, and can stop if the community is impoverished or protected by another faction. A settlement cannot pay infinite gold.

Protecting a prosperous community can be profitable. Devastating it should interrupt trade and reduce future wealth. Different behavior should support becoming a scourge, collector, overlord, or protector without requiring a separate campaign for each.

## 10 Sleep maturation and vulnerability

Sleep is a major player decision. Its purposes include aging, recovering injuries, bonding with magic, and allowing civilization to rebuild wealth. It is not just a skip-time button or a free stat purchase.

At the cave, show intended sleep length, expected development, healing, any upkeep cost, defense readiness, worker stability, and estimated threat. Offer a few meaningful durations rather than a cumbersome calendar. Proposed durations range from short rests to 5-, 20-, and 50-year slumbers; later life can allow centuries. Tune the draft to make at least two sleep cycles achievable.

During sleep, simulate elapsed years and selected significant events. Construction completes, workers remain loyal or rebel, settlements develop, rulers change, tribute fluctuates, thieves attempt entry, and heroes organize. Events should be derived from the world state and prior behavior where possible.

Some thieves seek a specific treasure. Others attempt a larger plunder. Dragon hunters can attempt to kill the sleeping dragon. Lair defenses, followers, loyalty, fear, and known vulnerabilities determine outcomes. Use warnings and a few opportunities to intervene so sleep does not feel like a random punishment generator.

An attack can awaken the dragon early, potentially injured or disoriented, with incomplete maturation. Let the player choose whether to interrupt sleep for a serious warning when practical; an intrusion reaching the sleeping chamber can force waking. Clearly distinguish voluntary interruption, forced awakening, and completed slumber.

On awakening, show a concise comparison: age and size, new abilities, gained and lost treasure, completed upgrades, faction changes, and the most important world events. Reopen the same persistent world. An old village may now be a city; a former enemy may be dead while their order survives.

Proposed age stages: hatchling, young dragon, adult, ancient. Age is necessary but sufficient hoard support can also be required for a major transition. Do not let a player sleep with an empty cave repeatedly to become invincible. Conversely, do not make sleep so punishing that players avoid the defining mechanic.

## 11 Optional child Keeper during sleep

This idea was explored and then deliberately set aside when the design became too complex. Preserve it as optional rather than making it a prerequisite for every slumber.

The favored exploratory version is a small human child avatar or fragment of the dragon's consciousness while the dragon's real body remains asleep. The child tends the dragon. It is physically weak and acts through cleverness, traps, negotiation, and errands rather than dragon combat.

For a comprehensive draft, an optional Keeper setting can introduce one or two brief playable or illustrated decision episodes during sleep: repair a seal, treat an injury, restore a missing offering, persuade miners to remain, or divert thieves. Reuse the lair scene and existing event interface. These should affect the same sleep simulation and then advance time; never require decades of manual chores.

The child's function is care: replenish expendable magical nourishment, maintain defenses, manage a dispute, or briefly acquire a remedy outside. Leaving the cave creates risk. The avatar can draw limited energy from the hoard. If discovered or captured, it may reveal the dragon's location. Its defeat can force premature awakening rather than automatically ending the campaign.

Preserve these alternatives in design notes, without implementing all of them: a literal transformation rather than an avatar; a real mortal Keeper succeeded by later generations; an astral dragon influencing dreams; a dream hoard in which artifacts produce visions; and stewardship through servants. The avatar's identity and whether it develops independent attachments remain open questions. They do not need a large narrative system in the first draft.

If optional episodes cannot be built, document the extension and retain normal sleep as fully functional. Do not replace the dragon game with a child game.

## 12 World memory and evolving civilization

Use persistent local records, not a single generic good-versus-evil bar. A proposed small model stores fear, hostility, and trust per faction, with dragon wealth and tyranny helping determine attention. Prestige can be derived from age, named treasures, and accomplishments.

Responses should have identifiable causes:

- Repeated caravan attacks increase escorts or shift trade routes.
- Repeated jewel theft encourages better vaults or decoy valuables.
- Frequent hostage taking improves noble security and rescue efforts.
- Destruction reduces development and may cause abandonment.
- Protection or fair bargains can create tribute and loyal guardians.
- Capturing workers can provoke their relatives or faction.
- A rich peaceful dragon draws thieves and petitioners.
- A violent tyrant draws heroes, armies, and rebellions.

Give world entities names and a short history. During sleep, villages can become towns and cities, war can change ownership, prosperity can fall, and abandoned cities can become ruins. Implement development tiers and limited faction conflicts rather than simulating a full civilization game.

Enemies should sometimes emerge from history. A survivor of a raid becomes a hunter; a hunter's students found an order; a stolen dragon scale becomes a weapon tradition. A family the dragon protected becomes hereditary guardians. A prototype can represent this with a persistent grudge or loyalty record and a handful of event chains, with names and sources retained across years.

Avoid arbitrary global scaling where every guard becomes stronger just because the dragon aged. Defenses should improve because of resources, time, or learning about this dragon. Small vulnerable targets can remain relevant, while major powers and rivals provide late-game threats.

## 13 Defeat and recovery

Death rules were discussed but not settled. Use a clearly stated proposed default: an ordinary active raid defeat can mean losing carried loot, severe injury, and an emergency return or prolonged recovery. A successful slaying attempt at the exposed sleeping dragon can end the campaign, with a readable warning and aftermath.

Keep a configurable forgiving prototype mode if practical. A more mythic alternative is forced magical slumber, imprisonment, or a plundered lair followed by recovery generations later. Preserve that idea in notes. Do not quietly assume immortality or permanent death for every lost fight.

The player must understand what is at risk before committing to an encounter or deep sleep. Do not implement random instant death without warning. Make setbacks meaningful and provide rebuilding opportunities where the selected rules permit them.

## 14 Presentation and interface

Use a cohesive illustrated 2D fantasy style, charming enough for a hatchling and atmospheric enough for an ancient dragon. Tone was not locked; avoid assuming either grim horror or broad comedy. Prefer readable creatures, silhouettes, terrain, treasure, and scale over dense interface decoration.

The dragon must look like a dragon: wings, tail, head, expressive motion, and changes in size. With simple art, custom vector or procedural drawings and layered animation are acceptable. Avoid relying on emoji, plain rectangles, or generic dashboard cards for the main experience.

Animate wingbeats, movement, fire, impacts, defenders, treasure pickup, retreat, and sleeping breath. Sound is optional, with mute control and no autoplay dependency. Use self-contained assets when external asset access is unavailable.

Main views:

- World map with dragon, fog, targets, routes, time, and compact status.
- Animated raid scene with relevant actions and clear exit.
- Lair showing dragon, treasures, workers, and upgrades.
- Sleep preparation and event presentation.
- Awakening summary and world chronicle.

Offer tooltips, keyboard shortcuts when appropriate, readable text, and click or tap targets. Do not rely on color alone for danger or faction. Show disabled-action reasons. Prevent accidental irreversible actions with a concise in-game confirmation when appropriate.

The chronicle should tell the history of this dragon in a few clear entries: what happened, where, when, and why. Avoid dumping raw simulation logs onto the player.

## 15 Proposed first playable sequence

This sample demonstrates the desired causal loop; it is not a mandatory scripted campaign.

1. Hatch in a small cave. See a road, a caravan, a camp, and the silhouette of a distant castle.
2. Inspect the caravan's modest guards and choose a route with enough stamina to return.
3. Watch the dragon fly there, revealing a nearby village.
4. Enter a side-view caravan scene. Grab the first chest; consider a second guarded wagon; withdraw as alarm rises.
5. Fly home with a visibly heavier load. Deposit currency and a minor gem. See defense and breath bonuses change.
6. Raid a camp or fight a novice hero. Use timing rather than overwhelming damage.
7. Spend some gold hiring dwarves for an entrance upgrade. See the immediate loss of a small hoard bonus and the promised security improvement.
8. Attempt a brief castle theft or capture a noble for ransom. Leave before the strong defenders mobilize.
9. Prepare a sleep. During the years, construction finishes, the village grows, an angry lord funds hunters, and thieves test the entrance.
10. Optionally handle one Keeper maintenance encounter. Otherwise let defenses and earlier decisions resolve the threat.
11. Awaken as a young dragon. See a bigger body, new range, changed treasures, new caravan escorts, and the named lord's grudge.
12. Choose whether to repeat predation, demand tribute, protect a useful settlement, recover stolen treasure, or pursue a more ambitious target.

## 16 Engineering guidance

Choose the simplest implementation compatible with the actual host environment. Do not assume a particular engine, framework, or file structure merely because Claude or Fable is named. If the host makes browser games, a self-contained or modular browser implementation is appropriate. If it supplies a different runtime, use its native capabilities.

Separate world state from presentation. Maintain one authoritative campaign state shared by map, raids, lair, sleep, and optional Keeper episodes. Prefer explicit states such as home, traveling, encountering, returning, sleeping, and awakening. Prevent duplicate loot, repeated ransom payouts, simultaneous impossible travel, and actions applied to stale targets.

Use seeded random generation for reproducibility and a separate advancing random state for outcomes. Store location histories, faction relationships, dragon age, current health, hoard items, cargo, construction, captives, and pending events. Save during safe transitions; loading must preserve meaningful consequences. Export/import saves if host storage is unreliable.

Keep treasure definitions, encounter templates, upgrades, and event rules in editable data where possible. Use a modest deterministic simulation rather than asking a language model to invent every outcome at runtime. No paid services, API keys, or backend should be necessary unless the host already requires them.

If adding an inspectable debug mode, expose the seed and state summaries, plus ways to accelerate testing. Keep debug controls out of the normal player flow. Handle pause and speed changes consistently across travel and animation. Cap frame-time spikes so a backgrounded window cannot instantly consume an entire journey.

## 17 Build order and completeness

First complete one working round trip: generated world, target selection, visible flight, animated raid, retreat, return, and deposited loot affecting stats. Then add lair spending, sleep, and persistent changes. After this loop works, add encounter variety, ransom, workers, reactions, artifact effects, and optional Keeper episodes.

This order is about reliability, not permission to omit the later core systems. Continue until the most comprehensive playable draft the environment supports is delivered. If resources are limited, simplify each system's depth while retaining its consequences.

Core functional requirements: procedural partially revealed map; weak hatchling; visible travel and return; animated decision-based raids; caravans, camps, quick castle theft, novice heroes; cargo and escape; differentiated treasure power; spending tradeoff; cave upgrades; paid or coerced labor with consequences; ransom; sleep, growth, theft and attack risk; evolving locations; persistent reactions; usable controls and restart.

Lightweight additions: tribute, named artifact effects, historical grudge chains, short chronicle, save/load, several sleep durations, and optional Keeper care episodes. Rival dragons, deep dynasty politics, elaborate dream worlds, autonomous servant societies, and full child exploration belong to later expansion unless unusually easy to support.

## 18 Verification and delivery checklist

Before delivering, actually exercise the core loop and fix blockers. Report testing honestly and do not describe an untested path as verified.

- A new world has accessible early targets and a way home.
- Travel changes position, visibility, stamina, and time; pausing and speed controls work.
- At least two approaches in a raid have meaningfully different outcomes.
- Animation reflects the chosen action, and alarm creates actual threats.
- Retreat works with cargo and cannot duplicate loot.
- Carried treasure is not mistaken for deposited hoard value.
- Depositing, spending, stealing, and recovering treasure recalculate the right bonuses.
- Hiring and forced labor create different costs and sleep risks.
- Ransom captures consume capacity and resolve only once.
- Sleep advances age and world state, resolves construction and threats, and can end early.
- Awakening retains the same world with explainable changes.
- Optional Keeper outcomes affect the same dragon and lair if implemented.
- A defeat cannot strand the interface in an unusable state.
- Save/load preserves seed, hoard, age, relationships, and pending consequences if supported.
- The first minute explains where to go, what to avoid, and how to get home.

Deliver the playable build and editable source, how to launch it, controls, feature status, known limitations, and the next most valuable improvements. Distinguish functional systems from mocked or deferred ones. The resulting game should make it possible to say: I stole from that caravan, used its wealth to protect my cave, slept, and woke to find that the survivors had changed the world around me.

# Dragon Hoard build checklist

Use this to assess the playable build. Check a box only when functionality is implemented and verified. A visible button or descriptive text alone does not satisfy a requirement.

## Complete core loop

- [ ] Hatch as a weak dragon in a small cave.
- [ ] Generate a seeded world with limited visibility and reachable opening targets.
- [ ] Inspect target wealth, defenses, distance, and uncertainty.
- [ ] Watch actual map travel consume time and stamina and reveal terrain.
- [ ] Make tactical choices in animated side-view raids.
- [ ] Retreat, carry loot across the map, and deposit it at home.
- [ ] Recalculate power from the treasures currently possessed.
- [ ] Spend wealth on workers and lair improvements with visible stat tradeoffs.
- [ ] Prepare and enter a multi-year sleep.
- [ ] Simulate world development and sleeping-lair risks.
- [ ] Awaken older into the same changed world and repeat.

## Encounters and travel

- [ ] Caravan ambush offers easy loot and a more dangerous second opportunity.
- [ ] Camp raid rewards timing or isolation.
- [ ] Castle allows quick theft without conquering its defenses.
- [ ] Novice hero can be fought and looted but still poses danger.
- [ ] Village, monastery, or ruin adds a distinct scenario.
- [ ] Enemy and dragon animation reflects actions and outcomes.
- [ ] Alarm brings actual reinforcements or escalating danger.
- [ ] Cargo capacity limits loot and captives.
- [ ] Return journey has consequences; loot can be dropped to escape.
- [ ] Travel can pause, accelerate, divert, or turn back.

## Economy and lair

- [ ] Treasure categories grant different understandable bonuses.
- [ ] Named artifacts retain identities, sources, and effects.
- [ ] Spending or losing stored treasure removes its possession bonus.
- [ ] Permanent age progression remains separate from possession bonuses.
- [ ] Paid workers and forced labor differ in cost, loyalty, and risk.
- [ ] Upgrades visibly improve the cave and affect defense outcomes.
- [ ] Ransom captures occupy cargo and resolve only once.
- [ ] Destruction reduces future wealth; tribute consumes real settlement resources.

## Sleep and world history

- [ ] Sleep duration, benefits, costs, and risks are legible before commitment.
- [ ] Construction and healing progress over sleep.
- [ ] Theft and slaying attempts are affected by defenses and past behavior.
- [ ] Interrupting sleep differs from completing it.
- [ ] Dragon size, abilities, and range change with maturation.
- [ ] Settlements develop, recover, decline, or change ownership.
- [ ] Factions respond to specific repeated behavior.
- [ ] At least one persistent grudge or loyalty chain links later events to prior actions.
- [ ] Awakening summarizes changes rather than silently resetting the world.

## Optional Keeper

- [ ] Optional small care episodes share the main campaign state, or are explicitly deferred.
- [ ] Keeper actions protect or care for the sleeping dragon.
- [ ] Episodes advance time without requiring repetitive daily chores.
- [ ] The Keeper is not expanded into a separate full RPG.

## Reliability and delivery

- [ ] No duplicate loot, ransom payouts, or stale-target actions.
- [ ] No stamina or defeat softlock.
- [ ] Pause and fast-forward behave consistently.
- [ ] Save/load preserves campaign consequences if supported.
- [ ] Controls and opening goals are explained in the game.
- [ ] Runnable build and editable source are delivered.
- [ ] Implemented, simplified, deferred, and untested features are reported honestly.

# Dragon Hoard implementation plan

This is a suggested construction order, not a reason to stop after the first milestone. Aim for the full playable draft described in GAME_SPECIFICATION.md. Resolve routine choices autonomously and report important assumptions.

## Milestone 1 One real expedition

Create the shared campaign state, seeded world, fog of war, cave, target selection, animated map flight, one animated caravan encounter, retreat, return, and loot deposit. Deposited treasure must alter dragon stats. Verify the complete round trip before expanding.

## Milestone 2 Investment and time

Add paid workers, cave expansion, defenses, construction progress, sleep preparation, elapsed-year simulation, growth, theft risk, and an awakening comparison. Retain the same world and state through all views.

## Milestone 3 Early strategy

Add camp attacks, castle grab-and-run encounters, novice heroes, differentiated treasures, cargo pressure, rising alarm, travel events, and low-stamina recovery. Ensure a hatchling survives through judgment rather than overwhelming power.

## Milestone 4 Dragon economics

Add ransom captures and resolutions, forced labor with unrest, tribute, destruction reducing future wealth, and tradeoffs between stored power and infrastructure spending. Prevent infinite-income and repeated-payout exploits.

## Milestone 5 A world that remembers

Add faction responses, settlement development and decline, named history, adaptive caravan escorts, hunting parties, a grudge chain, a loyalty chain, and a concise chronicle. Use a few causal rules instead of an exhaustive civilization simulation.

## Milestone 6 Comprehensive polish

Add distinct age-stage visuals, more raid templates, named artifact effects, save/load, legible tooltips, speed controls, optional Keeper care episodes, and clear defeat recovery. Test at least two sleep cycles and different approaches to the same opportunity.

## Scope guardrails

Keep the main experience focused on dragon travel, raids, hoard, lair, and sleep. The earlier artifact adjacency dungeon builder is a separate concept. Do not build a full platformer, a full child RPG, or an exhaustive political simulator to demonstrate this idea.

If the host cannot support the full draft, simplify depth while retaining the causal loop. Clearly list technical limits and unfinished requirements. Never replace an animated functional system with a static mockup while claiming completion.

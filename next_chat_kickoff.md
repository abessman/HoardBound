# Next chat kickoff

Start a new session with: **"Read next_chat_kickoff.md and continue."** (CLAUDE.md loads by itself.)

Updated 2026-10-11 · **Version 0.8.0** · Branch `claude/laughing-mayer-npu2ei` · The owner plays at hoardbound.netlify.app on an iPad.

## State in five lines
- Full loop works: explore the parchment map, raid in side-view scenes, store treasure, build the lair, sleep, wake.
- Goals layer (0.6) and the first valley (0.7): milestone, Aims board, four generated opening stories, capability
  treasures, heat and hunters, pursuit, offerings, summaries, titles.
- The domain (0.8): allegiance statuses, influence by land, a refuge or camp growing at the hill, territory washes
  and changed glyphs on the map, oaths / rebuild / occupy / crush / ease / raze, Lair → Domain tab.
- 189 headless checks pass (seed-dependent: 3 old failures on seed `q`); the scripted browser run passes.

## Current project: the domain and the endgames (`docs/ideas/domain-and-endgame.md`)
The owner asked to build the expansion notes ("feel free to ask questions"); this session was told to continue
without asking, so these working decisions were made by Claude and **need the owner's confirmation**:
- **When:** the domain begins when the dragon is young (not adult as the notes suggested), so a mid-term goal
  appears right after the first growth; a castle or dark stronghold (stage 4) needs an adult. The endgames should
  activate at adult (not built yet).
- **Path:** read from benevolence (≥ 10 kind, ≤ −10 cruel, in between a "collector" with no home settlement).
  The home's character drifts 20%/year toward your deeds and turns past ±15, losing a stage. No locked choice.
- **Influence** spreads by subregion from the lair and its members (allied and occupied reach their neighbours);
  occupation needs influence; protection and tribute work anywhere, as before.
- **Statuses are derived** from existing state (tribute pacts, `L.flags.allied`, new `L.occupation`), not stored twice.
- **Good vs evil:** good is slower and pays less but is stable (gifts, willing workers, warnings, allies' help);
  evil pays more and builds faster but resists and revolts. Breaking a promise costs trust everywhere you protect.
- **Map:** light washes (gold-green / rust / sepia reach) with a dotted edge and a toggle; glyph changes near the
  lair and members only. Parchment and ink stay.
- **Deferred:** undead settlements (need dark powers from the endgame), a lair exterior view, allies sending
  soldiers. Numbers are first guesses.

## Proposed next step: 0.9.0 endgame prototype (notes §8–9, implementation order step 6)
Prototype **one lieutenant and one life crystal** with real consequences before building six and three:
- At adult, the path that your domain leans to activates: kind → an ancient evil rises (original names) and its
  first lieutenant threatens your allies; cruel → the six life crystals are revealed, the first sanctuary located.
- Defeating the lieutenant visibly removes one enemy power; taking the crystal changes its realm on the map and
  sits in the hoard with an effect. A counter on the Aims board ("Lieutenants 1 / 3", "Crystals 1 / 6").
- Open: can both threats exist in one world? Is all six crystals enough to win? The third lieutenant's role?

## What the last session did
- 0.7.1 docs split and iPad selection fix; then 0.8.0 the domain (see CHANGELOG), the night-raid label (a *Night*
  tag with a moon; owner had asked "is it night time?"), cards that fit many choices, battlefield positions saved.

## Next tasks (in order)
1. Owner playtest of 0.8.0 on the iPad: Territory toggle, pennants, Domain tab, arrival choices, founding notice.
2. Confirm or change the working decisions above; tune numbers from the playtest.
3. 0.9.0 endgame prototype (above), after the owner agrees on its open questions.
4. From the earlier backlog: seasonal calendar events, more story templates, raid balance, hero/rival duel staging.

## Waiting on the owner
- The working decisions above (domain at young; derived path; influence by land).
- What should **1.0** mean? Proposed: the first full campaign from hatchling to an endgame on either path.
- Night: 0.8.0 only labels night raids; real day and night with the seasonal calendar is still an option.
- Playtest notes on 0.7.x and 0.8.0.

## Check on the iPad
- Does the map ever tint or wash out again when dragging (fixed in 0.7.1)?
- Territory button (top right), the wash and dotted edge, pennants, the settlement beside the lair, the Domain tab.

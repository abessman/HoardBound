# Next chat kickoff

Start a new session with: **"Read next_chat_kickoff.md and continue."** (CLAUDE.md loads by itself.)

Updated 2026-10-12 · **Version 0.11.0** · Branch `claude/laughing-mayer-npu2ei` · The owner plays at hoardbound.netlify.app on an iPad.

## State in five lines
- Full loop works: explore the parchment map, raid in side-view scenes, store treasure, build the lair, sleep, wake.
- Goals (0.6), first valley (0.7), domain (0.8), great struggle prototype (0.9), debug tools (0.9.1), map art packs (0.10).
- 0.11: seven regions; territory by life phase as a watercolour wash, capped at the home region; camps → village →
  castle by phase; offerings once the lair is found; gifts, recruits, news, feasts, castle fealty; Reputation screen
  with the grievance ledger.
- 273 headless checks pass on the default seed and `other-seed`, 259 on `q`; the scripted browser run passes.
- World generation is version 2 (seven regions); saves keep their version and older campaigns load their old world.

## Current project: the dragon's territory and politics (owner's request, 2026-10-11)
Decided by the owner:
- Phases are the dragon's life tiers. 1 hatchling: a bit of colour around the lair, growing slightly with the hoard.
  2 young: influence grows; devoted camps around the site; towns in the territory offer new options; offerings if the
  lair is found. 3 adult: a village forms (good or bad style); more offerings; bestow gifts and recruit; bring towns,
  villages and some castles into your fold, limited to your main territory (space for the opposition). 4 ancient: a
  castle or tower rises beside the lair. A reputation tracker, and a place to track people with grievances (nemesis).
- **Seven large regions**: the home region is the main territory; one Crystal of Life in each of the other six.
- **Castle politics next update**: castles with territories that expand by war on villages and castles; help a side
  or attack both to build influence ([ideas](docs/ideas/castle-politics.md)).
Working decisions by Claude (not confirmed):
- Radii by phase 1.5→3.5, 4→8, 9→15, 16→22 cells (growing with hoard strength toward the next tier); lobes around
  members; only home-region land. Oaths, fealty and occupation need an adult; offerings need the lair found.
- Two kingdoms are generated inside the home region; tiers 1,1,2,2,3,3 for the six others by distance.
- Grievances: kinds hunter / house / betrayed / rebel; epithets as hunters survive; weregild ends all but hunters.
- Earlier, still open: endgame names in `src/data/endgame.js` are proposals; map art waits for real artwork.

## What the last session did
- 0.10.0 map art packs (handoff in `docs/map-art/`); 0.11.0 the territory rework above.

## Next tasks (in order)
1. Owner playtest of 0.11 on the iPad: a new campaign (older saves keep their old world), the test starts, Reputation.
2. Castle politics (lordships, feuds, help a side or both) after the owner answers the questions in the ideas doc.
3. Remaining lieutenants and crystals with distinct guardians; the two final battles.
4. Backlog: seasonal events, more story templates, raid balance, home-name label collision, real map art.

## Open questions for the owner
- Castle politics: feuds while you sleep too? Can a sworn castle fight in your name? How visible should borders be?
- Are the phase radii and the adult gate for oaths and occupation right after playing?
- Should the chosen map art pack become everyone's default once real art exists?

## Check on the iPad
- A new campaign: the small sepia wash at the cave; Reputation (F) tabs; Territory (T) toggles the bleed-in.
- `?scene=map&preset=young-kind` / `young-cruel`: camps around the hill, news and hospitality or feasts on arrival.
- `?scene=map&preset=adult-kind` / `adult-cruel`: the village, Lair → Domain gifts and recruiting, fealty, the wash.

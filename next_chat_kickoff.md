# Next chat kickoff

Start a new session with: **"Read next_chat_kickoff.md and continue."** (CLAUDE.md loads by itself.)

Updated 2026-10-11 · **Version 0.7.1** · Branch `claude/laughing-mayer-npu2ei` · The owner plays at hoardbound.netlify.app on an iPad.

## State in five lines
- Full game loop works: explore the parchment map, raid in side-view scenes, store treasure, build the lair, sleep, wake.
- Goals layer (0.6): visible milestone (young dragon: hoard strength 1 000, age 8), Aims board, summaries, titles.
- First valley (0.7): one of four generated opening stories per world, capability treasures, heat and hunters,
  pursuit, offerings, escort ambushes. Waiting for the owner's iPad playtest.
- Docs split into a root map, folder rules and one doc per system (0.7.1).
- 155 headless checks pass on several seeds; the scripted browser run passes.

## Current project: make the early game fun ("the first valley")
Goal: within ten minutes the player has competing wants ("I could rob that convoy, but those merchants know the
way to the ruin, and the captain still has my wind charm"). Working decisions agreed with the owner:
- Fix the loop before art. Show what to achieve, how the next action helps, what changed.
- Starts must differ: the game picks one of several generated stories per world (owner's choice).
- Good is not a pay cut: it pays out over time (offerings, access, allies, safe rests); evil is fast and
  tempting but the world answers (heat steps, named hunters, pursuit, poorer targets).
- No "kill the witnesses" mechanic (it would make slaughter routine); pursuit and escape instead (from the
  ChatGPT review the owner shared). Theft hurts a treasury that recovers; burning hurts recovery.
- Offerings depend on prosperity and protection, shown as ranges; never an infinite sleep-and-collect machine.
- The first sleep never kills; later sleeps can. Hoard strength 1 000 for a young dragon (~10–18 trips).
- Build order agreed: (1) local story with a capability reward ✔, (2) heat and offerings ✔, (3) pursuit ✔,
  (4) seasonal calendar events (next), plus title tuning ✔.

## What the last session did
- 0.6.0 goals layer; 0.6.1 version on the title screen and menu; 0.7.0 first valley; 0.7.1: docs split, and the
  iPad bug where a stray page selection tinted the whole canvas (selection, drag and callouts now blocked).

## Next tasks (in order)
1. Act on the owner's playtest of 0.7.x (feel of stories, heat speed, hunter pressure, readability on iPad).
2. Seasonal calendar: autumn tax convoy, harvest, pilgrims to escort, lean winter; show "arrives in autumn" on the map.
3. More story templates (rescue a captive from a camp, a feud between villages, a sick lord's ransom) and distinct staging.
4. Raid balance pass (town watch vs hatchlings); hero and rival duel staging.
5. Later: the domain and good/evil endgame in `docs/ideas/domain-and-endgame.md`.

## Waiting on the owner
- What should **1.0** mean? Proposed: the first full campaign playable from hatchling to an endgame (the good and
  evil paths in the ideas doc). Not yet confirmed.
- Playtest notes on 0.7.x.

## Check on the iPad
- Does the map ever tint or wash out again when dragging or using the mouse? (Fixed in 0.7.1; confirm.)
- Story line on the goal panel, alerts panel (riders, hunters), Hunters! card, Aims board scrolling by drag.

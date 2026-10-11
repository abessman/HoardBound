# Next chat kickoff

Start a new session with: **"Read next_chat_kickoff.md and continue."** (CLAUDE.md loads by itself.)

Updated 2026-10-11 · **Version 0.9.1** · Branch `claude/laughing-mayer-npu2ei` · The owner plays at hoardbound.netlify.app on an iPad.

## State in five lines
- Full loop works: explore the parchment map, raid in side-view scenes, store treasure, build the lair, sleep, wake.
- Goals (0.6), the first valley (0.7): milestone, Aims board, generated opening stories, heat, pursuit, offerings.
- The domain (0.8): allegiance, influence by land, a refuge or camp at the hill, territory washes and glyphs.
- The great struggle (0.9, prototype): one opposition per world at adult; the Warlord and the first crystal playable.
- 215 headless checks pass (3 old seed-dependent failures on seed `q`); the scripted browser run passes.

## Current project: the domain and the endgames (`docs/ideas/domain-and-endgame.md`)
Decided by the owner:
- **One opposition per world**, formed when you reach that phase; never both. Kind → an ancient evil (the Hollow
  King) with three lieutenants; cruel → six Crystals of Life.
- **Three lieutenants open the final battle with the demon king; six crystals open the final challenge with the god
  of the world.** The demon king can be challenged early at a major disadvantage. The final battles are not needed yet.
- **Not near 1.0.**
- **The Blightmother is the third lieutenant** (confirmed).
- A **debug menu** for testing (Menu → Debug tools, 0.9.1): infinite gold, invincibility and jumps.
Working decisions by Claude (not yet confirmed by the owner):
- The domain begins at young; the struggle at adult with a leaning rule (benevolence ±10 or the home's path); the
  path is fixed once the struggle begins.
- Names and identities are proposals in `src/data/endgame.js`: the Hollow King (Vorgoth / Ashkarath / Morrowgast),
  Warlord (hosts), Sorcerer (wards over the throne), Blightmother (renewal and blight; confirmed);
  crystals Greenmarrow, Wellspring, Stoneblood, Dawnheart, Galeheart, Tideglass; the god Ysmera, the Heart of the World.
- Prototype first: one lieutenant and one crystal fully playable with real effects; the others placed and described.
- Test starts (`?scene=map&preset=adult-kind` etc.) so the owner can try the later game on the iPad; URL campaigns
  save to a separate `test` slot.

## What the last session did
- 0.8.0 the domain; 0.9.0 the endgame prototype (boss tuning with a bot; a fix for loot inside buildings that could
  never be reached); 0.9.1 the debug menu. Answered: the phases of the dragon's life (four tiers, see
  docs/systems/sleep-and-growth.md and HB.TIERS).

## Next tasks (in order)
1. Owner playtest of 0.8 and 0.9 on the iPad, using the test starts and Menu → Debug tools.
2. Owner to confirm or change the proposed names and the crystal identities.
3. Build the remaining lieutenants (Sorcerer: wards, ranged magic; Blightmother: spreading blight) and crystals with
   distinct guardians (not six identical raids), then the two final battles.
4. Earlier backlog: seasonal calendar events, more story templates, raid balance, hero/rival duel staging.

## Open questions for the owner
- What should the final battles look like (the owner was not sure yet)? How strong is the "early challenge" penalty?
- Should allies send soldiers to the last battle? Should a turned dragon (kind → cruel after it began) change anything?
- Real day and night with the seasonal calendar is still an option (0.7.1 only labels night raids).

## Check on the iPad
- `hoardbound.netlify.app/?scene=map&preset=adult-kind` and `…preset=adult-cruel`: the announcement card, the seal on
  the map, the warcamp and grove fights, the summary afterwards. Your own campaign's autosave is not touched.
- Menu → Debug tools: big enough to tap? Toggles and buttons behave as labelled?
- Territory toggle, pennants, Domain tab, the settlement beside the lair (0.8).

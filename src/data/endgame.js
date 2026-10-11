/* The great struggle (endgame): who rises against you, and what you are trying to take. Editable data.
 * One opposition per world, fixed when it begins (a kind dragon faces the Hollow King and his lieutenants;
 * a cruel dragon hunts the six Crystals of Life). Rules: src/game/endgame.js. Names are proposals; change freely. */
(function () {
  const HB = globalThis.HB;

  HB.ENDGAME = {
    // ---- a kind dragon's enemy: an ancient evil and three lieutenants who sustain it
    shadow: {
      foe: { names: ['Vorgoth', 'Ashkarath', 'Morrowgast'], title: 'the Hollow King', place: 'the Hollow Throne' },
      intro: (name, title) => `In the far places of the world ${name}, ${title}, has woken: a king of ashes, buried before the first realms were founded. Three lieutenants gather his strength. While they live he is very hard to beat, and his servants will come for the people who trust you.`,
      lieutenants: [
        { id: 'warlord', role: 'Warlord', names: ['Grushnak Ironjaw', 'Uzhgar the Breaker', 'Krolm Bloodtusk'], title: 'Warlord of the Hollow King', site: 'warcamp', siteName: (n) => `The Warcamp of ${n.split(' ')[0]}`,
          power: 'Hosts', powerText: 'His warbands march on the places that trust you. In the last battle they would fill the field.',
          defeatText: 'The warbands have lost their general: no more hosts march on your allies, and the last battle will be fought against fewer.', playable: true },
        { id: 'sorcerer', role: 'Sorcerer', names: ['Maelis the Pale', 'Corvane Ashtongue', 'Serath of the Black Glass'], title: 'Sorcerer of the Hollow King', site: 'tower', siteName: () => 'The Tower of Black Glass',
          power: 'Wards', powerText: 'Wards woven over the Hollow Throne: no claw or fire can touch the king while they hold.',
          defeatText: 'The wards over the Hollow Throne have failed.', playable: false },
        { id: 'blightmother', role: 'Blightmother', names: ['Mother Gallow', 'Seska Rotroot', 'the Widow of the Mire'], title: 'Blightmother of the Hollow King', site: 'fen', siteName: () => 'The Weeping Fen',
          power: 'Renewal', powerText: 'A blight that eats the fields near her fen and lets the Hollow King mend his wounds as fast as they are dealt.',
          defeatText: 'The blight withers: the Hollow King can no longer mend his wounds.', playable: false },
      ],
    },
    // ---- a cruel dragon's goal: six crystals that keep the world alive, and the god who answers when they fall
    crystals: {
      god: { name: 'Ysmera', title: 'the Heart of the World' },
      intro: () => 'Six Crystals of Life keep the world green, its rivers running and its people brave. They lie in sanctuaries across the realms, each with a guardian. Take them, and the god of this world will have to face you herself.',
      list: [
        { id: 'greenmarrow', name: 'Greenmarrow', terrain: ['forest', 'pine'], site: 'grove', siteName: 'the Grove of Greenmarrow', guardian: 'the Warden of the Grove', benefit: 'Its realm’s forests and harvests thrive.', loss: 'Forests wither and fields fail across its realm: every settlement there is poorer for good.', playable: true },
        { id: 'wellspring', name: 'Wellspring', terrain: ['plains', 'hills'], site: 'spring', siteName: 'the Sanctuary of the Wellspring', guardian: 'the Keepers of the Spring', benefit: 'Its rivers and wells never fail.', loss: 'Wells run dry; famine follows.', playable: false },
        { id: 'stoneblood', name: 'Stoneblood', terrain: ['mountains', 'hills'], site: 'deep', siteName: 'the Deep Shrine of Stoneblood', guardian: 'a stone colossus', benefit: 'Its holds and walls stand firm.', loss: 'Walls crack; defences fall.', playable: false },
        { id: 'dawnheart', name: 'Dawnheart', terrain: ['plains', 'hills'], site: 'temple', siteName: 'the Temple of the Dawn', guardian: 'the priests of Ysmera', benefit: 'Its people are brave.', loss: 'Courage fails: its hunters do not come.', playable: false },
        { id: 'galeheart', name: 'Galeheart', terrain: ['peaks', 'mountains'], site: 'eyrie', siteName: 'the Eyrie of Galeheart', guardian: 'the storm-riders', benefit: 'Winds carry its ships and caravans.', loss: 'The winds die over its realm.', playable: false },
        { id: 'tideglass', name: 'Tideglass', terrain: ['plains', 'forest', 'hills'], site: 'isle', siteName: 'the Drowned Sanctuary of Tideglass', guardian: 'the sea-wardens', benefit: 'Its coasts are calm and fish are many.', loss: 'Storms batter its coasts.', playable: false, far: true },
      ],
    },
  };

  // the crystals in the hoard: named treasures with real effects (never placed at random)
  const crystal = (id, name, effect, mutation, lore) => ({ id: 'crystal_' + id, name: `${name}, a Crystal of Life`, cat: 'artifacts', value: 3000, weight: 2, effect, mutation, lore, crystal: true, placeIn: [] });
  HB.CRYSTAL_ARTIFACTS = [
    crystal('greenmarrow', 'Greenmarrow', { maxHealth: 60, healRate: 0.5 }, 'crystals', 'Green light pulses in it like a slow heart. Wounds close in its glow, and the forests of its realm die without it.'),
    crystal('wellspring', 'Wellspring', { maxStamina: 60 }, 'crystals', 'Cold to the touch, always wet.'),
    crystal('stoneblood', 'Stoneblood', { defense: 10 }, 'stonePlates', 'Heavy as a mountain’s heart.'),
    crystal('dawnheart', 'Dawnheart', { prestige: 25, dominance: 15 }, 'goldenSheen', 'It holds the first light of every morning.'),
    crystal('galeheart', 'Galeheart', { mul: { staminaCost: 0.85 } }, 'crystals', 'A storm turns slowly inside it.'),
    crystal('tideglass', 'Tideglass', { breath: 14 }, 'frost', 'Salt crusts its facets however often it is wiped.'),
  ];
  // looked up by id only (makeArtifact, stolen treasure); kept out of HB.ARTIFACTS so world creation never places them
  if (HB.ARTIFACT_BY_ID) for (const a of HB.CRYSTAL_ARTIFACTS) HB.ARTIFACT_BY_ID[a.id] = a;
})();

/* Card events: travel, roosting, lair intrusions, petitions. Each has choices with effects resolved in game code.
 * Illustration ids map to HB.illustrations. Text may use {dragon}, {place}, {realm}. */
(function () {
  const HB = globalThis.HB;

  HB.TRAVEL_EVENTS = [
    {
      id: 'merchant', weight: 3, illustration: 'merchant', title: 'A Wagon on the Road',
      when: (ctx) => ctx.nearRoad,
      text: 'Below, a lone merchant’s wagon rattles along the road with no escort in sight. The driver has not looked up.',
      choices: [
        { label: 'Swoop and snatch the strongbox', desc: 'Quick gold. Costs a little stamina; merchants will talk.', effect: { gold: [40, 140], stamina: -8, fear: 2, hostility: 1, time: 0 } },
        { label: 'Let it pass', desc: 'No risk, nothing gained.', effect: {} },
      ],
    },
    {
      id: 'patrol', weight: 3, illustration: 'patrol', title: 'A Road Patrol',
      when: (ctx) => ctx.nearRoad && ctx.factionHostility > 5,
      text: 'A patrol of {realm} archers marches beneath you. One points. Bows come up.',
      choices: [
        { label: 'Climb above the arrows', desc: 'Costs stamina. Safe.', effect: { stamina: -12 } },
        { label: 'Fly straight on', desc: 'A few arrows will find you.', effect: { health: [-6, -14], fear: 1 } },
        { label: 'Scatter them with fire', desc: 'Hurts them, costs stamina, and the realm hears of it.', effect: { stamina: -14, hostility: 4, fear: 4, kills: 2 }, requires: (ctx) => ctx.tier >= 1, requireText: 'Too small to frighten a patrol' },
      ],
    },
    {
      id: 'storm', weight: 2, illustration: 'storm', title: 'A Storm Rolls In',
      text: 'Black cloud piles up ahead and the wind turns against you. Rain comes sideways.',
      choices: [
        { label: 'Push through it', desc: 'Costs stamina; you keep your pace.', effect: { stamina: -18 } },
        { label: 'Find shelter and wait', desc: 'Lose a day; rest a little.', effect: { time: 1, stamina: 10 } },
      ],
    },
    {
      id: 'smoke', weight: 2, illustration: 'smoke', title: 'Smoke on the Horizon',
      when: (ctx) => ctx.unknownNearby,
      text: 'A thread of smoke rises beyond the next ridge. Something lives there that you have not seen.',
      choices: [
        { label: 'Circle to look', desc: 'Costs a little stamina and reveals what lies that way.', effect: { stamina: -5, revealUnknown: true } },
        { label: 'Keep your course', desc: '', effect: {} },
      ],
    },
    {
      id: 'flyer', weight: 1.5, illustration: 'flyer', title: 'Something Else in the Sky',
      when: (ctx) => ctx.terrain === 'mountains' || ctx.terrain === 'peaks' || ctx.terrain === 'hills',
      text: 'A griffin drops from the crags above, screaming, talons first.',
      choices: [
        { label: 'Fight it', desc: 'You will be hurt. It will be hurt worse, and you can eat.', effect: { health: [-8, -20], staminaGain: 15, prestige: 1 } },
        { label: 'Dive and outrun it', desc: 'Costs stamina. Hatchlings should probably dive.', effect: { stamina: -15 } },
      ],
    },
    {
      id: 'pursuer', weight: 2, illustration: 'pursuer', title: 'Riders Below',
      when: (ctx) => ctx.factionHostility > 15 && ctx.hasCargo,
      text: 'Riders are following your shadow across the fields, marking the way you fly. They mean to learn where you sleep.',
      choices: [
        { label: 'Take a long way round', desc: 'Costs stamina; they lose you.', effect: { stamina: -16 } },
        { label: 'Ignore them', desc: 'Hunters may find your lair more easily.', effect: { attention: 2 } },
        { label: 'Drop and scatter them', desc: 'Costs stamina; fear spreads; a few will not ride home.', effect: { stamina: -12, fear: 3, hostility: 2, kills: 1 }, requires: (ctx) => ctx.tier >= 1, requireText: 'Too small to charge riders' },
      ],
    },
    {
      id: 'burdened', weight: 3, illustration: 'pursuer', title: 'Too Heavy to Outrun Them',
      when: (ctx) => ctx.heavyCargo && ctx.factionHostility > 5,
      text: 'Riders are gaining on your shadow and your wings are heavy with plunder. Something has to give: the loot, or the lead.',
      choices: [
        { label: 'Drop the heaviest cargo', desc: 'Shed about a third of your load and leave them behind.', effect: { dropCargo: 0.35 } },
        { label: 'Fly on burdened', desc: 'Costs 20 stamina; they mark the way to your lair.', effect: { stamina: -20, attention: 2 } },
      ],
    },
    {
      id: 'shelter', weight: 1.5, illustration: 'shelter', title: 'A Hollow in the Rocks',
      when: (ctx) => ctx.staminaFrac < 0.45,
      text: 'A dry hollow beneath an overhang, out of the wind. No tracks lead to it.',
      choices: [
        { label: 'Rest here a day', desc: 'Recover stamina, lose a day.', effect: { time: 1, stamina: 30 } },
        { label: 'Fly on', desc: '', effect: {} },
      ],
    },
    {
      id: 'shepherd', weight: 2, illustration: 'flock', title: 'A Flock on the Hillside',
      when: (ctx) => ctx.terrain === 'hills' || ctx.terrain === 'plains',
      text: 'Sheep scatter across a hillside below, and the shepherd is already running.',
      choices: [
        { label: 'Take a sheep', desc: 'Food: recover health and a little stamina. The village will mind.', effect: { health: 8, staminaGain: 6, fear: 1, hostility: 1 } },
        { label: 'Fly on', desc: '', effect: {} },
      ],
    },
  ];

  HB.ROOST_EVENT = {
    id: 'roost', illustration: 'roost', title: 'Exhausted',
    text: 'Your wings will not carry you further. You come down hard in {place} and lie still until your strength returns.',
    choices: [{ label: 'Rest two days', desc: 'Recover stamina. Time passes; someone may notice you.', effect: { time: 2, stamina: 'half', attention: 1 } }],
  };
})();

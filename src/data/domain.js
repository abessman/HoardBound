/* The domain: settlement statuses, the two kinds of home settlement and what each stage gives. Editable data.
 * Rules live in src/game/domain.js; how it plays: docs/systems/domain-and-influence.md. */
(function () {
  const HB = globalThis.HB;

  // how a dragon rules, read from its deeds (dragon.alignment and the home settlement's character)
  HB.DOMAIN_PATHS = {
    benevolent: { id: 'benevolent', name: 'Protector', rule: 'protects', color: '#8a7a2a', kind: 'kind' },
    tyrannical: { id: 'tyrannical', name: 'Overlord', rule: 'rules by fear', color: '#8f2b1f', kind: 'cruel' },
    undecided: { id: 'undecided', name: 'Collector', rule: 'keeps to itself', color: '#6a5a3a', kind: 'neither' },
  };

  // what a settlement is to you. member: counts as part of your domain; lobe: how far around it your territory
  // reaches (cells; only inside your home region); side: +1 kind rule, -1 rule by fear
  HB.DOMAIN_STATUSES = {
    protected: { name: 'Protected', member: true, lobe: 2.5, side: 0.6, color: '#9c7a1c', text: 'Under your protection: sends gifts and expects you to keep the raiders off.' },
    allied: { name: 'Allied', member: true, lobe: 4, side: 1, color: '#b8902a', text: 'Sworn to you: sends settlers, watchers and news, and stands with you.' },
    tributary: { name: 'Tributary', member: true, lobe: 2.5, side: -0.6, color: '#8a4a2a', text: 'Pays you tribute out of fear, and resents every coin.' },
    occupied: { name: 'Occupied', member: true, lobe: 4, side: -1, color: '#5a2418', text: 'Held by your overseers: pays heavily and sends labour. Resistance grows every year.' },
    resisting: { name: 'Resisting', member: false, lobe: 0, side: 0, color: '#8f2b1f', text: 'In revolt against your rule: pays nothing and sends for hunters. Crush it, ease the yoke, or lose it.' },
    ruined: { name: 'Ruined', member: false, lobe: 0, side: 0, color: '#4a3a2a', text: 'Burned or abandoned. Nobody pays anyone here.' },
  };

  // the settlement that grows at the foot of your hill, by path. Stage 1..4 (index 0 unused).
  // gold: a year's gifts or levies to the hoard; build: added to construction rate; guard: added to guard strength;
  // defense: added to lair defence; warning: warnings before hunters break in; unrest: yearly unrest (tyranny only);
  // intel: allies' travellers sketch the lands around them on the map
  HB.HOME_STAGES = {
    benevolent: [null,
      { name: 'Pilgrims\' Camps', noun: 'pilgrims\' camps', text: 'Pilgrims who revere you have pitched camps around your hill. They keep watch and bring what they can.', gold: 30, build: 0.15, guard: 0, defense: 0, warning: 0,
        gives: ['Gifts of food and coin (about 30 gold a year)', 'Willing hands: construction a little faster', 'Its people work for you for low wages', 'As an adult, the camps become a village'] },
      { name: 'Village', noun: 'a village', text: 'Cottages, fields and a mill below the cave. Children play in your shadow.', gold: 70, build: 0.3, guard: 4, defense: 0, warning: 1,
        gives: ['Gifts of about 70 gold a year', 'A militia that stands with your guards', 'Watchers who warn you before hunters reach the door'] },
      { name: 'Flourishing Town', noun: 'a flourishing town', text: 'Workshops, a market and a wall. Travellers come to see the dragon that keeps the peace.', gold: 140, build: 0.45, guard: 6, defense: 4, warning: 1, intel: true,
        gives: ['Gifts of about 140 gold a year', 'Travellers through your allies bring word of far lands (rumours on the map)', 'Stronger walls around the lair'] },
      { name: 'Castle and Sanctuary', noun: 'a castle and sanctuary', text: 'A castle of pale stone rises beside your hill, its knights sworn to you. Your name is spoken with gratitude across the realms.', gold: 260, build: 0.6, guard: 8, defense: 12, warning: 1, intel: true,
        gives: ['Gifts of about 260 gold a year', 'Knights and a garrison: the lair is very hard to take', 'A coalition that will stand with you against what is coming'] },
    ],
    tyrannical: [null,
      { name: 'Cult Camps', noun: 'the camps of your cult', text: 'A cult that worships your terror camps around your hill, and drives captives to the hard work.', gold: 50, build: 0.3, guard: 2, defense: 0, warning: 0, unrest: 8,
        gives: ['Forced labour: construction much faster', 'Levies of about 50 gold a year', 'Unrest: it can rise against you', 'As an adult, the camps become a fortified settlement'] },
      { name: 'Fortified Settlement', noun: 'a fortified settlement', text: 'A palisade, watchtowers and pits. Nobody leaves without your leave.', gold: 110, build: 0.45, guard: 5, defense: 6, warning: 0, unrest: 9,
        gives: ['Levies of about 110 gold a year', 'Soldiers on the walls around the lair', 'More unrest'] },
      { name: 'Citadel', noun: 'a citadel', text: 'Black towers and furnaces that never cool. The land around it is ash.', gold: 220, build: 0.6, guard: 8, defense: 12, warning: 1, unrest: 10, fear: 2,
        gives: ['Levies of about 220 gold a year', 'Fear of you spreads to every realm nearby each year', 'Strong defences; still more unrest'] },
      { name: 'Dark Stronghold', noun: 'a dark stronghold', text: 'A dark tower and fortress rise beside your hill above a ruined land. Armies muster in its yards in your name.', gold: 400, build: 0.8, guard: 10, defense: 20, warning: 1, unrest: 11, fear: 3,
        gives: ['Levies of about 400 gold a year', 'An army that makes the lair nearly untakeable', 'The strength to break the world’s defences'] },
    ],
  };
})();

/* Treasure definitions: generic loot by category and named artifacts with effects. Editable data. */
(function () {
  const HB = globalThis.HB;

  // generic loot: [name, category, minValue, maxValue, weight]
  HB.LOOT = {
    gems: [['a pouch of uncut gems', 'gems', 60, 160, 0.5], ['a sapphire brooch', 'gems', 120, 260, 0.3], ['a ruby necklace', 'gems', 200, 420, 0.4], ['a jewelled chalice', 'gems', 260, 520, 0.8], ['a casket of pearls', 'gems', 300, 700, 1], ['an emerald the size of an egg', 'gems', 500, 1100, 0.4]],
    arms: [['a soldier’s sword', 'arms', 40, 90, 1], ['a mail hauberk', 'arms', 90, 180, 2], ['a knight’s shield', 'arms', 120, 240, 2], ['a war bow of yew', 'arms', 70, 150, 0.8], ['a dwarven axe', 'arms', 200, 420, 1.5], ['a plumed helm', 'arms', 110, 220, 1], ['a lord’s greatsword', 'arms', 300, 600, 2]],
    books: [['a ledger of accounts', 'books', 40, 110, 0.6], ['an illuminated psalter', 'books', 120, 280, 1], ['star charts', 'books', 150, 320, 0.5], ['a bestiary', 'books', 160, 340, 1], ['a spellbook', 'books', 350, 800, 1], ['maps of the surrounding lands', 'books', 90, 200, 0.4, { rumorRadius: 10 }]],
    royal: [['a silver circlet', 'royal', 150, 320, 0.4], ['a lord’s signet ring', 'royal', 200, 450, 0.1], ['a gilded sceptre', 'royal', 400, 900, 1], ['royal regalia', 'royal', 800, 1800, 1.5], ['a crown of old kings', 'royal', 1500, 3200, 1]],
    goods: [['bolts of fine cloth', 'gold', 30, 80, 2], ['casks of wine', 'gold', 30, 70, 3], ['a strongbox of coin', 'gold', 80, 200, 2], ['silver plate', 'gold', 100, 240, 2], ['a merchant’s strongbox', 'gold', 150, 400, 2.5]],
  };

  // named artifacts. effect keys add to stats (or {mul:{...}} multiplies). mutation: visible change on the dragon.
  HB.ARTIFACTS = [
    { id: 'emberheart', name: 'The Emberheart', cat: 'artifacts', value: 900, weight: 0.5, effect: { breath: 8 }, mutation: 'emberGlow', lore: 'A ruby that is always warm. Dragons who sleep upon it breathe hotter.', placeIn: ['castle', 'ruin', 'tower'] },
    { id: 'stoneheart', name: 'Stoneheart Shield', cat: 'artifacts', value: 800, weight: 3, effect: { defense: 7 }, mutation: 'stonePlates', lore: 'Dwarf-forged. Scales that rest against it grow plates of grey stone.', placeIn: ['hold', 'castle', 'mine'] },
    { id: 'frostpearl', name: 'The Frost Pearl', cat: 'artifacts', value: 1100, weight: 0.3, effect: { breathElement: 'frost', breath: 4 }, mutation: 'frost', lore: 'Taken from the north. Breath that passes over it comes out as killing cold.', placeIn: ['ruin', 'monastery', 'glade'] },
    { id: 'signet', name: 'Signet of the Old Line', cat: 'artifacts', value: 700, weight: 0.1, effect: { dominance: 15, ransomBonus: 0.25 }, mutation: 'crest', lore: 'Nobles recognise the seal and pay what is asked.', placeIn: ['castle', 'city', 'ruin'] },
    { id: 'cartographer', name: 'The Cartographer’s Astrolabe', cat: 'artifacts', value: 650, weight: 1, effect: { vision: 2, intel: 2 }, mutation: 'runeMarks', lore: 'It shows the shape of lands not yet seen.', placeIn: ['tower', 'monastery', 'city'] },
    { id: 'wardbell', name: 'The Warden’s Bell', cat: 'artifacts', value: 600, weight: 2, effect: { lairWard: 2 }, lore: 'Rung by no hand, it wakes the sleeper when thieves cross the threshold.', placeIn: ['monastery', 'shrine', 'ruin'] },
    { id: 'stormhorn', name: 'The Stormcaller’s Horn', cat: 'artifacts', value: 1400, weight: 1.5, effect: { gatePass: 1 }, lore: 'The storms over the high passes part for whoever carries it.', placeIn: ['tower', 'hold', 'ruin'] },
    { id: 'thiefcloak', name: 'The Grey Mantle', cat: 'artifacts', value: 500, weight: 0.5, effect: { mul: { alarmRate: 0.8 } }, lore: 'Sentries look through whatever it shadows.', placeIn: ['ruin', 'castle', 'camp'] },
    { id: 'kingsbane', name: 'Kingsbane', cat: 'artifacts', value: 1200, weight: 2, effect: { bite: 10 }, mutation: 'clawBlades', lore: 'A sword that was used on a king. Claws that rest on it keep its edge.', placeIn: ['castle', 'ruin', 'rivalLair'] },
    { id: 'sunstone', name: 'The Sunstone', cat: 'artifacts', value: 1600, weight: 1, effect: { maxHealth: 40, prestige: 15 }, mutation: 'goldenSheen', lore: 'Light lives in it. Wounds close faster in its glow.', placeIn: ['glade', 'city', 'rivalLair'] },
    { id: 'lexicon', name: 'The Lexicon of Tongues', cat: 'artifacts', value: 750, weight: 1.5, effect: { intel: 4, ransomBonus: 0.15 }, mutation: 'runeMarks', lore: 'Every bargain goes better when you understand the other side.', placeIn: ['monastery', 'tower', 'city'] },
    { id: 'deepgem', name: 'Heart of the Deep', cat: 'artifacts', value: 1800, weight: 1, effect: { maxStamina: 40, breath: 5 }, mutation: 'crystals', lore: 'Cut from the roots of a mountain by dwarves who did not live to sell it.', placeIn: ['hold', 'mine'] },
    { id: 'hunterhorn', name: 'Horn of the Last Hunt', cat: 'artifacts', value: 550, weight: 1, effect: { mul: { attention: 0.8 } }, lore: 'Hunters hear it in their dreams and ride the wrong way.', placeIn: ['camp', 'ruin', 'castle'] },
    { id: 'sceptre', name: 'Sceptre of Tolethir', cat: 'artifacts', value: 2200, weight: 2, effect: { dominance: 30, prestige: 25 }, mutation: 'crest', lore: 'Whoever holds it is owed tribute, in the minds of those who remember.', placeIn: ['city', 'castle'] },
    { id: 'ashcrown', name: 'The Ash Crown', cat: 'artifacts', value: 2500, weight: 1.5, effect: { breath: 12, prestige: 20 }, mutation: 'emberGlow', lore: 'Worn by the wyrm that burned the first kingdoms.', placeIn: ['rivalLair'] },
    { id: 'wyrmscale', name: 'Scale of the Elder', cat: 'artifacts', value: 3000, weight: 3, effect: { defense: 12, maxHealth: 60 }, mutation: 'stonePlates', lore: 'Older than any living thing that is not a dragon.', placeIn: ['rivalLair'] },
    { id: 'nightlamp', name: 'The Night Lamp', cat: 'artifacts', value: 800, weight: 1, effect: { vision: 1.5, mul: { alarmRate: 0.9 } }, lore: 'It burns dark. Those who carry it are hard to see.', placeIn: ['tower', 'ruin', 'glade'] },
    { id: 'reliquary', name: 'The Saint’s Reliquary', cat: 'artifacts', value: 900, weight: 2, effect: { prestige: 10, lairWard: 1 }, lore: 'The faithful will want it back, and will pay, or come.', placeIn: ['monastery', 'shrine'] },
    { id: 'anvil', name: 'Anvil of Felakgundu', cat: 'artifacts', value: 1300, weight: 6, effect: { defense: 5, forgeBonus: 1 }, lore: 'Workers who swing at it make better traps and stronger doors.', placeIn: ['hold', 'mine'] },
    { id: 'mirror', name: 'The Seeing Glass', cat: 'artifacts', value: 1000, weight: 1.5, effect: { intel: 6 }, mutation: 'runeMarks', lore: 'It shows the estimated made certain.', placeIn: ['tower', 'city', 'glade'] },
    { id: 'serpentring', name: 'The Serpent Ring', cat: 'artifacts', value: 650, weight: 0.1, effect: { mul: { staminaCost: 0.85 } }, lore: 'Wings beat easier for whoever keeps it.', placeIn: ['ruin', 'glade', 'castle'] },
    { id: 'ironbanner', name: 'The Iron Banner', cat: 'artifacts', value: 700, weight: 2, effect: { roar: 1, dominance: 8 }, lore: 'Soldiers who see it break a little sooner.', placeIn: ['castle', 'camp', 'city'] },
    { id: 'honeycomb', name: 'The Golden Comb', cat: 'artifacts', value: 450, weight: 1, effect: { healRate: 0.5 }, mutation: 'goldenSheen', lore: 'A hive of gold. The dragon that sleeps near it wakes whole.', placeIn: ['glade', 'monastery', 'farm'] },
    { id: 'tide', name: 'The Tidewright’s Chart', cat: 'artifacts', value: 600, weight: 0.5, effect: { vision: 1, rumorOnDeposit: 14 }, lore: 'Sea-roads and the coasts beyond them, drawn by someone who sailed them.', placeIn: ['city', 'tower', 'ruin'] },
    // capability treasures: each opens something new. Never placed at random; local situations put them in play (situations.js).
    { id: 'galefeather', name: 'The Gale-Feather Charm', cat: 'artifacts', value: 420, weight: 0.1, capability: 'wind', effect: { mul: { staminaCost: 0.9 } }, lore: 'A grey feather bound in silver wire. Whoever keeps it rides the high winds as if they were stairs.', capText: 'Lets you ride the winds around crags that no hatchling could climb, and flights cost a little less.', placeIn: [] },
    { id: 'deepseal', name: 'The Deepwarden’s Seal', cat: 'artifacts', value: 380, weight: 0.3, capability: 'seal', effect: { intel: 1 }, lore: 'A ring of black iron cut with runes. Dwarven doors remember it.', capText: 'Opens doors the dwarves sealed long ago.', placeIn: [] },
    { id: 'smokeglass', name: 'The Smoke-Glass', cat: 'artifacts', value: 400, weight: 0.2, capability: 'smoke', effect: { mul: { alarmRate: 0.92 } }, lore: 'A lens of dark glass. Look through it and you are not quite where you seem to be.', capText: 'Riders on your trail lose you, and hunters lose your scent when you flee.', placeIn: [] },
  ];
  HB.ARTIFACT_BY_ID = {}; for (const a of HB.ARTIFACTS) HB.ARTIFACT_BY_ID[a.id] = a;

  // captive archetypes: [kind, label, weight, ransom range multiplier, who pays]
  HB.CAPTIVE_KINDS = {
    noble: { label: 'noble', weight: 2, ransom: [400, 1200], payer: 'house', desc: 'A lord’s kin. Their house will pay, and remember.' },
    heir: { label: 'merchant heir', weight: 2, ransom: [300, 900], payer: 'guild', desc: 'A trading family’s heir. Merchants pay quickly and quietly.' },
    official: { label: 'official', weight: 2, ransom: [250, 700], payer: 'realm', desc: 'A steward or reeve. The realm pays, grudgingly.' },
    priest: { label: 'priest', weight: 2, ransom: [200, 600], payer: 'church', desc: 'The faithful pay in coin or relics.' },
    knight: { label: 'knight', weight: 3, ransom: [300, 800], payer: 'house', desc: 'A sworn knight. Worth a ransom, and a grudge.' },
    smith: { label: 'master smith', weight: 2, ransom: [150, 400], payer: 'guild', desc: 'Skilled hands. Could be ransomed, or put to work.' },
    engineer: { label: 'engineer', weight: 2, ransom: [150, 450], payer: 'realm', desc: 'Builds siege engines, or traps.' },
    envoy: { label: 'dwarven envoy', weight: 2, ransom: [400, 900], payer: 'realm', desc: 'An envoy of the dwarves. His people will pay well, or be grateful if he walks home.' },
    miner: { label: 'miner', weight: 2, ransom: [60, 160], payer: 'guild', desc: 'Knows how to dig. Could be ransomed, or put to work.' },
  };
})();

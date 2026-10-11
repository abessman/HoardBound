/* Name generators with distinct phonologies per culture. Deterministic given an RNG. */
(function () {
  const HB = globalThis.HB;

  const cultures = {
    // Westron: English/Rohirric compound names (Ashford, Brambledown)
    westron: {
      first: ['Ash', 'Bram', 'Elder', 'Thorn', 'Grey', 'Wyn', 'Oak', 'Hazel', 'Brook', 'Stan', 'Marsh', 'Wold', 'Fen', 'Ald', 'Dun', 'Har', 'Wick', 'Mere', 'Sedge', 'Hollin', 'Barrow', 'Ember', 'Wither', 'Cold', 'High', 'Long', 'Red', 'Black', 'Hart', 'Wren', 'Crow', 'Ful', 'Stone', 'Hollow', 'Bright', 'Dim', 'Tarn'],
      second: ['ford', 'down', 'wick', 'ton', 'bury', 'stead', 'dale', 'mere', 'hollow', 'bourne', 'well', 'field', 'march', 'moor', 'cross', 'bridge', 'haven', 'combe', 'leigh', 'brook', 'gate', 'holt', 'ham', 'minster', 'thorpe', 'fold', 'worth', 'dell'],
      realm: ['mark', 'march', 'shire', 'fold', 'reach', 'wold', 'land'],
      person: ['Aldric', 'Brennan', 'Cedric', 'Edwin', 'Godric', 'Hal', 'Ivo', 'Leofric', 'Oswin', 'Rowan', 'Wulf', 'Eadric', 'Wystan', 'Alys', 'Beatrix', 'Edith', 'Godiva', 'Hild', 'Maud', 'Rosalind', 'Wynne', 'Elswyth', 'Isolde', 'Tamsin', 'Audry', 'Cuthbert', 'Osric', 'Piers', 'Hamund'],
      epithet: ['the Bold', 'the Grey', 'of the Ford', 'Ironhand', 'the Younger', 'the Patient', 'Longshanks', 'the Quiet', 'Oakenshield', 'the Lame', 'Half-hand', 'the Red', 'of the Downs', 'Fairhair', 'the Steward'],
      title: ['Lord', 'Lady', 'Thane', 'Reeve', 'Baron', 'Baroness', 'Earl', 'Countess'],
    },
    // Southern: Latinate / Gondorian (Ostavar, Calenor)
    southern: {
      first: ['Ost', 'Cal', 'Ann', 'Vel', 'Mor', 'Sar', 'Tar', 'Lin', 'Dol', 'Nar', 'Eth', 'Ith', 'Pel', 'Gal', 'Min', 'Tol', 'Ras', 'Val', 'Ser', 'Umb', 'Lam', 'Ard', 'Bel', 'Cair', 'Hal', 'Orn'],
      second: ['avar', 'enor', 'ien', 'andil', 'ath', 'orien', 'eth', 'arnon', 'ador', 'ost', 'ith', 'ennas', 'oras', 'uin', 'amar', 'ethir', 'edain', 'onath', 'ilion', 'aros', 'emar'],
      realm: ['', ''],
      person: ['Castamir', 'Belecthor', 'Eldacar', 'Hyarmen', 'Ondoher', 'Tarannon', 'Valacar', 'Ciryon', 'Herion', 'Borondir', 'Ivorwen', 'Lothíriel', 'Míriel', 'Morwen', 'Nimloth', 'Serindë', 'Vanimeldë', 'Hallas', 'Turgon', 'Faramond', 'Anardil', 'Beregond', 'Ingold', 'Dervorin', 'Elenwë', 'Ioreth'],
      epithet: ['the Steadfast', 'Ship-lord', 'of the Tower', 'the Learned', 'the Just', 'Sea-born', 'the Proud', 'Sunward', 'of the Coast', 'the Mariner', 'the Faithful', 'Star-eyed'],
      title: ['Prince', 'Princess', 'Lord', 'Lady', 'Steward', 'Warden', 'Duke', 'Duchess'],
    },
    // Northern: Norse-like (Skarnvik, Hjoldheim)
    northern: {
      first: ['Skarn', 'Hjold', 'Varg', 'Ulf', 'Brynn', 'Thor', 'Grim', 'Eir', 'Frost', 'Jarn', 'Kol', 'Sig', 'Hrafn', 'Bjorn', 'Ran', 'Val', 'Hel', 'Isen', 'Ask', 'Dreng', 'Fjall', 'Gunn', 'Orm', 'Sten', 'Vind'],
      second: ['vik', 'heim', 'gard', 'fjord', 'stad', 'by', 'dal', 'haug', 'nes', 'vatn', 'borg', 'skog', 'holm', 'tind', 'fell', 'strand', 'eng', 'myr', 'sund', 'berg'],
      realm: ['mark', 'land', 'heim', 'gard'],
      person: ['Sigrun', 'Hallvard', 'Torvald', 'Ingrid', 'Brynhild', 'Eirik', 'Gunnar', 'Ragna', 'Solveig', 'Ulfar', 'Astrid', 'Halfdan', 'Yrsa', 'Vigdis', 'Ketil', 'Orm', 'Thora', 'Steinar', 'Hrolf', 'Dagny', 'Leif', 'Geir'],
      epithet: ['Bear-shirt', 'the Cold', 'Wolf-tooth', 'the Far-sailed', 'Ice-beard', 'the Unlucky', 'Oar-breaker', 'the Silent', 'Raven-friend', 'the Tall', 'Hard-hand', 'Sea-wise'],
      title: ['Jarl', 'Jarla', 'Chieftain', 'Hersir', 'Queen', 'King', 'Thane'],
    },
    // Dwarvish: Khuzdul-like (Khazad, Baraz-dûm)
    dwarf: {
      first: ['Khaz', 'Baraz', 'Zirak', 'Gund', 'Khel', 'Bund', 'Nar', 'Dur', 'Thrak', 'Gabil', 'Azan', 'Kibil', 'Buzun', 'Sharb', 'Felak', 'Mahal', 'Ur', 'Tumun', 'Zig', 'Bar'],
      second: ['-dûm', 'ad', 'ul', 'gathol', 'nâla', 'zigil', 'ûn', 'ar', 'bizar', 'uzbad', 'barak', 'hund', 'gûl', 'ak', 'ad-dûm', 'tharn'],
      realm: ['-dûm', 'hold', 'delving', 'halls'],
      person: ['Durin', 'Thráin', 'Náli', 'Frár', 'Lóni', 'Bifur', 'Gróin', 'Farin', 'Borin', 'Fundin', 'Dís', 'Hrera', 'Náin', 'Óin', 'Flói', 'Telchar', 'Azaghâl', 'Gamil', 'Ibun', 'Khîm', 'Mîm', 'Zirak'],
      epithet: ['Stonefoot', 'Ironfist', 'Longbeard', 'the Deep-delver', 'Firebeard', 'Broadbeam', 'the Unforgiving', 'Gold-counter', 'Hammerhand', 'the Grim', 'Rune-cutter', 'of the Deep'],
      title: ['King under the Mountain', 'Lord', 'Master', 'Forge-master', 'Thane', 'Queen'],
    },
    // Elvish: Sindarin-like (Lothlorien, Edhellond)
    elf: {
      first: ['Loth', 'Edhel', 'Caras', 'Nim', 'Gal', 'Tawar', 'Eryn', 'Amon', 'Cel', 'Aer', 'Lind', 'Ithil', 'Lasg', 'Mith', 'Nen', 'Gil', 'Thal', 'Bar', 'Dor', 'Imlad', 'Glan', 'Tol', 'Ael', 'Faer'],
      second: ['lórien', 'lond', 'galadhon', 'ras', 'adhrim', 'ennin', 'ion', 'eldor', 'rond', 'duin', 'orn', 'iel', 'dil', 'galen', 'rien', 'lin', 'thalion', 'ath', 'os', 'aenor', 'ithil'],
      realm: ['', ''],
      person: ['Galathil', 'Nimrodel', 'Thranduil', 'Celebrían', 'Amroth', 'Mithrellas', 'Legolas', 'Lindir', 'Erestor', 'Haldir', 'Orophin', 'Rúmil', 'Elwing', 'Idril', 'Finduilas', 'Aerin', 'Gwindor', 'Beleg', 'Mablung', 'Nellas', 'Saeros', 'Daeron'],
      epithet: ['Starlight', 'of the Golden Wood', 'the Fair', 'Silverleaf', 'the Wanderer', 'Evenstar', 'the Elder', 'Greenleaf', 'of the Havens', 'Nightsinger', 'the Watchful', 'Moonwise'],
      title: ['Lord', 'Lady', 'Warden', 'Prince', 'Princess', 'Elder'],
    },
    // Goblin / orc: harsh (Grishnak, Gorbag)
    goblin: {
      first: ['Grish', 'Gor', 'Snag', 'Ug', 'Mor', 'Lug', 'Shag', 'Bol', 'Az', 'Gul', 'Murg', 'Thrak', 'Zog', 'Krag', 'Nar', 'Ruk', 'Skraa', 'Bur', 'Dush', 'Ghâsh'],
      second: ['nak', 'bag', 'rat', 'luk', 'gul', 'dûr', 'burz', 'gash', 'mog', 'ruk', 'uk', 'zog', 'thrak', 'arg', 'ash', 'nûl', 'rakh', 'lûk'],
      realm: ['-hold', ' Pit', ' Warren', ' Deep'],
      person: ['Grishnakh', 'Gorbag', 'Shagrat', 'Snaga', 'Uglúk', 'Lugdush', 'Bolg', 'Azog', 'Golfimbul', 'Mauhúr', 'Radbug', 'Lagduf', 'Muzgash', 'Ufthak', 'Gorgol', 'Boldog', 'Othrod', 'Lug', 'Zogbag', 'Skrag'],
      epithet: ['the Biter', 'Skull-taker', 'Half-ear', 'the Foul', 'Rat-eater', 'Nine-fingers', 'the Red-handed', 'Bone-gnawer', 'the Sneak', 'Big-tooth', 'Wolf-rider'],
      title: ['Chief', 'Warlord', 'Boss', 'Captain', 'Great Goblin'],
    },
  };

  const terrainWords = {
    vale: ['Vale', 'Dale', 'Hollow', 'Bottom', 'Glen'],
    moor: ['Moor', 'Heath', 'Waste', 'Fen', 'Marsh'],
    fells: ['Fells', 'Heights', 'Downs', 'Ridge', 'Crags'],
    wood: ['Wood', 'Forest', 'Weald', 'Holt', 'Thicket'],
    coast: ['Shore', 'Strand', 'Bight', 'Reach', 'Cape'],
    plain: ['Plain', 'Fields', 'Flats', 'Meads', 'Lea'],
    mountain: ['Peaks', 'Teeth', 'Spires', 'Wall', 'Horns'],
    desert: ['Sands', 'Dust', 'Barrens', 'Wastes'],
    snow: ['Snows', 'Frost', 'Ice', 'Whites'],
    swamp: ['Mire', 'Fen', 'Marsh', 'Bog', 'Sloughs'],
    isle: ['Isle', 'Isles', 'Skerry', 'Holm'],
  };
  const adjectives = ['Grey', 'Ashen', 'Silent', 'Weeping', 'Broken', 'Golden', 'Hollow', 'Hidden', 'Windy', 'Bitter', 'Green', 'Old', 'Sunken', 'Barren', 'Lonely', 'Thorny', 'Misty', 'Burning', 'Quiet', 'Lost', 'Haunted', 'Wild', 'Narrow', 'Long', 'Red', 'Singing', 'Still', 'Whispering', 'Howling', 'Glimmering'];

  const dragonParts = {
    a: ['Vor', 'Ash', 'Nim', 'Kar', 'Zal', 'Thra', 'Mor', 'Ig', 'Sar', 'Vel', 'Dra', 'Ur', 'Gal', 'Ryu', 'Sko', 'Eth', 'Ald', 'Ny', 'Bal', 'Fyr', 'Tor', 'Vash', 'Kha', 'Sil', 'Ob', 'Rha', 'Mal', 'Az', 'Kel', 'Og'],
    b: ['tha', 'ka', 'ra', 'go', 'ri', 'mo', 'za', 'dre', 'vi', 'ssa', 'ne', 'ru', 'ga', 'lo', 'thi', 'ma', 'xa', 'du', 'ba', 'sha'],
    c: ['x', 'rath', 'gon', 'moth', 'rr', 'thax', 'zar', 'dros', 'll', 'kor', 'nth', 'sk', 'mir', 'vyr', 'gorn', 'th', 'dar', 'ssk', 'mund', 'rax', 'dil', 'kesh'],
  };

  const names = HB.names = {
    cultures,
    used: new Set(),
    reset() { names.used.clear(); },
    unique(fn, tries = 20) {
      let n = fn();
      for (let i = 0; i < tries && names.used.has(n); i++) n = fn();
      names.used.add(n);
      return n;
    },
    /** dragon name, 2-3 syllables */
    dragon(rng) {
      rng = rng || new HB.RNG();
      return names.unique(() => {
        const three = rng.chance(0.55);
        let n = rng.pick(dragonParts.a) + (three ? rng.pick(dragonParts.b) : '') + rng.pick(dragonParts.c);
        return n.charAt(0).toUpperCase() + n.slice(1);
      });
    },
    /** settlement / place proper name */
    place(rng, culture = 'westron') {
      const c = cultures[culture] || cultures.westron;
      return names.unique(() => join(rng.pick(c.first), rng.pick(c.second), culture));
    },
    /** realm / faction name */
    realm(rng, culture, capitalName) {
      const c = cultures[culture] || cultures.westron;
      if (culture === 'westron' || culture === 'northern') {
        const base = rng.pick(c.first);
        return names.unique(() => join(base, rng.pick(c.realm), culture));
      }
      if (culture === 'dwarf') return names.unique(() => join(rng.pick(c.first), rng.pick(['-dûm', 'ad', 'gathol', 'barak']), culture));
      if (culture === 'goblin') return names.unique(() => 'the ' + rng.pick(['Black', 'Red', 'Broken', 'Bloody', 'Grey', 'Fanged']) + ' ' + rng.pick(['Host', 'Horde', 'Pits', 'Warrens', 'Teeth', 'Claws']));
      return names.unique(() => join(rng.pick(c.first), rng.pick(c.second), culture));
    },
    /** named region: geographic style */
    region(rng, flavour, culture) {
      const words = terrainWords[flavour] || terrainWords.plain;
      const r = rng.next();
      if (r < 0.4) return names.unique(() => 'The ' + rng.pick(adjectives) + ' ' + rng.pick(words));
      if (r < 0.7) return names.unique(() => 'The ' + rng.pick(words) + ' of ' + names.place(rng, culture));
      return names.unique(() => names.place(rng, culture) + ' ' + rng.pick(words));
    },
    /** subregion: 'The Vale of Ashford', 'Thornhollow Moor', 'The Weeping Fells' */
    subregion(rng, flavour, culture) {
      const words = terrainWords[flavour] || terrainWords.plain;
      const r = rng.next();
      if (r < 0.3) return names.unique(() => 'The ' + rng.pick(adjectives) + ' ' + rng.pick(words));
      if (r < 0.6) return names.unique(() => 'The ' + rng.pick(words) + ' of ' + names.place(rng, culture));
      return names.unique(() => names.place(rng, culture) + ' ' + rng.pick(words));
    },
    person(rng, culture = 'westron', withTitle = false) {
      const c = cultures[culture] || cultures.westron;
      const first = rng.pick(c.person);
      const ep = rng.chance(0.5) ? ' ' + rng.pick(c.epithet) : '';
      return (withTitle ? rng.pick(c.title) + ' ' : '') + first + ep;
    },
    title(rng, culture = 'westron') { const c = cultures[culture] || cultures.westron; return rng.pick(c.title); },
    /** family / house name */
    house(rng, culture = 'westron') {
      const c = cultures[culture] || cultures.westron;
      return 'House ' + rng.pick(c.first) + rng.pick(['wood', 'mere', 'stone', 'hill', 'wick', 'thorn', 'ford', 'bane', 'ash']);
    },
    river(rng, culture) {
      const c = cultures[culture] || cultures.westron;
      return names.unique(() => rng.pick(['River ', '', '']) + join(rng.pick(c.first), rng.pick(culture === 'elf' ? ['duin', 'os', 'lin', 'nen', 'ros'] : ['water', 'burn', 'flow', 'run', 'wash', 'bourne']), culture));
    },
    heroName(rng, culture) { return names.person(rng, culture, false); },
    orderName(rng, founder) { return rng.pick(['The Order of ', 'The Brotherhood of ', 'The Company of ', 'The Wardens of ']) + rng.pick(['the Scale', 'the Spear', 'the Ember', 'the Broken Wing', 'the Last Flame', 'the Iron Lance', 'the Grey Watch', 'the Hollow Hill']) + (founder ? ` (founded by ${founder})` : ''); },
  };

  function join(a, b, culture) {
    if (b.startsWith('-') || b.startsWith(' ')) return a + b;
    // avoid awkward double vowels/consonants at the seam
    const la = a[a.length - 1], fb = b[0];
    if (la === fb) return a + b.slice(1);
    const vowels = 'aeiouyâûáéíóú';
    if (culture === 'westron' && !vowels.includes(la.toLowerCase()) && !vowels.includes(fb)) {
      // westron compounds happily join consonants (Ashford) — fine
    }
    return a + b;
  }
})();

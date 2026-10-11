/* Colour palette: ink-and-parchment UI colours plus a limited pixel-art palette. */
(function () {
  const HB = globalThis.HB;
  HB.palette = {
    ink: '#2b1a0e',
    inkSoft: 'rgba(43,26,14,0.72)',
    inkFaint: 'rgba(43,26,14,0.35)',
    inkRed: '#7a2418',
    inkBlue: '#2f4a66',
    inkGreen: '#3d5a34',
    parchment: '#e6d5ad',
    parchmentLight: '#f1e4c2',
    parchmentDark: '#cdb783',
    parchmentDeep: '#b89e68',
    gold: '#d8a43b',
    goldLight: '#f3d47a',
    ember: '#e2642a',
    blood: '#8f2b1f',
    sea: '#8ea3ad',
    shadow: 'rgba(30,18,8,0.45)',
    good: '#3f6d3a',
    bad: '#8f2b1f',
    warn: '#9c6b1c',
    focus: '#c98a1f',
    // danger grading used in previews (never colour alone — text always accompanies)
    danger: ['#3f6d3a', '#7c7a2a', '#9c6b1c', '#a0421e', '#6b1a12'],
  };

  // Pixel palette (named). Warm Tolkien earth tones + brighter creature colours.
  HB.px_palette = {
    black: '#1a1016', outline: '#2a1c22', dark: '#3b2a33', shadow: '#4f3a46',
    stone: '#6f6a72', stoneLight: '#9a949a', stoneHi: '#c9c3c5', white: '#f6efe2',
    wood: '#6b4328', woodLight: '#9a6a3c', woodHi: '#c9955a', straw: '#d9b86a',
    dirt: '#7d5a3a', dirtLight: '#a98357', sand: '#d8c28c',
    grass: '#5c8a3c', grassLight: '#86b24e', grassDark: '#3f6a2d', leaf: '#2f5a2a', leafLight: '#4d8a3a',
    sky: '#8fb8d8', skyLight: '#c9e0ee', skyDusk: '#e7a56b', night: '#283552',
    water: '#4d7fa0', waterLight: '#7db2cc',
    skin: '#e8b48c', skinDark: '#b57e58', hair: '#4a2c1a', hairLight: '#a06a3a',
    cloth: '#8a3e3e', clothBlue: '#3f5f94', clothGreen: '#4f7a3f', clothPurple: '#6a4a85', clothYellow: '#c9a53a',
    iron: '#7d8390', ironLight: '#aab0bb', ironDark: '#4e535d',
    gold: '#e0b23a', goldLight: '#f7d86a', goldDark: '#a67a1f',
    gem: '#4fb0d8', gemRed: '#d84a4a', gemGreen: '#4fc06a', gemPurple: '#a05ad8',
    fire: '#ff8a2a', fireHot: '#ffd34a', fireCore: '#fff3b0', smoke: '#5a5150',
    blood: '#9a1f1f',
    // dragon breeds
    red: '#c8402e', redLight: '#e8724e', redDark: '#862416', redBelly: '#e9c27a',
    green: '#4f9a4a', greenLight: '#7ec46a', greenDark: '#2d6a2e', greenBelly: '#d8d08a',
    black: '#2b2833', blackLight: '#4d4860', blackDark: '#16141c', blackBelly: '#6f6b86',
    gold: '#d8a73a', goldLight: '#f1cf6c', goldDark: '#9a7120', goldBelly: '#f8e8b4',
    blue: '#3c6fb8', blueLight: '#6c9ddd', blueDark: '#244a86', blueBelly: '#b7d6ea',
  };
  // fix duplicate key collisions for black/gold used in both contexts
  HB.px_palette.pitch = '#1a1016';
  HB.px_palette.coin = '#e0b23a';
})();

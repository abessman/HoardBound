/* The map art packs Settings offers (Settings → Map art). Each is a folder in assets/map/packs/<name>/ holding
 * pack.json and pack.js; see assets/map/README.md. Add a line here to make a new pack selectable; ?mappack=<name>
 * works without it. Loaded by index.html as a classic script, so it also works from file://. */
HB.MAP_PACKS = [
  { name: 'illuminated', label: 'Illuminated parchment' },
  { name: 'sample', label: 'Sample (test)' },
];

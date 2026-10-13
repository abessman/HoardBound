# Pixel art from the editor

Drawn with the pixel editor (`editor/index.html`, live at https://hoardbound.netlify.app/editor/) and committed here
by it. One file per sprite (`<id>.js`) plus `index.js`, the list the game loads at start (`src/art/pixelart.js`).
`palettes.js` holds the editor's saved colour palettes (the game does not load it). Readable and safe to edit by hand;
`node tools/test.js` checks them. Format and use: `docs/pixel-editor.md`.

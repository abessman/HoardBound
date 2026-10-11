# src/views — screens and HUD

Rules for view code (scenes drawn on the one canvas). The UI toolkit is `src/core/ui.js`; input is `src/core/input.js`.

## Basics
- Every view file starts with `if (!HB.isBrowser) return;`.
- In-canvas only: `HB.ui` widgets (Button, Label, ListBox, Meter, Custom, Modal), `HB.CardScene`, `HB.modal`,
  `HB.notice`. Scenes are a stack (`HB.scenes.push/pop/replace`); a scene has `enter/update/draw` and an `opaque` flag.
- Fixed 1280×720 virtual layout; measure text (`HB.text.paragraphHeight`) and size panels to their content
  rather than guessing (previews, summaries, cards have overflowed before).
- Class bodies: no commas between methods. Run `node --check` on every file you touch.

## Fonts and readability
- Alegreya / Alegreya SC for reading text; IM Fell English SC (`family: 'display'`) only for big titles and map
  region names. `HB.text.MIN_SIZE` (13) is the floor. The owner found IM Fell hard to read at small sizes.

## iPad and touch
- The owner plays on an iPad, sometimes with a mouse. Tap to select, drag to pan, lists scroll by dragging.
- Information shown only on hover needs a tap path too (tooltips appear on focus; trophy cards pin on tap).
- The page must never be selectable or draggable: `index.html` CSS and `input.js` block selection, drag images and
  callouts (a stray selection once tinted the whole canvas). Keep it that way.

## Check visually
- `node tools/screenshot.mjs out.png "js" --url="index.html?debug=1&scene=map&seed=ember-quill-42"` and
  `node tools/playthrough.mjs <dir>`; open the PNGs. Layout bugs only show up visually.

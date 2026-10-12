# Illuminated parchment — 0.14.0

A first illustrated map pack based on the owner's parchment concept: craggy sepia mountains, low hills,
olive woodland and ivory settlements with ochre/rust rooftops. Nine transparent PNGs replace eight symbol families;
all other symbols, including blighted terrain, continue using the existing procedural art. This is not a full
replacement for every place, state, home stage or dragon sprite.

## Try it
- Open `index.html?mappack=illuminated` and continue your campaign.
- For a disposable showcase: `index.html?scene=mappreview&mappack=illuminated&cam=~0,0,1.9`.
- For the existing reveal animation: `index.html?scene=washpreview&mappack=illuminated`.
- Settings → Map art → **Illuminated parchment** saves the selection. Fresh settings default to this pack;
  existing saved preferences are respected. URL selection applies only to that visit.

## Roll back
- Settings → Map art → **Original ink**, or `index.html?mappack=none`, restores the previous symbols immediately.
- The exact pre-update code is saved on GitHub branch `backup/map-before-illuminated-2026-10-12`, commit
  `cb0e5f404d678f96dee0b5d7597b1eae03d9b9ea` (0.13.0).
- For a full code rollback, revert the 0.14.0 art commit on the working branch and deploy that revert. Avoid
  resetting the branch if later gameplay work has landed. The backup is a reference; switching art needs no save reset.

## Assets and integration
Created with OpenAI's built-in image generation using the owner-approved parchment concept as the style reference.
The exact prompt set is in [PROMPTS.json](PROMPTS.json). Source padding was trimmed to the visible alpha bounds,
then proportionally resized into anchored 8× PNG frames. Colours and drawing were not repainted during packaging.
`pack.json` is authoritative; `node tools/mappack.js illuminated` validates it and regenerates `pack.js`.

The pack softens roads, coasts and rivers. Existing reveal and territory washes remain independent of its symbols.
Terrain now renders at 2× above zoom 1.3 with a 64 MiB chunk bitmap budget, preserving world positions and hit areas.
Switching to Original ink cancels a pending pack load so the new pack cannot reappear afterwards.

The pack is deliberately partial: towns under siege retain crossed swords, destroyed places retain smoke/fading,
and faction flags still draw over castle artwork. Existing campaigns, world generation and gameplay rules are unchanged.
Physical iPad performance and the owner's art preference still need hands-on review.

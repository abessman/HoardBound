# Illuminated parchment — 0.15.0

An illustrated parchment map: 39 transparent PNGs, 96 manifest ids and 23 fine native ink details cover
all declared glyph families and states. Includes mines, carts, sacred sites, endgame strongholds, all eight
home stages, travelers, armies, dragon map markers, corrupted terrain and damaged buildings.

## Try it
- Every symbol and state: `index.html?scene=artcatalog&mappack=illuminated` (no campaign or save).
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
then proportionally resized into anchored 4× or 8× PNG frames. Colours and drawing were not repainted during packaging.
`pack.json` is authoritative; `node tools/mappack.js illuminated` validates it and regenerates `pack.js`.

The pack softens roads, coasts and rivers. Existing reveal and territory washes remain independent of its symbols.
Terrain now renders at 2× above zoom 1.3 with a 64 MiB chunk bitmap budget, preserving world positions and hit areas.
Switching to Original ink cancels a pending pack load so the new pack cannot reappear afterwards.

State variants share their base images: `treatment` selects cached burned/ruin/deep/spent rendering;
`decor` adds fine ink rubble, fields, faction banners or camp distinctions. `style.inkFinish` enables
`src/art/mapink.js` for dynamic marks. These optional fields are interpreted by this game's loader.
Army flags retain faction colours; rich caravans have coloured cloth. Map dragons use breed tint and life-stage
size; detailed mutations and scars remain visible in the existing pixel scenes, not this small map glyph.
Existing campaigns, world generation, hit areas, reveal washes and gameplay rules are unchanged.

The first-pack 0.14.0 backup is `backup/map-first-art-pack-2026-10-12`, commit
`5db8e32238576b8affd1d9f64ad276560930e23d`. Revert the 0.15 commit to return to that version.
Physical iPad performance and the owner's art preference still need hands-on review.

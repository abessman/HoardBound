# The map in 3D (experiment)

Recorded 13 October 2026. A test view exists (0.23); the live map is unchanged until the owner decides.

## The owner's words

> Take the map and make it at a sort of 3d angle with the sprites sticking up slightly and placed on the 3d space... as
> you move around this would allow things to have a bit more depth... I still would ideally have the paper at a steep
> angle so that it looks like you are on parchment... we could even add turning the parchment orientation where all
> the sprites stay facing towards the camera but their positions shift and the parchment obviously turns.

> We can limit the zoom... a button that does a large zoom out so you can get a high level view but the LOD can drop
> extensively. I do like the angle flattening as you zoom out. Things hiding behind mountains... could be a fun element.

## The test view

Settings → **3D map test** (your campaign if one is open, else a test world), or `index.html?scene=map3d`
(`&preset=adult-kind`, `&reveal=40`, `&mappack=pixel`). Code: `src/views/map3d.js`.
- Ground: the live map's own chunk drawing (`MapScene.renderChunk`, reused), shown with WebGL on a plane (mipmapped,
  anisotropic), the paper texture and fog in the shader, haze in the distance.
- Standing symbols: while a chunk is drawn, the mountains, hills and trees are recorded instead of painted (the
  live placement, small round large and all), then drawn as upright sprites facing the camera, far to near. Each
  kind is cached once per shape and tone and scaled. Places, legendary peaks, fog-edge clouds and the circling
  dragon (with its shadow on the paper) stand up too; names face the camera and give way to nearer ones.
- Camera: steep tilt close up (62° in "steep"), flattening as you zoom out; zoom limited (6–60 cells); Overview goes to
  200 cells at 10° with symbols painted flat and minor places dropped. Turn with a two-finger twist, ⟲ ⟳ or Q/E.
  Buttons compare tilts (steep, medium, gentle), standing vs flat symbols, and fog on or off.

## Open questions

- Is the steep tilt right, and should the overview turn top-down?
- Do things hidden behind mountains stay, fade, or become a feature (secret valleys)?
- Speed on the iPad (shown top left): the ground is cheap; the sprites are the cost.
- Before it could replace the map: territory wash on the ground, travel paths and targets, tapping places, entities.

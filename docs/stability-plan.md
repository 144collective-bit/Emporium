# Stability plan: no black screens, less memory, room to grow

The owner's call (2026-11-13): "I have the black screen issue and want to fix
it. I want to also cut the memory budget as much as possible to stabilise the
gameplay... the game is large now and will grow more, so how can we keep it
running smooth and without glitches." The owner's answers: the black screen
is on a **laptop / desktop**, it **opens, flickers a few times, then stays
black with no message**; the memory cut is **max, on all devices**.

Build one phase at a time, each with the owner's sign-off. This plan picks up
where `docs/performance-plan.md` left off (its phases are all done).

## What was found

Measured in the built site (`npm run build`, textures baked), headless
Chromium at 1440 x 900, for 150 s from the start menu (`?fps`). The headless
machine picked the **medium** tier; a laptop with 8 cores picks **high**.

### The black screen: one city block's lot has broken corners

The only error in the console, every boot, on every tier:
`THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values`.
Traced to its source (three.js patched in the test browser to report the
first NaN position and its stack):

- **Crestmont's block `crest-0-2`** (Coral Drive's west side, about x 303-327,
  z 20-41). Its parking bay `park-w2` (`CORAL_BAYS`, `crestmont.ts`) runs to
  z 39.7; with the sidewalk round its end (`WALK_W` 0.8) that is 40.5, the
  block's own corner. `crestPoly()` then writes the corner twice and turns
  straight back along the block's north edge: a zero-length edge, then a
  180-degree fold.
- `insetPoly()` (`world.ts`) divides by each edge's length and by
  `1 + cos(turn)`: both are 0 there, so two corners of the inset outline
  are NaN, and the lot drawn inside the block (`world.ts`, the
  `flatPoly(insetPoly(blk.poly, 0.4), SLAB + 0.003)` line) carries 15 NaN
  numbers into the shared paving mesh. The mesh's bounding box is NaN from
  then on.
- **Why that blacks out a desktop:** on a real GPU a triangle with NaN
  corners can write NaN pixels. The colour target is half-float, and the
  bloom blurs every pixel into its neighbours over five levels, so one NaN
  pixel spreads across most of the screen, and NaN shows as black. It
  flickers while the camera brings the block in and out of view, then stays
  black once it's in view. The software renderer the tests use drops those
  triangles, so it never showed in a test or a review shot. **This is the
  strong suspect; it is confirmed only once the fixed build runs black-free
  on the owner's laptop.**
- The GPU-lost card (`webglcontextlost`) never fires for this: the GPU is
  fine, the picture is not. That's why there's no message.

### Memory: where it goes, and what `?fps` doesn't count

| | At the start | After 150 s |
|---|---|---|
| Geometry | 89 MB | 124 MB (only 495 of about 4,400 sites built; still climbing) |
| Textures | 38 MB | 92 MB (still climbing, with nothing opened) |
| Lazy districts loaded | none | all 13, within 6 s of the start menu |
| Draws / triangles, the home view | 485 / 1.33M | 477 / 1.16M |

- **The render targets aren't in `?fps` at all, and on the high tier they
  are the biggest thing.** The high tier draws at up to 2x pixels with 4x
  MSAA into a half-float target, and the effect composer clones that target
  for its second buffer, MSAA and all. On a 1440 x 900 retina laptop
  (2880 x 1800 pixels) that's about **290 MB a target, about 580 MB for the
  two**, before the normal and depth pre-pass (about 40 MB) and the bloom.
  On a laptop whose GPU shares system memory, that alone is enough to
  destabilise it.
- **Desktop never lets anything go.** Far tiles past the haze are let go on
  phones only (`hazeHorizon()`, `vanish()`); the near budget is 96 MB on high
  and 64 on medium; once a district is loaded it stays loaded; places keep
  their near and far forms both.
- **The City view loads the whole world at once.** From the home view every
  district comes within reach, so all 13 chunks load at the start, competing
  with the start-up for memory and time.
- **Textures climb with nothing opened** (38 to 92 MB in 150 s). Some of that
  is districts arriving; whether any of it is a leak (a live texture painted
  again and the old one never disposed) needs measuring.
- **Every buffer is held twice**: three keeps each geometry's arrays in
  JavaScript after it's uploaded to the GPU.

## Phase 1: the black screen (S, low risk; built, waiting on the owner's laptop)

1. **The block's lot drawn right, the block left as it is.** The fold in
   `crest-0-2`'s outline is what carries the sidewalk across the bay's end to
   the corner (its slab is the outline grown outwards, `slabOf()`), so the
   outline, its slab, its kerb and walking on it stay exactly as they were.
   Only the lot inside it (and every block's lot and The Trenches' yards) is
   drawn inside the tidied outline: `tidyOutline()` in `streetplan.ts` drops
   repeated points and corners the outline runs straight through or back
   from. The lot ends where the bay begins, as it always should have.
2. **`insetPoly()` hardened** (moved beside `outset()` in `streetplan.ts`,
   DOM-free): a repeated point takes its neighbours' sides, and a side that
   turns straight back is moved in square to the side it leaves. The same
   corners as before everywhere else; never NaN.
3. **A guard where geometry joins the city**: `splitByTile()` in
   `tilebatch.ts` (every tile-merged piece comes through it) leaves out any
   triangle with a NaN or infinite corner, counts it (`DROPPED`: `?fps`
   says so, `__mem()` has `nanTris`) and warns once a site.
4. **A safety net in the picture**: the ink pass (`post.ts`) turns any NaN
   or infinite pixel into the ink's colour before the bloom sees it, so a
   stray pixel from anything else stays one pixel instead of spreading.
5. **Tests that hold it**: `tests/outlines.test.ts` (every block's lot, the
   inset of its outline as it is and its slab finite, the lot on its slab;
   `crest-0-2` keeps its fold and its sidewalk); `tests/tilebatch.test.ts`
   (a NaN or infinite corner left out and counted); `npm run smoke` fails on
   any NaN warning in the console.
6. **On the owner's laptop**: the new build, the City view and a walk
   through Crestmont's Coral Drive, to confirm the black screen has gone.

## Phase 2: the render targets (S-M, low risk; the biggest saving on desktop)

1. **MSAA on the scene's pass only.** The composer's second buffer (what the
   ink, bloom and output ping-pong through) has no MSAA: about 290 MB back at
   2880 x 1800, with the same picture.
2. **No MSAA at 1.75x pixels and over** (the owner's pick, 2026-11-13). At
   retina density the pixels are already small: SMAA (already in its own
   chunk) smooths the edges for a fraction of the memory; MSAA stays on 1x to
   1.5x screens.
3. **Count them.** `?fps`, `?bench` and `window.__mem()` add the render
   targets and the shadow maps to geometry and textures: one total for what
   the city holds on the GPU.

## Phase 3: hold less geometry, on every tier (M, medium risk)

1. **Past the haze, every tier lets far tiles go on the ground** (today
   phones only; the same horizon, the same rules, `toVanish()` / `regain()`).
2. **The City view's far city as far forms only**: past the tier's `far`,
   tiles keep their always-drawn and far pieces and let near pieces go
   sooner. *The owner's call: how far the City view keeps the full city.*
3. **Lower near budgets**: high 96 to 64 MB, medium 64 to 48 (`TIERS`),
   measured with `?bench` for pop-in.
4. **Districts load nearest first, a few at a time**, not all 13 at once,
   and a district far away for a while lets its near pieces and its
   main-thread drawing go (unloading is new: today a district only loads).
5. **The uv attribute left out where nothing reads it** (8 of each vertex's
   29 bytes; only the trees' sway and the textured surfaces use it): about a
   quarter off the tile geometry.
6. **Places' near forms let go when far**: their GPU buffers freed past the
   far distance and uploaded again on the way back (the arrays stay in
   JavaScript, so it's quick).
7. **The JavaScript copies dropped** for geometry that's uploaded and never
   read again (three's `onUpload`), halving what fixed geometry costs the
   page's own memory. What a batched mesh needs to grow or pack (`optimize()`,
   `trim()`) keeps its arrays.

## Phase 4: textures (S-M, low risk)

1. **Find the climb**: `__mem()` by texture over a long idle session; any
   live texture painted again without disposing the old one is fixed
   (`liveTex()` reuses its canvas and texture).
2. **Textures of panels and screens freed when they close** (the fitting
   room's stage, the character screen, the garage's turntable, the gun
   store), loaded again when they open.
3. **Smaller where it doesn't show**: canvas textures that are only ever seen
   far away drawn at half size on every tier (phones already do), and no
   mipmaps on textures only seen face-on near.

## Phase 5: budgets that hold as the city grows (M, low risk)

The guard rails, so a new district can't undo the work:

1. **A memory ceiling per tier** in `scripts/budget.mjs`: after a build, a
   headless run of `?bench` at the phone and desktop tiers; the build is red
   if the GPU total (geometry, textures, targets) at any view is over the
   ceiling. *The owner's call: the ceilings (suggested: 150 MB phones,
   300 MB desktop, set from Phases 2-4's measured numbers plus a margin).*
2. **A district's own budget**: each entry in `LAZY_DISTRICTS` states the
   geometry it may hold near and far; a test builds its sites and fails if
   it's over.
3. **No NaN, ever**: the smoke test and the bench fail on any NaN warning
   (from Phase 1), so a broken outline is caught before it's merged.
4. **Long-session check**: `npm run soak` (new), the city left in the City
   view and then walked across town for 20 minutes headless, failing if
   memory keeps climbing after it has settled (a leak).

## Phase 6: smoother frames (S-M, low risk)

1. **The quality step-down without the hitch**: today, turning shadows off on
   a slow desktop recompiles every material in one frame (a freeze of a
   second or more on a laptop). Shadows go by their intensity (already 0 in
   the City view) instead, so nothing recompiles.
2. **A lost GPU comes back**: on `webglcontextrestored` the city reloads
   itself once (the save is kept), instead of waiting on Reload.
3. **Hitches measured and capped**: `?bench`'s slowest frame per view goes in
   the budget, so a step that freezes (a big `trim()`, a district arriving)
   is red.

## Suggested order

Phase 1 now (it's the reported bug, and small) → Phase 2 (the biggest
saving, with little risk) → Phase 5's ceilings set from what 1 and 2
measured → Phases 3 and 4 → Phase 6. Real-device numbers (`?bench`'s
**Copy results** on the owner's laptop and phone) before and after each.

## The owner's decisions

- **Phase 1 first, on its own** (2026-11-13), tested on the owner's laptop
  before anything else.
- **Retina: SMAA above 1.75x pixels, MSAA below** (Phase 2.2).
- (waiting) How far the City view keeps the full city (Phase 3.2); the
  ceilings (Phase 5.1).

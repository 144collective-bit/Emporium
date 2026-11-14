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

## Phase 1: the black screen (done, on main: #141; waiting on the owner's laptop)

The same cause was found and fixed in parallel (`Merge pull request #141`),
and that's what's live:

1. **The lot drawn right, the block left as it is.** `insetPoly()` moved to
   `streetplan.ts` (DOM-free) and tidies the outline first (`tidyPoly()`:
   repeated corners and spikes out, its area the same), so `crest-0-2`'s lot
   is an L round the bay with every corner a number. The outline, its slab
   (the sidewalk across the bay's end), its kerb and walking on it are as
   they were.
2. **A guard where geometry joins the city**: `tileBatch()` leaves out a
   piece whose bounds aren't numbers, and warns.
3. **A safety net in the picture**: the ink pass (`post.ts`) turns a NaN or
   infinite pixel into a dark one before the bloom (written as a comparison
   NaN fails, which drivers keep, rather than `isnan()`, which some optimise
   away).
4. **Tests**: `tests/streetplan.test.ts` (every block pulled in to its lot
   stays a number; tidied, an outline keeps its area). Added with this plan:
   `npm run smoke` fails on any NaN warning in the console (three's
   bounding-box one or the guard's), since the software renderer it runs in
   draws on regardless.
5. **On the owner's laptop**: the live build, the City view and a walk
   along Crestmont's Coral Drive, to confirm the black screen has gone.

## Phase 2: the render targets (done, 2026-11-13; waiting on the owner's laptop)

1. **MSAA on the scene's pass only.** The composer's second buffer (what the
   ink, bloom and output ping-pong through, full-screen quads only) has no
   MSAA and no depth (`post.ts`).
2. **No MSAA at 1.75x pixels and over** (the owner's pick). At retina
   density the pixels are already small: SMAA (already in its own chunk)
   smooths the edges instead. Below that, as before: 1x and 1.25x desktops
   draw MSAA and SMAA, 1.5x MSAA only; medium never draws MSAA; phones FXAA.
   The rule is `antialias()` in `targets.ts` (DOM-free, `tests/targets.test.ts`).
3. **Counted.** `?fps` (the memory line: `targets`, and which smoothing),
   `?bench` (its Memory line and `__bench.targets`) and `window.__mem()`
   (`targets`) count the picture's render targets and every shadow map
   (`targetMemory()` in `perf.ts`, `targetBytes()` in `targets.ts`).

### Phase 2's bug, found live and fixed (2026-11-13)

Merged, the phones drew the scene with no depth: only the ink's outlines
and the sky and haze, far things painted over near ones (the owner's
screenshot, walk mode). three's composer draws the scene into its *read*
buffer, which starts as `renderTarget2`, the buffer item 1 stripped of
depth, and moves with every swap: phones swap twice a frame (the ink, the
output), so the scene was always drawn without depth; desktops with SMAA
swap three times, so every other frame was (the review shot had caught a
good frame). **Fixed:** `post.ts` hands the composer `renderTarget1` (the
scene's, with its MSAA and depth) as its read buffer at the start of every
frame (`sceneFirst()`), so the scene is always drawn there. Checked in walk
mode on the phone tier (390 x 844 touch) and a desktop with SMAA, six
frames in a row each: every frame drawn right. **The lesson for review
shots: take several frames in a row, on the phone tier too, after anything
that changes how a frame is drawn.**

### What Phase 2 measured

The high tier in headless Chromium at 1440 x 900 (`?fps`), the render targets
and shadow maps after; before worked out with the same `targetBytes()` for
the targets as they were (the tests hold the arithmetic). MiB.

| | Before | After |
|---|---|---|
| A retina screen, 2x (2880 x 1800) | about 706 | **291** (SMAA): 59% less |
| A 1x screen (1440 x 900) | about 234 | **175** (4x MSAA): 25% less |

- The picture at 2x with SMAA: outlines, glow and edges as they were (a
  review shot of downtown).
- `npm test`, typecheck, lint and the budget pass; the boot's code 1.6 KB
  bigger (713.8 of 740 KB).
- **What's left in the targets** (for later, not in this phase): the high
  tier's two shadow maps, 2048 each, are about 64 MiB of the 175-291
  (drawn only on the ground, never in the City view); the ink's normal and
  depth pre-pass at full size, about 40 MiB at 2x.

## Phase 3: hold less geometry, on every tier (M, medium risk)

**Phase 3a (built, 2026-11-13): items 1 and 3.** The owner's picks: these two
first; **the City view keeps everything** (item 2 is not built).

- **Built.** On the ground (walking, driving, riding; not the City view, not
  flying) every tier's horizon is `hazeHorizon()` of the scene's fog
  (index.ts; it was phones only). `TIERS` near budgets: high 96 to **64**
  MB, medium 64 to **48** (low stays 32).
- **Measured** (the high tier, headless, 1440 x 900): eight minutes near
  downtown, and ten in the City view then walking at Degen's home on the
  far side of town: the same to the MiB before and after (115 to 136, and
  to 148 MiB), nothing let go. The software renderer builds about a site a
  second, so in that time nothing is built past the haze (about 580 by day,
  let go 60 past it) or near the lower budget (16 of 64 MB held). With the
  haze forced to 150 (`?horizon=150`), the high tier let 131 tiles go (17
  MB) within seconds of walking, the picture near Degen as it was: the
  machinery works on every tier. **The saving comes on a real device**,
  which builds the whole city in a minute or two in the City view: on
  phones the same rule took geometry from about 185 to 113-127 MiB on the
  ground (the memory steps' figures), and a desktop should drop by about
  the same share. Not measured on a real desktop.

1. **Past the haze, every tier lets far tiles go on the ground** (built in
   3a; the same horizon, the same rules, `toVanish()` / `regain()`).
2. **The City view's far city as far forms only**: past the tier's `far`,
   tiles keep their always-drawn and far pieces and let near pieces go
   sooner. *The owner's call: how far the City view keeps the full city.*
3. **Lower near budgets** (built in 3a): high 96 to 64 MB, medium 64 to 48
   (`TIERS`). Pop-in to check on the owner's laptop.
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

## Phase 5: budgets that hold as the city grows (built, 2026-11-13)

The owner's picks: **on demand only** (a full city takes too long in CI to
run on every push); the ceilings **today's numbers and 10%**; the desktop's
render targets **held by a formula**; the leak check with it.

1. **The ceilings** (`MEMORY_CEILINGS` in `targets.ts`, MiB): the phone
   tier with the whole city built, in the City view (which keeps every
   tile): geometry **207**, textures **70**, render targets **10**. The high
   tier's render targets at 1440 x 900: **320** at a retina 2x, **193** at
   1x. Lower one when a phase cuts it, to keep the saving; raise one only on
   purpose, as `scripts/budget.mjs`'s are.
2. **`npm run memcheck`** (after a build and the texture bake;
   `scripts/memcheck.mjs`): a headless phone (390 x 844, touch) under
   `?bench` loads every district and builds the whole city, then holds what
   it holds (`__mem()`) to the ceilings. Red on any page error or NaN
   warning too. About 13 minutes to build the city here.
3. **The desktop by formula**: `pictureTargets()` / `pictureBytes()` in
   `targets.ts` list the render targets post.ts and sky.ts make, as
   `targetMemory()` counts them; `tests/targets.test.ts` holds them to Phase
   2's measured 291 and 175 MiB (within 3%) and under the desktop ceilings,
   on every `npm test`. memcheck holds the same formula to what the phone
   really holds (within 10%), so a change to post.ts or sky.ts it misses
   shows. A desktop building the whole city in the headless browser takes
   over an hour (about a site a second), too slow even on demand.
4. **The leak check**: `npm run memcheck -- soak` then spends `SOAK_MIN`
   minutes (20) half in the City view and half walking (W held, turning now
   and then), sampling memory, and is red if geometry or textures climb (the
   last third of a half over its first by 10% and 4 MiB) or pass a ceiling.
5. **The "Memory" Action** (`.github/workflows/memory.yml`): the same, on a
   CI machine, run by hand only (Actions, Memory, Run workflow; the leak
   check's minutes an input, 0 for none).
6. **Not built** (for later): a district's own budget (each
   `LAZY_DISTRICTS` entry stating what it may hold, a test building its
   sites in Node). The site worker builds sites without the DOM, but from
   the main thread's placed trees and lamps, so building them in a test is
   a piece of work of its own.

### What Phase 5 measured

The phone tier, the whole city built (4,562 sites), the City view, baked
textures: geometry **187.7**, textures **64.3**, render targets **9.0**
MiB (the quality step had lowered its pixels to 1x; the formula gave 9.0
for the same). On foot, past the haze, a phone holds less (about 113-127
MiB of geometry, the memory steps' figures).

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
  before anything else. **Phase 2 next** once it's confirmed.
- **Retina: SMAA above 1.75x pixels, MSAA below** (Phase 2.2).
- **Phase 5** (2026-11-13): on demand only; the ceilings today's numbers
  and 10%; the desktop's render targets by formula; the leak check too.
- **Phase 3** (2026-11-13): 3a first (the haze on every tier, the lower near
  budgets); the City view keeps everything (item 2 left out).

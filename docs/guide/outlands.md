# The Outlands

Part of the project guide (`CLAUDE.md` is its index). Keep it up to date
when what it describes changes. The plan, the owner's answers and the
phases are `docs/outlands-plan.md`.

## What it is

- **The owner's call (2026-11-13)**: an open-world survival game past
  Sector 7's wall, its own map (about 7.8 km across), reached from the
  hub, single-player first, permadeath in the zone only, XP only. Phase 0
  (the way in and the empty land) is built, waiting on the owner's
  sign-off; Phases 1-8 follow, one at a time.
- **Its own map, not the city's**: nothing of it reads the city's `EXT`,
  the wall or the street plan, and the city's world doesn't grow
  (`tests/snapshot.test.ts` is untouched). Its numbers are tiles, as the
  city's (about 1.8 m), centred on 0.
- **The owner's exception to "nothing attacks you"** is for the Outlands
  only, and only from the phases that bring the threats (the weather in
  Phase 4, the infected in Phase 6, other players in Phase 8). Sector 7
  itself never changes for it.

## The land (`outlands.ts`, DOM-free, tested in `tests/outlands.test.ts`)

- `CHUNKS` x `CHUNK` (17 x 256) is `SIZE`, 4,352 tiles; `HALF` either side
  of 0. Walking stops at `WALK_LIMIT` (`inBounds()`); past it the
  mountains rise to the edge.
- `heightAt(x, z)`: one seeded height map (`SEED`, `noise()`: a hash of
  the lattice, never `Math.random`): rolling hills (`hills()`, levelled
  off over the water so only the river and the lake are wet), the river's
  valley along `riverZ()` (`RIVER`: a shallow bed, waded anywhere, `WADE`),
  the lake's bowl (`LAKE`: too deep to walk), the mountains round the
  edge (the river running on out between them through a gorge). Nowhere
  walkable is steeper than 1 in 1 (the test holds it).
- `waterDepth()`, `walkable()` (in bounds and no deeper than `WADE`),
  `slopeAt()`; `SPAWN`, where a new run starts.
- Chunks: `chunkOf()`, `chunkX()`, `chunkDist()`, `chunksAround(x, z,
  tier)` (the chunks to draw round a point, nearest first, each at its
  level of detail), `LODS` (the grid's spacing and how far each level
  reaches: `high` for desktop, `low` for phones, coarser and shorter).
- **The save** (`outlands-save.ts`, DOM-free): its own key,
  `degen-city-outlands-v1` (`OUTLANDS_KEY`, in `BACKUP_KEYS`), apart from
  the city's game. `cleanOutlands()` reads anything into a safe save (a
  run off walkable land is dropped), `startRun()` carries the run on or
  starts one at the spawn, `keepRun()` keeps where he is.

## The view (`outlands3d.ts`, its own chunk)

- **The way in**: the hub's Map tab, `[data-outlands-open]` (in hub.ts's
  `OWN_SCREENS`), opens its card `[data-outlands-card]` (Go / Back),
  behind `live.closed('outlands')` (`LIVE_FEATURES`). Go fetches the chunk
  through `lazy()` (index.ts `enterOutlands()`), ends walk mode if on, and
  hands it the frame.
- **Switching worlds** (index.ts): `inOutlands` and `outlands`; `frame()`
  hands the Outlands its frame right after the frame's time is worked out
  and returns, so the city's scene is held as it is (not drawn, not
  ticked) until `leaveOutlands()`, which puts the City view back as it
  was. The keys go to `outlands.onKey()` while it shows; `resize()` sizes
  it too. `.city.in-outlands` and `body.is-outlands` (`outlands.css`) hide
  the city's own screens but its canvas, the toasts, the draft tag and
  the maintenance cover. Sound: only the wind and birds
  (`OUTLANDS_AMBIENCE`).
- **Its own scene and post chain**: `createOutlands()` makes its scene,
  camera, lights, haze and a post chain of its own (`createPost()` with
  the city's settings, `postOpts`, without its shadows) once, and keeps
  them, so trips there and back don't add up (`?fps` reads the
  geometries). The ink outlines fade out nearer than the city's (`INK`).
- **The land drawn**: `chunkGeometry()`: a chunk's height grid at its
  level's spacing, normals from the height map (one step past each edge,
  so neighbours shade and ink alike), colours per vertex from
  `OUTLANDS_COVER` (palette.ts) by height, slope and a seeded wash
  (`coverAt()`), a skirt round the edge hiding the cracks between levels.
  `stream()` builds what's wanted round Degen nearest first, `BUILD_MS` a
  frame (all of it on the way in), and lets go of what's out of reach;
  leaving lets go of it all. The water is one plane at `WATER_Y`.
- **Degen on foot**: his own small walker, not walk.ts (which is the
  city's): `stepMove()` (movesim.ts), `createLocomotion()` and the motion
  capture over it (`createAnimator()`, `loadMocap()`, as walk mode loads
  them), walk.ts's `JUMP` and `GRAVITY`, slower wading (`WADING`), each
  axis checked against `walkable()` so he slides along the edge and the
  lake's shore. Dressed as in the city (index.ts `outfitNow`, kept by the
  wardrobe's `setLook`).
- **Controls**: WASD / arrows, Shift to sprint, Space to jump, the mouse
  to look (a click holds it: `[data-ol-hint]` says so), Esc for the pause
  card (`[data-ol-pause]`: Resume, Back to Sector 7); touch: the left half
  a stick (`[data-ol-stick]`), the right half to look, a quick tap there
  to jump, the header's Menu (`[data-ol-menu]`) for the pause card; a
  gamepad: the sticks, A to jump, the left stick's click or RT to sprint,
  Start to pause (the d-pad and A on its card, B to resume).
- **The camera**: behind and over his shoulder (`CAM`), less over the
  shoulder and further back on a narrow screen, kept clear of the ground.
- **The save**: kept every `SAVE_EVERY` seconds and on leaving.
- `?fps` reads the Outlands' own lines while it shows: draws, triangles,
  geometries, the chunks drawn and built, the tier, where he is ("at x,
  z", which `npm run smoke`'s `outlands` scene reads).

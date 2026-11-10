# One size for everyone (the scale plan)

The owner's call (2026-11-10): the player's Degen is out of scale with the
city's people. He's drawn at 0.85 (`SCALE` in walk.ts), about 1.1 tiles
tall, and the crowd at 0.66 (`PERSON_SCALE` in life.ts), about 0.86 tiles,
so he stands about 29% taller than everyone else. The fix: **everyone at
0.66**, the crowd's size (the owner's pick).

Nothing changed yet: this is the plan, waiting on the owner's go.

## What the owner was told before picking

- **Quality doesn't drop.** Scaling only changes his transform: the same
  mesh and triangle count, the same detail level (set by device tier, not
  size), the same clothes, tailoring and motion capture. The ink outlines
  are a fixed pixel width, so a smaller figure reads a touch bolder-lined.
- **At 0.66 he's shorter than a hatchback's roof** (0.86 vs the City
  Hatch's 0.95 tiles; real people stand about 15% over one). The owner kept
  0.66 anyway.
- **Endswood's gallery doors** (`STOREY = 1` in endsblocks.ts, the doors
  painted about 0.8 tiles high) stay short even at 0.66. Left for now, the
  owner's call.

## The decisions

| Question | The owner's answer |
| --- | --- |
| Size | 0.66 for everyone (the crowd's) |
| Speed and jump | Natural for his size: scaled as real legs would |
| Endswood's doors | Leave them for now |

**Natural for his size** means the Froude rule (speed goes with the square
root of leg length; `froudeSpeed()` in human.ts already does it):

- k = 0.66 / 0.85 = 0.776, √k = 0.881
- Gaits (movesim.ts `GAITS`): walk 0.78 → 0.69, run 2.8 → 2.47, sprint
  4.2 → 3.70 tiles a second (about 12% slower across the city; the speeds
  were an earlier owner's call, "quick but believable", and this changes
  them)
- Jump (walk.ts `JUMP`, same gravity): 3.9 → 3.44, its height 0.66 → 0.51
  tiles, the same share of his height as now
- Vault and climb (vault.ts `OVER`): vault 0.75 → 0.58, climb 1.25 → 0.97,
  so a climb never reaches over his head. Fewer things are climbable as a
  result (the low things' real heights don't change)
- The slide (`SLIDE` in movesim.ts) and the crouch's speed follow the gaits

## Steps

1. **One constant.** `ADULT_SCALE` in one DOM-free file (skeleton.ts),
   imported everywhere the size lives today: walk.ts `SCALE`, remote.ts
   `SCALE` (other players), boat.ts `SCALE`, fight-figure.ts
   `FIGHTER_SCALE`, kartframe.ts and carinside.ts `DRIVER_SCALE`, human.ts
   `ADULT_SCALE`, anim-lab.ts `SCALE`, and life.ts `PERSON_SCALE`, so the
   player and the crowd can't drift apart again. Kids keep their own
   `KID` scale.
2. **What's in world units.** His collision radius (walk.ts `RADIUS` 0.22 →
   0.17); the walk camera's distance and shoulder offset (`homeZoom()`
   and the rest) by k, so he fills the same part of the screen; the gaits,
   jump, vault and slide above; the moments' heights in moments.ts (door
   handle, counter, bench, the car's handle and seat) checked so his
   hands still land on them.
3. **Seats re-fitted.** Car interiors (carinside.ts `INTERIORS`: seat
   height so his eyes clear the dash and the window line), the kart's
   pedals and wheel (kartframe.ts), the bikes' bars and pegs (bikes.ts,
   acts.ts `ridePose()`), the hire boat's helm (boat.ts), the aircraft's
   seat. The traffic's riders (life.ts `BIKE_K`) become 1:1.
4. **The rubric.** human.ts reads metres from `TILE_M` (1.8) and
   `ADULT_SCALE`: at 0.66 a figure reads 1.55 m. Its bands are checked and
   any row that now fails is looked at, not hidden.
5. **Checked.** `npm run typecheck`, `npm run lint`, `npm test` (carspec,
   kartframe, kartclip, bike, human, animator, moments, clothing, gunfit,
   vault among them), `npm run test:wide`; shots on the phone and desktop
   tiers at a door, beside the crowd, in a car, on the bike, in a kart and
   in the ring. CLAUDE.md updated (Degen's height, the gaits, the shared
   constant).

## Left for later

- Endswood's doors: repaint them taller in the wall atlas (nothing moves),
  or raise its `STOREY` (everything there moves: the owner's sign-off and
  a snapshot rewrite).
- Car roofs sit over everyone's heads at this size: the cars' scale is a
  separate question if the owner wants one.

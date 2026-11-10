# One size for everyone (the scale plan)

The owner's call (2026-11-10): the player's Degen is out of scale with the
city's people. He's drawn at 0.85 (`SCALE` in walk.ts), about 1.1 tiles
tall, and the crowd at 0.66 (`PERSON_SCALE` in life.ts), about 0.86 tiles,
so he stands about 29% taller than everyone else. The fix: **everyone at
0.66**, the crowd's size (the owner's pick).

**Built** (2026-11-10), waiting on the owner's sign-off. Along with it, the
owner's other call: bumping into things no longer slows or throws him
(contact.ts is looks only: no hitch, no stagger).

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
| Speed and jump | In proportion (the owner's second answer: "natural", the square root of the size, made the motion capture's legs read too fast for him, as the animator works in his own body lengths) |
| Kerbs | Smoothed in the animation, nothing in the world moves |
| The Fight Club's ring | Left at 0.85 for now (its rules are the game server's too) |
| Endswood's doors | Left for now |

## What was built

- **One size:** `FIGURE_SCALE` 0.66 in skeleton.ts, read by walk.ts,
  remote.ts, boat.ts, anim-lab.ts, kartframe.ts and carinside.ts
  (`DRIVER_SCALE`) and life.ts (`PERSON_SCALE`). Kids keep `KID`; the
  ring keeps `FIGHTER_SCALE` 0.85.
- **In proportion** (k = 0.66 / 0.85 = 0.776): the gaits 0.61 / 2.17 /
  3.26 (were 0.78 / 2.8 / 4.2), aiming 1.09, crouched 0.43, the stairs'
  0.35 / 1.24, the slide (movesim.ts `SLIDE`), the fists' block walk, the
  guns' moving cost (gunfeel.ts), the jump 3.03 and gravity 8.92 (as long
  in the air as before, as high for him), the landings (locomotion.ts
  `LAND_CROUCH` / `LAND_ROLL`), the vault's heights (`OVER`: a vault to
  0.58, a climb to 0.97), his radius 0.17, the walk camera (2.6 behind
  him, the shoulder and the peek), the moments (where he stands, the door's
  handle, the crate, the boat's grips, the aircraft's frame lower down,
  the approach's reach and a longer timeout for world-sized lifts).
- **The animator** in rig numbers where it had world ones (`AIR.kerb`,
  `drop`, `crouch`, `hard`; `STAIRS.fast`), so at any size it plays as it
  did at 0.85; stepping down a kerb, the hips keep their height and come
  down with the lift's ease (`groundY`, the kerbs being relatively taller
  for him now).
- **Seats:** the cars' seats raised where his eyes no longer cleared the
  window line (the van, the muscle car, the SUV, the Mud Buster), the
  coupe's and the supercar's backs a little more upright, the truck's and
  the rig's floors raised, the wheel's size with him; the kart's wheel and
  pedals in with him (the pedals in the footwell now, not under the nose);
  the bikes' seats lower, their bars and pegs nearer.
- **The rubric** (human.ts) keeps its adult at 0.85: he's measured at it,
  his world scaled up (the tests and the lab's Scorecard), since a figure
  scaled in proportion reads to the rule of the square root as a child.
- **Tests:** fixtures written for him at 0.85 scaled with him (contact,
  vault, moments, the slide and the stop, the old stadium footbridge's
  treads); the bike and kart tests' reaches in proportion.

## Left for later

- The Fight Club's ring at 0.66 (its rules: reach, knock-back, the ring's
  distances, shared with the game server).
- Endswood's doors: repaint them taller in the wall atlas (nothing moves),
  or raise its `STOREY` (everything there moves: the owner's sign-off and
  a snapshot rewrite).
- The city's counters, rails and car roofs were built round him at 0.85:
  they sit higher on him now.

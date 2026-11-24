# The house rebuilt: bigger, walked stairs, built to stand out (a plan)

The owner's call (2026-11-23): "Let's add another level of detail to the house. Make it 2 levels and with a working
stairs so the player can go upstairs. Currently it's crowded so make the floorspace of the house 33% larger. We need to
improve the level of detail in the house and spend time making it stand out as well built." Nothing is built until the
owner signs off a phase; keep this plan up to date.

What stands today: the house of `docs/compound-plan.md` fitted out by `docs/interior-plan.md` (complete): the ground
floor (`ROOM`, `FURNITURE`), upstairs (`UPSTAIRS`), the basement den (`BASEMENT`), the roof terrace (`TERRACE`), all
reached by fades (`HOME_PORTALS`: `home:up`, `home:down`, `home:cellar`, `home:cellarup`, `home:roof`,
`home:roofdown`); the house's body is `HOUSE` in `home.ts`, 9 by 6.5 against the plot's back wall. Its guide:
`docs/guide/endswood.md`.

This moves things that exist, on the owner's word: the house's walls and doors, and what stands round it in the
compound. Nothing outside the compound's wall moves (`tests/snapshot.test.ts` doesn't hold the house).

## The owner's answers (2026-11-23)

| Question | Answer |
| --- | --- |
| Which way the house grows | Both ways a bit: about 1.4 wider (east) and 1 deeper (north), its shape kept; what stands round it shifts about a metre |
| The stairs | A turned stair: up to a half landing, turn, up again; walnut treads, a black steel rail |
| The outside | A modern villa: dark stone at the base, pale render above, deep window reveals with black steel frames, timber soffits, a glass balcony off the bedroom, coping and downpipes |
| The den and the roof | Both kept, their steps walked too: no stair in the house is a fade |

## The numbers

- **The house**: 9 by 6.5 (58.5) to 10.4 by 7.5 (78: a third more), its back on the same line against the plot's back
  wall, its west wall where it is; it grows east (into the east lawn) and north (into the yard). The rooms grow with it
  (`ROOM`), the floors' heights don't change (`CEIL`, `UP_Y`, `UP_CEIL`, `BASE_Y`, `BASE_CEIL`).
- **Round it**: the front door stays in the middle of the front wall (so it moves about 0.7 east and 1 north), the
  side door on the east wall (1.4 east); the planters and bollards by the front door, the fountain and palms on the
  drive, the fire escape, the pool, loungers and cabana on the east lawn shift with it, each kept clear of the drive,
  the doors and every prompt (`tests/home.test.ts`). The roof terrace grows with the roof.

## Phases

1. **The bigger house.** *Signed off by the owner and live (2026-11-23)* (shots: `docs/house-shots/phase-1-*.webp`; draw
   calls 313 desktop, 198 phone, from 309 and 197; the snapshot test doesn't hold the house, so it wasn't rewritten).
   `HOUSE` 10.4 by 7.5; its shell, doors, windows (`houseWindows()`, `ROOM_WINDOWS`), curtains,
   roof and terrace with it; the compound's things round it moved to fit; every room re-laid in the bigger floors with
   space to breathe (`homerooms.ts`), the stair hall's place kept clear for Phase 2 (the fades stay until then);
   `npm test`, `npm run test:wide`, the smoke run; shots.
2. **The turned stair, walked.** *Signed off by the owner and live (2026-11-24).* In the stair hall in the front east
   corner (`STAIR` in `home.ts`, 1.9 by 2.4): the first flight up the east wall toward the front, the half landing
   across the front wall under the stair's own window (in the front, as it is outside: `houseWindows()`, the window
   east of the door now stops at the stair hall), the turn, the second flight back beside the first up to the landing;
   six risers a flight, walnut treads with a nosing over black risers, black steel stringers, a plastered spine between
   the flights with a handrail over it, a black balustrade on the room's side and round the well upstairs, a handrail
   on brackets up the east wall; under the second flight fluted walnut on the room's side, and the den's door under its
   high end (`home:cellar` stands there now). The ground under him rises with the treads (`stairY()`, through
   `homeFloorY()`, groundheight.ts's `home` layer), its rails stop him (`stairRails()`: the side always, the first
   flight's foot open only from the room's floor, the second's head only from the landing's, the spine), the camera's
   ceilings open over the well (`homeCamera()`). While he wakes and the street loads, its foot waits as the doors do
   (`STAIR_GATE`, `home:stairs`). `home:up` and `home:down` are gone. The roof's steps rise steep from the landing over
   the first flight to the hatch (`ROOF_STEPS`), still a fade till Phase 3. `tests/home.test.ts` walks it up and down;
   the smoke run walks it up (`hometerrace`) and down (`homestairs`). The shell's floor slab is open over the well too.
   Draw calls unchanged: 313 desktop, 198 phone. Shots: `docs/house-shots/phase-2-*.webp`.
3. **The den's and the roof's steps, walked.** *Built, waiting for the owner's sign-off.* The den's door under the
   second flight's high end stands open (its walnut leaf slid back into the wall, `DEN_STEPS.door`), and the den's
   steps go down under the stair as it turns (`DEN_STEPS`, `denY()` in `home.ts`): north under the second flight, the
   turn under the half landing, south under the first to the basement's floor at its foot, six risers a flight, walnut
   on black risers as the stair's, a handrail along the walls, the den's cyan down the last flight; plastered soffits
   under the stair over them, walled in the den's colour from its floor (the well's west side, the second flight's back,
   the spine). The room's floor and the basement's ceiling are open over the well, and so is the ground under the
   house (the plot's paving, south3d.ts `besideWell()`; its block's slab and the grass, world.ts `holesIn()` and
   `buildGround()`). The roof's steps are walked from the
   landing (`roofStepY()`): steep (nine risers), up over the first flight to a little platform at the roof's floor in
   the hatch (`ROOF_STEPS.top`), out west across a steel sill where the hatch's kerb is open (`HATCH_WAY`); the hatch
   reaches further south for headroom, the ceiling and the roof are open over it, a rail along the steps' open side.
   Where the flights stand over one another, his floor is the highest he's on or can step onto (`homeFloorY()`); the
   rails (`stairRails()`) and the terrace's walls (`roofWall()`, `HATCH_WALLS`) by his height; the camera's flights and
   spine solid (`homeCamera()`). `home:cellar`, `home:cellarup`, `home:roof`, `home:roofdown` are gone: the house's only
   fades are its doors out. `tests/home.test.ts` walks both ways down and up; the smoke run walks them (`homeden`,
   `hometerrace`). Draw calls unchanged: 313 desktop, 198 phone. Shots: `docs/house-shots/phase-3-*.webp`.
4. **The modern villa outside.** Dark stone at the base to the ground floor's sills, pale render over it; deep window
   reveals with black steel frames and stone sills; timber soffits under the roof's edge and a steel coping on the
   parapet; a glass balcony off the bedroom over the front door; downpipes, vents and a canopy over the front door;
   his mark lit by the door (no house number: no numbers on signs). Measured on the phone tier.
5. **The detail inside.** What a well-built house has: doors in frames with architraves and handles, cornices,
   skirting throughout, light switches and sockets, radiators under the windows, the kitchen's splashback and
   handles, the hall's mirror and console at the stair's foot, the stair's lights in the wall by the treads; the
   review shots by day and night, `?fps` and `?bench` on the phone tier before and after.

Each with the owner's sign-off.

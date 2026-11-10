# The civic quarter: City Hall, the police headquarters, the courthouse (the owner's call, 2026-11)

The first section of building out to the walls (`docs/buildout-plan.md`, the land
plan's first round): the seat of power in the North Ward. It's built in the
south end of Westlake Park, facing Uptown across the avenue. Built one phase at
a time, each with the owner's sign-off. Keep this plan up to date. Nothing here
is built yet.

## The owner's answers (2026-11-10)

| Question | Answer |
| --- | --- |
| Where is City Hall? | In Westlake Park, at its south end on the Mall (its central walk, x -140, Uptown's axis), facing a civic square across the avenue to Uptown's plaza and its gold cross: one line from City Hall to the cross. |
| The police headquarters and the courthouse | **Flanking City Hall**, one civic quarter round the square. |
| First section to build | **This one**: the civic quarter, close to town and small, within today's limits. |

## The site (measured)

- **The park's south edge** is `ZS` (z -9). The avenue between the park and
  Uptown (`EW_ROADS[0]`) runs along z -4.5, 3.7 either side. Its zebra on the
  axis (uptown.ts `AXIS_ZEBRAS`) is already there.
- **The line:** Uptown's walk-only lane carries the axis on south from z 0 to
  14.5, to the plaza's centre and the cross (plaza.ts `CENTRE`, -140, 30). So
  City Hall, the square, the zebra, the lane, the cross and the spire stand
  on one line.
- **The lake** is east of the Mall. Its west edge reaches x -124 at about
  z -58, and the lake loop path x -128.4:

  | z | -74 | -66 | -58 | -50 | -42 | -34 | -26 to -9 |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | The lake's west edge | none | -120.5 | -124 | -121 | -112.5 | -102.5 | none |
  | The loop path's west edge | -119.7 | -126.6 | -128.4 | -126.2 | -120.1 | -112.1 | none |

  West of x -128 is clear of the lake at every z, and south of z -30 is clear
  all the way across.
- **The west side:** exit 8's corner (westlake.ts `EXIT_NOTCH`) comes in to
  x -175.6 at the park's edge, and the south-west gate is at x -163.6.
- **The formal garden** (`GARDEN_SITE`) starts at z -86, north of all of this,
  and stays as it is.
- **What stands there today** (x -202 to -95, z -95 to -9): about 77 trees,
  27 lamps, 19 of the Mall's flower beds, the south stretch of the ring walk,
  the Mall's south end with its gate, the meadow path, the south-west gate's
  path, the way down to the lake's south gate, and the lake loop's west side.
  These are the park's own. The lake, its loop and the garden stay; what's in
  the square's way moves, the owner's call.

## A first layout (to settle in Phase 1)

In world numbers, x across and z north to south.

- **The civic square:** about x -160 to -120, z -10 to -38, open to the avenue
  all along its south side, the axis through its middle. The Mall's flower
  beds and its avenue of trees are carried on as the square's edges.
- **City Hall:** on the axis at the square's north side, about z -38 to -64.
  It can be about 26 across (x -153 to -127) with the lake loop's west curve
  nudged a few tiles east round its back corner (the lake itself untouched),
  or about 18 across as things are. The Mall carries on north from behind it
  to the garden and the north gate.
- **The police headquarters:** west of the square, about x -175 to -162, z -12
  to -50, its vehicle gate onto the avenue, patrol cars in its yard.
- **The courthouse:** east of the square, south of the lake, about x -118 to
  -102, z -12 to -28: steps up to a portico facing the square.
- **Walking, the camera and traffic:** the square is walked on as paving. The
  three buildings are solid. The police's patrol cars come and go by the
  avenue.

## Phases

### Phase 1: the land, the square and the paths

- A DOM-free `civic.ts`, tested:
  - the square, the three buildings' lots, their solids;
  - the park's paths re-laid round them (westlake.ts `PATHS`: the Mall's south
    stretch, the ring walk, the meadow path, the south-west gate's path; the
    lake loop's west curve, if City Hall takes the wider width);
  - the trees, lamps, beds and benches moved or taken out;
  - the gates.
- The square drawn: stone paving, the beds and trees along its edges, lamps,
  benches, the axis inlaid.
- The tests:
  - nothing on the lake;
  - every path still joins up;
  - the zebra and Uptown's lane in line with City Hall's door;
  - the snapshot, rewritten only for what the owner moved.

### Phase 2: City Hall

- Its exterior, a place: spot, pin, directory entry, panel saying coming soon,
  Walk in, its door's prompt, `PLACES` and `LIVE_PLACES` entries, a live line.
- Drawn as a site, the far form, lit at night.

### Phase 3: the police headquarters and the courthouse

- Their exteriors, and the police's yard with its cars (the traffic's Patrol
  car, parked).
- Places, or scenery with signs: the owner's question below.

### Phase 4: life, night and sound

- **People:** officials on the steps, a queue at City Hall's door, people
  crossing the square, guards at the doors.
- **Night:** the buildings floodlit, the square's lamps lit.
- **Sound:** the square's own (footsteps, a fountain or the flags in the wind,
  a bell on the hour).
- **Nothing threatening**, as everywhere in the city.

### Phase 5: polish

- `?bench` and review views, phones, the plan done.

## Open questions for the owner

1. **City Hall's size:**
   - A) About 26 across, the lake loop's path nudged a few tiles round its back
     corner, the lake untouched (my pick).
   - B) About 18 across, nothing else moves.
   - C) Bigger still, the lake's west end reshaped.
2. **Its height:**
   - A) A tower or dome over the Emporium, seen across the city: the seat of
     power (my pick: the owner's exception, like Uptown's).
   - B) Under the Emporium, as everywhere outside Uptown.
3. **Its style:**
   - A) Stern stripped classicism: pale stone, square columns, wide steps,
     long banners, a made-up emblem (my pick: the dystopia's own).
   - B) Brutalist concrete, as Endswood's.
   - C) A grand dome with columns, in the old civic style.
4. **The police headquarters and the courthouse:**
   - A) Places with pins and panels, coming soon (my pick).
   - B) Scenery with signs only, for now.
5. **The names** (made-up only):
   - A) Plain: Sector 7 City Hall, Sector 7 Police, the Sector 7 Courthouse.
   - B) The regime's own names (to pick together).

# The civic quarter: City Hall, the police headquarters, the courthouse (the owner's call, 2026-11)

The first section of building out to the walls (`docs/buildout-plan.md`, the land
plan's first round): the seat of power in the North Ward. It's built in the
south end of Westlake Park, facing Uptown across the avenue. Built one phase at
a time, each with the owner's sign-off. Keep this plan up to date. Phase 1 (the
land, the square and the walks) is built, waiting on the owner's sign-off.

## The owner's answers (2026-11-10)

| Question | Answer |
| --- | --- |
| Where is City Hall? | In Westlake Park, at its south end on the Mall (its central walk, x -140, Uptown's axis), facing a civic square across the avenue to Uptown's plaza and its gold cross: one line from City Hall to the cross. |
| The police headquarters and the courthouse | **Flanking City Hall**, one civic quarter round the square. |
| First section to build | **This one**: the civic quarter, close to town and small, within today's limits. |
| City Hall's size (the second round) | **About 26 across**, the lake untouched. It came out at 24 across its front range with a 16-wide block behind on the axis, so the lake loop didn't have to move at all. |
| Its height | **Over the Emporium**: a tower or dome seen across the city, the seat of power (the owner's exception, like Uptown's). |
| Its style | **Stern stripped classicism**: pale stone, square columns, wide steps, long banners, a made-up emblem. |
| The police headquarters and the courthouse | **Places** with pins and panels, coming soon. |
| The names | **Plain**: Sector 7 City Hall, Sector 7 Police, the Sector 7 Courthouse (made up; the regime's own names can come with the storyline). |

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

## The layout (settled in Phase 1, `civic.ts`)

In world numbers, x across and z north to south.

- **The civic square** (`SQUARE`): x -156 to -124, z -36 to the park's edge
  (-9), open to the avenue all along its south side (the Mall's south gate
  went, and the park's low wall stops either side). The ring walk crosses it
  at z -15 as paving.
- **City Hall** (`HALL`): on the axis at the square's head, a front range 24
  across (x -152 to -128, z -44 to -36) and a block 16 across behind it
  (x -148 to -132, z -62 to -44), clear of the lake loop's west curve. Its
  front door is on the axis at the square, its back door onto the Mall.
- **The police headquarters** (`POLICE`): west of the square, x -167 to -158,
  z -36 to -18, its front to the square. The ring walk runs past its back and
  its south side, so its yard and a vehicle way out come with Phase 3.
- **The courthouse** (`COURT`): east of the square, x -122 to -113, z -30 to
  -18, its front to the square, the lake loop behind it.
- **The walks:**
  - the Mall starts at City Hall's back door;
  - the west walk (`civic-w`) runs from the square's north-west corner up
    City Hall's west side and round behind it to the Mall at z -66;
  - the way to the lake (`mall-lake`) moved there too, straight across to
    the loop;
  - the east walk (`civic-e`) runs from the square's north-east corner to the
    loop.

  They're paved and kerbed like the main walks.
- **Walking, the camera and traffic:** the square is walked on as paving. The
  three buildings will be solid (their phases).

## Phases

### Phase 1: the land, the square and the paths (built)

- A DOM-free `civic.ts`, tested in `tests/civic.test.ts`:
  - the square, the three buildings' lots, their solids;
  - the park's paths re-laid round them (westlake.ts `PATHS`: the Mall's south
    stretch, the ring walk, the meadow path, the south-west gate's path; the
    lake loop's west curve, if City Hall takes the wider width);
  - the trees, lamps, beds and benches moved or taken out;
  - the gates.
- The square drawn (`civic3d.ts`, in Westlake Park's chunk):
  - Uptown's granite over the whole square (plaza3d.ts), so the axis reads as
    one walk from City Hall's door to the plaza's cross;
  - the axis inlaid down its middle in a darker stone, and a border of it
    round its three park sides;
  - a pale ring round its middle, level with the flanking lots;
  - six trees in grates and six lamps along its edges (at the boot, with the
    park's), and four benches facing the axis.
- What moved for it:
  - 31 of the park's 260 trees, 3 of its 68 lamps (net: the walks round City
    Hall have lamps of their own), 6 of its 21 benches and the Mall's beds
    south of City Hall;
  - the Mall's south gate (its WESTLAKE PARK board went to the north gate);
  - the two edge-row trees across the square's mouth.

  The lake, its loop, the garden and every other path are as they were.
- The tests:
  - nothing on the lake;
  - every path still joins up;
  - the zebra and Uptown's lane in line with City Hall's door;
  - the snapshot, rewritten only for what the owner moved (the Mall's south gate).

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

## The second round's questions (answered: all the first options)

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

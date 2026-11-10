# The civic quarter: City Hall, the police headquarters, the courthouse (the owner's call, 2026-11)

The first section of building out to the walls (`docs/buildout-plan.md`, the land
plan's first round): the seat of power in the North Ward. It's built in the
south end of Westlake Park, facing Uptown across the avenue. Built one phase at
a time, each with the owner's sign-off. Keep this plan up to date. Phase 1 (the
land, the square and the walks), Phase 2 (City Hall) and Phase 3 (the police
headquarters and the courthouse) are built, waiting on the owner's sign-off.

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

### Phase 2: City Hall (built)

The owner's picks for its look (2026-11-10, all the suggestions):

| Question | Answer |
| --- | --- |
| What rises over it | **A stepped tower** over the back block, seen across the city. |
| How tall | **About 22**: the crown's roof at 22.4, its gold finial at 23.3. Well over the Emporium (12.5), under Uptown's tallest, every flight well over it (the test). |
| Its emblem | **A seven-pointed star** for Sector 7 (made up), over the door and on the banners. |
| Its front | **A colonnade** of square columns, wide steps down to the square, long banners. |

The numbers are `civic.ts`; it's drawn by `cityhall3d.ts` as two sites in
Westlake Park's chunk.

- **The steps:** six of them across 22, up from the square's head to the
  podium at 0.9 over the ground (`STEPS`, `PODIUM_Y`). They're walked as a
  gentle slope, `cityHallY()`, a layer in groundheight.ts.
- **The cheeks:** either side of the steps, each with a bronze torchère.
- **The portico** (`PORTICO`), on the podium:
  - eight square columns 0.9 across (`COLUMNS`), with bases and slab
    capitals, between the antae;
  - a plain entablature with SECTOR 7 · CITY HALL carved on its frieze
    (`FRIEZE_H`);
  - the attic over it, with the emblem in a gold ring (`STAR`).
- **The front range's wall** behind the colonnade: the bronze door on the axis
  (`DOOR`) with a lit transom, and six long crimson banners with the gold star
  (`BANNER`, `BANNER_XS`).
- **The front range and the back block** (`FRONT_RANGE`, `HALL.back`): pale
  stone over a darker base, tall windows with sills and lintels, dark by day
  and warm at night, and cornices.
- **The tower** (`TIERS`, `TOWER_C`) over the back block, four tiers stepping
  in:
  - stone piers on every face, with slit windows between;
  - a gold star lit softly at night on each face of the second tier;
  - the lantern's glazing on the crown, a cap and a gold finial
    (`CITYHALL_TOP`, `CITYHALL_TIP`).
- **What's solid** (`CITYHALL_SOLIDS`, in `SOLIDS`): the front range, the
  back block, the tiers, the columns, the antae and the cheeks. The steps and
  the portico are walked on, with room to pass between the columns (the test).
- **The place:** spot `cityhall`:
  - its pick boxes at the boot (crestspots.ts `spot()`, `CITYHALL_PICK`,
    `CITYHALL_LAND`), the pin over its tower, the fly-in from the square;
  - a directory entry;
  - its panel (`data-panel-tpl="cityhall"`, marquee "The city keeps its
    records", coming soon), with Walk in (`data-civic-walkin`) to
    `CITYHALL_SPAWN` at the steps' foot;
  - its door's prompt on the portico (`CITYHALL_DOOR`, walk.ts `ALL_DOORS`);
  - `PLACES` and `LIVE_PLACES` entries;
  - a live line: the doors open on weekdays, and the council sits on Thursday
    evenings;
  - its footprint on the world map, with the square's paving.

### Phase 3: the police headquarters and the courthouse (built)

The owner's picks (2026-11-10, all the suggestions):

| Question | Answer |
| --- | --- |
| Their look | **City Hall's pale stone, plainer and lower**, so the three read as one quarter. |
| The police yard | **A walled yard** with the patrol cars and a gate. |
| The courthouse front | **A four-column portico** with steps, facing the square. |

The numbers are `civic.ts`, drawn by `flank3d.ts` as two sites in Westlake
Park's chunk.

- **Making room for the yard:** the yard couldn't go behind the headquarters
  (west), where the ring walk runs. So the police lot (`POLICE`) grew north
  instead, and the building moved up it:
  - the building (`POLICE_HQ`) is on the north part, alongside City Hall's
    front range;
  - the walled yard (`POLICE_YARD`) is south of it, towards the avenue;
  - the yard's gate (`YARD_GATE`) opens onto the ring walk by the park's
    south-west gate.

  The ring walk didn't move.
- **Sector 7 Police** (`HQ`):
  - a three-storey block, 8.4 high, over a darker base;
  - rows of tall windows, lit at night, a string course and a cornice;
  - its entrance on the east face, onto the west walk at the square's
    north-west corner: a bronze door, a canopy, SECTOR 7 POLICE carved over
    it and the blue lamp;
  - a radio mast with a red light on the roof.
- **The yard:**
  - a stone wall with a coping, 1.8 high (`YARD_WALL`);
  - asphalt marked out in bays;
  - four Patrol cars nosed up to the building (`YARD_CARS`, the traffic's
    model, parked through `parkedCars()`);
  - lamps on the gate's posts.
- **The Sector 7 Courthouse:**
  - four steps up from the square (`COURT_STEPS`; the lot reaches the
    square's edge) between cheeks with torchères;
  - a portico (`COURT_PORTICO`) of four square columns between antae
    (`COURT_COLUMNS`);
  - SECTOR 7 COURTHOUSE on its frieze, and a low pediment with the gold star
    (`PEDIMENT_H`);
  - the body behind (`COURT_BODY`), its windows lit at night, with a bronze
    door and two tall windows on the portico wall.

  Its top is 8.0 (`COURT_TOP`).
- **Walking:** both stay under the Emporium and lower than City Hall. The
  courthouse's steps and portico are walked as City Hall's are: `civicY()`,
  the groundheight.ts layer now `civic`. What's solid is `FLANK_SOLIDS` (in
  `SOLIDS`): the buildings, the yard's walls with the gate open, the cars,
  the columns, the antae and the cheeks.
- **The places:**
  - spots `police` and `courthouse`, their pick boxes at the boot
    (`POLICE_PICK`, `COURT_PICK`);
  - pins, directory entries and panels, all coming soon, with Walk in
    (`data-civic-walkin`, `POLICE_SPAWN` on the west walk,
    `COURTHOUSE_SPAWN` at the steps' foot);
  - doors (`POLICE_DOOR`, `COURT_DOOR` in walk.ts `ALL_DOORS`);
  - `PLACES` and `LIVE_PLACES` entries;
  - live lines: the front desk and the night shift, the court in session on
    weekdays;
  - their footprints on the world map.

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

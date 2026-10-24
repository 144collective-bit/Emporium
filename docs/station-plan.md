# The grand train station (the owner's call, planned)

The owner asked for "a train station west of the city ... grand and
large", to be built after Uptown's Phase 7 (the owner's call: Uptown
first). Keep this plan up to date; build it one step at a time with the
owner's sign-off.

## The owner's decisions

- **Style:** modern glass: a huge glass-and-steel hall with a sweeping
  curved roof, like a modern central station.
- **Where:** the north bank, just outside the ring highway west of Uptown
  and Westlake Park, its tracks running west to the world's edge.
- **Inside:** the main hall is walkable: a departures board (made-up
  places), a ticket hall, kiosks and cafés, benches, a clock, crowds, and
  out onto the platforms.
- **Trains:** long-distance trains on a timetable, and you can ride them:
  a new line from the grand station round the outside of the city to a
  smaller second station on the far side (a minute or so, like the metro).
- **Links:** the metro to it (carried on from Uptown station), a grand
  forecourt (fountains, a taxi rank, bus bays, a drop-off loop, a car park;
  traffic drives it), a tree-lined boulevard from Uptown out to its front,
  and its own junction and slip lanes off the ring highway.
- **Scale:** huge: a train shed about 140 tiles long over 8-10 platforms,
  the hall the size of a city block, seen from across town.

Content: made-up names only (the station's, the line's, the places on the
board); no real railway, operator or brand.

## Where it goes, exactly

North of the park's avenue (ew0, the avenue between Uptown and Westlake
Park) and west of the ring highway, on open land: x about -404 to -224,
z about -100 to -8. A terminus, its head house facing east towards the
highway and Uptown, its tracks running west to the world's edge.

- **The head house** (the hall): a block-sized glass-and-steel hall
  (about 30 deep and 52 wide) with a sweeping curved roof, its front on
  the forecourt; inside, the concourse at platform level (a ramp up from
  the doors), the departures board over the platforms' gates, the ticket
  hall, kiosks and cafés, benches, the clock, people.
- **The train shed:** about 120 long over ten tracks and five island
  platforms (numbered 1-10), a glazed roof on steel arches; the tracks
  run on west out of it to the world's edge.
- **The forecourt:** a one-way drop-off loop off the avenue (traffic
  drives it), a plaza with fountains inside it, the taxi rank and bus
  bays along it, a car park north of it.
- **The boulevard:** the park's avenue from Uptown across the highway to
  the forecourt, tree-lined with a planted median; the highway's junction
  there gets slip lanes on its outer corners (the station's own).
- **Height:** the hall's roof and the shed stay under the Emporium (the
  rule outside Uptown); taller is the owner's call.

## Steps (each with the owner's sign-off)

1. **The station and its grounds:** the hall (walkable, its concourse,
   board, ticket hall, kiosks, cafés, benches, clock, people), the shed,
   the platforms (walkable) and tracks, the forecourt and its loop, the
   taxi rank, bus bays, car park, the boulevard and the junction's slip
   lanes; a place (pin, panel, Walk in), on the world map. Scenery and
   trains still to come.
2. **The trains:** long-distance trains on a timetable from the clock
   (made-up line and names), coming in from the world's edge to the
   platforms, standing, and leaving again; the departures board showing
   them; their sound.
3. **The line round the city and the second station:** a line out of the
   station's throat round the outside of the city (its route the owner's
   to confirm) to a smaller station on the far side; rides on it (about a
   minute), its stations as places.
4. **The metro:** carried on from Uptown station to the grand station.

## As built

**Step 1 (built, waiting on the owner's sign-off):**

- **Its data** is `station.ts` (DOM-free, tested in `tests/station.test.ts`).
- **The hall** (`HALL`, 28 x 50, crown 11.6) faces east onto the forecourt's loop.
  - Its front is one arched glass gable with three doors (`DOORS`), and SECTOR 7 CENTRAL sits over the middle one.
  - Its vault runs out 2.2 over the pavement.
  - Inside, the concourse (`CONCOURSE`) is at the platforms' height (`PLAT_Y`, 0.6), up a ramp from the doors (`RAMP`).
  - Under the hanging four-faced clock (`CLOCK`, on the visitor's time) are the departures board (`BOARD`), the ticket counter (`COUNTERS`), four kiosks and the café (`SHOPS`, `CAFE_TABLES`), benches back to back (`BENCHES`) and pendant lights.
  - The board shows the ten platforms and made-up places (`DESTINATIONS`) with ON TIME or BOARDING. It shows no times.
- **The shed** (`SHED`, 120 long behind the hall) has a glazed vault on steel arches every 8 (`ARCHES`) and glazed sides, plus a glass lunette over its west end.
  - It holds five island platforms (`ISLANDS`) between ten tracks (`TRACKS`, numbered 1 to 10 from the south), with numbered signs hanging over them.
  - The buffers are at the hall (`BUFFERS_X`). The tracks run on west to the world's edge.
  - Walking (`stationY()` in walk.ts's `groundAt()`): the concourse and the platforms are floor. The track beds, the platforms' far ends, the walls and everything standing are solid (`STATION_SOLIDS`).
- **The forecourt:**
  - The two-way loop (`LOOP`, street `station-loop`, traffic drives it) has its zebras to the doors.
  - The plaza (`PLAZA`) has two fountains, benches and trees in grates.
  - The taxi rank (`RANK`) has three cabs waiting, and the bus bays (`BUS_BAYS`) have their shelters.
  - The car park (`CAR_PARK`) is north of the loop, about two bays in three taken.
- **The boulevard and the junction:** trees along the avenue's south side from the highway out past the station (`BOULEVARD_TREES`) and lamps along it and round the loop. The highway's junction with the avenue has slip lanes on its outer corners too.
- **Drawing:**
  - `station3d.ts` is a district loaded as you approach (`LAZY_DISTRICTS` id `station`), made of sites, with the clock's hands and the cars on the main thread.
  - The place is `stationspot.ts` (spot `station`: its pin, panel, Walk in to `STATION_SPAWN`, directory entry, a `PLACES` and `LIVE_PLACES` entry).
- Everything stands under the Emporium (`TALLEST`).

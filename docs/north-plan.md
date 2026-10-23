# The north side (the owner's call)

The owner wants the stadium and the kart park further north, past the ring
highway, and Westlake Park's paths improved with kerbs, low walls and
gardens. Built in stages, each a PR for the owner's sign-off.

## The owner's answers

- **Where:** north of the ring highway, onto the open land past its north
  side, each roughly north of where it was.
- **Getting there:** the north roads (the arterials past the highway turned
  into real streets with traffic and lamps), slip lanes at the highway, and
  a footbridge from Westlake Park's Mall over the highway to the stadium.
- **The land left behind:** the stadium's old site becomes park (the formal
  garden at the end of the Mall); the kart park's old land goes back to open
  land, kept clear for a district later.
- **The kart park:** the same circuit (lap records, ghosts and boards stay
  valid), with a much better facility round it: proper trackside (tyre
  walls, barriers, catch fencing, gravel traps, marshal posts, a timing
  tower), spectator areas (a bigger covered grandstand, grass banks, a
  viewing terrace), a paddock and entrance (a gate arch with its name, a
  ticket kiosk, team tents, karts on stands, a car park) and night lighting
  (floodlight towers, lit signs). The metro's line is extended north over
  the highway to a new Kart Park station.
- **The stadium's car park:** beside the stadium; the old one on the first
  strip goes back to park.
- **The park:** the main walks (the Mall, the lake loop, the ring walk)
  paved with raised stone kerbs, the small paths gravel with a flush stone
  edge; the formal garden by the Mall (low hedges, flower beds, low stone
  walls, benches); flower beds in low stone-walled planters along the main
  walks and at their junctions; a low stone wall round the park's edge,
  broken at the gates; lakeside terraces stepping down to the water.

## Stages

1. **The stadium moves north** (built): `stadium.ts`, `stadium3d.ts`,
   `stadiumgrounds3d.ts`. Its own block north of the highway in line with
   the Mall (`BLOCK`, `CENTRE`); Stadium Road west off the north road (ns0)
   past its front, the car park in a one-way loop off it (`ROAD`, `LOOP`,
   `CAR_PARK`, `STADIUM_STREETS`, `STADIUM_CROSSINGS`), traffic on them
   from the highway, whose junction with ns0 gets slip lanes on its outer
   corners too (`OUTER_SLIPS`); the footbridge from the Mall up over the
   ring walk, the park's edge, the highway and the road down to the
   forecourt, walkable (`BRIDGE`, `bridgeY()`, `bridgeWall()`); lamps along
   the road and round the loop; the outskirts' trees off it all. Its
   grounds load with the park's chunk as you approach (`LAZY_DISTRICTS`).
   The boot's code had no room left for it: the benchmark (`?bench`), Drop
   001's fitting room and the world map are chunks loaded when first used
   now, which made the room (638.5 of 640 KB with main's animation rebuild).
   Stage 2 should load the kart park's drawing, race and menus as you
   approach (it moves out of town), which frees much more. The old
   site is kept clear (`GARDEN_SITE`) with the Mall running on through it
   to the footbridge (`BRIDGE_FOOT`); the old car park went back to park.
2. **The kart park moves north and grows up:** the same circuit on new
   ground north of the highway, its trackside, stands, paddock, entrance,
   car park and lights; its north road, slip lanes and the metro extended
   to a new station; its old land left open.
3. **The park:** paved main walks with stone kerbs, edged gravel paths,
   the formal garden on the stadium's old site, flower beds, the low wall
   round the park, the lakeside terraces.

# The golf course: 18 holes in the north-east corner (a plan)

The owner's call (2026-11-21): "delete the old club and let's build a new functional golf course. We will need to make
elevation changes and hills. Make bunkers, fairways, greens, rough, and once this is built we will make a golf game
dynamic so we can play actual golf on the course. Can you help plan its design first, then later we make it a game in
the game."

A full 18-hole course on the open land in the north-east corner, past Crestmont's hills, with its own hills and
hollows, lakes, bunkers, fairways, greens and rough. Scenery first, then a place, then the golf game on it. Crestmont's
six-hole Hills Club is retired when the new clubhouse opens (Phase 4).

Nothing is built until the owner signs off a phase; keep this plan up to date. The design maps are in
`docs/golf-shots/` (`npm run golfmap -- <label>` draws one from the data).

## The owner's answers (2026-11-21)

| Question | Answer |
| --- | --- |
| Where | The north-east: the open land past Crestmont's hills (the owner's screenshot, 2026-11-21) |
| The old club | Delete Crestmont Hills Club (its six holes on the hills) and build the new course instead |
| How big | 18 holes |
| Playable? | Scenery first (the course, clubhouse, carts and golfers as a place); the golf game later, its own phase |
| The ground | Elevation changes and hills, made for the course |
| What's on it | Bunkers, fairways, greens, rough (and the water, the tees, the fringe and first cut with them) |
| Start | Plan and Phase 1 now |

## The land

The open corner (the data map, `npm run golfmap`): an L of open land and pine woods between Northgate Air Base's east
fence (x 258 to 276), the wall (x 800, z -760), Crestmont's hills (x 285 to 490, z -450 to -75) and the country road
east (`ew0-e`, z -4.5). Nothing stands there today; the air base plan keeps it as "open land and woods" (its Phase 1).

- **The north arm:** x 304 to 776, z -736 to -458, across the top of the hills, the air base's fence to its west.
- **The east arm:** x 512 to 776, z -458 to -36, down the east side of Crestmont to the country road.
- **The clubhouse** where the arms meet (about x 500 to 572, z -520 to -470), on a low rise, reached by its own drive
  (Clubhouse Drive) up from the country road along the hills' east foot (x about 500).
- The club's edge wanders (no ruler-straight edge): 18 or more from the air base's fence and the wall, clear of the
  hills' land, every street and every keep (`tests/golf.test.ts`).

## The design (Phase 1's map: `docs/golf-shots/phase-1-layout.png`)

The holes are about half real length (the city's scale: a tile is about 1.8 m): par 3s 80 to 115, par 4s 145 to 185,
par 5s 210 to 260. Par 72, 2,772 tiles (about 5 km at the city's scale). Each nine goes out from the clubhouse and
comes home to it.

| Hole | Name | Par | Length | Tee to green (tiles) | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | First Light | 4 | 147 | -0.4 | West off the clubhouse's rise along the hills' top, a gentle dogleg |
| 2 | Fence Line | 4 | 160 | +4.2 | North up the air base side, climbing to a green cut into Beacon Hill |
| 3 | Long Wall | 5 | 211 | -4.9 | Off Beacon Hill east along the wall, a double dogleg |
| 4 | The Climb | 4 | 149 | +5.5 | Up the Knob's shoulder to a high green in the corner |
| 5 | Knob Drop | 3 | 83 | -10.1 | The signature hole: from the Knob's top down to a green guarded by three bunkers |
| 6 | Mid Run | 5 | 236 | -1.0 | West the length of the arm below the middle swell |
| 7 | Fen Turn | 4 | 161 | 0 | Past Fen Pond, a dogleg right along the west swell |
| 8 | The Pond | 3 | 85 | -1.1 | Over the Pond to a green with a bunker behind |
| 9 | Homeward | 4 | 153 | +0.4 | Back down to the clubhouse, a dogleg left |
| 10 | Hillside | 4 | 160 | -0.5 | South off the rise along the hills' east foot |
| 11 | Heron | 3 | 86 | +0.9 | Along Heron Lake |
| 12 | Country Mile | 5 | 218 | -0.1 | South then a sharp dogleg east along the country road |
| 13 | East Wall | 4 | 160 | +0.8 | North up the wall's side |
| 14 | Long Watch | 4 | 162 | -1.3 | On north under the east bank |
| 15 | The Spine | 5 | 213 | -1.1 | South down the Spine's east flank past Clubhouse Lake |
| 16 | Reed Carry | 3 | 84 | -0.4 | Across the Hollow by Reed Water |
| 17 | The Hollow | 4 | 150 | +0.4 | North up the Spine's west flank past Heron Lake |
| 18 | Clubhouse | 4 | 152 | +0.6 | North, a dogleg left up to the clubhouse past Clubhouse Lake |

- **The ground** (`golfground.ts`): the Knob (13 tiles, about 23 m, in the north-east corner), Beacon Hill (8, the
  north-west), the Spine (a long ridge down the east arm between 15 and 17), the middle swell, the west swell, the east
  and south banks, the clubhouse's rise, the Hollow and a hollow under each lake; low waves over all of it; today's
  ground (0) at the club's edge. The course stands from 2.8 under (the lake beds) to 13.6 over.
- **The holes on it:** each fairway held to its line, smoothed along it and no steeper than 9% (`GRADE`), keeping a
  quarter of its hillside's fall across it; a par 3's carry the land as it lies. The tees level (raised a little, the
  Knob's cut and filled evenly), the greens planes tilted 1.8% up to the back, their fronts meeting their approaches.
- **The hazards:** 50 bunkers (greenside pairs, fairway bunkers biting the fairways' edges at the landing zones, a pot
  behind 5 and 8), dug half a tile in; five lakes (Fen Pond, the Pond, Heron Lake, Reed Water, Clubhouse Lake), each
  held under its lowest shore.
- **What's underfoot** (`surfaceAt()`): water, bunker, green, fringe, tee, fairway, first cut, rough, native grass (past
  34 from any hole's line: the woods' land), the grounds: the lie the golf game reads.

## The phases

### Phase 1: the layout and the ground, as data (built)

**What's built:**

- `golf.ts` (DOM-free, on `DOM_FREE`, tested in `tests/golf.test.ts`): `COURSE` (the club's land, `wander()` round
  `COURSE_BASE`), `inCourse()`, `insetOf()`; `HOLES` (each hole's line, par, fairway, tee's raise, green, bunkers in its
  own frame), `along()`, `framePt()`, `nearestOn()`, `fairwayHalf()` / `fairwayIn()`, `teeOf()`, `greenOf()`,
  `onGreen()`, `onTee()`, `bunkersOf()`; `LAKES`, `lakeAt()`, `inLake()`; `CLUB_GROUNDS`, `CLUB_CENTRE`, `DRIVE`;
  `surfaceAt()`; `holesApart()`.
- `golfground.ts` (DOM-free, on `DOM_FREE`, tested in `tests/golfground.test.ts`): `FEATURES`, `landAt()`, `lineAt()`,
  `teeLevel()`, `greenLevel()`, `groundsLevel()`, `lakeWater()`, `golfHeightAt()`.
- `scripts/golfmap.mjs` (`npm run golfmap -- <label>`): the design map from the data, to `docs/golf-shots/`.
- Not in the city yet: nothing drawn, walked or driven on changes. The snapshot is untouched.

### Phase 2: the ground in the city

- The course's ground under the city's: `golfHeightAt()` read off a grid (as `southLift()`), in terrain.ts's
  `heightAt()`, `onHills()` and `hillsAlong()`, so walking, driving, flying and the camera follow it; world.ts draws its
  grass on a grid (as the hills), lakes below 0 included.
- What's underfoot painted from `surfaceAt()`: new covers in `palette.ts` (fairway, green, tee, first cut, rough, native
  grass, bunker sand), a mown stripe on the fairways and greens, the lakes' water (the reservoir's shader).
- The land in `KEEPS` (with `since`), so the outskirts' trees and the rolls keep off; its ground in `INFLUENCES`; its
  edge in `BY_CHARACTER`. Measured with `?fps` and `?bench` before and after; checked on the phone tier.

### Phase 3: the drive, the paths and the woods

- Clubhouse Drive a street (its junction on `ew0-e`, its bed up the clubhouse's rise), a sodium lamp or two.
- Cart paths from each green to the next tee, over the water on little bridges; a footpath on from the clubhouse to
  the country road's loop and to Crestmont's Ridge Road (nowhere a dead end on foot).
- The woods between the holes (pines and oaks, from data, kept off the play), a hedge and a post-and-rail fence round
  the club's edge with gates, reeds round the lakes.

### Phase 4: the clubhouse, and the old club retired

- The clubhouse on its rise (its name on its roof, made up), the car park, the putting green, a practice range, the cart
  shed; collision boxes and doors.
- It's a place: the `golfclub` spot moves here (its door, panel and pin; `PLACES` and `LIVE_PLACES`, its marquee and live
  lines), renamed for the new club. The snapshot test is rewritten for the move (the owner's call).
- Crestmont Hills Club retired: its six holes, clubhouse, carts and terrace taken off the hills (`crestsites.ts`,
  `crestbanks.ts`, `crestdrape.ts`, `crestgardens.ts`, `crestlife.ts`, the world map), the land given back to the hills'
  gardens and meadows.

### Phase 5: its life, night and sound

- The flags on the greens (swaying), tee markers, ball washers, benches, rakes in the bunkers, signs by each tee.
- Golfers on the course (the crowd: a swing, a putt, walking between holes), carts on the paths, a greenkeeper's mower,
  birds on the lakes; the clubhouse lit at night, the course dark; its sound. Still under reduced motion.

### Phase 6: the golf game (its own plan, `docs/golf-game-plan.md`, when Phase 5 is signed off)

- Rules DOM-free and seeded (a ball's flight with the wind, its lie from `surfaceAt()`, its roll on the greens from the
  ground's slope, the clubs, strokes, the card), the view only drawing them (aim, a power swing, the camera).
- Play a hole, nine or eighteen; rewards Dorras and XP only. Its save (`degen-city-golf-v1`) with its migration and its
  key in `BACKUP_KEYS`; in through `live.closed()`; touch controls.

## Open questions (for the owner, before Phase 2 and 4)

- The club's name (made up; the old one was Crestmont Hills Club).
- Whether the practice range goes by the clubhouse (in place of part of the grounds) or out on its own.
- How long the golf game's rounds should be on a phone (a hole, nine, or eighteen).

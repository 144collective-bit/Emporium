# Other cities and the map creator

The owner's call (2026-11-27): the airport will take players to other cities
the owner makes. This plan is the groundwork for that: a city as a map file,
a blank open level, a map creator to build on it, and the flights between
cities. One phase at a time, each with the owner's sign-off.

## The owner's answers (2026-11-27)

- **The map creator is the owner's tool only.** It never loads for an
  ordinary visitor, and what it makes is a map file committed to the repo.
  It isn't Build mode (retired): players buy and build nothing in it.
- **Drawn on a top-down plan, played in 3D.** Land, water, streets and zones
  are drawn on a plan view; a press of Play walks or drives the result.
- **Tested on a Vercel preview of the work branch only.** Vercel's Git
  deployments stay off for every other branch (`vercel.json`), so `main`
  never deploys there;
  degenemporium.com (Hostinger) and Cloudflare are untouched.

## Why a second stage, not a second Sector 7

Sector 7 is written into the code: its streets, districts, ground, collisions
and places are constants that the whole of `index.ts`, `world.ts` and
`walk.ts` read as they load. Making that engine read a map file instead would
mean rewriting it under a city that must not move (`tests/snapshot.test.ts`).

So another city is drawn by its own, smaller runtime, **the stage**
(`citystage.ts`), which reads nothing but a map file. It shares what's about
the look and not the place: the toon and neon materials and the batches
(`kit.ts`), the ink outlines and bloom (`post.ts`), the palette
(`palette.ts`). As the phases go on it takes on more of the shared parts
(the sky, Degen, the car's rules), each lifted out of Sector 7's code only
where that's a clean cut. Sector 7 itself is left as it stands.

## The parts

| File | What it holds |
|---|---|
| `citymap.ts` | The map file (`CityMap`), DOM-free: its shapes, limits, `cleanMap()` (every map read from a file or the editor goes through it), `blankMap()`, the ground's height, `tests/citymap.test.ts` |
| `cities.ts` | The cities there are (`CITIES`), DOM-free: Sector 7 (home) and each map city; `cityAsked()` reads the address's `?city=` |
| `citystage.ts` | The stage: draws a map file (ground, edge, water, hills, streets, zones, markers), its camera and its bar. Its own chunk, fetched only when another city is asked for |
| `stage.css` | The stage's bar, in the arcade kit |

A map is in tiles, as Sector 7 is, centred on 0, 0. Version 1 of the file:

- `size`: how wide and deep the level is (64 to 1,400 tiles: Sector 7's own
  width).
- `hills`: round hills (a centre, a radius, a height); the ground's height at
  a point is `groundAt()`.
- `water`: rivers, lakes and sea as outlines.
- `streets`: centre lines with a kind (avenue, street, lane, path); the kind
  gives the width.
- `zones`: outlines with a use (homes, shops, towers, works, park, plaza):
  the engine fills them from the building kits.
- `places`: named spots (the arrivals airport, landmarks), names from the
  map file only (made-up names; nothing a visitor types).
- `spawn`: where Degen stands on arriving.

## The switch

- `?city=<id>` on the homepage opens that city on the stage instead of
  Sector 7 (`cityAsked()`, `CityMap.astro`). Nothing links to it yet.
- The live feature `cities` ("Other cities", `live.ts`) closes it from
  outside: closed, the address opens Sector 7 as ever.
- Test cities (`test: true`) are reached by the address only, and will never
  be on the airport's board.

## Phases

1. **The map file, the blank level, a way in** (built, 2026-11-27).
   `citymap.ts`, `cities.ts`, the stage drawing a map, the Open Level
   (`?city=open-level`): flat open ground 600 tiles square inside an edge
   wall, a tile grid, the arrivals pad, a camera to look round. A Vercel
   preview of the branch.
2. **The map creator, the plan view.** `?city=open-level&edit`: a top-down
   plan over the stage. Tools: land (hills), water, streets (click to lay
   points, snapping to other streets), zones, places, the spawn. Undo, redo.
   Kept in the browser as it's drawn (`degen-city-maps-v1`, in `BACKUP_KEYS`),
   **Export** downloads the map file to commit, **Import** reads one back.
   Its own chunk on top of the stage's.
3. **Streets and blocks drawn properly.** Roads with kerbs, pavements,
   junctions and crossings from the map's centre lines; blocks found between
   them; lamps along them. Rules DOM-free and tested (the street plan's own
   helpers, `streetplan.ts`, reused where they don't read Sector 7).
4. **Zones filled.** Each zone's buildings from the kits (homes, shops,
   towers, works), parks and plazas planted; batched, instanced, near and
   far, on the phone tier too. Draw calls measured (`?fps`).
5. **Play it.** Degen walks and the car drives on the stage: collisions and
   the ground under a point from the map file. The editor's Play button.
   This is the biggest phase: walk mode is tied to Sector 7 today
   (`docs/walk-plan.md`), so it's done as a split of what's about walking
   from what's about the place.
6. **Life.** Traffic along the map's streets, a crowd by zone, the sky, dusk
   and weather shared with Sector 7's.
7. **Flights.** The airport's departures board lists the cities
   (`live.closed('cities')`); a flight swaps the city; the save keeps which
   city Degen is in (its migration in `cleanSave()`), and each city's own
   save stays apart from Sector 7's.
8. **The first real city.** The owner's first map, made in the creator,
   committed, on the board.

## Making a map feel like a real city

Notes for drawing maps, and for what the creator should make easy:

1. **Land first.** A river, a coast, a hill or two before any street: the
   streets then have something to bend round (streets follow the land).
2. **Layers of age.** A tangled old core, a planned grid beside it, looser
   suburbs past that. Where the layers meet at an odd angle is what reads as
   real.
3. **A road hierarchy.** A few avenues carry the city, streets feed them,
   lanes and paths fill in. Each has its own width, lamp and traffic.
4. **Block sizes vary.** Small in the centre, bigger outward; a diagonal or
   a square breaks a grid.
5. **Landmarks and sightlines.** Long streets end on something: a tower, a
   spire, a bridge. One centrepiece a city.
6. **Edges and seams.** Water, a railway, a main road divide districts; no
   ruler-straight edge between two kinds of land.
7. **A character a district.** One palette, lamp, building kit and crowd
   each, so you know where you are without a sign.
8. **One idea a city.** A port, a mountain town, a desert strip: not Sector 7
   again.
9. **Small and dense first.** A tight city that runs well on a phone beats a
   wide empty one.
10. **Nowhere a dead end on foot.** Every close ends in a path through.

## Rules carried over

- Made-up names only, from the map file; no real brand, never the token.
- Dorras, free play and the rewards work in every city as in Sector 7.
- Nothing threatening in any city.
- Each city's drawing is its own chunk; the boot of Sector 7 gains nothing
  but the few lines that read the address.
- The budgets aren't raised to fit this in.

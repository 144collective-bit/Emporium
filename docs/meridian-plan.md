# Port Meridian: a city for driving and combat

The owner's call (2026-11-28): a change of plan. The first other city isn't
drawn by hand in the map creator: the owner describes it and the map is
written from that, on the blank level. It is the cyberpunk port of
`docs/cities-plan.md`, rebuilt round driving and combat. One phase at a
time, each with the owner's sign-off. The groundwork (the map file, the
stage, the map creator) is `docs/cities-plan.md` and `docs/guide/cities.md`.

## The owner's answers (2026-11-28)

| Asked | Answer |
|---|---|
| Which city | The cyberpunk port, rebuilt for driving and combat |
| Its name | **Port Meridian** (made up) |
| Size | 900 x 900 tiles |
| Combat | Players against players, and against computer fighters |
| Who can be fought | Anyone in this city |
| Where | The whole city, with a few safe places |
| Multiplayer | Computer fighters first; player against player later, when the game server is turned back on |
| Losing a fight | Nothing but the fight: wake at the nearest safe place with everything |
| Trouble in the street | A heat level and city security that comes after you |
| How it looks | Harder than a cartoon knock-out, still stylised: no gore |
| Driving | Free roam on roads built to be driven; stunts and chases. No races against other cars |
| Districts | The port and container yards, the tower core, the old town and markets, industry and wasteland; multi-levelled, sky roads through the city |
| Road features | A ring motorway, a raised spine through the towers, a drained channel, bridges, a tunnel and big jumps |
| Levels | Three: below (the channel, the tunnel), the ground, one deck of sky roads |
| Coast | The sea to the east |
| First | The map, then driving; combat after |

## Port Meridian's own rules

Sector 7's rules are Sector 7's. These hold in Port Meridian only, the
owner's calls above; nothing here changes Sector 7.

- **There is fighting, and things attack you.** Sector 7's "nothing
  threatening, nothing attacks you, the crowd is never a target, no health
  outside the ring" does not hold here. The player has health in this city.
- **Anyone can be fought, anywhere**, but for the safe places: the arrivals
  airport, shops' insides, the player's garage. No weapon fires there and
  nothing follows you in.
- **Losing costs nothing but the fight.** Nothing is dropped, nothing is
  taken, and no player ever takes anything from another.
- **Stylised, no gore.** Hit flashes and impacts; a downed fighter stays
  down a while, then is gone. No blood, no bodies left lying.
- **Heat.** Trouble raises a heat level; city security answers in steps
  (drones, patrols, armoured units) and gives up when it loses you.
- **No races against other cars** (street races stay retired everywhere).
  Stunts, speed traps, drift zones and chases only.
- Unchanged from everywhere else: Dorras are earned by playing, never
  bought, cashed out or given a real value; rewards are Dorras and XP only;
  free play; made-up names only (factions, security, shops, signs), never a
  real brand or person, never the token; nothing of a particular film, book
  or game copied; motion optional; phones kept light; sound off until
  turned on.

## The layout (a first draft, to be signed off on the plan view)

900 x 900 tiles, x from -450 (west) to 450 (east), z from -450 (north) to
450 (south). The sea fills the east; the land rises gently to the west.

| District | Where | What it is | Built for |
|---|---|---|---|
| The port | The east shore, x 200 to 380 | Quays, cranes, container stacks as a maze, wide lorry roads, a breakwater | Cover fights, drifting |
| The old town and markets | Between port and towers, x 40 to 200 | Tight lanes, three canals in from the harbour, night markets under the sky roads | Close fights, technical driving |
| The tower core | The middle, x -160 to 40 | Huge towers on wide avenues, plazas, giant signs; the sky roads run between the towers | Fast avenues, fights on two levels |
| Industry | The north-west | Refineries, a power yard, pipe runs over the roads | Long sightlines |
| The wasteland | The west and south-west | A scrapyard, dirt, the channel's upper end, the marked jumps | Stunts |
| Arrivals | The south-west corner | The airport Degen lands at: a safe place | The way in |

Roads, drawn first, the districts hung on them:

- **The ring motorway**: a fast loop round the whole city about 60 tiles in
  from the edge, on the deck along the shore and through the towers' north
  side, on the ground in the west. An exit into every district.
- **The spine**: one long sky road from the port's gate west through the
  tower core to the ring, with ramps down every few blocks.
- **The drained channel**: a wide concrete flood channel below street
  level, from the wasteland diagonally through the old town to the harbour:
  a hidden fast route, with ramps in and out and bridges over it.
- **Bridges, a tunnel, jumps**: two bridges over the harbour mouth and the
  canals, one tunnel under the tower core joining the channel to the ring's
  west side, and marked jumps (the channel's banks, the scrapyard, a broken
  stretch of sky road).
- Under those: avenues on a loose grid in the towers, streets that bend
  round the canals in the old town, lorry roads in the port, tracks in the
  wasteland. Nowhere a dead end on foot.

## What the map file needs first

- A third level: `level` on a street becomes -1 (sunk: the channel, the
  tunnel), 0 or 1 (`MAP_VERSION` 2, its migration in `cleanMap()`).
- Districts: a name and a character on a zone, so the stage and the life
  know where they are.
- Ramps: where two levels join, worked out from streets that meet at an end
  on different levels.
- Safe places, jumps and the ring's exits as places.

## Phases

1. **The map.** The file's third level and districts; Port Meridian in
   `CITIES` (a test city until it opens); its whole land, water and road
   network on all three levels written from this plan (`maps/` beside the
   code, cleaned and tested: every street on the level, every district
   reached by road, every dead end with a footpath on). Seen on the plan and
   in 3D on the Vercel preview. **The owner signs off the layout here.**
2. **Roads you can drive.** Real carriageways from the centre lines: kerbs,
   lanes, junctions, the deck and its barriers, the channel's walls, ramps
   between levels, bridges, the tunnel. The rules of what's road and how
   high it is at a point, DOM-free and tested.
3. **Driving.** The car on the stage, on the driving rules Sector 7 has
   (`drive-sim.ts`), with collisions from the map, a chase camera and the
   touch controls. The jumps work.
4. **The city built.** Zones filled from the building kits by district; the
   giant towers, the container maze, the signs. Batched and instanced,
   measured on the phone tier.
5. **Life.** Traffic on every level, a crowd by district, the sky.
6. **On foot and armed.** Walking on the stage; health in this city; the
   guns; people who fight back, run or fall; the safe places.
7. **Heat.** The heat level, city security's steps, losing them, chases.
8. **Stunts and jobs.** Jumps scored, speed traps, drift zones, chase jobs;
   Dorras and XP.
9. **Flights.** The airport's board in Sector 7 lists Port Meridian; the
   save keeps which city Degen is in; a save for this city apart from
   Sector 7's.
10. **Player against player.** When the owner turns the game server back
    on: fights between players, under the rules above.

Phases 3 and 6 are the big ones: driving and walking are written against
Sector 7 today, so each is a split of what's about moving from what's about
the place, with Sector 7's own tests and `npm run smoke` holding it still.

## Still to ask

- The factions: how many, their made-up names and colours, whose turf is
  which district.
- City security's name and look.
- What the tower core's centrepiece is.
- Whether the city is locked to night and rain or keeps the sky's day.
- Which of Sector 7's cars, guns and clothes come with Degen.

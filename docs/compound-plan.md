# The compound upgrade: Degen's home done up to suit him (a plan)

The owner's call (2026-11-18): "Let's upgrade Degen's compound to suit him. His house interior too. It's a key
landmark so will be seen a lot." Nothing is built until the owner signs off a phase; keep this plan up to date.

What stands today is `docs/ends-far-west-plan.md`'s compound (Phases 2 to 5) on the south's re-laid streets
(`docs/south-plan.md`): the wall and open gates on Gate Lane, the double garage on the Close's line, the workshop, the
two-storey house with one room downstairs (`ROOM`, `FURNITURE`) and the roof terrace (`TERRACE`, `ROOF_THINGS`), all
in `home.ts` and drawn by `home3d.ts` (`docs/guide/endswood.md`).

## The owner's answers (2026-11-18)

| Question | Answer |
| --- | --- |
| The look from the street | Made good + neon: keep the estate's brick and render; black steel, a neon edge, a lit monogram |
| The inside | Refit the ground floor into its areas, and add an upstairs (a bedroom and an office) |
| What the house does | A trophy wall (what you've won, from the save) and an office desk (opens the hub's Business tab) |
| How | The plan first, then a phase at a time with the owner's sign-off |
| The trophy wall | In the lounge |
| The telescope | Decoration only |
| Extras | A hoop on the garage wall; no mural |
| A basement (added 2026-11-18) | "A basement that he uses to trade in. A real degen man cave": charts and computers for his crypto trading, under the house's footprint, built after the upstairs |
| The upstairs office | Kept: its desk runs the business; the basement's screens are his trading |

## What holds

- **Nothing that exists moves**: the plot, the wall's line, the gates (open), the back gate, the garage's two doors,
  `CAR_HOME`, `BIKE_HOME`, `HOME_GARAGE_DOOR`, `HOME_WORKSHOP_DOOR`, `HOME_SPAWN`, the front and side doors and their
  fades, the wardrobe's and the stash's prompts. New things fit round them.
- **No taller**: nothing new rises over the house's parapet (`RIDGE` 2.75) but the terrace's rail and what stands on
  it, as now. The Emporium stays the centrepiece.
- **Made-up only**: the monogram is Degen's own mark (a stylised D), never the token, a brand or a number. No
  lettering a visitor can type.
- **Minimal bloom**: the neon is thin lines and small signs; no lit slab or roof. **Nothing flush**: strips and
  plaques sit about 5 mm off their walls.
- **Draw calls are the budget**: everything fixed goes into the house's existing site's batches; fine detail near
  only; phones leave out the finest. Measured with `?bench` (`ends-home`) before Phase 1 and after every phase, on the
  phone tier too.
- **Rules and view split**: what the trophy wall shows is worked out in a DOM-free file with tests; the view only
  draws it. Screens reach the save through `GameDeps`.

## The design

### Outside: made good, with his neon

- **The gates**: the two leaves in black steel, standing open folded back inside the wall's line (not in the
  opening), a thin neon edge along their tops. The piers get a stone cap and a small lamp each (the pools are there
  already, `HOME_POOLS`).
- **The monogram plaque** on the north pier: the plaque that's blank today, lit, with Degen's D drawn on a baked
  canvas (`canvasTex()`), cut out and `occlude()`d.
- **The house**: the render front kept, one bold accent colour (the doors, the window frames, the canopy's edge);
  a black steel canopy over the front door with a downlight; the ground floor's front windows widened in their frames
  (the wall's line doesn't move); a thin neon line under the parapet on the yard side and the Close side.
- **The garage**: a black steel fascia over the two doors with a neon edge facing down the Close; the inside brighter
  (strip lights, a sealed grey floor, a wall of tools and a tyre rack), so the car reads as on show as you arrive.
- **The yard**: low lit bollards along the drive's edges (instanced), the monogram set into the paving in front of
  the garage (a decal over the paving, nothing flush), a tree in a big planter where the yard meets the north-west
  lawn (clear of the car's way out).
- **A basketball hoop** on the garage's wall facing the yard (the owner's pick): a backboard and a hoop, for looks,
  clear of the car's doors.
- **The workshop**: its roller door's frame in the same black steel, a lit sign-less lightbox over it.

### Inside: the ground floor refit

The same room (`ROOM`), split into its areas by what stands in it, the middle kept clear from the front door to the
side door (`HALL_W`).

- **The lounge** (west half): an L-shaped corner sofa where the sofa is, a wide wall-hung telly on a long low media
  unit with a light strip behind it and a games console, a rug, a floor lamp, two plants. The trunk (the stash) stays
  where its prompt is.
- **The trophy wall** on the lounge's west wall (the owner's pick): lit shelves, see below (built in Phase 2).
- **The kitchen** (along the back wall): the counter with a splashback and a light strip under its wall cupboards,
  the fridge tall, an island with three stools in place of the dining table, a pendant over it.
- **The hall**: a console table by the front door, a mirror, a mat; a framed print or two on the walls (his style,
  made-up, nothing from the old site).
- **The stairs**: opened up (a rail, not a box), now going to the upstairs; the wardrobe stays where it is.
- Lit as now (no shadows, the shared neon paint shaded by hand), with the warm strips and pendant as small accents.

### Inside: the upstairs (new)

The house is two storeys already (`EAVES` 2.5; the ground floor's ceiling is `CEIL` 1.2), so the first floor fits
between the ground floor's ceiling and the roof without the house growing.

- **The landing** at the stairs' head, with the steps on up to the terrace's hatch (its own fade, as now).
- **The bedroom** (front, over the lounge): a big low bed, bedside tables and lamps, a rug, a cap rack on the wall.
- **The office** (back, over the kitchen): a desk with two screens (they glow; nothing legible on them), a chair, a
  shelf, a plant. **The desk is a prompt** ("Desk") that opens the hub on its Business tab (units, lots, contracts),
  through `live.closed()` as every new way into a feature.
- **A bathroom door**, shut (decoration only).
- The upstairs windows that are lit at night (`LIT_GLASS`) now have rooms behind them.
- Walking: `inHouse()` takes three floors (the room, the upstairs, the roof); `homePlaces(y)` gives each floor its
  own prompts; a `homeup` layer in groundheight.ts; walk.ts's `blocked()` asks the upstairs' walls up there; the
  camera keeps under each floor's ceiling.

### The basement: his trading den (new)

The owner's call: "a basement that he uses to trade in. A real degen man cave", with charts and computers for his
crypto trading. Under the house's footprint (about 8.7 by 6.2, the room's size), reached by a stair down from the
ground floor (a fade, "Downstairs" / "Upstairs", as the house's other stairs).

- **The trading desk** along the back wall: a long desk under a curved bank of six screens on arms, a big gaming
  chair, a tower PC with a lit side, keyboard and mouse glow, cables tidied into a tray. **Looks only** (the owner's
  pick): no prompt, nothing it does in the game.
- **What's on the screens**: made-up candle charts and depth bars in green and red, with lines but **no words, no
  numbers, no tickers, no coin names or logos**: never the token, never a real coin, exchange or brand, never a
  price (the content guardrails). One baked canvas (`canvasTex()`) shared by the screens, each showing a different
  part of it; the charts creep along slowly (a texture offset, not a redraw), and stand still under
  `prefers-reduced-motion`.
- **The cave**: a low sofa facing a wall-hung telly, a small bar with a back-lit shelf of made-up bottles and a
  mini fridge, an arcade cabinet (made-up art, decoration), a rug, LED strips along the ceiling's edge in the
  PulseChain neon, a neon monogram on the wall, made-up posters, a beanbag. No windows; lit from inside as the house
  is.
- **Walking**: a fourth floor for `inHouse()` (below the slab); `homePlaces(y)` gives it its own prompts (the stair up
  only); a layer in groundheight.ts for its floor; walk.ts's `blocked()` asks its walls and what stands in it; the
  camera keeps under its ceiling (the slab). Rain and the street's sound stay out (as the room); the den has its own
  low hum.
- **Drawing**: its own site, built only once you're near the house and shown only while you're in it (nothing
  below ground is seen from outside), so it costs nothing in the city's view.
- Nothing about it is a real-money or investment thing: it's his room and his hobby, and Dorras stay the city's
  money only.

### The trophy wall

- **What it shows**, worked out from the save in a DOM-free file (`hometrophies.ts`, tested): the kart cups you've
  won and their place (`save.karts.trophies`, the same the kart park's cabinet shows), a Fight Club belt once you've
  won a bout (`save.fight.wins`), a glove for each level of opponent beaten (`save.fight.bots`), and framed
  milestones for levels reached. Empty shelves stay as empty slots, so there's always something to earn.
- **Drawn** as the kart park's cabinet draws its cups: the shapes made once, shown or hidden from the save on the
  way in and after a race or a fight, each metal its own material (no material's colour changed at runtime).
- Rewards stay Dorras and XP: the wall only shows what you've already done; it gives nothing.

### The roof terrace

- An outdoor sofa and a low table in place of the two chairs, more planters, the string of lights kept, and a small
  neon monogram on the parapet facing down the Close (the one bright thing up there, under the bloom's threshold
  but for its line).
- A telescope at the front rail, pointed at the Emporium (decoration only, the owner's pick).

## The phases (each with the owner's sign-off)

1. **The outside**: the gates, the plaque, the house's front and canopy, the parapet's neon, the garage's fascia
   and inside, the yard's bollards, monogram and planter, the workshop's frame. `home.ts` (anything solid: the
   planter, the bollards, in `HOME_SOLIDS`), `home3d.ts`, `tests/home.test.ts` (nothing new blocks the gates, the
   car's way out or the doors' prompts). Bench and shots by day and night from the Close and the yard.
   *Built, signed off by the owner (2026-11-18).* `home.ts`: `BOLLARDS` (ten, `BOLLARD` 0.07 by 0.38: five along the east
   lawn's edge from a little past the house's corner, so the way round to the side door stays open, and five along
   the north strip past the workshop) and `PLANTERS` (`PLANTER_H`), both in `HOME_SOLIDS`. `home3d.ts`: `STEEL_BLACK`
   and `HIS_NEON` (`PAL.magenta`, 0.6 by day, 2.4 at night: thin tubes only, one shared neon paint, so no draw call
   of its own); `mark()` draws his D as neon tubes or laid flat. What's drawn: the gates' leaves in black steel with a
   kick plate and a neon top rail; the plaque on the south pier (where the plain one was) black with his neon D; the
   neon under the roof's edge on the yard and Close sides; the canopy in black steel with a neon lip and a downlight;
   every window's frame black, the ground floor's front pair taller (`FRONT_SILL` 0.4 to `FRONT_HEAD` 1.08, the room's
   front window with them); the garage's black fascia with neon along its foot and a downlight over each door (in
   place of the caged lamp; the yard's pool stays), the hoop on the pier between the doors, a pegboard of tools
   inside; the workshop's door in a black steel frame under a plain lightbox; the planters with clipped shrubs; the
   bollards with soft lit caps; his D in the coping's stone in the paving before the garage.
   **How it differs from the sketch:** the planters stand either side of the front door rather than a tree in a
   planter by the north-west lawn (the yard keeps its turning room, and the door is what you walk to); the plaque is
   on the south pier, where the old one was.
   Tests: `tests/home.test.ts` (the bollards and planters at the yard's edges, off the drive and clear of the gates,
   the prompts, the spawn, the menu's camera, the way to the front door and round to the side door).
   **Measured** (the compound's site built in Node, before and after, every mesh counted): still **6 draw calls**
   (every new part is in the batch's shared paint or shared neon); triangles 4,328 to 5,978 on desktops, 3,144 to
   4,578 on phones (the bollards six-sided there), against about 0.39M in the City view. The boot's script grew 0.1 KB
   (739.6 of 750 KB). The full headless `?bench` was too slow to finish on the container's software renderer (over 30
   minutes for one build) and was stopped; worth a run on a real phone and laptop at sign-off.
   **Seen:** the neon holds as a line from the Close, the yard and the door; from high over the compound at night it
   breaks into dashes (the ink outlines over a line that thin at that distance; making it half again as thick didn't
   change it). Shots: `docs/compound-shots/phase-1-*` (before and after, desktop by day and night, the phone after).
2. **The ground floor refit and the trophy wall** (the trophy wall moved here from Phase 3 with the owner's go-ahead,
   2026-11-18): the lounge, the kitchen, the hall, the open stairs; `FURNITURE`'s new kinds; `homeWall()` round them;
   the stash and wardrobe prompts unmoved; `hometrophies.ts` and its tests, the wall drawn. Shots of the room by day
   and night, on a phone.
   *Built, waiting on the owner's sign-off.* `home.ts` `FURNITURE` (new kinds `chaise`, `lamp`, `plant`, `trophies`,
   `console`, `island`, `stools`; `dining` gone): the corner sofa (its run under the front window and the chaise at
   its east end), the coffee table, the media unit with the telly facing the sofa, the trunk (the stash, where it
   was), a floor lamp, the trophy wall on the lounge's west wall; the counter and fridge, a plant, the island with
   three stools on the lounge's side; the console table and a plant under the front window east of the door; the
   stairs (same footprint) and the wardrobe as they were. `home3d.ts`: the furniture in black steel, dark units and
   a pale worktop, his magenta for the cushions and stools; the telly's magenta backlight and a strip under the
   island's overhang (`BACKLIGHT`, softer than the street's neon); a pendant over the island; the open stairs (nine
   treads, a black steel stringer, handrail and posts, the opening in the ceiling over their top); the second front
   window inside (east of the door, as outside); two prints of his own (blocks of his colours); a bigger rug.
   **The trophy wall:** `hometrophies.ts` (DOM-free, the boot's: `trophies()` from the save, `MILESTONES` 5, 10, 20,
   30, 40, `SHELF` the feed), set by tycoon-boot.ts as the save loads and on every commit; `home3d.ts`
   `trophyWall()`, added by south3d.ts on the main thread (the house's site may be built in the worker), builds one
   small batch in the room's paint and builds it again only when what the wall shows changes. Cups in gold, silver or
   bronze; the belt; red gloves; gold frames; an empty stand for each slot not yet won.
   Tests: `tests/home.test.ts` (the refit's places, the prompts where they were, the ways round the island and past
   the stools; the flood test reaches everything), `tests/hometrophies.test.ts` (the slots, the metals, the belt and
   gloves, the milestones, the feed).
3. **The upstairs**: the first floor (the landing, the bedroom, the office), its walking and prompts (the desk), the
   stairs' fades re-routed (room ↔ upstairs ↔ terrace). The smoke test gains scenes for the upstairs and the desk;
   its terrace scene goes by the landing.
   *Built (the owner's go-ahead, 2026-11-18: "continue all remaining steps as I sleep, then merge to main"), waiting
   on the owner's look.* `home.ts`: **the floors** (`homeLevel()` by his height: the room under 0.9 over the slab, the
   upstairs under 2.1, the roof over that, each line well over a jump (0.52) above its floor), `UP_Y` (CEIL + 0.1, the
   floor slab's top) and `UP_CEIL` (the eaves); `inHouse()` is any indoor floor, `homeWall(x, z, r, y)` asks that
   floor's things, `homeFloorY()` (groundheight.ts's `home` layer, was `homeroof`) gives the upstairs' or the roof's
   floor, `homeCamera(y)` the camera's ceilings and floors for each (walk.ts `cameraRoom()`). **Upstairs**
   (`UPSTAIRS`): the landing along the east wall with the railed stairwell over the stairs (the steep steps on up to
   the hatch rise in its north end), a shut bathroom door at its back; partitions to the ceiling with a doorway into
   each room (`UP_DOORS`); the bedroom at the front (a big low bed between two bedside tables with lamps, a dresser,
   his caps on a rail, a rug); the office at the back (the desk with two glowing screens (lines of light, nothing to
   read), a keyboard and a tower with a lit side; his chair; a bookshelf; a plant). The three front windows inside
   where they are outside; ceiling lights. **The stairs re-routed** (`HOME_PORTALS`, each with its `level`): `home:up`
   room → landing, `home:down` landing → room, `home:roof` landing → terrace ("Roof"), `home:roofdown` terrace →
   landing. **The desk** (`HOME_USES` `home:desk`, upstairs) opens the business card as the Dorras pill does
   (index.ts: `tycoon.openCard()`; the card has no live switch of its own, so there's none to ask). `homePlaces(y)`
   gives each floor its own prompts. walk.ts: `?spawn=x,z,yaw,y` takes a height (to start on a floor). Tests:
   `tests/home.test.ts` (the floors by height, the upstairs' things apart and all reachable through the doorways, its
   prompts, the stairs both ways, the camera's floors; the terrace from the landing), `tests/groundheight.test.ts`
   (the `home` layer). The smoke test: `hometerrace` goes room → landing → terrace → landing, `homedesk` opens the
   card at the desk.
4. **The basement**: the den's floor, walls and ceiling, its stair down and up (fades), the trading desk and its
   screens' chart texture, the cave's things, its walking, its sound; tests in `tests/home.test.ts` and
   `tests/groundheight.test.ts`; a smoke scene (down, round the desk, up). Shots by its own light.
   *Built (the owner's go-ahead, 2026-11-18), waiting on the owner's look.* `home.ts`: a fourth floor, `base`
   (`homeLevel()`: under -0.5 over the slab), `BASE_Y` -1.32 to `BASE_CEIL` -0.12; `BASEMENT` (the steps down along
   the east wall from under the stairs' high end; the telly on the front wall, a table, a low sofa facing it, a
   beanbag, an arcade cabinet on the west wall; the trading desk along the back wall, his chair, the tower; the bar
   along the east wall with its lit shelf of bottles behind, stools, a mini fridge; a plant); `homeWall()`,
   `homeFloorY()` and `homeCamera()` know it (the camera down there has the basement's own four walls: the city's
   don't reach under the ground); `home:cellar` (room → basement, "Basement", by the stairs) and `home:cellarup`
   (basement → room, "Upstairs"). `home3d.ts` `basement()` (in the room's batch: dark walls, LED strips along the
   ceiling's edge in his magenta and cyan, his D in neon on the west wall, a rug, the furniture; the way down a dark
   opening under the stairs in the room) and `denCharts()` (south3d.ts, the main thread: one mesh for the six
   screens' faces sharing one baked canvas of made-up candle charts, depth bars and a line, **no words, numbers,
   tickers, coin names or logos**; the texture's offset creeps along, still under reduced motion; shown only while
   the camera is down there). The arcade's art and the bottles are made-up colours, no names. Sound: the house's
   hum, as the room. Looks only: nothing down there does anything in the game, and nothing about it is real money.
   Tests: `tests/home.test.ts` (the floor by height, everything apart and reachable, the steps under the stairs, the
   ways down and up, the camera's walls). The smoke test's `homeden` scene (down, into the den, back up).
5. **The terrace and polish**: the terrace's new things, the telescope; `?bench` views of the room, the upstairs and the basement
   as well as `ends-home`; every width (320, 375, 768, 1024, 1440, phones both ways) for the prompts and the hub from
   the desk; the guides (`endswood.md`, `tests.md`, `menus.md` if the desk's way in is listed there); the plan done.
   *Built (the owner's go-ahead, 2026-11-18), waiting on the owner's look.* `home.ts` `ROOF_THINGS`: the outdoor sofa
   where the two chairs stood (facing the front rail, the low table before it), the telescope in the front corner
   (home3d.ts turns it to the Emporium downtown; looks only), his sign on a stand at the east rail (`sign`: his D in
   neon facing down the Close, drawn at every distance), a third planter along the back. `bench.ts`: `ends-room`
   (his lounge) and `ends-den` (the basement) beside `ends-home`. The guides: `endswood.md`, `tests.md`, `menus.md`
   (the desk's way into the business card), `vehicles.md` (`?spawn`'s height). Tests: `tests/home.test.ts` (the
   terrace's new things, and the way the smoke test walks up there kept clear). **The plan is complete**, every
   phase waiting on the owner's look.

Each phase: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:wide`, a build, `npm run budget`,
`npm run smoke`, `?bench` before and after, and shots in `docs/compound-shots/`.

## Phase 6: the kingpin compound (the owner's call, 2026-11-19)

The owner, on the outside as built: "the colour is wrong and it's too basic ... its his base of operations. Think of a
kingpin compound." The owner's answers:

| Question | Answer |
| --- | --- |
| The look | Black brick loft: black-painted brick, steel factory windows, a big neon sign |
| The house | Same size, a new shell: the footprint, floors, doors and prompts as they are, so every room inside still works |
| The features | A gatehouse and a crest gate, a pool and cabana, a fountain and palms, a helipad on the garage |
| How | A plan and a mockup first: the new shell built and shown before the rest |

Still holding: nothing that exists moves (the gates, doors, car bays, prompts, floors); everything under the Emporium;
made-up names only, no lettering; nothing threatening (no guards, nothing armed: the gate stands open); minimal bloom;
draw calls in the house's own batches.

6a. **The house's new shell (the mockup).** *Built, signed off by the owner (2026-11-19), live.* home3d.ts `house()`: black brick
    (`LOFT_BRICK`) with a darker plinth, piers proud of the front at its corners and either side of the door's bay,
    a stone soldier course between the floors, the parapet stepped up over the door's bay under a stone coping, his
    neon under the coping (front and the Close's side); steel factory windows (`houseWindows()`: two big bays and a
    narrow light either side of the door downstairs, three tall ones upstairs, one up the east side) in slate glass
    with black steel grids, stone lintels and sills, lit warm at night by `houseLights()` (south3d.ts, the main
    thread: one additive mesh, nothing by day); a tall black pivot door with a gold bar under a deep steel canopy, a
    wall light either side; the fire escape up the east side facing the gates (home.ts `FIRE_ESCAPE`, solid: a
    landing at the upper floor, a flight to the ground, a ladder to the parapet); a steel frame over the roof
    terrace; the roof sign made the loft's big sign (a black panel on steel legs, a neon border, his D in neon,
    facing down the Close). The garage and the workshop in the same black brick. Gone: the orange render, the old
    canopy and windows, Phase 5's small sign stand. Tests: `tests/home.test.ts` (the fire escape: solid, narrow,
    clear of the side door and the way round to it). Shots: `docs/compound-shots/phase-6a-*`.
6b. **The gatehouse and the crest gate.** A small lit gatehouse inside the gates, the gate leaves as a sliding black
    gate stood open with a gold D crest, the compound's wall taller and dark with lit caps and wall lights.
6c. **The fountain and the palms.** A fountain in the yard's middle (clear of the car's way out and the drive), palms
    with uplights along the edges, lit paving lines.
6d. **The pool and the cabana.** On the east lawn: a lit pool, a cabana and loungers (the side door's way kept).
6e. **The helipad.** On the garage's roof: its pad, its markings (no lettering or numbers), edge lights; looks only.

Each with the owner's sign-off.

## The shots

`docs/compound-shots/`: Phase 1's before and after (desktop by day and night, the phone at night); the trophy wall and
the lounge as he wakes (`phase-2-*`); the bedroom, the office, the landing and the desk's card (`phase-3-*`); the den
through the walk camera (`phase-4-*`: the review camera can't go under the ground, it's kept over it once it rests);
the terrace through the walk camera (`phase-5-*`). (The review shots of the terrace from over the yard couldn't be
taken: after main's spawn plan Phase 3a, a `?shots` page in the headless browser never finishes loading, the same on
main's own build, so it's main's to look into; the site itself loads and plays, as the smoke test shows.)

## Merged with the spawn plan (2026-11-18)

`main` gained docs/spawn-plan.md while this was built: every visit wakes on the sofa in the room (`HOME_WAKE`,
`SOFA_SEAT`), the room's curtains draw back once the street is in (`ROOM_WINDOWS`, `CURTAIN`), and the ways out wait
meanwhile (`HOME_WAITS`). To fit both:

- The corner sofa's run is a little longer (to `rx0 + 3.45`) and its chaise narrower (from `rx0 + 2.72`), so the wake
  spot stands clear in front of the sofa, where the spawn plan put it.
- The room's front windows are back to their first heights (0.5 to 1.05 outside, 0.6 to 1.02 inside: Phase 1 had
  made them taller), so the curtains hang over the sofa's back; the second front window (east of the door) is in
  `ROOM_WINDOWS` and has its curtains too, and the hall's plant moved to the hall's back corner, clear of them.
- `homePlaces(y, ready)` gives each floor's prompts and the waiting label; `home:up` (now to the landing) waits, the
  basement's steps don't (nothing down there looks out).
- The smoke test's `wake` scene walks out past the coffee table, round the chaise, to the hall and the front door.

## Questions for later phases

All answered (2026-11-18): the trophy wall in the lounge, the telescope as decoration, a hoop on the garage and no
mural, the basement under the house after the upstairs, the office kept.

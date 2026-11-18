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
- **The trophy wall** on the lounge's west wall (the owner's pick): lit shelves, see below.
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
   *Built, waiting on the owner's sign-off.* `home.ts`: `BOLLARDS` (ten, `BOLLARD` 0.07 by 0.38: five along the east
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
2. **The ground floor refit**: the lounge, the kitchen, the hall, the open stairs; `FURNITURE`'s new kinds;
   `homeWall()` round them; the stash and wardrobe prompts unmoved. Shots of the room by day and night, on a phone.
3. **The upstairs and the trophy wall**: the first floor (the landing, the bedroom, the office), its walking and
   prompts (the desk), the stairs' fades re-routed (room ↔ upstairs ↔ terrace), `hometrophies.ts` and its tests,
   the wall drawn. The smoke test gains scenes for the upstairs and the desk; its terrace scene goes by the landing.
4. **The basement**: the den's floor, walls and ceiling, its stair down and up (fades), the trading desk and its
   screens' chart texture, the cave's things, its walking, its sound; tests in `tests/home.test.ts` and
   `tests/groundheight.test.ts`; a smoke scene (down, round the desk, up). Shots by its own light.
5. **The terrace and polish**: the terrace's new things, the telescope; `?bench` views of the room, the upstairs and the basement
   as well as `ends-home`; every width (320, 375, 768, 1024, 1440, phones both ways) for the prompts and the hub from
   the desk; the guides (`endswood.md`, `tests.md`, `menus.md` if the desk's way in is listed there); the plan done.

Each phase: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:wide`, a build, `npm run budget`,
`npm run smoke`, `?bench` before and after, and shots in `docs/compound-shots/`.

## Questions for later phases

All answered (2026-11-18): the trophy wall in the lounge, the telescope as decoration, a hoop on the garage and no
mural, the basement under the house after the upstairs, the office kept.

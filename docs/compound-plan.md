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
- **The workshop**: its roller door's frame in the same black steel, a lit sign-less lightbox over it.

### Inside: the ground floor refit

The same room (`ROOM`), split into its areas by what stands in it, the middle kept clear from the front door to the
side door (`HALL_W`).

- **The lounge** (west half): an L-shaped corner sofa where the sofa is, a wide wall-hung telly on a long low media
  unit with a light strip behind it and a games console, a rug, a floor lamp, two plants. The trunk (the stash) stays
  where its prompt is.
- **The trophy wall** (the lounge's west wall, or the hall's: decided in Phase 3 by what reads best from the door):
  lit shelves, see below.
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
- A telescope at the front rail, pointed at the Emporium (decoration; whether it's a prompt that turns the view to
  the skyline is the owner's call in Phase 4).

## The phases (each with the owner's sign-off)

1. **The outside**: the gates, the plaque, the house's front and canopy, the parapet's neon, the garage's fascia
   and inside, the yard's bollards, monogram and planter, the workshop's frame. `home.ts` (anything solid: the
   planter, the bollards, in `HOME_SOLIDS`), `home3d.ts`, `tests/home.test.ts` (nothing new blocks the gates, the
   car's way out or the doors' prompts). Bench and shots by day and night from the Close and the yard.
2. **The ground floor refit**: the lounge, the kitchen, the hall, the open stairs; `FURNITURE`'s new kinds;
   `homeWall()` round them; the stash and wardrobe prompts unmoved. Shots of the room by day and night, on a phone.
3. **The upstairs and the trophy wall**: the first floor (the landing, the bedroom, the office), its walking and
   prompts (the desk), the stairs' fades re-routed (room ↔ upstairs ↔ terrace), `hometrophies.ts` and its tests,
   the wall drawn. The smoke test gains scenes for the upstairs and the desk; its terrace scene goes by the landing.
4. **The terrace and polish**: the terrace's new things, the telescope; `?bench` views of the room and the upstairs
   as well as `ends-home`; every width (320, 375, 768, 1024, 1440, phones both ways) for the prompts and the hub from
   the desk; the guides (`endswood.md`, `tests.md`, `menus.md` if the desk's way in is listed there); the plan done.

Each phase: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:wide`, a build, `npm run budget`,
`npm run smoke`, `?bench` before and after, and shots in `docs/compound-shots/`.

## Questions for later phases

- **Phase 3**: the trophy wall in the lounge or the hall?
- **Phase 4**: the telescope as decoration, or a prompt that turns the view to the Emporium?
- **Any phase**: a mural on the wall's outside, or a hoop on the garage wall (both suggested, neither picked)?

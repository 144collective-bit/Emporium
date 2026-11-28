# Other cities, the stage and the map creator

Part of the project guide (`CLAUDE.md` is its index). The plan and its phases
are `docs/cities-plan.md` (the owner's call, 2026-11-27); keep this file up to
date when what it describes changes.

- **Sector 7 is the home city, written in code. Every other city is a map
  file**, drawn by its own small runtime, the stage. Nothing here changes
  Sector 7, and the stage reads nothing of Sector 7's (not `layout.ts`,
  `world.ts`, `walk.ts` or the baked data).
- **The map file** is `citymap.ts` (DOM-free, `tests/citymap.test.ts`):
  `CityMap` is a level's `size` in tiles (centred on 0, 0; 64 to 1,400 a
  side), its `theme`, `spawn`, `hills` (round, `groundAt()` is the ground's
  height: the highest hill over a point), `water`, `streets` (centre lines
  with a kind; `STREET_WIDTH` gives the width), `zones` (outlines with a
  use) and `places`. **Everything read from a file, the editor or storage
  goes through `cleanMap()`**: what's sound is kept, the rest dropped or
  clamped (`LIMITS`, `HILL`), ids made unique, points kept to the centimetre
  and on the level; null when it has no id. A change to a shape raises
  `MAP_VERSION` with its migration there. `blankMap()` is a blank level (the
  arrivals pad towards the south edge, the spawn north of it facing north);
  `mapText()` is the file's text, the same for the same map.
- **Names come from the map file only** (`cleanName()`: plain text, 40 long):
  made-up names, as everywhere; nothing a visitor types shows.
- **The cities** are `CITIES` in `cities.ts` (DOM-free): Sector 7 (`home`)
  and each map city with its `map()`. `test: true` is a test level: reached
  by the address only, never a flight's destination (`destinations()`).
  Today the only map city is the Open Level (`open-level`, `test`), a blank
  600 x 600.
- **The way in** is the address: `?city=<id>` (`cityAsked()`; Sector 7's own
  id, an unknown one or none start Sector 7 as ever). `goStage()` in
  `CityMap.astro` fetches `cities.ts` only when the address has `city=` (the
  page's own script holds one test of the address, nothing else), waits for
  the live settings, and goes through `live.closed('cities')` (the live
  feature "Other cities": closed, Sector 7 starts). Nothing links to it yet.
- **The stage** is `citystage.ts` (`bootStage(root, map, test)`; its own
  chunk): the ground with its tile grid (`GRID`: 10-tile squares, a bold
  line every 5; a mesh following the hills where there are any, and
  `setGroundLift()` so the batches follow them too), the land past the wall
  into the haze, the edge wall, zones as tinted land (`ZONE_COVER`, from the
  ground palette), water, streets as ribbons, places and the spawn as
  markers, each layer at its own height (`LIFT`: nothing flush). Fixed
  geometry goes through two `Batch`es (the land, the lit markers); the look
  is `kit.ts`'s materials and `post.ts`'s ink and bloom. It has **no render
  loop**: a frame is drawn when the camera moves or the window changes
  (`ask()`), so it stands still under reduced motion as it is. The camera is
  three's `MapControls` (drag, turn, zoom, the arrow keys), its target kept
  on the level; `home()` is the opening view over the spawn's shoulder.
  Phones (a touch screen under 820 px) draw fewer pixels, thin ink, FXAA and
  3 bloom levels. A lost graphics context shows the page's no-3D card.
- **On the page** the stage sets `data-view="stage"` and takes `has-start`
  off: `stage.css` puts away every Sector 7 screen (the title screen, the
  header, the hub, the walk HUD, the panels) and styles the stage's own bar
  (`.stage-bar`: the city's name, its size, Reset view, Sector 7) and its
  closable hint, both in the arcade kit (`.mk-skin`). Esc does nothing there.
- **Not yet** (the plan's later phases): the map creator's plan view, real
  roads and blocks, zones filled from the building kits, walking and
  driving, traffic and crowds, the sky, flights from the airport and the
  save keeping which city Degen is in.
- **Vercel** (the owner's call, 2026-11-27): this work is tested on a Vercel
  preview of its branch only. `vercel.json`'s `git.deploymentEnabled` is off
  for every branch (`**`) and on for that one branch by name, so `main`
  never deploys there. When the work moves to another branch, change the
  name there; when the testing's done, take it out.

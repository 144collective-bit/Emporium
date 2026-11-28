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
- **A street's line is the curve through its drawn points**: the file keeps
  the points clicked (`pts`), and `curveOf()` (a Catmull-Rom curve through
  every one, in pieces of `CURVE_STEP` at most) is the centre line the
  stage, the plan and the rules all read; water's shore is the same, closed
  (`shoreOf()`). Never draw or measure `pts` straight. A street's `level` is
  0 on the ground or 1 raised: the stage draws a raised one on a deck
  `DECK_Y` up with piers under it (`addStreet()` in citystage.ts).
- **The map creator** (the owner's tool; `&edit` on a city's address, or
  Edit map on the stage's bar) is `mapeditor.ts`, its own chunk, the screen
  only; **its rules are `mapedit.ts`** (DOM-free, `tests/mapedit.test.ts`):
  - The tools are `TOOLS` (Move, Street, Water, Hill, Arrive, Erase), each a
    function from a map to a new map through `cleanMap()` (`addStreet()`,
    `addWater()`, `addHill()`, `moveSpawn()`, `remove()`), null when it
    can't be done. `commit()`, `undo()`, `redo()` keep the history
    (`UNDO_MAX`), in memory only.
  - `snap()` pulls a street's next point onto a drawn point of another
    street first, then onto the nearest point along one. `hit()` is what the
    eraser picks up: a street, then water, then a hill.
  - The plan is a 2D canvas, north up, drawn only when something changes.
    Its view is `View` (`fitView()`, `toMap()`, `toScreen()`, `zoomAt()`,
    `panBy()`). **A drag always moves the view and a click always uses the
    tool**, mouse or finger alike; two fingers pinch; Enter or a double
    click finishes a street, Esc drops it, Backspace takes a point back,
    1 to 6 pick a tool, Ctrl+Z and Ctrl+Shift+Z undo and redo.
  - 3D makes a stage on the map as it stands (`bootStage(..., { bar: false
    })`) and Plan takes it down (`dispose()`, which gives the graphics
    context back: a browser keeps only so many).
  - The draft is kept in the browser on every change (`MAPS_KEY`,
    `degen-city-maps-v1`, by city id; `readStore()` keeps sound maps only).
    **It is not in `BACKUP_KEYS` on purpose**: putting a game backup back
    removes every key the backup doesn't hold. Export (`mapText()`,
    `fileName()`: `open-level.city.json`) is a draft's backup and the file to
    commit; Import (`readFile()`) brings a file in under the city being
    edited, as one undoable change.
  - Its screen is `.ed` in `stage.css`: the bar (3D / Plan, Undo, Redo, File:
    Export, Import, Clear map, Leave), the tool strip and the tool's options
    in the arcade kit; on phones each row is one line that scrolls sideways.
- **The first real city is a cyberpunk port** (the owner's brief,
  `docs/cities-plan.md`): two street levels, giant signs, dense alleys,
  towers far taller than Sector 7's. Mood only from the genre: nothing of a
  particular work is copied.
- **Not yet** (the plan's later phases): zones and places in the creator, real
  roads and blocks, zones filled from the building kits, walking and
  driving, traffic and crowds, the sky, flights from the airport and the
  save keeping which city Degen is in.
- **Vercel** (the owner's call, 2026-11-27): this work is tested on a Vercel
  preview of its branch only. `vercel.json`'s `git.deploymentEnabled` is off
  for every branch (`**`) and on for that one branch by name, so `main`
  never deploys there. When the work moves to another branch, change the
  name there; when the testing's done, take it out.

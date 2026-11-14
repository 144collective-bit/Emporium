# Tests

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

## Tests

- `npm run typecheck` (`astro sync`, then `tsc` with `--noUnusedLocals`)
  checks the types and that nothing declared is left unused; the "Build
  site" Action runs it first, so a type error stops the build too.
- `npm run lint` (eslint with typescript-eslint, `eslint.config.js`; the
  polish plan's Phase 10) holds what tsc doesn't: `prefer-const`, `eqeqeq`,
  the recommended catches for plain mistakes, and no `document`, `window`
  or `localStorage` in the DOM-free rules files listed in `DOM_FREE` there
  (a new rules file goes on that list). The Action runs it after the
  typecheck. Keep it fast and minimal: unused declarations are tsc's.
- `npm test` runs `tests/*.test.ts` with Node's own test runner
  (`scripts/test.mjs` bundles each with esbuild first; `npm test -- drive`
  runs only matching files; a line per file with its time and the slowest
  five at the end, `scripts/test-reporter.mjs`; motionmatch.test's
  wall-clock check is skipped under `CI`). `npm run test:wide` runs them all in Phase
  10's bigger world (`WORLD_EXT`): run both when anything reads the edge. The "Build site" Action runs them before the
  build: a failing test means no zip.
- The baked data (the routes, verges, rolls...) is worked out once a run
  and handed to every test file (`scripts/test-baked.mjs`, baked.ts
  `__cityTestBaked`), so each doesn't make it again; the tests of what's
  baked (`MAKE` there: baked, routes, crowdclips, commons, verges, rolls,
  metro, viaduct)
  make it themselves. A new module that bakes adds its test to `MAKE`.
  `TEST_BAKED=0 npm test` runs without it.
- They cover the code that's free of the DOM and scene code: the street plan
  (`layout.ts`, `streetplan.ts`), the cars' measurements, interiors and where your car is hollow (`carspec.ts`, `carinside.ts`), your car's springs (`suspension.ts`), the garage's customisation (`carlook.ts`, the look in `mycar.ts`), your motorbikes (`mybike.ts`, `bike-sim.ts`, their place in the save and `bikeMark()`, in `tests/bike.test.ts`), the traffic's trucks, patrol cars and bikes (`fleet.ts`), downtown (`downtown.ts`), its modelled fronts (`facade.ts`), the ring highway
  (`highway.ts`), the traffic's routes and lights (`routes.ts`), collision data, doors, the gun counter, the garage
  and the spawn (`solids.ts`), your car
  (`mycar.ts`), the driving rules (`drive-sim.ts`), target practice
  (`combat-sim.ts`), how the guns feel (`gunfeel.ts`) and their shapes (`gunshapes.ts`), the multiplayer protocol's checks (`protocol.ts`), the economy (`tycoon.ts`, the market square in
  `solids.ts`), the city's game (`catalog.ts`, `missions.ts` and the
  clock format in `ui.ts`, in `tests/game.test.ts`), Getting started and
  the save backup (`guide.ts`, `backup.ts`), the layout snapshot (nothing that exists moves, `tests/snapshot.test.ts`), the tile grid and the collision grid (`tiles.ts`, `boxgrid.ts`), building as you go (`tileplan.ts`, `tilebatch.ts`, `tilework.ts`), the outskirts' trees and the camera's bounds (`outskirts.ts`, `bounds.ts`), the building kits and recipes (`kits.ts`, `recipes.ts`), Liberty Bridge (`liberty.ts`), Harbour Bridge (`harbour.ts`),
  getting about (`places.ts`, `metro.ts`, taxis' drives in `routes.ts`, `ambience.ts`), the river's shape (`river.ts`), City view's free camera (`freecam.ts`: its keys, flying, mouse look, the wall and the ceiling; `freecollide.ts`: its bumps and `gap()`), the river's life, the river bus and boating (`riverlife.ts`, `riverbus.ts`, `riverroute.ts`, `boat-sim.ts`), how the traffic behaves (`traffic.ts`), the people on the sidewalks (`pedestrians.ts`), the live settings (`live.ts`), the buses' stops, the boats and the dusk (`transit.ts`, `boats.ts`, `dusk.ts`), The Trenches (`trenches.ts`, `projects.ts`, `commons.ts`, `grit.ts`, `streetwall.ts`, `avenue.ts`, `riverside.ts`, `waterfront.ts`, `nightmarket.ts`), Westlake Park (`westlake.ts`, `stadium.ts`, `parklife.ts`, `gardens.ts`), Uptown (`uptown.ts`, `highrise.ts`, `plaza.ts`, `plazadress.ts`, `boulevard.ts`, `boulevarddress.ts`, `kerbside.ts`, `skydeck.ts`, `skyline.ts`, `uptownlife.ts`, `streetlevel.ts`, `uptownsites.ts`, `streetlife.ts`, `wheel.ts`, Uptown North in `uptownnorth.ts`, the town car in `cars.ts`), the kart park's facility (`kartfacility.ts`), its clipping (`kartside.ts`, `camRoom()`, `tests/kartclip.test.ts`) and its crowd, marshals and podium (`kartcrowd.ts`), the walk camera's lens up close (`lens.ts`: the near plane in by the walls and by the fighters' bodies, City view's in low down and beside a building, people on the lens left undrawn), the blocks' lots pulled in never NaN (`insetPoly()`, `tidyPoly()` in `streetplan.ts`), how each tier smooths its edges and what a render target holds (`targets.ts`), the seam map, the clearing rule, the ground, the blocks' edges, the rolls, Southfield, the slivers by the highway, the lamps' mix, the ring avenue and the park's east walk (`seams.ts`, `landuse.ts`, `palette.ts`, `ground.ts`, `verges.ts`, `rolls.ts`, `southfield.ts`, `fringes.ts`, `lampmix.ts`, `ringstreet.ts`, `parkedge.ts`), the karts' frames and their driver (`kartframe.ts`), the aircraft's control surfaces and gear (`airframe.ts`), Palm Court and the mall (`mall.ts`, `mallinside.ts`), Crestmont (`terrain.ts`, `crestmont.ts`, `landscape.ts`, `coral.ts`, `estates.ts`, `mansions.ts`, `crestsites.ts`, `crestlife.ts`), the Docks (`docks.ts`, `docksport.ts`), the Neon Mile (`strip.ts`, `resorts.ts`, `stripmarks.ts`, `monorail.ts`, `striplife.ts`), Lot 9 and its tunnel (`lot9.ts`, `lot9homes.ts`), Endswood Estate, what's below ground and its decks, its blend and its life (`endswood.ts`, `underground.ts`, `endsblocks.ts`, `endsstreet.ts`, `endsdecks.ts`, `endsblend.ts`, `endslife.ts`), the raised highway's shape (`viaduct.ts`, `viapiers.ts`), its signs and what's under it (`viadress.ts`, `viasigns.ts`), the swing bridge (`swingbridge.ts`), the turn lanes and their arrows (`turnlanes.ts`), the country roads (`rural.ts`, `ruraldress.ts`, `ruralfence.ts`), the town streets' wear (`streetwear.ts`),
  the airport and its timetable
  (`airfield.ts`), flying your own aircraft (`flight-sim.ts`,
  `myplane.ts`), the merch looks and marks (`profile-data.ts`, `marks.ts`,
  in `tests/merch.test.ts`), the crowd's baked clips (`crowdclips.ts`) and Degen's skeleton, weights, head and hands
  (`skeleton.ts`, `body.ts`), his walking (`locomotion.ts`), the motion capture and its animation (`bvh.ts`, `mocap-build.ts`, `mocap.ts`, `movesim.ts`, `inertia.ts`, `motionmatch.ts`, `animator.ts`), the rubric of human movement over every clip and program (`human.ts`, `tests/human.test.ts`), what his body does about what he touches (`contact.ts`), the game's moments (`moments.ts`), the guns in his hands (`gunfit.ts`, `stance.ts`), what he carries (`inventory.ts`, `inventory-save.ts`), fists on the street (the guard held, `brawl-sim.ts`), his arms in first person with empty hands (`fparm.ts`: the elbow's reach, the fist, the sleeves), the sparring partners and the styles (`brawlsite.ts`, `fightsave.ts`), the fight clips' planted feet, footwork and rubric (`fightfeet.ts`, `fightrubric.ts`), a blow on the block picking `blockHit` (`tests/fight-figure.test.ts`), flow and a press on a frame no tick runs (`tests/fight.test.ts`, `tests/brawl.test.ts`), the head's follow-through (`follow.ts`) and his clothes not clipping (`wardrobe.ts`, the trunk's weights in `skeleton.ts`, `tests/clothing.test.ts`) and his accessories where they're worn (`tests/accessories.test.ts`), the unmasked faces (the ink on the face, the hair clear of the head and inside every hat, the crowd's share: `tests/faces.test.ts`), the suit's tailoring on the desktop only (`tests/tailoring.test.ts`). Modules that touch the DOM or `kit.ts` (canvas
  textures) can't load in Node; keep data a test needs in the DOM-free
  files.
- When you change a rule or move something in the city, run the tests and
  extend them: a new landmark's boxes and door, a new model's handling, a
  new road. Fix the code, not the test, unless the test was wrong.
- `npm run budget` (after `npm run build`) holds the start's download to
  its budgets (`scripts/budget.mjs`); the "Build site" Action runs it after
  the build.
- `npm run smoke` (after `npm run build`; `scripts/walk-smoke.mjs`) walks
  plays through walk mode in a headless Chromium, a scene a fresh page:
  home (in through Degen's front door, down the hall, out again), his
  garage's menu, his workshop's door (the same menu on its Kit tab), the stairs up to his
  roof terrace and down, the
  stash's card at his trunk, the fitting room at his wardrobe, the car
  (in at his garage, out through its door, a drive, out), on foot (walk,
  sprint, jump, crouch, the hub), the gun store's counter, the metro (the
  card, a ride, skipped), a kart race (a single race started and quit),
  flying (into your aircraft, rolling out), the gamepad (a made-up pad:
  the stick, A, Start, B) and the touch controls (made-up fingers: the
  stick, Aim, Gas); it fails on any page error, any NaN warning in
  the console (NaN geometry can black a real GPU's screen out,
  docs/stability-plan.md; the software renderer draws on regardless) or a
  step that didn't happen. `npm run smoke -- car,foot` runs only those scenes. `walk.ts` is the view and has no unit tests, so run it before and
  after changing walk mode; `SMOKE_SHOTS=dir` keeps a picture a step. It
  takes a few minutes in the software renderer, so it isn't in the Action.
- `npm run memcheck` (after a build and the texture bake;
  `scripts/memcheck.mjs`): the whole city built on a headless phone, held
  to `MEMORY_CEILINGS` (`targets.ts`), red on a page error or NaN; `--
  soak` adds the leak check. About 13 minutes (more with the soak), so it's
  run by hand or by the "Memory" Action, which only runs when started.
  `tests/targets.test.ts` holds the desktop's render targets (by formula)
  to their ceilings on every `npm test`.
- Browser checks (the widths above, walk and drive flows) are still done by
  hand with Playwright against `npm run preview`.

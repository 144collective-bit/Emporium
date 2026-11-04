# The kart park moves west, and the upgrade (the owner's call)

The owner wants Sector 7 Kart Park moved to the empty land west of the
raised highway, its facility made much grander, every clipping problem
found and fixed, and the karts better all round. Asked and answered on
2026-11-04, built in one long run overnight: every phase below is built in
a row on the work branch, each with its tests, before and after shots and
docs, committed and pushed as it goes; **nothing goes to main until the
owner has looked**.

## The owner's answers

- **Where:** the open land outside the ring highway's west side, north of
  the riverside avenue (ew0 past exit 8), west of exit 8's ramps. The
  park's public side faces south onto ew0; its fence keeps clear of the
  ramps' land (`rampLand()`, `RAMP_CLEAR`).
- **The circuit:** the same twelve-corner layout raced both ways, so lap
  records, ghosts and boards stay valid; moved, not redrawn (the local
  frame `u, v` moves with it). Every clipping problem found is fixed.
- **Getting there:** a new Kart Park station on the metro where it runs
  along the north bank avenue (ew3) west of the highway, a walk up to the
  gate. The old Kart Park station stays as the main line's north end,
  renamed Starlight Mall.
- **The old land** in the north-east goes back to open land, kept clear
  for a district later. Kart Road goes with it.
- **Name and signs:** Sector 7 Kart Park as before. Exit 8 becomes
  "Uptown · Kart Park"; exit 2 drops Kart Park ("Starlight Mall ·
  Sunridge").
- **Ground:** the park held flat, but its spectator banks and the approach
  shaped into the rolling land round it, so it looks dug into the
  landscape.
- **Facility (all four):**
  - **Bigger stands, a live crowd:** larger grandstands and banks; a
    crowd that cheers and waves flags as karts pass and when you overtake;
    flag marshals waving their flags.
  - **Podium and trophies:** a podium by the pits; after a race the top
    three karts park there, a trophy ceremony with confetti and a camera
    move, then the results card.
  - **Clubhouse and paddock:** a clubhouse in place of the hut (reception
    and café, a trophy cabinet showing the cups you've won, a roof
    terrace), team garages and a fuller paddock with karts being worked
    on.
  - **Entrance and night show:** a grand gate plaza and arch, a signed
    approach road, a car and coach park, big LED screens showing the race,
    floodlights and neon for night races.
- **Driving (three):**
  - **Start boost and slipstream:** a timed boost off the start lights, a
    slipstream tow behind a kart ahead, clearer drift boost stages (blue,
    orange, purple sparks).
  - **Splits and live gaps:** three sector times, a ghost delta at every
    sector, a live gap to the kart ahead and behind, a personal-best
    flash.
  - **Kart customising** (all free): a racing number and decal sets
    (stripes, flames, checks, the city's made-up marks), rims and tyre
    stripes, Degen's helmet and race suit, a drift-spark trail colour and a
    neon underglow at night.
- **Items mode:** pure racing stays the default. A switch in the hut's
  single race adds item boxes with three items: **Boost** (a turbo can),
  **Shield** (a few seconds where bumps and slicks can't spin you) and
  **Oil slick** (dropped behind; a harmless spin). Rivals use them too.
  Cups, time trials, lap records, ghosts and boards stay pure.
- **Rivals:** left as they are (they learn the items for the items mode
  only).
- **Clipping (all of it checked):** karts through the flyover's deck and
  supports, the tunnel and the barriers and each other; kerbs, run-off,
  armco, tyre walls and fencing through the track, the banks and each
  other; Degen through his kart; the chase camera through walls, the
  tunnel or the ground.
- **Process:** phases, built in a row overnight, held off main for the
  owner's review.

## Phases

1. **The move** (built) (the site, its roads, the metro, the old land): the
   park's frame moved (`X0`, `Z0` in kartpark.ts) onto the new land; the
   car park's loop and the drive in off ew0 in the street plan (traffic
   comes off exit 8 onto ew0 and in); Kart Road and the north-east land
   cleared (the outskirts' trees and ground fill in, its `KEEPS` gone); the
   metro's new Kart Park station on ew3's median west of the highway and
   the old one renamed Starlight Mall; the exits' names; places, the world
   map, the bounds the City view pans in, the seam map, the ground, the
   clearing rule and the rolls; the layout snapshot rewritten on purpose.
2. **Clipping** (built): a test for every kind of overlap (the track's surfaces
   against the supports, the deck's headroom, the tunnel's walls, every
   barrier, fence, stand, bank, tree and lamp; karts' boxes against the
   deck and tunnel in the sim; Degen's pose inside each kart; the chase
   camera's room in the tunnel, under the deck and by the stands) and the
   fixes for whatever they find.
3. **The facility** (built): the clubhouse (reception, café, trophy cabinet, roof
   terrace) in place of the hut; team garages and the paddock; bigger
   grandstands and banks shaped into the slopes; the podium; the gate plaza
   and arch, the signed approach, the car and coach park; LED screens,
   floodlights and neon.
4. **The live crowd and the podium ceremony** (built): fans cheering and waving
   flags as karts pass and when you overtake, marshals' flags (yellow after
   a spin, blue, the chequered at the line); after a race the top three on
   the podium with trophies, confetti and a camera move, then the results.
5. **Driving** (built): the start boost, slipstream, drift stages; sector splits,
   the ghost delta per sector, live gaps ahead and behind, the
   personal-best flash.
6. **Kart customising** (built): number, decals, rims and tyres, helmet and suit,
   spark trail and underglow, in the hut's Karts tab; the save carries them
   (a new save version, older saves upgraded).
7. **Items mode** (built): item boxes on the circuit, the three items, the HUD's
   item slot and the touch, key and gamepad button, rivals using them,
   single races only.
8. **Polish and performance** (built): bench views, phones, the boot budget, the
   docs.

## What Phase 1 built

- `kartpark.ts`: the frame's corner moved to `X0` -360, `Z0` -130, so the
  fence runs x -374 to -262, z -146 to -26, clear of exit 8's ramps' land
  (`rampLand()`, tested). Kart Road comes north off ew0 at `DRIVE_X`
  (-422.5, crossing `kart-in`) and runs east along the fence past the gate;
  the car park's loop is west of the fence. Traffic drives them off exit 8
  and out along ew0 (`tests/routes.test.ts`).
- The old land: its keeps went (`KART_RECTS` are the new land's), and the
  outskirts' trees fill it in. So the open land's trees stay as thick, the
  old rects are `KARTS_GONE` in `landuse.ts` with the new flag `gone`
  (counted when the densities are measured, never kept off), and the new
  land's keeps carry `since`. The woods' box (`WOODS_OFF` in outskirts.ts)
  is frozen where it was, so the woods stand where they stood. About two
  hundred pines gave way to the park on its new land.
- The metro: the old station is `starlight` (Starlight Mall). A new `kart`
  station (Kart Park, `KART_STATION_X` -246) is on the north bank avenue's
  median west of the highway, raised with the line's climb over the deck.
  The train stops there both ways (`STOPS`, 16 legs, a round trip of about
  424 s). The walk from its door up to the gate is about 140 tiles; Phase 3
  signs that walk.
- Exits: 2 is "Starlight Mall · Sunridge", 8 is "Uptown · Kart Park".
- The bench view `karts` moved with the park. The taxi test allows the far
  west for it (to Crestmont's grand hotel about 75 s, to the overlook about
  98 s).
- The route test now reads an avenue's lanes pushed out by a wide planted
  median (`wide()` in routes.ts). It had passed on the Strip's boulevard by
  luck: the routes' seeded drives came out differently with the new streets.
- The layout snapshot was rewritten on purpose. Only the kart park's spawn,
  roads, loop, bays, fence, hut door, circuit and gate moved.

## What Phase 2 built

The test is `tests/kartclip.test.ts`. What it found, and the fixes:

- **The tunnel:** the tube's inside wall stood 0.3 past the kerb, and the
  sim lets a kart's middle reach the kerb's edge, so its side went 0.18
  into the wall. The tube is now `TUBE_R` (kerb's edge plus 1.15, the
  inside 0.85 past it), its feet carried down to the run-off's slope.
- **The flyover:** the deck reached 0.35 past the kerb, so a kart at the
  kerb's edge stuck 0.13 out through the railing. The deck is now
  `DECK_OUT` (kerb's edge plus 0.8), its columns out with it
  (`SUPPORT_OUT`).
- **The barriers:** a kart was put back only half a tile past the
  run-off, after its side had gone a tile into the tyres and the armco.
  `RESET_AT` is now inside the run-off's edge, and the tyre walls and the
  armco stand just past where a kart can reach, from every stretch of
  track (one tyre wall had stood 5.1 from another stretch).
- **Karts into karts:** karts bumped as one circle of 0.5, but they're
  1.3 long, so a nose went 0.3 into the kart ahead. They now bump as two
  circles each, nose and tail (`KART_BODY`).
- **The camera:** behind a kart in the tunnel it swung out through the
  tube in the turns, and under the flyover it went up into the slab at
  speed. `camRoom()` keeps it inside the tube, under the deck and over
  the ground.
- **The furniture:** the marshal posts and the boards were placed in the
  drawing. Nothing kept the boards off the armco, the banks' slopes or
  each other, and some turns' numbers were missing or doubled. They're
  now `kartside.ts`: every turn numbered once each way, everything clear
  of everything, and the chevrons on the right of the track turned round
  to face it (they had faced away).
- **The driver:** his knees sit behind the wheel's rim and above the
  floor, and his elbows and knees stay inside the kart. Already true;
  now tested.

## What Phase 3 built

- **The clubhouse** (`SITE.hut` in kartcircuit.ts, `CLUBHOUSE` in
  kartfacility.ts) replaces the hut on the same door: twice as long, two
  storeys. Downstairs is the reception and café behind a glass front on
  the plaza, with a canopy over the door. Upstairs, the lounge's long
  window looks over the pits. On the roof, a terrace behind a glass
  balustrade with umbrellas and people, reached by stairs up the west
  side. CLUBHOUSE is lit in neon over the door and on the pits' side.
  The trophy cabinet beside the door shows the cups you've won, gold,
  silver or bronze by your best overall place (`KartPark.trophies()`,
  painted from the save at the boot and after every race). The café's
  tables are out on the plaza (`CAFE`), with people eating at them. The
  door's prompt and the menu now say "Clubhouse".
- **The garages:** each bay is a team's, its colour on the header and
  the back wall (`TEAM_COLOURS`), a roller door's drum over the front.
  The teams' box trucks are parked down the paddock's walk
  (`TRANSPORTERS`).
- **The grandstand** is bigger (`GRANDSTAND`: 42 long, 12 tiers, the roof
  at 7.4), its people with it.
- **The banks** are taller (2.6) and reach back to the fence, and their
  back slopes carry on outside it as berms down to the lawn (`out`,
  `bankLand()`, `bankAt()`), so the park looks dug into the land round
  it. The fence rides over their tops. Walking follows them outside the
  fence too (`BANKS_AREA`, walk.ts), and the outskirts' trees keep off
  them. The west bank is shorter, to keep clear of the car park's loop.
- **The podium** (`PODIUM`, `PODIUM_RECT`) stands on the plaza west of
  the gate's path: three steps (first in the middle and highest, second
  on its west, third on its east), each with its number and a band of
  gold, silver or bronze. Behind it is a backdrop with PODIUM in gold
  neon, with a flag either side. Phase 4 puts the top three's karts on it.
- **The entrance:** flags on poles up both sides of the gate's path with
  bunting across (`FLAGS`). Two plaza benches moved off the podium's
  spot.
- **The approach:** a KART PARK totem on the corner where the drive
  leaves ew0 (`TOTEM`), signs on ew0's verge facing the traffic both
  ways (`APPROACH_SIGNS`), and a coach park in a lay-by off Kart Road's
  south side with three coaches (`COACH_LOT`, `COACHES`).
- **The LED screens** (`SCREENS`): the garages' old one, one on the north
  bank's top behind its crowd, and one on the east bank's top. All three
  show one live picture (kartpark3d.ts `board()`): in a race, its name,
  the lap and the order with each kart's colour and yours lit, a few
  times a second; between races, the park's name.
- **Floodlights:** two more (`FLOODLIGHTS`), and the two by the
  grandstand moved to its new ends. The clubhouse's eaves, the canopy,
  the screens and the podium carry neon for night races.
- Tests: `tests/kartfacility.test.ts` (the clubhouse, the podium, the
  café, the flags, the screens, the approach, the berms) and
  `tests/kartclip.test.ts`, which still holds every piece of trackside
  furniture clear of the new pieces.

## What Phase 4 built

The rules are `kartcrowd.ts` (DOM-free, tested in
`tests/kartcrowd.test.ts`); kart.ts plays them.

- **The fans cheer:** two new crowd rows, `cheer` (standing, over a
  captured idle) and `sitcheer` (seated), with both hands up and pumping
  twice a second and the head tipped up after them (acts.ts
  `cheerOver()`). A fan looking, chatting or sitting cheers while a kart
  goes by within `FAN_REACH`. Everyone near you cheers for a moment when
  you overtake (`WAVE`), and the whole park cheers through the ceremony.
  The crowd asks `CHEER.fn` in life.ts, which the race sets while it's on;
  its first check is a box round the park, so it costs nothing elsewhere.
- **The marshals' flags** (`marshalFlags()`, shown through
  `KART_VIEW.flags`, waved on kartgrounds3d.ts's tick from each post's
  track side):
  - green round the circuit for the first seconds after the start;
  - yellow at the posts just up the track from a spin or a put-back, for
    a few seconds;
  - blue at a post where a kart a lap down has a faster one closing on
    it;
  - the chequered flag at the post nearest the line once the leader's on
    the last lap.
  Nothing between races.
- **The podium ceremony:** after a race (not a time trial), once the top
  three are home or ten seconds after you finish:
  - their karts stand on the podium's steps facing the plaza
    (`podiumSpot()`);
  - a gold trophy rises over the winner and turns;
  - confetti flies from the backdrop's corners and flutters down over
    the plaza (`confettiAt()`);
  - the camera moves from the plaza in on the winner, then up and back
    (`ceremonyCam()`);
  - after eight seconds the results card comes up.
  Under reduced motion the camera holds its first frame and there's no
  confetti. The test holds the camera clear of everything solid and the
  confetti landing on the plaza.

## What Phase 5 built

- **The start** (`START` in kart-sim.ts, the player's only):
  - gas down between 0.85 and 0.12 seconds before the GO, and held
    through it, launches you with a boost ("Rocket start!");
  - gas held from more than 1.7 seconds before bogs you down for a
    moment ("Bogged down");
  - anything else is a plain start.
  The rivals start as they always have.
- **The slipstream** (`SLIP`, everyone's): a kart right behind another
  (1.1 to 7 tiles back, in its line, going its way, at over 60% of its top
  speed) charges the tow over 0.8 s. It then runs 7% faster at the top and
  picks up 1.3 times as quick, until it pulls out of it. The HUD says
  "Slipstream" when yours is on.
- **The drift's stages** keep their timings; the sparks are now blue,
  orange, then purple (kart.ts `SPARK`), and the HUD's drift meter matches.
- **Splits:** the sim announces the end of each lap's first and second
  thirds for the player (`split` events, `SECTORS`); the line is the third.
  The HUD shows each split under the clock for three seconds with its
  delta to your fastest lap's splits here, green ahead and pink behind.
  Before you have one, the delta is to par's lap in thirds. The save keeps
  your fastest lap's splits per course and class (`karts.splits`,
  `keepSplits()` in tycoon.ts, cleaned in `cleanSave()`).
- **Live gaps:** the gap in seconds to the kart ahead and the one behind
  in the order, with their names, under your place.
- **Personal best:** a lap faster than your record coming in (and every
  lap since) flashes the clock gold and pops "Personal best!".
- Tests: `tests/kartdrive.test.ts` (the start both ways, the slipstream in
  line and out of it, the splits' order). The existing race tests still
  pass with the tow on everyone.

## What Phase 6 built

Your kart's look is all free, in the clubhouse's Karts tab under the
paints (a "Look" section, a row a part):

- **Racing number:** 1 to 99, on the nose's roundel (two digits fit now).
- **Decals:** none, racing stripes, flames, checks, or the diamond (the
  city's own mark), in a colour of their own, on the side pods' outer
  faces a hand off them.
- **Rims:** a cap on each wheel's face in their colour. **Tyre stripe:**
  a ring on each sidewall, or none.
- **Helmet** and **race suit:** in races you wear a helmet in its colour
  (wardrobe.ts `racehelmet`, the soldier's shell; the Outfit's `helmet`)
  and a track suit in the suit's colour, with no hat, hood, bag or wings.
- **Spark trail:** your boost flames' colour.
- **Underglow:** a soft pool of its colour under the kart in night races
  (and on the show kart in the pits), or off.

The look is `KartLook` in mykart.ts (`DEFAULT_LOOK`, `cleanKartLook()`,
`LOOK_COLOURS`, `KART_DECALS`). It's kept in the save's `karts.look`,
changed by `setKartLook()` in tycoon.ts and drawn by karts.ts's `dress()`
/ `glow()`. There's no new save version: a save from before it is cleaned
to the stock look (`tests/kartlook.test.ts`). The rivals keep their own
looks.

## What Phase 7 built

- **The switch:** the clubhouse's single race has Items Off / On; pure
  racing is the default. Cups, time trials and the daily challenge never
  have items. An items race keeps no lap record, splits or personal best
  (`finishKartRace()`'s `items`).
- **The boxes** (`kartitems.ts` `BOXES`, `BOX_ROWS`): three rows of four
  across the track, on the straight after the line, the west side past the
  esses and the east sweeper's exit. They're on plain asphalt, clear of the
  pads, the jump, the line, the deck and the tunnel (tested). A kart with
  nothing in hand that drives through one takes an item (`drawItem()`:
  the leaders mostly oil, the back markers mostly a boost, a shield either
  way), and the box comes back three seconds later.
- **The items** (`ITEM`):
  - **Boost:** a turbo can, 1.3 s at 1.35.
  - **Shield:** 5 s where bumps, rams and slicks can't spin you; the sim's
    `spin()` shrugs them off and says `blocked`.
  - **Oil slick:** dropped behind you. A kart that runs over it spins out
    for 0.9 s and the slick is gone. Slicks last 25 s, at most ten at once.
- **The rivals** use them (`aiWants()`, `AI_USE`): a boost with a clear
  run ahead (`clearAhead()`), a shield with a kart or a slick close, oil
  with a kart close behind, or anything held too long.
- **On screen:** the boxes are glowing cubes turning over the track
  (still under reduced motion) and gone while taken; slicks are dark
  pools; a shield is a cyan bubble. The HUD's slot (`data-kart-slot`)
  shows what's in hand, and the pops say what you got. The item is used
  with **E**, the gamepad's **X** or the touch **Item** button
  (`data-kart-item`: `touchlayout.ts` slot `b2`, shown only in an items
  race through `.has-items`; keymap.ts job `item`). The wheel family's
  arranging screen now shows the kart's layout, the one with the most
  buttons.
- Tests: `tests/kartitems.test.ts` covers the rows, the draw, three items
  races (every item used, slicks spinning karts, everyone home), your
  button (once a press) and no records.

## What Phase 8 built, and what to look at

- **Checked:** `npm test` and `npm run test:wide` (1169 each), the type
  check, the build, the budgets (the boot 716.3 of 730 KB gz, from 711.1
  before this plan) and a boot in a headless browser.
- **Races in a real browser:** two runs to the results through
  `__city.walk.race()` (`?fps`), each with no script errors (only the
  blocked outside fetches and the NaN warning that was there before):
  - a single race to the podium ceremony;
  - an items race at night, showing the HUD's gaps, slot and split.
- **Phones:** the LED screens repaint twice a second instead of four
  times. The new people (the café, the terrace) are half left out like the
  rest, the marshals' flags and the item boxes are instanced, and the
  confetti is a few hundred points.
- **Shots:** before and after each visual phase are in
  `docs/blend-shots/kart-*`. The crowd, the flags, the ceremony and the
  items only show in a race, so they're not in the sheets; the headless
  runs' frames show them.

To look at in the morning (nothing's on main):

- the park from over exit 8 (`kart-new`) and the plaza from the gate
  (`kart-plaza`);
- a single race, forward, to see the podium ceremony;
- the Look section on the clubhouse's Karts tab;
- an items race;
- the rocket start (gas just before the GO).

Known limits, left for you to decide:

- The walk from the metro's new Kart Park station to the gate is about
  140 tiles across open land (there's a sign at the station door). A
  paved path, or a station nearer the gate, would be a later step.
- In the city, your own kart's driver (drive.ts) wears your everyday look,
  not the helmet and suit; those are the races' only.
- The ceremony's karts appear on the podium straight from the track (a
  cut, not a drive there).
- The fans cheer with both hands; there are no hand-held flags in the
  crowd (that needs a new held item in the wardrobe).

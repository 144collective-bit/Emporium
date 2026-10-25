# City life plan: behaviour and animation at no cost in memory

The owner's brief (2026-10): improve the city while keeping the cost of
performance low. Functionality, animations and the behaviour of vehicles
and people, not more buildings, textures or districts. (The owner's standing
rule holds: the performance foundations come before any more districts.
Nothing here is a district; everything here is behaviour on things the city
already draws.)

## Where it needs it most

Measured against what a visitor sees first (the home view, then walking or
driving downtown), the city looks finished but moves like a model railway:

- **Traffic** (`life.ts`): every car's lights are the same brightness
  whether it brakes, waits or drives; nobody indicates before a turn; the
  wheels never roll (the traffic is instanced, so its wheels are stuck in the
  geometry); the bodies never pitch or lean; a whole queue pulls away from a
  green light in the same instant at the same rate; the buses never stop;
  a car held up by you waits in silence for ever.
- **People** (`life.ts`): walkers loop round their own block for ever and
  never cross a street, at any light; nobody notices you, the rain or the
  hour; the only moves are the baked clips (walk, idle, look, chat, sit).
- **Your car** (`drive.ts`, `cars.ts`): the lights are fixed boxes (no
  brake lights, no reversing lights, no indicators); no horn; the handbrake
  slides in silence and leaves no mark; at night it lights nothing ahead.
- **Time and weather** are well made (the sky, rain, the wet-road sheen,
  lamps) but nothing *reacts* to them: the lamps all switch on at once, the
  trees stand rigid in the wind, the crowd is as thick at 3 am as at 6 pm.

Everything above can be fixed as behaviour on meshes the city already draws,
with no new textures, no new draw calls and (nearly) no new geometry.

**Not character animation** (the owner's call, 2026-10): the animation
rebuild (`docs/animation-plan.md`) owns how Degen and the crowd move. This
plan only decides *what they do and where*: which of the existing clips a
crowd person plays and where they stand, never a new pose, clip or rig
change on Degen. Anything that poses Degen (sitting on a bench, leaning
on a railing) waits for the rebuild and becomes a state of its animator.

## Rules of thumb: what's cheap here

- **Behaviour on existing instances is free.** The traffic, the crowd and
  the lamps are already instanced meshes whose matrices are written every
  frame. Changing *what* is written (a pitch, a lean, a colour) costs
  nothing more than today.
- **Per-instance colour over new meshes.** `InstancedMesh.setColorAt()` on
  the traffic's tail-light mesh is 3 floats a car; a new mesh is a new draw.
- **One uniform or one attribute over a new material.** Every new material
  variant is a new shader program (a stutter the first time it's seen:
  `docs/performance-plan.md`). Drive a change through a uniform on a shared
  material (`nightU` in `kit.ts` is the pattern) or a small attribute.
- **New crowd moves are rows in the baked-clip texture** (`crowdclips.ts`,
  `CLIP_DEFS`), baked when the site is built. A clip is about 60 rows of 34
  bones: kilobytes.
- **Sound is synthesised** (`sound.ts`): a horn, a screech or a hiss is a
  few oscillators, never a file to download.
- **Rules go in DOM-free code with tests first** (the sims' pattern):
  anything that decides *when* (a car brakes, a walker crosses, a bus
  dwells) is a pure function the view only draws.
- **Nothing extra in the shadow map, nothing extra in the outline
  pre-pass.** Lights and glows are FX-layer, `fx()`; small particles are
  near only and capped.
- **Measure.** `?fps` (draws, triangles, memory) and `?bench` before and
  after each phase; the numbers should not move. Phones first.

## What not to do (what costs memory or draws)

- More cars, people or trees than `TIERS` allows.
- New canvas textures or atlases (texture memory is 60 MB already).
- Real reflections, screen-space effects, more bloom levels.
- Audio files.
- Separate meshes per car for moving parts: keep the traffic instanced.
- Anything per frame that walks every car against every car beyond what
  `life.ts` does today (its following check is already n² over ~40 cars;
  fine, but don't add a second one; share its pass).

## The phases (each small, each with the owner's sign-off)

Effort: S a day or less, M a few days. Memory: what each adds, honestly.

### Phase 1: traffic that behaves (S-M, zero memory): built

The rules are `traffic.ts` (DOM-free, tested in `tests/traffic.test.ts`);
`life.ts`'s traffic tick draws them. What it added: no new draw calls, no
new geometry, 6 instances a car in the tail-light mesh (was 2), 3 floats of
colour each; one new sound (synthesised). Checked in headless Chromium at
night on the software renderer: brake lights bright on a car held at a
light and dim once it rolls, headlights on at dusk, the amber indicator
under the lamp on the turning side, a car stopping short of Degen.

What was learnt: a lit lens laid *over* one of a model's own small
details is swallowed by the ink outlines of the detail behind it (the
outline pass draws the solid scene's edges over the FX layer, and a box the
size of an outline is all edge). Lit lenses go on the flat of the body,
clear of bezels, and bigger than an outline (`turn` in cars.ts).

1. **Brake lights.** The tail mesh gets `instanceColor` over a white
   material: bright red when a car is slowing or holding at a stop
   (`braking()`), dim otherwise. 3 floats a light.
2. **Headlights by night only.** Head lamps and the beam pools faint by day
   (`lit` day level down), full at dusk. Zero memory.
3. **Pull-away that peels.** Each car gets a reaction time (0.3-0.9 s,
   `reactionOf()` from its number) before it moves off a green or follows
   the car ahead (`pullAway()`), so a queue unrolls from the front. Zero
   memory.
4. **Bodies that pitch and lean.** From each car's own acceleration and yaw
   rate (`bodyMotion()`), a small pitch under braking and a roll in turns,
   written into the matrix it already gets (level again when a car is put
   back on the road elsewhere, `resetBody()`). Zero memory.
5. **Indicators before turns.** A route is a polyline with its corners
   already rounded in (`Route.pts`); `turnsOf()` finds its turns once
   (runs of heading change the same way adding up to `TURN_SWING` within
   `TURN_LEN` tiles; a long gentle bend like the highway's corners isn't
   one), and `indicating()` says which way a car is signalling from
   `TURN_LEAD` before a turn to its end (the turn it's in before the one
   it's coming up to). The lenses ride in the tail-light mesh: four more
   instances a car, amber when the flash is on (`blinkOn()`, 1.5 Hz, each
   car its own phase), folded to nothing otherwise, under each lamp on
   the body (`CarGeometry.turn`).
6. **A horn when held up.** A car stopped behind you (`walker`) for more
   than about 2 s toots once, then again later (`hornDue()`; `horn` in
   `sound.ts`, quieter the further off, through the sound switch, never in
   reduced motion; `LifeOpts.horn`, wired in index.ts once the sound
   exists). Zero memory.

**1b. Wheels that roll (M, small memory).** The traffic's wheels are part
of each model's `detail` geometry. A per-vertex attribute marking wheel
vertices with their axle centre (4 floats, wheel vertices only) and a
per-instance `roll` angle (1 float a car) let the shared detail material's
vertex shader turn them (`onBeforeCompile`, one program for every model).
Front wheels can steer the same way from the car's turn. The one real
geometry change in this plan: well under a megabyte over every model.

### Phase 2: your car's feel (S, zero memory): built

The rules are in `drive-sim.ts` (`carLights()`, `gearOf()`, `skidding()`,
tested in `tests/drive.test.ts`); `drive.ts` and `createCar()` in
`cars.ts` draw them. What it added: your car's five light materials (own
to the car, swapped on its lenses: no new draw while nothing is lit; one
draw a side while an indicator flashes), one fixed skid-mark mesh of
`SKID_N` quads (240) with one small shader, two glow points for the
headlights' pool and the brake wash, one synthesised tyre layer. Checked
in headless Chromium: the gearbox climbing 2, 3, 4 and R in reverse, the
white reversing lenses, the amber indicator at a stop with the wheel
turned, the headlight pool at night, dark marks under both rear tyres
through a handbrake slide by day, fading after.

1. **Lights that mean something.** Brake lights while braking from a roll
   or with the handbrake on the move, reversing lights in reverse, the
   indicators with the wheel below `SIGNAL_SPEED` (a turn, not a lane
   change) and at a stop, held `SIGNAL_HOLD` after it straightens so they
   don't flicker with the stick; `blinkOn()` (traffic.ts) flashes them. The
   lenses follow the time of day through `lit` (headlights faint by day).
   No manual indicators (Q and E are the animation plan's peek keys,
   `docs/animation-plan.md`); the owner's call if wanted, on other keys.
2. **A horn.** H, the Horn button on touch screens (over the Brake pedal,
   your car's only: `.in-car`), the gamepad's left stick pressed; the
   traffic's `horn` sound at full gain, at most twice a second.
3. **The handbrake leaves a mark.** `skidding()` is the tyres' sideways
   speed (or the handbrake on at a roll): the `tyres()` screech in
   sound.ts follows it, and marks are laid under the rear wheels, a piece
   every 0.15 tiles, fading over `SKID_FADE` (7 s); the oldest is reused.
   None under reduced motion. What was learnt: the marks were first
   multiply-blended quads, and came out light grey: the blend isn't
   honoured in the post chain's target. They're dark rubber with an alpha
   per vertex instead (one small shader).
4. **Headlights on the road at night.** Two glow points (the traffic's
   beam pools' pattern, dark by day through `lit`): the pool ahead of the
   nose, and a faint red wash behind while braking. Only while driving the
   car.
5. **Engine that shifts.** `gearOf()`: four gears up the speed range
   (`GEARS`), the revs climbing in each and dropping at the shift; the
   gear readout shows 1-4, R and N.

### Phase 3: people who notice (S-M, zero memory): built

The rules are `pedestrians.ts` (DOM-free, tested in
`tests/pedestrians.test.ts`); `life.ts`'s people tick and `walk.ts` draw
them. What it added: nothing drawn that wasn't (the crowd's instances
change clip and place; a walker gone home or a sitter gone in is an
instance not set that frame), one small table of crossings worked out at
the boot from the street plan (44 today), a list of 53 benches. Checked
in headless Chromium: walkers waiting at kerbs and crossing from their
corners when the lights hold the cars (up to five at once), one stopping
as Degen passed.

1. **Crossing with the lights.** `crossingLinks()`: a walked block's
   corner to another's across one street at a lit junction (the zebra),
   never an avenue (`LINK_MAX`), never through a junction's middle; a
   triangle's corner sits short of the junction, so its crossing is a
   little skewed. A walker passing a corner with a crossing takes it by
   their own pattern (`takesCrossing()`), stepping off only while the cars'
   light is red with time to get over (`walkLight()`, `redLeft()`,
   `CROSS_PACE`, `CROSS_MARGIN`), else waiting at the kerb (giving up after
   25 s), then joining the other block's lane at the corner they arrive
   at, the same way round. Downtown's twelve blocks all join up, so a
   walker wanders the whole of it. What was learnt: a walker's side index
   has to be right from the first frame, or the first frame reads as a
   corner passed wherever they stand.
2. **Stepping aside for you.** `noticing()`: a walker within `NOTICE` of
   you (further for your car, `walker.r`) stops, turns to face you (the
   `idle` clip) and carries on `NOTICE_HOLD` after you've passed; not in
   the middle of a crossing. Sitters don't glance up: there's no clip for
   it yet (a new row in `CLIP_DEFS` when wanted).
3. **Hurrying in the rain.** `hurry()`: up to 40% quicker as the rain
   comes on (the walk clip plays at its stride, so the feet stay planted);
   the benches' sitters go in past 0.6 of rain.
4. **The hour.** `Env.hour` now carries the city's hour (sky.ts).
   `outAtNight()`: from 1 to 5 every other walker has gone home. The
   evening's crowd gathering round the square and the club was left out:
   the same count stays spread round the blocks.
5. **Sit down: held back.** It poses Degen, so it belongs to the animation
   rebuild (a seated state of its animator, with the bench's seat as the
   hips' height). The data is in: `BENCHES` (the square's, the pocket
   parks', the outer squares', The Block's) with `SEAT_H`, and the crowd's
   sitters are told apart (`bodies.people[].act`) so a free seat can be
   found (its middle or an end, clear of them). It was built and checked
   here, then taken out again before the rebuild started.

### Phase 4: buses, boats and the weather's small reactions (S-M, small memory): built

The rules are `transit.ts` (the buses), `boats.ts` (the river) and
`dusk.ts` (the lamps, the thunder, the vents, the wind), all DOM-free and
tested (`tests/transit.test.ts`, `tests/boats.test.ts`,
`tests/dusk.test.ts`); `life.ts`, `world.ts`, `sky.ts` and `transit3d.ts`
draw them. What it added: the shelters (30 sites of a dozen boxes each,
near only, about 3,500 triangles in all), two moored boats (two more
groups like the three that sail), one mesh of six points for the steam,
a colour per lamp on the halos and pools (some 14 KB), and three
synthesised sounds. The trees' sway costs nothing: it rides in the
canopies' uv, which the shared paint never used. Checked in headless
Chromium: a bus slowing in to the kerb, halting with its front a third of
a tile before the stop with its brake lights on, and standing its dwell;
the shelter by day and lit by night; the lamps trickling on over half a
minute after a jump to night; the moored boat past the jetty's end; the
canopies moving between two frames in the rain while the paving held
still; the steam's points in place by the vent.

1. **Buses that stop.** `BUS_STOPS`: along every avenue in town (the
   ring, the bank avenues, Trench Avenue), each way, every `STOP_GAP`
   (32) tiles or so, in the kerb lane, `STOP_CLEAR` (9) from any
   crossing, never on a bridge, never where something solid stands on the
   sidewalk; 30 today, and every one is passed by some route.
   `routeStops()` finds where a route passes them in their direction, in
   the kerb lane or the lane inside it; `pullIn()` eases a bus in the
   inner lane over to the kerb through the approach and back out after
   (`PULL_IN`, `PULL_OUT`), so the cars in the inner lane pass it and
   those behind it in the kerb lane wait. `busStep()`: slowing in from
   `APPROACH` (12), a halt with the front at the stop, a dwell of `DWELL`
   (4-7 s, the bus's own) with the brake lights on and the doors' hiss
   (`doors` in sound.ts) at the open and the shut, then on; the stop just
   left counts again once it's well past it, and a bus put back on the
   road elsewhere starts afresh. The shelter (`transit3d.ts`): two posts
   and a roof, a back panel (not on phones), a bench and a sign post with
   its lit flag along the street, a hair along the kerb from any lamp
   post in its way. Not solid: it's open, and you walk through it (a
   footprint would be the stops' data to add, if wanted).
2. **Boats with a horn.** `BRIDGES` (every road over the river, from the
   street plan) and `hornDue()`: once a bridge, `HORN_AHEAD` (10) before
   it, either way (`boatHorn` in sound.ts, quieter the further off).
   `cruise()` eases each boat's speed between about 0.55 and 1 of its
   own, and `wakeOf()` trailed the wake by it (longer, wider and brighter
   the faster; each wake its own material). Since the water plan's step 3
   the wakes are the water's own (`wakes.ts`, `docs/water-plan.md`) and
   `wakeOf()` is gone. `MOORED`:
   two boats tied up past a jetty's end (one on each bank), riding the
   water, clear of the three lanes the others run in.
3. **Lamps that come on one by one.** `lampGlow()`: each lamp has its
   moment in the dusk (`SWITCH_FROM` 0.08 to `SWITCH_TO` 0.55 of the night
   level, by its seed), then its own delay (up to `TRICKLE`, 25 s: a dusk
   that comes in a jump, from the Time control, still trickles) and a
   flicker as it strikes (`flickerOn()`, `FLICKER_ON` 0.9 s). The halos
   and pools carry it (a colour per point, a colour per instance: the one
   new memory here); the bulbs, in the Batches' shared neon, come up with
   the night as before. A visit that starts at night finds them on (the
   first frame sets them without the trickle), and reduced motion leaves
   them lit together.
4. **Trees that sway** (desktop only). The plan's `sway` attribute would
   have cost half a megabyte; instead `Batch.instances()` writes each
   canopy vertex's sway into its uv (`SWAY` 0.08 at the top, 0.4 of that
   at the foot, -1 as the mark; the shared paint has no texture, so the
   uv was free), and `injectWind()` (kit.ts) swings it in the shared
   paint's vertex shader and in the ink outlines' normal pass (post.ts),
   so the outlines follow; `windStrength()` is stronger in the rain,
   `updateWind()` feeds it each frame. Phones' canopies carry no sway.
   Still under reduced motion (the time holds). What was learnt: the
   normals' lengths were tried first (zero memory too), but merging a
   tile's geometry re-normalises them.
5. **Steam from the vents.** `VENTS`: two to each of The Trenches'
   streets, in the right-hand lane, clear of the junctions (`ventsNear()`
   picks the `VENT_N` nearest the camera); `puff()` is one rising, growing,
   fading puff on a `PUFF_LEN` cycle. One mesh of six points with a small
   shader (size and alpha per point, the glow texture), in the FX layer,
   at night within `VENT_REACH` of a vent; none on phones.
6. **Thunder, now and then, in rain.** `stormStep()`: in rain past
   `STORM_RAIN` (0.65) a strike every `STRIKE_GAP` (18-55 s, seeded): the
   sky brightens softly to `FLASH_PEAK` (0.4, towards a pale lavender,
   never white; the fog, the hemisphere light and the water follow it)
   over `FLASH_LEN` (0.7 s), and the rumble (`thunder` in sound.ts: a long
   roll of low noise) follows `RUMBLE_DELAY` (1.2-4 s) later. sky.ts runs
   it (`storms`), off under reduced motion.

## Suggested order

Phase 1 (built) → Phase 2 (built) → Phase 3 (built) → Phase 4 (built). 1b
(rolling wheels) next if the owner wants it: it's the one shader change.

## What has to keep working

- `?fps` and `?bench` numbers (draws, triangles, memory) within noise of
  today's, on the phone tier first.
- Reduced motion: no traffic, so nothing here plays; sounds stay off until
  the visitor turns them on.
- The snapshot: nothing moves. Bus stops and benches are new data, not
  moved things.
- Every rule DOM-free and tested (`tests/traffic.test.ts` for Phase 1 and
  Phase 3's rules; `drive-sim`'s tests for Phase 2's).

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

### Phase 2: your car's feel (S, zero memory)

`drive.ts` and `createCar()` in `cars.ts`; the rules in `drive-sim.ts`.

1. **Lights that mean something.** The car's own tail material brightens
   under braking; reversing lights come on in reverse; indicators flash
   with the steering below walking pace and when stopped (and from a key,
   Q/E, if the owner wants manual ones). The car's materials are its own
   already, so this is a colour write a frame.
2. **A horn.** H, or a touch button beside Get out; the gamepad's left
   stick press. Traffic doesn't react (it already stops for you); people
   nearby look (Phase 3).
3. **The handbrake leaves a mark.** A tyre screech while sliding (synth),
   and skid marks: one fixed ring buffer of about 240 dark quads in one
   mesh, laid under the rear wheels while the slide is on, fading over a
   few seconds; the oldest is reused. Fixed, tiny memory; one draw. Near
   only; none under reduced motion.
4. **Headlights on the road at night.** Your car gets the traffic's beam
   pool (`beamPos`'s pattern): an additive glow sprite ahead of the nose,
   and the brake lights' red wash behind when braking. Zero memory.
5. **Engine that shifts.** The synth engine steps its pitch through four
   gears as the speed climbs (the gear readout already exists). Zero memory.

### Phase 3: people who notice (S-M, zero memory)

`life.ts`'s people tick; the crossing rules in `traffic.ts` beside the cars'
(they read the same lights).

1. **Crossing with the lights.** At a block's corner next to a crossing,
   a walker on the outside lane may step over to the next block's loop
   while that street's cars have red (`lightState()`), waiting at the kerb
   until they do. The crossings and the junctions are street-plan data
   already. Cars already stop for red; walkers never meet them. Walkers
   then wander the whole downtown, not one block each.
2. **Stepping aside for you.** A walker within a tile of Degen (or your
   car) stops, turns to look (the `look` clip) and carries on when you've
   passed; someone sitting glances up. The crowd clip is swapped, nothing
   posed on the CPU.
3. **Hurrying in the rain.** Walkers' speed up by 40% (the walk clip's
   stride keeps their feet planted), the benches' sitters go in (faded out,
   back when it clears). Zero memory.
4. **The hour.** Fewer walkers late at night and more around the square,
   the market and the club in the evening (the same people, moved to lanes
   where the life is; the count per tier is unchanged). Zero memory.
5. **Sit down.** A "Sit" prompt at the benches (the square's, the parks',
   the promenade's; the data exists where they're drawn) puts Degen on the
   `sit` pose (poses.ts) with the camera eased back; any key stands him up.
   The first thing to *do* in a hangout city that isn't shopping.

### Phase 4: buses, boats and the weather's small reactions (S-M, small memory)

1. **Buses that stop.** Bus stops as data (a few spots along the avenues
   and Trench Avenue, clear of junctions), a stop with a dwell of a few
   seconds, doors' hiss, brake lights on. A shelter kit (a post, a roof, a
   bench: a few dozen triangles each, through a Batch, near only) is the
   one geometry here; or none, a sign post only, the owner's call.
2. **Boats with a horn** under the bridges, and a wake that trails the
   speed; the odd boat moored at a jetty. Zero memory.
3. **Lamps that come on one by one** at dusk, with a flicker-on, over a
   minute (the `lit` registry has every lamp; a seeded delay each). Zero
   memory.
4. **Trees that sway** (desktop only): a `sway` attribute on the canopies
   (1 float a vertex, about 0.5 MB across the town's trees) and a wind
   uniform on the shared toon material; stronger in rain, still under
   reduced motion.
5. **Steam from the vents** in The Trenches at night: at most six soft
   sprites near the camera, the FX layer, none on phones.
6. **Thunder, now and then, in rain** (the owner's call): a soft brighten
   of the sky and a synth rumble a few seconds later; never a hard flash,
   never under reduced motion.

## Suggested order

Phase 1 (built) → Phase 2 (what the player holds most) → Phase 3 (the city noticing you) → Phase 4. 1b (rolling
wheels) after Phase 2 if the owner wants it: it's the one shader change.

## What has to keep working

- `?fps` and `?bench` numbers (draws, triangles, memory) within noise of
  today's, on the phone tier first.
- Reduced motion: no traffic, so nothing here plays; sounds stay off until
  the visitor turns them on.
- The snapshot: nothing moves. Bus stops and benches are new data, not
  moved things.
- Every rule DOM-free and tested (`tests/traffic.test.ts` for Phase 1 and
  Phase 3's rules; `drive-sim`'s tests for Phase 2's).

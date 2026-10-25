# The water: the plan (the owner's call)

The owner asked for the river's water to "look much better". Built in
steps, each with the owner's sign-off; keep this plan up to date.

## The owner's decisions

- **Style:** stylised cartoon (Wind Waker, Sea of Thieves): flat bands of
  colour, crisp highlights, the city's own toon look, not a realistic
  river.
- **Colour:** a deeper navy than today's mid-blue, so the neon, the lamps
  and the boats stand out against it, at night most of all.
- **Reflections:** the lights only, everywhere (phones too): the sun and
  the sky, and a shimmering streak on the water under every lamp, lantern,
  boat light and big neon sign. No mirror of the buildings.
- **Extras:** proper boat wakes; the weather on the water (with morning
  mist); the same look for Westlake's lake, the fountains and the ponds.
- **Foam and the beach** (asked after, the owner's yes): foam where the
  water meets the quays, the piers, the posts and the hulls, and waves
  washing up the cove's beach, both with step 1.
- **Not picked:** the waterline stain on the quays.

## Where it starts from

- **One shader for all water:** `waterMat` in `world.ts` (the river's
  `riverMat` is the same with a `shore` attribute for the shallows by the
  natural banks; the lake in `westlake3d.ts`, the fountains and ponds in
  `infill.ts`, `landmarks.ts`, `neighbourhoods.ts` use `waterMat` itself).
  Its uniforms (`time`, `night`, `rain`, `sky`) are set in `index.ts`'s
  tick.
- **What it draws:**
  - two crossed sine waves, so it reads as even stripes (corduroy), with
    no flow downstream;
  - one colour, the same whatever the angle or the depth, the shallows
    aside;
  - pale streaks drifting by day;
  - at night, neon streaks scattered evenly and at random, not under
    anything that's lit;
  - rain as a regular grid of rings.
- **Haze:** none: it's a `ShaderMaterial` without the fog chunks, so the
  far river stays as bright as the near.
- **The wakes:** an additive glow sprite stretched behind each traffic
  boat (`life.ts`, `wakeOf()` in `boats.ts`) and the hire boat (`boat.ts`);
  none behind the river's own boats or the lake's.
- **The river's mesh:** four rows of vertices across (`riverWater()`), so
  it's flat and cheap. That stays: everything below is shader work, not
  geometry.

## What it keeps to

- **Draws:** the water stays one draw a material. The lights' reflections
  are one instanced mesh, and the moving boats' a few instances more. The
  wakes are drawn in the water's own shader.
- **Phones:** the same look with the costlier parts lighter (fewer wave
  layers, fewer wakes, the reflections' shimmer simpler), as the rest of
  the city does. Measure with `?fps` and `?bench` (day and night) before
  and after each step, the phone tier first.
- **Minimal bloom:** nothing on the water passes the bloom threshold. The
  reflections and the sun's glint stay at about 1, like the window light
  maps, so the river never washes out.
- **Reduced motion:** the water stands still: no flow, no shimmer, no
  wakes moving. It keeps its colours and reflections.
- **Time and weather:** everything reads the sky's own numbers (`sunDir`
  and the time of day in `sky.ts`, `windStrength()` in `dusk.ts`, the
  rain), so Live, Day, Sunset, Night and every weather all work.
- **Rules first:** anything that's data (which lights reflect, which boats
  leave wakes) goes in DOM-free code with tests. The shaders only draw it.

## Steps (each with the owner's sign-off)

1. **The new surface.**
   - **The waves:** soft waves made from two or three layers of scrolling
     noise, flowing downstream on the river and lying still on the lake,
     fountains and ponds (a `flow` per material). They're drawn as two or
     three flat bands of colour with crisp edges, not a smooth gradient.
   - **The colour:**
     - deep navy looking straight down, the sky's colour towards the
       horizon (by the angle, the cartoon way: a band, not a blend);
     - darker out in mid-river than by the banks, keeping the shallows;
     - by day, sunset and night, from the sky's colours.
   - **The sky in it:** a toon glint where the sun's reflection falls, a
     golden path towards the sun at sunset, and the moon's path at night.
   - **Haze:** the city's fog over it like everything else.
   - **The night's neon streaks** stay as they are until step 2 replaces
     them.
   - **Where:** the river, the lake, the fountains and the ponds, all on
     one shader (a define for the river's shallows).
   - **Foam where the water meets things:** a broken line hugging the
     quays, the banks and the lake's rim, a second lapping out and back;
     round the piers, piles, posts and hulls from the depth of what stands
     in the water (laptops and desktops).
   - **The cove's beach:** waves rolling in over the shallows, running up
     the sand and sliding back, leaving it wet.
2. **The lights' reflections.**
   - **Which lights:** `waterlights.ts` (DOM-free, tested) lists every
     light near enough to the water to show in it, from the data that
     already knows where they stand:
     - the promenades' and boardwalk's lamps, and the esplanade's;
     - the jetties' and decks' lamps;
     - Liberty Bridge's and Harbour Bridge's lanterns and Harbour's bulbs;
     - Pier 7, the Night Market's string lights, Club PULSE's fins and
       searchlights;
     - Uptown's lit crowns and the Sky Wheel;
     - lit windows facing the river, as a few soft blocks of light rather
       than one streak each.
     Each has a position, a height, a colour and a size. It's baked at
     build time (`baked()`) if the list grows long.
   - **How they're drawn:** one instanced mesh of streaks. Each lies on
     the water where the light's reflection falls as seen from the
     camera, stretched towards the viewer (longer the higher the light
     and the lower the eye), shimmering with the waves and broken up by
     the wind, coloured as the light is. They're lit only when the light
     is (night, dusk, the lamps' `lampGlow()`), drawn only on the water,
     and culled with the tiles.
   - **The moving lights:** the boats' lights (life.ts `bodies.boats`, the
     river bus, the cruise boat, the tall ship, your hire boat), a few
     instances refreshed each frame for the boats near the camera.
   - **What goes:** the random neon streaks.
3. **Proper boat wakes.**
   - **The data:** the boats near the camera (up to about 12, 6 on
     phones: life.ts's traffic boats and the police launch, `riverlife.ts`'s
     cruise boat, rowing eight and dinghies, the river bus, the tall ship,
     your hire boat, the lake's rowing boats and pedalos), each with where
     it is, its heading, its speed and its size. They go to the water's
     shader as a small uniform array (`wakes.ts`, DOM-free, tested: which
     boats, nearest first).
   - **What's drawn, in the water's shader:**
     - a V of white toon foam lines spreading behind each boat at the
       wake's angle, longer and whiter the faster it goes, fading out
       behind it (`trailOf()` sets the length);
     - a curl at the bow;
     - for a boat at rest, a few rings.
   - **What goes:** the glow sprites behind the traffic boats.
4. **The weather on the water.**
   - **Rain:** splashes at random spots and times (rings from seeded
     cells, never a grid), denser the harder it rains; the water a shade
     darker and duller under a storm.
   - **Wind:** the waves taller and quicker, and whitecaps (small toon
     foam flecks) in strong wind and storms.
   - **Thunder:** the storm's brighten (`stormStep()`) flashes softly on
     the water too.
   - **Mist** (the owner's yes): at dawn and in fog, a low mist over the
     water: soft, thin and still under reduced motion.

## Tests

- `tests/waterlights.test.ts`: every reflected light is near the water,
  in the world, at a real light's spot, and none is listed twice.
- `tests/wakes.test.ts`: the boats chosen are the nearest, at most the
  tier's count, and a stopped boat leaves rings, not a V.
- The snapshot (`tests/snapshot.test.ts`): nothing moves.
- `npm run typecheck`, `npm test`, `npm run test:wide`, `npm run budget`.
- By hand, with Playwright and on a phone: the promenade, Liberty Bridge,
  Harbour Bridge, the cove, Uptown's esplanade, the lake and a fountain;
  by day, at sunset, at night and in the rain; the City view, walking and
  boating; and reduced motion.

## As built

**Step 1 (built, waiting on the owner's sign-off):**

- **One shader** (`world.ts`, the water's section): three materials on the
  same uniforms (`WATER_UNIFORMS`, set each frame by `waterLook()` in
  index.ts from the sky):
  - `riverMat`: flowing (`FLOW`), its banks (`BANKED`) and the foam round
    what stands in it (`DEPTH_FOAM`);
  - `lakeMat`: still, its rim;
  - `waterMat`: the fountains and ponds, still, nothing else.
- **The waves:** five trains at odd angles and lengths on a slow swell of
  noise (no stripes), flowing downstream on the river. The highest crests
  are a lighter band with a pale line along their tops; it all fades to
  plain colour with the distance.
- **The colour:**
  - the navy by the time of day (`WATER_DAY`, `WATER_NIGHT`, greyer in the
    rain, warmer at dusk), deeper out in the stream;
  - teal over a natural bank's shallows, as before;
  - the sky in two bands towards the horizon;
  - the sun's glint (a golden path at sunset) and the moon's path at night;
  - the city's haze (fog) over it.
- **The night's neon streaks** are quieter (step 2 replaces them); the
  rain's rings are as they were (step 4).
- **The river's mesh** (`riverWater()`) is five rows across
  (`riverRows()` in `riverwater.ts`, DOM-free, tested in
  `tests/riverwater.test.ts`: the two water lines, the shallows' ends, the
  middle). Each carries `bank`:
  - how far it is from the nearer water line (exact, so the foam's
    distances are);
  - the shallows' teal;
  - how much the waves wash in (`wash`, a natural bank's);
  - the cove's beach.
- **The foam at the banks** (every tier):
  - a broken line hugging the quays, the banks and the lake's rim;
  - a second lapping out and back off the quays;
  - waves rolling in over a natural bank's shallows, bigger on the cove's.
- **The cove's swash** (`beachSwash()`, `swashAt()`): a see-through strip
  on the sand from the water's edge up `RUN_UP`. Each wave runs up it as it
  reaches the water line and slides back, leaving a wet band. It eases in
  at the beach's ends.
- **The foam round what stands in the water** (laptops and desktops):
  - The water has a layer of its own (`WATER` in kit.ts). The ink
    pre-pass draws the solid city first, copies its depth (post.ts
    `under`, a GPU blit into a frame-sized target), then draws the water,
    so the outlines are as they were.
  - The river's shader foams wherever something stands a little way under
    its surface: the bridges' piers, the decks' piles, the jetties' posts,
    the landings, the moored hulls, the tall ship, the quay walls.
  - The quay walls and the banks' slopes reach `BED` under the water for it.
  - It fades out by 90 from the camera.
  - Phones keep no depth: their water is drawn in the pre-pass with
    everything else, so they cost nothing more.
- **The lake** (`lakeWater()` in westlake3d.ts) is rings in from its rim
  (`lakeRings()`), for the rim's foam; it lies on the lawn, so it has no
  depth foam.
- **Checked** with the budgets (boot code 651 of 670 KB), both test runs
  and screenshots by day, at sunset and at night: the promenade, Liberty
  Bridge's piers, the cove and the lake. Real-device `?bench` numbers are
  still to take.

**Step 2 (built, waiting on the owner's sign-off):**

- **Which lights** are in `waterlights.ts` (DOM-free, tested in
  `tests/waterlights.test.ts`). A light shows when it stands near enough
  to the water for its reflection to land on it (`waterUnder()`): within
  `REACH` of the river or the lake, further back the higher it is. It gets
  the water's height under it, the river's or the lake's.
  - The street lamps by the water: world.ts `lampLights()`, each lamp's
    bulb in its tone (white or sodium, the dead left out, the same rule as
    `buildLamps()`).
  - The bridges' lanterns: Liberty Bridge's approaches, abutments and high
    level, Harbour Bridge's girders and every other bulb on its cables.
    Each drawing hands them over (`addWaterLights()`), since it works them
    out as it draws.
  - What the data knows (`landmarkLights()`): Club PULSE's fins (magenta
    and cyan) and its pylon, the Night Market's stalls and poles, Pier 7's
    kiosk, the Sky Wheel's rim, Uptown's towers' crowns and red warning
    lights, and the moored boats' lamps.
  - The moving lights (`setMovingLights()`): the traffic's boats' cabin
    lamps and the police launch's flashing bar (life.ts), the cruise boat's
    and the river buses' windows (riverlife3d.ts, only while that district
    is drawing them), and the tall ship's stern lantern (libertybridge.ts).
- **How they're drawn** (`reflections.ts`): one instanced quad a light, in
  two draws (the fixed lights, built once after the lamps; the moving
  ones, at most `MOVING`, refreshed every frame after the ticks).
  - The vertex shader lays each quad where the light's mirror image meets
    the water as the camera sees it, its long side towards the camera,
    longer the higher the light, the lower the eye and the stronger the
    wind. No work a frame on the CPU for the fixed ones.
  - The fragment shader draws a stack of short ripple strokes, each its
    own width and a little to one side, fuller in the middle, drifting
    with the waves.
  - The depth test hides any of it under the land (the water lies under
    the streets); the lake's are clipped to its shore (`lakeR()` in the
    shader).
  - They come up with the night, fade into the haze and are left out past
    `FAR` (240). Additive, at most 0.6 of the light's colour: under the
    bloom.
- The random neon streaks are gone from the water's shader.
- **Not done:** lit windows facing the river (left for later: the
  landmarks and the lamps carry it), the hire boat's lights.
- **Checked** at night from the promenade, by Liberty Bridge and at the
  cove: columns under every lamp and lantern, none on the land (the cove's
  sand right at the water line takes a hair of it). With the budgets (boot
  code 654.9 of 670 KB) and both test runs.

**Step 3 (built, waiting on the owner's sign-off):**

- **The rules** are `wakes.ts` (DOM-free, tested in `tests/wakes.test.ts`).
  - How long a wake trails (`trailOf()`: longer the faster and the longer
    the boat, never past 16) and how strong it is (`strengthOf()`, full
    from `FULL`); under `REST` a boat is at rest.
  - Each drawing hands over its boats while it draws them (`setWakes()`):
    - life.ts: the traffic's boats and the police launch, and the moored
      ones at rest;
    - riverlife3d.ts: the cruise boat, the rowing eight, the dinghies, the
      river buses, and the hire boat at its mooring;
    - libertybridge.ts: the tall ship;
    - boat.ts: your hire boat while it's out;
    - parklife3d.ts: the lake's rowing boats and swans, and the two moored
      at the jetty.
  - A speed a drawing doesn't know is measured from where the boat was
    (`speedTracker()`, eased, a jump never shows).
  - The nearest boats go to the shader (`nearestWakes()`): 12 at most, 6
    on phones, none past `WAKES.far` (120).
- **The drawing** is the river's and the lake's own shader (`wakeFoam()` in
  world.ts, `WAKES` define), so a wake costs no draw.
  - `wakeLook()` in index.ts fills `wakeA` / `wakeB` each frame after the
    ticks.
  - In each boat's own frame:
    - a thin foam line round the hull, wider the faster it goes;
    - the bow wave peeling off along both sides;
    - behind the stern, the V's arms at the Kelvin angle (`KELVIN`, about
      19.5°) and the churned water down its middle, both broken up and
      fading further back;
    - round a boat at rest, rings spreading out.
  - A slow boat's wake still shows, fainter.
- **What went:** the glow sprites behind the traffic's boats (life.ts) and
  the hire boat (boat.ts), and `wakeOf()` in boats.ts.
- **Checked** by day from the promenade (the river bus's V, its bow wave
  and churn; the tall ship's line at anchor), at night (the ship's rings)
  and at the lake (a rowing boat's faint trail). With both test runs and
  the budgets (boot code 656.3 of 670 KB).


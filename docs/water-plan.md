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
- **Extras:** proper boat wakes; the weather on the water; the same look
  for Westlake's lake, the fountains and the ponds.
- **Not picked (for now):** foam lines at the walls, piers and posts, waves
  on the cove's beach, the waterline stain on the quays. See "Open
  questions".

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
  boat (`life.ts`, `wakeOf()` in `boats.ts`).
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
       behind it (`wakeOf()` sets the length);
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
   - **Mist:** at dawn and in fog, a low mist over the water: soft, thin
     and still under reduced motion.

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

## Open questions

- **Foam where the water meets things** (not picked for now): even in the
  cartoon style, a thin white line where the water touches the quay walls,
  the bridges' piers, the jetties' posts and the boats' hulls is what
  makes water look like it's touching them. It could come with step 1 or
  later. The owner's call.
- **The cove's beach:** waves washing up the sand, with a darker wet band
  behind them. The owner's call.
- **Mist** (step 4): wanted, or left out?

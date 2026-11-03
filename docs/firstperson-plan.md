# First person, everywhere

The owner's call (2026-11): "improve all aspects of first person view. In
fights, in vehicles... more detail and quality." Built one phase at a
time, each with the owner's sign-off; keep this up to date. Everything is
the city's game only; the toon style, the ink outlines and the budgets
hold.

## Decisions (the owner's, 2026-11)

| Topic | Decision |
| --- | --- |
| Scope | **On foot (the whole body), the Fight Club, vehicle interiors, the gun hands' polish.** Seat views on the taxi, metro and river bus are not in it (later, if wanted). |
| Aircraft | **Detailed cockpits** for all three (the vehicle plan had left them out): moving controls, working instruments, Degen's hands on them. |
| Mirrors | **Stay painted** (no second pass over the city). They may follow the time of day and the weather. |
| Camera feel | **Grounded and subtle**: small bob, lurch, jolts and FOV changes, comfortable for long sessions and on phones; all off under reduced motion. |
| Default | Over the shoulder stays the default when walking starts (unchanged); V swaps, as today. |

## Where things stand

- **On foot, armed** (`viewmodel.ts`): the best of it. Degen's own hands
  (`bakedHand()`) on the gun in the outfit's sleeves (suit, or hoodie /
  track; every other top takes the hoodie's), built `K` times bigger and
  further out and drawn into the front of the depth buffer (the city
  camera's near plane is 0.5 m), its own flat shading from a fixed light
  dimmed at night (`level`), sway, the step bob, recoil, aiming down the
  sight, the scope's full-screen view, keyed reloads, the muzzle flash.
  The eye rides the capture's hips (`FP_BOB`), leans with a peek.
- **On foot, empty hands:** nothing of him is drawn (`hero.g.visible =
  !firstPerson`). Fists, the moments (doors, counters, crates, benches,
  the lifts), the snack, the contact layer's hands on walls, crouch, the
  slide and the vault all happen out of sight; looking down shows no feet.
- **The Fight Club** (`fight.ts`): over the shoulder only.
- **Your car** (`carride.ts`, `carcabin.ts`): V steps chase, roof,
  driver's seat (fitted out): a cabin, the wheel turning under his hands,
  two gauges, the dash's strip, wipers, no rain inside, the near plane
  brought in to 0.08. The eye is fixed in the cabin: no look into the
  turn, no lurch, no bumps; the mirrors are painted.
- **Your bike** (`drive.ts`, `bikes.ts`): the helmet's camera from his
  eyes, tipping with the lean; nothing of the bike or his hands in view.
- **The hire boat** (`boat.ts`): a fixed helm camera with the driver
  hidden; no wheel, hands or throttle in view.
- **Your aircraft** (`fly.ts`): the nose camera sits ahead of the nose
  (`NOSE`); no cockpit.
- **Karts** (`kart.ts`): the chase camera only.

## The approach

- **His own body, not a separate viewmodel**, wherever it can be: the
  skinned figure drawn from the eye with the head (and the hat, the hood,
  the shades) folded away, as the car seat already does (`head()` in
  carride.ts). What you see is what the animator, the moments, the brawl
  and the fight clips already pose, so nothing is animated twice.
- **Close things and the near plane** (measured in Phase 0, below): his
  hands, collar and what he holds come 0.05-0.4 tiles from the eye,
  inside the city camera's near plane (0.5). The body is **drawn close**
  (`fpclose.ts`): at its true size and pose, every vertex pushed `K` (16)
  times further along its line of sight in its shaders, each fragment
  writing its true depth again, so the world hides him and he hides the
  world exactly as if he stood there, and what's nearer than the near
  plane sits in a thin sliver at the front, still in its own order. The
  near plane stays 0.5. The guns keep the viewmodel (its sight line, ADS
  and reloads are tuned there).
- **The feel is one set of rules:** `fpcam.ts` (DOM-free, tested): the
  eye's bob, the lurch under acceleration and braking, the look into a
  turn, jolts (a hit, a landing, a bump), the FOV by speed, each subtle,
  each a spring, all zero under reduced motion. Every first-person view
  (on foot, the ring, car, bike, kart, boat, cockpit) feeds it.
- **Lighting:** the first-person pieces take the city's day and night and
  a tint from the nearest lit neon (one colour per frame, not the city's
  lamps), still on their own light so close things never light wrongly.
- **Cost:** everything new loads in a chunk of its own when first person
  is first used (or the vehicle is first entered); the boot carries only
  the switch. Phones get the same views with fewer pieces (no finest
  cockpit detail, simpler instruments), and the budgets hold.

## Phases

### Phase 0: measure and the kit (built)

- **The near plane, measured** (headless Chromium, a 24-bit depth buffer
  under a half-float target as post.ts draws, the city's far 760, from
  the first-person eye 1.07 up, sub-pixel jitter): faces 5 mm (0.005)
  apart start to fight **231 tiles** out at today's near 0.5, 163 at
  0.25, **102** at 0.1; 1 cm apart, none within the 400 measured at any
  of them. So bringing the near plane in would bring the flicker over 2x
  closer (the car seat's 0.08 already pays it, seated).
- **Four ways of drawing the body, measured** (a hand and a fingertip
  inside the near plane, the fingertip drawn first; a knee under a café
  table; a foot past its edge):

  | Way | Hand | Fingertip over hand | Knee under the table | City's flicker |
  | --- | --- | --- | --- | --- |
  | **Drawn close (fpclose.ts), picked** | shows | in order | hidden | unchanged (231) |
  | The gun hands' sliver (viewmodel.ts) | shows | in order | shows through | unchanged |
  | Near 0.5 as today | clipped | clipped | hidden | 231 |
  | Near 0.1 | shows | in order | hidden | 102 |

  (Found on the way: three culls an object on its true bounds before the
  shader pushes it out, so a close-drawn mesh is taken out of frustum
  culling, `drawClose()`.)
- **The kit:** `fpclose.ts` (`CLOSE`, `CLOSE_LAYER` 4, `closeDepth()`,
  `injectClose()`, `closeMaterial()`: a patched copy per material, its
  own `onBeforeCompile` first; `drawClose()` and its undo), tested in
  `tests/fpclose.test.ts` (against three's projection: the true depth
  exactly past the near plane, in front of the world and in order inside
  it, monotonic, a millimetre told apart at a hand-span); post.ts draws
  `CLOSE_LAYER` into the outline pre-pass with its own patched normal
  material while `post.close` is on (off, nothing changes), so the close
  body gets its ink lines. `fpcam.ts` (`FP_FEEL` per mode, `FP_MOST`,
  `JOLT`, `stepFp()`, `joltFp()`), tested in `tests/fpcam.test.ts` (the
  right way round, within `FP_MOST` whatever comes in, settling to
  nothing, the same at 30 and 144 fps, still under reduced motion).
- **The lab:** `?anim&fp` (or `cam=eye`; the Eye camera): his eyes from
  the head bone, the head folded away, the city's lens (70°, near 0.5),
  the body drawn close, the eye on `fpcam.ts` (`foot`), drag to look round
  (`look=` the pitch), a readout row. **`?bench`** views `fp-street`,
  `fp-square` (70°, near 0.5) and `fp-seat` (68°, near 0.08), each view
  able to carry its own lens (`BenchView.fov` / `near`).
- **What the lab shows for Phase 1** (its shots, for the owner's review):
  looking down, the collar, the shirt and the tie fill the view a few
  centimetres off (the neck and the collar want folding with the head, or
  the eye further forward); running, nothing of him is in view at 30°
  down (the arms swing beside the body, out of the frame); in the guard,
  only one fist edges into the corner (a first-person guard framed for the
  eye, Phase 2); the rifle in his hands reads well, inked, unclipped.
  Still to do when the body goes into the city: his shadow (the shadow
  cameras don't see `CLOSE_LAYER`: enable it on them, sky.ts).

### Phase 1: on foot, the whole body

- His body from the eye: the torso, arms and legs, the feet when you look
  down (the planted feet, the crouch, the slide's lead leg, the vault's
  hand on the top), his clothes and what's in his hand.
- Empty hands in view, relaxed, swinging a little with the walk (the
  animator's own arms, eased in front of the eye so they read).
- The moments seen: the push on a door, both hands on a counter, the crate
  carried in front, sitting on a bench (the view lowered onto it), the
  lifts' turn to face out, the snack eaten, the emotes from inside (the
  wave's hand, the cheer's arms).
- The contact layer's hands on walls and rails in view.
- The eye on `fpcam.ts`: the step bob from the capture, landings, a
  stagger's jolt.

### Phase 2: fists, on the street and in the ring

- **On the street:** the guard, jab, cross, hook, uppercut and the kicks
  from the eye (the brawl's clips on his body, the fists closing), the
  block's forearms up, the dodge's slide of the eye.
- **In the Fight Club:** V in the ring for first person (over the
  shoulder stays the default): your guard framing the opponent, their
  strikes coming at the lens with the telegraph readable, a hit's jolt and
  flash (subtle), a parry's snap, the knockdown seen from the canvas and
  the get-up, the camera inside the ropes, the fight HUD as it is.
- Street spars with the partners the same way.

### Phase 3: the gun hands, polished

- Sleeves for every top from the wardrobe's own data (varsity, puffer,
  fatigues, the suit's buttoned cuff), the watch on the wrist when worn.
- Lighting as above (day, night, the neon's tint).
- Shell casings out of the port, a better flash (shaped per gun), smoke
  off the barrel after a string; the hands moving with crouch, slide and
  the vault.

### Phase 4: the car, the bike and the kart

- **Car:** the eye on `fpcam.ts` from its springs (`suspension.ts`): the
  body's lurch on the brakes and the throttle, bumps through the seat, a
  look into the turn with the steering; the hand to the horn; more on the
  dash by model (indicator arrows lit as they tick, the electric's screen,
  the classic's chrome dials); the painted mirrors tinted by the time and
  the weather.
- **Bike:** the bars, the clocks and his gloved hands on the grips in
  view, the visor's edge, the lean and the wind (a little FOV with speed).
- **Kart:** a driver's view (V in a race and out of the pits): the wheel
  under his hands, the pods and the nose, the kerbs coming at you.

### Phase 5: the hire boat

- At the helm from his eyes: the wheel turning under his hands, the
  throttle lever, the console's gauges, the bow rising with speed and the
  spray, the wake behind if you look back.

### Phase 6: the cockpits

- **Sky Hopper** (prop): the panel's round gauges (airspeed, altimeter,
  attitude, heading, climb, revs) working, the yoke under his hands, the
  throttle, the rudder pedals at his feet, the prop's blur through the
  windscreen, the frame and the struts.
- **Neon Dart** (bizjet): screens (the attitude and the speed and height
  tapes, the map), the stick, the throttle quadrant, the gear lever moving
  with the gear (airframe.ts `GEAR_TIME`), the flaps' lever.
- **Whirlybird** (heli): the cyclic, the collective and the pedals, the
  chin bubble at his feet, the rotor's shadow flickering over the panel.
- Seated Degen with his hands on the controls as the sim moves them
  (`stepAirframe()`); the cockpit replaces the nose camera's spot. Night:
  the panels lit under the bloom's threshold.

### Phase 7: checked

- Every view at 320, 375, 768, 1024 and 1440 wide, upright and on its
  side, by day and at night, in rain, under reduced motion; `?bench`
  before and after on a phone and a laptop; the budgets.

## Not in it

- Live mirrors (the owner's call: painted).
- Seat views on the taxi, the metro and the river bus.
- Damage, a car radio.

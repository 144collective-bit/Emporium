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
| The head | **The view stays clean**: the head, hat, hood and shades are all hidden from the eye; no brim or rim at the top of the view. |
| Under the eye | **The neck and collar are hidden** with the head (and the top of the tie): looking down shows the chest, arms, legs and feet. The eye stays where his eyes are. |
| Empty hands | **At the edges**: walking and running, the arms are eased a little forward so the hands swing into the bottom corners; punches, doors, counters, crates and the snack bring them up. |
| The ring's view | **Remembered**: V swaps in the Fight Club, and the next fight starts in whichever view was used last. |

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
  able to carry its own lens (`BenchView.fov` / `near`). Their first
  numbers (headless Chromium, medium tier: draws and triangles only, its
  frame times are a software GPU's): `fp-street` 635 draws, 2.32M (the
  downtown street view, 531 and 1.74M); `fp-square` 549, 2.57M (the
  square's, 427 and 1.57M); `fp-seat` 469, 2.41M (driving's, 321 and
  1.44M). First person's 70° takes in much more of the city than the City
  view's 34°: measure these on real devices before and after each phase.
- **What the lab shows for Phase 1** (its shots, for the owner's review):
  looking down, the collar, the shirt and the tie fill the view a few
  centimetres off (the neck and the collar want folding with the head, or
  the eye further forward); running, nothing of him is in view at 30°
  down (the arms swing beside the body, out of the frame); in the guard,
  only one fist edges into the corner (a first-person guard framed for the
  eye, Phase 2); the rifle in his hands reads well, inked, unclipped.
  Still to do when the body goes into the city: his shadow (the shadow
  cameras don't see `CLOSE_LAYER`: enable it on them, sky.ts).

### Phase 1: on foot, the whole body (built)

- **His body from the eye** (walk.ts, on foot in first person): the figure
  itself drawn close (`drawClose()` on `hero.g`, kept in step through a
  wardrobe change and undone the frame he leaves first person, gets in a
  vehicle, rides or fights: `syncBody()` after every frame), so the torso,
  legs, clothes, the thing in his hand, every moment's hands (a door's
  push, a counter, the crate, a bench, the lifts, the snack), the contact
  layer's hands on walls and the crouch, slide and vault are seen exactly
  as the animation poses them; his shadow casts as before (the shadow
  cameras see `CLOSE_LAYER`, sky.ts).
- **The eye at his eyes** (`eyeOf()` in fpbody.ts, DOM-free, tested in
  `tests/fpbody.test.ts`): from the head bone as posed, so a crouch, a
  slide, a peek's lean (the old sideways eye shift went: the head's own
  lean is the peek), a bench and the capture's own steps move it (the old
  hip bob, `FP_BOB`, went); not eased after him (that trailed the eye into
  his own head at a run); its height steadied while aiming down a sight
  and under reduced motion.
- **The view kept clean** (the owner's calls), in the body's shaders only
  (fpclose.ts `CUT`, `cutAway()`, `setCloseCut()`): everything worn on the
  head (the head over the collar, the shades, the hood, every hat and its
  brim) is cut away round the eye, the collar's front and the tie's knot
  under it kept; the test holds every head piece in the wardrobe, with
  every hat and the hood up, at both details. (Found on the way: running,
  his neck leans forward, and a first, lower hat region took the hands
  raised in front at face height: the hat region starts just under the
  eyes, `CUT.top`.)
- **The gun hands stay viewmodel.ts's**: with a gun out his own arms are
  cut away (`ARM_BONES`, by their skin weights) and the gun in his hands
  hidden; checked against his body hidden outright: the same picture.
- **Hands at the edges** (`fpArms()`, `ARMS`): the arms turned about the
  chest's own axes (the capture turns the collarbones, so the arms' own
  frames aren't his forward: the first try turned them back), forward and
  in, more at a run, the elbow a little straighter there (the run already
  bends it about a radian; bending more folded the hands back to the
  shoulders), never past straight. Measured in the lab, looking level:
  hands in view in no frames at a walk, 18 in 48 at a run, 7 in 48 at a
  sprint, at the front of each swing; looking down they're there.
- **The near plane at walls** (`nearFor()`, `NEAR`): 0.5 unless something
  solid is closer to the eye (the camera grid's boxes and what's built on
  your lots, `boxClear()`), then just short of it, at least 0.12; put back
  when first person ends.
- **The eye's motion** (`stepFp()` mode `foot`): a lurch into starts and
  stops, a lean against a sideways pull, a jolt on landing (by the fall)
  and on a stagger; no lead (on foot the look is the heading) and no field
  of view of its own (walk.ts widens it with speed already).
- **The lab**: the Eye camera uses the same pieces (`eyeOf()`, the cut,
  hands at the edges), `near=` sets its near plane to compare, and
  `window.__animLab` carries `hero`, `arms` (tuning `ARMS` live) and
  `camera`. `?spawn=x,z,yaw,pitch` now takes a pitch too, for checking a
  view on a device.
- **Cost**: the boot's code is 687.1 KB of 690 (2.3 KB more: walk.ts
  brings fpbody.ts and fpcam.ts into it). In first person: the body's own
  draws (as over the shoulder) plus its draws again in the outline
  pre-pass and one more pass over the scene for that layer.
- **Left for later phases**: the guard framed for the eye (Phase 2); the
  gun hands' sleeves (Phase 3: they don't match every outfit, seen in the
  city's shots); the console's one `computeBoundingBox()` NaN warning in
  the city is older than this plan.

### Phase 2: fists, on the street and in the ring (built)

- **The guard framed for the eye** (`createFpGuard()` in fpbody.ts,
  DOM-free, tested in `tests/fpbody.test.ts`): the fight's clips pose his
  arms as ever, then each fist is moved on by an offset learned while the
  clip is the guard (from where the clip's guard puts it to `GUARD`'s spot:
  the lead, on his left, further out and higher), through the arm's own
  two-bone IK (`reachArm()`, the elbow down and out), so the jab, cross,
  hook, uppercut and the kicks play from where the guard shows and their
  reach still reads. In the guard the fist is turned as a boxer's
  (knuckles ahead and a touch up, the palm in, the thumb up), eased; a
  strike keeps the clip's turn.
- **The block** (`BLOCK`): both fists up just under the eye, close
  together, the view between them, eased in and out. The clip's own block
  lays the forearms across the face, right against the eye: from there it
  was two dark slabs over the corners.
- **His arms are never in the head's cut** (fpclose.ts: whatever is mostly
  weighted to an arm bone): found on the way, the block's fists sit inside
  the hat's reach and vanished.
- **On the street** (walk.ts, empty hands in first person): the guard from
  the moment a press brings it up (`guardAmt`, and the kicks' and the
  dodge's whole-body clips), the block on right-click; the dodge's slide is
  the eye's own, riding the head bone.
- **In the Fight Club** (fight.ts `setView()`, `eyeView`): V, the
  gamepad's right stick click or the fight HUD's **Eyes** button
  (`[data-fight-view]`, lit while it's on) switches to your eyes and back;
  the next fight starts as you left it (`ringFp` in the walk settings,
  `degen-city-walk-v1`; over the shoulder the first time). Both fighters
  drawn close (yours with the cut round the eye), the eye from your
  fighter's head bone, looking at the opponent's head (a touch under it),
  your guard framing them; down on the canvas the guard lets go and the
  view goes where your own head looks, through the fall and the get-up; a
  field of view of 70 (put back after); `stepFp('ring')`'s lurch and lean.
  A hit on you is a jolt (by how heavy; a knockdown the most), not the
  white flash (it would show the inside of your own head); your own parry
  a small snap; your stars aren't drawn. Street spars with the partners
  are the same fight (`kind: 'street'`), so the same.
- **Checked** in the city headless: the guard, punches, hits taken, the
  view back over the shoulder with the head drawn again; the block on the
  street. While the mouse is captured no HUD button takes a click (Quit
  neither): V is the way then.
- **Cost**: the boot's code is 688.4 KB of 690 (1.3 KB more: the guard is
  walk.ts's, so it's in the boot; the ring's part is fight.ts's chunk).
- **Left for later phases**: a hit's flash from the eye (a soft vignette,
  maybe, at the checks, Phase 7); the boot is close to its budget, so
  Phase 3 on should put what it can in the chunks.

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

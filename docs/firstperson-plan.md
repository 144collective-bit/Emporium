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
  hidden; no wheel, hands or throttle in view. (Phase 5 built it from his
  eyes.)
- **Your aircraft** (`fly.ts`): the nose camera sits ahead of the nose
  (`NOSE`); no cockpit. (Phase 6 built a cockpit for each.)
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

### Phase 3: the gun hands, polished (built)

- **A chunk of its own** (`fpgun.ts`, fetched the first time the gun hands
  show: viewmodel.ts's `fine`; the boot carries only its hooks, 0.4 KB),
  its rules and shapes `fpgunkit.ts` (DOM-free, tested in
  `tests/fpgun.test.ts`). Until it's in, the plain sleeves and flash.
- **Every top's sleeve** (`sleeveParts()`), round the wrist's own bone and
  up the forearm (the old sleeves ran round the arm's origin, 5 cm off the
  wrist): the suit's tailored sleeve over a shirt cuff with its hem and
  four horn buttons up the outside, the hoodie's and the track top's sleeve
  gathered onto a ribbed cuff (the track top's two stripes up the outside),
  the varsity's cream sleeve and its rib with the cream stripe, the
  puffer's fat sleeve quilted in baffles over a knit cuff, the fatigues'
  with gloves (`handColor()`); one mesh a colour (`byColour()`). The tests
  hold every part outside the wrist, nothing down over the hand, the sleeve
  outside the cuff where they meet.
- **The watch** on his left wrist when he wears it: the gold band just off
  the wrist and the face on the outside, the cuff moved up for it
  (`WATCH_LIFT`).
- **Each gun's flash** (`FLASH`): the rifle's star, the shotgun's and the
  revolver's round burst, the SMG's small one, the marksman rifle's and the
  belt feeder's muzzle brakes throwing side jets; how long each shows.
- **Spent cases** (`EJECT`, `CASE`): out of the port on his right, flung
  right and up and falling away, spinning, brass, the shotgun's red hull on
  the pump; the revolver's stay in the cylinder. **Smoke** off the barrel
  after a string (`smokeFor()`, `SMOKE`: five shots of an automatic, any
  shot of the big ones), a wisp rising from the muzzle. Both are one
  instanced mesh each, in a group at the eye with the world's turn (they
  hang in the world as you look round), K times out in the front sliver as
  the hands are; both left out under reduced motion. (Found on the way: a
  shader material isn't handed three's instance colours, so each carries
  its own attribute; smoke as pale as the sky doesn't read, so it's a
  mid grey.)
- **The light** (`lampLight()`): by day white; at night the moon's cool
  cast, and the nearest street lamp or lamp pool within `LIGHT.reach`
  (world.ts `lampTone()`: the town's white or sodium, the dead ones dark)
  warming and brightening the hands as it nears, eased. The plan said the
  nearest neon; the city keeps no list of its neon, and the lamps are what
  light the street.
- **Crouch, slide and vault**: the gun lower and canted crouched, tipped
  down and out sliding, swung down out of the way going over something
  (`ViewState.crouch` / `slide` / `over`, from walk.ts).
- **Found and fixed:** firing from the eye, his body shouldered the rifle
  and brought his head down onto the stock, so the cap's brim and the tie
  swung across the view as giant shapes. From the eye the viewmodel aims
  and kicks: walk.ts poses his body without the aim or the recoil there.
- **Checked** in the city headless: the suit with the watch, the puffer,
  the varsity and the track top at the hip, down the sight and crouched;
  a string and its smoke; the hands under a sodium lamp at night and away
  from one.
- **Cost**: the boot's code is 688.8 KB of 690.

### Phase 4: the car, the bike and the kart (built)

- **The car's seat** (carride.ts, the cars' fine-detail chunk): the eye
  moves on fpcam.ts's rules over the springs' own ride (`stepFp('car')` in
  `ride()`: a lurch on the throttle and the brakes, a sway against the
  turn, the eyes a little into it), knocked through the seat by a kerb
  under a wheel (`KERB_KNOCK`) or a bump into something (`car.jolt()`, from
  drive.ts); `car.eye()` hands drive.ts the view to lay on the camera. His
  right hand goes to the hub when you sound the horn (`car.horn()`,
  `Moving.hands(turn, horn)`, `HUB`; from the seat it's just under the
  view, from outside it shows).
- **The dash by model** (carcabin.ts): the indicators' arrows outside the
  gauges, lit green as they tick (`Moving.arrows`, `ARROW_ON`); the Glow
  Pod's screen on the dash with its route; the Boulevardier's cream dials
  in chrome on a walnut dash (`DIALS`). The rear-view mirror's glass on a
  material of its own (`mirrorMat()`), dimmed by night through `lit()` and
  greyed in the rain.
- **The bike from the helmet** (bikes.ts `look()`, seateye.ts): the eye
  at his own eyes, his head folded away, looking down the road enough that
  the bars, the mirrors, the clocks (a speedo in its pod on the bars,
  facing him, its needle) and his hands on the grips are in view; the
  lean, the lurch and the lead from fpcam.ts; the visor's edge round the
  top and the sides (`is-visor` on the city, fly.css); the field of view
  widening with speed as before.
- **The kart from the seat** (karts.ts `eye()`, seateye.ts): the wheel
  under his hands, the pods and the nose, out of the pits (V, as the bike's
  helmet) and in a race (V or the right stick, `toggleView()`, kept for the
  next race; kart.ts `placeEye()`).
- **One seat eye** (`seateye.ts`, tested in `tests/seateye.test.ts`, the
  bike's and the kart's chunks' only): `look()` (the eye, his head folded,
  ahead along the vehicle and round as you look, the motion) and `off()`
  (his head back). drive.ts lays every seat's view on the camera
  (`rotateY` the lead, `rotateX` the lurch, `rotateZ` the sway) and brings
  the near plane in for it.
- **Not done**: gloves on the bike (his hands are his own); the horn's
  hand isn't seen from the seat (the hub is under the view).
- **Checked** in the city headless: the hatch, the Boulevardier and the
  Glow Pod from the seat, driving, turning, braking and the horn; the Hop
  Scoot from the helmet; the Pocket Rocket out of the pits. The race's
  view wasn't driven headless (the same `eye()`).
- **Cost**: the boot's code is 689.6 KB of 690 (0.8 KB more: drive.ts's
  seat view and the race's V in walk.ts); everything else is in the cars',
  the bike's and the kart's chunks. Phase 5 on needs the budget raised (the
  owner's go).

### Phase 5: the hire boat (built)

- **The helm as numbers** (`helm.ts`, DOM-free, tested in
  `tests/helm.test.ts`; boat space, +x the bow, +z starboard): the bench
  (`HELM.seat`, moved back and up so his feet stand on the sole), the wheel
  on a pod off the console's aft face (`wheel`, `wheelPod`; its top leaning
  forward as a car's, `tilt`), the throttle's lever on a side pod by his
  right hand (`lever`, `leverBox`; `leverAngle()`, `knobAt()`: forward for
  ahead, back for astern), the dash's sloping panel with two gauges (speed,
  revs; `dash`, `gauges`, `onDash()`), the compass on its top, the
  windscreen (`screen`) and the view (`view`: how far the eyes look down,
  the field of view). `helmPose()`: seated, his left hand on the wheel's
  rim at ten o'clock, turned with it (`wheelHand()`), his right on the
  throttle's knob (`throttleHand()`), through `reachArm()`; the test holds
  both within 1.5 cm at every turn and push, his feet on the sole, his
  knees clear of the pods, and from his eyes the horizon, the wheel's top,
  both gauges (over the rim) and the knob in view.
- **The console drawn** (riverlife3d.ts `hireBoat()`, the moored boat's
  too): the dash's wedge and face, the gauges' faces, chrome rims and ticks
  lit faintly at night, their needles (`needles`, `NEEDLE_REST`), the
  wheel in grey and chrome on its column into the pod, the lever and its
  knob (`throttle`), the windscreen's glass see-through in the FX layer
  (`glass`) in a chrome frame.
- **From his eyes** (boat.ts, V; seateye.ts `seatEye('boat')`): his head
  folded away, the near plane in (0.08), a field of view of 68 widening a
  little with speed; the bow's lift with speed and the boat's lean ride
  the eye (it's in the boat), fpcam.ts's lurch, sway and lead on top, the
  view rolling with the lean. His body stays drawn (the chase camera hid
  him at the helm before), so looking back (the look, up to about 150
  degrees) shows the bench, the outboard and the wake.
- **Moving under his hands**: the wheel with the rudder, the lever with
  the throttle as it eases (`s.power`), the speed and revs needles (the
  revs the engine's voice's own number, a flutter on it). Other players'
  boats (remoteveh.ts) pose him the same, the lever at rest.
- **The spray on the screen**: drops from one seeded texture
  (`dropsTex()`) on a pane just aft of the glass, beading while the bow
  throws spray (`sprayOf()`) and on a knock, running down and drying off
  as it eases (`wet`); none under reduced motion. The bow's own spray is
  drawn smaller from the helm, so it doesn't fly past the eyes as blobs.
- **Checked** in the city headless: chase, the helm standing, running
  fast, turning (the drops on the glass), looking back, and back to the
  chase.
- **Cost**: nothing in the boot (689.6 KB): it's all the boat's and the
  river's chunks. The boot's budget was raised to 700 KB on the owner's go
  for the next phases.

### Phase 6: the cockpits (built)

- **The cockpits as numbers** (`cockpits.ts`, DOM-free, tested in
  `tests/cockpits.test.ts`; model space, +x the nose, +z the right wing):
  each aircraft's cabin (its body's stations, now `PROP_BODY` and
  `HELI_BODY` in airframe.ts beside `BIZ_BODY`, and the stretch that's
  lined), the windows cut in the lining (`holes`), the floor and the foot
  well, the seat, the panel and its gauges or screens, the controls, the
  pedals and the view (`view`: down, fov). `controlsOf()` turns the eased
  input into where each control stands, `handsOf()` / `feetOf()` where his
  hands and feet go, `pilotPose()` seats him with them there (`reachArm()`,
  `reachLeg()`). The test holds his hands within 1.5 cm and his feet within
  2.5 cm at every turn, climb and throttle, his head under the roof (the
  Sky Hopper's under its wing), his knees clear of the stick, the column
  and the levers, the horizon clear over the nose from his eyes and every
  gauge in view, and each control moving the right way.
- **The Sky Hopper**: the yoke in his left hand (back to climb, turned
  for the turn), the throttle quadrant by his right, six round gauges and a
  rev counter (the speed, the attitude's ball rolling and sliding with the
  pitch, the altimeter a turn every 100 m, the turn needle, the compass
  card, the climb), a headliner under the wing, side windows under it, the
  prop's blur through the screen. Its cowl was lowered a little
  (`PROP_BODY`) so the horizon shows over the nose from the seat.
- **The Neon Dart**: two screens drawn live ten times a second (the
  attitude with its speed and height tapes and the heading; the map,
  heading up, with north's arrow and the gear's three lights), the side
  stick on its console by his right hand (a centre stick couldn't be both
  clear of his knees and in reach in that cabin), twin throttles by his
  left, the gear lever (its three lights green with the gear down) and the
  flaps' lever moving with the gear (`GEAR_TIME`).
- **The Whirlybird**: the canopy all round the front and the chin windows
  at his feet either side of the keel, the cyclic between his knees in his
  right hand (forward to go forward, over to turn), the collective by his
  left (up to climb), the pedals, five gauges on a pedestal, the rotor's
  shadow flickering over the pedestal and the floor by day (not under
  reduced motion); a blade overhead through the canopy while it spools.
- **Drawn** by `cockpit3d.ts`, a chunk fetched the first time you take
  the seat (V; the old nose camera stands in until it's in): the lining
  wound to face in with the windows left open, the frames round them, the
  glass see-through in the FX layer, the bulkhead, the floor, the seat,
  the panel cut to the cabin's section with its glare shield, the gauges'
  faces lit faintly by day and fully at night (under the bloom), the
  controls as groups moved each frame, the pilot (walk mode's Degen in what
  he wears). The aircraft's glazing is its own part now (aircraft.ts role
  `glass`, `fleet.glass()`), hidden while you're in the seat: the shell's
  own faces point away from you inside, so the lining's windows look out
  through it.
- **From his eyes** (fly.ts, seateye.ts `seatEye('plane')`): his head
  folded away, the near plane in (0.08), the view banking with the
  aircraft, fpcam.ts's lurch and lead on top, the field of view per
  aircraft widening a little with speed; looking round (the look) shows
  the cabin and out of its side windows.
- **Cost**: the boot's code is 690.4 KB of 700 (0.8 KB more: fly.ts's
  seat wiring and the glazing as its own part); the cockpits' numbers, the
  drawing and the eye are all `cockpit3d.ts`'s chunk.
- **Not done**: the Sky Hopper's door-side window is glass, not a door
  that opens; the controls' reach was worked out for one pilot in the
  middle of each cabin (none of them has a second seat).

### Phase 7: checked (built)

- **The sweep** (headless Chromium on a software GPU, against the dev
  server): on foot, the three cockpits and the hire boat's helm at 1440,
  1024, 768 upright, 667 on its side, 375 and 320 upright (the narrow ones
  as touch screens with the touch controls), by day, at sunset and at
  night, in rain and under reduced motion. No page errors, nothing
  scrolling sideways at any width. The panels read at night (the gauges'
  faces and the jet's screens lit under the bloom, the cabins dark round
  them); rain beads on the boat's windscreen.
- **Found and fixed**: on an upright screen the views were narrow across
  (a phone held upright cut the Sky Hopper's outer gauges, a tablet the
  Neon Dart's speed tape). `fpFov()` in fpcam.ts (tested) widens every
  first-person view a little on an upright screen (`PORTRAIT`: 24 degrees
  a step of aspect under 1, at most 12): on foot, the car's, bike's and
  kart's seats, the helm, the cockpits and the ring's eyes. Phones line
  the cockpits with fewer facets.
- **Found, not first person's** (left for the performance plan): under
  reduced motion the crowd is drawn whole (`CROWD_VIEW.on` is off: the
  city's life runs once and stands still, so the crowd isn't culled to
  the view), about 40M triangles a frame where the same view draws about
  2.3M with motion on. The controls still work (the Sky Hopper ran up to
  speed); it's only heavy. The fix would cull the still crowd again
  whenever the camera moves, with the clock held.
- **The bench** (headless, the medium tier; draws and triangles, its frame
  times a software GPU's), against Phase 0's: `fp-street` 635 draws,
  2.29M (was 635, 2.32M); `fp-square` 571, 2.66M (was 549, 2.57M: the
  square's own view grew as much, 455 from 427, with what's been built
  since); `fp-seat` 464, 2.35M (was 469, 2.41M). A phone's and a
  laptop's numbers are the owner's to paste back from `?bench`.
- **The budgets**: the boot's code 690.4 KB of 700, the biggest lazy chunk
  37.4 of 60, the CSS 38.7 of 60; everything first person added past the
  boot is in its chunks (the cockpits, the gun hands' polish, the seats'
  eyes, the boat's helm).
- **The plan is done.**

## Not in it

- Live mirrors (the owner's call: painted).
- Seat views on the taxi, the metro and the river bus.
- Damage, a car radio.

## After the plan: the hands smoothed (the owner's call)

"Smooth the hands design of the character. In first person mode they look very basic." The owner's picks:
stylised smooth, a softer toon, first person and single figures (phones lighter, the crowd as it was), no nails,
gloves to pick and skin tones, all in one go.

- **Why they looked basic:** each hand was a box, a ball, a tube and five lathed fingers stuck together, and its
  normals were worked out after the parts were split into loose triangles, so every face was shaded flat: facets,
  and the ink drew stripes across the fingers and a line at every join.
- **The smooth hand** is `handmesh.ts` (tested in `tests/hands.test.ts`): the palm and wrist one loft with the
  heel and the ball of the thumb padded and the knuckles on the back, tapered fingers with joint swells and round
  tips, the thumb; built indexed (smooth normals), the fingers' normals eased onto the palm's where they come out.
  2,376 triangles a hand on desktops, 1,168 on phones (the old ones 1,684 and 1,104).
- **Shading:** the viewmodel's hands and gloves in a softer toon (`softPaint()`: the bands' edges blended, a faint
  rim). His body's hands seen from the eye keep the figure's toon, smooth now.
- **Gloves** (fingerless, full, driving; six colours) and **skin tones** (six) are look fields (`gloves`,
  `gloveColor`, `tone`), cleaned by `cleanLook()` (older looks: the art's tone, bare hands), picked in the fitting
  room's Hands tab, shown to other players online. All free.
- The boot went from 690.4 to 693.7 KB (of 700).

### Each gun's grip (the owner's call: "add the per-gun grips too")

- `fpgrip.ts` (tested in `tests/fpgrip.test.ts`, baked when the site is built) fits the first-person hands to each
  gun's real shape: the gun as voxels round each hand (inside by ray parity, part by part), the hand pushed out
  along its palm until the palm lies on the gun (the old placement had the right palm 1.5 cm inside the grip), his
  right slid along the grip until the index reaches the trigger, then each finger and the thumb curled at its own
  two joints (`posedHand()` in handmesh.ts) to touch the most of the gun with the least inside it. The index rests
  just off the trigger and goes onto it for a moment with each shot. The SMG's left hand holds its vertical
  foregrip (the right hand's hold, mirrored); on the Hand Cannon the left wraps over the right.
- What didn't work first: closing fingers from open until they touched (they started inside the grip) and the
  index "straight along the frame" (with the hand's angle a straight finger points out of the side of the gun).
- The solve takes about 13 s at build time; the browser reads the result (the boot grew 1.4 KB, to 695.1).
- Third person keeps the skeleton's one grip a hand (its three outer fingers share their bones).

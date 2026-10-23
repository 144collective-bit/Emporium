# Degen's animation: the AAA plan

The owner's call, critical: Degen's movement brought up to AAA quality,
starting with the run, which "looks unnatural and clunky". This is the plan
and its phases; build it one phase at a time with the owner's sign-off, and
keep this file up to date as each one lands. It follows on from
`docs/character-plan.md` (the body, the bones, the planted-feet walk), which
stays the record of how the body was built.

## What the owner asked for

- **What's wrong today:** the lean and inertia look very unrealistic; the
  legs are too fast and frantic; the body is stiff and robotic; there's no
  weight (floaty). Wanted: smooth, lifelike movement.
- **The target feel:** stylised AAA, Spider-Man / Ratchet & Clank: real
  motion-capture weight, a touch pushed for appeal. Degen's look doesn't
  change (ink outlines, flat cartoon shading, the one shared body).
- **Personality:** neutral athletic. Clean, realistic, sporty; no swagger.
- **Speeds:** a natural run by default and a separate sprint (below).
- **Where the motion comes from:** hybrid. Real motion capture, retargeted
  onto his 34 bones and baked at build time, with procedural layers on top
  (foot IK, stride warping, leaning, the gun, looking).
- **Foot slide:** near-zero, AAA style: feet locked to the eye (under about
  1-2 cm), the motion's natural rhythm winning over perfect maths. (Today's
  rule, a planted foot held under 4 mm, is what forces the frantic steps.)
- **Responsiveness:** the Spider-Man middle: starts and turns in about
  0.2-0.3 s with visible momentum, never laggy.
- **Scope:** core locomotion; jumps, falls and landings; armed and aiming
  movement; new moves: **crouch / sneak, slide, vault and ledge climb**, and
  **peeking** (lean round corners: hold Q left, E right).
- **Secondary life:** impacts and contact (brushing walls, bumping people,
  a hand on the wall when he stops close to one).
- **Who:** the player first; then everyone (crowds, soldiers, fighters,
  other players) on the same clips.
- **Phones:** the same motion; only the lighter extras (contact reaches, the
  finest IK) step down when frames are slow.
- **Camera:** part of the plan, subtle: a touch of FOV and lag on the
  sprint, a settle on stops, a small shake on hard landings, following the
  peek; all off under reduced motion.
- **Keys:** **F is the interact button from now on** (every job E does
  today), Q / E peek. Details in "Controls" below.
- **Credits:** a small credits screen (Options > Credits) is fine, so the
  best free mocap (CC BY) can be used.
- **Review:** an animation lab in the page (`?anim`) plus short videos with
  each phase.
- **First phase:** run, sprint and momentum (the fastest visible fix),
  with the pipeline and the lab under it.

## Where it starts from (why it looks the way it does)

Measured from the code, October 2026:

- **It's all formulas.** `locomotion.ts` makes the walk and run procedurally:
  each foot is planted where it lands, the swinging foot is a lerp from
  lift-off to landing plus a sine arc (`f.ankle.lerpVectors(...)`,
  `Math.sin(Math.PI * sw)`), the upper body is a handful of curves on speed
  (`gait()`: `lean`, `arms`, `elbows`, `bob`). Nothing is authored or
  captured; every run cycle is the same symmetric curves.
- **The run is a sprint.** `RUN = 5.4` tiles a second (`walk.ts`) is about
  9.7 m/s for a figure whose hips are 0.95 m up: about 10 leg lengths a
  second, an elite sprinter's pace. `WALK = 2.4` (4.3 m/s) is already a jog.
- **The cadence is forced.** `CADENCE` is solved so a planted foot never
  leaves the leg's reach, from hips held low. At sprint speed the stride
  can't grow, so the steps get quicker: the "frantic" legs. The Phase 2
  notes already called this "the price of feet that never slide".
- **The momentum is an exponential chase.** Velocity eases to the stick
  with a fixed rate (`damp(11, dt)` grounded), facing with another
  (`damp(12, dt)`): full speed in about 0.2 s with no acceleration shape,
  no braking distance, no plant-and-turn. The lean is the numerical
  derivative of forward speed, smoothed (`accel * 0.03`), and the bank is
  the turn rate times speed (`roll`): both spike on any stick wobble and
  read as the "unrealistic lean and inertia".
- **The pose has too few numbers.** Everything drives the skeleton
  through `Pose` (`skeleton.ts`): one lean and one twist shared down the
  spine by fixed shares (`SPINE_SHARE`), each limb as forward / out / bend.
  Real motion has the pelvis, each vertebra, the collarbones and the head
  moving on their own timing (overlap and follow-through): a `Pose` can't
  hold that, which is most of the "stiff, robotic" look.
- **What's good and stays:** the 34-bone skeleton and its skinning
  (`skeleton.ts`, `body.ts`), the two-bone leg IK (`reachLeg()`), the
  arm IK and gun holds (`reachArm()`, `stance.ts`, `gunfit.ts`), the GPU
  crowd clips (`crowdclips.ts`, `crowdskin.ts`), the build-time bake
  (`baked.ts`, `scripts/bake.mjs`), the fight clips (`fight-anim.ts`).

## How it's built

### The motion data

- **Sources** (licences checked again before anything ships; nothing
  non-commercial, since the site has a merch store):
  - **100STYLE** (Ian Mason et al., 2022): about 19 hours of mocap made for
    locomotion: forwards, backwards, sideways, running, turning and
    transitions, each in 100 styles, one of them **Neutral** (the owner's
    pick). Reported as CC BY 4.0 (credit needed); **the official licence
    must be confirmed first** (Phase 1's first step). The main source.
  - **CMU Graphics Lab Motion Capture Database**: free for all uses,
    including in commercial products, but never resold as data. Older and
    noisier; for what 100STYLE lacks (sprints, jumps, vaults, climbs,
    crouches, slides).
  - **Quaternius Universal Animation Library** (CC0): game-ready clips, more
    stylised; a fallback for anything still missing.
  - Not used: Ubisoft LaFAN1, the Bandai Namco set (non-commercial only),
    Mixamo (account-gated, unclear for a public web build).
- **In the repo:** only the trimmed takes we use, under `assets/mocap/`
  (BVH, each with its source, take name and licence), and
  `assets/mocap/CREDITS.md`. The raw datasets never go in.
- **The pipeline:** `scripts/mocap.mjs` runs inside the build's bake
  (`scripts/bake.mjs`, so it's the same idea as today's baked routes and
  crowd clips): parse BVH, map its joints onto `BONES` (a table per
  source), retarget (rest-pose correction per bone, root motion scaled by
  hip height: Degen's are 0.95 m, about a real person's), clean (foot
  contacts found from the toes' and heels' speed and height, contacts
  locked, small jitter filtered, loops closed by matching the end to the
  start), resample to 30 fps, quantise (rotations as 16-bit quaternions),
  and write the clips plus their **features** for matching (below). The
  fingers stay procedural (`grip`); mocap doesn't carry them.
- **Size:** phase 1's set (idle, walk, run, sprint, starts, stops, turns)
  is about 2-3 minutes of motion: around 150 KB raw, about 60 KB gzipped.
  It's loaded when walk mode starts (its own chunk, `import()`), never in
  the city's boot. A budget for it goes in `scripts/budget.mjs`.

### The runtime

Modules (DOM-free and tested unless marked):

- **`bonepose.ts`**: a pose as every bone's local rotation plus the root,
  in flat typed arrays. Blending (`slerp` per bone), masks (lower body,
  upper body, arms, spine, head), additive layers. `fromPose()` turns
  today's `Pose` into one, so the fight clips, the emotes, the kart seat
  and the gun holds keep working unchanged and can be layered over mocap.
  `poseSkeleton()` gains a bone-pose path.
- **`movesim.ts`**: how Degen moves, apart from how he looks. Velocity on a
  critically damped spring towards what the stick asks (a half-life per
  gait, so starting, stopping and turning have a real shape and distance),
  facing on its own spring, and a **trajectory**: where he'll be and face
  at 0.33, 0.67 and 1 s from now, and where he was. Lean and bank come from
  the trajectory's acceleration and curvature (smooth by construction),
  not from frame-to-frame differences.
- **`motionmatch.ts`**: **motion matching**, the method most AAA locomotion
  uses now. Every frame of the clips has a feature vector (the feet's
  positions and velocities, the hips' velocity, the trajectory's future
  positions and directions, about 27 numbers, normalised). About ten
  times a second (and at once when the stick changes sharply) the current
  pose and the movesim's trajectory make a query; the nearest frame in
  the database wins (a brute-force search over a few thousand frames is
  well under 1 ms; a k-d tree if it grows). Starts, stops, pivots,
  plant-and-turn and curving runs then come out of the data instead of a
  hand-built state machine. A state layer on top picks which part of the
  database may play (on foot, crouched, armed, sliding...).
- **`inertia.ts`**: **inertialization**: when the match jumps to a new
  frame, the difference between the old pose and the new is decayed to
  nothing over about 0.2 s (per bone, with its velocity), so nothing ever
  pops, with no cross-fade cost. Springs (`damper`, half-life helpers) live
  here too.
- **`footlock.ts`**: the feet on the ground. **Stride warping** scales the
  clip's strides to the speed he's actually going (within about ±20%; past
  that the gait changes instead), then each foot in contact is locked
  where it landed and the existing `reachLeg()` IK holds it (blending the
  lock in and out at contact edges), the hips lower when a foot would be
  out of reach, and the feet tilt to the ground (kerbs, stairs, Liberty
  Bridge, the kart park's banks) from `groundAt()`.
- **`animator.ts`** (view): puts it together for one figure each frame:
  movesim, motion matching, inertialization, foot lock, then the layers
  (gun hold, look-at, peek, contact), then the camera hints. Replaces
  `createLocomotion()` for the player; the old one stays for everyone else
  until Phase 7.
- **`anim-lab.ts`** (view, `?anim`): the review page. A treadmill (the
  figure stays put, the ground moves), a side, front and free camera,
  speed slider and stick input, slow motion (1/4, 1/10), frame step, the
  old and new side by side, foot traces and a foot-slide meter, the clip and
  frame playing, the match cost, the trajectory drawn. The owner reviews
  each phase here, and I send short recordings from it.

### Controls (the owner's calls)

- **F** does everything E does today: doors and prompts, the gun store,
  the garage, the kart hut, the trainer, get in and out of the car, kart
  and aircraft, closing those menus. The prompt reads "F Enter".
- **Q / E** (held): peek left / right, on foot (Phase 4).
- **Gun swap** moves from Q to **X**; 1-4 and the mouse wheel as before.
- **Fight Club:** click punches, right-click kicks (F stops punching; G
  still kicks).
- **Speeds on the keyboard:** W runs (the new default), **Shift sprints**,
  **Caps Lock toggles walking** (for strolling and indoors; it locked the
  run before). Never Ctrl or Alt (Ctrl+W closes the tab; Alt opens the
  browser's menu).
- **C** crouches (toggle); **C while sprinting slides** (Phase 5). Flying
  keeps C to dive.
- **Jump at an obstacle** vaults or climbs it (Phase 5).
- **Touch:** the stick as now (pushed fully, it sprints); one **Crouch**
  button (slide when sprinting); vault and climb come from Jump; peeking by
  aiming near a corner.
- **Gamepad:** left stick (fully over sprints, or L3), B crouch / slide,
  A jump, vault and climb, LB / RB lean while aiming, X interact (where Y
  did "get out").
- Every hint, prompt and the Controls panel's key list (`CityMap.astro`)
  follow the new keys; CLAUDE.md gets them too.

### Speeds (to be tuned in the lab)

Degen is about 1.1 tiles tall, a tile about 1.8 m; leg length about 0.95 m.

| Gait | Today | Planned | m/s | Leg lengths a second |
|---|---|---|---|---|
| Walk (Caps Lock) | none | ~0.85 tiles/s | ~1.5 | ~1.6 |
| Run (default) | 2.4 (a jog) | ~3.4 tiles/s | ~6 | ~6.5 |
| Sprint (Shift) | 5.4 (the run) | ~5.0 tiles/s, tuned | ~9 | ~9.5 |
| Aiming | 1.68 | ~1.4-1.7 tiles/s | | |

The sprint is fast for real mocap (actors sprint at about 7-8 m/s), so
it's stride-warped up, and that's the one place stretching shows: the lab
decides the top speed the owner likes the look of (5.4 is kept if it
looks right). The default run being faster than today's default gets the
player round the city quicker; the missions' and guide's distances don't
change.

### What doesn't change

- The body, its bones, its skinning, the wardrobe, the merch, the head
  and hands.
- The save, the multiplayer wire format (other players' animation is
  local; Phase 7 just plays the same clips from what the server already
  sends), the snapshot test (nothing in the city moves).
- Draw calls: the player is still 3-5 a figure. The crowds keep their
  GPU skinning (Phase 7 swaps their baked clips for mocap ones).
- Reduced motion: the player still animates (it's the game); camera
  effects are off.

### Tests

- `tests/mocap.test.ts`: the pipeline's output: every clip's bones are in
  `BONES`, bone lengths unchanged by retargeting, loops close (pose and
  velocity at the seam under a bound), foot contacts found where the feet
  are still, sizes under budget.
- `tests/movesim.test.ts`: time from standing to run and to sprint, braking
  distances, turn times, the trajectory matches what the sim then does.
- `tests/motionmatch.test.ts`: on fixed inputs the right part of the
  database wins (a straight run plays a run cycle, a reversal plays a
  pivot), search cost bounded.
- `tests/inertia.test.ts`: no pops: per-frame bone change under a bound
  through every transition.
- `tests/footlock.test.ts` (replacing the strict 4 mm checks in
  `tests/locomotion.test.ts` for the player): a locked foot moves under
  1.5 cm while in contact at every speed, turning, on stairs and slopes.
- The existing tests for the gun holds, the fight clips and the crowds stay
  green throughout.

## Build order

### Phase 1: run, sprint and momentum (the owner's pick for the first sign-off)

1. **Licences confirmed** (100STYLE's official terms; CMU's), the takes
   picked from the Neutral style (idle, walk, run, starts and stops from
   each, 90° and 180° turns, curves) and CMU sprints; `assets/mocap/` and
   `CREDITS.md`.
2. **The pipeline** (`scripts/mocap.mjs` in the bake): BVH, the bone map,
   retargeting, cleaning, contacts, loops, quantising, features.
3. **The runtime:** `bonepose.ts`, `movesim.ts`, `motionmatch.ts`,
   `inertia.ts`, `footlock.ts`, `animator.ts` for the player, with the gun
   hold and the emotes layered on top as they are today.
4. **Speeds and keys:** run default, Shift sprint, Caps Lock walk; **F
   interacts**, X swaps guns; every hint updated.
5. **The camera, subtle:** a touch of FOV and lag on the sprint, a settle
   on stops.
6. **The lab** (`?anim`) and **Options > Credits** in the start menu.
7. Tests as above; `npm run typecheck`, `npm test`, `npm run test:wide`,
   the budgets, `?bench` before and after on a phone and a laptop.
8. **For the sign-off:** recordings from the lab (side-by-side old and
   new: idle, walk, run, sprint, start, stop, a 180° turn, a curve) and the
   build to try.

### Phase 2: turning, terrain and transitions

- More of the data: sharp pivots at every speed, plant-and-turn, running
  circles (leaning into curves from the trajectory), walk-run-sprint
  changes mid-stride.
- Stairs and slopes from mocap (100STYLE has none; CMU has some), with the
  foot lock reading `groundAt()` ahead; kerbs stepped up, not climbed.
- Turning on the spot (90° and 180° steps from standing), idle variety
  (weight shifts, looking round after a while: today's ideas, now from
  mocap).

### Phase 3: jumps, falls and landings

- Standing and running jumps (take-off timed to the stride's push-off),
  the air (a fall loop that reads how long he's been falling), landings by
  how hard (soft, crouch, roll, a stumble on a big drop) blending back into
  the run without a stop.
- Camera: a small shake on hard landings (not under reduced motion).

### Phase 4: armed movement and peeking

- Strafing and backpedalling in eight directions from mocap while aiming
  (the body faces the aim, the legs the way he goes: the hips rotate within
  a limit, then he steps round), the aim walk, the sprint with the gun held
  low.
- The gun hold (`stance.ts`) on the upper-body mask over mocap legs.
- **Peek** (Q / E held): the upper body leans out from the hips, the head
  levels, the feet stay put, movement slows; armed or not. The walk camera
  shifts with it (and stays out of walls, through `CAMERA_GRID`). Touch
  and pad as in "Controls".

### Phase 5: crouch, slide, vault and climb

- **Crouch / sneak** (C toggles): crouched idle, walk and turns; the
  camera lowers.
- **Slide** (C while sprinting): into the slide, along the ground with
  friction, up into a run or a crouch.
- **Vault and climb** (Jump at an obstacle): the solids' boxes give the
  height, but their tops today are rough ("for the camera"), so the low
  things worth vaulting (railings, barriers, benches, low walls, the
  jersey barriers) get accurate heights first. Vault anything waist-high,
  climb ledges up to about head height (hands placed on the edge by the
  arm IK), drop down the other side. Nothing new becomes reachable that
  shouldn't be (roofs stay out of reach unless the owner says).

### Phase 6: impacts and contact

- Brushing past a wall or another person: the shoulder gives, the step
  hitches (an additive layer); bumping into people (they react too, on
  the crowd's side).
- Stopping close to a wall: a hand goes out onto it (arm IK).
- Running into a wall at a sprint: a stagger, not a stop dead.
- On phones these step down first if frames are slow.

### Phase 7: everyone

- The crowds' baked clips (`crowdclips.ts`) recorded from the mocap walk
  and run instead of the formulas (still GPU-skinned, still a few draws);
  the soldiers' march from mocap.
- The Fight Club's fighters and other players (`fight-figure.ts`,
  `remote.ts`) on `animator.ts`, fed from where they're drawn (no new
  network traffic).
- `locomotion.ts` retired once nothing uses it (its leg IK lives on in
  `reachLeg()`).

## Open questions for the owner

- The sprint's top speed: decided in the lab in Phase 1 (5.4 kept if it
  looks right stretched).
- If motion matching's starts and stops look worse than hand-picked
  transition clips in the lab, Phase 1 falls back to a blend space with
  start / stop / pivot clips; the owner picks from recordings of both.
- Vault and climb (Phase 5): may he reach places he can't today (a low
  roof, a wall top)?
- Whether the crowds (Phase 7) get a little variety from other 100STYLE
  styles (still within "neutral athletic" for Degen himself).

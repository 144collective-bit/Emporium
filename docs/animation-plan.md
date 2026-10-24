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
- **The rifle** (added with Phase 3, as the final phase, then built next):
  aiming a rifle, he holds it properly, the butt in his shoulder. It was
  held low in front of his chest (Phase 8).
- **Review since Phase 2:** no videos; straight to the merge.

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

### Speeds (tuned: walk 0.78, run 2.8, sprint 4.2 tiles a second since the stride fix, below under "Fixes along the way"; the table is the first plan)

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

### Phase 1: run, sprint and momentum (built, signed off)

What's in:

- **The data: CMU, not 100STYLE (yet).** This environment can't reach
  Zenodo (where 100STYLE lives) or its author's site, so its licence
  couldn't be confirmed or its files fetched. CMU's terms are confirmed in
  the files themselves ("free for use in research and commercial projects
  worldwide", an acknowledgment asked for). One actor carries the whole
  phase: **subject 143**, a quick, athletic mover (neutral, the owner's
  pick): run, run to stop, start to run, a running figure eight, run-stop-
  run, walk, a walking figure eight and pacing (eight takes, 48 s,
  `assets/mocap/takes.json`). The run is made a seamless six-cycle loop
  (`loopClip()`). 100STYLE can be added on top later if the owner allows
  `zenodo.org` in the environment's network settings and its licence
  checks out.
- **The pipeline** is `npm run mocap` (`scripts/mocap.mjs`, the work in
  `mocap-build.ts`, the BVH reader `bvh.ts`), writing
  `src/data/mocap/clips.bin` (211 KB, fetched when walking starts); a test
  holds the file to exactly what the pipeline makes. Two fixes found on
  the way: the feet are kept level in the T-pose (CMU's ankle sits lower
  over the sole than Degen's, so lining up ankle-to-toe tipped his toes up
  23°), and the floor is found from the ankles.
- **The runtime**, all DOM-free and tested: `movesim.ts` (the springs),
  `inertia.ts` (springs and inertialization), `motionmatch.ts`,
  `animator.ts` (playback warping, the sprint and bank layers, the foot
  lock and IK). `bonepose.ts` and `footlock.ts` from the plan went into
  `mocap.ts` and `animator.ts`; `Pose` stays for everything else
  (`applyTo()` overwrites the 22 body bones after the figure's own
  `update()`, so fingers, grips and held things are as before).
- **The feet**, as measured by the tests over every kind of move (a held
  foot's movement over the ground): under 0.5 cm running, walking,
  sprinting, weaving and circling; 1.6 cm turning straight back; 2.4-2.7 cm
  in a hard stop from a run or a sprint (a foot the body has left behind
  lets go and catches up rather than crouch the hips). The knee is a hinge
  that never bends backwards, with a soft reach so a straight leg never
  snaps; no bone turns more than 0.7 rad between frames.
- **Where it plays:** the player on foot, unarmed, not aiming or emoting,
  on the ground. Armed or aiming, emoting, in the air and landing hard
  (the crouch and roll) it's the procedural walk as before, blended across
  in about 0.15 s. Armed movement is Phase 4, jumps Phase 3.
- **Speeds** (`GAITS`): walk 1.25 tiles a second (Caps Lock), run 3.4 (the
  default, the actor's own run), sprint 5 (Shift, or the stick pushed all
  the way, or the touch button, now "Sprint"). No capture goes that fast
  (CMU's quickest runs are about 4.5 m/s, Degen's sprint is about 9): the
  sprint is the run played up to 35% faster, with the longer strides the
  feet's lock allows and a harder arm and knee drive and lean.
- **Momentum:** starts reach 90% of the run in about a quarter of a second
  without overshooting, a stop takes 0.3-1.2 tiles, a turn round about a
  third of a second; the lean into bends reads the springs (capped at
  0.12 rad), the start and stop leans are the actor's own.
- **Keys:** F does everything E did (doors, counters, getting in and out,
  closing menus); X swaps guns; Q and E are free on foot for peeking
  (Phase 4); F no longer punches in the ring (the click does). The gamepad
  is unchanged.
- **The camera:** a touch wider at a run, more at a sprint, the camera
  falling a little behind on a sprint and dipping softly on a hard stop
  (off under reduced motion).
- **The lab** (`?anim`) and **Options > Credits** in the start menu.
- **The weight it adds:** 3.8 KB gzipped to the city's boot (the springs
  and the loader); the animator is its own chunk with the clips.
- Not yet: other players, crowds, fighters (Phase 7); idle variety
  (standing is the actor's quiet stands between takes); stairs from
  capture (the feet follow kerbs and slopes; Phase 2).

### Fixes along the way

- **Shoulders up by his ears** (the owner, after Phase 8: "his shoulders
  look unnatural when he runs"): CMU's shoulder joint sits at the base of
  the neck, so aligning Degen's collarbones to the segment from it to the
  arm held them in a 37° shrug in every clip (the arms made up for it, so
  the hands were right and the shoulders weren't). The collarbones are now
  kept level like the feet (`=` in `mocap-build.ts`'s map; a test holds
  them under 0.3 rad). With it, the model's shoulders went natural
  athletic for every top (sloping trapezius, rounded deltoids: CLAUDE.md,
  the character section).

- **Legs too fast when sprinting** (the owner: "his step size is small,
  causing his legs to move very fast"): subject 143, whose run, walk,
  starts and stops carry most of Phase 1, was captured at 60 frames a
  second but the conversion marks it 120, so he played at double speed
  (running at 5.7 steps a second, walking at 3.3; a real runner takes about
  3, a walker about 2). His takes now say `"fps": 60` in `takes.json`. That
  made his run a 3.4 m/s jog, so the owner picked: speeds a bit slower
  (`GAITS`: walk 1.4, run 5, sprint 7.5 m/s), an athletic sprint, and the
  difference made up the way a runner does (`WARP` in animator.ts): his legs
  turn over only a little quicker (a power of 0.3 of the ratio), a foot on
  the ground plays fast enough to stay put under him (a shorter contact,
  no sliding, no hips dropping), the air plays slower (more hang time),
  a swinging knee lifts higher, and into a sprint, once he's done speeding
  up, he reaches up to 1.2 times further; the sprint's arm and knee drive
  is a little stronger (`LAYERS.sprintSwing` 0.55). Measured: walking 2.1
  steps a second of 0.66 m, running 3.3 of 1.55 m, sprinting 3.6 of 2.1 m
  (it was 7.8 steps a second of 1.16 m). Other actors' runs were tried
  for longer steps (127_07, 104_37, 78_06): one had a foot that flips in
  the data, one quick short steps, one a dip on one side; subject 9's
  (09_01) stayed. The clips file is 505 KB (it was 336 KB at double speed).
  Along the way: the ball of a foot is never put under the ground (a blend
  between two clips could put one's ankle with the other's tilt), a free
  foot reaches no further down than a step (it reached off ledges), the
  take-off's push plays at about its own speed, and the sprint's layers
  ease out in the air.

- **Posture, hands and twitching** (the owner, from a screenshot of him
  standing in the city: "his posture is strange, his hand is not right, he
  twitches and his animation needs improvement"; and his hands empty, the
  gummy bag retired). Measured first, frame by frame, then fixed:
  - *The hands stood out 80° from the forearms in every clip.* CMU's
    `FingerBase` joint sits on the wrist (offset 0 0 0), so the hand was
    aimed along a zero-length segment. It's aimed at `HandIndex1` now; and
    since the capture's hand turn is noisy (up to 40° in a frame), each
    hand keeps a smoothed share of it (`HANDS`, `calmHands()` in
    mocap-build.ts). Tests: no hand over 25° sideways or 0.07 rad a frame.
  - *He stood in a half crouch* (knees 33-37°, leaning back 5°, head
    tilted). The leg IK softened past 96% of the leg's reach, which holds a
    planted knee at about 30°; it's 98% now (`SOFT`). The standing takes
    are a runner's ready stance, so standing still he stands up straight
    (`STANCE` in animator.ts: the hips rise until a held leg is nearly
    straight, the other easier, the spine and head come upright, the arms
    hang by his sides and the elbows ease straighter; eased in and out).
    Measured: knees 6° and 13°, upright within 1°.
  - *His head snapped every 0.8 s standing.* The old idle (137_28) turned
    right round within its first second, so the search kept cutting back to
    its start with a 3.5° snap of the head. Standing still is now three calm
    loops of subject 143 standing before setting off (`idle`, `idle-2`,
    `idle-3`; `cycle` in takes.json for a loop longer than a step, and a
    still take's loop faces the way it faces), taking turns (`standElse`).
    A test holds 40 s of standing to under 3° a frame on any bone.
  - *Glitches in the capture*: a bone thrown 24-49° for a single frame and
    back (`walk-eight`'s spine, chest and neck) is put back between its
    neighbours (`SPIKE`, `despike()`), and the toes, the noisiest markers,
    are smoothed (`TOES`). A test holds every clip free of them.
  - *A knee snapping on take-off* (0.8 rad in a frame, the leg IK's hold let
    go at once): the legs ease from what they showed over `LEG_BLEND`.
  - In the city the motion capture eases in over a quarter second after an
    emote, a slide or a vault (it was 0.18 s, a jolt), out over 0.15.
  - *The hands themselves* (skeleton.ts `HAND`, body.ts): a tenth of his
    height wrist to fingertip, the palm a hand's thickness, not a block,
    longer fingers, a relaxed curl (`RELAXED` 0.3). Carried things (coffee,
    phone) are held in front of the hand: `addCarry()` eases the arm out
    and turns the forearm so the thumb leads (the capture's hands hang
    thumbs in, which put them into his leg).
  - The shoulders: the body stops short of the arm's outside and the
    sleeve's cap is rounder, so the shoulder is the deltoid, not a square
    corner (every top).
  - The lab takes `held=coffee|boombox|phone|briefcase`.

### Phase 1 as it was planned

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

### Phase 2: turning, terrain and transitions (built, merged)

What's in:

- **More data** (all CMU, credited): running turns either way and a quick
  stop into a run (subject 127, an athletic actor whose runs are a jog's
  pace, so they also cover the speeds between walking and running), walking
  into a run (127_04), turning on the spot in 90° steps (69_17) and nine
  seconds of standing and waiting (137_28, a neutral idle: weight shifts,
  a glance at the watch, hands on the hips). 14 clips, 76 s, 336 KB (gzip
  only takes 20% off: frame-to-frame differences would take 30%, an option
  if the download matters).
- **Turns that come from the capture:** his shown facing follows the
  clip's own turn and is pulled towards the springs' (`FACE`: gently when
  he's slow, firmly at a run, never more than 0.9 rad off), so a turn round
  from standing is the actor's plant and turn (143_42's 180° pivot), not a
  spin on the spot. The figure is placed with `animator.face`.
- **Standing settles:** still for a moment, only the idle is searched
  (`STAND`), and once in it a frame must be much better to take over, so
  its shifts play through (from 8 jumps a second in the quiet frames before
  a take sets off to under one). Frames near a clip's end cost a little more
  (`ENDING` in motionmatch.ts), so a long stretch of the right motion wins.
- **Terrain:** a free foot clears the ground under it and just ahead
  (`LOCK.look`), eased up quickly and down gently, so it never cuts a kerb
  or a step's nose; a held foot goes straight up onto higher ground and
  eases down; the hips follow the feet standing above his own ground, held
  ones fully and the free one a quarter (`LIFT`), as a pelvis follows the
  foot it stands on; the drop can undo the lift. Kerbs: no foot more than
  a few millimetres into a slab at a walk, run or sprint.
- **Liberty Bridge's stairs:** walking follows their even ramp as before,
  but the feet stand on the treads as drawn (`stairTread()` in liberty.ts,
  the animator's `feet` ground), and he climbs them at a brisk climb at
  most (`CLIMB` 1.75 tiles a second in walk.ts): their steps are big for
  his body (41 cm risers, 56 cm treads) and running up them with a flat
  run's strides folded the knees. A held foot stands within about 20 cm of
  its tread (most of that the heel and the ball rolling off at push-off).
- **Measured** over every move the tests run: a held foot moves under
  0.6 cm over the ground (1.6 cm turning straight back); no bone turns more
  than 0.7 rad between frames (0.9 at a kerb's edge).
- **The lab:** floors (flat, kerbs, stairs of Liberty Bridge's size) and
  two more programs, setting off the way he faces away from, and gait
  changes (walk, run, sprint, run).
- Not yet: stairs from capture (none of CMU's fit steps this size); the
  crowds and other figures (Phase 7).

### Phase 2 as it was planned

- More of the data: sharp pivots at every speed, plant-and-turn, running
  circles (leaning into curves from the trajectory), walk-run-sprint
  changes mid-stride.
- Stairs and slopes from mocap (100STYLE has none; CMU has some), with the
  foot lock reading `groundAt()` ahead; kerbs stepped up, not climbed.
- Turning on the spot (90° and 180° steps from standing), idle variety
  (weight shifts, looking round after a while: today's ideas, now from
  mocap).

### Phase 3: jumps, falls and landings (built, for the owner's sign-off)

What's in:

- **More data** (CMU, credited): four running jumps over something
  (127_25-28) and two run-jump-stops (127_21, 127_22, cut to 2.4 s), all
  subject 127 at a jog's pace, and subject 143's standing jumps for
  distance and for height (143_05, 143_06). 22 clips, 93 s, 410 KB.
- **The flights are found in the data** (`motionmatch.ts`: both feet off
  the ground at least 6 frames with the hips rising at least 0.06, so a
  run's own flights don't count): 20 jumps counting the mirrored ones, each
  with a take-off 3 frames before it leaves the ground and a touchdown.
  Searches on the ground never land in a jump or just before one (as at a
  clip's end), and the standing jumps' wind-ups (a crouch and an arm swing
  that looked like a jog to the search) are shut to them altogether
  (`JUMPS_ONLY`).
- **Taking off** (`animator.ts`, `AIR`): on the frame Jump is pressed the
  game launches him as before (no delay added: the jump stays snappy) and
  the animator cuts, inertialized, to the take-off that carries on best
  from the pose and the trajectory: a running jump off the right foot at
  a run or a sprint, a standing two-footed one from the idle. A walk or run
  off something higher than a kerb (over 0.3 tiles, or 0.18 s in the air)
  starts from a flight's top instead: a fall, no jump.
- **In the air** the flight plays as far through as the game's own rise
  and fall have gone (its vertical speed against the jump's), never
  backwards, so a short hop (Jump let go early) flies its flight through
  in time; its last frames (the legs reaching for the ground) play as the
  ground comes up, worked out from his height and speed. The flight's own
  rise is taken out of the hips (the game does the jump), no foot is held,
  and nothing reaches for the ground. **A long fall** (the flight's frames
  used up) raises the arms up and out, up to 0.7 rad over 0.6 s.
- **Landing** plays the flight's own touchdown straight on unless another
  costs under three quarters of it: a running jump lands running on (its
  clip runs on after), a standing one lands standing and settles into the
  idle, and letting go of the stick mid-air lands on one that stops. For
  0.3 s the landing plays out unless a search finds something far better.
  **Harder landings** (faster than 4.5 tiles a second: a drop of about a
  tile or more) squash the hips down and bow the chest, more the harder
  (about 9 cm from a 1-tile drop, 16 cm from 2 tiles, 25 cm at most), with
  the feet held where they landed so the knees take it; then he comes back
  up into his run. The roll on a very hard landing at a run (`LAND_ROLL`)
  stays the keyed one from locomotion.ts; the crouch under it is now the
  capture's.
- **The camera** dips with every landing (more the harder) and shakes
  briefly on a hard one (walk.ts, `LAND_SHAKE`); neither under reduced
  motion or in first person.
- **Walking it:** the motion capture now plays in the air too (walk.ts
  passes `grounded`, his vertical speed, the jump and gravity); armed,
  aiming or emoting it's the procedural walk and jump as before.
- **Measured** by the tests (running, sprinting, walking and standing
  jumps, short hops, falls off ledges of 0.6 to 4 tiles, a kerb that isn't
  a fall): no foot held in the air; the feet never more than 2 cm deeper
  into the ground than running on the flat does (the ball of a foot rolls
  a few centimetres under it at push-off); no bone turns more than 0.7 rad
  between frames (0.75 on a hard landing); the same every time.
- **The lab:** Run & jump, Stand & jump and Short hops; a ledge floor (a
  ramp up, a drop of 1.6 tiles); Space jumps by hand; the walk.ts jump and
  gravity for both figures; an Air readout (in the air, Jump held, the arms
  coming up, the landing's squash).
- Not yet: a stumble on a big drop (the hard landings squash and come up
  instead); jumps from capture while armed (Phase 4); the crowds (Phase 7).
  CMU has no running jumps at Degen's run speed: subject 127's are a jog's,
  so the flight is the jog's leap played over the game's faster, higher
  jump (about 0.65 s up against the capture's 0.45).

### Phase 3 as it was planned

- Standing and running jumps (take-off timed to the stride's push-off),
  the air (a fall loop that reads how long he's been falling), landings by
  how hard (soft, crouch, roll, a stumble on a big drop) blending back into
  the run without a stop.
- Camera: a small shake on hard landings (not under reduced motion).

### Phase 4: armed movement and peeking (built, for the owner's sign-off)

What's in:

- **More data** (CMU, credited): subject 143's walking backwards and
  sideways (143_39, 143_40, at their real 60 frames a second, about 0.8
  m/s), subject 141's quicker ones (141_31 backwards at a jog, about 2.4
  m/s; 141_33 a side shuffle, about 1.3 m/s; 141_32 a crossover step on
  the diagonal), cut to their good parts. 28 clips, 138 s, 605 KB (the
  file's test limit went to 680 KB; it's fetched when walking starts, not
  at the boot).
- **Facing the aim:** aiming, peeking or in first person the springs turn
  him to where the camera looks (as before), and now the trajectory the
  matching looks for faces it too (`AnimInput.faceGoal`), so going
  sideways or back finds the strafes and backpedals, never a run turned
  round. Measured aiming down one way and going each of the eight ways
  at the aiming speed and the walk: the hips within 4° of the aim, a held
  foot sliding under 1 cm, the strafing takes playing sideways and back.
  The hips stay within `FACE.most` of the aim; standing, turning the aim
  further than `STAND.turn` (0.35 rad) from his hips lets the search past
  the idle, so he steps round (the turn on the spot) instead of twisting
  on his planted feet.
- **The gun's hold over the capture's legs:** with the gun in his hands
  (or an arm out aiming, unarmed) the animator gives only the legs and
  the hips; the upper body is the procedural pose with `stance.ts`'s hold
  on it, the spine turned so the chest keeps the turn that pose gave it
  under the figure as it's drawn (`applyTo(..., upper, yaw)`), so the
  gun points where you look whatever the legs do (the test holds the
  chest and head to the pose's to 1e-4). The mask eases in and out
  (`upperW`, 0.15 s). Sprinting armed, the hold relaxes the gun low
  across him as before, over the capture's sprint.
- **Aiming speed** 1.4 tiles a second (about 2.5 m/s, the plan's low end;
  it was 1.68): the strafing takes go up to about 2.4 m/s.
- **The peek** (`addLean()` in animator.ts, `PEEK` in walk.ts): Q / E held,
  LB / RB while aiming on a gamepad, and on touch aiming by a corner (the
  view ahead blocked within 1.4 tiles, clear for 3.5 from a lean out to
  one side: `cornerSide()`, looked at five times a second). The spine leans
  out 0.42 rad over the hips about where the camera looks, the head turned
  back level (less with his cheek on a stock), the feet where they are; as
  far as there's room beside him; he slows to 55%, faces the look, and the
  camera goes out with him (over his right shoulder, or across to his
  left), its sideways shift clamped through `CAMERA_GRID` so it never ends
  in a wall (that clamp now holds the shoulder offset too, always). First
  person: the eye shifts 0.3 and the view tilts 0.08 rad (not under
  reduced motion).
- **The inertialization** now moves each side at the speed it plays (the
  clip being left at its rate, the next at its own), so a cut out of a
  time-warped stride keeps its real speed (a sprint's take-off).
- **The lab:** Strafe 8 ways, Aim round and Peek programs, Q / E by hand,
  the armed mode on the capture's legs (as in the city), and an Aim
  readout (how far the legs are off the aim, the peek).
- **Controls:** the Controls panel lists Q / E, the gamepad and touch notes
  say how to peek.
- Not yet: other players and the crowds still walk procedurally armed
  (Phase 7); jumping armed is the capture's jumps under the hold.

As it was planned:

- Strafing and backpedalling in eight directions from mocap while aiming
  (the body faces the aim, the legs the way he goes: the hips rotate within
  a limit, then he steps round), the aim walk, the sprint with the gun held
  low.
- The gun hold (`stance.ts`) on the upper-body mask over mocap legs.
- **Peek** (Q / E held): the upper body leans out from the hips, the head
  levels, the feet stay put, movement slows; armed or not. The walk camera
  shifts with it (and stays out of walls, through `CAMERA_GRID`). Touch
  and pad as in "Controls".

### Phase 5: crouch, slide, vault and climb (built, for the owner's sign-off)

What's in so far:

- **More data** (CMU, credited): subject 136's crouched walks (136_10 and
  136_09 forwards, 136_11 backwards, about 0.8 m/s, cut to their good
  parts; `sink` in `takes.json` lowers 136_09 and 136_11 by 1.8 cm, where
  the capture's planted feet stood high over the ankles' low point and
  the contacts missed them). 31 clips, 153 s, 671 KB (the file's test
  limit went to 720 KB).
- **Crouch** (C toggles, B on a gamepad, the touch Crouch button over the
  stick): moving crouched, only the crouched walks are searched (and
  standing up, never them); standing still crouched, the idle plays with
  the crouch laid over it (`CROUCH`: the hips 0.16 down, the legs' IK
  bending the knees over planted feet, the spine 0.42 forward and the head
  back up), eased in and out as the clip changes, so a crouched turn on
  the spot is the turning take crouched. He goes at 0.55 tiles a second
  (about 1 m/s), sprinting or jumping stands him up, and the camera comes
  down 0.26. Armed, the hold keeps his upper body upright over the
  crouched legs. Tested: crouched walking is on the crouched takes over
  90% of the time, crouched standing on the idle with the hips well down,
  standing up never a crouched take, the feet held to under 2.5 cm.
- **Slide** (crouch while sprinting): `startSlide()` / `stepSlide()` in
  movesim.ts (only from 3.4 tiles a second, off 8% faster, slowing by 3.4
  tiles a second², steering 0.9 rad a second at most, over by 1.5 tiles a
  second or 1.1 s: about 3 tiles, 5 m); its pose is keyed (`slidePose()`,
  `SLIDE_POSE` in poses.ts: the hips 0.26 up, leant back, the leading leg
  out on its heel, the other folded with its knee and shin on the ground,
  an arm forward and the other back to the ground), the motion capture
  stepping aside for it (in 0.06 s, back over 0.12). It ends in a run with
  the stick pushed, a crouch without, a crouch against whatever it runs
  into, or a jump; the camera comes down 0.42 during it.
- **Vault and climb** (the owner's calls: low things only, over and down,
  he never stands on top): no CMU take vaults or mantles (127_33-36 "Run
  Over" step across a low box), so both are keyed (`vault.ts`). What
  counts is a list made from the data with real heights, `LOW_THINGS`: The
  Trenches' jersey barriers (0.55), yard kerbs (0.4) and dumpsters (1.0),
  Westlake Park's walls and hedges (0.55), beds and planters (0.42), and
  downtown's alley crates, pallets and bins; never a building, a car, a
  kiosk or a stall, and nothing on top of anything. Jump while moving at
  one within reach (0.85 tiles), 0.25 to 0.75 over his ground (a vault)
  or up to 1.25 (a climb), at most 1.3 thick, come at squarely: he goes
  over it to the far side if the landing is clear and within 0.45 of his
  own ground and nothing but low things under the arc stands in the way;
  otherwise it's a jump as before. The vault (about 0.9 s): up early, his
  left hand planted on the top (the arm IK) and the tucked legs swung out
  to his right, down and on at a run. The climb (about 1.1 s): up to the
  face, both hands on the top, pulled up with the knees tucked, over and
  down. Tested: his feet, shins and hips never more than 3 cm into the
  thing, a hand on its top while planted, from where he set off to the
  far side; every low thing is a solid walking meets and none is tall.
  In the city: over a jersey barrier behind Bottom Street's car park.
  Jumps now count the press down after looking at it (a slow frame lost
  it before).
- **The lab:** Crouch, Sprint & slide and Vault & climb programs (a walls
  floor: a park wall's height, then a dumpster's), C and Jump by hand, a
  Crouch readout.
- **Controls:** the Controls panel and the gamepad and touch notes.

As it was planned:


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

### Phase 8: the rifle in his shoulder (the owner's call; built first, after Phase 3, for the owner's sign-off)

What's in:

- **The butt in his shoulder:** every long gun has its butt pad's middle
  (`butt` in `FIT`, gunfit.ts), and at the ready and aiming stance.ts
  places the gun by it: the butt in the pocket of his right shoulder
  (`POCKET`, just inside the joint and in front of it), the gun pivoting
  there, a shot shoving it back along itself, a reload bringing it down
  off the shoulder. At the ready the muzzle is down 0.3 rad (`LOW_READY`);
  relaxed, the gun comes off the shoulder to the low carry across his body
  as before.
- **The cheek on the stock:** aiming, his head comes down onto it: pitched
  and tilted (the neck and head together, `Pose.headRoll` new for the
  tilt) so his right eye is on the sight's line, facing along the barrel
  (`CHEEK`, solved in a few Newton steps from `eyeAt()`, which the tests
  hold to the skeleton's own posing). His build (a big head, short arms)
  puts his eye about 10 cm over the line a real stock rises, so the gun
  also comes up and across to meet it, at most 6 cm (his shoulder rising
  to it). A reload lifts the head off; walk.ts and remote.ts add the look
  only the rest of the way (`Stance.cheek`).
- **The body behind it:** side-on as far as the support hand needs to
  reach the handguard (`MAX_TURN` now 1.2 rad; about 1 for the rifle, 0.7
  the SMG, 0.35 the bullpup), and the spine taking 60% of the look up or
  down (`SPINE_AIM`, 30% before), so the head and the stock stay together.
- **Measured** (tests/gunfit.test.ts) for all six long guns looking from
  0.5 rad up to 0.5 down: the butt within 6.5 cm of the shoulder's pocket
  and on his right; the eye within 2.5 cm of the sight's line (4 cm looking
  well down); both hands on the gun as before, through reloads and draws.
- **The lab:** an armed mode (each gun, aiming or at the ready, the look
  swept up and down or fixed with `pitch`), a camera over his right
  shoulder like walk mode's, and markers at the gun's butt (yellow) and
  his shoulder's pocket (cyan).
- Armed movement from capture came in Phase 4 (the hold over the
  capture's legs). Not yet: the shooting elbow is reachArm()'s (down, a little
  out), not raised.

What was wrong (the owner's screenshot) (the owner's screenshot, from behind while aiming):
the rifle is held low in front of his chest, the stock nowhere near his
shoulder. `holdGun()` in `stance.ts` places the gun by its pistol grip
(about 18 cm in front of the torso frame, on his middle, a little under
the shoulders) and turns it to where he looks; the butt pad, 32 cm behind
the grip, ends up under his chin in the middle of his chest. The hands are
right (reachArm() puts them on the grip and the handguard); the gun isn't.

What it will be, for every long gun (rifle, SMG, shotgun, marksman rifle,
burst carbine, belt feeder; the revolver keeps its two-handed hold):

- **The butt in the shoulder pocket:** each long gun gets a `butt` point
  in `FIT` (`gunfit.ts`, where its butt pad is in gun space), and aiming
  places the gun so the butt sits in the pocket of the shooting (right)
  shoulder, just inside the joint and in front of it, following the
  collarbone as it moves. The gun pivots there: up and down with where he
  looks, round with the aim.
- **The cheek on the stock:** the sight's height over the butt brings it
  to about his eye; the head comes down and over onto the stock (a tilt
  and a turn within the neck's limits) so the eye sits behind the sight,
  as it does in first person.
- **The body behind it:** bladed side-on far enough for the support hand
  to reach the handguard (it does a little of this today), the shooting
  elbow out and up, the support elbow under the gun, the chest leaning
  into it. Recoil pushes the shoulder back and the gun pivots in it, rather
  than the whole gun sliding back.
- **Ready and carried:** at the low ready the butt stays in the shoulder
  with the muzzle down; carried relaxed (`ready` 0) and slung (`STOWED`)
  as today. The draw and the reload clips end in the shouldered hold.
- **Others too:** other players use the same hold (`remote.ts`); the
  soldiers carry theirs at the port as today.
- **Tests** (`tests/gunfit.test.ts`): at full aim, at every pitch from
  looking down to looking up, for every long gun, the butt within about
  2 cm of the shoulder pocket, the sight within a few centimetres of the
  line from his eye along the aim, both hands on the gun, no arm past its
  reach; the reloads still start and end at rest.
- **The lab:** an armed mode (each gun, aim held, the pitch swept) with a
  view from behind and from the side, to compare against the owner's
  screenshot.

## Open questions for the owner

- The sprint's top speed: 5 tiles a second for now (today's run was 5.4);
  it's the run pushed harder, since no capture runs that fast. Faster is a
  number in `GAITS`, at the cost of more stretch.
- 100STYLE: allow `zenodo.org` in the environment's network settings so
  its licence can be checked and its locomotion added (more turns, starts
  and stops in the same style)?
- If motion matching's starts and stops look worse than hand-picked
  transition clips in the lab, Phase 1 falls back to a blend space with
  start / stop / pivot clips; the owner picks from recordings of both.
- Vault and climb (Phase 5): may he reach places he can't today (a low
  roof, a wall top)?
- Whether the crowds (Phase 7) get a little variety from other 100STYLE
  styles (still within "neutral athletic" for Degen himself).
- The rifle (Phase 8): planned last, then built straight after Phase 3
  (the owner's call).

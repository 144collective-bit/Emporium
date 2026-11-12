# The animation rebuild and revamp

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

- **The animation rebuild** (the owner's call, critical) is planned in
  `docs/animation-plan.md`: AAA movement (Spider-Man / Ratchet feel,
  neutral athletic) from motion capture, then turns, jumps, armed
  movement, peeking (Q / E), crouch, slide, vault and climb, contact, and
  everyone on the same clips, and (Phase 8, the owner's call) the rifle
  held properly, its butt in his shoulder. Build it one phase at a time
  with the owner's sign-off. Phase 1 (run, sprint and momentum), Phase 2
  (turning, terrain and transitions), Phase 3 (jumps, falls and landings),
  Phase 4 (armed movement and peeking), Phase 5 (crouch, slide, vault and
  climb) and Phase 8 (the rifle shouldered, below under
  Target practice) are built, for the player on foot. **The revamp**
  (the owner's call, 2026-10: every character's movements made to suit
  the game and realistically human) is planned in
  `docs/animation-revamp-plan.md`: a measured rubric (`tests/human.test.ts`),
  the player finished on foot (idle life, the gaze, walks, stairs),
  contact, the game's moments (doors, counters, getting in and out,
  benches, rides seen, carrying), everyone on the same captured motion
  (other players, the crowd's rows, the emotes), the crowd's acts, the
  Fight Club and polish; one phase at a time with the owner's sign-off;
  keep it up to date. Phase 1 is built: the rubric is `human.ts`
  (DOM-free: `BANDS`, `createRubric()` over a figure's frames,
  `clipRows()` over a clip; `tests/human.test.ts` holds every clip and
  the animator's programs to it, rows that fail today `HELD_BACK` with
  their phase), the lab's Scorecard and Reel, the clips' format 2 with
  tags, marks and packs (below), a `mocap` budget row. Phase 2 (the player finished on foot) is built: the idles are three stretches of subject 137 waiting
  (`idle-wait`, `-2`, `-3`: real weight shifts, a hand to the head, a look
  round; the looped quiet seconds of 143 went; read a standing take's
  lean before using it: one was bent double), played through to the end
  (`STAND.margin`), the take's own wander carried into the hips (`WANDER`),
  the next take the least recently played (`standNext()`, cut into near
  its start: `LATE` in motionmatch.ts), a slower blend between them
  (`STAND_BLEND`), the stance's lift of the hips eased (`STANCE.upEase`)
  and kept while a foot shifts; breathing (`BREATH`); the gaze (`gaze.ts`,
  DOM-free, tested: people and cars nearby, a look round standing, the
  head leading a turn; `walk.ts` lays it on, the lab's Gaze toggle); the
  walk is 143's (1.4 m/s) with 132's fast walk for starts (`walk-fast`);
  starts and pivots through `MATCH.after`, `starting` (`LOCK.downStart`)
  and the head's slower blend (`HEAD_BLEND`, `Inertia.slow`);
  the matching normalised over frames on the move (`MOVING`) and a clip's end dearer (`ENDING`); stairs up from capture (122's climb, `stairs-up`: the pipeline tracks a stairs take's floor through its planted feet, `stairFloor()`, `stairs: true` in takes.json, format 3's `floor` / `contact`; the animator searches its climbing frames only while climbing, `climbAhead()` and `STAIRS` in movesim.ts, which walk mode also uses to slow a climb; the lab's Stairs program; down is the walks with the lock). The rubric reads the capture's standing takes as
  standing (`clipRows(..., standing)`, `Frame.side`); `HELD_BACK` is two
  rows. Phase 3 (contact) is built: `contact.ts` (DOM-free, tested in
  `tests/contact.test.ts`) is a layer on the animator's pose from what's
  near him (`ContactInput`: the collision grid's boxes within
  `CONTACT.reach`, the crowd's people, where he can't step), laid on by
  `applyContact()` after `animator.update()` and before `applyTo()` in
  walk.ts (not with a gun in his hands). **Looks only** (the owner's call,
  2026-11: bumping into things mustn't get in the way of play): it never
  slows, stops or throws him, so the step's hitch and the stagger into a
  wall at a sprint were taken out, and a wall, a car or anything solid just
  stops him and he slides along it. Brushing a wall or a person the
  shoulder gives (`give`; the crowd's person steps aside and back, `bump` /
  `BUMP` in life.ts); stopped at a
  wall a hand goes onto it at shoulder height, walking slowly along one it
  trails along it at hip height (`reachArmBones()`, the arm's two-bone IK;
  a hand on stays put until it's let go; the test holds it within 1.5 cm);
  standing a while at an edge nothing solid explains (a quay, a railing)
  he leans on the rail with both hands; a gap narrower than `squeeze` turns the
  shoulders. Phones (`createContact({ hands: false })`) leave out the
  hands and the lean. The lab's Contact program and floor show it all.
  Phase 4 (the game's moments) step 1 is built: `moments.ts` (DOM-free,
  tested in `tests/moments.test.ts`): a `Mark` (`doorMark()`,
  `counterMark()`, `benchMark()`: where he stands, his facing, the hands'
  targets or the seat), `createMoment()` with the phases approach → play
  → (hold → back) → done (`update()` gives walk.ts the approach's goal:
  the walk's own last steps onto the mark, or `timeout`; `skip()` on F
  again; `release()` when the menu closes or to stand up; `cancel()`),
  and `momentPose()` (in `momentposes.ts`, walk mode's on-foot chunk),
  keyed on the `Pose` rig as the vault's (the hands
  on the thing by `reachArm()`, within 1.5 cm in the test). Doors (every
  landmark's, Trench Avenue's, the stadium's gate, the garage, hangar and
  kart hut, the lifts and stations): a push, the panel opening as the
  hand lands; counters (the gun stores', the trainer's): a lean with both
  hands on the top while the menu is open; benches: "Sit" at a free bench
  (`BENCHES`, no crowd sitter on it), the root down onto the seat
  (`momentDy`), "Stand up". walk.ts's `markFor()` / `act()` start them;
  the keys wait while one is on, the motion capture steps aside for the
  keyed pose (`momentAmt`), the contact layer too. Step 2 is built:
  **getting in and out** (`boardMark()` / `alightMark()`, `Vehicle`: car,
  kart, plane, boat; walk.ts's `sideMark()` from `drive.doorOf()` /
  `fly.doorOf()` / `HIRE.door`: he comes at the vehicle's side nearest
  him, the hands land (the car's handle, the kart's pod rim, the
  aircraft's door frame, the boat's rails), a leg lifts over and the body
  folds onto the seat, the root going to it, and the vehicle takes him at
  `board.fireAt` (`enter()` as before; the moment dropped); out plays at
  once from the seat (`from` on each `exit()`) to the step-out spot; the
  taxi through `TaxiDeps.approach` → `walk.boardAt()`), **the lifts**
  (`liftMark()`: walked in through the door and turned to face out, then
  the fade), and **carrying** (`crateMark()` `pick` / `put`, `crateAt()`,
  `carriedAt()`, `carryPose()`: the business card's Load / Unload on foot
  with the car parked by the place go through `TycoonHooks.carry` →
  `walk.carry()`: a crate squatted to and lifted at the place, carried in
  both hands (the upper-body mask, a run capped at `crate.slow`), set
  down at the car's boot (`PUT_R`, "Load the car") or the place ("Unload
  here"), when `done` moves the goods; "Put it down" elsewhere moves
  nothing; a vehicle, a ride, a fast travel or walk mode ending puts it
  away). The rides seen (the metro's, taxi's and river bus's seated
  figure) are held back, in the plan. Phase 5 (everyone on the same
  motion) is built; step 1: **the crowd on the capture**: six takes in
  their own pack (`pack: "crowd"` in takes.json → `clips-crowd.bin`, 56 KB,
  `CROWD_PACK` in mocap-load.ts; the core pack untouched), fetched at the
  boot and swapped into every crowd's rows as it comes in
  (`setCrowdCapture()` in crowdclips.ts, `refreshCrowdTexture()` in
  crowdskin.ts; the rows' layout is fixed whatever the capture holds, the
  recorded walk and the formula idle stand in until then): `walk` /
  `walk2` (two cycles of 143's walk) and `jog` (his run) resampled to
  their rows with the hips in place, `idle` / `idle2` / `idle3` (three
  stretches of 137 waiting, each looped with its tail crossfaded into its
  head, `captureRow()`, at its own length, `secondsOf()`); `march` is the
  recorded walk still and `look`, `chat`, `sit`, `picnic`, `salute` the
  formulas (no such takes). Every person has their own walk and idle
  (`walkFor()` / `idleFor()` by a number of theirs, life.ts), the strides
  are live (`STRIDE`, `strideOf()`), and the scale rule is tested at the
  city's scales (`tests/crowdclips.test.ts`). A budget row (`mocapCrowd`)
  holds the pack under 80 KB. Step 2 is built: **other players on the
  animator** (`remote.ts`): once walking has the capture and the animator
  module (walk.ts's `motion`, through the multiplayer's `Walker`), each
  player within `ANIM_FAR` of the camera gets an animator of their own fed
  from where they're drawn (their own springs following the velocity seen
  between frames and the facing sent; every frame within `ANIM_NEAR`,
  at `FAR_DT` beyond; a jump between frames starts it afresh), blended in
  as the player's (`mocapW`), the gun hold over its legs and hips
  (`upperW`, `applyTo(..., upper, yaw)`), the look through `addLook()`,
  the emotes and the air on the planted-feet walk as before; tested as a
  fed remote in `tests/animator.test.ts`. Step 3 is built: **the emotes
  re-keyed** (`emotes.ts`, DOM-free, tested in `tests/emotes.test.ts`):
  the wave, the cheer, the salute and the dance as keyed clips on the
  `Pose` rig (keys in seconds with eases, `EMOTE_CLIPS`, `emotePose(p, id,
  t, amt, base)`, `emoteSeconds()` / `emoteOver()`, `emoteUpper()`). The
  wave, the cheer and the salute own only the upper body (the arms, the
  spine's lean and twist, the head): in walk mode and on other players
  they play over the animator's captured legs and hips through the gun's
  upper mask (`upperW`), so an emote never jolts him off his feet; the
  dance owns the whole body (the capture steps aside, `mocapW`), its feet
  keyed as planted spots (`feet`) the legs reach through `reachLeg()` so
  they stay put, flat and headed his way while the hips bounce and sway
  on a 120 bpm step-touch (a lifted foot eases off and onto its spot), two
  bars long (`DANCE_SECONDS`). The stage (`stage.ts`, over its idle: `base`)
  and the hologram (`dancePose()`) play the same clips; the lab's Emotes
  program plays them in turn (emotes.ts is walk mode's chunk, `onfoot.ts`,
  not the boot's). No CMU take in the repository is a dance:
  one from capture is a data step for the owner. Phase 6 (the crowd's acts
  that suit the city) step 1 is built: a crowd row can carry a keyed
  overlay (`ClipDef.over` in crowdclips.ts: the head's yaw and pitch, the
  spine's lean, the arms where `arms` is set, laid on the capture's bones
  at the bake, `overlay()`): the `wait` row (the second captured idle with
  a look both ways, `kerbLook()` / `KERB_LOOK` in pedestrians.ts; a walker
  at a kerb faces across and plays it from the moment they stopped) and
  the `hurry` row (the captured walk with the chest forward, the head down
  and the arms held in, `HURRY`; from `HURRY_RAIN`, `hurrying()`, every
  walker's walk). The brisk crossing step stays the walk at `CROSS_PACE`
  (no take in the repository is a brisk straight walk: a data step). Step
  2 is built: the phone in the hand (`PHONE` in pedestrians.ts: the right
  hand brought to a spot in the torso frame by `reachArm()`, the wrist
  turned so the screen faces the eyes, the head down at it): the `phone`
  row (the third captured idle with the hand and head keyed over it,
  `arms: 'right'`, `head: true` (the pose's head in place of the take's),
  a grip a hand, and a glance up once a loop, `phoneGlance()`) and
  `phonewalk` (the captured walk, the head down less, the other arm as
  captured, at the walk's stride); about one walker in seven (`onPhone()`)
  walks reading and keeps reading at a kerb, an idle with `act: 'phone'`
  stands reading (the plaza, the boulevard's overlooks, Uptown North's
  square), each with `held: 'phone'` in the crowd's wardrobe. Step 3 is
  built: the workers' rows (`acts.ts`, DOM-free, keyed; tested through
  `tests/crowdclips.test.ts`): standing over the captured idles `serve`
  (the market's traders, the carts' vendors: a hand-over once a loop),
  `cook` (the Night Market's cooks), `fish` (Pier 7's fishers: a cast once
  a loop) and `guard` (the club's bouncers, arms folded, a look each way);
  seated over the sit pose on their own loops (`ClipDef.seconds`) `eat`
  (the diners at every table: a bite every four seconds), `chess` (The
  Trenches' chess tables), `lounge` (the boombox corners' chairs), `row`
  and `pedal` (the park's boats). `IdleAct` (crowdclips.ts) is what an
  idle person does, life.ts plays the row of that name (`clipOf()`), and
  `SEATED` / `seated()` say which rows sit (their root dropped by the
  seat); benches keep `sit`. Step 4 is built: the kids at play
  (`play.ts`, DOM-free, tested in `tests/play.test.ts`): `PLAY_PEOPLE`
  are park-style people (parklife.ts `ParkPerson`, with a `scale`: kids
  are `KID`) life.ts moves with the park's: on every half-court two kids
  run a loop round the inside (`loopOf()`, `LOOP_IN`, `KID_RUN`, the jog
  row at their size) and one takes set shots at the hoop (`shoot` in
  acts.ts, over the third idle), the cage's three runners and two
  keepers, The Block's two on two (grown-ups), and a kid on every swing
  seat (`swingsOf()`, the `swing` row, seated); the commons' rings on the
  courts went, the playground's and skate spot's stay. A formula row's
  loop eases towards its own start (`looped(f, seconds)`). Phase 7 (the
  Fight Club) is built: the fight clips' feet are planted
  (`fightfeet.ts`, DOM-free: `STANCE`, the guard's feet on the canvas;
  `PLANTS`, which legs each clip plants, when a leg's `free` (the kicking
  leg, the stagger, the fall, the get-up), a foot's `pivot` on its ball
  and its `heel` up with the hips' turn; `plantLegs()` reaches each leg
  down to its foot through `reachLeg()`, the hips down at most `DROP`;
  `createFootwork()`: the feet keep their place on the canvas while the
  sim lunges or knocks a fighter back and step after it, `STEP`); the
  rubric for the fight is `fightrubric.ts` (`FIGHT_BANDS`, `fightRows()`:
  planted feet, the hips' swing into each strike, the hips half-way before
  the shoulders or the kick's snap, the rear heel up through the cross and
  the uppercut, reactions led by the struck part with the hips in them,
  back in the guard; `tests/fightrubric.test.ts`); every strike has a
  drive key (`drive()` in fight-anim.ts: the hips 80%, the shoulders held
  back at 30%) and the reactions' hips follow the head or chest; moving in
  the guard, a fighter's legs and hips are its own animator's under the
  guard's upper body (`fight-figure.ts`, `FightDeps.motion`; locomotion.ts
  until the capture's in; the `?fight` demo fetches it); the street fists
  and the character screen's guard play the planted clips. Capture under
  the strikes is held back (a data step). Phase 8 (polish and feel) is
  built: a `grip` per take in `takes.json` (the clips file's format 4,
  `MoClip.grip`), eased by the animator (`GRIP`, `animator.grip`) and
  given to the figure as `Pose.grip` by walk mode, other players and the
  lab unless something's in the hands (`RELAXED`, `HOLDING` exported from
  character.ts); the head's follow-through in turns (`follow.ts`,
  DOM-free, tested in `tests/follow.test.ts`: `FOLLOW`, `createFollow()`,
  fed `chestYaw()` from animator.ts, laid on with `addLook()`; not armed,
  not in first person); in first person the eye rides the capture's hips
  (high-passed `hipMean`, `FP_BOB`; off under reduced motion). The
  collarbones from capture are held back (CMU's shoulder sits at the
  neck), and `locomotion.ts` stays (the gun's upper body, the fallbacks,
  the crowd's `march`, the lab's compare). The core clips file's limits are 560 KB (test) and 600 KB (budget),
  raised for the takes on purpose and brought down with the polish plan's
  Phase 8, which moved the rarely searched takes into **lazy packs**
  (`mocap-load.ts` `LAZY_PACKS`: `crouch`, the crouched walks; `jumps`,
  the standing jumps' wind-ups; `stairs`, the climb; 95 KB together,
  budget `mocapLazy` 120): the animator asks for one the first time a
  search wants it (`Animator.need`, set by walk.ts to `loadMocap(pack)`
  → `extend()`, which builds its database again with the new clips after
  the ones in, so what's playing carries on), and until it's in the walks
  take the crouch (laid over, as standing still has it) and a slope, and a
  running take-off serves a standing jump. The strafes stay core (the
  first aimed frame searches them). The lab and the sparring demo take
  every pack at once (`loadMocapAll()`); the tests read them joined
  (`tests/mocapdata.ts`), and `tests/mocap.test.ts` holds every pack's
  file to what the pipeline makes:
  - **The data** is CMU's motion capture (free for commercial use; the
    acknowledgment is in the start menu's Options > Credits, named, never
    linked): mostly subject 143's and 127's takes (137's idles, 132's fast walk, 122's climb, 136's crouched walks, 141's strafes), in `assets/mocap/cmu/`
    (BVH, untouched), listed in `assets/mocap/takes.json` (a `loop` makes a seamless cycle,
    `loopClip()`, `cycle` its length where it's longer than a step; `fps` where the file's frame rate is wrong: subject 143's
    are 60, not the 120 cgspeed wrote, so he walked and ran at double speed
    until it was fixed). `npm run mocap` (`scripts/mocap.mjs`) retargets them
    (`mocap-build.ts`: each target bone takes its source joint's turn
    since the T-pose, the feet and the collarbones kept level (CMU's
    shoulder joint sits at the neck: aligned to it, the collarbones held a
    37° shrug), the hands aimed at the index knuckle (CMU's finger base
    sits on the wrist: aimed at it, every hand stood out 80° from its
    forearm) and calmed (`HANDS`), one-frame glitches put back between their
    neighbours (`SPIKE`) and the toes smoothed (`TOES`), the floor from the
    ankles, the root smoothed from the hips, the knees straightened where
    the capture bent them back (`straightenKnees()`)) into
    `src/data/mocap/clips.bin` (`mocap.ts`: 22 body bones at `MOCAP_FPS`
    30, turns in 16 bits, each frame's as the difference from the frame
    before in varints (format 2, the revamp's Phase 1: 495 KB where plain
    numbers made 703); each take's `tags` (`stand`, `crouch` and
    `jumps-only` are what the searches read through `tagged()`:
    `STAND.tag`, `CROUCH.tag`, `JUMPS_ONLY`; the rest say what it is for
    the rubric), `marks` (a hand's meeting with a thing, for the moments)
    and `pack` (`CORE_PACK` fetched when walking starts, another pack on
    first use, `loadMocap(pack)`; `npm run mocap` writes one file a pack);
    `mirrorClip()`, `posed()`, `contacts()`); `tests/mocap.test.ts` holds
    the file to exactly what the pipeline makes. It's fetched when walking
    starts (`mocap-load.ts`, a hashed asset), with the animator's own
    chunk (`import('./animator')`).
  - **Moving** is `movesim.ts`: velocity and facing on critically damped
    springs (`MOVE` half-lives), `ahead()` the trajectory; `GAITS` walk
    0.61, run 2.17 (the default), sprint 3.26 tiles a second (0.78, 2.8 and
    4.2 when he was 0.85, the owner's call: quick but believable; brought
    down in proportion with his size, so the animation is as it was:
    docs/scale-plan.md).
  - **The animation** is `animator.ts`: motion matching (`motionmatch.ts`,
    Holden's 27 features, every clip and its mirror, a search about ten
    times a second) with inertialization (`inertia.ts`), playback warped
    to his speed (`RATE`), and faster than the capture his steps lengthen
    as a runner's do (`WARP`: his legs turn over only a little quicker; a
    foot on the ground plays fast enough to stay put, the air slower for
    more hang time, a swinging knee driving higher, and into a sprint a
    longer reach once he's done speeding up: the owner's call, "his legs
    move very fast when sprinting"), the sprint's harder swing and lean and
    a lean into bends (`LAYERS`), and the feet (the ball never under the
    ground, `BALL_UNDER`; a free foot no further down than a step,
    `AIR.kerb`): each held by the ball of the foot
    where the clip has it down (`LOCK`), reached by a hinge-knee two-bone
    IK with a soft reach (`twoBone()`), on the ground under it, the hips
    coming down (at most `LOCK.drop`) when a leg can't reach. `applyTo()`
    puts it on the figure (`Degen.rig`) after its own `update()`, and
    `addLook()` turns the head where the camera looks. walk.ts blends it
    in (`mocapW`) on foot, not emoting, and not during the roll on a very
    hard landing at a run (`LAND_ROLL`, the keyed one); armed or aiming,
    only its legs and hips (Phase 4, below); everywhere else, and for
    everyone else, it's `locomotion.ts` as before.
  - **Phase 2:** more takes (running turns, a quick stop, walking into a
    run, turning on the spot, standing and waiting: `assets/mocap/takes.json`
    and `CREDITS.md`); his shown facing follows the clip's own turn, pulled
    to the springs' (`FACE`, `animator.face`: place the figure with it);
    standing still only the idles are searched (`STAND.clips`: three calm
    loops of subject 143 standing, taking turns; the old idle turned round
    and snapped his head every 0.8 s), and frames near a
    clip's end cost more (`ENDING`); a free foot clears the ground just
    ahead of it (`LOCK.look`), a held one stands on the ground it was put
    down on, the hips follow the feet above his ground (`LIFT`). The feet
    can stand on something other than what he walks on (`AnimInput.feet`;
    today walk.ts passes its own ground: Liberty Bridge's stairs, which
    used it, went with its redesign).
  - **Posture, hands and twitching** (the owner's call, from a screenshot:
    `docs/animation-plan.md`, "Fixes along the way"): the leg IK softens
    only past 98% of the reach (`SOFT`: 96% held every planted knee at 30°);
    standing still he stands up straight (`STANCE`: the hips up until a
    held leg is nearly straight, the spine and head upright, the arms by
    his sides, the elbows easier); taking off the legs ease from what they
    showed (`LEG_BLEND`); in walk.ts the motion capture eases back in over
    a quarter second; something carried in his right hand is held in front
    of it (`addCarry()`: the arm out a touch, the thumb leading). Review
    in the lab (`held=` puts something in his hand).
  - **Phase 3:** jump takes (subject 127's running jumps, 143's standing
    ones; `JUMPS_ONLY` keeps the standing ones' wind-ups out of the
    ground's searches); motionmatch.ts finds each take's flights
    (`FLIGHT`, `Database.flights`, `takeoff` / `touchdown` frames, the
    hips' `bump`), shut to the ground's searches. The animator (`AIR`;
    `AnimInput.grounded`, `vy`, `jump`, `gravity` from walk.ts): a jump
    cuts to the take-off that carries on best, a fall (off something higher
    than a kerb) to a flight's top; the flight plays as far through as his
    rise and fall have gone, its last frames as the ground comes up, the
    flight's own rise taken out (the game does the jump), nothing held; a
    long fall raises the arms; it lands on its own touchdown unless another
    is far better (`AIR.margin`), the landing plays out (`settle`), and a
    harder one squashes the hips and bows the chest (`squash`). walk.ts
    dips the camera on landings and shakes it on hard ones (`LAND_SHAKE`,
    not under reduced motion).
  - **Phase 4:** strafing and backpedalling takes (subject 143's and
    141's walking backwards and sideways, a side shuffle, a crossover
    step); aiming (or peeking, or in first person) the springs turn him to
    face where the camera looks (`AnimInput.faceGoal`, into the
    trajectory's facing), so the matching picks the strafes and the way
    back, the hips within `FACE.most` of the aim, stepping round past it
    (standing, an aim further than `STAND.turn` off his hips searches past
    the idle).
    With the gun in his hands (or an arm out aiming) the animator gives
    only the legs and hips: `applyTo(..., upper, yaw)` keeps the figure's
    own upper body (locomotion.ts's pose with stance.ts's hold) and turns
    the spine so the chest keeps the turn the pose gave it, `yaw` more
    (walk.ts passes the springs' facing less the shown one), so the gun
    points where you look over whatever the legs do; `upperW` eases the
    mask in and out. Aiming he goes at `AIMING` (1.4). The **peek** (Q / E
    held, LB / RB while aiming on a gamepad, on touch aiming by a corner:
    `cornerSide()`, `CORNER`; `PEEK` in walk.ts) is `addLean()`: the spine
    leant out over the hips about where the camera looks, the head turned
    back level (less with his cheek on a stock), the feet where they are,
    as far out as there's room (`cameraRoom()`); he slows (`PEEK.slow`),
    faces the look, and the camera goes out with him (over his right
    shoulder, or across to his left), never into a wall beside him (its
    sideways shift clamped through `CAMERA_GRID` too); in first person the
    eye shifts and the view tilts a little (not under reduced motion).
  - **Phase 5 (crouch and slide):** subject 136's crouched walks
    (`136_09` to `136_11`, `sink` in `takes.json` where the capture's feet
    stand high); `AnimInput.crouch` (walk.ts eases it): crouched and moving
    only `CROUCH.clips` are searched, standing up never them; standing
    still crouched the idle plays with the crouch laid over it (`CROUCH`:
    the hips down, the legs' IK bending the knees over planted feet, the
    spine forward, the head back up), eased as the clip changes. walk.ts:
    C toggles it (B on a gamepad, the touch **Crouch** button over the
    stick, `[data-walk-crouch]`, aria-pressed; hidden wherever Sprint is),
    `CROUCH.speed` 0.55, sprinting stands him up, a jump too, the camera
    comes down (`CROUCH.cam`). Crouching while sprinting **slides**
    (`SLIDE`, `startSlide()` / `stepSlide()` in movesim.ts, DOM-free: from
    `SLIDE.min`, a little faster than he was going, slowing by its
    friction, steering a little, about 3 tiles); its pose is keyed
    (`slidePose()`, `SLIDE_POSE` in poses.ts: low, leant back, the lead
    heel out, the other knee and shin on the ground, a hand back), the
    motion capture stepping aside for it; it ends in a run with the stick
    pushed, a crouch without, crouched against anything it runs into, or
    up into a jump.
  - **Phase 5 (vault and climb;** the owner's calls: low things only, over
    and down, never standing on top**)** is `vault.ts` (DOM-free, tested in
    `tests/vault.test.ts`): `LOW_THINGS` from the data that knows their
    real heights (The Trenches' jersey barriers, yard kerbs and dumpsters,
    Westlake's walls, hedges, beds and planters (`GARDEN_LOW` in
    gardens.ts), downtown's alley props; never a building, car, kiosk or
    stall), `isLow()` (matched by numbers: the grids hold their own copies
    of the boxes), `overAhead()` (the nearest thing straight ahead in reach,
    high enough, low enough, thin enough and come at squarely; `OVER`: a
    vault to 0.75 over his ground, a climb to 1.25), `overAt()` (along the
    way and up, his feet over the top) and `overPose()` (keyed: a speed
    vault, his left hand planted and the legs swung out to his right; a
    climb, both hands on the top, pulled up, over and down; the hands put
    on the top by `reachArm()`). walk.ts (`tryOver()`): Jump while moving
    at one goes over it instead of jumping, if the landing is clear and near
    his own ground and nothing but low things under the arc is in the way
    (`blocked()`'s `skip`); the motion capture steps aside for it, and he
    runs on after with the stick pushed. The jump's press is counted down
    after it's looked at, so a slow frame can't lose it.
  - **The lab** is `?anim` (`anim-lab.ts`, styles `animlab.css`): the new
    animation beside the old on an open floor, scripted moves or W A S D,
    the Reel (every program in turn, `prog=reel`) and the Scorecard (the
    rubric's rows over the last eight seconds, red where one fails),
    slow motion, cameras (over his right shoulder too), floors (flat,
    kerbs, stairs, a ledge), any gun in his hands (`gun`, `aim`, `pitch`;
    markers at the butt and his shoulder's pocket; on the motion capture's
    legs, as in the city), strafing, aiming round and peeking programs (Q / E
    by hand), crouching and sprint-and-slide (C by hand), a walls floor and
    a Vault & climb program (Jump at a wall by hand), any kind of top
    (`outfit`; `clip`, the clothes' clipping view), the free camera placed with `orbit=yaw,pitch,dist`, jumps
    (programs and Space, walk.ts's jump and gravity), foot traces and
    readouts (the clip, its rate, the match, the blend left, the foot
    slide, the air); `rec`, `prog`, `gait`, `cam`, `floor`, `zoom`, `compare=0` in
    the address set it up for recordings. Review
    every animation change there, and run `tests/animator.test.ts`.

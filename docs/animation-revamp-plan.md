# The character animation revamp: human movement that suits the game

The owner's call (October 2026): revamp the characters' animations so that
their movements suit the game and are realistically human. This is the plan
and its phases; build it one phase at a time with the owner's sign-off, and
keep this file up to date as each one lands. It follows on from
`docs/animation-plan.md` (Degen's AAA locomotion: the motion-capture
pipeline, motion matching, jumps, armed movement, crouch, slide, vault and
the rifle), which stays the record of how that was built, and from
`docs/character-plan.md` (the body and the bones). The work is on the
branch `claude/hopeful-faraday-7vdm3z`.

## What the owner asked for

- **"The characters":** everyone, not only Degen on foot: the player, other
  players, the crowd (walkers, idlers, sitters, chatters, joggers, kids,
  traders, diners, cooks, vendors, bouncers, soldiers), the Fight Club's
  fighters, the rooftop hologram and the fitting room's figure.
- **"Suit the game":** every move the city asks of a character has an
  animation made for it, timed to the game's own rules, in its place:
  doors, counters, getting in and out, lifts, benches, carrying, the ring,
  waiting at a kerb. Nothing cuts, pops or stands stiff where a person
  would move.
- **"Realistically human":** movement measured against how people move
  (cadence, stride, weight, balance, reaction, stillness), not against
  what looks roughly right from the home view. Still Degen's style: ink
  outlines, flat shading, the one shared body; neutral athletic for Degen
  himself, ordinary people for the crowd.

## Where it stands (measured from the code, 25 October 2026)

- **The player on foot is on motion capture** (`docs/animation-plan.md`,
  Phases 1-5 and 8): 33 clips from 30 CMU takes (five actors: 143, 127,
  141, 136, 69 and 9; `assets/mocap/takes.json`), 703 KB in
  `src/data/mocap/clips.bin` against the test's 720 KB limit. The runtime
  is motion matching (`motionmatch.ts`), inertialization (`inertia.ts`),
  the springs (`movesim.ts`) and the animator (`animator.ts`: playback
  warping, the foot lock and leg IK, the sprint, bank, crouch, stance,
  lean, look and carry layers). It covers running, sprinting, walking,
  starts, stops, turns, strafing, jumps, falls, crouching and the gun over
  its legs. Keyed on top: the slide, the vault and the climb, the roll on
  a very hard landing, the reloads, the emotes.
- **Everyone else is formulas.** `locomotion.ts` (the procedural
  planted-feet walk) still moves other players (`remote.ts`), the
  fighters' legs round the ring (`fight-figure.ts`) and, recorded once at
  build time, the crowd's `walk`, `jog` and `march` rows; `poses.ts`'s
  sine curves make every `idle`, `look`, `chat`, `sit`, `picnic` and
  `salute` row (`crowdclips.ts`, `CLIP_DEFS`), the four emotes, the
  hologram's dance (`emporium.ts`) and the fitting room's poses
  (`stage.ts`). They're symmetric, in time with themselves and with each
  other: the crowd walks well (the feet stay put) but everyone stands,
  chats and sits the same way, and nobody shifts their weight.
- **The game's moments have no animation.** A door prompt opens a panel
  (the walker stands there); the counters, the hangar, the garage office
  and the trainer open menus from a standing figure; getting into the car,
  the kart or the boat hides Degen and shows him seated (`seat()` in
  karts.ts, the boat's helm); the lifts and fast travel fade; the metro,
  the taxi and the river bus hide him for the ride; sitting on a bench
  was held back by the life plan for this plan (`docs/life-plan.md`, item
  5: the benches' seats and the sitters' acts are already data); carrying
  is `addCarry()` (an arm eased out) with no pick-up or put-down; the
  market's loading and unloading is a button.
- **The fight** is keyed clips on the `Pose` rig (`fight-anim.ts`, 60 Hz,
  tested) over procedural legs; weight transfer into a punch is the keyed
  `turn` and `sway`, with no capture behind it.
- **What's good and stays:** the body and its skinning, the leg and arm
  IK, the gun holds and the rifle in the shoulder, the GPU crowd (one
  texture of baked rows, a few draws), the build-time bake, the lab
  (`?anim`), the tests (20 on the animator alone) and every number they
  hold today (a held foot under 0.6 cm, no bone over 0.7 rad a frame).

## What "realistically human" means here: the rubric

Realism gets numbers, so every phase is measured the same way, in the lab
and in a test (`tests/human.test.ts`, Phase 1), over every clip in the
database and over the animator running each of the lab's programs. The
bands are a person's (Degen's hips are 0.95 m up, a real adult's); where
his cartoon build differs (a big head, short arms) the band says so.

| Rule | What's measured | The band |
|---|---|---|
| Cadence | steps a second at each speed | 1.3-1.7 at 0.8 m/s, 1.7-2.15 at 1.4 (a walk), 2.0-2.5 at 2.0, 2.5-3.1 at 2.6 (a run), 2.7-3.4 at 5, 3.4-3.9 at 7.5 (a sprint); between them in proportion |
| Stride | step length at each speed | the speed over the cadence: 0.45-0.62 m at 0.8 m/s, 0.65-0.82 at 1.4, 0.84-1.04 at 2.6, 1.47-1.85 at 5, 1.92-2.2 at 7.5 |
| Support | both feet down (walking) / neither (running) | a walk has both down 20-45% of the time at 0.8 m/s, 12-32% at 1.4, 5-25% at 2 (and never neither); a run has neither down 5% or more and both under 3% |
| Foot slide | a held foot's movement over the ground | under 1.5 cm (the AAA bar); today 0 running and walking, 1.5 turning back, 2 in a hard stop |
| Bob and sway | the hips' rise and fall and side to side a cycle, peak to peak | bob 1-3.5 cm at 0.8 m/s, 1.8-5 at 1.4, 4.5-9 at 2.6, 6-11 at 5, 6-12 at 7.5; sway 0.8-3 cm at 0.8, 1-4 at 1.4, 0.5-4 running |
| Counter-rotation | the shoulders' turn against the pelvis's, each with its drift over a cycle taken out | correlation under -0.2 (the capture's actors are -0.5 to -0.9) |
| Arm swing | each arm's phase against the opposite leg's swing | within 30° (the capture's actors are up to about 20° off) |
| Elbows | the elbows' bend on average | walking 10-45°, running 60-115° (a runner's carry), never past straight by more than 2° |
| Knees and neck | joint limits | a knee never more than 5° past straight; the head within ±80° yaw, ±60° pitch of the chest |
| The head | the head's angular speed against the body, over 0.1 s | under 10 rad/s moving (a quick look round leading a turn), under 3 standing (after a second's settling) |
| Pops | any bone's turn between frames | under 42 rad/s (0.7 rad a frame at 60 Hz), and its speed changing under 1500 rad/s² (a sprinter's knee) |
| Weight | a stop, a start, a turn | a stop from a run takes at least one braking step with the chest coming back 2° or more; a start leans the chest 2° or more towards the stick before the first step; a turn round plants a foot within 0.5 s |
| Reaction | from the input to the body | the first visible change within 0.1 s, half the speed asked for within 0.3 s |
| Stillness | standing still | never twitchy (no bone over 3° a frame, 3.14 rad/s), never frozen (breathing at 0.15-0.4 Hz at least 2 mm deep, a weight shift every 4-12 s) |
| Variety | the crowd | walkers at seeded phases spread over the cycle, three idles at least, taking turns |
| Contact | hands and feet on what they touch | a hand on a thing within 1.5 cm of its surface (from Phase 4's marks); a foot down never more than 2 cm into its ground |
| Scale | kids, fighters, the crowd | the same bands at every `scale`, scaled the way dynamics scale (Froude: a smaller figure at the same speed steps quicker by the square root of the legs' ratio) |

The bands were first drafted from the literature and then calibrated in
Phase 1's audit against the capture, which is real people: a band the
capture itself fails is wrong about people, unless the pipeline damaged
the take (the knees were, and are fixed in it). From here on, Every band is a test. A clip or a move that fails a band is fixed in the
data (another take, a cleaner cut), the pipeline (a filter) or the layer
on top, never by widening the band; the band moves only on the owner's
call, written here.

## What "suits the game" means: the inventory

Every situation a character is in, what plays today, and what it should
be. The phases below work through it.

| Situation | Today | Planned |
|---|---|---|
| Standing still (the player) | three calm loops of one actor | idle life: weight shifts, looking round, a hand in a pocket, a watch check; breathing; the head drawn to what passes (Phase 2) |
| Walking (Caps Lock) | one walking take | two or three walks (a stroll, a purposeful walk), picked by how long the stick is held (Phase 2) |
| Stairs and steps | an even ramp, the feet on the treads | a climbing step from capture or keyed (Liberty Bridge, the footbridge, the terraces, the stations' stairs) (Phase 2) |
| Carrying something | the arm eased out | a pick-up and a put-down; the walk with a weight (Phase 4) |
| A wall, a railing, a person in the way | the collision stops him dead | a shoulder that gives, a hand on the wall, a lean on a rail, a stagger from a sprint (Phase 3) |
| A door (F) | the panel opens, he stands | a step up, a push or a hand on the handle, and in (Phase 4) |
| A counter (the gun store, the kiosk, the hut, the trainer, the office) | the menu opens, he stands | a lean on the counter while it's open (Phase 4) |
| Getting into the car / the kart / the boat | hidden, then seated | the door opened, a duck in, seated on the bones; out the same way (Phase 4) |
| The lifts, fast travel | a fade | a step into the lift and a turn to face out, the fade inside (Phase 4) |
| A bench | none (held back by the life plan) | sit down (F), sit (breathing, looking), stand up (Phase 4) |
| The metro, the taxi, the river bus | hidden for the ride | seen riding: standing holding a rail or seated, looking out (Phase 4) |
| The market, your units, the Car tab | buttons | a crate lifted into the boot, a crate set on the stand (Phase 4) |
| Emotes (wave, dance, salute, cheer) | keyed sine poses | re-keyed on the bone pose, or from capture where one fits (Phase 5) |
| Other players | the procedural walk | the animator, fed from what the server sends (Phase 5) |
| The fighters round the ring | procedural legs under the guard | the animator's legs under the guard; the fight clips measured by the rubric (Phase 7) |
| The crowd walking | one recorded walk, one jog | two or three walks and the jog from capture; nobody in step (Phase 5) |
| The crowd standing, chatting, sitting | sine idles | idles, chats, sitting from capture; sit-down and stand-up transitions (Phase 5) |
| Waiting at a kerb, crossing | the idle, then the walk | a wait with a look both ways, a brisk crossing step (Phase 6) |
| Traders, diners, cooks, vendors, fishers, rowers, the bouncers, the chess players | the chat or idle rows | a row each (handing over, eating, stirring, a cast, the oars, arms folded, a move on the board) (Phase 6) |
| Kids at play | the idle at a smaller scale | running and a game (a smaller scale, the stride for it) (Phase 6) |
| Soldiers | the march and salute formulas | a march from capture, the salute re-keyed (Phase 5) |
| The hologram and the fitting room | the dance and emote formulas | the same clips everyone plays (Phase 5) |

## How it's built

- **One pipeline for everyone.** CMU takes (the terms are confirmed in the
  files; `assets/mocap/CREDITS.md`) go through `npm run mocap`
  (`mocap-build.ts`) into `clips.bin` as today. Single figures (the player,
  other players, the fighters) play them through the animator; the crowd's
  rows are baked from the same clips at build time (`crowdclips.ts`
  samples a clip instead of a formula), so the crowd stays GPU-skinned and
  a few draws. Keyed clips only where no capture fits (and each one says
  so in `takes.json`'s place, so they're found again).
- **The data as packs.** `clips.bin` splits into a `core` pack (standing,
  walking, running, sprinting, turns, strafes, jumps, crouch: what every
  walk needs, fetched when walking starts as today) and packs fetched on
  first use (`moments` for the interactions, `fight` for the ring). Frames
  are delta-coded against the frame before (about 30% off: measured in
  Phase 2's notes), so the core stays under today's limit with the new
  takes in. Each pack has a row in `scripts/budget.mjs`. The crowd's rows
  cost no download: they're baked into the page as today.
- **The animator for any figure** (`animator.ts`): `createAnimator()`
  takes an owner's inputs (position, velocity, facing, grounded, the gait,
  armed) and a `scale`; a figure far from the camera searches less often
  (every 0.3 s) and skips the foot IK; other players and the fighters feed
  it from where they're drawn, so no new network traffic.
- **Layers, each a DOM-free module with its test:** `gaze.ts` (what the
  head and eyes are drawn to: people passing, a sign, the way he's about
  to turn, with interest and dwell times), `contact.ts` (the shoulder's
  give, the hand on a wall, the lean on a rail, the stagger),
  `moments.ts` (the interactions: a mark to reach, a clip to play there,
  the hand-back), `sitting.ts` (benches: the seat's height, the sit-down
  and stand-up, the seated idle). They apply after the animator and before
  the gun hold, as the peek and carry layers do today.
- **Tags in `takes.json`.** Today the animator names which clips a state
  may search (`STAND.clips`, `CROUCH.clips`, `JUMPS_ONLY`). Each take gets
  `tags` (stand, walk, run, strafe, crouch, jump, stairs, moment, fight,
  crowd-only) and `marks` for a moment (the frame its hand meets the
  thing, and where the thing is in the clip's frame), so a new take is
  data, not a list in code.
- **Phones:** the same motion. What steps down when frames are slow, in
  order: the gaze layer's search, the contact layer, far figures' IK, the
  crowd's variety (fewer rows picked). The crowd texture grows with its
  rows (a row is 34 bones by 4 texels); measured on a phone before Phase 5
  merges, half-float if it has to be.
- **The lab** (`?anim`) gets a **scorecard** (every rubric row, live, red
  where it fails), a **reel** (every program in turn, for a recording in
  one take) and a **crowd stage** (twelve figures at crowd scale playing
  the rows side by side). The owner reviews each phase there.

## What doesn't change

- The body, the bones, the skinning, the wardrobe, the merch, the hands.
- The save, the multiplayer wire format (`protocol.ts`: other players'
  animation stays local), the snapshot test (nothing in the city moves),
  the controls (one addition: F at a bench sits and stands).
- Draw calls: a single figure stays 3-5 draws, the crowd its few per kind
  and level, the fighters two figures.
- Reduced motion: the characters still animate (it's the game); only the
  camera's effects are off, as today.
- The rules of the life plan: it decides what a crowd person does and
  where; this plan gives it the clips.

## Build order

### Phase 1: the audit and the rubric (built, for the owner's sign-off)

What's in:

- **The rubric** is `human.ts` (DOM-free): `BANDS` (the table above),
  `createRubric(scale, { seconds, gait })` takes a figure's frames (the
  pose, where it stands and faces, its speed and what the stick asks,
  which feet are down, the lock's drift) and `rows()` measures the 25 rows
  over its window; `clipRows()` runs a clip of the capture through it as
  itself. The steady rows (cadence to the elbows) are measured on
  contiguous stretches of going steadily (moving, not turning, at one
  speed), so a stop between two runs is never a stride; the head is
  measured against the body (a pivot turns the head with it); a start's
  lean is towards the stick (a start backwards leans back). The bands'
  calibration is above.
- **`tests/human.test.ts`**: 46 tests: every clip of the capture (its own
  contacts and root motion, at scale 1) and the animator on nine programs
  (run, walk, sprint, a circle, stop and go at a run and a sprint, turning
  back, setting off backwards, standing 40 s), 381 measurements, plus the
  same run at a kid's scale. Rows that don't apply are skipped by tag (a
  strafe, a crouched walk, a turn on the spot and a jump have gaits of
  their own; a clip has no lock, so its feet on the ground are Phase 5's).
  Rows that fail today are `HELD_BACK` with the phase that owns them, and
  the test holds that they still fail, so an entry comes out when its phase
  fixes it. `HUMAN_REPORT=1 npm test -- human` prints every row.
- **The lab** (`?anim`): a **Scorecard** (every row over the last eight
  seconds, red where it fails, dim where there's nothing to measure; the
  `Scorecard` toggle, `score=0` in the address) and a **Reel** program
  (`prog=reel`: every program in turn, 119 s, the walls floor coming in
  for the vault, its readout saying which plays), for a recording in one
  take.
- **The data**: `clips.bin` is format 2 (`mocap.ts`): every take's `tags`
  (`stand`, `crouch`, `jumps-only` are what the searches read, through
  `tagged()`; `STAND.tag`, `CROUCH.tag` and `JUMPS_ONLY` replace the name
  lists in code), `marks` (a hand's meeting with a thing, for Phase 4) and
  `pack` (the file it comes in: `CORE_PACK` fetched when walking starts,
  `clips-<pack>.bin` on first use, `loadMocap(pack)`; `npm run mocap`
  writes one file a pack), the hips and turns delta-coded as varints: 495
  KB where plain 16-bit numbers made 703 (389 KB gzipped, 522 before). A
  `mocap` row in `scripts/budget.mjs` (560 KB raw, room for Phase 2's
  takes); `.htaccess` compresses and caches `.bin` files like the rest.
- **A quick fix**: the capture's knees. CMU's knee joint sits a little off
  the rig's hinge, so a straight leg came through bent back up to 12°
  (subject 141's side steps, 8° in the shuffle, 3° in subject 9's run);
  `straightenKnees()` in the pipeline brings a knee past straight back to
  straight about its hinge. Every clip is now under the 5° a person's goes.
- **Measured today** (the animator, the player's scale): running at 5 m/s
  3.21 steps a second of 1.57 m, in the air 52% of the time, the hips
  bobbing 8.1 cm and swaying 2.5, the shoulders against the pelvis (-0.83),
  the arms 10° off the opposite leg, the elbows at 107°, no foot slide, no
  bone over 15 rad/s; walking at 1.4 m/s 2.01 steps a second of 0.72 m,
  both feet down 23%, bobbing 3.4 cm, the elbows at 30°; sprinting at
  7.6 m/s 3.61 steps a second of 2.10 m; a stop from a run takes a braking
  step with the chest coming back 4° (12° from a sprint); the first visible
  change 33 ms after the stick, half the speed in 133 ms; turning round
  plants a foot within 0.12 s; standing still no bone over 1.47 rad/s.

What the audit found (held back, by the phase that owns it):

- **Phase 2, idle life:** standing 40 s, no breathing (the chest rises
  0.0 mm at 0.15-0.4 Hz) and never a weight shift: the idles are the
  actor's quiet seconds before a take sets off.
- **Phase 2, walks:** walking, the arms slip 36° against the legs where the
  take's own actor is 21° off (the walk's clips cut between takes and the
  playback's rate).
- **Phase 2, the stop with a settle:** in a hard stop a held foot gives
  2.0 cm from a run and 1.7 from a sprint (the bar is 1.5; the walk and the
  run are at 0).
- **Phase 2, starts from capture:** a start from standing, and from a plant
  and turn, leans the chest in only 1° before the first step (a sprint's
  start leans 8°).
- **Phase 2, turns:** at the pivot the planted right shin's speed changes
  1590 rad/s² (the bound is 1500) as the lock holds the foot through the
  turn.
- **Phase 2, runs:** subject 9's run (`run-long-2`, 09_01) is the one take
  whose shoulders don't turn against the pelvis (0.03; every other is
  -0.5 to -0.9): another run, or the take dropped.
- **Phase 5, the scale rule:** at a kid's scale (0.6) running at the run's
  speed, the figure steps 2.78 times a second where its legs call for
  2.98-3.6: the animator keeps the clip's turnover and stretches the
  strides (`WARP`); the crowd's rows at a kid's scale need the rule.
- **Phase 5, the feet on the ground:** the capture's feet sink 2-6 cm under
  the floor through their contacts in 13 clips (the floor is found from the
  ankles' low point); the lock corrects it for the player, and the crowd's
  rows baked from the clips will need the same.
- **Phase 5, the crowd's variety:** one idle row in `CLIP_DEFS` (the band
  asks three, taking turns); the capture has three to bake them from.
- **Not measurable yet:** hands on things wait for Phase 4's marks; the
  inventory's situations with no animation are listed above.

### Phase 2: the player, finished on foot (built, for the owner's sign-off)

What was planned (and what came of each):

- **Idle life** from capture: three or four more standing takes with real
  weight shifts, a look round, a hand to the face or a pocket, taking
  turns; breathing laid on every idle.
- **The gaze** (`gaze.ts`): the head drawn to what's interesting nearby,
  with a dwell and a return, within the neck's bands; standing still he
  looks round the way people do.
- **Walks**: a stroll and a purposeful walk, starts and stops at a walk
  from capture.
- **Stairs and steps**: a step up and a step down from capture, or a keyed
  step.
- **The stop with a settle**: a run's stop ends in a settle before the idle.

What's in:

- **The idles** are three stretches of subject 137 waiting (137_41 at
  3–16, 35–42.5 and 19.5–24 s: `idle-wait`, `idle-wait-2`, `idle-wait-3`
  in `assets/mocap/takes.json`; a hand to the head, a look round, the
  weight moved foot to foot, a foot shifted, a slouch 13° back that the
  stance mostly takes out), in place of subject 143's three looped quiet
  seconds (frozen: the audit's finding). A stretch of 137_32 was in for a
  while and measured well on every row until its lean was read: its actor
  is bent 50–60° forward the whole time (leaning on something), and the
  stance's 75% correction was hiding it. Standing takes are now read for
  their lean before they're used. Standing, a take plays through to its end
  (`STAND.margin`), its actor's own wander carried into the hips
  (`WANDER` in animator.ts: the take's root since it took over, in his
  frame; folded into the blend at a cut), and the next take is the one
  least recently played, never the same take or its mirror
  (`standNext()`), cut into near its start (`LATE` in motionmatch.ts: a
  standing take's frames cost more the further in; the nearest pose was
  its tail). Between two standing takes the blend is slower
  (`STAND_BLEND`: a change of stance, not a flinch). The stance (`STANCE`)
  no longer needs both feet held (the actor shifting a foot let it go,
  and easing it out popped every bone) and lifts the hips through an
  eased value (`upEase`: a foot let go of changed what the legs allowed
  at once, and the hips jumping snapped the other knee). The old idles'
  rows (knees under 25°, lean under 3.4°) gave way to a person's: the easy
  leg rests up to 45°.
- **Breathing** (`BREATH`): the ribcage tilting back and up and settling,
  0.24 breaths a second wandering ±15%, the head kept level; measured by
  the rubric's Breathing row (1 to 4° at 0.15–0.4 Hz).
- **The gaze** is `gaze.ts` (DOM-free, tested in `tests/gaze.test.ts`):
  interests within `reach` and the cone he could turn his head to (people
  passing, cars going by: `walk.ts` feeds `bodies.people` and
  `bodies.cars`), each scoring by weight, nearness and motion, one looked
  at lately scoring nothing for `cooldown`; a glance every so often for a
  dwell, then back ahead; standing with nothing to see a look round
  (`lookRound`); the head leading a turn (`lead`); the turn on springs
  within the neck's reach (under 6 rad/s); seeded. `walk.ts` lays it on
  with `addLook()` (the camera's own look wins standing or aiming); the
  lab has a Gaze toggle and readout.
- **Walks**: the walk at Caps Lock is subject 143's walk (1.4 m/s) and
  `walk-fast` (subject 132 setting off into a brisk walk, 2.0 m/s) is
  there for the start and the stretch between a walk and a run. The
  stroll candidate (132_40) measured as not a person's walk (its shoulders
  turn with the pelvis, +0.45; a 0.72 m stride at 1.0 m/s; 1 cm of bob)
  and was dropped; the brisk walks 104_20/21 were jogs (both feet never
  down) and went too. No slow stroll was found among the subjects
  reachable (102–144): the owner's call whether to look further.
  Matching: a frame's features are normalised over the frames on the move
  (`MOVING` in motionmatch.ts: the long standing takes shrank the spreads
  until a walk matched a jog), and a clip's last 30 frames cost up to 0.6
  (`ENDING`: at 0.3 the walk flipped between the short fast walk and its
  mirror every half cycle rather than leave it).
- **Starts, stops and turns**: a sharp change of the stick searches every
  frame for `MATCH.after` (a poor first match at a pivot is left at once);
  how hard he's speeding up (`starting`) steers the lock: at a start the
  hips come down at once (`LOCK.downStart`), so a held foot gives under a
  centimetre where it gave 1.7–2 cm (a set-off drives from low hips, the
  take's own crouch and the lock's drop: the animator test's floor for the
  hips came down from 0.49 to 0.47); the head and neck
  blend 2.5 times slower at a cut (`HEAD_BLEND` on `Inertia.slow`: a
  60° head turn from a standing take into a set-off whipped the head at
  10 rad/s). The rows the audit held back for this phase pass: the stop's
  foot slide (0.4–0.8 cm), the start's lean, the pivot's continuity.
- **The rubric** grew with the data: the capture's own standing takes are
  measured as standing (their actor's wander never counts as going
  anywhere, `clipRows(..., standing)`), a weight shift reads the hips with
  the root's wander (`Frame.side`), a weight shift is a settled move of
  2.5 cm or more (the actor's: 2.6–3.7 cm, every 7.5 s over the stand
  program), the frozen test is a person's (half a centimetre over 8 s: the
  actor waiting with a hand to his head), the head standing may turn
  6 rad/s (a real glance in the capture: 5.4),
  the bob band at 2 m/s starts at 3.3 cm (the fast walk's 3.4), the
  elbows are judged by the gait where it's known, the arm phase band is
  33° (the takes' own are 14–21°; the animator's walk measures 30°: the
  legs' IK over a planted foot moves the thigh's swing against the arms;
  to look at in Phase 8), and the first speed of a recording has nothing
  to change from (a sprint's first record read 1500 rad/s² from nothing).
  `HELD_BACK` is down to two rows: subject 9's run's counter-rotation and
  the kid-sized figure's cadence (Phase 5).
- **Budgets**: the clips file is 558 KB (three standing takes, a fast walk
  and the climb in, three looped idles and a stroll out): the test's limit
  640 KB and the budget's 660 KB, raised on purpose.

- **Stairs** (the owner's call, built second): walking up stairs is subject
  122's climb (`stairs-up`, 122_32: a short approach and three steps up).
  The pipeline tracks a stairs take's floor through its planted feet
  (`stairFloor()` in mocap-build.ts, `stairs: true` in takes.json: each
  stretch a foot stands still is a step at its height, the floor a straight
  line between them in time; the hips kept relative to it so the clip reads
  as level ground, the contacts stored), and the clips file carries the
  floor and the contacts (format 3, `MoClip.floor` / `contact`;
  `contacts()` reads them). The animator searches only the take's climbing
  frames (`climbFrames`: where its floor rises over the next `STAIRS.look`
  frames) and only while climbing (`climbAhead()` in movesim.ts: the ground
  `ahead` is a step higher and still rising, so a kerb isn't stairs) at a
  climb's pace (under `STAIRS.fast`); once on one, `STAIRS.margin` keeps it
  (at the usual margin the take flipped to its mirror every half second),
  and a frame past the climb is the wrong kind (played on into the take's
  standing tail while he climbed, the held feet stretched a leg until it
  snapped); the feet land on the real treads through the lock as before.
  The climb's frames shape none of the matching's statistics (`OWN_KIND`
  in motionmatch.ts: counted, they moved the means enough to change a
  pivot's picks). Walk mode
  slows a climb (`STAIRS.walk` walking, `STAIRS.run` a brisk climb running:
  faster than the take's climb a held foot stretched and snapped). The lab
  has a Stairs program and its flight is the stadium footbridge's size now
  (Liberty Bridge's stairs went with its redesign), as the tests' flights
  are. Two more climbs (122_31, 122_35) flipped an ankle 75–90° for two
  frames each (a marker swap) and went; a repair of runs of frames broke the
  jumps' take-offs, so the one-frame repair stays and glitchy takes lose.
  No "walk down stairs" take was found: down is the walks with the lock, as
  before. **Open:** the hips still bounce about a third of a tile a step on
  the city's double-size steps (the lift following a foot up its tread and
  the drop when the other can't reach, over the even ramp the tests walk;
  in the city the ground is the treads themselves, eased); handed to the
  contact phase, which left it for the polish phase.

What's not in, and why:

- **The stop with a settle** is the capture's own stops (`run-stop`,
  `run-jump-stop`, the walk's) rather than a separate settle: the rubric's
  Stops row (the chest coming back from the run's lean, a touchdown before
  he's still) passes on every program, so nothing was added.

### Phase 3: contact (the old Phase 6; built, for the owner's sign-off)

What was planned (and what came of each):

- **Brushing a wall or a person**: the shoulder gives and the step hitches
  (an additive layer, `contact.ts`); the crowd's person reacts too (a
  `bump` row, picked by the life rules, life.ts). **Built.** `contact.ts`
  (DOM-free, tested in `tests/contact.test.ts`) is a layer on the
  animator's pose: `createContact().update()` reads what's near him each
  frame (`ContactInput`: the collision grid's boxes within `CONTACT.reach`,
  the crowd's people, where he can't step, and whether his move was stopped
  this frame and how fast he was going) and `applyContact()` lays its
  state on the pose before the figure takes it (walk.ts: after
  `animator.update()`, before `applyTo()`; not with a gun in his hands, the
  hold has the arms). Moving past a wall or a person within `brush` /
  `person` at his side, that collarbone is pulled back and the chest
  turned a touch (`give`, `giveChest`), eased in and out (`ease`,
  `easeOut`), and the step hitches once (`hitch`: walk.ts takes 30% off
  his top speed, over `hitchT`). The crowd's person: `bump` on a `Person`
  in life.ts, a step `BUMP.out` aside and back over `BUMP.t` when you go
  past within `BUMP.r` faster than a stroll (sitters and the park's people
  left alone); the look is `noticing()`'s as before.
- **Stopping close to a wall: a hand goes onto it; walking along a
  railing, a hand on it; standing at a rail, a lean on it.** **Built.**
  Stopped (under `still`) with a wall within `handStop` ahead (within
  `handCone` of straight ahead), a hand goes onto it at `handHigh` in
  front of its own shoulder (`shoulder` out from his middle, `palm` off the
  surface); walking slowly (under `slow`) with one within `handAlong` at
  his side, that hand trails along it at `handLow`. The hand reaches
  through a two-bone arm IK (`reachArmBones()`: the animator's leg IK with
  the elbow bending the other way, the hand keeping its turn), eased on
  over `handEase` as a smoothstep (a reach, not a snap), and once on it
  stays where it is (never slides to a new spot, never swaps hands) until
  it's let go, when the spot comes with him in his own frame so the hand
  only eases back to the pose. The rubric's Contact row (a hand within
  1.5 cm of the thing it's on) is held by the test, at every distance in
  reach. Standing still (`railDwell`) facing an edge he can't step over
  with nothing solid within reach of it (`blocked` with no box near: the
  quays, the promenades' railings, the boardwalk, the sky deck) he leans on
  the rail: both hands on it at `railH`, `railSpread` apart, the spine
  forward `lean` and the head back up.
- **Running into a wall at a sprint: a stagger, not a stop dead; the
  camera's small shake.** **Built**, not as a keyed clip: into a wall
  faster than `stagger.speed` (walk.ts's `hitWall` / `hitSpeed`: his move
  stopped by something this frame) the chest and head pitch back
  (`stagger.pitch`, a bell over `stagger.t`), the near hand goes up to the
  wall (`stagger.hand`), and walk.ts carries him `stagger.back` tiles back
  from it on the springs with the stick waiting (the capture's backpedals
  give the feet) and shakes the camera a little; nothing else of the pose
  is touched.
- **Doorways and alleys: the shoulders turn a little through a narrow
  gap.** **Built.** Walls close on both sides with less than `squeeze`
  between them turn the spine and chest `squeezeTurn` (more the narrower)
  and bring the arms in `squeezeArms`; the give stands down in a gap.
- **On phones this layer steps down first.** **Built:** `createContact({
  hands: false })` on the low tier leaves out the hands and the lean (the
  give, the hitch, the squeeze and the stagger stay: they're a few turns).
- The lab's **Contact** program and floor (`?anim&prog=contact`): a wall
  along his right to trail a hand on at a walk, a narrow gap, a wall
  across the way to sprint into and stand at, a run back and a rail to
  lean on; he can't walk through any of it. In the reel. A Contact readout
  says what the layer is doing.

What's not in, and why:

- **The hand's own turn**: a hand on a wall keeps the pose's turn (its
  fingers down along the wall), not a palm laid flat; the polish phase's,
  with the fingers.
- **The stairs' hips bounce** (Phase 2's open item, handed here) isn't
  fixed: it's the lock's lift and drop over a double-size tread, nothing
  to do with contact; it goes to the polish phase with the stairs' review.
- Walk mode's hard stop against a wall at a walk is still the collision's
  (a hand goes onto it); only a sprint staggers.

### Phase 4: the game's moments (step 1 built, for the owner's sign-off)

Built in two steps: **step 1** (the framework, doors, counters and benches:
built, below) and step 2 (getting in and out, rides seen, carrying).

What step 1 built (and how it differs from the plan):

- **The framework** is `moments.ts` (DOM-free, tested in
  `tests/moments.test.ts`): a `Mark` (where he stands, his facing, the
  hands' targets: a door's handle, a counter's two points; a bench's seat),
  made by `doorMark()` (he comes at a door from where he is and stands
  `stand.door` short of it facing it, the handle `handleSide` to his right
  at `handleY`; a stand spot he can't stand on keeps him where he is),
  `counterMark()` (`stand.counter` short of the counter's point, both hands
  on its top) and `benchMark()` (in front of the seat with his back to it).
  `createMoment()` runs the phases `approach` → `play` → (`hold` →
  `back`) → `done`: `update()` gives walk.ts the approach's goal each frame
  (the way to the mark, slowing in over `slowIn`, turning to its facing
  within `turnIn`; done within `at` of it and `faceAt` of its facing, or on
  `timeout`, never stuck; from further than `max` no approach), `skip()`
  (F again) cuts an approach or a door short and opens at once,
  `release()` brings a counter's lean back or stands him up, `cancel()`
  drops it (a fast travel, walk mode ending). `amount()` is the keyed
  pose's share, `root()` where the root is while seated. The clips are
  keyed on the `Pose` rig as the vault's are (`momentPose()`, the hands put
  on the thing by `reachArm()`, the test holding each within 1.5 cm of its
  target); no capture was used for these: a push, a lean and a sit are
  short and the rig's reach does the meeting.
- **Doors**: a step up (the approach) and a push: a little lean, the
  right hand to the handle pushing it in `push` as it lands, the panel
  opening at `door.open` of the push (`fire()`, once). Every landmark's
  door, Trench Avenue's, the stadium's gate, the garage and hangar
  offices, the kart hut and the lifts' and stations' doors (the `place:`
  prompts `lift:` and `metro:`). The garage, hangar and kart hut are doors
  rather than counters (the plan listed them as counters): their menus
  open at a door, and the garage's and hangar's cameras look at the
  showroom, not at him.
- **Counters**: the gun stores' (the Armoury's `RACK_TOP`, Trench Arms'
  hatch at `ARMS.street`) and the trainer's (`TRAINER_TOP`): the lean in
  (`counter.in`) with both hands on the top and the menu opening at
  `counter.open` of it, held while the menu is open, back (`counter.out`)
  when it closes (`shop.onClose`, `fightUI.onClose` → `release()`). The
  units', the stall's and the corner shops' prompts open at once as
  before (the plan's kiosks come with step 2's carrying).
- **Benches**: a "Sit" prompt at the nearest bench nobody is sitting on
  (`BENCHES` in pedestrians.ts; a crowd sitter within 0.45 takes it; most
  of the square's and the parks' first benches are taken), F sits him
  down (`bench.down`: the root comes down and back onto the seat so his
  hips sit on it as the crowd's do, the legs folding into poses.ts's
  `sitPose`, which breathes and looks round), "Stand up" (F, or the stick)
  stands him up (`bench.up`) back onto the stand spot.
- **walk.ts**: `markFor()` turns a prompt into its mark; `act()` starts
  the moment and hands it what the prompt opens; the keys wait while a
  moment is on (seated, the stick stands him up); the approach's goal
  replaces the stick's; the keyed pose comes in over the motion capture
  (`momentAmt`, the mocap stepping aside as for the slide and the vault);
  the root and the camera's eye drop with the seat (`momentDy`); the
  contact layer stands aside while a moment is on. Sitting down he turns
  his back to the bench, where the camera was: it comes round to a
  three-quarter view from whichever side of him has the room
  (`pickBenchYaw()`, `cameraRoom()` with the bench's back and anything
  else that low left out of the way, `skipUnder`), and is yours again
  once he's seated; seated he shows even with the camera close.

What's not in, and why:

- **The prompts' own moments for the units, the stall, the corner shops,
  the river bus and the kiosks**: step 2's (carrying and rides).
- **A moment while armed or aiming**: the gun's hold has the arms; a door
  pressed with a gun in his hands still plays the push on the legs and
  hips only (the hand stays on the gun). The polish phase can add a
  one-handed push.
- **The second press to skip** is in; a tap on the prompt button does the
  same.

  what's there), an approach (motion matching to a trajectory ending on
  the mark, facing it: the walk's own last steps, never a slide into
  place), a clip (from capture or keyed, with its `marks` so the hand
  meets the thing), and a hand-back (into the idle, the seat or the
  panel). The prompts stay what they are (F); a moment plays between the
  press and what it opens.
- **Doors** (built, step 1): a step up and a push (the Emporium, the club, the bar, the
  stations, the lifts), a hand to the handle; the panel opens as the hand
  lands.
- **Counters** (built, step 1: the gun stores and the trainer; the kart
  hut, the garage and hangar offices are doors): a lean on the counter while the menu is open (the gun
  stores, the kart hut, the trainer, the garage office, the hangar
  office, the kiosks), and standing back up when it closes.
- **Getting in and out**: the car's door opened, a duck in and the seat on
  the bones (and out: a foot out first); the kart stepped into and sat
  (`seat()` re-posed on the bones); the boat's ladder climbed down to the
  helm and up; the aircraft's step up. The seats stay where they are
  (karts.ts, boat.ts, drive.ts); the moment is what gets him there.
- **Benches** (the life plan's item 5; built, step 1): F at a free bench (the benches'
  data and `SEAT_H` are in `pedestrians.ts`) sits him down (a sit-down
  clip), seated he breathes and looks round (the gaze), F stands him up;
  the crowd's sitters get the same rows in Phase 5.
- **Rides seen**: the metro, the taxi and the river bus show him riding
  (standing holding a rail in the metro car, seated in the cab and on the
  bus, looking out), the ride's camera as today; the lifts show him step
  in and turn to face the door before the fade.
- **Carrying**: a crate lifted at the market hall or a unit and set down
  (the Car tab's load and unload play it by the boot), a walk with a
  weight (the arm layer eased by what's carried), the coffee and the
  phone as today.
- Everything in walk.ts stays where it is; the moments are called from
  the prompts' `act()` and hand back to what it did.

### Phase 5: everyone on the same motion

- **Other players** (`remote.ts`) on the animator, fed from the
  interpolated position, speed and facing the server already sends; the
  gun hold, the emotes and the gaze on top; far ones at the far rate.
- **The crowd's rows re-baked** from the captured clips (`crowdclips.ts`
  samples the database at build time through `baked()`): two or three
  walks and the jog, three idles, two chats, the sit (and the sit-down and
  stand-up as non-loop rows), the picnic, the march and the salute;
  `life.ts` keeps picking by its rules, with a per-person pick of which
  walk and which idle (seeded), so no two people are in step or alike.
  The soldiers' march from capture.
- **The emotes** re-keyed on the bone pose (and the dance from capture if
  a take fits; the hologram and the fitting room's stage play the same).
- **The scale rule**: every row plays at its stride for the person's scale
  (as today's walk does), tested for kids' and fighters' scales.
- Measured on a phone (`?bench`, `?fps`: the crowd texture's size, draws,
  memory) before it merges.

### Phase 6: the crowd's acts that suit the city

Rows the life plan's rules can pick (the rules stay life.ts's and
pedestrians.ts's; this phase only gives them the moves):

- Waiting at a kerb (a weight shift and a look both ways), the brisk
  crossing step, the hurry in the rain.
- A phone in the hand (standing, walking: the crowd already has `phone`
  people on the plaza and the boulevard).
- Traders handing over, diners eating, cooks at the stalls, vendors at
  the carts, fishers casting on Pier 7, rowers at the oars (the park's
  boats) and the swan riders, the bouncers with arms folded, chess at the
  pavilion, the boombox corner's chairs.
- Kids at play: running (the jog at a small scale), a ball game, the swings.
- Each row from capture where a take fits, keyed where none does; no row
  threatening, none explicit (the content rules).

### Phase 7: the Fight Club

- The fighters' legs round the ring on the animator (the guard's upper
  body over them, as the gun's is over the player's).
- The fight clips measured by the rubric (weight into every punch and
  kick, the recovery, the hurt reactions with the hips) and re-keyed where
  they fail; candidates from capture (CMU has boxing takes: below) blended
  under the keyed timing (a move's clip stays exactly its sim frames
  long, the strike on the first active frame: `fight-anim.ts`'s rule).
- Nothing changes in `fight-sim.ts`; the tests hold the timing.

### Phase 8: polish and feel

- Follow-through: the head and neck a few frames behind the chest in
  turns, the hands relaxed per clip (a grip per take in `takes.json`), the
  collarbones from capture where the actor's shoulder data is clean.
- The camera's coupling to the animation (already subtle) reviewed with
  the new moves; the dips and shakes on the rubric's reaction times.
- Phones: the step-down order measured on a real phone; what's left out on
  the low tier written here.
- `locomotion.ts` retired once nothing uses it (`reachLeg()` lives on).

## The data: candidates from CMU

Each must be played in the lab before it's used (CMU's index names the
activity, not the quality: feet that flip, a dip on one side and marker
noise were found in Phase 1's candidates). The files come from the
cgspeed BVH conversion's GitHub copy, as today's did; the environment
needs that host reachable. Everything stays CMU (confirmed terms), unless
the owner allows `zenodo.org` for 100STYLE.

| Need | Candidates (subjects) |
|---|---|
| Walks with character (a stroll, a brisk walk) | 02, 07, 08, 16, 35 (big walking sets), 39 |
| Idles with real weight shifts, gestures | 13, 14, 86, 111, 113, 114 (everyday behaviours) |
| Stairs and steps | 13, 14, 36 (to check: "walk up stairs" takes) |
| Sit down, sit, stand up | 13, 14, 79, 80, 86, 111 |
| Lifting, carrying, setting down | 79, 80, 115, 143 |
| Opening a door, a reach to a handle | 13, 14, 111 (to check) |
| Boxing, a fighter's shuffle | 13, 14, 15 (boxing takes, to check) |
| A dance | 05, 55, 60, 61, 93, 94 (salsa pairs: one dancer cut out) |
| Kids at play (adults at a smaller scale) | the jog and the run at scale; a ball game from 86 |

## Tests

- `tests/human.test.ts`: the rubric over every clip and every program.
- `tests/gaze.test.ts`, `tests/contact.test.ts`, `tests/moments.test.ts`,
  `tests/sitting.test.ts`: each layer's rules (the head within its bands,
  a hand on the wall, every moment's hand on its mark, the sit on the
  seat's height).
- `tests/crowdclips.test.ts` grows with the rows (every row sampled from
  the database, its stride, the scale rule).
- `tests/mocap.test.ts` holds the packs and their sizes; `tests/baked.test.ts`
  the crowd's rows.
- The existing animation tests stay green throughout (`animator`,
  `motionmatch`, `inertia`, `movesim`, `locomotion` until it's retired,
  `gunfit`, `vault`, `fight-anim`, `fight`, `skeleton`, `body`).
- `npm run typecheck`, `npm test`, `npm run test:wide`, the budgets, and
  `?bench` on a phone and a laptop before each phase merges.

## Open questions for the owner

- **Order:** the phases above are in the order of what's seen most (the
  player every frame, then the crowd, then the moments). The owner may
  want the crowd (Phase 5) before the player's finish (Phase 2): it's the
  bigger visible change in the City view.
- **Benches:** F at a free bench to sit (and to stand), or a tap on the
  bench in the City view too?
- **Rides seen:** show Degen riding the metro, the taxi and the river bus
  (Phase 4), or keep the rides' cameras as they are?
- **The Fight Club** (Phase 7): in scope now, or after the fight plan's
  next phase (styles, PvP)?
- **100STYLE:** allow `zenodo.org` so its locomotion styles can be checked
  and, if the licence holds, used (more walks and turns in one style, and
  a little variety for the crowd)?
- **The crowd's variety:** the same neutral style for everyone, or a few
  characters (a hurried walk, a slouch, a swagger for the bouncers) from
  other actors?
- **Stairs down:** walking up stairs is from capture now; down is the
  walks with the lock. Is a keyed step down wanted, or another search for a
  take?
- **A stroll:** the only slow walk among the reachable subjects (132_40)
  isn't a person's walk by the rubric. Look further (the subjects under
  100 need the CMU site, unreachable from here), allow another host, or
  leave the walk at Caps Lock as the one walk?

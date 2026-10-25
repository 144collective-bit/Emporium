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
| Cadence | steps a second at each speed | walk 1.7-2.1 (at 1.4 m/s), run 2.6-3.3 (5 m/s), sprint 3.4-3.9 (7.5 m/s) |
| Stride | step length at each speed | walk 0.6-0.8 m, run 1.4-1.7, sprint 1.9-2.2 (what Phase 1's fix measured, kept) |
| Support | both feet down (walking) / neither (running) | a walk has double support 10-25% of a cycle; a run has flight; never the other way |
| Foot slide | a held foot's movement over the ground | under 1.5 cm (the AAA bar); today 0.6 |
| Bob and sway | the hips' rise and fall and side-to-side a cycle | walk 3-5 cm up and down, 2-4 cm sideways; run 6-10 cm |
| Counter-rotation | pelvis against the shoulders, arms against the legs | the shoulders turn against the pelvis; each arm swings with the opposite leg, within 15° of anti-phase |
| Elbows | the elbow's bend with speed | walking 10-30°, running 60-90°, never backwards |
| Knees and neck | joint limits | a knee never past straight; the neck within ±70° yaw, ±45° pitch of the chest |
| The head | the head's angular speed | under 3 rad/s walking and running (a person's gaze is stable), under 1.5 standing |
| Pops | any bone's turn between frames | under 0.7 rad (today's bar), and its angular velocity continuous through every transition (no step over 10 rad/s²-equivalent in a frame) |
| Weight | a stop, a start, a turn | a stop from a run takes at least one braking step with the chest back; a start leans in before the first step; a turn round from standing plants a foot |
| Reaction | from the input to the body | the first visible change within 0.1 s, the new motion within 0.3 s |
| Stillness | standing still | never frozen (breathing 0.2-0.3 Hz, a weight shift every 4-12 s), never twitchy (no bone over 3° a frame) |
| Variety | the crowd | no two people within 0.1 of a cycle in step; three idles at least, taking turns |
| Contact | hands and feet on what they touch | a hand on a thing within 1.5 cm of its surface; feet on the ground; nothing through a wall |
| Scale | kids, fighters, the crowd | the same rules hold at every `scale` (the clips play at the stride for the scale) |

Every band is a test. A clip or a move that fails a band is fixed in the
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

### Phase 1: the audit and the rubric

- `tests/human.test.ts` with every rubric row, run over every clip in the
  database and the animator on every lab program; the lab's scorecard and
  reel.
- The audit: every band that fails today, every situation in the
  inventory, with a screenshot or a lab recording each, written here under
  "What the audit found". Quick fixes that are a number or a filter (a
  cadence off, a noisy hand, a head too quick) go in with the phase;
  anything bigger is placed in the phase below that owns it.
- The data packs and delta coding (`mocap-build.ts`, `mocap-load.ts`,
  `tests/mocap.test.ts`, the budgets), so the phases after have room.
- Tags and marks in `takes.json`.
- For the sign-off: the scorecard before and after, the reel.

### Phase 2: the player, finished on foot

- **Idle life** from capture: three or four more standing takes with real
  weight shifts, a look round, a hand to the face or a pocket, taking
  turns at random intervals (never the same order); breathing laid on
  every idle (the chest and shoulders, 0.25 Hz, a few millimetres).
- **The gaze** (`gaze.ts`): the head and eyes drawn to what's interesting
  within a few tiles (a person passing, a car going by, a sign, the way the
  stick is about to turn him), with a dwell and a return, limited by the
  neck's bands; standing still he looks round the way people do (a glance,
  a hold, back). Other figures get it in Phase 5.
- **Walks**: a stroll and a purposeful walk (Caps Lock), the matching
  picking by speed and how long he's been walking; starts and stops at a
  walk from capture (today's are the run's, slowed).
- **Stairs and steps**: a step up and a step down from capture (candidates
  below), the foot lock reading the treads as it does on Liberty Bridge,
  for every stair in the city (Liberty Bridge, the footbridge, the lakeside
  terraces, the stations' towers, the stoops). If no take fits, a keyed
  step on the bone pose, measured by the rubric like any clip.
- **The stop with a settle**: a run's stop ends in a settle (a half step,
  the weight back) before the idle, not a cut.
- Measured by the rubric; the lab's Idle, Walks and Stairs programs.

### Phase 3: contact (the old Phase 6)

- Brushing a wall or a person: the shoulder gives and the step hitches (an
  additive layer, `contact.ts`); the crowd's person reacts too (a `bump`
  row, picked by the life rules, life.ts).
- Stopping close to a wall: a hand goes onto it (the arm IK, as the vault's
  hand plant); walking along a railing, a hand on it; standing at a rail
  (the promenades, the boardwalk, the sky deck), a lean on it.
- Running into a wall at a sprint: a stagger (a keyed clip, two steps back
  and a hand up), not a stop dead; the camera's small shake.
- Doorways and alleys: the shoulders turn a little through a narrow gap
  (the bollards, the lanes).
- On phones this layer steps down first.

### Phase 4: the game's moments

- `moments.ts` (DOM-free, tested): a moment is a mark (a spot, a facing,
  what's there), an approach (motion matching to a trajectory ending on
  the mark, facing it: the walk's own last steps, never a slide into
  place), a clip (from capture or keyed, with its `marks` so the hand
  meets the thing), and a hand-back (into the idle, the seat or the
  panel). The prompts stay what they are (F); a moment plays between the
  press and what it opens.
- **Doors**: a step up and a push (the Emporium, the club, the bar, the
  stations, the lifts), a hand to the handle; the panel opens as the hand
  lands.
- **Counters**: a lean on the counter while the menu is open (the gun
  stores, the kart hut, the trainer, the garage office, the hangar
  office, the kiosks), and standing back up when it closes.
- **Getting in and out**: the car's door opened, a duck in and the seat on
  the bones (and out: a foot out first); the kart stepped into and sat
  (`seat()` re-posed on the bones); the boat's ladder climbed down to the
  helm and up; the aircraft's step up. The seats stay where they are
  (karts.ts, boat.ts, drive.ts); the moment is what gets him there.
- **Benches** (the life plan's item 5): F at a free bench (the benches'
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

# The golf game: playing Knob Hill (a plan)

The owner's call (2026-11-21, `docs/golf-plan.md`): "once this is built we will make a golf game dynamic so we can play
actual golf on the course ... later we make it a game in the game". The course is built (`docs/golf-plan.md` Phases
1 to 5); this is its game, the golf plan's Phase 6, its own plan (the owner's pick, 2026-11-22: "1").

Nothing is built until the owner signs off a phase; keep this plan up to date. The guide for what's built is
`docs/guide/golf.md`.

## The owner's answers

| Question | Answer |
| --- | --- |
| Plan the golf game next | Yes (2026-11-22) |
| The swing | The three-tap meter on a keyboard (start, power, accuracy); on touch a pull-back drag, with the same power and accuracy behind it |
| Degen holding a club | Yes: golf is the one exception to "his hands hold only weapons" (docs/wardrobe-plan.md Phase 1), a club in his hands only while a round is on |
| How long a round | The player's pick each time: a hole, the front nine, the back nine or all eighteen; a round left is carried on later |
| Between shots | The camera flies to the ball |
| Phase 1 | Go (2026-11-22); built, signed off (2026-11-23: "1") |
| Phase 2 | Go (2026-11-23); built, waiting for the owner's sign-off |

## What it is

Degen plays Knob Hill's eighteen holes as they're laid: the ground, the lie and the wind decide every shot. An arcade
game, easy to pick up on a phone, with enough in it to get better at: aim, pick a club, swing with a meter, read the
green. Rewards are Dorras and XP only, like the kart park's. Nothing in it costs real money.

## How it plays (the design, for the owner's sign-off)

- **In:** at the clubhouse's door, "Play golf" (walk.ts's prompt, `live.closed()` first); the City view's panel's
  Walk in stays. The menu (the arcade kit, `.mk`): **Play** (a hole, the front nine, the back nine or all eighteen),
  **Practice** (the putting green and the nets by the clubhouse), **Card** (your best rounds and each hole's best),
  later the daily challenge.
- **A shot:** you stand at your ball, the camera behind it looking down the line, an aim line out to where the
  club carries (bending with the wind), the club picked for the distance (change it up or down). Aim left or right;
  swing with the meter (the classic three taps: start, power, accuracy; or a pull-back on touch: the owner's pick
  below). Off the top of the meter is more distance and less control; a miss at the end hooks or slices.
- **The ball:** it flies (gravity, the air's drag, the wind, a little height from the club's loft), lands, bounces
  and rolls by what it lands on (the course's own `surfaceAt()`: firm on the fairway, soft in the rough, dead in a
  bunker, quick on the green), and rolls with the ground's slope (`golfLift()`'s grid). The camera follows it.
- **The lie** decides the next shot (golf.ts's surfaces): the fairway clean, the first cut a touch less, the rough
  shorter and wilder, the native grass and the woods' land a chip out, a bunker only a wedge (sand wedge out of a
  greenside one), the water a penalty stroke and a drop by where it went in, off the club's land a stroke and play
  again (out of bounds). A tree in the way stops a ball (the woods' trees, golflift.ts `golfTrees()`).
- **Putting:** on the green the camera comes down behind the ball, a grid over the green shows its slope (arrows
  or a moving sheen), the meter's power is the roll's length; the ball breaks with the slope and drops when it's
  slow enough over the cup.
- **Between shots:** the camera flies to the ball (no walking between shots: it's quick on a phone); Degen is shown
  at the ball for each shot. Between holes, on to the next tee the same way. A round can be left at any hole and
  carried on later (the save keeps it).
- **The other golfers:** the groups out on the course (Phase 5) keep off the hole you're playing (their round skips
  it while you're on it), so nobody's in your way.
- **The card:** strokes a hole, par, the round against par, the best round and each hole's best kept; birdies,
  eagles, holes-in-one counted.
- **Rewards** (Dorras and XP only, game numbers): XP for every hole finished and more for par, birdie, eagle and an
  ace; Dorras for a round by its score against par, under the daily prize cap as the kart park's races are
  (`PRIZE_CAP`: a new count for rounds); missions and badges (a first birdie, a round under par, all eighteen).
  Free play (`FREE_FOR_NOW`) changes nothing here: nothing in golf is bought.

## The rules and the view (the code)

- **`golfgame-sim.ts`** (DOM-free, on `DOM_FREE`, seeded, tested in `tests/golfgame.test.ts`): the clubs (`CLUBS`:
  carry in tiles at the course's half scale, a driver about 90, a sand wedge about 22, loft, how each lie takes it),
  a shot (`strike()`: aim, power, accuracy, the lie, the wind → the ball's launch), the flight (`fly()`: a fixed
  step, gravity, drag, the wind), the landing (`bounce()` by surface), the roll (`roll()` on the slope, by surface),
  the cup (`holed()`), the penalties (water, out of bounds, the drop), the trees (`treeHit()`), the hole and the
  round (`newRound()`, `nextShot()`, the card). A test "golfer" (the sim's own bot, aiming at the pin with the right
  club) plays every hole: each must be playable within par plus two, no ball ever stuck, every drop on dry land.
- **The save:** in tycoon.ts's save as the kart park's is (`golf`: the round in progress, the card's bests, the
  counters), its migration in `cleanSave()` and a new save version; no new localStorage key (none for
  `BACKUP_KEYS`). Paid through `finishGolfRound()` / `finishGolfHole()` → a result, booked in the ledger (`golf`).
- **The view:** its own chunk, loaded when the menu first opens (`lazy()`, as the kart game's `kartgame.ts`):
  `golfgame.ts` runs a round (the camera, the aim line, the ball and its trail, the flight's follow, the putting
  grid, the sounds: a club's strike, the ball in the cup, a splash), `golfgame-ui.ts` the menu, the HUD (hole, par,
  strokes, the club, the wind, the lie, distance to the pin) and the card. Degen's swing and putt are the crowd's
  rows (Phase 5's `golf` and `putt`) played on his figure.
- **The boot** stays as it is: everything but the door's prompt and the panel's line comes with the game's chunk
  (`npm run budget`).

## The phases (each with the owner's sign-off)

### Phase 1: the rules

`golfgame-sim.ts` and its tests: the clubs, a shot, the flight, the landing, the roll on the slope, the lies, the
penalties, the trees, the cup, a hole and a round, the bot's rounds. Nothing on screen yet. A map from the data
(`npm run golfmap`): every hole with the bot's shots drawn on it, for the sign-off.

**Built** (2026-11-22; `docs/guide/golf.md`):

- `golfgame-sim.ts` (DOM-free, on `DOM_FREE`, seeded): `CLUBS` (Driver 92, 3 Wood 80, 5 Iron 66, 7 Iron 54, 9 Iron
  42, Wedge 32, Sand Wedge 20 tiles of carry; the Putter, `PUTT_MAX` 26), `lieTake()` and `SPRAY` (the lie's share
  and wobble), `launchOf()` (each club's launch speed found from its carry), `strike()` (the flight with `GRAVITY`,
  `DRAG`, the wind and a hook or slice's `CURVE`; `OVER` off the top of the meter; the trees, `inTree()`, `TREE`; the
  landing's `BOUNCE` and the roll's `ROLL` by surface, the slope's `SLOPE_PULL`; the `CUP`; the water and out of bounds
  with `dropBy()`, `outOfBounds()`; the result's `path`, `carry`, `lie`, `holed`, `penalty`), `newRound()` /
  `playShot()` / `windOn()` / `toPar()` / `roundOver()` (`MAX_STROKES` 10 picks a hole up, `WIND_MAX` 5), `botShot()`
  (the test golfer: the club that gets there, a search of aims and powers on the sim, two passes on the green).
- The tests (`tests/golfgame.test.ts`): the carries off the 1st tee, the wind, the slice and the hook, the meter's top,
  the lies, putting's length and the cup, the water's drop on dry land at every lake, out of bounds (two strokes, the
  ball back), the trees, the card and the pick-up, the same with the same seed; the bot round all eighteen within par
  plus two a hole and under par (it never mishits: -15 to -18), a golfer who mishits a little about par (+1 to +9 on
  the seeds tried), no hole picked up.
- The map: `GOLF_ROUND=3 npm run golfmap -- game-phase-1-round` (`docs/golf-shots/game-phase-1-round.png`): the
  mishitting golfer's round on seed 3 drawn shot by shot, 9 over par. `GOLF_ROUND_BOT=1` draws the bot's.

### Phase 2: a shot on the course

The game's chunk and its first look: the clubhouse's "Play golf", the 1st tee, aiming, the meter, the ball's flight
and roll followed by the camera, Degen's swing, the next shot from where it stopped, holing out. One hole playable,
on a desktop.

**Built** (2026-11-23; `docs/guide/golf.md`): Play golf at the clubhouse's door (the live settings' `golf` gates
it) opens a round of the 1st hole: Degen at his ball with a club in his hands, the camera behind the ball, the aim's
ring and line, A / D to aim, W / S the club (the one for the distance picked first), Space three times (the meter:
start, power on the way up, accuracy on the way down), his swing or putt, the ball's flight and roll followed by the
camera (its trail behind it), a pop for the water, out of bounds or a tree, the camera flying on to the next shot,
the hole's card (its strokes and their name, Again or Done), Esc or Quit out. The HUD: the hole, its par and name,
the stroke; the club, the distance to the pin, the lie; the wind's arrow and speed; the meter. In the boot 1.4 KB
(770.5 KB): walk mode's hooks; the game's own chunk the rest. The smoke plays a shot (`golf`). Shown to the owner
with the smoke's pictures. The crowd's groups now start part-way round their nine (golflife.ts `offset`), not on the
1st tee; keeping them off your hole is Phase 3's.

### Phase 3: the round

All eighteen (a hole, a nine or the round), the putting camera and the green's slope shown, the penalties' drops, the
card, the save (the round kept and carried on), the other groups keeping off your hole, the rewards (XP, Dorras under
the daily cap), the ledger, missions and badges.

### Phase 4: phones, pads and polish

Touch (the meter or the drag, the aim, the club), the gamepad, the phone tier's camera and HUD at 320 to 1440 wide,
upright and on their side; reduced motion (the ball still flies: it's the game, without the camera's shake); the
sounds; `?fps` and `?bench` on the course; the smoke play-through plays a hole.

### Phase 5 (later, the owner's to choose)

The daily challenge (closest to the pin on a par 3), the practice range's and putting green's games, records and
boards ready for the game server, a caddie's tip.

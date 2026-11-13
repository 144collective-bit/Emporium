# The walk plan: walk.ts in parts

The owner's call (2026-11): split `walk.ts`, a phase at a time, grouping its
state by feature, the gamepad first, each phase checked with the smoke test.

## Where it started

`src/scripts/city3d/walk.ts` was 3,705 lines: `createWalk()`, one closure
of about 3,400 lines holding 120 `let`s and 184 constants and functions. Its
`update()` (674 lines) reads 99 of the `let`s; the gamepad's `pollPad()` read
13 and called some 40 functions; only about 250 lines read none of that
state. It had no unit tests (it's the view), and it changes on main most
days (61 commits in the fortnight before this plan), so big moves collide
with work in flight.

## How each phase goes

- **One feature a phase**, moved **word for word**: the code that leaves
  keeps its text; what it reads and calls of walk mode comes through a
  small host interface that walk.ts builds once (getters for what may
  change, the functions as they are), so nothing else in walk.ts is renamed
  and a merge from main touches as little as it can. A script checks the
  moved text against the old.
- **The part that leaves is DOM-free where it can be** (the page's own
  objects passed in), on `DOM_FREE` in `eslint.config.js`, with unit tests
  of its own: each phase leaves walk mode with more tests than it had.
- **Before and after:** `npm run typecheck`, `npm run lint`, `npm test`,
  a build, `npm run budget` and `npm run smoke` (scripts/walk-smoke.mjs:
  the car, on foot, the gun store, the metro, a kart race, flying, the
  gamepad). A phase adds a scene to the smoke test where it has none.
- **`keymap.ts`** still says what each key and button does: a phase that
  moves a handler says where it went.
- Each phase with the owner's sign-off, merged before the next starts (the
  file moves under it otherwise).

## The phases

0. **The safety net** (built): `npm run smoke`, seven scenes.
1. **The gamepad** (built): `walkpad.ts`
   (`pollPad()`, `PadHost`, `PadState`), tested in `tests/walkpad.test.ts`
   (on foot, empty hands, hold or toggle, the menus, the wheel of each
   vehicle, the ring, a ride). walk.ts: 3,705 to 3,550 lines.
2. **The keyboard** (built): `walkkeys.ts`
   (`onKey()`, `KeyHost`, `MOVE`), tested in `tests/walkkeys.test.ts` (not
   walking or typing, on foot, a menu open, the wheel of each vehicle, the
   ring, a ride, and every key `keymap.ts`'s table lists for a mode is
   walk mode's there). The one thing it asked the page (is the emote panel
   open) is the host's `emotesOpen()`. walk.ts: 3,566 to 3,500 lines.
   The table test found a fault older than the move: a kart's item key (E)
   was never held, so it did nothing; fixed after the move, in a commit of
   its own (the karts' branch holds E as the ring's holds the move keys).
3. **Touch** (built, waiting on the owner's sign-off): `walktouch.ts`
   (`wireTouch()`, called once; `TouchEls` the page's own objects, the
   window and the document among them under their own names, so the text
   is as it was and a test stands in for the page; `TouchState` walk
   mode's shared objects; `TouchHost` what it reads and calls). Three
   stretches moved: the pedals' fingers, `capture()` and `holdButton()`,
   and the stick with every touch button's wiring (the look settings'
   inputs and the prompt's tap sat among them and went along). It answers
   with what the rest of walk mode calls (`startJoy`, `endJoy`,
   `pressPedal`, `clearPedals`, `rectOf`, `setAim`). Tested in
   `tests/walktouch.test.ts` (the stick, floating at the wheel, the
   pedals, held or toggled, each button, the phone's gestures); the smoke
   test has a `touch` scene (made-up fingers: the stick, Aim, Gas).
   walk.ts: 3,500 to 3,302 lines.
4. **The frames by mode**: `driveFrame()`, `boatFrame()`, `flyFrame()`,
   `kartFrame()`, `fightFrame()`, `rideFrame()`, `frameShowroom()` (about
   230 lines): what each reads of the pad, the keys and touch as one input
   object, so they stop reading the closure.
5. **The camera**: `cameraRoom()`, `look()`, `nextCam()`, the peek and the
   first-person eye.
6. **`update()` in stages**: the prompts (what's near, about 100 lines),
   moving and colliding, the animation's layers, each a function of a
   state object, the `let`s it owns grouped with it. The biggest and the
   last: only once 1-5 have shown the way works.
7. **The returned object** (325 lines): what's left is walk mode's public
   face and its wiring.

## Not in this plan

Changing how anything plays, the keys, or walk mode's public interface
(`Walk`, `WalkDeps`): every phase is a move, not a change.

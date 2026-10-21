# Fight mechanics: punches, kicks and the Fight Club

The owner's call: proper hand-to-hand fighting, with real punch and kick
animations, built now so it plays offline and runs on the game server for
player-versus-player the day multiplayer resumes. Everything here is for
the city's game only: Dorras and XP, never real money, nothing tied to the
token or the store.

## Decisions (the owner's, 2026-10)

| Topic | Decision |
| --- | --- |
| Where | **The Fight Club** on the south bank (one of the multiplayer plan's PvP places). Offline it runs now against sparring bots, and the crew goons in `CREW_ZONE` fight back instead of only shoving. Online the same sim runs on the server for players. The north side stays a safe hangout. |
| Moves | **Combos, block, dodge, finisher**: a jab-cross-hook chain, a front kick and a roundhouse, an uppercut finisher at the end of a chain, hold to block, a dodge step, stamina so nothing is spammed. |
| Guns | **Fists only in the ring**: the ring holsters the gun on the way in. Outside the ring the south bank keeps guns, with a punch or a kick when unarmed. |
| Progression | **Styles and moves bought at the ring**: a trainer sells fight styles and extra moves for Dorras and a level, like the garage and the Armoury's workbench. Wins pay Dorras and XP, count for missions and badges, and go on the profile's fight record. |
| Hurt | As in the multiplayer plan: 100 health, regen after a few seconds, cartoon knock-outs (stars, no gore), respawn or stand up after 3 s. Nothing north of the river ever hurts, so health only exists inside the ring and the PvP zone. |

## How it fits together

The split is the one target practice already uses, so a server can run it:

```
fight-sim.ts   the rules, DOM-free, seeded, 60 Hz      (tested in tests/fight.test.ts)
fight-anim.ts  the clips: keyframed Poses, DOM-free     (tested: every clip returns to guard)
fight.ts       the view: feeds the local input in, draws the events (sparks, stars, camera)
fightclub.ts   the place in 3D (the ring, the gym, the trainer's counter), footprints in solids.ts
fight-ui.ts    the trainer's menu, the fight HUD, the bout card; markup in CityMap.astro, styles fight.css
```

- **`fight-sim.ts`** owns fighters (health, stamina, guard, the move in
  progress and its phase, hit stun, knockdown), moves (`MOVES`: start-up,
  active and recovery frames, reach, arc, damage, stun, knockback, stamina
  cost, what it chains into), the hit test (a capsule sweep from the
  striking hand or foot against the target's body capsule, on the sim's
  own positions, never the scene's), blocking (damage cut to a fifth,
  stamina pays), dodging (a short step with a few invulnerable frames),
  stamina (drains per move, refills while guarding or idle), knock-outs,
  bouts (rounds, the bell, the count) and the events the view and the
  server relay (`swing`, `hit`, `block`, `stagger`, `knockdown`, `getup`,
  `ko`, `bell`). It takes per-fighter inputs (`punch`, `kick`, `block`,
  `dodge`, a move direction and a facing), like `combat-sim.ts` takes
  `fire` and `aim`. Bots are a fighter with a `brain()` instead of an
  input: a seeded state machine (close in, probe, combo, block, back off)
  with a skill 0..1 that sets reaction time and how often it blocks.
- **`fight-anim.ts`** holds the animation clips as data: each move is a
  list of keyframes on the existing `Pose` (bob, lean, twist, side, head,
  the two arms' and legs' swing / spread / bend, from `character.ts`), with
  a time and an easing per key and a root motion (the step a lunge takes,
  which the sim applies as the move's reach). A clip has the same three
  phases as its move in the sim (start-up, active, recovery) so the strike
  lands on the frame the sim says it does. `sampleClip()` blends between
  keys; `blendPose()` crossfades into and out of the guard stance and over
  the walk cycle (the legs keep walking under a punch thrown on the move).
  Clips (about fourteen): guard idle (bounce, hands up), jab, cross, hook,
  uppercut, front kick, roundhouse, block (and the block hit flinch), dodge
  step, hit reactions (head, body, a heavy one that staggers), knockdown
  (on the back, `downPose` from `crew.ts` with the stars), get up, taunt
  and victory. Mirrored for the other hand or foot by swapping the limbs.
  Hands close into fists (a `fist` item on the hand sockets in `items()`,
  shown while fighting, with the style's gloves or wraps over it).
- **`fight.ts`** is the local view, like `combat.ts`: it reads the keys,
  touch buttons and gamepad, feeds `fight-sim.ts`, then draws: the pose
  from `fight-anim.ts` on the player, other players and bots (each fighter
  carries its clip, phase and blend), hit-stop (the frame freezes for about
  60 ms on a heavy hit), a camera punch and a short shake, impact bursts
  (a spark ring and cartoon stars in Degen's style, no text), sweat drops
  on a stagger, the stars circling a knocked-out head, and the sounds
  (`sound.ts`: `whoosh`, `punch`, `kick`, `block`, `ko`, `bell`, `count`;
  all through the sound switch). A soft lock-on faces the nearest fighter
  within reach when a move starts (the sim does the same turn, so the hit
  test agrees with what's drawn). Third person only while fighting: the
  camera eases out over the shoulder on the way into the ring and comes
  back on the way out.
- **`fightclub.ts`** draws the place and **`fight-ui.ts`** the screens
  (below).
- **The server** (`server/`, paused): the Room runs `fight-sim.ts` beside
  `combat-sim.ts` on its 60 Hz tick; the browser predicts its own moves
  and shows the server's verdicts (a hit the server denies is drawn as a
  block). `protocol.ts` gains the fight inputs on the `in` message (two
  more flag bits: punch, kick, block, dodge, and the facing it already
  carries), `fight` events on the snapshot, and a `bout` message for
  challenges; `PROTOCOL` is bumped. Health, knock-outs, respawns and the
  "tagged" feed are the multiplayer plan's rules, now shared by fists and
  guns in the zone. Nothing here runs until the owner resumes
  multiplayer; the offline Fight Club is the same code without the room.

## The moves

| Move | Input | Start-up / active / recovery (frames at 60 Hz) | Reach | Damage | Stamina | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Jab | punch | 6 / 3 / 8 | 1.1 | 8 | 8 | Chains into the cross |
| Cross | punch (after a jab) | 8 / 3 / 12 | 1.2 | 12 | 10 | Chains into the hook |
| Hook | punch (after a cross) | 10 / 4 / 16 | 1.0 | 16 | 12 | Chains into the uppercut |
| Uppercut | punch (after a hook) | 12 / 4 / 24 | 0.9 | 24 | 18 | The finisher: knocks down on a hit, long recovery on a miss |
| Front kick | kick | 10 / 4 / 16 | 1.5 | 14 | 14 | Pushes the target back a step |
| Roundhouse | kick (after a front kick, or from a chain) | 14 / 5 / 22 | 1.4 | 22 | 20 | Staggers; the swing arc catches a dodge to the side |
| Block | hold block | — | — | — | drains while held, pays per hit | Damage to a fifth, no stun; a block at the last 6 frames of a start-up is a **parry** (the attacker staggers) |
| Dodge | dodge + direction | 4 / 10 / 8 | a 1.2 step | — | 16 | Invulnerable through the active frames |

Chains must be input inside the previous move's recovery; a dropped chain
goes back to guard. Hit stun is a little longer than the next move's
start-up, so a chain lands if the first hit does, and a block breaks it. A
fighter at 0 stamina can only walk and block (slow regen until a quarter).
Knockdown on an uppercut, on a hit while staggered, or at 0 health
(knock-out); 3 s on the ground, invulnerable, then up with full stamina
and a quarter of the health back (a bout ends on a knock-out instead).
Numbers live in `fight-sim.ts` `MOVES` and are the first thing to tune on
real devices; the table is the starting point, not a promise.

**Styles** (`catalog.ts`): the Brawler (free: the jab, cross, hook, front
kick, block, dodge), the Kickboxer (Lv 4, 15,000: the roundhouse, kicks
hit harder) and Street (Lv 7, 30,000: the uppercut, the parry, the dodge
steps further). Moves are bought with the style, not one by one, so a
style is a complete, readable fighter. Each style has its own guard idle
and taunt, and its gloves or wraps (cosmetic, shown on the fists). The
fists' finishes (like gun skins) can come later.

## The Fight Club (the place)

On the south bank, in the PvP zone, east of the garage and the race board
(the exact lot is designed with the owner in Phase 1; the plan's junkyard
/ skate park is a separate place for later). A cartoon boxing gym in
Degen's style: a boxing ring (ropes, corner posts, a canvas with the
Emporium diamond, ring lights under a rig), bleachers on two sides, a
heavy bag and a speed bag outside the ropes, a neon FIGHT CLUB sign (fixed
copy; also the bell and a "Round 1" board over the ring), lockers, and
the trainer's counter. It's a place like the garage: footprints
(`FIGHTCLUB_SITE` in `solids.ts`), a door prompt at the counter, no pin
unless the owner wants one in the directory. Crossing the ropes holsters
the gun (`combat.toggleHolster()`), starts the fight camera and shows the
fight HUD; stepping out puts the gun back.

- **The trainer's menu** (`fight-ui.ts`, on the gun store's `.shop` panel
  like the garage and the kart hut): Spar (a sparring bot at three skill
  levels, or a bout of three rounds against a named bot from a fixed list
  of cartoon fighters), Styles (buy, pick), Record (wins, losses,
  knock-outs, longest chain, best bout time, badges). On the server the
  Spar tab also lists the players in the ring (challenge; both accept).
- **The HUD** (`data-fight-hud`): both health bars with names at the top,
  stamina under yours, the round and its clock, the chain counter ("3 hit
  chain"), the count on a knockdown. Touch buttons: Punch and Kick where
  Fire and Aim sit, Block (hold) above them, Dodge on the stick's flick or
  the Jump button; the right-hand buttons and the prompt must not overlap
  at any phone size, upright or on its side, like the combat HUD.
- **The bout card** after a bout: result, rounds, hits landed and taken,
  the longest chain, Dorras and XP, badges.

## The goons

The crew (`crew.ts`, `CREW_SPOTS`) are fighters too: in `CREW_ZONE` a goon
that reaches a player throws a jab or a front kick (the shove becomes a
real hit on the zone's health rules, cartoon, no gore), blocks about a
third of the player's moves at Brawler skill, and goes down on a knockout
as it does when shot. The north side never has health, so nothing changes
there. The goons use the same clips at crowd detail (they're `createCrowd`
instances; the pose is sampled per goon each frame as the march and
salute poses are now).

## Controls

- Keyboard and mouse (unarmed or in the ring): left click punch, right
  click kick, Shift (hold) block, Space dodge with the move keys (Space
  alone jumps as now outside the ring). With a gun out the mouse keeps
  firing and aiming; a tap of F throws a jab without holstering (the gun
  swings down in the other hand).
- Touch: Punch and Kick buttons where Fire and Aim are, Block above them
  (hold), Dodge is the Jump button while in the ring.
- Gamepad: X punch, Y kick, LB (hold) block, A dodge, B taunt.
- Fighters face their target: a soft lock-on on the nearest fighter within
  about 3 tiles, shown by a faint ring on the ground under them.

## The save and the economy

`tycoon.ts` (`cleanSave()` to v8): `fight` { style, owned styles, record
{ wins, losses, kos, bestChain, bouts }, bot bests }; `buyStyle()`,
`pickStyle()`, `finishBout()` (Dorras by bot level and rounds won, XP
`boutWin` / `boutKo` / `chain` / `boutLoss` for taking part); counters
`bouts`, `fightWins`, `kos`, `chains`; ledger entries `fighting` (in) and
`fightclub` (out). Six missions (first spar, a 3 hit chain, a block, a
knockout, win a bout, beat the top bot) and five badges (Fighter, Chain
Gang (a 4 hit chain), Iron Chin (win a round without being knocked
down), Champion (ten bout wins), Untouchable (a round with no hit
taken)). Online, the fight record also goes on the server profile and the
weekly boards.

## Tests

`tests/fight.test.ts`: every move's frames and reach; a jab lands at reach
and not past it; a chain lands when the first hit does and breaks on a
block; the parry window; the dodge's invulnerable frames; stamina drains
and refills; a knockdown and the count; a bout's rounds and its end; the
bot brain never throws from out of reach and never moves out of the ring;
every clip starts and ends on the guard pose and its active phase matches
the sim's; the goons' hits are zone-only; the save's cleaning and the
economy (styles, prizes, missions, badges). `tests/solids.test.ts` gets
the Fight Club's footprints and door.

## Phases (each with the owner's sign-off)

1. **The sim and the clips.** `fight-sim.ts` with the Brawler's moves,
   block, dodge, stamina, knockdowns, bots, bouts; `fight-anim.ts` with
   every clip; tests. A headless harness plays them on a test figure
   (`?fight` on the city page shows a sparring dummy by the Armoury's
   dummies to watch the animations before the gym exists). The owner
   checks the animations here first: this is where "proper" is decided.
2. **The Fight Club.** `fightclub.ts` (the gym, the ring, the counter),
   its footprints, the trainer's menu with Spar and the sparring bots, the
   HUD, the fight camera, the sounds and effects, the bout card, the save
   (v8), prizes and XP. Playable offline on experimental.
3. **Styles, the goons and the record.** The Kickboxer and Street styles
   and their moves (the roundhouse, uppercut, parry), the trainer's Styles
   tab, the goons fighting back in the zone, missions, badges, the profile's
   fight record, phones checked at every width.
4. **Online** (when the owner resumes multiplayer): the Room runs the sim,
   the protocol carries the inputs and events, challenges in the ring,
   zone health shared with guns, the "tagged" feed, the weekly fight boards.

## Not in scope

Grabs, throws and charged specials (the owner chose the combo set; they
can come later as a Phase 5), weapons in the ring, blood or gore (cartoon
stars and sweat only), anything typed by players (bots and the record use
fixed names and copy), and anything for real money.

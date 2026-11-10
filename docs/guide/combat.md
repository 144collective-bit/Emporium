# Target practice, the guns and the Fight Club

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

## Target practice (3D walk mode)

- Solo shooting practice. Only the player's Degen carries a gun: his
  loadout (the inventory, above), picked at the gun store counter in the Armoury (`RACK` in `solids.ts`, the
  counter itself in `armoury()`) or at Trench Arms' hatch in The Trenches
  (`ARMS.counter` in `avenue.ts`, the same store). Targets are the cardboard dummies (`DUMMIES`) and the patrol
  drones; never make pedestrians, soldiers or other characters targets.
- **Rules and view are split, ready for multiplayer.** `combat-sim.ts` owns
  the rules (ammo, fire rate, spread, hits, health, respawns, score, streaks)
  on a fixed 60 Hz tick, takes per-player inputs and emits events. It must
  stay free of DOM, scene objects and `Math.random` (seeded generator only)
  so a server can run it. `combat.ts` is the local view: it feeds the local
  player's input in and draws / plays the events; walk.ts holds it through
  `combat-lazy.ts` (the same shape, the real one a chunk fetched after the
  first frame, the gun's pivot handed to it through `CombatDeps.pivot`). New gameplay goes in the
  sim first; looks and sounds in the view.
- **The gun store** (`gunshop.ts`, markup `data-shop` in `CityMap.astro`)
  opens at the Armoury counter. Four guns, each defined once in
  `combat-sim.ts` `WEAPONS` (stats, `need` = lifetime score that unlocks it)
  and modelled in `gunshapes.ts` `SHAPES` (parts round gunfit.ts's muzzle, sight and hand spots): the
  Assault Rifle (holo red-dot, also carried by the soldiers via
  `rifleGeometry()`), Buzz SMG, Street Sweeper shotgun (pellets, iron sights)
  and Long Shot marksman rifle (scope, full-screen scope view) unlock with
  score and are free; the Hand Cannon revolver, Tri-Tap burst carbine and
  Belt Feeder are bought with Dorras (`GUN_CATALOG`), and every gun's mods
  (`GUN_MODS`: barrel, extended mag, grip and stock; `applyGunMods()`, per
  player in the sim) are bought at the Armoury's workbench. Never real
  money, never tied to the token. Keep them cartoon: no real-world gun
  names, brands or markings. A new gun needs a `WEAPONS` entry (with a `short` name for the Swap
  button), a `FIT` entry in `gunfit.ts` (its hand spots, muzzle and sight, a long gun's `butt`,
  third-person `hold` spot for the front hand, `carry`, `reload` kind and
  `kick`), a `SHAPES` entry in `gunshapes.ts` (its parts, at each level), store art (`ART` in
  `gunshop.ts`) and a shot sound (`SHOT_SOUND` in `combat.ts`); the tests
  check the hands land on it.
- In third person (the player and other players), `stance.ts` `holdGun()`
  (DOM-free, tested in `tests/gunfit.test.ts`) poses the gun's pivot (a
  child of Degen's torso frame) and puts both hands on it with
  `reachArm()` (`skeleton.ts`): the shooting hand on the pistol grip
  (every gun's origin, `GRIP`), the other on its `hold` spot, or wherever
  the reload clip sends it, both closed round it (`grip`). On top of the
  walk or run: `aim` (the spine bends a share of the way, the head takes it
  back out; a long gun's `SPINE_AIM` share is bigger),
  **shouldered** (animation Phase 8: at the ready and aiming a long gun's
  `butt` in `FIT` sits in his right shoulder's `POCKET` and the gun pivots
  there; aiming, his head comes down onto the stock, `CHEEK`, pitched and
  tilted (`Pose.headRoll`) so his eye is on the sight's line, the gun
  meeting it part of the way; `Stance.cheek` says how far, and walk.ts and
  remote.ts add the look only the rest of the way; a new long gun needs its
  `butt`), `ready` (1 after a shot, an aim or a reload for
  `READY_HOLD`; 0 is the relaxed carry: a long gun low across the body, the
  revolver hanging in one hand; sprinting relaxes it), `draw` (0 put away:
  slung on his back or the revolver on his hip (`STOWED`); the hand goes to
  it, then it swings round to his hands), recoil (the chest and the
  shooting shoulder shoved back; `Limb.reach` turns the collarbone).
  Longer guns turn Degen side-on just enough for the front hand to reach
  (the collarbone brings the shoulder forward first). Call it after the
  walk and jump poses so they don't pull the hands off; walk mode calls
  `combat.poseGun()` every frame while geared up (it returns whether the
  hands are on the gun), and `combat.ts` runs the draw, holster and swap
  (`DRAW_TIME`, the old gun away and the new one out in `SWAP_TIME`).
- Reloads are keyed clips in `gunfit.ts` (`reloadAt()`: `mag`, `shells`,
  `cylinder`, `box`), played by the third-person hold and the first-person
  hands (`viewmodel.ts`) alike; the magazine rides in the hand while it's
  `carried`, and the sounds follow `RELOAD_CUES`. Every clip starts and
  ends at rest.
- **The weapons plan** (the owner's call: gun feel and design quality) is
  `docs/weapons-plan.md`; keep it up to date, one phase at a time with the
  owner's sign-off. Phase 1 (gun feel) is built: `gunfeel.ts` (DOM-free,
  tested in `tests/gunfeel.test.ts`, read by the sim, the server and the
  view): recoil patterns by each shot's place in its string (`RECOIL`,
  `recoilAt()`, the sim's `string` and the shot's `n`; walk.ts kicks the
  view up and across and gives back `recover` of it after, less what you
  pulled back yourself), aiming over each gun's `ADS` time (the sim's
  `ads` eases the cone; the first-person hands at the same pace), moving
  and jumping opening the cone (`moveSpread()`, the input's `move` and
  `air`; the crosshair is `sim.spreadOf()`), and the shotgun loading a
  shell at a time (`SHELLS`; a pull with a shell in stops it and fires
  after the pump; `reloadAt(..., shells)` one trip a shell). New feel
  goes in gunfeel.ts and the sim first. Phase 2 (design quality, the
  owner's call: "less blocky") is built: the guns' shapes are
  `gunshapes.ts` (DOM-free, tested in `tests/gunshapes.test.ts`): side
  outlines with rounded corners extruded with a bevel (`side()`,
  `fillet()`, `inset()`, `sound()`), rounded sections (`section()`), turned
  barrels, muzzles, scope and cylinder (`turned()`), tube trigger guards,
  rounded boxes (`rbox()`), at three levels (`GunDetail`: 2 first person,
  1 in a figure's hands, 0 the soldiers' rifle, `rifleGeometry()`); guns.ts
  gives them materials and finishes (`buildGun(..., { detail })`). Draw a
  new gun's shape there, round its `FIT` spots.
- Finishes (`SKINS`) are cosmetic and work on every gun. Lifetime score,
  finish and last gun are saved in the browser under `degen-city-combat-v1`
  (or the player profile online).
- Over the shoulder is the default when walking starts (V or the
  hub's Settings swap to first person). The first-person hands
  (`viewmodel.ts`, Degen's own from `bakedHand()` in `body.ts`: the right
  closed round the pistol grip, the left under the front) wear the sleeves of Degen's outfit (`setOutfit()`, called
  from `walk.setLook()` through `combat.setOutfit()`: a suit sleeve with a
  shirt cuff, or a looser hoodie / track sleeve with a ribbed cuff and the
  track top's stripes). With empty hands the view shows his own fists
  instead (`fistsview.ts`, the fists' chunk, brawl.ts: closed hands in
  the same sleeves, up in the guard while the street fists are up, the
  jab and hook thrown with the left and the cross and uppercut with the
  right over the moves' frames, both in for the block; a kick drops them
  and bobs the view, `KICK`, not under reduced motion). They're built `K` times bigger and further out (the camera's
  near plane is 0.5 m) and drawn in the front of the depth buffer, with
  their own flat shading (city lamps would otherwise light them wrongly).
  Keep the red dot on the line of sight: scale the whole holder, never only
  its position.
- Hits are hitscan from the camera centre. Bullets stop on everything in
  `SOLIDS` except the dummies' own footprints (`SHOT_SOLIDS`), on what's
  built on your units and lots, and on the ground. When dummies move, their footprints follow
  `DUMMIES` automatically.
- Keys: click fires, right-click aims, R reloads, G holsters (with empty hands it kicks: the fists, above), X
  and 1-7 work the hotbar (the inventory, above), Q / E held peek round a corner (animation Phase 4), C crouches and
  slides when sprinting (Phase 5); F does what the
  prompt says (the owner's call: every door, counter and getting in or
  out, and F closes those menus); Shift sprints, Caps Lock (not R) toggles
  walking, the touch Sprint button locks the sprint. Where the mouse can't be captured
  (`noLock` in `walk.ts`), click fires and dragging looks. Only a real mouse
  fires from the canvas (taps send mouse events too).
- Swapping (`swap()` / `draw()` in `combat.ts`, `sim.swap()`, the `swap` message): once
  geared up, either gun in the loadout, anywhere; each gun keeps its own ammo
  (`stash`), a new one comes full, the counter refills all, and the new gun
  fires after `SWAP_TIME`. On touch the Swap button (`data-walk-swap`, gun's
  `short` name in `data-swap-name`; it steps the hotbar) sits above Fire; the desktop HUD shows the
  gun's name (`data-gun`).
- Touch: dragging the Fire button also looks (one thumb shoots and steers);
  keep its `touch-action: none` so the browser never cancels a held Fire. The
  right-hand buttons and the door prompt must not overlap at any phone size,
  upright or on its side (narrow phones get a smaller stick). With "Aim when firing" on, firing also aims (`aimNow` in
  `walk.ts`, held `AUTO_ADS_HOLD` after the trigger is let go); use `aimNow`,
  not the aim input, for anything that depends on aiming (spread, sight,
  zoom, the aim sent to the server). The combat HUD (`data-cross`, `data-hitmark`, `data-dmg`,
  `data-pops`, `data-mag`, `data-reserve`, `data-reload-hint`, `data-score`,
  `data-streak`), the finish picker (`data-skins`, `data-lifetime`) and the
  Fire / Aim / Reload / Swap buttons live in `CityMap.astro`; `combat.ts` and
  `walk.ts` expect them.
- Gun sounds go through `sfx()` in `sound.ts`, so they stay silent until the
  visitor turns sound on. Under reduced motion the drones hover in place.
- Score, streaks and finishes are for fun only: no prizes, real rewards or
  token tie-ins. Takedowns do count for the city's game (`takedown()` in
  `tycoon.ts`: XP, missions, badges), through the `onTakedown` dep.
- **Fighting** (punches and kicks, the Fight Club on the south bank, styles
  bought with Dorras, player-versus-player when the server is live) is
  planned in `docs/fight-plan.md`; build it one phase at a time with the
  owner's sign-off. Phase 1 is built: the rules are `fight-sim.ts`
  (DOM-free, seeded, 60 Hz, tested in `tests/fight.test.ts`: `MOVES` with
  start-up / active / recovery frames, reach and arc, the jab-cross-hook-
  uppercut chain and the kicks, block and the parry window, dodge, stamina,
  stagger and knockdowns, `STYLES` (the moves and styles are data in
  `fight-moves.ts`, re-exported: the screens and the save read them there,
  so the fight's rules load with the fight, not at the boot), bots via
  `think()`, spars and bouts;
  a fighter faces along (sin yaw, cos yaw); a press is kept `T.buffer`
  frames so it fires when it can, a strike from just out of reach steps in
  (`T.stepIn`), the facing turns at `T.turn` and a move's lock-on snaps at
  most `T.lockSnap`; bots are `BotTraits` (`botTraits()`: block, dodge,
  parry, telegraph (extra wind-up on heavy moves, a tell), kicks, finisher,
  backOff, pace), the gym's three in `FIGHT_BOTS.traits`); the animations are
  `fight-anim.ts` (DOM-free, tested in `tests/fight-anim.test.ts`: every
  clip is keyframed on the `Pose` rig, a move's clip is exactly its sim
  frames long with the strike on the first active frame; `sampleClip()`,
  `blendPose()`, `moveClip()`, `hurtClip()`; the hips' `turn` and `sway`
  go into every punch and kick, the reactions are keyed for a blow from the
  right and mirrored for one from the left (`hurtMirror()`, from the sim's
  `hurtBy`), the clips' head turn is over square hips (the figure takes
  the hips' turn back out); `root` { y, pitch, pivot } for
  the lying poses (the fall and the get-up pivot at the hips, `rootShift()`
  in `fight-figure.ts` moves the group so); `fists: true` on an `Outfit`
  closes the hands); `?fight` in the address
  runs the sparring demo (`fight-demo.ts`: two bots on the hangout square,
  an overlay with health, stamina, the clip each plays and a clip picker).
  Phase 2 is built, **the Fight Club**: the site is `fightsite.ts`
  (DOM-free: the lot on the south bank east of the garage, `RING` and
  `RING_HALF`, `POSTS`, `ROPES`, `SHED`, `COUNTER` and `TRAINER` (the
  "Trainer" prompt), `CORNERS`, `OUT`, `FIGHT_SPAWN`; the lawns' trees keep
  off it in `outer.ts`), drawn by `fightclub.ts` (`buildFightClub()`: the
  paved yard, the ring with the diamond canvas, posts and neon ropes (not
  solid: you step through), the open-sided shed with its rig, the counter
  kiosk, bags, lockers, bleachers and the FIGHT CLUB cut-out; `setLive()`
  brightens the lights for a fight; its footprints are `FIGHTCLUB_SITE` in
  `solids.ts`, and it's a place: spot `fightclub`, pin, directory entry
  and a City-view panel with your record and **Walk in**). `fight-types.ts`
  holds the parts' interfaces. `fight-ui.ts` (markup `data-fight`,
  `data-fight-hud`, `data-fight-count`, `data-fight-pops`,
  `data-fight-result`, the Punch / Kick / Block / Dodge touch buttons
  `data-fight-punch` / `-kick` / `-block` / `-dodge` and Quit
  `data-fight-quit` in `CityMap.astro`, styles in `fight.css`) is the
  trainer's menu (Spar, Bout, Record, Styles: the Kickboxer and Street
  styles sold there, `STYLE_CATALOG` in catalog.ts, `buyStyle()` /
  `pickStyle()` in `fightsave.ts`; the Kickboxer's kicks hit harder,
  `damageOf()` in fight-moves.ts), the HUD (health,
  stamina, round and clock, score pips, chain, the knockdown count), the
  bell text, pops and the bout card. `fight.ts` (`createFight()`) runs a
  fight: your Degen with fists against one of `FIGHT_BOTS` (`catalog.ts`:
  Rookie Ray, Knuckles, The Mayor; skill, style, purse, level) in the
  ring, a soft lock-on (forward is towards the opponent), hit-stop and a
  camera punch on heavy hits, the hit figure's white flash, impact lines
  and sparks at the contact, floating damage numbers (`.fight-dmg`), stars
  on a knockdown, health bars that chip with a pale ghost draining behind
  (`.fight-ghost`), the sounds
  (`whoosh`, `punch`, `kick`, `fightBlock`, `parry`, `thud`, `fightKo`,
  `bell`, `count` in `sound.ts`), the over-the-shoulder camera kept inside
  the ropes, and it pays through `finishFight()` (`fightsave.ts`, DOM-free: the
  fight's rules on the save, out of tycoon.ts so they load with the fight)
  + `commit()` (a spar: XP
  with a capped bonus per hit; a bout of three 90 s rounds, first to two:
  the purse on a win, XP either way, a quit is a loss; knock-outs and
  chains of three add XP). `walk.ts` wires it: the counter's prompt opens
  the menu, a fight hides Degen and feeds `fightFrame()` (W/A/S/D move
  relative to the opponent, click punch, right-click held block, G kick,
  Space dodge, the street's keys (the views plan's Phase 3); touch: the
  stick and the four buttons; gamepad: stick, X / Y, LB held, A, R3 the
  camera, Start quits), Esc or Quit ends it with the
  card, closing the card stands Degen up outside the ropes (`OUT`);
  `.city.is-fighting` hides the walk HUD and `data-fight` makes the header
  read "Fighting · <opponent>". The save (`tycoon.ts`, v13) keeps `fight`
  (style, owned styles, wins, losses, knock-outs, best chain, bouts, spars,
  each opponent's record, each sparring partner's), a win's purse under the
  daily prize cap (`FightResult.capped`, the economy's Balance bullet: the
  day's first 4 purses in full, then 35%; the bout card says so), the ledger entries
  `fighting` (in) and `fightclub` (styles, out) and the counters
  `bouts` / `fightWins` / `kos` / `chains`. New gameplay goes in the sim
  first; looks in the clips and the view.
- **Nothing in the city attacks you** (the owner's call): the rival crew
  that patrolled the south bank was retired; only its look (`crewOutfit()`
  in `crew.ts`) remains, worn by the Fight Club's opponents. Targets are
  the dummies and the drones only, and there is no player health outside
  the Fight Club's ring. Don't bring the crew back without the owner.

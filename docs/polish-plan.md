# The polish plan: the whole city, one pass

The owner's brief (2026-11): "polish the entire city... the world and its
menus, items, clothes, cars, everything." This is the audit and the plan
that came out of it. Read the code, not the game: every finding below was
checked against the source (file and line), the tests (1,173 pass in about
164 s), the typecheck (clean) and the budgets (`npm run budget`: the boot
715.5 of 730 KB gzipped, the clips file 558 of 660 KB). Nothing here was
seen on a screen; the shots pass (`npm run shots`) before and after each
phase is where the eyes come in.

As every plan in `docs/`: one phase at a time, each with the owner's
sign-off; keep it up to date. Nothing in it brings back a retired thing,
moves anything that exists (the snapshot holds), or spends real money.

## The state of the city, in one paragraph

Sector 7 is big (about 128,000 lines in `src/scripts/city3d`, 354
modules, 41 places with pins, 15 districts, every rules file DOM-free and
tested) and structurally sound: the palette test holds one ground
palette, the seam map ranks every edge, the lamps mix at the sodium
seams, every mission's counter is incremented somewhere, every catalog
entry has a card, dead CSS is near zero, and the car, the character and
the animation are the deepest work in the repo. What a player meets is
not bugs but **unevenness**: the newest half of the city has no sound of
its own, 20 of the 41 places open a panel that says "coming soon", the
same hotel sign stands twice on one block, every crowd in every district
wears the same two outfits, the traffic drives through your parked car,
and a kart race pays thirty times what the shops do. The polish is in
making the whole city feel as finished as its best parts.

## What's rough, by theme

Ranked by what a player notices first. Each item says where it is, why it
matters, the fix, its size (S a few hours, M a day or two, L more) and
whether it needs the owner's call.

### 1. Balance: the business half of the game is irrelevant within an hour

Computed from the constants (catalog.ts, tycoon.ts, kart-cups.ts,
fightsave.ts), not guessed:

| Loop (from level 1) | Dorras an hour | XP an hour |
|---|---|---|
| Your stall, standing at it, best goods | about 3,300 (1,100 with the starting 600) | 100-200 |
| Contracts, three at once, driving | about 1,400-2,800 | up to 480 |
| Kart park, Rookie single race, winning | about 35,000 (10,000 mid-pack) | about 7,500 |
| Fight Club, Knuckles (level 1), Mayor (level 3) | 25,000-45,000; about 90,000 at level 3 | 200 a win |
| Neon Cup (level 9) | about 300,000 | |

The XP curve is level 5 at 1,358, level 10 at 5,612, level 20 at 20,749.
Five won kart races reach level 5 in about twelve minutes; sales alone
take seven to fourteen hours. A first corner shop (20,000) is forty
minutes of karting or ten hours of stall-keeping. The guide, the Signal
tower, the Post office, the Apartments and the Vault's loans are the
game's teaching spine, and none of it matters once the player finds the
kart park or the ring. Neither race nor bout has a cooldown; the daily
challenge (2,500 once a day) is the only repeatable reward with the right
shape. · **Fix** (the owner's call on which way): cut the repeatable
prizes (Rookie 500/300/200, a single race at half a cup race's, bouts a
third), or a daily soft cap (the first N races and bouts a day pay in
full, then a fraction), and raise the business side (XP a sale 1 to 2-3,
a contract's 40 to 80, a sold-out bonus a shelf). Existing saves keep
their Dorras. · M · needs the owner.

### 2. Dead ends: twenty places say "coming soon"

`CityMap.astro:1108-1295`: The Block and Lot 9 ("Story coming soon"),
Club PULSE, the Rusty Nail, the stadium, Crestmont's hotel, civic hall and
golf club, the Harbour Master, Sunridge's club and school, the seven
resorts and the Sphere. Two of them have doors that prompt "Enter ..." and
open the empty panel (walk.ts:130, :3322). The stadium's big screen reads
EVENTS COMING SOON in 3D (stadium3d.ts:120) and its masts light an empty
pitch every night (:260-261). Meanwhile the shows that do run on the
clock (the fountain show every three minutes, the volcano, the Sphere's
slides, the tall ship and the bridges) are announced nowhere: no panel,
the hub or the map reads `showAt()` or `eruptionAt()`. · **Fix, cheap
and no new game**: a live line in each panel from the clock ("Next show
in 1:40", "Ships in: ORCA STAR at berth 1", "Doors at ten · guest list
only", "Next event: ..." on a fixture board painted on the stadium's
screen, the masts dimmed except on a fixed "match night"), the club's
door swelling its beat (ambience `club` exists) with a bouncer's toast
instead of a panel, the bar selling the snack (`SNACK_BARS`,
inventory.ts:250: diners and market stalls today), a door prompt for
Crestmont's hotel, civic hall and golf club (their doors are in the data,
crestsites.ts:50, but not in `ALL_DOORS`, walk.ts:130). · S each ·
copy is the owner's.

The bigger next steps the plans already list, for the owner's queue: the
Night Market's stalls run like the corner shops (the corner-shop rules
carry it whole: `Corner` places, couriers, clerks, levels), the Sky Wheel
ridden (the rides framework and `capsuleAt()` exist; wheel.ts:4 "nobody
rides it"), the Docks' Phase 4 (nothing in the port moves: docksport3d.ts
draws sites only, the clock tower stopped at ten past ten, :153), the
Circle Theatre, the Exchange and The Aurelian as places (pins and a
one-line panel each), Kestrel Bridge as a place (a named swinging bridge
with no pin or map entry), the Wharf, the Refinery and Harbor Stores with
a lobby prompt. · M each · the owner's picks.

### 3. Sound stops at the old town's edge

`ambienceAt()` derives the town's hum from `CITY_EXT` (ambience.ts:100-104)
and the avenues' rush only inside the highway (:109-112). Sampled: Uptown
Circle gives road 0.5 and open 1.0 with no hum at all; the spire's spawn
city 0.09; Starlight Mall's hall open 0.84; the Docks, the airport, the
kart park's gate and the stadium's forecourt open 1.0 and nothing else. So
a player stands in a glass atrium under a skyscraper hearing wind over
grass. The test only caps Uptown's hum (tests/ambience.test.ts:67-68), so
zero passes. There is no layer for the waterfront and the Night Market
(gulls, a foghorn, the market's hum and sizzle: waterfront plan item 4),
the Docks (gulls, a crane's hoist, a horn: docks plan Phase 4), the
airport (the jets on the timetable; `aero()` voices only your own
aircraft, sound.ts:964), the mall (an indoor hum) or Southfield Yards (a
compressor, a reversing beep). · **Fix**: the hum from the built-up
rects, not `CITY_EXT`; new layers `waterfront`, `docks`, `jets`, `indoor`,
`yards` in the DOM-free file with a test row each (a band, not a
ceiling), mixed in sound.ts. · M · low risk (sound is opt-in).

### 4. Sameness: the same thing twice, side by side

- **Two HOTEL NOVAs next door** on the Emporium's own block, four
  downtown, both diners STARLITE DINER: `downtown.ts:356` gives every
  hotel and diner the one sign (`SIGNS` has one hotel name, :167).
  **Fix**: `HOTEL_SIGNS` / `DINER_SIGNS` rotations as `SHOP_SIGNS` (:183),
  two or three made-up names each. · S.
- **The Trenches' tenements**: 65 shopfronts share 10 names assigned in a
  fixed order (`streetwall.ts:49, 164`), so every block repeats the last
  block's sequence. **Fix**: six to eight more names, a seeded pick. · S.
- **Uptown's shops**: 12 names a character for about 90 dining, 69 local
  and 32 luxe units; each dining and local name stands six to eight times,
  the luxe pick a fixed stride (highrise3d.ts:1047). **Fix**: 24 names a
  character (the sign atlas has 32 cells). · S.
- **One crowd everywhere**: `cityOutfit()` (character.ts:691-724) gives
  everyone a suit (55%, three of its seven top colours black) or a hoodie,
  caps only, the default green lenses (wardrobe.ts:53); life.ts:1152 uses
  it for every district: suited joggers in Westlake, suited kids on The
  Block, suited cooks at the Night Market. The wardrobe's track, varsity,
  puffer, beanies, buckets and headphones are never on a crowd person
  (only the kart rivals wear track). **Fix**: an outfit picker by role and
  district (track for joggers and kids, hoodies and beanies in The
  Trenches, lighter suits in Uptown and Crestmont, a lens palette), seeded
  from the person so no two neighbours match; each new kind is one more
  instanced-mesh set a detail level, so phones take at most one. · M ·
  medium risk (draws: measure with `?fps`).
- **One engine voice** for the car, the bike, the kart and the boat
  (sound.ts:888; only the Glow Pod's `whine` differs); `gearOf()`'s four
  gears make a scooter shift like a saloon. **Fix**: a `voice` per vehicle
  kind and car class (a few oscillator and filter presets). · S-M.
- **One lamp post** in every district (two tones, white and sodium): the
  Strip's sidewalks under its neon resorts and Beverly-Hills Crestmont
  carry downtown's municipal post. **Fix** (judgment): a `LampStyle` per
  district. · M · the owner's call.
- **Top speeds cluster**: 72 to 104 km/h across eleven cars, three at
  77-80, the supercar 3 km/h over the coupe (`tune()`, drive-sim.ts:85);
  the feel numbers are distinct, the straights aren't. **Fix**: widen the
  range, split the pickup and the off-roader (both `speed: 0.6`); re-check
  protocol.ts's `SPEEDS`. · S.

### 5. Traffic holes, close to the camera

- **Traffic drives through your parked car, bike or kart.** life.ts
  slows only for `walker` (your own position: index.ts:1514-1518) and
  `stoppers`, which only the taxi pushes to (taxi.ts:111); drive.ts's
  `parkedCircles()` (:184) serves walking only. Park at the kerb, get
  out, and the next car passes through the bonnet. **Fix**: drive.ts
  pushes a `stoppers` entry per parked vehicle; cap the wait so a car
  left mid-junction is respawned by the pool rather than stalling a lane.
  · S · low.
- **Left turns aren't checked against oncoming cars**: a junction is
  `occupied` by phase (life.ts:695) and a car waits only for another
  phase (:722), so a left-turner and the oncoming straight car on the
  same phase pass through each other in the box. **Fix**: record the arm
  (or `turnOf()`'s kind) with the phase and hold the left-turner. · M ·
  medium (queueing at busy junctions: the routes test and the bench's
  traffic view guard it).
- **Buses are empty**: carfine.ts:83 skips side-window passengers for
  buses; nobody waits at the shelters. **Fix**: flat heads behind the
  glass (the `through()` trick), an idle at a shelter now and then. · S.
- **The taxi says "Here you are" at a cul-de-sac's nearest street**
  (`project()`, routes.ts:764-781; taxi.ts:313) when the place is a walk
  away (Crestmont's Overlook). **Fix**: past about 15 tiles, "as close as
  the road goes" and a waypoint. · S.

### 6. The other vehicles haven't caught up with the car

- **No brake lights or indicators on the bike and the kart**: drive.ts
  computes `carLights()` every frame (:579) but only `takeCar()` wires a
  `lights` hook (:272). · S-M.
- **A "door" sound on getting on a bike or into a kart** (drive.ts:430,
  :452). · S.
- **The street kart drives on the saloon's `NEUTRAL` feel**
  (drive.ts:180). **Fix**: a `KART_FEEL` (light, quick rack, loose tail).
  · S.
- **The cockpit view has no cockpit**: fly.ts:62 puts the camera ahead
  of the nose; the aircraft draw glazing only, no seat, panel or Degen.
  Against the car's full interior it's the weakest first person. **Fix**:
  a small in-canopy interior for your own three aircraft in the vehicle
  chunk, the camera at the pilot's eye. · M · the owner's call on chunk
  size.
- **Bump shakes ignore reduced motion**: drive.ts:576, :654-657 and the
  speed FOV (:663); kart.ts:364 gates its own. · S.
- The painted mirrors, other players' getting in not shown, and the
  rides' empty seat (you vanish on the taxi, the metro, the river bus and
  the monorail; the "rides seen" seated figure is the animation revamp's
  held-back Phase 4) are documented and the owner's to schedule.

### 7. Menus: one kit, several habits

- **The first screen is a log-in that can't log in**: the form's submit
  is the coin-yellow main button (`CityMap.astro:121-133`) and only
  prints "Accounts are coming soon..." (:706, :712); Play as guest is the
  plain button. Play is two screens and two taps away. **Fix**: Play as
  guest the main button and the form a quiet "Log in · coming soon", or
  the form hidden until accounts exist. · S · the owner's call.
- **Destructive actions with no confirm**: Give up a mission
  (missions-ui.ts:86), Give up a contract (tycoon-ui.ts:700), Drop a
  series (kart-ui.ts:693), Quit in the race HUD (:992) and the fight HUD
  (fight-ui.ts:545; "counts as a loss" is said only on the menu tab).
  Every purchase confirms; these don't. **Fix**: the shops' second-tap
  confirm; the HUD Quits a two-press ("Press again to quit"). · S-M.
- **Five confirm patterns, seven close-button classes, four tab
  patterns** across the menus that keep their own markup under
  `.mk-skin`; the garage's tabs and the business card's take no Q / E.
  **Fix**: one `confirm()` in menukit.ts, one `.mk-x` glyph, `stepTab()`
  in the garage and the business card. · M · CSS only.
- **Copy over the agreed lengths** (labels 1-3 words, hints about six,
  lines about eight): the start-menu messages, the fresh-save and
  step-done toasts (tycoon-ui.ts:1211-1219, missions-ui.ts:279-299),
  `awayNote()` (tycoon-ui.ts:1190-1204: three clauses and two sentences
  in one 7 s toast), the profile note (profile-ui.ts:56); "Lv 1" / "Level
  1" / "LV 3" drift between the header, the karts and the fight heads. ·
  S · toasts are a judgment call (Q4).
- **The bottom-left key hints are hand-written** (CityMap.astro:869-884)
  and drift from keymap.ts (the drive hint omits H and V, the fly hint V);
  on desktop they show with the control card. **Fix**: paint them from
  `cardBinds()`, or drop them for the card. · S.
- **The hub's Missions tab is a dead end** (the badges and a line
  pointing at the Signal tower, no button) and its Bag tab a note and a
  button to Business; `data-hub-go` in hub.ts:115-119 is handled and
  used nowhere. · S.
- **Phones**: seven hub tabs in a `nowrap` strip that scrolls with no
  fade (menus.css:886-901); small targets (`.mt-hide` 20 px, `.ctrl-card-x`
  26, `.city-card-close` 30; the kit's × is 38); "Tab" key badges shown on
  touch (`.hub-key` has no `data-input` rule); the map's subtitle says
  "Tap" on every device. · S.
- **First-run pile-up**: after the fly-in a desktop shows the welcome
  card, the guide card, the fresh-save toast and the draft tag at once;
  the first walk adds the control card, the key hint and the tracker.
  Three draft notes can be on screen together (:1004, :1328, :177).
  **Fix**: stagger them; one draft note. · S-M.
- **Kit leftovers**: the wallet card wears PulseChain colours
  (city.css:858-870, account-ui.ts:65; workers.dev only), inventory.css
  hardcodes a colour (:41, :314); `role="dialog"` without `aria-modal` on
  the hub, the panel and the inventory; city.css's keyframes (`spin`,
  :903) have no reduced-motion rule. · S.

### 8. Small bugs, each an hour

- **Corner shops don't redraw on their own**: tycoon-ui.ts:1184's `shown`
  string omits `save.corners`, so buying, stocking or selling out a corner
  shop changes nothing on screen until the stall ticks. · S.
- **"Dorras taken" misses fight purses** (fightsave.ts:77-80 books
  `fighting` without `count(s, 'earned', ...)`), delivery bonuses
  (tycoon.ts:1017-1020) and mission rewards: a fighter banks 250,000 and
  never sees Magnate. · S.
- **The Vault's worth misses the bikes' mods** (`gearValue()`,
  tycoon.ts:1423-1440, loops the karts and `PLAYER_CARS`, never the bikes' ids) and the
  fight styles. · S.
- **A billboard says EIGHT STATIONS** (fringes.ts:71); the metro has nine
  since Crestmont. The plan's own rule for boards is no number: drop it. ·
  S.
- **The varsity's first-person sleeves are the top's colour**
  (viewmodel.ts:111, :115 `shared(top)`) where the real sleeves are cream
  (wardrobe.ts:2738). · S.
- **The motion capture credits drift**: CREDITS.md lists subjects 143,
  127, 9, 69, 136 and 141 and says standing is 143's; the file now uses
  137's idles, 132's fast walk and 122's climb (takes.json). It's the one
  licence note the site relies on. · S.
- **A `guns` live switch that doesn't stop guns**: it gates the counters
  only; a carried gun fires anywhere (`combat.draw()`). Rename it "Gun
  stores" or gate the draw. And nothing can pause the prizes or the
  economy from outside if a balance exploit is found live. · S-M.
- **Mission "Heavy hands" has id `street-fighter`** while the badge
  "Street Fighter" is `partners-all` (missions.ts:43, :158); `chains` and
  `built` are counted and watched by nothing; "Landlord: buy 2 units or
  lots" counts corner shops too. · S.
- **The Phone's pitch "Always checking the charts"** (catalog.ts:336) reads
  as trading talk against the no-financial-talk rule. · S.
- **The README** says the tests run "in a second or so" (164 s), gives
  the hand-upload steps Hostinger no longer needs, and calls the game "the
  builder as a play-money demo" (Build mode is retired). · S.
- `TycoonSave.stats` (tycoon.ts:452) is kept and cleaned but read by
  nothing. · S.

### 9. The character: the previews aren't him, the props don't move

- **The fitting room, the character screen and the hologram idle on the
  old formula poses** (stage.ts:14, :155-158; emporium.ts:598-610) while
  the city's Degen idles on subject 137's captured weight shifts. The
  first long look a player gets at their Degen is the stiff idle the plan
  retired. **Fix**: the captured idle and walk rows into the stage (the
  crowd pack holds them resampled; `captureRow()` can fill a `Pose`
  sampler), the formula until the pack is in. · M.
- **Held things are props**: coffee, phone, boombox and briefcase hang on
  the hand bone (wardrobe.ts:2713-2790); the crowd reads its phone
  (`PHONE` in pedestrians.ts) but the player holding the 1,000-Dorra
  Phone never does, nobody sips, the boombox hangs at the hip. **Fix**:
  the `PHONE` reach as the player's idle overlay, a sip as a moment every
  twenty seconds or so, the boombox on the shoulder. · S-M.
- **First person with fists shows nothing** (viewmodel.ts:318 draws the
  hands only with a gun out). **Fix**: a fists view model from
  `bakedHand()` for the guard and the punches. · M.
- **Four emotes** (wave, dance, salute, cheer) is thin for a hangout
  game; each new keyed upper-body emote (point, shrug, clap, thumbs up)
  is a day on the `Pose` rig with the machinery in place. · M · the owner
  picks.
- **The mocap budget is nearly spent**: 558 of 660 KB, 41 takes; every
  data step the plans want (a dance, a brisk walk, a stroll, sitting
  down, stairs down) costs 10-25 KB. **Fix first**: move the rarely
  searched takes (jumps-only, crouch, strafe, the climb) into packs
  fetched on first use (`loadMocap(pack)` supports it); drop `run-long-2`
  (09_01), the one run the rubric holds back, for about 20 KB. · S-M.
- The inventory grid is 2 of 16 full for a new player and 10 at most; the
  one consumable works only in a spar (fight.ts:464, inventory-ui.ts:164).
  Two or three consumables with uses outside the ring (a drink from the
  bar, a kart boost, a free taxi), or a 2 x 4 grid until then. · M · the
  owner's call.

### 10. Things the world could use that aren't bugs

- **Sixteen empty district pads round the ring**, the first thing seen
  across the avenue from downtown: a framed green square with a paved
  walk to it, sixteen times (outer.ts:172-175, world.ts:1078-1082). Build
  mode is retired; they could be dressed as what they now are, open land
  (a lawn with the rim gone, a small garden, a court, a playground, a
  kiosk square from outerdress's own beds and benches), the pads' numbers
  untouched so prices hold if they return. · M · the owner's call.
- **The riverside's service yards are bare** (riverside.ts:52-53 reserves
  them; nothing draws into them): dumpsters, a van, a loading dock, a
  rear lamp from the grit's and the street walls' props. · S-M.
- **The Kart Park station is a 138-tile walk over open land** to the gate
  (metro.ts `STATIONS` vs kartpark.ts `GATE`; the kart-west plan knows).
  A paved walk with lamps, its land in `KEEPS`. · S-M.
- **The world map draws Uptown's towers but not the Strip's resorts,
  Sunridge's houses, Crestmont's estates, the stadium's bowl or Lot 9's
  fence** (worldmap.ts): those districts read as blank slabs. The
  footprints are DOM-free data already. · S.
- **Starlight Mall ignores the phone tier**: `register()` takes no `low`
  (mall3d.ts:784, mallinside3d.ts:526) where every other district has
  4-56 `low` branches; no `?bench` view covers the mall or Sunridge. · S-M.
- **The kerb switches colour on a line at The Trenches' edge**
  (world.ts:1023-1032): the town's purple faces the grit's grey across
  one street; the blend plan names it. Whether the hard line is part of
  the grit is the owner's. · M.
- The plans' own open phases, for the queue: blend Phases 6-10 (the seam
  report's top three today are the airport, Crestmont and the kart park
  against open land), highway Phases 6-9, Docks Phase 4, mall step 3,
  Crestmont Phase 10, Sunridge's bench views, waterfront items 1-7, Lot
  9's office and laundry interiors, Southfield's `FUTURE_SITES`.

### 11. Engineering health

Measured on this branch: the boot 715.5 of 730 KB gzipped (2% of
headroom; CLAUDE.md and budget.mjs's notes still narrate 720 and 706.8),
three.js 152.5 KB of it, the city's entry 242.0, the baked data inlined
as a JS string 40.6 KB gzipped (the routes 31.1 of that), the gun code
about 51 KB minified reachable only once a gun is drawn, and eighteen
`*3d.ts` drawing modules built at the boot about 147 KB minified (The
Trenches' and the waterfront's: kartpark3d, avenue3d, waterfront3d,
commons3d, metro3d, projects3d, kits3d, riverside3d, nightmarket3d,
streets3d, streetwall3d, harbour3d, stadium3d, grit3d...). The tests
take 164 s, routes.test 15.9 s and docks.test 7.9 s of it, with no
per-file timings in the output. 354 modules, 14 small DOM-free ones
without a test; 840 non-null assertions, no linter; `box()` is declared
in 26 files, `V()` in 17, `smooth()` in 16, `STONE` with 15 different
hexes in 22 files; 29 exports used nowhere (wallet.ts's `forgetWallet`,
`knownAccount`, `balanceOf`, `onWalletChange`, the `*_NAME` constants).

- **The boot's headroom** (14.5 KB; each district adds 2-8 KB). Three
  moves that change no behaviour: the routes fetched as a JSON asset
  instead of a string in the JS (S); tycoon-ui mounted on the first card
  or panel, the Dorras readout kept (M); target practice as a chunk
  behind a thin facade (walk.ts calls it synchronously in 67 places; M).
  Bigger: The Trenches' drawing as a `LAZY_DISTRICTS` entry (its land is
  far from the home view; the fly-in to its places wants `wantView()`
  first; M, medium risk of pop-in). · the owner's call on timing (Q4).
- **Ticks that never check distance**: the Armoury's flags rewrite and
  upload their vertices every frame (armoury.ts:551), a landmark's
  particles too (landmarks.ts:350), the Emporium redraws its LED wall
  canvas and re-uploads 8 times a second (emporium.ts:512) and poses the
  hologram every frame (:603); airport.ts:205/:422, resorts3d.ts:1349,
  stripmarks3d.ts:519, libertybridge.ts:732 and metro3d.ts:496 run
  wherever you stand, where the park's, Crestmont's, Sunridge's and Lot
  9's gate on the eye within 200. **Fix**: a shared `near(rect, reach)`
  on `Tick`, the clock-driven ones left running. · S.
- **No WebGL context-loss handling** (`webglcontextlost` appears nowhere
  in src): a phone out of GPU memory goes black with no message. **Fix**:
  a listener that stops the loop and the sound and shows the no-3D card's
  text with Reload. · S.
- **Lazy chunks that fail to fetch are unhandled**: walk.ts has 20
  dynamic imports and 5 catches; offline or across a deploy (hashed
  names, the service worker holds only what it cached) a door prompt does
  nothing. The mocap, textures and the site worker degrade well. **Fix**:
  one helper round `lazyMenu()` and the rest that toasts and retries. · S.
- **What gates the live site**: the Action runs typecheck, tests, build,
  the texture bake (continue-on-error) and the budget, but produces a
  zip; degenemporium.com deploys from Hostinger's GitHub link, whose
  steps aren't in the repo; the Worker's build runs `npm run build` only,
  so workers.dev always paints its textures in the browser; a failed bake
  warns and passes. **Fix**: a red budget row when a CI build has no
  texture sets, the bake and the budget in the Worker's build, and the
  owner confirms what Hostinger runs (Q1). · S.
- **walk.ts is six modules in one** (3,647 lines, `update()` 640 of
  them, no test covers it). Seams by line range: settings and touch prefs
  450-536; moments and marks 572-723; ground and collisions (`groundAt`,
  `blocked`, `cameraRoom`, `rayWorld`) 724-880; the control card
  973-1023; touch 1024-1204; the kart park and Fight Club wiring
  1205-1394; vehicles in and out 1395-1549; input (keys, pointer lock,
  the joystick, the pad) 1550-2408; the per-mode frames 2409-2684.
  **Fix**, lowest coupling first: `walk-ground.ts` (pure functions over
  the grids, testable), `walk-input.ts` (an `Input` struct),
  `walk-vehicles.ts`, then the wiring. · L · medium.
- **The tests**: per-file timings in the reporter, `cityPlan()` and the
  routes cached across routes.test's cases, motionmatch.test's 2 ms
  wall-clock assertion (:64-70) made a ratio or skipped in CI. · S.
- **A linter and the drift**: a minimal eslint (unused exports,
  non-null assertions as warnings), one `shapes3d.ts` for `box`, `cyl`
  and `V`, the materials' hexes into palette.ts as the ground's already
  are. · M.
- **Bench and shots gaps**: no `?bench` view for the mall, Sunridge,
  Southfield, Lot 9's tunnel, the river's life, the swing bridge or the
  two bridges. · S.
- **The tier picker sends touch laptops and tablets to the phone tier**
  (index.ts:144-147: coarse pointer or a short side under 700). A big
  tablet gets 16 cars and no shadows. `coarse && small` low, `coarse &&
  big` medium is the cheap refinement. · S · the owner's call (Q3).
- Small and known: 41 pins get style writes every frame even hidden
  (index.ts:1601-1615); every traffic light `setColorAt` every frame
  (life.ts:687-691). The performance plan's own 150 MB phone target
  (210 MB measured) with "far districts let go on phones" and impostors
  as the way back is scheduled nowhere.

## The owner's answers (2026-11-05)

Asked after the audit, each with a recommendation; the picks:

- **Balance:** both, a daily soft cap on the race prizes and purses
  (the first few a day pay in full, then a fraction) and the business
  side raised (Dorras and XP). Existing saves keep their Dorras.
- **Dead ends:** all the cheap live lines: every "coming soon" panel
  carries a true line from the clock, the stadium's screen a fixture
  board and its masts dimmed but for a fixed "match night", the club's
  beat swelling at its door with a bouncer's toast, the bar selling the
  snack, Crestmont's hotel, civic hall and golf club with door prompts.
- **The first screen:** Play as guest the main button, the log-in a quiet
  dimmed "Log in · coming soon" line until accounts exist.
- **The crowd:** varied by district and role (track for joggers and kids,
  hoodies and beanies in The Trenches, lighter suits in Uptown and
  Crestmont, a lens palette), seeded so neighbours never match; phones
  at most one extra crowd kind, measured.
- **Confirms:** Give up, Drop and the HUD Quits ask once (the shops'
  second tap; the HUDs a two-press).
- **Vehicles:** engine voices per kind. The speed range and the aircraft
  cockpits stay as they are (not picked).
- **Traffic:** parked vehicles are stoppers; the traffic queues and
  toots, a car left mid-junction respawned after a capped wait.
- **The bigger scenery-to-life steps** (the Night Market's stalls, the
  Sky Wheel ride, the Docks' Phase 4, a stadium match night): no
  preference; each is proposed one at a time for its own sign-off,
  the Night Market's stalls first (the corner-shop rules carry it).
- **The sixteen pads:** reserved for buildings later. They stay framed
  as they are; nothing in this plan touches them.
- **Menus:** one draft note (the corner tag), toasts under the
  short-copy rule, a Mission board button on the hub's Missions tab and
  the grid on its Bag tab, the bottom-left key hints dropped (the
  control card is enough).
- **Engineering's room-making** (the routes as a fetched JSON asset, the
  business screens mounted on first open, target practice as a chunk,
  the landmark ticks gated): early, before the crowd and character work.
- **Hosting:** not sure what Hostinger runs on a push; the plan adds a
  check (below), not a change to the build.
- **Character:** the captured idle and walk on the stage and the
  hologram, held things with behaviour, fists in first person. More
  emotes not picked. The rides' empty seat stays as it is (the revamp's
  own Phase 4).
- **Motion capture data:** the rarely used takes to on-demand packs
  first, then sitting down and standing up as the first new take.
- **The tier picker:** big touch screens get the medium tier; phones
  unchanged.
- **New places:** none; Kestrel Bridge, Uptown's three landmarks and the
  riverside's three stay backdrop.
- **Variety:** more hotel, diner, tenement and Uptown shop names, a lamp
  post per district, the kerb blended at The Trenches' edge.
- **The smaller economy bits:** no preference; the two recommended go in
  ("Dorras taken" counting purses, bonuses and rewards; a live `prizes`
  switch and the `guns` switch renamed "Gun stores"); more consumables
  and missions past level 12 wait.
- **The Phone's pitch:** reworded.

## The plan

Ten phases, smallest and surest first, in the order the owner's
answers set: the room-making before the heavy work, the pads untouched,
no new places. Each phase is shot before and after
(`npm run shots -- polish-<n>`), checked at 320, 375, 768, 1024 and
1440 wide, on the phone tier, by day and at night, and keeps the tests,
the typecheck and the budgets green; none moves anything that exists.

1. **The hour-long fixes** (theme 8 and the stale copy): the corner
   shops' redraw, "Dorras taken" counting purses, bonuses and rewards,
   the Vault's worth with the bikes and styles, the billboard's number,
   the varsity sleeves, the credits regenerated from takes.json, the
   `guns` switch renamed and a `prizes` switch added, the mission and
   badge names, the Phone's pitch, the README, `stats` removed, the
   bike's and kart's door sound, the bump shakes under reduced motion,
   the mall's `low` branches, the tier picker's refinement. A day; tests
   extended where a rule changed. Built (the mission Heavy hands is
   `heavy-hands`, its old id mapped; a Combo artist mission on `chains`;
   `stats` removed), waiting on the owner's sign-off and the shots.
2. **Names** (theme 4's signs): hotel and diner names downtown, the
   tenements' names and a seeded pick, Uptown's 24 names a character; the
   sign atlases rebake. A day. **Built** (2026-11-05): `HOTEL_SIGNS` (four)
   and `DINER_SIGNS` (three) taken in turn as downtown is laid, each
   building's own sign drawn (infill.ts, the atlas's blades in rows of 14
   so the list can grow); nine more tenement names in `TRENCH_SIGNS` and
   `signAt()` (a hash of the plot, stepped past any name within
   `NAME_CLEAR`, 8 tiles); Uptown's `SHOP_NAMES` 24 a character and
   `nameAlong()` (a wall's own start and stride, so no two units on a
   side match; the flatiron's too). The tests hold every list distinct and
   no two neighbours alike; the snapshot's four changed sign fields are
   the only change to it. Shots wait for a build.
3. **The menus' habits** (theme 7, as answered): Play as guest the main
   button and the log-in quiet; one confirm helper and Give up, Drop and
   the HUD Quits behind it; one × glyph; Q / E in the garage and the
   business card; the key hints dropped; the hub's Mission board button
   and Bag grid; the toasts cut to length; one draft note; the small
   targets and touch badges; `aria-modal`; city.css's reduced-motion
   rule; the wallet card and the inventory's colour into the kit; the
   first-run messages staggered. Two or three days. **Built** (2026-11-08):
   the start screen is Play as guest (coin yellow) over "Log in · coming
   soon", the form's fields waiting behind `hidden`; menukit.ts gets
   `confirmHtml()` (for the boards, which tick and repaint from state),
   `confirm()` (for menus that keep their markup), Esc as its No and the
   arrows between its buttons, and Give up (a mission, a contract) and Drop
   (a series) ask once through it; the race's and the fight's Quit are a
   two-press (walk.ts `twoPress()`: the button, Esc and Start arm it, it
   reads "Press again" for 2.5 s); one `<symbol id="mk-x">` drawn by every
   close button (`.mk-xi`), each at least 38px (the compass's and the
   tracker's 32); Q / E step the garage's tabs and the business card's (LB /
   RB stay the hub's inside it); the six key hints and their styles went;
   the hub's Missions tab has Mission board (`data-dir-spot="signal"`), its
   Bag tab the read-only grid (inventory-ui.ts's chunk on first show), its
   strip fades on phones; toasts and notes on one line; the panels' draft
   line went; `aria-modal` on the hub, panel and inventory with Tab kept
   inside (menukit.ts); the wallet card in the skin; reduced-motion rules in
   city.css, economy.css and guide.css; the fresh save's toast waits for the
   welcome card (or 20 s) and the control card for a toast to go; the
   toasts and the draft tag in `chrome`; `hudBoxes()` in touchlayout.ts puts
   the tracker, the compass (top centre on a short screen), the readouts
   and the race's and ring's HUD bands (ending clear of the arc on a short
   screen, either hand) in `clash()`, tested. Waiting on the owner's
   sign-off and the shots.
4. **Room and resilience** (theme 11's early half, the owner's call): the
   routes as a fetched JSON asset, tycoon-ui mounted on first open with
   the Dorras readout kept, target practice behind a thin facade as a
   chunk, the landmark ticks gated on distance, the context-loss and
   failed-chunk handlers, the test reporter's per-file timings and the
   routes fixture cached, the budget and the bake in the Worker's build
   with a red row when a CI build has no texture sets, and the Hostinger
   check: the owner opens Hostinger's GitHub deploy settings and notes
   the build command there; if it is a plain build, the Action's checks
   are added to it. Three or four days.
5. **Sound across the city** (theme 3): the hum from the built-up land,
   the `waterfront`, `docks`, `jets`, `indoor` and `yards` layers, the
   ambience test turned into bands, the engine voices per vehicle kind.
   Two days. **Built** (2026-11-08): the hum is the loudest of every
   built-up part's (`HUMS` in ambience.ts: the town, The Trenches, Uptown
   and Uptown North hushed, the mall, the Neon Mile, the Docks, the
   airport, the kart park, the stadium, Southfield Yards, each eased out
   past its land), so Uptown Circle, the spire, the mall's hall, the
   Docks, the airport, the kart gate and the stadium no longer read as
   open country; new layers `waterfront` (the boardwalk, Pier 7, the
   market's deck and the town's promenades: gulls by day, a foghorn now
   and then; the market's murmur after dusk `market`), `docks` (gulls, a
   crane's hoist whine, a ship's horn), `jets` (`jetsAt()`: an airliner's
   roar as one takes off or lands, from the airport's timetable and the
   clock, `ambienceAt(x, z, lift, t)`), `indoor` (inside the mall's hall,
   the outdoor layers damped by it in sound.ts), `yards` (a compressor, a
   reversing beep) and `karts` (engines idling, a tannoy); each graph in
   sound.ts made the first time it's heard. The ambience test samples the
   audit's spots in bands. Engine voices (`Voice` in vehicleids.ts,
   `engine(revs, voice)`): `VOICE` in mycar.ts for every car model (the
   hatch small, the saloons plain, the supercar higher, the muscle car and
   the classic a V8's lump, the Glow Pod its whine), `BIKE_VOICE` in
   mybike.ts (the scooter a two-stroke, the others a four-stroke), the
   kart a single cylinder on a single speed (`motorOf(..., 1)`), the hire
   boat an outboard chopped by the water; the tests hold every model to a
   voice. Shots wait for a build.
6. **Traffic and the other vehicles** (themes 5 and 6, as answered): the
   traffic queueing behind parked vehicles with a capped wait, left turns
   held, passengers on the buses, the taxi's "as close as the road
   goes", brake lights and indicators on the bike and the kart, the
   kart's own feel. Two or three days; the routes and drive tests
   extended. **Built** (2026-11-08): drive.ts keeps a `stoppers` entry
   per vehicle it owns (`parked`, on while it's parked, moved with it,
   gone when it's recalled or brought home), the traffic queues behind
   it and toots once (`Horn.n`), and a car held past `HELD_MAX` (12 s)
   out of the camera's sight is put back by the pool's respawn
   (`heldTooLong()` in traffic.ts); left turns through `crossOf()` /
   `yieldsLeft()` on each vehicle's `Comer` (its junction, its way
   through, how long it has stood at its line; two left-turners let the
   first to arrive go); the City Bus's passengers over its sills and the
   Party Liner's standing crowd in the fleet's detail (carfine.ts
   `crew()`), someone waiting at every third shelter (`SHELTER_IDLES`,
   the `wait` act); the taxi's `FAR_DROP` (15): out onto the kerb, a
   waypoint to the place, "As close as the road goes"; the bike's tail
   lamp swapped for the brakes and reverse with amber indicators under
   the mirrors and by the tail (cars.ts `lampMaterials()`, shared), the
   street kart's rear light the same (`lights` on the show kart only, so
   the race karts keep their one mesh); `KART_FEEL` in mykart.ts. The
   traffic, transit and drive tests hold the rules; the snapshot is
   unchanged. Not done: the kart's indicators (it has none), and the
   traffic's own bikes stay as they were. Shots wait for a build.
7. **The dead ends made live** (theme 2, as answered): the live lines in
   every "coming soon" panel from the clock, the stadium's fixture board
   and match night, the club's door, the bar's snack, Crestmont's door
   prompts, the world map's missing footprints, the Kart Park station's
   walk, the riverside's yards. Three days, the copy the owner's to
   change.
8. **The crowd and the character** (themes 4 and 9, as answered): the
   crowd's outfits by role and district (phones one extra kind,
   measured with `?fps` and `?bench`), the captured idle and walk on the
   stage and the hologram, the held things with behaviour, the fists'
   first-person hands, the rarely used takes into on-demand packs, then
   the sitting-down take (a data step: the owner fetches or approves the
   CMU take). A week; the clothing, crowd and rubric tests hold it.
   **Built** (2026-11-09), all but the data step: **the crowd's outfits**
   are `crowdlook.ts` (`districtAt()`, `roleOf()`, `cityOutfit(r,
   where)`, `STYLES` a district: Uptown's suits and coats with hardly a
   cap, The Trenches' hoodies and track with hoods and beanies, the park's
   joggers and cyclists in bright track, the Docks' and the Yards' workers
   in hi-vis, Crestmont's pale suits with the collar open, the Neon Mile's
   party colours and its own lenses, the cove's pale casual, Sunridge,
   Lot 9, the mall, the airport and the kart park each their own, kids
   bright with the cap back, bouncers in black; `seeded()` from each
   person's number, so no two neighbours match and a visit is the same
   each time); life.ts dresses everyone by where they'll be and what they
   do, and a spare slot filled by a district's chunk is dressed again
   through `Crowd.dress()` (its colours and the items its kind's meshes
   carry; the kind stays). The crowd's kinds are `CROWD_KINDS` (suit,
   hoodie, track, puffer) and `CROWD_KINDS_LIGHT` (track only added:
   phones one kind more, the owner's call); the test counts the meshes.
   **The captured idle and walk** on the stage and the hologram are
   `captureplay.ts` (the crowd pack's three idles in turn, crossfaded, and
   its looped walk, on a figure's bones after its `update()`; the formula
   until the pack is in); the hologram now dances 16 s of every 28 and
   stands on the capture between. **Held things** are `heldpose.ts` (in
   the on-foot chunk: the coffee's sip every 14-26 s, the phone read
   standing still with a glance up and glanced at on the walk, the
   briefcase's pendulum on the hand; `applyHeld()` on the animator's turns
   through contact.ts's arm IK; the boombox hangs as it did). **Fists in
   first person** are `fistsview.ts` (the fists' chunk: his own hands
   closed, in the outfit's sleeves, in the guard, the jab and hook with the
   left, the cross and uppercut with the right over the moves' frames, the
   block, the dodge; a kick drops the hands and bobs the view, `KICK`).
   **The lazy packs**: the crouched walks, the standing jumps' wind-ups and
   the stairs climb are `clips-crouch.bin` / `clips-jumps.bin` /
   `clips-stairs.bin` (mocap-load.ts `LAZY_PACKS`, 95 KB together), fetched
   when the animator first wants one (`Animator.need` → walk.ts →
   `extend()`), the core down from 558 to 464 KB; until a pack is in the
   walks take the crouch (laid over, as standing still has it) and the
   slope, and a running take-off serves a standing jump. The strafes stay
   core (the aim's first frame searches them); `run-long-2` was not dropped
   (not asked in this phase). Tests: crowdlook, captureplay, heldpose, the
   mocap test holds every pack file, the animation tests read the packs
   joined (`tests/mocapdata.ts`). Shots wait for a build; the crowd's draws
   measured by the test (meshes a kind), not yet with `?fps` on a phone.
9. **Balance** (theme 1, as answered): the daily soft cap on race
   prizes and purses, the business side raised (XP a sale, a contract's
   XP, a sold-out bonus), the `prizes` switch wired to it, the game
   tests re-pinned, the numbers written in docs/tycoon-plan.md. Two
   days. **Built** (2026-11-09): `PRIZE_CAP` in catalog.ts (the day's
   first 6 cup races, a cup's and single ones, and the first 4 purses won
   pay in full, then 35%; a series' prize, the daily challenge, time
   trials and every XP uncapped; the owner's `prizes` switch still pays
   0), the save's `prizes` { day, races, bouts } (v13, `prizesToday()`,
   `cappedPrize()`, `prizesLeft()`; older saves start at zero and keep
   their Dorras), `capped` on `KartResult` and `FightResult` and one line
   on each result card ("Daily prize cap · 35%"); the business side: XP a
   sale 3 (was 1), a contract 80 (was 40), a courier sent and a job
   finished 20 each (new), and the sold-out bonus (`SOLD_OUT`: a shelf's
   run of 10 or more since it was last empty pays a tenth of its takings
   to your balance and 15 XP when the last one sells; the ledger's "Sold
   out"). The numbers, before and after, computed from the constants as
   the audit's were: **XP** at a rough business pace (150 items sold and
   six contracts an hour, two couriers, two jobs, five shelves sold out):
   about 390 XP an hour before, about 1,100 after, so level 5 (1,358 XP)
   in about an hour and a quarter instead of three and a half, level 10
   (5,612) in about five hours instead of fourteen; five won kart races
   still reach level 5 in about twelve minutes (the cap is on Dorras
   only). **Dorras an hour** from the repeatable prizes (the audit's pace,
   about 23 races or 15 bouts an hour): Rookie single-race wins 35,000
   before, about 18,000 the first hour and about 12,000 every hour after;
   mid-pack 10,000 before, about 4,800 then 3,200; Rookie Ray's purse
   22,500 before, about 11,800 then 7,900; Knuckles 45,000 before, about
   23,600 then 15,800; the Mayor 90,000 before, about 47,000 then 31,500;
   the Neon Cup's 300,000 (five cups) about 210,000 the first hour and
   170,000 after, most of it the uncapped series prize (the owner's call;
   a cap on it is the next lever if wanted). The stall's 3,300 an hour
   gains about a tenth from the sold-out bonus. A first corner shop
   (20,000) is now about an hour and ten minutes of Rookie wins (was
   forty minutes) or about six hours of stall-keeping (was ten).
   `tests/balance.test.ts` holds the cap, its day, the migration, the XP
   and the bonus; the save-version pins in the game, tycoon, fight, kart
   and inventory tests moved to 13. Shots wait for a build.
10. **The world's bigger polish** (themes 4 and 10, as answered, and the
    rest of theme 11): a lamp post per district, the kerb blended at The
    Trenches' edge, then the scenery-to-life steps one at a time with
    their own sign-off (the Night Market's stalls first, then the Sky
    Wheel ride, the Docks' Phase 4, a stadium match night as the owner
    picks), and the engineering that's left: walk.ts split along its
    seams (ground first, with tests), a linter and the shapes helper, the
    materials' hexes into the palette, the missing bench views.

After every phase: the shots compared, `?bench` on a phone and a laptop,
this plan's phase marked built, CLAUDE.md's line for anything that
changed how a thing works.

## Still open

- **Hosting:** what Hostinger runs on a push to main (Phase 4's check).
- **Workers.dev:** whether it should carry the baked textures (the bake
  in its build, minutes of Chromium) or stay browser-painted.
- **Phones' GPU memory:** the performance plan's 150 MB target against
  210 MB measured; "far districts let go on phones" and impostors are
  scheduled nowhere.
- **Which bigger step after the Night Market's stalls** (Phase 10).
- **More consumables and missions past level 12:** later, if wanted.
- **The series prizes and the daily cap:** Phase 9 left a series' prize
  uncapped (the owner's call), so the Neon Cup still pays about 170,000
  an hour from the second hour; capping it (or the Neon Cup's class
  prizes) is the next balance lever if the owner wants one.
- **Phase 8's leftovers:** the boombox still hangs at the hip (the
  shoulder carry would move the item's geometry: a clothing-test change),
  and `run-long-2` (09_01, about 20 KB) is still in the core pack.
- **The sitting-down take:** which CMU take, and whether `zenodo.org`
  may be allowed for 100STYLE's walks.

## What's good: leave alone

The palette test and `ground.ts`'s influences (no hex outside
palette.ts); lampmix at the sodium seams; the grit, street wall and
commons "keep clear of everything taken" chain; the snapshot; the
DOM-free and 3d split with a test for essentially every rules file; the
lazy districts; the sign atlases of fixed made-up copy (every list
counted in the newer districts is 100% distinct); the clock-driven shows
the same for everyone; drive-sim's handling and drifting and the fitted
car (springs, wheel in hand, gauges, wipers, doors, the driver's eye);
the boarding moments for every vehicle; the pooled traffic with reaction
times, indicators, horns and bus dwells; views.ts; the taxi's edge cases
and the go-home rules; the two-thumb touch driving; the trunk weight
field and the clothing test's real clipping guarantee; the rubric with
`HELD_BACK`; motion matching with the foot lock and `WARP`; the moments
and the GPU crowd with its overlay rows; the gun holds; the arcade kit's
palette with its contrast written down, its focus ring, `whyNot()`
reasons and disabled-with-reason everywhere, the purchase confirms,
`repaint()`, the Esc chain and near-zero dead CSS; `pay()` and `book()`
as the one gate for every Dorra, the seeded contract board, the daily
challenge's shape, the structural `cleanSave()`.

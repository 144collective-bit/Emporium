# The Degen Emporium

A PulseChain native store: merch, tools and a token. This repo is the
website, built with [Astro](https://astro.build): a living 3D city on the
homepage, whose buildings lead into the comic-book Emporium page.

## Run it

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static site in dist/
npm test         # the city's rules and data (tests/), in a second or so
```

`npm test -- drive` runs only the test files whose name contains "drive".
The "Build site" Action runs the tests before every build; if one fails, no
zip is made.

## Put it live (Hostinger)

degenemporium.com is hosted on Hostinger as a static site.

1. **Get the zip.** Every push to `main` builds the site: on GitHub open
   **Actions -> Build site**, pick the latest green run and download
   **degenemporium-site** under Artifacts. (Or run `npm run build` locally
   and use everything inside `dist/`.)
2. **Upload.** In hPanel open **File Manager -> public_html**, back up or
   remove the old files, upload the zip and **Extract** it right there, so
   `index.html` sits directly in `public_html`. Delete the zip afterwards.
3. **Check** https://degenemporium.com (hard refresh if the old version
   shows).

Multiplayer is paused: this build runs without the game server (solo play,
the builder as a play-money demo). See `server/README.md` to bring it back.

`public/.htaccess` ships with every build: it serves the site's 404 page,
compresses text files and caches the fingerprinted files in `/_astro/` for a
year. It starts with a dot, so some file managers hide it.

## What's here

| Path | What it is |
| --- | --- |
| `src/pages/index.astro` | The homepage: Sector 7 |
| `src/pages/emporium.astro` | The Emporium: the comic page |
| `src/pages/404.astro` | Not-found page |
| `src/components/CityMap.astro` | The city page (see Sector 7 below) |
| `src/scripts/city3d/` | The 3D city |
| `src/lib/city.ts` | The 2D city map |
| `src/components/ComicPage.astro` | The six comic windows (desktop page, mobile cards) |
| `src/components/Nav.astro` | Header: logo, PulseChain badge, X and Telegram |
| `src/styles/global.css` | All styles and the colour tokens |
| `src/data/site.ts` | Site name, description, social and store links |
| `src/assets/` | Processed art the site imports |
| `brand/` | Original art as supplied, palette notes, how to regenerate art |
| `scripts/` | Art pipeline: cutouts, header logo, favicons, share card; `test.mjs` runs the tests |
| `tests/` | Tests for the street plan, collisions, plots, driving, your car and target practice |
| `public/` | Favicons, share card, web manifest |

## Sector 7

The homepage is a living 3D city in Degen's style: ink outlines, flat
cartoon shading and PulseChain neon, built with [three.js](https://threejs.org).

- **Explore:** drag to move, right-drag or two fingers to turn, scroll or pinch
  to zoom. The camera flies in on load.
- **Buildings are places in the game:** hover lights a building up; clicking
  it flies the camera in and opens its glass panel: the Emporium's market
  hall, Drop 001's fitting room, the Armoury's guns, and "coming soon" for
  the places later phases open (see *The market* below and
  `docs/tycoon-plan.md`).
- **The Emporium** is the centrepiece: a twisting glass cyber arcade. Twelve
  glass floors turn a little more each storey, with neon game floors behind
  the glass (arcade cabinets, a dance floor, racing sims) and one face a
  pixel LED wall that plays its own shows (Insert coin, invaders, an
  equalizer, a high-score table, a pixel Degen). Its corners and floor edges
  bounce like an equalizer, and a giant hologram Degen dances on the roof.
  At street level: a glass arcade hall with claw machines, the ARCADE sign
  and logo over the doors, a glowing tile pad, a prize booth and a queue.
- **The Armoury** (south-east block) is a modern military compound and the
  players' gun store: concrete blast walls topped with razor wire, steel
  watchtowers on the corners, and a checkpoint with a guard booth, a boom
  barrier that lifts as you walk up, and a sign gantry. Inside, the gun
  store is a flat-roofed concrete block with a window ribbon, a glass
  shopfront showing rifles on the racks, a lit GUN STORE canopy, a helipad,
  AC units, a dish, a comms mast and Degen's flag on the roof. Players gear
  up at the counter out front, where a clerk stands. A patrol walks the
  yard, guards at the checkpoint salute you in walk mode, a tank turns its
  turret and a forklift moves crates under camo netting. At night it goes
  stealth dark: a faint green window glow and small red and green lamps.
- **Characters:** everyone is the same Degen, built after the brand art and
  shaped like a person (about six and a half heads tall, long legs, real
  shoulders, hands with a thumb): balaclava over a real head shape with the
  eye opening, a six-panel red cap with the Emporium diamond, framed green
  shades on a gold chain, a shirt collar, tie, notched lapels, pocket flaps
  and cuffs, trousers that break over the shoes, sneakers with soles and
  laces. Around the city
  he wears suits in different colours or hoodies and joggers (some with the
  hood up), with backpacks, crossbody bags or headphones and a bit of
  variety in build. People walk with bending knees and elbows, chat in
  groups, sit on park benches, queue and look around. You play the
  original, Gas Fee Gummy Bears in hand; the Armoury soldiers are the same
  body in fatigues.
- **Downtown that feels like it grew:** two cross streets each way and three
  diagonals cutting in from the ring's corners, blocks of different shapes,
  tight rows of shops and flats with walk-only alleys between, three pocket
  parks, and a hangout square a block from the Emporium: an open plaza with a
  fountain, kiosks and string lights.
- **Streets for real cars:** two-lane cross streets and diagonals, four-lane
  avenues with a median round downtown and along the south bank, a sidewalk
  round every block, zebra crossings, lights with a third phase where a
  diagonal comes in, and four bridges over the river. A tile is about 1.8 m,
  Degen about one tile tall.
- **Looser further out:** the Parkway sweeps in a gentle curve round the
  north half of town and the Southside Loop round the south row. The plots
  and lots sit in spacious landscaped blocks with lawns and trees, four small
  squares (a fountain, a statue with the Emporium diamond, a bandstand, a
  clock tower), pocket parks, and a waterfront promenade with benches and
  viewing decks along both banks of the river.
- **Room to grow:** the land, the river and the roads run on well past the
  districts (about 790 m across), open ground with a few trees, ready for
  more city. A skyline of towers stands on the horizon past the edge. You
  can walk, drive or pan out to it.
- **Cars at real proportions,** in the same cartoon style: a City Hatch, the
  Cruiser saloon, the Street GT coupe, the Hauler pickup, a Box Van and the
  City Bus, with rounded panels, framed glass, light clusters, grilles,
  door seams and handles, fat tyres on spoked rims and each model's own
  touches: a roof spoiler, chrome trim, racing stripes and a rear wing, a
  light bar and flares, a ladder rack, the bus's doors (made-up names, no
  real makes).
- **Alive:** cars and buses stop at traffic lights and turn down the diagonals, Degen-style people walk
  the sidewalks and queue at the shop, boats on the river, drones, a blimp,
  birds by day, sparks from the workshop, and soldiers drilling at the Armoury.
- **Sky:** day, sunset and night follow the visitor's clock (or pick one in
  City settings); rain comes and goes, with wet neon streets.
- **Sound:** a synthesised city hum, rain and a beat near the Emporium, off
  until the visitor turns it on.
- **Every device:** phones get a lighter version that idles at 30fps and runs
  at full rate while you touch it; slow devices step quality down
  automatically. Pin labels shrink with distance, slide back on screen at
  the edges, and fold to dots when they would overlap each other or the
  city's own buttons and cards. Without WebGL, or after choosing "2D map", the original
  isometric SVG map is shown instead. Reduced motion gives a still city.

### Drop 001's fitting room

Click Drop 001 (or walk in) and its panel has a **fitting room**: pick what
your Degen wears and watch it on him, turning on a neon podium (drag to turn
him). Seven tabs: **Fit** (Classic Suit, Drop Hoodie or Track Suit, with
their colours), **Head** (Diamond Cap, Backwards Cap, Street Beanie, Bucket
Hat, Gold Crown, Hood Up or nothing), **Shades** (lens colours), **Bags**
(Backpack, Crossbody, Skate Deck or none), **Hand** (Gummy Bag, Iced Coffee,
Boombox or empty), **Extras** (Headphones, Diamond Chain, Shades Chain) and
**Kicks**. It's free and only for your Degen in the city: nothing is sold
and it isn't tied to the real store. He wears it in walk mode, and other
players see it online. The **Open the fitting room** button in Profile goes
straight there.

### The market: Dorras and your stall

The city has its own money, **Dorras**, earned by playing (they can't be
bought or cashed out). Everyone starts with 600 and a **market stall** in the
**market square**, east of the East districts: two rows of stalls under
striped canopies, a MARKET gantry and string lights, traders and shoppers.
Yours has the cyan canopy and the YOUR STALL board, and shows your stock.

- **The market hall** (click the Emporium): six goods (Glow Sticks, Gummy
  Bears, Iced Coffee, Street Tees, Sneakers, Neon Signs) at prices that drift
  through the day, the same for everyone. Buy puts stock straight on your
  stall (or another of your places); Sell gives a little under the price.
- **Your stall** (the Stall tab of the business card below, or walk up to
  the stall and press E): each good with its price (Low
  sells fast, High earns more each) and how fast it's going, and the upgrade
  (more kinds of goods, more room, more customers).
- Customers buy while you play, twice as fast while you stand at your stall (or shop),
  and a little while you're away (up to 4 hours). Coming back, a note says
  what sold.
- **Makers' Row** (across the street north of the market): four units to
  buy and build as a **garden** (grows sugar, coffee beans or cotton), a
  **shop** (a bigger stall) or a **warehouse** (holds 300 of anything).
- **The Workshop** turns raw goods into products (gummy bears from sugar,
  iced coffee from beans, tees and sneakers from cotton), cheaper than
  buying them. Gardens and the Workshop keep going while you're away.
- **Your car moves the goods:** park at a garden, the warehouse or the
  Workshop, load up (the Box Van carries most, the Street GT least), drive to
  your stall or shop and unload for a 10% delivery bonus.
- Everything is on the **Your business** card (the Dorras readout, or walk
  up to your stall or a unit): the till, then Stall, Units, Workshop and Car
  tabs. The market hall delivers to (and sells from) whichever of your
  places you pick.
- **Contracts** (the Signal tower): orders from around town, a new board
  every 20 minutes. Take one, get the goods into your car (you can buy
  straight into it at the market hall with the car parked outside), drive to
  the building marked by a beam of light, and deliver at the door for more
  than the goods are worth.
- **Couriers** (the Post office) move goods between your places for a fee
  when you'd rather not drive.
- **Staff** (the Apartments): a clerk sells more at your stall or a shop, and
  keeps it selling at full pace while you're away; a gardener and a Workshop
  hand speed things up. They keep 10% of what they handle.
- **Big lots** (east of Makers' Row): the top tier, bought with Dorras only:
  a **superstore**, a **factory** (its own, faster production line), a
  **depot** (holds 1,000; cheaper couriers) or your **offices** (every
  stall, shop and superstore sells faster). The district plots stay PLS land
  and aren't part of the game's economy.
- **The Vault** (the bank): what your business is worth, where your Dorras
  came from and went, and loans to grow faster (a flat fee, paid back from a
  share of your takings).
- It's saved in the browser for now. The plan (with the server phase still
  to come) is in `docs/tycoon-plan.md`.

### The mode header

Across the top of the city a header always says which view you're in, with
a line on what to do there: **City view**, **Walk mode** (first or third
person, online), **Build mode** or the **City map** (2D). Its
**City / Walk / Build** switch moves between them. While walking, the site
header steps aside and this header carries the walk tabs (Controls,
Profile, Online, Emote) and, with a gun, the ammo and score, so the rest of
the screen is the city. On phones it's two rows while walking.

### Walk mode

Press **Walk** to play as Degen (balaclava, red cap, green shades, suit, a bag
of Gas Fee Gummy Bears) and explore on foot.

- **Desktop:** click the city to capture the mouse, then move it to look
  around (up at the towers and the sky too). WASD or arrow keys to move and
  strafe, hold Shift to run (Caps Lock toggles it), Space to jump (hold
  for a higher jump), right-click to aim, E to enter a door or get in your car. You start in
  first person; V (or scrolling out) swaps to the over-the-shoulder camera,
  and scroll sets its distance. Esc frees the mouse; press it again to stop
  walking.
- **Phones:** joystick bottom-left (push it to the edge to run), Run and Jump
  buttons bottom-right, drag anywhere else to look.
- **Gamepads:** left stick moves, right stick looks, A jumps, LB or L3 runs,
  LT aims, Y enters a door, View swaps first / third person.
- **Controls** (top-left while walking) sets look speed, invert up/down and
  first person, and lists the keys. The settings are saved in the browser.
- The camera sits over his shoulder, slides in front of walls instead of
  going through them, and widens a little when he runs.
- The world is solid: landmarks, your buildings, the fountain and the river
  block you (bridges don't), kerbs step up and down, and cars stop for you.
- Walk up to a landmark's door and press **E** (or tap the prompt) to open its
  panel right where you stand.

### The garage and your own car

On the south bank, east of plot South 5, stands the **garage**: a workshop
with an open bay and a car lift, a roller door, a little office, a neon
GARAGE sign on the roof, and a showroom turntable on the forecourt with
**your car** on it.

- **Pick your car:** walk up to the office door and press E (tap the prompt,
  Y on a gamepad). Choose from five models (City Hatch, Cruiser, Street GT,
  Hauler, Box Van), each with a short description and bars for top speed,
  pick-up and grip, and one of twelve paints. The camera swings round to
  the turntable, which turns while you look, and every pick shows on it.
  **Keep this one** saves it in your browser; closing without keeping puts
  your saved car back. Cars are free and only for the city: nothing is sold.

### Driving

- **Get in:** walk up to your car and press E (or tap **Get in**). The first
  time it drives off the turntable facing the avenue.
- **Drive:** W / S (or the arrows) for gas and brake (hold to reverse), A / D
  to steer, Space for the handbrake (slide the back out), V for the chase
  or roof camera. The mouse (or a drag) looks around; the camera settles
  back behind the car.
- **Phones:** the stick steers; Gas and Brake buttons on the right.
- **Gamepads:** left stick steers, RT gas, LT brake, A handbrake, Y gets out,
  View swaps camera.
- **Arcade handling:** each model drives differently (the Street GT is
  quick and grippy, the Box Van takes its time). Bumps are soft and safe:
  you slide along buildings and the river bank, nudge off other cars and
  people (never through them), and traffic stops for you.
- **Get out anywhere** (E, or tap **Get out**): the car stays parked where
  you left it until you come back. To send it home, open the garage menu:
  **Bring my car home**. A reload also puts it back on the turntable.
- The header says **Driving** and which car; a readout shows your speed in
  km/h and the gear. The engine hums when sound is on.

### Target practice

Solo shooting practice in walk mode. Only Degen carries a gun; nobody in the
city is shot at.

- **Gun store:** walk up to the counter inside the Armoury and press E (tap
  the prompt on phones, Y on a gamepad). Pick a gun, compare its damage,
  fire rate, range, accuracy and magazine, and take it, full of ammo. Going
  back refills it. Arrow keys / the D-pad pick, Enter / A takes, Esc / B
  closes.
  - **Assault Rifle** (from the start): full auto, holo red-dot.
  - **Buzz SMG** (750 lifetime points): fast, big magazine, short range.
  - **Street Sweeper** (2,500): a shotgun, eight pellets a pull, iron sights.
  - **Long Shot** (6,000): a marksman rifle, one heavy shot per pull, and a
    scope that fills the screen when you aim.
  Guns unlock with your lifetime score (a pop-up says when one does). Nothing
  is sold: they're free to take and swap.
- **First person:** Degen's hands on his gun (suit sleeves, white cuffs).
  It sways as you look, bobs as you walk, tips down when you sprint, kicks
  on every shot with a muzzle flash, and the left hand swaps the magazine on
  a reload. Aiming brings the sight up to your eye and zooms in (more with
  the Long Shot's scope).
- **Desktop:** click to fire (once the mouse is captured; where a page can't
  capture it, click fires and dragging looks), right-click to aim, R to
  reload, G to holster or draw, Q (or 1-4) to swap guns.
- **Phones:** Fire, Aim (tap to toggle the sight), Reload and Swap buttons
  appear next to Run and Jump. Drag the Fire button to steer while you shoot
  (a second finger on the city looks too). Fire has a little aim assist
  towards a target near the crosshair. Swap shows the gun in hand.
- **Gamepads:** RT fires, LT aims, X reloads, RB or D-pad left / right swaps
  guns, D-pad up holsters.
- **Swapping guns:** once geared up at the counter, swap between every gun
  your score has unlocked, anywhere. Each gun keeps its own ammo (one you
  haven't carried yet comes full); the counter refills them all.
- **Aim when firing** (Controls panel, Shooting): Off, Touch only (the
  on-screen Fire button) or Always. When on, firing brings the gun up to the
  sight and it drops again just after you stop. Saved in the browser.
- **Targets:** cardboard "Jeet Bot" dummies in the park, beside the post
  office and by the apartments, and target drones patrolling above the
  streets. Each has a health bar; dummies flop over and pop back up, and
  drones fall, smoke and pop before they respawn.
- **HUD:** crosshair that opens up as you fire (the red dot replaces it when
  aiming), hit and takedown markers, floating damage numbers, "Takedown" /
  "Drone down" and streak call-outs (Double, Triple...), ammo counter and
  score.
- **Rifle finishes:** Field Olive to start; Black Ink and Pulse Neon unlock
  with your lifetime score. Pick one in the Controls panel. Score and finish
  are saved in your browser; they're cosmetic only.
- Sparks and dust where shots land. Layered cartoon sound, only when sound
  is on: each shot has a punch, a crack, a mechanical click and an echo off
  the buildings; reloads click out and clack in; cardboard thuds and drones
  ring.

### Multiplayer (beta)

Walk the city with other players. The **Online / Offline** switch in the
mode header (next to City / Walk / Build; "On / Off" on phones and small tablets) picks one
for the whole city:

- **Online**: walking joins a shared city, and Build mode sells real plots
  with your wallet. The dot is cyan when ready, yellow while joining, green
  once you're in a city (hover it for the city and player count), red if a
  city is full or the server can't be reached.
- **Offline**: solo walking, and Build mode is the demo with play money.
  Nothing talks to the game server.

The choice is remembered in the browser. **Go online** / **Leave** in the
Online pill while walking flip the same switch.

- Up to 16 players share a city; more cities open as they fill.
- Everyone gets a generated player name (reroll it in **Profile**), shown on
  a name tag with a rank badge from their lifetime score.
- **Connect wallet** (top of the page, or **Profile** while walking): sign a short
  message with your PulseChain wallet (no transaction, no gas) and your
  player profile belongs to that wallet, so it follows you to any browser or
  phone. A wallet's first login starts a fresh profile. The profile card
  shows your name, rank, lifetime score, wallet and the plots you own (tap
  one to see it in Build mode).
- **Profile**: your name, rank, lifetime score and rifle finish, and a way
  into the fitting room. Online it's saved on the server and follows you;
  offline your look and finish are kept in this browser.
- **Emote** (or T): wave, dance, salute, cheer and a set of fixed phrases
  ("GM degens", "Nice shot!"…) shown as a bubble over your head. Nothing
  typed ever appears. Mute anyone from the Online panel.
- Target practice is shared: everyone shoots the same dummies and drones and
  the server keeps score.
- Leave walk mode (City in the header) to leave the shared city; with the
  switch on Online you rejoin when you walk again.

The game server is in `server/` (Cloudflare); see `server/README.md` for
setup. The plan for the next phases (leaderboards, PvP across the river) is
in `docs/multiplayer-plan.md`.

### Checking performance

Add `?fps` to the address (for example `https://degenemporium.com/?fps`) to
show a small readout in the corner of the city: frames a second, the slowest
frame, draw calls and triangles per frame, the quality tier and anything
stepped down. Nobody sees it without `?fps`.

### City builder: buy a plot, build on it

Press **Build** in the header to switch to build mode. Each of the 16 districts
around the core city (North 1-5, West 1-3, East 1-3 past the ring roads, and
South 1-5 across the river on the south bank road) is
**one large plot**: its 3 × 3 squares merged into one, for **20,000,000 PLS**.

- **Pick a plot** (tap, click or use the arrow keys) to see who owns it and
  what's built there.
- **Buy it with your wallet:** connect a PulseChain wallet (the site switches
  it to the right network or adds it), confirm, and approve the payment in
  your wallet. The PLS goes straight to the Sector 7 wallet. The game
  server checks the payment on PulseChain and the plot is yours once it has a
  few confirmations, usually within a minute.
- **Build on it:** choose from eight buildings (house, shopfront, tower, loft,
  arcade, pocket park, warehouse, billboard lot) and customise walls, neon,
  floors, sign and rotation with a live preview. Each design fills the whole
  plot with its grounds: a house with a porch, garage and pool; a shop with a
  café terrace; a tower over a fountain plaza (up to 8 floors, so the Emporium
  stays the tallest); a loft with balconies and a roof garden; a neon arcade;
  a park with a fountain and gazebo; a warehouse with a loading dock; a
  billboard lot with a food truck. The first change in a visit asks your wallet to sign a short
  message (free, no gas) to prove it's yours. Everyone in the city sees your
  building.

**Wallets:** installed wallets (MetaMask, Rabby, OKX and others: browser
extensions, or the wallet app's own browser on a phone) show up by name.
**WalletConnect** covers everyone else: a QR code on a computer, or a jump
to the wallet app on a phone. It needs a free project ID:

1. Sign in at https://cloud.reown.com and create a project (type: *AppKit*
   or *WalletKit* → choose **AppKit**, platform **JavaScript**).
2. Copy its **Project ID** into `WALLETCONNECT_PROJECT_ID` in
   `src/data/site.ts` (it's public by design: every visitor's browser
   gets it).
3. In the project's settings, add `emporium.144collective.workers.dev`
   (and `localhost` for testing) to the allowed domains.

Without a project ID the WalletConnect option simply doesn't appear.

Sales run on **PulseChain Testnet v4** (test PLS, no real value) until the
owner switches the game server to mainnet, and stay "opening soon" until the
owner's receiving wallet is set. See `server/README.md` → *Plot sales*.

Offline (the switch in the mode header), or without a game server (a local
build), the builder runs as a **demo**: a simulated wallet with play money,
nothing touches PulseChain, progress is saved in the browser and **Reset
demo** clears it.

| Building | Its panel |
| --- | --- |
| The Emporium (centre arcade tower) | The market hall |
| Drop 001 | Clothes: the fitting room |
| The Armoury | Guns and gear (target practice) |
| The Workshop | The factory: turn raw goods into products |
| The Vault | The bank: worth, ledger, loans |
| Signal tower | News and contracts |
| Post office | Couriers |
| The Apartments | Staff |

The ☰ Menu lists the same places (in 3D), then the Emporium comic page and,
once `SHOP_OPEN` is true, the merch store; X and Telegram sit at its foot.
On the 2D map a building takes you into the 3D city and opens its panel. Phones (up to 640px wide) don't show
the welcome card, so the city fills the screen; on bigger screens it has a
close button and stays closed on return visits. A small "Draft · v0" tag keeps
the draft note whenever the card is hidden. Every menu and card closes with its
×, Esc, or (for drop-down menus) a tap outside.

### Where it lives

| Path | What it is |
| --- | --- |
| `src/components/CityMap.astro` | The page: 2D map, 3D host, pins, settings, panels, directory |
| `src/scripts/city3d/index.ts` | Boot, quality tiers, camera, hover/click, panels, loop |
| `src/scripts/city3d/world.ts` | Ground, roads, river, trees, lamps, skyline |
| `src/scripts/city3d/landmarks.ts` | The buildings, signs and their animations |
| `src/scripts/city3d/life.ts` | Traffic and lights, people, boats, drones, blimp, birds |
| `src/scripts/city3d/sky.ts` | Time of day, sun and moon, fog, clouds, rain |
| `src/scripts/city3d/post.ts` | Ink outlines and bloom |
| `src/scripts/city3d/sound.ts` | Ambient sound |
| `src/scripts/city3d/walk.ts` | Walk mode: Degen, mouse / keyboard / touch / gamepad controls, camera, collisions, door prompts |
| `src/scripts/city3d/combat-sim.ts` | Target practice rules: ammo, hits, health, score; fixed tick, events, no DOM (ready to run on a server) |
| `src/scripts/city3d/combat.ts` | Target practice view: targets, effects, sound cues, HUD, call-outs, gun finishes |
| `src/scripts/city3d/gunshop.ts` | The gun store menu at the Armoury counter |
| `src/scripts/city3d/guns.ts` | The four guns (Degen, his hands, other players, the soldiers), sights, finishes |
| `src/scripts/city3d/stance.ts` | Third person: both hands on the gun (grip and handguard), side-on stance for long guns |
| `src/scripts/city3d/viewmodel.ts` | First-person hands and rifle: sway, bob, recoil, aiming, reload |
| `src/scripts/city3d/solids.ts` | The city's collision boxes, doors, the gun counter, the garage and the walk-mode spawn (walk mode, your car and the game server) |
| `src/scripts/city3d/layout.ts` | The street plan: blocks, streets, avenues, lanes, the river, the garage lot, and the landmarks' old drawing grid (`design()`) |
| `src/scripts/city3d/cars.ts` | The car models (traffic, parked cars, your car) |
| `src/scripts/city3d/garage.ts` | The garage on the south bank and its turntable |
| `src/scripts/city3d/garage-ui.ts` | The garage menu: pick a model and a paint |
| `src/scripts/city3d/mycar.ts` | Your car: models, paints, handling numbers (no DOM) |
| `src/scripts/city3d/drive-sim.ts` | Driving rules: arcade handling, soft collisions (no DOM) |
| `src/scripts/city3d/drive.ts` | Driving: getting in and out, cameras, the speed readout, engine sound |
| `src/scripts/city3d/tycoon.ts` | The economy's rules: goods, market prices, your stall, units, the Workshop, your car's load, sales, time away (no DOM) |
| `src/scripts/city3d/tycoon-ui.ts` | The Dorras readout, your business card, the market hall, the Workshop's panel, the save |
| `src/scripts/city3d/units.ts` | Makers' Row: your four units, drawn from the save |
| `src/scripts/city3d/beacons.ts` | Beams of light over your contracts' drop-offs |
| `src/scripts/city3d/biglots.ts` | The big lots: superstore, factory, depot, offices, drawn from the save |
| `src/scripts/city3d/market.ts` | The market square: stalls, traders, gantry, your stall's stock |
| `src/scripts/city3d/profile-ui.ts` | The Profile panel: name, rank; owns the look (saved here and online) |
| `src/scripts/city3d/head.ts` | The mode header's title and subtitle, and its height (`--head-h`) |
| `src/scripts/city3d/fitting.ts` | Drop 001's fitting room: wardrobe items and the turning preview |
| `src/scripts/city3d/online.ts` | The Online / Offline switch in the mode header (multiplayer and real sales, or solo and the demo) |
| `src/scripts/city3d/multiplayer.ts` | Online pill, sending controls, emotes and phrases, player list |
| `src/scripts/city3d/remote.ts` | Other players: smoothed movement, poses, name tags, bubbles |
| `src/scripts/net/` | Shared with the server: protocol, profile data (names, ranks, wardrobe, emotes, phrases); `client.ts` is the browser connection |
| `server/` | The multiplayer game server (Cloudflare Worker + Durable Objects) |
| `src/scripts/city3d/plots.ts` | The large plots, build-mode overlay, the eight buildings |
| `src/scripts/city3d/store.ts` | The builder's `Store` interface, and the demo (simulated wallet, play money) |
| `src/scripts/city3d/land.ts` | Real sales: wallet payments, the server's list of owners, building (with the wallet login) |
| `src/scripts/city3d/account.ts` | Log in with a wallet: the signed message, the session, the basic profile |
| `src/scripts/city3d/account-ui.ts` | The Log in button and the profile card (name, rank, score, wallet, plots) |
| `src/scripts/city3d/wallet.ts` | The visitor's PulseChain wallet: installed ones (EIP-1193 / EIP-6963) and WalletConnect for phones |
| `src/scripts/net/land.ts` | Shared with the server: networks, land API shapes, sign-in message |
| `src/scripts/city3d/builder-ui.ts` | Build mode: wallet chip, plot panel, customiser, purchase dialog |
| `src/data/plots.ts` | Districts, plot price, building catalogue, colours, sign texts (shared with the server) |
| `src/scripts/city3d/kit.ts` | Toon materials, canvas textures, batching |
| `src/lib/city.ts` | The 2D isometric map (fallback and loading poster) |

## The six windows (`/emporium`)

| Window | Content |
| --- | --- |
| 01 | Brand statement: Degen, headline, follow on X |
| 02 | Drop 001 (merch), coming soon. "Enter the store" is disabled until `SHOP_OPEN` in `src/data/site.ts` is true |
| 03 | X and Telegram |
| 04 | The tools: Terminal, DEX, Launcher |
| 05 | The token: blurred and marked classified until launch (decoy content only) |
| 06 | The plan, roughly |

All copy is draft and marked as such on the page. A red "Coming soon"
stamp marks the whole page as a preview.

## Brand

Colours come from the PulseChain gradient (red, magenta, violet, blue,
cyan). See `brand/README.md` for the palette and the rules that keep it
readable.

# The Degen Emporium

A PulseChain native store: merch, tools and a token. This repo is the
website, built with [Astro](https://astro.build): a living 3D city on the
homepage, whose buildings lead into the comic-book Emporium page.

## Run it

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static site in dist/
```

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

`public/.htaccess` ships with every build: it serves the site's 404 page,
compresses text files and caches the fingerprinted files in `/_astro/` for a
year. It starts with a dot, so some file managers hide it.

## What's here

| Path | What it is |
| --- | --- |
| `src/pages/index.astro` | The homepage: Degen City |
| `src/pages/emporium.astro` | The Emporium: the comic page |
| `src/pages/404.astro` | Not-found page |
| `src/components/CityMap.astro` | The city page (see Degen City below) |
| `src/scripts/city3d/` | The 3D city |
| `src/lib/city.ts` | The 2D city map |
| `src/components/ComicPage.astro` | The six comic windows (desktop page, mobile cards) |
| `src/components/Nav.astro` | Header: logo, PulseChain badge, X and Telegram |
| `src/styles/global.css` | All styles and the colour tokens |
| `src/data/site.ts` | Site name, description, social and store links |
| `src/assets/` | Processed art the site imports |
| `brand/` | Original art as supplied, palette notes, how to regenerate art |
| `scripts/` | Art pipeline: cutouts, header logo, favicons, share card |
| `public/` | Favicons, share card, web manifest |

## Degen City

The homepage is a living 3D city in Degen's style: ink outlines, flat
cartoon shading and PulseChain neon, built with [three.js](https://threejs.org).

- **Explore:** drag to move, right-drag or two fingers to turn, scroll or pinch
  to zoom. The camera flies in on load.
- **Buildings are doors:** hover lights a building up; clicking it flies the
  camera in and opens a glass panel with that section and a button onward.
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
- **Characters:** everyone is the same Degen, built after the brand art:
  balaclava with the eye opening, red cap with the Emporium diamond, green
  shades on a gold chain, collar, tie and a lapelled suit. Around the city
  he wears suits in different colours or hoodies and joggers (some with the
  hood up), with backpacks, crossbody bags or headphones and a bit of
  variety in build. People walk with bending knees and elbows, chat in
  groups, sit on the park bench, queue and look around. You play the
  original, Gas Fee Gummy Bears in hand; the Armoury soldiers are the same
  body in fatigues.
- **Alive:** cars and buses stop at traffic lights, Degen-style people walk
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

### Walk mode

Press **Walk** to play as Degen (balaclava, red cap, green shades, suit, a bag
of Gas Fee Gummy Bears) and explore on foot.

- **Desktop:** click the city to capture the mouse, then move it to look
  around (up at the towers and the sky too). WASD or arrow keys to move and
  strafe, hold Shift to run (Caps Lock toggles it), Space to jump (hold
  for a higher jump), right-click to aim, E to enter a door. You start in
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
- **Desktop:** click to fire (once the mouse is captured), right-click to aim,
  R to reload, G to holster or draw.
- **Phones:** Fire, Aim (tap to toggle the sight) and Reload buttons appear
  next to Run and Jump. Fire has a little aim assist towards a target near
  the crosshair.
- **Gamepads:** RT fires, LT aims, X reloads, D-pad up holsters.
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

Walk the city with other players. Press the **Online** pill in walk mode
(top-left, next to Controls) and **Go online**.

- Up to 16 players share a city; more cities open as they fill.
- Everyone gets a generated guest name (reroll it in **Profile**), shown on a
  name tag with a rank badge from their lifetime score.
- **Profile**: your name, rank, lifetime score and rifle finish, and a way
  into the fitting room. Online it's saved on the server and follows you;
  offline your look and finish are kept in this browser.
- **Emote** (or T): wave, dance, salute, cheer and a set of fixed phrases
  ("GM degens", "Nice shot!"…) shown as a bubble over your head. Nothing
  typed ever appears. Mute anyone from the Online panel.
- Target practice is shared: everyone shoots the same dummies and drones and
  the server keeps score.
- Stop walking to go offline; you rejoin when you walk again.

The game server is in `server/` (Cloudflare); see `server/README.md` for
setup. The plan for the next phases (leaderboards, PvP across the river) is
in `docs/multiplayer-plan.md`.

### City builder (demo)

Press **Build** to switch to build mode. The districts around the city
(North, West and East, past the ring roads) are divided into 99 plots.

- **Pick a plot** (tap, click or use the arrow keys) to see its size, tier and
  price.
- **Buy it** with the demo wallet: connect, confirm, and watch the simulated
  "Approve in wallet" and "Confirming on PulseChain" steps.
- **Build on it:** choose from eight buildings (house, shopfront, tower, loft,
  arcade, pocket park, warehouse, billboard lot) and customise walls, neon,
  floors, sign and rotation with a live preview. Edit, demolish or release
  the plot (refunds the demo PLS) any time.

Everything is simulated for now: no wallet connects, nothing touches
PulseChain and no real PLS moves. Progress is saved in the visitor's browser,
and **Reset demo** clears it. Prices in `src/data/plots.ts` are placeholders.
When the real wallet is ready, it plugs into `src/scripts/city3d/store.ts`.

| Building | Panel button goes to |
| --- | --- |
| The Emporium (centre arcade tower) | `/emporium` |
| Drop 001 (shop, shutters down) | `/emporium#drop`, or the Shopify store once `SHOP_OPEN` is true |
| The Workshop | `/emporium#workshop` |
| The Vault | `/emporium#vault` |
| The Armoury | `/emporium#plan` |
| Signal tower | X |
| Post office | Telegram |

The Directory lists the same places. On phones the welcome card has a close
button and stays closed on return visits.

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
| `src/scripts/city3d/solids.ts` | The city's collision boxes (walk mode and the game server) |
| `src/scripts/city3d/profile-ui.ts` | The Profile panel: name, rank; owns the look (saved here and online) |
| `src/scripts/city3d/fitting.ts` | Drop 001's fitting room: wardrobe items and the turning preview |
| `src/scripts/city3d/multiplayer.ts` | Online pill, sending controls, emotes and phrases, player list |
| `src/scripts/city3d/remote.ts` | Other players: smoothed movement, poses, name tags, bubbles |
| `src/scripts/net/` | Shared with the server: protocol, profile data (names, ranks, wardrobe, emotes, phrases); `client.ts` is the browser connection |
| `server/` | The multiplayer game server (Cloudflare Worker + Durable Objects) |
| `src/scripts/city3d/plots.ts` | Plot grid, build-mode overlay, the eight buildings |
| `src/scripts/city3d/store.ts` | Demo wallet, simulated purchases, saved progress |
| `src/scripts/city3d/builder-ui.ts` | Build mode: wallet chip, plot panel, customiser, purchase dialog |
| `src/data/plots.ts` | Plot prices (placeholders), building catalogue, colours, sign texts |
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

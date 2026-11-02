# The menu plan

The owner's call (2026-11): "redesign all menus and upgrade their quality
and functions", then "no PulseChain colours, make a new design
completely". Build it one phase at a time, each with the owner's sign-off.
Keep this file up to date.

## The owner's picks

- **A new design, no PulseChain colours, for every menu in the city:** the
  start menu, the header, the hub, every place panel, shop and game menu,
  the business screens, the fitting room, cards, toasts and pops. The 3D
  city itself (its neon signs, lights, pins and glows) and the site's other
  pages (the Emporium comic page, 404) keep their look.
- **Style: retro arcade**, after the Emporium arcade: pixel-edged panels,
  chunky pixel headings, a faint scanline texture, blocky buttons that
  press down, a soft screen glow on lit text, a blinking selector on the
  focused row. Plain words on buttons.
- **Palette: picked by us**, shown on a sample menu for the owner to
  approve before anything is rolled out (below).
- **Functions:** one hub menu, phone-first layouts, full controller and
  keyboard use. (3D previews in the shops weren't picked.)
- **The hub replaces the ☰ Menu, Settings and the walk tabs** (Controls,
  Profile, Online, Emote). It opens with Esc, a header button, or Start on
  a gamepad. Place panels and shops stay their own menus, in the same
  design.
- **Feel: motion only.** Panels slide and fade in, tabs glide, buttons
  press down; no UI sounds. Everything still under reduced motion (the
  selector stops blinking, nothing slides).
- **Order: the design system first**, shown on one menu, then rolled out.

## The palette (proposed, for the owner's approval)

An arcade cabinet's colours, none of the PulseChain gradient's (no
red-to-cyan sweep, no magenta, violet or cyan):

| Token | Hex | Used for |
| --- | --- | --- |
| `--m-cab` | `#0c0d10` | Panels: the cabinet's black |
| `--m-bezel` | `#1a1c22` | Cards, rows, insets |
| `--m-edge` | `#3a3e48` | Pixel edges, rules, disabled |
| `--m-text` | `#f1efe6` | Text: warm screen white |
| `--m-dim` | `#9a9ca4` | Secondary text |
| `--m-coin` | `#ffc531` | Actions, focus, the selected tab, Dorras: coin-slot yellow |
| `--m-hot` | `#ff5a36` | Warnings, damage, prices falling, "can't" |
| `--m-go` | `#7bd88f` | Success, prices rising, owned (small marks only) |

Contrast on `--m-cab`: text 17:1, dim 7:1, coin 12:1, hot 6:1, go 11:1,
all past WCAG AA for small text. Buttons: coin-yellow face with black text
for the main action, an edged dark face with white text for the rest.

**Type:** a pixel face for headings and tabs (Pixelify Sans, Google Fonts,
OFL: readable at small sizes, unlike the widest arcade faces), Inter for
body text, JetBrains Mono for numbers, prices and keys. Big Shoulders
Display stays for the comic page.

## What stays as it is

- The content rules: Dorras are a game's money (never real money, never an
  investment), made-up names, the draft note, no token details.
- Every menu can be closed (×, Esc, a tap outside a drop-down); one card at
  a time; anything always on screen joins `chrome` in index.ts so the pins
  fold out of its way.
- Touch buttons answer a finger at once, however many are down (`onTap()`
  in ui.ts).
- The menus' code loads when first used (`lazyMenu()`), and the budgets
  (`scripts/budget.mjs`: the CSS 60 KB gzipped, 34 KB today) hold.
- No new pages: the hub, panels and shops all open over the city.
- The PulseChain gradient stays where it is outside the menus (the comic
  page, `brand/README.md`) until the owner says otherwise; the menus leave
  it for this palette.

## Today's menus (what the plan covers)

- **City view:** the start menu (`[data-start]`, start.css), the header
  (`.city-head`: the City / Walk switch, Dorras, level pill, ⚙ Settings,
  ☰ Menu with the places and More), the welcome tip and the Getting started
  card, the live banner, about 30 place panels (`data-panel-tpl`: the
  Emporium's market hall, Drop 001, the Workshop, the Vault, Signal tower,
  Post office, Apartments, the Armoury, Liberty and Harbour Bridges, the
  kart park, the Fight Club, the airport, The Block, the club, the bar,
  Trench Arms, Pier 7, the Night Market, the stadium, Palm Court, the mall,
  Sector 7 Tower, Crestmont's five, Sunridge's three, the Harbour Master).
- **Walk mode:** the walk tabs (Controls, Profile, Online, Emote), the
  inventory (`[data-inv]`) and hotbar, the gun store and workbench
  (gunshop.ts), the garage (garage-ui.ts), the hangar (hangar-ui.ts), the
  kart hut and its HUD and results (kart-ui.ts), the trainer and the fight
  HUD (fight-ui.ts), the world map (worldmap.ts), the metro, river bus and
  taxi cards and bars, the compass, the mission tracker, toasts and pops.
- **Business:** the business card (`[data-biz]`), the market hall, the
  Workshop's, Signal tower's (news, contracts, missions), Post office's,
  Apartments' and the Vault's panels (tycoon-ui.ts, missions-ui.ts).
- **Clothes:** Drop 001's fitting room (fitting.ts) and the character
  screen (charscreen.ts).
- Styles today: city.css, walk.css, economy.css, missions.css, guide.css,
  armoury.css, garage.css, inventory.css, karts.css, fight.css, cards.css,
  worldmap.css, fitting.css, start.css, live.css, fly.css (about 13,000
  lines, each menu its own layout).

## Phase 1: the arcade kit, shown on the gun store

The design system, as CSS and a little code every menu then uses.

- **`menus.css`** (after the global styles in `Base.astro`'s order), the
  palette above as tokens and these parts:
  - the **panel**: cabinet black with a pixel-stepped edge (`clip-path`
    in steps, a 2-pixel `--m-edge` frame and a 1-pixel inner highlight),
    a faint scanline texture made in CSS (no image, never over text);
  - the **title bar**: the place's kind as a small label, its name in the
    pixel face, the close button as a square key; the **marquee strip**
    for a place's tagline (one line, made-up fixed copy);
  - **tabs** (blocky tabs, the current one coin yellow with a gliding
    underline), **buttons** (the main action coin yellow with black text,
    the rest edged dark with white text, danger in `--m-hot`, disabled
    saying why; each sits on a 2-pixel shadow and drops onto it when
    pressed), **list rows** and **cards** (the focused one with the
    blinking ▶ selector and a coin edge), **stat bars** in pixel blocks,
    the **price tag** (Dorras, `Lv n`, locked), **chips**, **toggles**,
    **sliders**, **empty states**;
  - **sheets**: on phones upright every menu is a bottom sheet over the
    lower part of the screen, its tabs within thumb reach, a grabber; on
    their side a side panel; on desktops a panel beside the city;
  - **motion** (`--ease`, `--in`, `--out`): a panel slides in from its
    edge and fades, tabs glide, a press drops the button; nothing moves
    and nothing blinks under reduced motion.
- **`menukit.ts`** (DOM, small, in the boot): `openMenu()` / `closeMenu()`
  (one at a time, focus moved in and given back, Esc and × close, a tap
  outside closes a drop-down), `tabs()` (click, swipe on phones, ←/→ and
  LB/RB), `focusNav()` (arrows and the d-pad move between the menu's
  buttons in a grid, A / Enter presses, B / Esc goes back; the selector
  shows where you are), `sheet()` (drag the grabber or swipe down to
  close), and the hints row (A Select · B Back · LB/RB Tabs, or the keys,
  by what's plugged in). Its rules (which button the d-pad moves to, the
  tab order, when a swipe closes) are DOM-free in `menunav.ts`, tested.
- **The sample: the gun store and workbench** rebuilt in the kit: the guns
  as cards in a grid (a bottom sheet with the guns in one swipeable row on
  phones), the picked gun's details, stats and mods beside it, the loadout
  slots, Buy / Equip / Mods; the d-pad and LB/RB through it all.
- Checked at 320, 375, 768, 1024 and 1440 wide, upright and on its side,
  by day and at night, with a mouse, touch and a gamepad, under reduced
  motion; the CSS budget measured.

The owner signs off the palette, the look and the feel on the gun store
before anything else moves to it.

**Built** (waiting on the owner's sign-off):

- `src/styles/menus.css` took `armoury.css`'s place in `Base.astro`'s order
  (the old file is gone; its `.pips` moved to `cards.css`, which the
  trainer's and the kart hut's menus still use). The pixel face is Pixelify
  Sans (Google Fonts, with the site's others). A menu is a `.mk` section:
  the element is the frame's colour and its `::before`, 2 pixels in, the
  fill with the scanlines, both cut by the same stepped `clip-path`
  (`--notch-4` / `-3` / `-2`). Parts: `.mk-bar` (`.mk-kind`, `.mk-title`,
  `.mk-wallet`, `.mk-x`), `.mk-marquee`, `.mk-tabs`, `.mk-body` and
  `.mk-page`, `.mk-cards` / `.mk-card`, `.mk-slots` / `.mk-slot`,
  `.mk-stats` (`.mk-bar-meter`: pixel blocks), `.mk-btn` (`is-main`,
  `is-small`), `.mk-mod` with `.mk-pips`, `.mk-confirm`, `.mk-note`,
  `.mk-empty`, `.mk-foot` with `.mk-hints` and `.mk-small`, `.mk-grab`.
  Desktops: a panel on the right under the header; tablets a centred card;
  phones upright a bottom sheet (the cards in one row that scrolls across,
  the grabber, no hints on touch); on their side a narrower side panel.
- `menukit.ts` is one call, `menuKit(el, { close, onTab })`, returning
  `showTab()`, `step()` (Q / E, LB / RB), `move()` (arrows, the d-pad),
  `press()` (Enter, A), `focusFirst()`, `input()` and `shown()`; a sideways
  swipe across the body steps a tab (not from inside the cards' row), the
  grabber's drag or flick closes; the hints row follows what you last used
  (`data-input`: keys, pad, touch). Opening one at a time, Esc and the tap
  outside stay with each menu's own code until the hub (Phase 2) gathers
  them. `menunav.ts` (DOM-free, `tests/menunav.test.ts`): `nextFocus()`,
  `tabStep()`, `swipeCloses()`, `swipeTab()`.
- The gun store (`gunshop.ts`, its markup in `CityMap.astro`): Guns and
  Workbench as tabs, the loadout's two slots, the guns as cards with the ▶
  selector, the picked gun's details, stats and actions; the workbench's
  mods with pips, or an empty state with a way back to the guns. walk.ts
  feeds it the d-pad, LB / RB, A and B / Y.
- Checked at 320, 390, 820, 1280 wide, upright and on its side, with a
  mouse, touch (swipe and grabber) and under reduced motion (nothing
  moves); the CSS went from 34.1 to 36.2 KB gzipped of its 60.

## Phase 2: the hub

One menu for everything that isn't a place or a shop: the PAUSE screen.

- Opens with **Esc** (walking, the first Esc still frees the mouse; the
  next opens the hub), the **hub button** in the header (it takes the
  ☰ Menu's place; on phones in the first row), and **Start** on a gamepad
  (the fight keeps Start for quitting while it's on). In the City view
  Esc closes what's open first, then opens the hub. Going back to the City
  view from walking moves into the hub.
- Tabs: **Map** (the world map inside it), **Bag** (the inventory and
  your loadout), **Business** (the business card), **Missions** (the
  board, the badges, Getting started), **Profile** (your look, the
  character screen, your player name, the wallet when there's a game
  server), **Places** (the old directory: every place, Walk here / Open),
  **Settings** (time, weather, sound, the walk controls: look speed,
  invert, first person, aim when firing; Online; Credits), and while
  walking **Emote** as a quick wheel off the hub button's long press.
- Walking it pauses the walk (Degen stands still, as at a counter); in the
  City view the city keeps turning behind it.
- Replaced: the ☰ Menu, ⚙ Settings and the walk tabs (their markup and
  styles go); the business card's own panel becomes the hub's tab (the
  Dorras readout opens the hub on it, the level pill on Missions); M still
  opens the map, Tab still opens the Bag, each now a tab of the hub.
- Everything a test reads stays where it is (the save, the walk settings'
  key `degen-city-walk-v1`, the guide's steps).

**Built** (waiting on the owner's sign-off):

- `hub.ts` (markup `[data-hub]` in CityMap.astro, styles `.mk-hub` at the end
  of menus.css): made by the page in a chunk of its own (`hubReady`), so it
  opens before the 3D city is up and where 3D can't run (then only Map, its
  comic and store links and X / Telegram: `.hub-3d` off); `bootCity(root,
  wallet, hub)` gives the city its hooks (`opened`, `closed`, `tab`).
- Opens from the header's ☰ Menu (`[data-hub-open]`, both modes), Esc (City
  view: after a panel or the emotes; walking: after the mouse is freed and
  whatever else Esc closes), Start walking (the fight keeps Start), the
  Dorras readout (Business) and the level pill (Missions). Esc, its ×, B or
  Start, and a tap outside close it. Walking it pauses the walk (Degen
  still, the mouse freed, the keys and the gamepad its own); the walk HUD's
  buttons and the hotbar step aside (`.is-hub`); its foot has **Back to City
  view**.
- Tabs: Map, Bag, Business, Missions, Profile, Settings, and Online with a
  game server. The old pop-ups' content moved in with its `data-*` hooks, so
  walk.ts, profile-ui.ts, multiplayer.ts and the start menu's Options work
  as before. ☰ Menu, ⚙ Settings, the level card and the walk tabs
  (Controls, Profile, Bag, Online, Map) are gone, and their styles with them.
- Where it differs from the plan above:
  - **Map** holds the World map button (M still opens it straight away), the
    places and the links. The world map stays its own full screen: it needs
    the room, and a canvas in a side panel would be worse.
  - **Bag** opens the inventory, also its own full screen (drag and drop
    across the grid), and "See what you carry" shows the business card's
    read-only Bag.
  - **Missions** is your level, XP and badges; the mission board and
    Getting started stay where they are (the Signal tower's panel, the
    City view's card).
  - **Emote** stays a small pop in the header while online (T opens it); the
    long-press wheel is left for later.
  - Start opens it while walking only: the City view doesn't read a gamepad
    yet.
  - The business card's insides keep their look until Phase 5.
- Checked at 320, 375, 768, 1024 and 1440 wide and on a phone on its side,
  in both modes, and with no 3D; every way in and out, Q / E past the
  hidden Online tab, the pills, a place from the list, the inventory from
  Bag, Back to City view. The CSS went from 37.2 to 37.4 KB gzipped of its
  60 (the old menus' rules went).

## Phase 3: the shops and game menus

The garage (Model, Paint, Wheels, Kit, Livery, Glow, Cars / Bikes), the
hangar, the kart hut (Race, Karts, Boards) with its results card, the
trainer (Spar, Bout, Record, Styles) with its bout card, the metro, river
bus and taxi cards: each in the kit, a bottom sheet on phones, the d-pad
and LB/RB through it. The race and fight HUDs keep their places on screen
and take the kit's type, bars and tags.

**Built** (waiting on the owner's sign-off):

- Rather than rebuild ~3,000 lines of these menus' markup and logic, they
  wear the kit through **the skin**: `.mk-skin` on each one's root (the
  garage, the hangar, the kart hut and its results card, the trainer and
  its bout card, the race and fight HUDs, their countdowns and pops, the
  metro and river bus cards, the ride bars, the business card), and at the
  end of menus.css: inside it the brand's tokens (`--pulse`, `--p-cyan`,
  `--pulse-wash`, `--font-display`, `--muted` and the rest) are the kit's,
  so every border, glow and small line drawn with them follows the arcade
  palette; corners go square, headings pixel, the panel takes the
  cabinet's fill, frame and stepped corners, the main action (`.shop-take`)
  is coin yellow and presses down, a pressed choice is lit coin, a picked
  card gets a coin frame, the stat bars are pixel blocks, the purple glows
  are gone. The paint swatches keep their paint.
- Tabs with Q / E and LB / RB: the kart hut and the trainer got
  `stepTab()` (the garage had it); the d-pad, A and B work as before.
- Checked by opening each at its door on a desktop and a phone (the
  garage, the hangar, the kart hut, the trainer, the metro card) and the
  business card in the hub. The CSS is 38.0 KB gzipped of its 60.
- Left for later: the HUDs' bars and tags keep their own colours (health is
  still red and green), and the walk HUD's prompt and hints are Phase 6's.

## Phase 4: the place panels and the City view

- One panel template for the ~30 places: the title bar (its number and
  kind, its name), the marquee strip (a line each, made-up, fixed copy),
  what it does, its actions (Walk in, Open, the closed note from the live
  settings), its own content mounted as today (the market hall, the
  Workshop's jobs, the records at the kart park and the Fight Club).
- The start menu as the arcade's attract screen (the logo, Single player,
  Multiplayer, Options, the draft note; built early, the owner's call, as
  The Trenches' title screen with its log-in screen first: start.css), the header slimmed (the switch,
  Dorras, level, the hub button), the welcome tip and Getting started as
  cards that don't pile on each other (one stack, under the header, the
  newest on top), the live banner.

**Built** (waiting on the owner's sign-off):

- The place panel (`.city-panel`, one shell for every place's template)
  wears the skin: the cabinet's frame and fill with stepped corners, the
  kicker as the kit's kind line with the place's number on a key, its name
  in pixels, and under it the **marquee strip**: a line each, made-up,
  fixed copy, on each template (`data-marquee`), put in by `open()` in
  index.ts (kept when the owner's live settings close the place). Its ways
  in (Walk in, Open the market hall, `.chip-link`) are the coin action; the
  closed note is the kit's warning line; the × a square key. Its content
  (the market hall, the Workshop's jobs, the records) is mounted as before,
  in the skin.
- The header wears the skin too (the City / Walk switch lit coin, the pills
  and the hub's button square, the mode title in pixels, the XP bar coin),
  and so do the City view's cards (`.city-hud`: the live banner, the
  welcome tip, Getting started), framed with stepped corners. They already
  stack under the header without piling up, so that's unchanged.
- The start menu was done early (the title screen).
- Checked at 1280 and on phones at 390, 375 and 320: the City view, the
  market hall, the kart park's and Liberty Bridge's panels, the header in
  both modes. No sideways scroll.

## Phase 5: business and missions

The market hall, the Workshop, Signal tower (news, contracts, the mission
board), the Post office, the Apartments and the Vault (worth, ledger,
loans, your save) in the kit: goods as cards with their price and trend,
the buy and sell steps as clear buttons, the ledger as a list, the loan
and the save's download and load as their own cards. The rules stay
`tycoon.ts`'s; the views still patch in place (`repaint()`).

## Phase 6: clothes, pops and the rest

Drop 001's fitting room and the character screen, the toasts, the badge
and level-up pops, the mission tracker, the compass, the hotbar, the
prompt: in the kit's type and shapes.

## Phase 7: polish and clean-up

Every menu checked at every width, upright and on its side, by day and at
night, with a mouse, touch and a gamepad, under reduced motion; the old
styles each menu left behind removed (and the PulseChain gradient with
them, wherever only the menus used it); the budgets measured and this plan
marked done.

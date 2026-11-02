# The menu plan

The owner's call (2026-11): "redesign all menus and upgrade their quality
and functions". Build it one phase at a time, each with the owner's
sign-off. Keep this file up to date.

## The owner's picks

- **Look: comic book on dark ink.** Near-black panels with a faint
  halftone dot texture, thick ink outlines and slanted panel edges like the
  Emporium comic page, the PulseChain gradient for highlights. It sits over
  the city by day and night and matches the city's own ink outlines.
- **Comic level: bold but readable.** Panel shapes, ink outlines, caption
  boxes for headings and tips, a speech bubble for a place's owner or GM.
  Plain words on buttons (no sound-effect words, no tilting panels).
- **Functions:** one hub menu, phone-first layouts, full controller and
  keyboard use. (3D previews in the shops weren't picked.)
- **The hub replaces the ☰ Menu, Settings and the walk tabs** (Controls,
  Profile, Online, Emote). It opens with Esc, a header button, or Start on
  a gamepad. Place panels and shops stay their own menus, in the same
  design.
- **Feel: motion only.** Panels slide and fade in, tabs glide, buttons
  answer a press; no UI sounds. Everything still under reduced motion.
- **Order: the design system first**, shown on one menu, then rolled out.

## What stays as it is

- The brand rules (`brand/README.md`): the gradient carries borders, rules,
  glows and large type; small text accents are `--p-cyan`; buttons are a
  gradient border with white text, never a gradient fill. Big Shoulders
  Display for headings, Inter for body, JetBrains Mono for labels.
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

## Phase 1: the ink kit, shown on the gun store

The design system, as CSS and a little code every menu then uses.

- **`menus.css`** (after the global styles in `Base.astro`'s order),
  tokens and parts:
  - the **panel**: dark ink paper (`--ink` with a halftone dot texture made
    in CSS, no image), a thick ink outline with the gradient as a thin
    inner rule, slanted corners by `clip-path` (the comic page's way:
    `--clip`), a drop shadow like a printed panel;
  - the **caption box** (the kicker and title: a slanted ink
    box, Big Shoulders, the gradient in large type), the **speech bubble**
    (a place's owner or the GM: one line of tip or flavour), the **close**
    button;
  - **tabs** (a strip of slanted tabs, the current one lit, a gliding
    underline), **buttons** (primary: gradient border and white text;
    secondary: ink border; danger; disabled with the reason), **list rows**
    and **cards** (a slanted card with an ink edge, the selected one lit),
    **stat bars**, the **price tag** (Dorras, `Lv n`, locked), **chips**,
    **toggles**, **sliders**, **empty states**;
  - **sheets**: on phones upright every menu is a bottom sheet over the
    lower part of the screen, its tabs within thumb reach, a grabber;
    on their side a side panel; on desktops a panel beside the city;
  - **motion** (`--ease`, `--in`, `--out`): a panel slides in from its
    edge and fades, tabs glide, a press dips the button; nothing moves
    under reduced motion.
- **`menukit.ts`** (DOM, small, in the boot): `openMenu()` / `closeMenu()`
  (one at a time, focus moved in and given back, Esc and × close, a tap
  outside closes a drop-down), `tabs()` (click, swipe on phones, ←/→ and
  LB/RB), `focusNav()` (arrows and the d-pad move between the menu's
  buttons in a grid, A / Enter presses, B / Esc goes back; a visible focus
  ring), `sheet()` (drag the grabber or swipe down to close), and the
  controller hints row (A Select · B Back · LB/RB Tabs, by what's plugged
  in). Its rules (which button the d-pad moves to, the tab order, when a
  swipe closes) are DOM-free in `menunav.ts`, tested.
- **The sample: the gun store and workbench** rebuilt in the kit: the guns
  as cards in a grid (a bottom sheet with the guns in one swipeable row on
  phones), the picked gun's details, stats and mods beside it, the loadout
  slots, Buy / Equip / Mods; the d-pad and LB/RB through it all.
- Checked at 320, 375, 768, 1024 and 1440 wide, upright and on its side,
  by day and at night, with a mouse, touch and a gamepad, under reduced
  motion; the CSS budget measured.

The owner signs off the look and the feel on the gun store before
anything else moves to it.

## Phase 2: the hub

One menu for everything that isn't a place or a shop.

- Opens with **Esc** (walking, the first Esc still frees the mouse; the
  next opens the hub), the **hub button** in the header (it takes the
  ☰ Menu's place; on phones in the first row), and **Start** on a gamepad
  (the fight keeps Start for quitting while it's on). In the City view
  Esc closes what's open first, then opens the hub.
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

## Phase 3: the shops and game menus

The garage (Model, Paint, Wheels, Kit, Livery, Glow, Cars / Bikes), the
hangar, the kart hut (Race, Karts, Boards) with its results card, the
trainer (Spar, Bout, Record, Styles) with its bout card, the metro, river
bus and taxi cards: each in the kit, a bottom sheet on phones, the d-pad
and LB/RB through it. The race and fight HUDs keep their places on screen
and take the kit's type, bars and tags.

## Phase 4: the place panels and the City view

- One panel template for the ~30 places: the caption box (its number and
  kind, its name), the owner's speech bubble (a line each, made-up, fixed
  copy), what it does, its actions (Walk in, Open, the closed note from the
  live settings), its own content mounted as today (the market hall, the
  Workshop's jobs, the records at the kart park and the Fight Club).
- The start menu redrawn in the kit (the logo, Single player, Multiplayer,
  Options, the draft note), the header slimmed (the switch, Dorras, level,
  the hub button), the welcome tip and Getting started as caption boxes
  that don't pile on each other (one stack, under the header, the newest
  on top), the live banner.

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
styles each menu left behind removed; the budgets measured and this plan
marked done.

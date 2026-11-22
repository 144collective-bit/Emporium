# The header and menu plan

The owner's call (2026-11-21): "work on the menu drop down and the header",
"remove the walk mode text that tells you which mode I'm in", and "optimize
the menu tab the same way we did with the settings" (`docs/settings-plan.md`).
In the menu plan's arcade kit (`docs/menu-plan.md`). Built in one go and
reviewed in one PR, as the settings were (the owner's pick). Keep this file
up to date.

## Where it started

- The header's left said which mode you were in: "Walk mode · Third
  person", "Driving · City Hatch", "City view · WASD to fly" (head.ts).
- City and Walk were two buttons side by side on wide screens (phones
  already showed only the one you'd go to).
- The hub's title read "The Trenches" on every tab.
- The Map tab was one list of 60 places, two cards a row, about 2,000 px
  tall, in no order a player could use; a place opened its panel.
- Missions showed the level, XP and every badge in one list, with the
  mission board a trip away at the Signal tower.
- Profile's rifle finishes were three buttons in a row.

## The owner's picks

- **The header's left: the game's title art, small** (`trenches-logo.png`,
  about 30 px tall), in every mode. The mode's name and line stay for
  screen readers only. (The controls plan's Phase 5 had taken the logo off
  the header; this is the owner's later call.)
- **One City / Walk switch** on the right: only the button that takes you
  to the other mode shows (a city icon and "City" while walking, a walker
  and "Walk" in the City view; the icon alone on phones).
- **The hints the title carried become toasts**: the City view's "WASD to
  fly · click to go in" (or the touch line) the first time you're in it,
  kept in the settings record's `hints`; getting into a vehicle, its name
  ("Driving · City Hatch") each time.
- **The hub's frame**: its title is the tab you're on ("Map", "Missions"…);
  the tab strip is slimmer on phones.
- **Map**: World map on top; a `‹ District ›` picker (the settings' kind)
  that starts on the district you're in, marked "Here", with All among its
  choices; then that district's places as single rows: the name and its
  line, a Soon tag on places coming soon, and two buttons:
  - **Go**, the best way there, its label saying which: in the City view
    **View** (fly there and open it); on foot **Go** (fast travel, a place
    you've walked to) or **Taxi** (one you haven't); in a vehicle or on a
    ride **Route** (sets the waypoint);
  - **◎**, set a waypoint there (X on a gamepad).
  More (the comic, the store, X, Telegram, PulseChain native) stays at the
  foot.
- **Missions**: the level and XP on top; sub-tabs Active · Badges · Done;
  Active has your missions with their bars, Claim and Give up (the board's
  own buttons); the Mission board button stays.
- **Profile**: the name and rank on top; the rifle finish a `‹ Field Olive ›`
  picker (a locked one reads its points still to go and can't be worn); the
  wardrobe's two buttons together.

## The districts

Fixed, in `maptab.ts` (`AREAS`, `AREA_OF`), checked against the guides:

| District | Places |
|---|---|
| Downtown | The Emporium, Drop 001, the Workshop, the Vault, the Armoury, Signal Tower, the Post Office, Apartments, the Fight Club, Liberty Bridge, Harbour Bridge |
| The Trenches | The Block, Club Pulse, the bar, Trench Arms, the Pier House, the Night Market |
| Westlake | The stadium, City Hall, police headquarters, the courthouse |
| Uptown | Sector 7 Tower, Palm Court, Starlight Mall |
| Crestmont | Its hotel, hall, golf club, overlook, reservoir, the Asterly, the Belvedere, the glasshouse, Vellano, Solenne |
| The Docks | The Harbour Master |
| Neon Mile | Its eight resorts and shows |
| Sunridge | Its club, park and school |
| Endswood | Home, Endswood, St Aldwyn's, Bunker Sound, the Brook & Lantern, Rosa's, Kestrel Fuel, the bus garage, the rec |
| Lot 9 | Lot 9 |
| Out of town | The airport, the kart park, Northgate Air Base |

"Here" is the district of the nearest of these places to you (walking) or
to where the City view looks.

## Bag and Business (the owner's next pick, 2026-11-21)

- **Business**: its Bag section gone (the hub's Bag tab is the one); Stall ·
  Units · Workshop · Car as the settings' chips, LT / RT on a gamepad; the
  till on top of every section, Collect the coin button while there's money
  in it; its own Dorras chip gone (the header has it). The owner asked for
  Car to show only once you own a car; every player owns the starter car
  from the start (`ownsCar()`), so it always shows.
- **Bag**: the weapon slots, then only what's in the bag (a row each: its
  art, name and count; Use on a snack or a boost, the hotbar's own use
  through walk.ts `useItem()`, so it works, or says why not, exactly as
  the hotbar does; greyed in the City view with "Use things on foot"); how
  full it is ("5 / 16"); the Armoury and the Night Market to get more; Open
  your bag on top while walking.

## The files

- `maptab.ts` (DOM-free, tested in `tests/maptab.test.ts`): `AREAS`,
  `AREA_OF`, `DIRECTORY` (the Map tab's order, which CityMap.astro builds
  from), `areaHere()`, `goAct()`, `GO_LABEL`, `soonSplit()`.
- `pickerkit.ts`: one `‹ value ›` picker's wiring (the ◀ ▶ held repeat,
  the kit's `mk-step`, a press on the value, a range's bar), used by
  `settings-ui.ts` and `hubtabs-ui.ts`.
- `hubtabs-ui.ts` (its own chunk, loaded the first time Map or Profile
  shows: hub.ts): the Map tab's picker, rows, Go and ◎; Profile's finish
  picker.
- `hubhooks.ts`: what the city fills in for the hub's tabs (the travel
  actions, where you are), as `settings-store.ts` `actions` do.
- `missions-ui.ts`: the Missions tab's sub-tabs and Active rows.
- `head.ts`: the switch, the toasts; the logo is the page's.

## Status

Built in one go (the owner's pick), waiting on the owner's sign-off.

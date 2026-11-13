# The home plan: Degen's house in the Ends

The owner's call (2026-11): "Degen needs a home with a garage. Preferably in
the Ends estate ... functional, with space for a car and a bike on the
driveway." The owner's answers:

- **Where:** the end of a terrace in Endswood carried west.
- **The garage and driveway:** home base. The car waits in the garage and the
  bike on the driveway; "Bring my car home" sends them here; the garage's
  door opens the same customise menu as the city garage, which stays open.
- **The house:** walking starts here, with Home on the world map and in fast
  travel; a walk-in interior; a wardrobe inside (Drop 001's fitting room);
  a stash for what the bag doesn't carry.
- **Whose:** his from the start, every save.

**What comes next** (the owner's call, 2026-11-13): the home moves to a compound of its own in the Ends' far
west, `docs/ends-far-west-plan.md`. That plan's Phase 2 is built: the home is the compound now, and the end house of row `rn2` is a neighbour's again.
What follows is how the first home was built; the room, the stash, the wardrobe and the garage's rules carried over.

## The plot

Nothing that stands moved. The rows fill their blocks from the lane to the
cross path, so there's no room to add a house to one: Degen's is the west
end house of the row that backs onto the Close (endswest.ts row `rn2`,
endsterraces.ts house `rn2-0-2`: two storeys, red brick, a pitched roof, its
front on the green). Behind it the back garden reaches almost to the Close,
and beside it lies the strip between the row's end and the service lane:

- **The garage** stands in the back garden, as long as the garden is wide,
  a yard between it and the house's back door, its up-and-over door in its
  west wall.
- **The driveway** is that strip, 3 by 7 tiles, from the house's back corner
  to the Close, a dropped kerb at its foot; open to the lane along its west
  side too. A car's bay along the lane's side and a bike's by the garage's
  wall, both clear of the garage's door.

The terrace made room: that garden has no shed, gate or washing, and its
fences stop at the garage's walls. The neighbours' are as they were.

## The phases

Each with the owner's sign-off.

1. **The house, the garage and the driveway; the place** (built, waiting on
   the owner's sign-off). `home.ts` (DOM-free, the boot's, tested in
   `tests/home.test.ts`), drawn by `home3d.ts` (a site in the estate's
   chunk). Spot `home`: its pin over the roof, a panel with Walk in, the
   front door's prompt ("Home", which opens the panel until the house can
   be gone into), on the world map and in fast travel. Walking starts on
   his front path (it started by the Emporium); `?spawn=` still says
   otherwise. Shots: `docs/home-shots/`.
2. **Home base** (built, waiting on the owner's sign-off). The garage is
   hollow, its door up (`HOME_SOLIDS`: four walls, the opening clear;
   inside a strip light, a workbench, shelves, tyres). garage.ts keeps two
   sets of stands for the same car and bike: **home** (`CAR_HOME` in
   Degen's garage, nose to its door; `BIKE_HOME` on its bay on the
   driveway) and **the city garage's** turntable and stand, a showroom the
   two come to only while that garage's menu is open (`garage.at()`).
   Everything that asked the garage where the car is at home (getting in,
   its door, taking it out, the menu's camera, Keep's "Bring my car home",
   a reload) reads the stand it's on, so all of it happens at home now.
   The car at home is solid to walk round (`drive.blocks()`). The garage
   menu opens at his garage's door too (`HOME_GARAGE_DOOR`, the prompt
   "Garage"), its camera out on the driveway looking in (`HOME_VIEW`).
   A new player's very first walk starts downtown by the Emporium, every
   one after it at home (`startsAtHome()`, the owner's call). The smoke
   test's car scene starts in his garage and drives out through its door,
   and a scene opens the garage menu there. Shots: `docs/home-shots/`.
3. **The interior** (built, waiting on the owner's sign-off). The ground
   floor is one room inside the house's own walls (`ROOM`, a ceiling
   `CEIL` over the slab): the hall down the west wall from the front door
   to the back door, the stairs boxed in, a sofa under the front window
   facing the telly across a low table, the kitchen along the back wall (a
   counter, the fridge, a table and stools), the wardrobe and a trunk
   (`FURNITURE`; the last two are Phase 4's). **The doors are fades**, as
   the lifts are (`HOME_PORTALS`, index.ts `rideTo()`): "Go in" at the
   front door and at the back door in the yard, "Front door" and "Back
   door" inside; the house stays sealed, so nothing else gets in. The
   terraces' solid leaves his house out and home.ts has its four walls
   (`HOME_SOLIDS`); inside its footprint walking asks `homeWall()` (the
   room's walls and furniture) in place of the city's solids, and the
   camera stays under the ceiling (`HOME_CAMERA`). His front door is under
   a plain canopy (a porch's box stood where he steps in). The yard opens
   onto the driveway through a gate. Drawn by home3d.ts without shadows,
   so it's evenly lit. The front door no longer opens the panel (the City
   view's click still does). Shots: `docs/home-shots/phase-3-*`.
4. **The wardrobe and the stash.** A wardrobe by the stairs opens the
   fitting room (fitting.ts, as Drop 001's panel does); a cupboard opens
   the stash: guns and items not carried (the inventory's bag, its rules in
   inventory.ts, a `stash` in the save with its migration).
   *Built.* Two prompts in the room (`HOME_USES` in home.ts, walk
   `places`): **Wardrobe** opens the fitting room in Drop 001's panel
   (index.ts `open('shop', true)`, so the owner's live switch for Drop 001
   closes it too), and **Stash** at the trunk opens the stash's card
   (stash-ui.ts, a chunk of its own): snacks put away and taken out one at
   a time (`stashItem()` / `takeItem()` in inventory.ts; the trunk holds
   `STASH_MAX` 20, he carries `ITEM_MAX` 5), the guns he owns and doesn't
   carry listed as the gun rack (`racked()`), and "Change weapons", which
   opens the inventory, where his weapons are changed as anywhere. The
   save's `stash` is cleaned by `cleanStash()` in `cleanSave()` (a save
   from before it has nothing put away; the save's version is unchanged,
   and it's inside the business save, so the backup already carries it).
   The smoke test has a scene for each (`homestash`, `homewardrobe`).
5. **Polish.** *The first part is built (ahead of Phase 4, the owner's
   call):* the room and the garage are lit at night (their inside faces
   are the shared `neon()` paint, which the night doesn't darken, shaded by
   hand: home3d.ts's `paint()`, `icube()`), the lamp over the garage door
   has its pool on the driveway (`PORCH_POOLS`), no rain is drawn while
   you're in the house (`sky.setIndoors()`), and the street's sound comes
   through the walls faintly, over a quiet hum (`home` in ambience.ts).
   *The rest is built too:* the panel has its live line (livelines.ts
   `home`: the day at his house, the lights on after dusk), `?bench` has a
   view of the house from the Close's corner (`ends-home` in bench.ts), the
   smoke test covers the stash and the wardrobe (Phase 4), and the stash,
   the wardrobe and the panel are checked at every width. **The plan is
   complete.**

## Decided along the way

- **The city garage** is a showroom with the same menu: its turntable and
  bike stand are empty until its menu is open, when your car and bike
  stand there to be looked at, and go home when it closes.
- **A new player's first walk** starts downtown, where Getting started's
  first steps are; every walk after that starts at home.

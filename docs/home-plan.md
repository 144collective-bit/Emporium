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
   otherwise. The garage is shut and the driveway empty: the car and the
   bike still live at the city garage. Shots: `docs/home-shots/`.
2. **Home base.** The garage opens: the car inside it, the bike on its bay;
   getting in and out there; "Bring my car home" (the garage menu's Keep, a
   reload) sends each here; the garage's door opens the garage menu, its
   camera on the car in the garage; the city garage keeps its menu and its
   turntable as a showroom. What it touches: garage.ts (the turntable's
   car), drive.ts (`bring()`, where each vehicle is at home), mybike's
   stand, garage-ui.ts's camera, walk.ts's prompts. The smoke test's car
   scene moves here.
3. **The interior.** The front door lets you in: one room downstairs
   (a sofa and a TV, a kitchen along the back wall, the stairs boxed in),
   walked as the mall's hall is (its own floor, walls and camera limits),
   the house's solid hollowed for it, a back door onto the yard. The
   estate's first interior.
4. **The wardrobe and the stash.** A wardrobe by the stairs opens the
   fitting room (fitting.ts, as Drop 001's panel does); a cupboard opens
   the stash: guns and items not carried (the inventory's bag, its rules in
   inventory.ts, a `stash` in the save with its migration).
5. **Polish.** Lights on at night and a porch light's pool, a line for the
   panel, a `?bench` view, the smoke test's home scene grown to cover the
   garage, the interior and the wardrobe; checked at every width.

## Open questions for later phases

- The city garage after Phase 2: a showroom with the same menu (the answer
  given), so which car stands on its turntable? Proposed: none, until one
  is being looked at in the menu there.
- New players start walking in the Ends, about 400 tiles from the Emporium
  and the market hall where Getting started sends them first. A taxi or
  fast travel gets them there; if that proves a poor first minute, the
  first walk could start downtown and every one after it at home.

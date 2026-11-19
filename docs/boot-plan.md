# The boot plan: room under the boot's budget

The boot's code (`bootJs` in `scripts/budget.mjs`) had reached 749.9 KB of
750 (2026-11-19, after the south's tube). The owner's call: take places'
drawing out of the boot, as the mall's already is, so there's room for
what comes next. Nothing moves, and the budget isn't raised.

## The pattern

A place keeps at the boot only what the rest of the city needs before its
drawing comes:

- its spot: the pin, the hover ring, its buildings as plain boxes on the
  `PICK` layer (never drawn) for the City view's click;
- its people (the crowd's list is made at the boot), its trees and lamps
  (`addTree()`, `addLamp()`), its parked cars;
- anything the game asks of it before it's drawn, kept and shown when the
  drawing comes.

Its drawing is built on the main thread into the spot's group when its
district loads as you approach (`LAZY_DISTRICTS`, docs/guide/performance.md),
and the district hands the group to `place()` (`register()`'s new option,
`DistrictModule` in sitework.ts): index.ts compiles it and queues its far
form, as it does for the places the boot draws. The textures it paints are
baked like any district's (the bake loads the districts in turn).

## Phases (each with the owner's sign-off)

1. **The kart park and the stadium** (built, 2026-11-19).
   - `kartspot.ts` (the spot, the show bay, the people, trees, lamps and
     cars; `KART_VIEW` now keeps the LED screens' order and the trophies
     too, for `show` to paint) at the boot; kartpark3d.ts `drawKartPark()`
     from the grounds' chunk (kartgrounds3d.ts).
   - `stadiumspot.ts` (the spot, the match night's queue, the car park's
     cars) at the boot; stadium3d.ts `drawStadium()` from Westlake's chunk
     (westlake3d.ts).
   - What changes on screen: both are drawn as you approach (with their
     grounds), not from the start. On phones the kart park's trees are a
     different 60% (their own seeded draw, no longer after the drawing's).
2. **The Fight Club, the Night Market and the avenue's three places**
   (Club PULSE, The Rusty Nail, Trench Arms): the same, in chunks of their
   own on The Trenches' and the south bank's land. To do, after Phase 1's
   sign-off.

# The spawn plan: Degen wakes up at home

The owner's call (2026-11-18): "can we have degen spawning in to his house upon loading. This will then allow time
to load the rest of the needed assets." The owner's answers:

- **Where:** in the living room (home.ts `ROOM`), by the sofa, straight into Walk mode. Single player no longer
  flies in over the City view first; the City / Walk switch still goes out to the City view.
- **What covers the loading:**
  - **The doors wait.** The front and back doors' prompts read "Getting ready…" until the street outside is built,
    then "Go out" as now. Nothing outside is ever seen half-built.
  - **The curtains.** The room's two windows (front, over the sofa; back, over the counter) have curtains drawn
    while the city loads, and they open when it's ready. (The windows are painted panels today, not glass you see
    through, so the curtains are the "ready" sign, not what hides the city.)
  - **The wake-up.** He gets up off the sofa as you arrive: a second or two of cover, and a start that feels like
    his morning.
- **Who:** every player, new ones too. A new player's first walk no longer starts downtown by the Emporium
  (`startsAtHome()` goes); Getting started's beam points the way from the house.

**Status:** planned, nothing built. Each phase with the owner's sign-off.

## Today, measured

How start-up runs now (`CityMap.astro` `enter()`, index.ts `bootCity()`): the title screen covers the page while
the whole city boots behind it (`await booted`: the ground, the landmarks, downtown, the outer districts, traffic and
the crowd, the trees and lamps, the sky, every shader compiled, the built textures), and only then can Single player
go in, with the fly-in over the City view. Walk starts at home for a returning player (in the yard,
`HOME_SPAWN`), and Degen's compound is drawn by the south's chunk (`LAZY_DISTRICTS` `south`, `home3d.ts`), which loads
only once he's near it.

Measured on 2026-11-18, headless Chromium on software graphics (slow, so read the numbers against each other, not
as a real phone's), the built textures not baked (painted in the browser), a fresh save:

*(the timings are being taken; they go here before the plan is signed off)*

What it says: to follow with the timings.

## The phases

1. **Spawn in the room.** Single player (and Multiplayer, where it's on) goes from the title screen straight into
   Walk mode in the living room: a new spot `HOME_WAKE` in home.ts (in `ROOM`, in front of the sofa, facing the
   telly, clear of `FURNITURE`, tested), for every player (`startsAtHome()` and its first-walk rule go; `?spawn=`
   still wins). The south's chunk and the compound's sites are asked for first (`works.wantView()` on the room,
   the district ahead of the rest), so the room is there before the title screen lifts. **The doors wait**: a
   DOM-free rule (`spawn.ts`, tested, on `DOM_FREE`) says when the street is ready (the districts round the
   compound loaded, no site waiting within reach of the gates); until then the four portals' prompts read
   "Getting ready…" and F does nothing but a short toast. The City button's first trip out flies to the home view,
   as the fly-in did. The smoke test starts in the room (its scenes that start elsewhere keep `?spawn=`), and gets
   a scene for the doors waiting. Getting started's first step is unchanged; its beam and the walk tracker point
   from the house.
2. **The wake-up and the curtains.** He's on the sofa as the room appears and stands up (moments.ts's sit-down and
   stand-up, the seat being the sofa); under `prefers-reduced-motion` he's standing already. Curtains on the two
   windows (home3d.ts, a pair each side, near only), drawn while the street isn't ready and drawn back when it is
   (a short slide, or a swap under reduced motion). Their colour is fixed paint (no runtime colour change on a
   shared material). Shots for `docs/spawn-shots/`.
3. **The boot split (the real saving).** The title screen waits only for what the room needs: the renderer, the
   sky, Degen and walk mode, the compound (its own small chunk, out of `south3d.ts`), their shaders. Then you're in,
   and the rest of the city's boot (the landmarks, downtown, the outer districts, traffic and the crowd, the trees
   and lamps, the far forms) builds behind the walls in slices between frames, as the sites do, with the doors
   waiting on it. Measured with `?bench` and `?fps` before and after, on the phone tier too; the budgets
   (`scripts/budget.mjs`) not raised. `?bench` and the texture bake keep the whole boot first (they need
   everything there). The riskiest phase: much of the boot expects the city to exist (places, pins, solids,
   the crowd), so it's done in small steps, each with the smoke test.
4. **Polish.** A small loading line in the room while the street gets ready (in `chrome`), the copy (draft), the
   room's light by day and at night with the curtains, every width (320, 375, 768, 1024, 1440, phones on their
   side), the guide files (`menus.md`'s start menu, `endswood.md`'s home, `performance.md`'s start-up,
   `walk-mode.md`), and the home plan's note that walking starts in the room.

## Open questions for the owner

- **Getting started's first step** is stocking the stall at the market hall downtown, a long way from the house.
  Keep it (the beam and a taxi or the car get you there), or add a first step at home ("Head out": walk out of the
  front door), which changes `GUIDE_STEPS` and needs a migration?
- **The City view** is still there behind the City button. Should the title screen keep a way straight into it
  (say a "City view" line under Single player), or is the room the only way in?

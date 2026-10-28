# Degen's clothes: fabric looks and the suit's tailoring

The owner's call (28 October 2026): after the clothing plan
(`docs/clothing-plan.md`: no clipping, smoother shapes, all five phases
built), the clothes get **fabric looks** and the **suit** gets its
tailoring detail. This is the plan and its phases; build it one phase at a
time with the owner's sign-off, and keep this file up to date as each one
lands.

## What the owner asked for

- **Fabric looks: a subtle grain** (the owner's pick from: subtle grain,
  grain plus sheen, sheen only). A faint weave, knit, twill or ripstop
  inside the toon shading, read close up (the character screen, the
  fitting room, walking) and fading to flat colour further off. Still
  Degen: flat cartoon shading, black ink outlines, the brand art's look. No
  sheen (satin, gloss): materials are told apart by their grain only.
- **Tailoring detail: the suit** (the owner's pick from: the suit, the
  casual tops, joggers and shoes, the accessories). The casual tops, the
  joggers, the shoes and the accessories keep the detail they have.
- **Who gets it** (no preference given, so the clothing plan's rule): the
  suit's new geometry on single figures on the desktop only; the fabric on
  single figures on desktops and phones (it's in the shader, nearly free in
  triangles); the crowds as they are. Draw calls stay where they are (3-5 a
  figure).
- Nobody loses a piece they own or what they're wearing (`cleanLook()` and
  the save don't change), and nothing clips (`tests/clothing.test.ts`,
  `tests/accessories.test.ts`).

## Where it stands (28 October 2026)

- **Every cloth is one flat colour.** A single figure's skinned pieces
  share one material (`plainMat` in character.ts: `toon()` coloured per
  vertex), so a wool jacket, a cotton shirt, a silk tie, a knit balaclava
  and leather shoes read the same but for their colours. The only pattern
  is the merch's all-over print (`patternMaterial()`: a tiling mask laid on
  from three sides at the cloth's rest position, so it moves with the
  cloth); the fabric can work the same way.
- **The suit has the shapes but few of the details.** The jacket (`JACKET`,
  the cutaway hem), notched lapels, two hip pocket flaps, the pocket square,
  the shirt front, collar band and collar points, the tie's knot and blade,
  the shirt cuffs and the trousers' crease are there. Missing: the
  buttons (one plain disc at the waist), the breast pocket's welt, the
  lapel's buttonhole, the pick stitching along the lapels and pockets, the
  sleeve buttons, the jetting on the pocket flaps, the back vent, the
  collar's stand and roll, and the tie's dimple.
- **The boot's code is full:** 669.8 KB of its 670 (`npm run budget`), and
  the wardrobe is in the boot (the crowds need it). The budget is never
  raised to get a build through, so new code has to load when it's used,
  or room has to be made first.

## How it's built

- **The fabric is a shader on the single figures' material**, from a small
  module loaded after the boot (its own chunk; until it lands the clothes
  are flat as today, then the figures' material takes it, as the crowd's
  motion capture swaps in):
  - Each vertex says which fabric it's cut from. The uv the plain pieces
    carry is zeros (`plain()`), so a piece's fabric id rides in its uv at no
    cost in memory; the fabric of a piece comes from a DOM-free table
    (`fabrics.ts`: by item and colour key, so the jacket is suiting, its
    lapels the same, the shirt poplin, the tie silk, the balaclava knit),
    with `Piece.fabric` where one piece differs.
  - The grain is laid on from three sides at the cloth's rest position, as
    the print is. A skinned mesh's own `position` and `normal` attributes
    are its rest pose before skinning, so the grain needs no copies of them
    (the print's `rest` / `restNormal` copies can go too, a little memory
    back).
  - It changes the colour only (a few percent lighter and darker in the
    weave's pattern), never the normals or the depth, so the ink outlines
    stay as they are and the toon bands keep their edges. It fades with
    distance from the camera (gone by a few metres) and is lighter on
    phones.
  - The grain tiles are small canvas textures (`canvasTex()`, so they're
    baked at build time with the rest) in one atlas, a cell a fabric.
- **The suit's tailoring is geometry on single figures on the desktop**, in
  the wardrobe's own way: flat pieces laid on the jacket (`onBody()`,
  `crisp` where an edge must ink solid), small turned or extruded parts
  (buttons), `tape()` strips for stitching. Phones and crowds keep today's
  suit. If the boot can't take the code, these pieces come from the same
  lazy module as the fabric, and the player's figure is rebuilt when it
  lands.
- **Checking it:** the lab (`?anim`) gets a fabric switch (`fabric=0` to
  compare) and a close-up of the cloth; the clipping and accessories tests
  run on the new suit; the budget passes at every phase.

## Phases

0. **Room in the boot.** Before anything new goes in, measure what the
   fabric and the suit's details cost in the boot's code and make that
   room without raising the budget: the fabric's module loads after the
   boot (it isn't needed to draw the first frame), and anything the boot
   carries only for single figures on the desktop moves out with it.
   Nothing on screen changes.

   **Built** (28 October 2026): the boot's code 669.8 → 662.5 KB of its
   670, 7.3 KB of room, from two things the boot carried but never used
   until you went to them:
   - **The trainer's menu** (`fight-ui.ts`: the Fight Club's menu, HUD,
     pops and bout card) loads the first time the trainer opens it, as the
     gun store's and the garage's menus do (`lazyMenu()` in walk.ts); the
     City-view panel's record is `fight-records.ts`, in the boot on its own.
   - **The kart race's rules** (`kart-sim.ts`) load with the race: the
     cups the boot reads (the save, the hut's prompt, the panel's records)
     are `kart-cups.ts`, re-exported by kart-sim.ts.
   - The suit's new pieces are wardrobe data (a few KB) in the room made
     here. Checked: the trainer's menu opens and a spar starts, the
     hut's menu opens, every test passes.
**Cancelled** (the owner's call, 28 October 2026): the fabric texture
work, Phases 1 and 2 below, is stopped. Every cloth stays one flat colour,
and nothing of the fabric kit is in the code. The suit's tailoring
(Phase 3) and the checks (Phase 4) still stand, waiting on the owner.

1. **The fabric kit** (cancelled). The fabric table, the id in the uv, the grain
   shader on the single figures' material, one atlas of grain tiles, the
   fade with distance, the lab's switch. Every garment starts on a plain
   "cloth" grain, faint, to check it moves with the cloth, never swims or
   shimmers, keeps the ink outlines clean and costs next to nothing (the
   benchmark before and after, desktop and phone).
2. **The fabrics** (cancelled). A grain for each kind of cloth the wardrobe has:
   suiting (a fine twill), shirting (poplin), the tie (a fine silk weave),
   knit (the balaclava, the beanie, the cuffs' rib), fleece (the hoodie),
   tricot (the track top), nylon ripstop (the puffer, the fatigues), melton
   wool and smooth leather (the varsity's body and sleeves), cotton twill
   (the cap), jersey (the joggers), leather (the dress shoes) and canvas
   (the sneakers). Each checked close up on every colour it can be worn
   in, the dark outfits too, in the character screen and the fitting room
   by day, at night and in the studio light.
3. **The suit's tailoring.** The jacket's buttons (two, with holes and a
   thread cross, and the buttonholes they go through), the breast pocket's
   welt (the pocket square in it), jetting along the pocket flaps, the
   lapel's buttonhole, pick stitching along the lapels' edges and the
   pockets, four buttons on each sleeve, the back vent, the collar's roll
   at the back of the neck, the shirt collar's stand, and the tie's knot
   with its dimple. Desktop single figures only; the clipping test holds
   it through the poses and the animator, and the cost is measured against
   the plan's desktop budget.
4. **Checked everywhere.** The five widths in the character screen and the
   fitting room, the lab, the city on the phone tier and on desktop, by day
   and at night; the costs and the boot's code recorded here.

## Not in this plan

- Sheen (satin, gloss, a material's own light): the owner picked the grain
  alone.
- Tailoring detail on the casual tops, the joggers and shoes, and the
  accessories (the owner picked the suit).
- The crowds' fabric and detail, new clothes, the dark outfits'
  readability on their own, and the animation.

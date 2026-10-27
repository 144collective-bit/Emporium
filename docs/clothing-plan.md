# Degen's clothes: no clipping, smoother shapes

The owner's call (27 October 2026): the clothes need to be higher quality,
and there is clipping. This is the plan and its phases; build it one
phase at a time with the owner's sign-off, and keep this file up to date
as each one lands. It follows on from `docs/character-plan.md` (the
skinned body, the bones, the wardrobe rebuilt on them), which stays the
record of how the body was built.

## What the owner asked for

- **No clipping:** nothing worn shows through what's over it, in any pose
  the game plays (standing, walking, running, sprinting, crouching,
  sliding, jumping, the emotes, the moments, seated in the kart, the car
  or the boat, fighting, armed).
- **Higher quality means smoother shapes** (the owner's pick from: smoother
  shapes, tailoring detail, fabric looks, dark outfits readable): rounder
  silhouettes with no faceting, better proportions and fit (the shoulders,
  the waist's taper, how trousers sit on the shoe). Tailoring detail,
  fabric looks and the dark outfits' readability are not part of this
  plan; they can be a later plan if the owner asks.
- **Budget: more on desktop only** (the owner's pick). A single figure on
  desktop may take about twice today's triangles; phones keep today's
  level; the crowds are unchanged. Draw calls stay where they are (3-5 a
  figure).
- **Every piece** (the owner picked all four, in this order): bottoms and
  shoes, the suit, the casual tops (hoodie, track, varsity, puffer), the
  accessories (the cap and hats, the shades and their chain, bags, the
  watch, things in the hand).
- Still Degen: ink outlines, flat cartoon shading, the brand-art look.
  Nobody loses a piece they own or what they're wearing (`cleanLook()`
  and the save don't change).

## Where it stands (measured, 27 October 2026)

Rendered in the animation lab (`?anim`) with the top and the trousers in
contrasting colours, every outfit, standing, crouching, sprinting and
waving.

- **The clothes are the body.** There's no body under them: the jacket's
  loft (`SUIT` in `items()`, character.ts) is the torso, the trousers'
  tubes are the legs. Each garment is a closed shell built from
  cross-sections (`loft()`), with flat details laid on it (`onBody()`,
  `surface()`: lapels, pockets, zips, stripes).
- **The trousers come through the hem** on the suit, the hoodie and the
  track top: standing, waving, running and worst of all crouching, where
  the blue shows in jagged patches round the hips. Why:
  - The top's hem and the trousers' tops are weighted differently
    (`weigh()` in skeleton.ts). Below the waist the jacket is about 35%
    `spine1`, 15% `hips` and over each thigh up to 50% the leg; the
    trousers' top is 50% `hips` and 50% the leg, and none of it the spine.
    When he leans (a crouch, a sprint, the hips' sway) the two layers move
    apart and the inner one comes out.
  - Each leg is three closed shells (`pelvis`, `trouserThigh` /
    `joggerThigh`, `trouserShin` / `joggerShin`) overlapping at the hip
    and the knee, so their ends cross each other as the joints bend.
- **Laid-on details lift off:** the track top's sleeve stripes stand off
  the shoulders as separate plates when the arms come forward (seen from
  the front, crouching); the lapels streak where the chest bends.
- **The shades' chain** hangs in a long loop from the head bone, so it
  swings out in front of the chest when he bends forward.
- **The puffer's edge** is a sawtooth (its baffles) all down the sides.
- **Faceting:** the single figure's rings are 16-22 segments (`R()` at
  detail 2), so silhouettes are polygonal close up (the character screen,
  the fitting room); the shoes are boxy, the shoulders blocky in the suit.
- Today a single figure is about 13-15k triangles at detail 2, the same on
  phones and desktop (one level for every single figure).
- `character.ts` imports `kit.ts` (canvas textures), so nothing in it can
  load in the Node tests; the garments' shapes have no tests today.

## How it's built

- **Layers.** Every garment has a layer (the trousers under the shirt,
  the shirt under the jacket, the jacket under the bags and the chain). An
  outer layer, where it covers an inner one, is weighted the same as the
  inner one under it, so they move together, and stays a fixed gap
  outside it. (As built: over the trunk every layer is weighted by where
  it is alone, one field, `trunk()` in skeleton.ts.)
- **The garments' shapes as data** in a DOM-free module (as built,
  `wardrobe.ts`: the outfits, the shapes and `items()` moved out of
  character.ts whole), so the tests can dress, pose and check the figure.
- **A clipping check** (`tests/clothing.test.ts`): the skinned figure's
  vertices posed on the CPU through the poses the game plays (the rubric's
  programs, the crouch, the slide, the emotes, the seats, the fight's
  guard), and every inner layer's vertex held inside the layer over it.
- **The lab's clipping view** (`?anim&clip`): the outfit's layers in
  contrasting colours, so a clip shows at a glance.
- **A desktop detail level** for single figures (more ring segments,
  smoother curves, finer laid-on details), picked by the quality tier;
  phones build today's.

## Phases

1. **The kit and the clipping fixes.**
   - `garments.ts`, the clipping check and the lab's clipping view (above).
   - The trousers and joggers as one continuous skinned piece (waistband,
     seat, crotch and both legs down to the shoe) in place of the three
     overlapping shells a leg.
   - The tops' hems weighted as the trousers under them; the gap held.
   - The laid-on details (stripes, lapels, pockets, zips) weighted from
     the surface they lie on, so they bend with it.
   - The chain hung from the neck and chest so it lies on him; the
     puffer's edge smooth (its baffles kept as lines across it).
   - Every outfit checked in the lab and in the city: nothing comes
     through, nothing else moves.

   **Built** (27 October 2026):
   - `wardrobe.ts` (DOM-free): the outfits, `lookOutfit()`, the shapes
     and `items()`, out of character.ts (which keeps the materials, the
     figure, the crowd, and the soldiers' rifle, as guns.ts can't load in
     Node); `restSkin()` is a piece at rest with its bones, what the
     figure and the crowd are skinned with and what the test poses.
   - **The trunk's weights** (`trunk()` in skeleton.ts): the torso, the
     pelvis and the legs down to `LEG_FREE` (0.17 under the hips) are
     weighted by where a point is, whatever it's part of. From 0.12 over
     the hips to 0.08 under, the waist goes partly with the hips and half
     with the legs; under the hems (from `HEM_Y`, a hair under the
     longest) all of it the legs'. The share is the same all the way
     across the body (a share that changed across it bent each layer by
     where its own vertices happened to be), and the legs share it across
     the middle over 10 cm (wider than any layer's vertices are apart),
     each leg's own under the hems. What the test found on the way, worst
     depth through the top: the old weights, 4.9 cm; one field, 2 cm;
     trousers in one piece, 2 cm (the jacket's sparse rings); rings every
     2 cm, 1 cm; the gentler ramp and the wider split, under 2 mm.
   - **Trousers in one piece** (`trousers()`): the trousers, the joggers
     and the fatigues each a seat from the waist to the crotch (`SEAT`,
     inside every top's hips with 5 mm or more to spare), the crotch
     where the legs' inner halves meet, and both legs to the cuff through
     a knee of close sections; every point the legs share one vertex. The
     tops and the seat carry a ring every 2 cm through the hips (`fine()`;
     not on the far crowd).
   - **The details:** laid-on pieces (`onBody()`: lapels, pockets, the
     shirt, zips) shade smooth (they looked crumpled, a flat triangle at a
     time); the track's stripes are flat tape lying on the sleeves and
     legs (`stripe()`), ending short of the cuff; the puffer's baffles are
     rounded pillows from seam to seam (`quilt()`, four sections a baffle:
     two made the sawtooth); the shades' chain runs from the ears past the
     jaw over the collar onto the chest of whatever top he wears, clear
     of the lapels, tie, zip and snaps (`chainOn()`, an item a top).
   - **The check:** `tests/clothing.test.ts` with `tests/dress.ts` (the
     figure dressed and posed on the CPU the way the GPU skins it): every
     outfit through 40 keyed poses (walk and run cycles, sitting, the
     slide, a deep crouch, high knee, lunge, kick, side step, twist, side
     bend), the emotes, every fight clip and the animator walking,
     running, sprinting, stopping and crouching; the trousers stay inside
     the top (coming out under the hem is only the trousers showing) and
     the top outside them, within 2 mm (2.8 mm at full size).
     `CLOTHING_REPORT=1` prints the worst and where it was at rest.
   - **The lab:** `?anim&clip` dresses him in colours far apart.
   - **Cost**, triangles a figure, before and after (single figure / near
     crowd / far crowd): suit 14.6k → 15.5k / 7.9k → 8.5k / 3.0k → 3.2k;
     hoodie 12.9k → 13.7k / 8.2k → 8.9k / 3.1k → 3.2k; track 15.0k →
     15.4k / 9.1k → 9.2k / 4.1k → 3.7k; varsity 13.2k → 14.1k; puffer
     14.5k → 16.5k (its rounded baffles; no crowd wears one). Draw calls
     unchanged. The boot's code grew 1.5 KB gzipped (669.8 of its 670).
   - **Left for later phases:** a speck of the jacket can show at the top
     of the shirt's V with an arm raised high (Phase 3 rebuilds the
     collar); the test holds the trousers and the top, not yet the sleeves
     over the hands or the collar round the neck.
2. **Bottoms and shoes, smoother.** The desktop level first (it's what the
   rest builds on). Trousers and joggers: rounder sections, the seat and
   the knee, the break over the shoe, the joggers' cuff gathered. Shoes:
   the dress shoe and the sneaker re-profiled (a rounded toe box, the
   heel, the sole's curve), the boots.

   **Built** (27 October 2026):
   - **The desktop level** (`Detail` 3 in wardrobe.ts): single figures on
     the high and medium tiers (`figureDetail()` in character.ts, set by
     index.ts from the tier; phones keep 2). Rings half as many again
     (`R()`), laid-on details bent over 2 cm, and `curve()`: sections
     every 2 cm (1.5 cm on a shoe) on a smooth Catmull-Rom curve through a
     shape's own, so a silhouette bends instead of breaking at each
     section. The lab builds it by default (`detail=2` for the phone's;
     `at` sets the height the camera looks at, 0.08 for the shoes).
   - **Trousers and joggers:** the legs curved from the upper thigh down
     (the rows under the crotch stay as they are: the top's hem swings
     over them); the break, the cuff cut on a slant (`trousers()`'s `hem`:
     longer at the back, over the heel) over a soft fold just above the
     shoe; the crease laid on the leg as it's built; the joggers gathered
     at the cuff (a fuller shin pulled into the ribbing), their stripes on
     the same sections.
   - **Shoes:** each a loft along its length (`shoe()`, `ShoeSec`: a
     section's half-width, bottom and top), in place of the extruded side
     profiles: the heel and collar, the instep, a rounded toe box
     (`toe()`: an ellipse's share of the last section, rising a little),
     on a sole worked out from the upper (`sole()`: wider, from the ground
     to over the upper's edge, past heel and toe; the dress shoe's lifted
     in front of its heel block). The sneaker's laces and stripe lie on
     its top and side. The boots the same way, taller.
   - **What the test found:** finer tops over the hips met the trousers'
     crotch at a sprint (the extra vertices of the hem fell between the
     trousers' own), so on the desktop the tops' bodies keep the phone's
     ring count until Phases 3 and 4 smooth them (`TR()`) and the trousers
     take 28 (`LEGS`); every outfit holds within 2 mm at both levels.
   - **Cost**, triangles a figure, before and after (single figure on a
     phone / on a desktop / near crowd / far crowd): suit 15.5k → 14.8k /
     25.8k / 8.5k → 8.2k / 3.2k → 3.3k; hoodie 13.7k → 13.9k / 22.8k /
     8.9k → 8.6k / 3.2k → 3.4k; track 15.4k → 15.6k / 23.6k / 9.2k → 8.9k /
     3.7k → 3.9k; varsity 14.1k → 14.2k / 23.8k; puffer 16.5k → 16.7k /
     25.5k (the crowd's shoes take every other section, the far crowd's
     every fourth). Draw calls unchanged.
   - **The boot's code:** the new shapes cost 0.4 KB gzipped; the fight's
     rules came out of the boot (the moves and styles moved to
     `fight-moves.ts`, which the screens and the save read; fight-sim.ts
     loads with the fight), 4.3 KB, so it's 665.9 of its 670 (669.8
     before).
3. **The suit, smoother.** The jacket's shoulders, chest and waist taper,
   the hem's curve, the sleeves' taper to the cuff, the lapels and collar
   lying flat on a smooth chest, the shirt and tie.
4. **The casual tops, smoother.** The hoodie (the hood's shape round the
   neck, the pouch), the track top, the varsity, the puffer, and the
   soldier's fatigues.
5. **The accessories, smoother.** The cap and every hat seated on the
   head, the shades, the chain and the necklace, the bags on the back, the
   watch, the things in the hand.

Each phase is checked at the five widths in the character screen and the
fitting room, in the lab, and in the city on the phone tier (nothing
changes there but the clipping fixes) and on desktop. The tests and the
budget pass at every phase.

## Not in this plan

- Tailoring detail, fabric looks and the dark outfits' readability (the
  owner didn't pick them this time).
- New clothes, new marks or prints, the crowd's detail levels and the
  animation.

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
  outside it.
- **The garments' shapes as data** in a DOM-free module (`garments.ts`:
  the cross-sections, their layers, the gaps), read by `items()`, so the
  tests can pose the figure and check it.
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
2. **Bottoms and shoes, smoother.** The desktop level first (it's what the
   rest builds on). Trousers and joggers: rounder sections, the seat and
   the knee, the break over the shoe, the joggers' cuff gathered. Shoes:
   the dress shoe and the sneaker re-profiled (a rounded toe box, the
   heel, the sole's curve), the boots.
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

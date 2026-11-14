# The character: the body, the clothes, the tailoring

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

- **The character rebuild** (the owner's call, critical) is planned in
  `docs/character-plan.md`: a skinned body on real bones built in code, the
  brand-art head, every wardrobe piece rebuilt, grounded hand-keyed
  animation, merch-store logos on the clothes (Dorras and levels), a
  character screen, phones first. Build it one phase at a time with the
  owner's sign-off. Phase 1 (the skinned body, head, hands and feet),
  Phase 2 (walking and running, `locomotion.ts`), Phase 3 (guns and
  fighting on the new bones: `gunfit.ts`, `stance.ts`, the fight clips)
  Phase 4 (merch marks and prints on the clothes, the Merch tab, the
  character screen) and Phase 5 (the crowds and soldiers on the new body,
  skinned on the GPU from baked clips; fighters and other players stepping
  with planted feet) are built: every figure in the city is the one body.
- **The clothes** (the owner's call: higher quality, no clipping) are
  planned in `docs/clothing-plan.md`: layers that move together (an outer
  garment weighted as what's under it, a gap held), the trousers as one
  piece, the garments' shapes as DOM-free data with a clipping check in
  the tests and a clipping view in the lab, then smoother shapes (bottoms
  and shoes, the suit, the casual tops, the accessories) on a desktop
  detail level, phones and crowds as they are. One phase at a time with
  the owner's sign-off; keep it up to date. Phase 1 (no clipping),
  Phase 2 (bottoms and shoes, smoother), Phase 3 (the suit, smoother),
  Phase 4 (the casual tops, smoother) and Phase 5 (the accessories,
  smoother) are built:
  - The wardrobe is data: `wardrobe.ts` (DOM-free: the outfits,
    `lookOutfit()`, the shapes and `items()`; `restSkin()` is a piece at
    rest with its bones, what `createDegen()` and the crowd skin with);
    character.ts adds only the soldiers' rifle (guns.ts draws it).
  - The trunk is one weight field (`trunk()` in skeleton.ts): the torso,
    the pelvis and the legs down to `LEG_FREE` are weighted by where a
    point is, not what it's part of, so every layer over the hips bends as
    one: the waist down to the hips partly the hips and some of the way
    each leg, all of it under the hems (`HEM_Y`, a little under the
    longest), the legs shared across the middle wider than any layer's
    vertices are apart. Never give one layer weights of its own there.
  - The trousers, joggers and fatigues are one piece each from the waist
    to the cuff (`trousers()`: a seat, the crotch, both legs and the
    knee), inside every top's hips with room to spare (`SEAT`); the tops
    and the seat carry a ring every 2 cm through the hips (`fine()`, not
    on the far crowd) so their faces bend with the field.
  - Laid-on details (`onBody()`) shade smooth; the track stripes are flat
    tape on the cloth (`stripe()`); the puffer's baffles are rounded
    pillows (`quilt()`); the shades' chain lies on each top's collar and
    chest (`chainOn()`, an item per top, `chain-<kind>`).
  - `tests/clothing.test.ts` (with `tests/dress.ts`: dressed and posed on
    the CPU as the GPU skins him) holds every outfit's trousers inside its
    top and the top outside them, within 2 mm, through keyed poses, the
    emotes, the fight's clips and the animator running, sprinting and
    crouching; `CLOTHING_REPORT=1` prints the worst. Shells it checks are
    pieces with `shell` (`top`, `bottom`). The lab's clipping view is
    `?anim&clip` (the top, trousers and shoes in colours far apart).
  - The desktop level (Phase 2): `Detail` 3, single figures on the high
    and medium tiers (`figureDetail()` in character.ts, set from the tier
    in index.ts; phones keep 2): more ring segments, and `curve()`
    (sections every 2 cm on a smooth curve through a shape's own) on the
    legs from the upper thigh down and the shoes. The tops' bodies keep the
    phone's rings there (`TR()`) and the trousers take 28 (`LEGS`) until
    Phases 3 and 4: finer tops met the crotch at a sprint. The test checks
    both levels; the lab builds 3 (`detail=2` the phone's, `at` the height
    the camera looks at).
  - Trousers end in a break (`trousers()`'s `hem`: the cuff on a slant,
    longer at the back, over a soft fold); the joggers gather into the
    cuff. Shoes are lofts along their length (`shoe()`, `ShoeSec`), a
    rounded toe box (`toe()`), on a sole worked out from the upper
    (`sole()`); the crowd's take every other section, the far crowd's
    every fourth (`up()`).
  - The suit's jacket is its own sections (`JACKET`, curved on the
    desktop at the full ring count; the varsity and fatigues grow from it),
    its hem cut away at the front (`cutaway()`), its sleeves
    `UPPER_J` / `FORE_J`. Its laid-on pieces are `crisp` (their outline
    split as finely as the bend, their sides kept apart from their faces
    when smoothed, so their edges ink solid): set it round new pieces that
    need it rather than for everything (on the long thin ones, the zips and
    the crease, it costs thousands of triangles).
  - The casual tops (Phase 4): `smooth()` on the desktop (curved sections)
    at `TOP_RINGS` 30, a count two more than a multiple of four so the
    middle of the back falls between two ring points (one on it, or just
    off it, sank into the trousers' seat at a sprint); the puffer's body
    in two on the desktop, its hem at 22 (`SEAM`). Their shoulders are the
    jacket's line and their sleeves the suit's lower head (`LOOSE_U`); the
    hood down is a roll swept round the neck (`hoodDown`); zips and the
    placket are `tape()` strips (bevelled sides, a few hundred triangles),
    never outlines laid on.
  - The accessories (Phase 5): every hat seated on the head the figure has
    (`headRow()` / `inHead()` in body.ts): the cap and the beanie carried
    out from the head's outline (`headShell()`), the other hats sized to it
    (`fitTo()`), every band held just off it, brow and all (`snug()`), a
    ring's sag added to every gap (`SAG`) so the crowd's clear it too; the
    cap's brim from the crown's base (`brimSweep()`); the shades' arms back
    along the head past the ear (`armPath()`), the chain hooked on them;
    bags, boards and the necklace on each top's own outline
    (`TORSOS`, `OVER`, items `backpack-<kind>` and the rest; straps laid on
    by `strapOver()`); the watch on the wrist riding the hand; a held
    thing's handle in the fingers' hook (`HOOK`, `handle()`), the cup
    against the fingers' front. `tests/accessories.test.ts` holds the hats
    clear of the head at every level and the held things clear of the
    fingers. The lab takes `wear=` and `at=x,y,z`.
- **The suit's tailoring** (the owner's call, after the clothing plan) is
  planned in `docs/tailoring-plan.md`: the suit's tailoring detail
  (buttons, the breast welt, stitching, sleeve buttons, the vent, the
  collar's roll, the tie's dimple) on desktop single figures only; the
  crowds as they are. The fabric looks (a grain in the cloth) were
  cancelled by the owner: every cloth stays one flat colour. Phase 0 (room
  in the boot's code: the trainer's menu and the kart race's rules load
  when used), Phase 3 (the suit's tailoring) and Phase 4 (checked at every
  width, on both tiers, by day and at night) are built, and the plan is done: `tailoring()`
  and `sleeveButtons()` in wardrobe.ts, only at detail 3 (`tailor` in
  `items()`): horn buttons (`HORN`, `buttonAt()`) with holes and thread and
  their buttonholes (`slit()`), four on each cuff, the breast welt, the
  flaps' jets, the lapel's buttonhole, pick stitching (`stitches()`: flat,
  with the cloth's own normals so the ink leaves them alone; `inset()`),
  the back vent and seam, the collar rolled round the back of the neck, the
  shirt collar's stand (thickened outward, clear of the neck's knit) and
  the tie's knot rounded over its dimple; `tests/tailoring.test.ts` holds
  it to the desktop.

- Every character is one shared Degen body (`src/scripts/city3d/character.ts`),
  sculpted after the brand art at human proportions (about 1.3 tall at
  scale 1, six and a half heads, hips `HIP_HEIGHT` 0.62), with knees,
  elbows, wrists (`Limb.wrist` { roll, bend }, zero by default so nothing
  moves unless a pose asks; fighting turns the fist) and hand sockets. It's
  drawn at one size for everyone (**`FIGURE_SCALE` 0.66** in figure.ts,
  re-exported by skeleton.ts, DOM-free so the game server reads it too; the
  owner's call, `docs/scale-plan.md`: your Degen on foot and at the wheel,
  other players, the crowd and the Fight Club's fighters (`FIGHTER_SCALE`),
  about 0.86 tiles tall; kids keep `KID`). The fight's lengths and speeds
  (fight-moves.ts `MOVES` from `AT_WAS`, the strike heights and the styles'
  dodges; fight-sim.ts `T`, the bots' distances; combat-sim.ts `MELEE`; the
  ring's camera; brawlsite.ts `GAP`) are written for fighters at 0.85
  (`WAS_SCALE`) and brought down by `SIZE_K`. Everything
  of his own size came down with him in proportion: his speeds, jump and
  gravity, the vault's heights, his radius, the walk camera, the moments'
  marks, the car seats, kart wheel and pedals and the bikes' seats, bars
  and pegs; the animator's thresholds are in rig numbers, so it plays as
  it did, and the motion rubric (human.ts) measures him at its adult,
  0.85, his world scaled up to it. Anything new sized to him goes
  through `FIGURE_SCALE`.
  - **The skeleton** is `skeleton.ts` (DOM-free, tested in
    `tests/skeleton.test.ts`): 34 bones (`BONES`: hips, `spine1`, `spine2`,
    `chest`, neck, head; per side collarbone, arm, forearm, hand, index
    (`idx1`/`idx2`), the other three fingers (`fin1`/`fin2`), thumb
    (`thb1`/`thb2`), thigh, shin, foot, toes; L is the rig's -x side).
    The proportions (`HIP_Y`, `SHOULDER_X/Y`, `UPPER_ARM`, `PALM_Y`,
    `THIGH`, `NECK_Y`, `HEAD_Y`) feed `reachArm()`, so gun holds and the
    kart's wheel follow them; the walk camera's eye height (`walk.ts`) and
    the bench seat (`SEAT_DROP` in `life.ts`) follow the body too. The old
    rig's frames live on (`Joint`: `torso` is a frame on the chest where
    the one-piece torso was, the hands are the old sockets), so callers
    attach guns and held things as before; `torsoFrame()` gives the torso
    frame for a pose before posing (the kart's wheel grips).
  - `poseSkeleton()` maps a `Pose` onto the bones: the spine shares the
    lean and twist, the neck a share of the head's turn, the collarbone
    shrugs when an arm goes over the shoulder (never for a gun or a wheel),
    the feet ease towards level and the toes bend when a foot tips onto
    them, and `grip` closes each hand (0 open, 1 a fist; read once per
    `update()`: fighters default to fists, a held thing to a hold, and
    `holdGun()` sets it every frame).
  - `weigh()` weights every vertex by what it's part of (its old joint, or
    `region: 'shoe'`) and where it is at rest, passing smoothly across each
    joint (shoulders take a collarbone share; the trunk by where a point
    is alone, `trunk()`, so a top's hem and the trousers under it bend as
    one); `bone` pins a piece to one
    bone unbent (bags and boards on the chest); `skin` gives a piece
    its own weights per vertex (the fingers).
  - **The head and hands** are `body.ts` (DOM-free, tested): the balaclava
    after the brand art (`HEAD_ROWS`, `headGeometry()`: a tall oval with a
    flatter front, nose ridge, cheekbones, brow over the eye sockets, jaw,
    chin and the neck tube down into the collar; `headFront()` lays the eye
    opening, its knit rim and the shades onto it) and the hands
    (`handParts()`: wrist, palm, thumb pad, four fingers and a thumb, each
    vertex weighted, sized by `HAND` in skeleton.ts: a tenth of his height
    wrist to fingertip, the palm a hand's thickness; relaxed, the fingers
    curl a little, `RELAXED`; `bakedHand()` sets one solid at a grip, for
    the first-person hands in `viewmodel.ts`). His hands hold only weapons
    (`docs/wardrobe-plan.md` Phase 1, the owner's call: the coffee, boombox,
    phone and briefcase were retired with `heldpose.ts`, as the gummy bag
    was before them; saved looks that held one come back empty-handed). The
    crowd keeps its phones (`held: 'phone'`) and shopping bags
    (`held: 'shopping'`), riding the hand bone unbent.
  - **Walking and running** are `locomotion.ts` (DOM-free, tested in
    `tests/locomotion.test.ts`), for your Degen in walk mode
    (`createLocomotion()`; walk.ts feeds it his position, velocity,
    facing, the ground (`groundAt`) and whether he's in the air, copies
    its pose onto his (`copyPose()`) and places him with `placeRoot()`).
    The feet are planted in the world: each stays where it lands while
    the body moves over it, and the other swings to where the body will
    be when it lands (ahead along the way he's going, by `fore` of the
    stride), at the ground's height there, so nothing slides walking,
    jogging, sprinting, turning, strafing or backing up (aiming), on
    kerbs, slopes and stairs; the tests hold a planted foot to under
    4 mm. Two-bone leg IK (`reachLeg()`, skeleton.ts's beside `reachArm()`) puts each ankle where its foot
    needs it; the foot keeps its own heading and pitch (`Limb.foot`,
    `footYaw`, `footRoll`, `toe`) and rolls heel, flat, then onto the ball
    with the toes flat; the hips (`Pose.sway`, `turn`, `bob`) come down
    when a planted foot would be out of reach, and ease back up.
    `gait()` sets the rhythm from the speed in leg lengths a second
    (`CADENCE` worked out so a stance always stays in reach; Degen's walk
    speed is a jog for his legs, his run a sprint): steps a second, time
    on the ground, lift, hip drop, lean, arms; the gait follows the speed
    over a few steps. A sprinting leg folds up under him. Standing, he
    stops with both feet down and steps a foot back under him when he
    turns or drifts (turning on the spot); the idle breathes and shifts
    its weight, and after a while with the camera still he looks round.
    Upper body: arms swing with the opposite foot, the pelvis turns with
    the forward leg (square while armed) and the shoulders against it,
    the body leans into speed, starts, stops and bends (`root.roll`).
    Landings are keyed clips (`LANDINGS`: soft, crouch past `LAND_CROUCH`,
    a forward roll past `LAND_ROLL` on the run; `root.pitch` about
    `root.pivot`); in the air the legs tuck. Emotes keep the planted legs
    (the dance has its own).
  - **Shoulders: natural athletic** (the owner's call): every top's
    cross-sections slope from the neck down to the shoulder (the
    trapezius, no padded shelf), the body stopping short of the arm's
    outside, and the sleeve's cap is a low rounded deltoid running down
    into the arm, round over the outside of the shoulder (`JACKET`, `HOODIE`,
    `UPPER_J`; the rest grow from them). Check new tops from the front and back running
    in the lab (`?anim&outfit=hoodie`, ...).
  - Shapes are built from cross-sections (`loft()`, superellipse rings) and
    flat details laid onto them (`onBody()` with `surface()`: lapels, the
    shirt V, the tie, pockets; zips and plackets are `tape()`). Shoes are
    lofts along their length (`shoe()`).
  - The wardrobe is `items()` in `wardrobe.ts`: each item (`head`, `cap`, `suit`, `hoodie`,
    `joggers`, `backpack`, `watch`...) has a `when` rule on the `Outfit` and
    pieces on joints, each a fixed colour or an outfit colour (`shade`
    darkens or lightens it: lapels, ribbing). New clothes are new items.
  - **The separates** (`docs/wardrobe-plan.md` Phase 2): the top, the
    bottoms and the shoes are items of their own, worn in any pairing:
    `trousers`, `joggers` (and track pants, the joggers with
    `trackStripes`), `dressShoes` and `sneakers`, picked by `bottomsOf()` and
    `shoesOf()` (the outfit's `bottoms` / `shoeStyle`, or what its top comes
    with: the crowd's, `bottomsFor()` / `shoesFor()`); the suit's shirt,
    collar and cuffs take the outfit's `shirt` colour (the crowd's the shirt
    white). Every bottoms is cut on the one `SEAT` inside every top's hips,
    so `tests/clothing.test.ts` holds every top over every bottoms (both
    detail levels, every pose); the shoes' uppers are `shell: 'shoe'` and
    the same file holds each bottoms over each shoe to no deeper into the
    upper than the pairings the clothes were built in (`ANKLE`: at the
    ankle, as the foot flexes, the legs' cloth goes some way into the shoe
    in every pairing, the original ones too; the plan's Phase 5 rebuilds the
    shoes and the laces, which stand out past the sneaker's side).
  - Four detail levels (`Detail`): 3 for single figures on desktops and 2
    on phones (`createDegen()`: the player, other players, the fitting
    room, the hologram; about 23-38k triangles at 3, 14-17k at 2, by what
    he wears, held under 40k and 18k by `tests/wardrobe.test.ts`;
    `figureDetail()` sets which), 1 for crowd people near the camera (the new head, fingers
    and shoes at a crowd's detail, about 7-9k; the phones' `light` crowd
    leaves out the `detail` pieces), 0 for crowd people further away (`far`:
    plain boxes for rounded ones, the head coarser, block hands instead of
    fingers, no ears or nose; about 2k).
  - `createDegen()` builds the skinned body (`items(q, true)`: the hero
    wardrobe, with the new head, fingers and shoes on the feet) as one
    `SkinnedMesh` coloured per vertex, plus one each for the lenses, the
    patches and the raised hood, all on one `Skeleton` (3-5 draw
    calls a figure, never frustum-culled); things in the hand stay solid on
    the hand bone. `dispose()` frees a figure's geometry and bones. A
    material swapped onto a figure (the hologram's `ShaderMaterial`, a
    fighter's hit flash) must handle skinning (three's skinning chunks).
    `createCrowd()` (pedestrians, soldiers) is the same skinned body
    (`items(q, true)`) drawn instanced (performance phase 3): at each level
    everyone of one outfit kind (suits, hoodies, soldiers) shares one
    `InstancedMesh` per material, holding every item anyone of that kind
    wears (an item's pieces of one colour, `crowdGeometry()`, its bones and
    weights as `crowdIdx` / `crowdWt`; each vertex's colour key and item as
    `crowdSlot`). A person's row in the wardrobe (`crowdWardrobe`,
    `addWardrobe()` in crowdskin.ts, one float texture for every crowd:
    their colours by `COLOR_KEYS`, and in each item's column whether they
    wear it; `crowdAnim.w` is the row) says what they wear: items they don't
    fold to a point in every pass. Group by kind, never across kinds (a
    hoodie would carry every suit's vertices); the kinds a crowd carries
    are `CROWD_KINDS` in `crowdlook.ts` (suit, hoodie, track, puffer) and
    `CROWD_KINDS_LIGHT` on phones (track only added: one kind more than the
    two they had, the owner's call; every kind is one more set of meshes a
    detail level). **What the crowd wears** is `crowdlook.ts` (DOM-free,
    tested in `tests/crowdlook.test.ts`; the polish plan's Phase 8):
    `cityOutfit(r, { district, role, kinds })` from `STYLES` a district
    (`districtAt(x, z)`: Uptown's suits and coats, The Trenches' hoodies
    and track, the park's bright casual, hi-vis on the Docks' and Yards'
    workers, Crestmont's pale suits, the Neon Mile's party colours, the
    cove, Sunridge, Lot 9, the mall, the airport, the kart park, the town
    everywhere else) with the role's rules first (`roleOf()`: joggers and
    cyclists in track, kids bright with the cap back, bouncers in black),
    seeded from each person's number (`seeded()`), so no two neighbours
    match; life.ts dresses everyone by where they'll be, and a spare slot
    filled later is dressed again through `Crowd.dress()` (colours and the
    items its kind's meshes carry; the kind stays). A new district gets a
    style in `STYLES` and a line in `districtAt()`. Skinned on the GPU (`crowdskin.ts`: `injectCrowdSkin()` in every
    pass that draws them: their materials (`crowdVersion()`), their
    shadows (`crowdDepth()`) and the ink outlines' normal pass in
    `post.ts`, where everything else reads `crowdOn` 0) from one float
    texture of baked clips (`crowdclips.ts`, DOM-free, tested in
    `tests/crowdclips.test.ts`): `walk`, `jog` (Westlake Park's joggers)
    and `march` recorded from the planted-feet walk (locomotion.ts) over one
    cycle, played at their stride (`WALK_STRIDE`, `JOG_STRIDE`,
    `MARCH_STRIDE`: a person at scale s and speed v plays v / (stride s)
    cycles a second, so their feet stay put), `idle`, `look`, `chat`, `sit`
    and `picnic` (sitting on the ground) from the formulas in `poses.ts` over
    `CLIP_SECONDS` with the end eased into the start, and `salute` from
    attention to the hand at the brow. Callers set each person's clip and
    how far through it they are (`set(i, x, y, z, yaw, scale, clip, u)`;
    `crowdFrame()` picks the two rows and the blend); the CPU never poses
    a crowd. Every frame each person in view takes one instance in each of
    their kind's meshes (those with anything they wear), at their level: near within `CROWD_NEAR` (12, 8 on phones)
    of the camera, far beyond, and not at all out of the view or past
    `CROWD_FAR`. The city fills `CROWD_VIEW` (camera position and view,
    and the sun's shadow box, `sky.shadowFrustum()`) each frame in
    `index.ts`; people in the shadow box take instances from the front,
    the rest from the back (moved up behind them at `commit()`), and the
    shadow map draws only the front ones. Under reduced motion it's off and
    everyone is drawn near. A new crowd move is a new clip in `CLIP_DEFS`.
  - Outfits (`suit`, `hoodie`, `track`, `soldier`) only change clothes and
    colours; poses come from the helpers in `poses.ts` (DOM-free; walk/run
    by formula, idle, look, chat, sit, march, attention/salute, dance, the
    emotes), re-exported by `character.ts`. The Fight Club's fighters
    (`fight-figure.ts`) and other players (`remote.ts`) step with the
    planted-feet walk (`createLocomotion()` each, fed where they're drawn);
    a fighter's guard fades to it while moving round the ring. The cap patch is the Emporium
    diamond (the crowd's always; your own can carry another of the city's
    made-up marks): never put another brand's logo on it. Whites on clothes are
    `SHIRT`, a shade under white, so they don't bloom.
  - **The merch** (single figures only; `createDegen()`): marks (`MARKS`
    in `profile-data.ts`, their art in `marks.ts`: SVG paths in a 100 box,
    drawn into one logo atlas, `logoAtlas()`) printed as `decal()`s laid on
    the cloth's own surface (`onFront()`, `onBack()`, `onSleeve()`), pieces
    with `mat: 'logo'` and `logo` (which mark: the top's, the hat's, the
    sneakers' or the varsity's badge, `markFor()`; `atlasUV()` points the
    square at its cell) in the outfit's `ink`; the top's mark goes on the
    chest (a lapel pin on the suit, the badge on the varsity), big on the
    front or back, or on the left sleeve (`TOPS` in `items()`); hats and
    the varsity carry a cream patch with the mark a touch in front. The
    top's all-over print (`pattern`) puts its own cloth (colour `top`, no
    shade) on `patternMaterial()`: a tiling mask laid on from three sides
    by where the cloth is at rest (`rest` / `restNormal`), so it moves with
    it. A mark replaced by the merch store's real art is a change to its
    art in `marks.ts` only; check it against the content rules.

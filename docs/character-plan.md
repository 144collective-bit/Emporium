# Degen, the character: the plan

The owner's call: the character is a main part of the game, with deep
customisation and a look of his own. Raise the level of detail a long way
without hurting performance (phones first), make the head match the brand
art instead of round, add clothing with the merch store's designs on it,
and make the animations much, much better. Built in phases, each signed
off by the owner before the next starts.

## What the owner asked for

- **Head:** match the brand art: a tall oval balaclava with a flatter crown
  under the cap, a nose ridge, a defined jaw and cheekbones, the eye hole's
  edge round the shades and the long neck tube down into the collar. Same
  ink-outline cartoon style.
- **How it's made:** in code, as one smooth **skinned** body on real bones
  (no outside tools; everything stays in the repo and under test).
- **Animation:** hand-keyed clips in code (like the fight clips today),
  **grounded and realistic**: weight, momentum, feet that plant. Most
  important: **walking and running**, then **guns and fighting**.
- **Clothing with logos:** the designs from the owner's real **merch
  store**, taken from the store's product images and from cleaner files the
  owner sends. **Placeholder designs for now** (made-up marks in the city's
  style, standing in until the real merch art goes in). Players **pick from
  that set** (no uploads, nothing typed);
  the logos are bought with **Dorras and levels**, like the premium
  wardrobe. Never another company's logo, and nothing that reveals the
  token (the store is public, and so is the site).
- **Performance: phones first.** Detail goes into shape and motion before
  triangles; every level stays tight enough for low-end phones.
- **Camera:** third person by default while walking (first person a key
  away), plus a **character screen**: a full-body turntable with poses,
  emotes and close-ups.
- **The wardrobe:** every piece today (suit, hoodie, track, varsity,
  puffer, the hats, bags, things in the hand, the premium pieces players
  bought) is **rebuilt** on the new body, so nobody loses what they own or
  what they're wearing.
- **Who:** your Degen, other players, the fitting room and the hologram
  first; crowds, soldiers and the Fight Club's opponents in a later phase.

## Where it starts from

- `character.ts`: one shared body of **15 rigid parts** on a simple rig
  (pelvis, one-piece torso, head, upper arms, forearms, wrists, hands,
  thighs, shins). No spine chain, collarbones, ankles, toes or fingers, and
  no skinning, so knees, elbows and shoulders show seams and can't bend
  smoothly; the shoes are stuck to the shins.
- The head is a rounded loft; the brand art's balaclava is taller, flatter
  on top and has a face (nose ridge, jaw, cheeks).
- Poses are formulas (`walkPose()` and friends: sine waves). No foot
  planting, no heel-toe roll, no starts, stops or turns, no blending
  between moves; the feet slide.
- The fight clips (`fight-anim.ts`) are proper keyframed clips: the base
  the new animation system grows from.
- Budget today: about 12k triangles and about 15 draw calls for a single
  figure (`createDegen()`), 6k / 1.5k for crowd people near and far.

## How it's built

- **The skeleton** (`skeleton.ts`, DOM-free and tested): about 30 bones:
  root, pelvis, three spine bones and the chest, neck, head; collarbones,
  upper arms, forearms (with a twist share for the wrist roll), hands, a
  thumb and two finger groups (index, the rest), each curling in two
  joints; thighs, shins, feet, toes. Real human proportions at Degen's
  height (`HIP_HEIGHT`, the arm and leg lengths) so the walk camera, the
  bench seat and the gun holds keep working.
- **The body** (`body.ts`): built from cross-sections like today
  (`loft()`, superellipse rings) but as **one continuous skinned mesh**:
  torso, arms and legs share their seams, each vertex weighted to its two
  nearest bones with a smooth falloff across every joint (shoulders take
  a collarbone share, knees and elbows keep their volume). The hands get
  shaped fingers; the feet bend at the ankle and the toes.
- **The head:** a new balaclava sculpted after the brand art, rigid on the
  head bone (the neck tube skinned between chest and head). The shades,
  their cord, the cap and every hat sit on the head bone.
- **Clothes as skinned layers:** each garment is a shell grown out from
  the body's own cross-sections (a looser fit for a hoodie, a sharp
  shoulder for the suit), weighted like the body under it so it moves with
  it; collars, cuffs, lapels, pockets, zips and seams laid on with
  `surface()` as today. Hats, shades, bags and things in the hand stay
  rigid on their bone.
- **Fewer draw calls, not more:** a figure's body and every garment merge
  into **one skinned mesh** coloured per vertex (today: about 15 draws a
  figure), plus one for its logos (a shared logo atlas) and one for any
  neon. So the detail goes up while the draws come down.
- **Detail levels:** hero (you, other players, the fitting room, the
  character screen, the hologram) and light (phones' hero); crowds keep
  their instanced levels until Phase 5. Budgets (to be measured with
  `?fps` and held by a test on triangle counts): hero about 18-22k
  triangles on desktop, about 10-12k on phones; up to 4 bone influences
  on desktop, 2 on phones.
- **Poses stay compatible:** today's `Pose` (arms, legs, lean, twist,
  head) maps onto the new bones, so every caller (walking, driving, the
  kart seat, sitting, emotes, gun holds, the fight clips) keeps working
  while each is upgraded in turn.
- **The look and the save don't change shape** in Phase 1: `Look`,
  `cleanLook()` (here and on the server), owned premium pieces and the
  saves all carry over as they are.

## Build order

### Phase 1: the new body and head (built)

What's in (for the owner's sign-off):

- `skeleton.ts`: 34 bones (a three-bone spine, neck, collarbones, ankles,
  toes, and per hand the index, the other three fingers together and the
  thumb, two joints each), the old rig's frames kept so every caller works
  unchanged, `poseSkeleton()` (spine and neck share the turns, collarbone
  shrug over the shoulder, feet easing level, toes bending, `grip` closing
  the hands) and `weigh()` (smooth weights across every joint).
- `body.ts`: the brand-art balaclava (taller, flatter in front, nose ridge,
  brow over the eye sockets, cheekbones, jaw and chin, the neck tube into
  the collar, a knit rim round the eye opening; the head now sits on a
  longer neck, the crown about 3% higher) and the hands with fingers.
- `createDegen()` is one skinned body on those bones for you, other
  players, the fitting room, drivers, fighters and the hologram: 3-5 draw
  calls a figure instead of 15-17, about 13-15k triangles instead of
  11-13k. The whole wardrobe rides it (same items, names, colours and save
  values); the shoes ride the feet; bags and wings stay unbent on the
  chest. Fists are the same hands closed; gun holds close both hands.
- The first-person hands are the body's own, posed round the grip.
- Not yet: the walk is still the old formula (Phase 2); the crowds keep
  the rigid rig (Phase 5); two bone influences on phones wasn't needed
  (few vertices take more than two).

The plan as it was:

- The skeleton and the skinned body, the brand-art head and neck tube,
  hands with fingers, feet with ankles and toes.
- Every wardrobe piece rebuilt on it: the suit, hoodie, track, varsity,
  puffer and soldier fits; caps, beanie, cowboy hat, top hat, halo; the
  backpack, duffel and wings; phone, briefcase, gummy bag; the watch; the
  colour packs. Same names, same colours, same save values.
- `createDegen()` on the new body for you, other players, the fitting room
  and the hologram; the first-person hands (`viewmodel.ts`) re-made to
  match the new hands and sleeves; the kart and car seats and the bench
  seat re-fitted.
- Today's poses mapped onto the new bones (the walk still the old formula
  for now).
- Tests: bone lengths and proportions, the walk camera's eye height and
  the seat height, every arm reach (`reachArm()` on the new arm with its
  collarbone), skin weights summing to one, triangle budgets per level,
  every wardrobe item building on every outfit.
- Checked close up in the fitting room, walking, driving, karting and
  fighting, day and night, on the phone tier; draws and triangles before
  and after.

### Phase 2: walking and running (built)

What's in (for the owner's sign-off):

- `locomotion.ts`: the feet planted in the world (each stays where it
  lands; the other swings to where the body will be), leg IK with a
  heel-to-toe roll, the hips dropping when a foot needs it. No slide at
  any speed, turning, strafing, backing up, on stairs and slopes (the tests
  hold a planted foot to under 4 mm).
- The gait from the speed: walk, jog and sprint blend by steps a second,
  time on the ground, lift, hip height, lean and arms; a jogging and
  running foot lands close under him and pushes off behind, and a
  sprinting leg folds up. Degen's walking speed is a jog for his legs and
  his run a sprint, so those are the gaits you'll see most.
- Starts lean in, stops lean back and settle, bends lean in, he steps
  round on the spot when he turns; arms swing with the opposite leg, the
  pelvis and shoulders counter-turn.
- Jumps tuck the legs; landings are clips by how hard: a soft step, a
  crouch, a forward roll after a big drop on the run.
- The idle breathes, shifts its weight, and looks round after a while.
- Over the shoulder is the default camera when walking starts.
- The clips are short keyed tracks added on top of the procedural walk
  (the walk itself has to be procedural for the feet to stay planted).
- Not yet: other players (paused multiplayer), crowds and fighters still
  use the old walk; the run's quick rhythm (Degen covers ground fast for
  his size) is the price of feet that never slide.

The plan as it was:

- A clip system grown out of `fight-anim.ts`: keyframed clips on the new
  bones, sampled and blended, with layers (lower body / upper body) and
  additive offsets.
- **Locomotion, grounded:** idle, walk, jog, run and sprint blended by
  speed, the stride matched to the speed so the feet never slide; starts
  (a lean and a push off) and stops (a plant and a settle); turning on the
  spot (90 and 180 degrees) and sharp pivots; leaning into turns from how
  fast you're turning; walking backwards and strafing while aiming.
- **Feet on the ground:** two-bone leg IK with heel-toe roll; the hips
  drop and the feet find the ground on kerbs, slopes, stairs (Liberty
  Bridge's) and the kart park's banks.
- Jumps: take-off, air, and a landing that weighs the fall (a soft step,
  a crouch, a heavy roll on a big drop).
- Idles: breathing, weight shifts, looking around; the head and eyes
  turning towards where you're looking.
- Third person becomes the default when walking starts (first person a
  key away).
- Tests: no foot slide (foot speed while planted under a threshold at
  every speed), continuous blends (no pops between clips), clips' lengths
  and loops.

### Phase 3: guns and fighting on the new bones (built)

What's in (for the owner's sign-off):

- `gunfit.ts` (DOM-free, tested in `tests/gunfit.test.ts`): each gun's
  hand spots, sight and muzzle, how it's carried (`long`: shouldered, slung
  on his back when put away; `pistol`: the Hand Cannon, on his hip, carried
  in one hand, both on the grip to shoot), its reload kind and kick, and
  the reloads as keyed clips (`reloadAt()`, `RELOAD_CUES` for the sounds)
  that the third-person hold and the first-person hands both play: a
  magazine (tilt it, the magazine out in the hand, to the pouch and back,
  seat it, the charging handle), shells (rolled over, four shells from the
  belt one at a time, rack the pump), the revolver's cylinder (swing it
  out, muzzle up to dump the empties, a speed loader, swing it shut) and
  the Belt Feeder's box (cover up, box off and on, belt in, cover shut).
- `stance.ts` (now DOM-free): the hold on top of the walk or run. Ready
  after a shot, an aim or a reload, relaxed (a long gun carried low across
  the body, the revolver hanging in one hand) after a couple of seconds or
  while sprinting; aiming bends the spine a share of the way (the head
  takes it back out); the collarbone brings the front shoulder forward
  before he turns side-on; recoil shoves the chest and the shooting
  shoulder back.
- Drawing and putting away: the hand goes to the gun on his back or hip
  and it swings round to both hands (backwards to holster); swapping puts
  one away and draws the other in `SWAP_TIME`. Geared up and holstered,
  the gun stays slung on his back or holstered on his hip.
- The fight clips: the hips turn (and the weight shifts) into every punch
  and kick, the recoveries settle back into the guard, the hit reactions
  play off the side the blow came from (the sim keeps `hurtBy`, the move
  that landed), and the knockdown and get-up turn the hips and shoulders
  as he falls and rolls up. The sim's frames are unchanged.
- Not yet: other players draw and carry but aren't sent whether they're
  geared, so their gun isn't shown once it's away; crowds and fighters
  still walk the old formula.

The plan as it was:

- Upper body on its own layer while the legs walk or run: aiming up and
  down and to the side (the spine and neck share the turn), a ready stance
  and a relaxed carry for each gun, two-handed holds through IK with the
  collarbone, per-gun reloads and swaps, holstering, recoil through the
  shoulders.
- The first-person hands match: the same hold and reload timing.
- The fight clips re-keyed on the new bones and polished: hip and
  shoulder turn into every punch and kick, weight transfer, guard
  recoveries, reactions by where you're hit, knockdowns and get-ups that
  use the whole body. The sim's frames (`fight-sim.ts`) stay the same.
- Tests: clip lengths still match the sim's frames, the strike on the
  first active frame, hands on every gun's grip and hold spot.

### Phase 4: merch clothing, logos and the character screen (built)

What's in (for the owner's sign-off):

- **Placeholder marks** (`marks.ts`, made up in the city's style, no real
  brand, nothing about the token): the Emporium diamond and the Sector 7
  badge (free), and a bolt, star, heart, wave, eye and the Degen mask
  (Dorras, each with a level). Each is a few SVG paths, drawn into one
  logo atlas for the clothes and shown as icons in the fitting room, so
  swapping in the merch store's real designs is replacing a mark's art.
- **On the clothes** (single figures: you, other players, the previews):
  the top's mark on the chest (a lapel pin on the suit, the badge on the
  varsity), big on the front or the back, or on the left sleeve; the mark
  on the front of a cap or beanie (the diamond, as in the art, unless you
  pick another); a mark on the outside of each sneaker; all in one ink
  from eight colourways. Marks are printed from the atlas onto the cloth's
  own shape, so they follow the chest and the sleeve.
- **All-over prints** for the top: stripes, checks, fade and camo (Dorras,
  each with a level), laid on the cloth where it is at rest, so they move
  with it; the second tone is the top's own colour darkened (or lightened
  on a black top).
- **In the game:** new `Look` fields (`mark`, `markAt`, `ink`, `hatMark`,
  `shoeMark`, `pattern`) checked by `cleanLook()` (the server's too), with
  looks saved before them getting Degen's own; the marks and prints in
  `WARDROBE_CATALOG` (tab `merch`); the fitting room's **Merch** tab (dress
  the top, the hat, the kicks or pick a print; where the top's mark goes;
  the ink), bought with Dorras like the rest, nothing tied to the store.
- **The character screen** (Profile tab, "See your Degen"): your Degen
  full size on the podium; drag to turn, scroll, pinch or Full / Face to
  zoom to his face; poses (idle, a walk on the spot, the fighter's guard,
  wave, cheer, dance, salute); studio, day and night light; what he's
  wearing; and the way to Drop 001 to change it. The fitting room's
  preview is the same stage (`stage.ts`).
- Not yet: the crowds don't wear marks or prints (Phase 5); the real
  merch art waits for the owner's pick.

The plan as it was:

- **The designs:** placeholders for now: a set of made-up marks drawn in
  the city's style (no real brand, no token), built so each one is a
  single swap for the real thing. Later the merch store's designs go in,
  taken from its product images through the Shopify connection, the owner
  picking which, cleaned into transparent logo textures (with cleaner files
  from the owner where they matter most) in `src/assets/merch/`, each
  checked against the content rules: no token, no other company's mark.
- **On the clothes:** the garments get places for a logo (chest left and
  centre, back, sleeve, cap front and side, beanie, shoe side), a shared
  logo atlas, and logo colourways; all-over patterns (camo, checks,
  stripes, gradients) where they suit the piece.
- **In the game:** the merch range in `catalog.ts` priced in Dorras with a
  level each (`buyWardrobe()`), new `Look` fields for each garment's logo
  and placement with their rules in `cleanLook()` (the server's too) and
  its migration, the fitting room's new tab, nothing ever tied to the
  store's real prices, links or the token.
- **The character screen:** a full-body turntable from the Profile tab:
  drag to turn, zoom to the face, poses and emotes to preview, lighting
  that shows the clothes off, the outfit list.
- No body options for now (the owner's call): every Degen wears the
  balaclava, and build and height stay as they are. Maybe later.

### Phase 5: crowds, soldiers and the Fight Club's opponents

- The new head and proportions in the instanced crowds at their levels,
  the better walk through baked animation (clips sampled into a texture
  the crowd's shader reads, so hundreds of people still cost a few draws),
  soldiers and the Fight Club's opponents on the new body.

Each phase gets the owner's sign-off before the next one starts.

## Open questions for the owner

- When the real merch art goes in: which designs first, and whether any
  are kept for special pieces.
- Body options (build, height): maybe later.

# The characters plan: new heads on Degen's body

The owner's call (2026-11-21): "add a new character. same model we are
using but a different image." New characters are Degen's one shared body
(`character.ts`, `skeleton.ts`) with a head of their own, sculpted after a
piece of art the owner supplies, worn as a ready-made look in Drop 001's
fitting room. One at a time, each with the owner's sign-off; keep this plan
up to date.

## The owner's answers

- **Where:** fitting room looks. Not the crowd, the Fight Club or named
  people in the city (yet).
- **Likeness:** a new head per character, sculpted to match the art (not
  a stretch of Degen's head: `HEAD_SCALE` can't make these shapes).
- **First round:** one character, from the owner's picture.
- **Nothing over the head:** no hats, no hood up, no shades, no face gear
  on a character's head. The head is the whole look.
- **Free**, like the rest of the wardrobe (`docs/wardrobe-plan.md` Phase 1).

## The first character: SlimeWhale

The name is made up (the owner confirmed, 2026-11-21). From the owner's
picture (kept out of the repo: it's a photo with a cartoon head drawn over
it):

- **The head:** tall and boxy, a flat top and a flat back, a square jaw,
  big ears. Skin a pale peach (a `PALETTE.tone` swatch); the Skin row still
  works on him.
- **Hair:** a buzz, short and grey-brown, over the crown and back only (the
  face's front bare). The Hair row still colours it; no other cuts.
- **Three eyes:** sculpted domes in a row across the brow, lime green,
  bulging past the head's outline at the sides as in the art, each with a
  flat black ink pupil and a white glint (the owner's call: domes, not flat
  ink).
- **The mouth:** wide lime-green lips as a raised rim standing off the face,
  closed on a dark slit (the owner's call: a rim, not flat ink), and a short
  ink smirk stroke above one corner.
- **The look:** a navy hoodie, hood down (as in the art); the legs aren't
  in the art, so joggers and sneakers to start (any can be changed after).
- **Left out:** the phone in his hand (the owner's call: hands hold only
  weapons; the phone stays retired) and the green caps in the picture's
  corners (another company's character; not part of him).
- **Colour:** the lime is held a shade under the bloom threshold (through
  `safeColour()`'s `BRIGHTEST`), so the eyes and lips never glow or wash
  out (`visual-rules.md`).

## How it's built

- **A head is data.** A new DOM-free file, `heads.ts`, holds `HEADS`: each
  character's head as rows (height, half-width, front, back, centre,
  superellipse power: the same `Row` as `HEAD_ROWS` in body.ts) plus its
  parts (eyes, mouth, ears, ink, hair shell). `headGeometry()` in body.ts
  takes the rows to use (Degen's by default), so the lofting, the rings
  and the detail levels are the ones Degen's head already has. SlimeWhale's
  rows: a high power for the boxy section, a flat top, a back cut flat, a
  jaw row as wide as the cheeks.
- **The parts** are pieces in `items()` in wardrobe.ts on the `head` joint,
  weighted as Degen's head is (`weigh()`), so they move with the head bone:
  - `head-<id>`: the skull and neck tube in the `head` colour key (the skin);
    the neck tube runs down into the hoodie's collar as Degen's does, so
    `hoodDown`, the collars (`NECKS`) and the headphones keep fitting.
  - `eyes-<id>`: three domes (a squashed sphere each, seated in the face),
    a fixed lime colour; their pupils and glints laid a millimetre off
    (`features`-style ink).
  - `lips-<id>`: a rounded rim (a stadium swept round the mouth's outline)
    in the lime, the slit a dark strip just inside it.
  - `ears-<id>`, `hair-<id>` (the buzz shell from the new head's own
    outline, as `hairShell()` builds Degen's), `ink-<id>` (the smirk).
  - Degen's `head`, `mask`, `features`, every `hair-<cut>` and every hat,
    shades, face gear and chain item are off while a character's head is on.
- **No new draw calls.** Every part is on the plain material, coloured per
  vertex, on the figure's one `SkinnedMesh` (`createDegen()`).
- **Detail:** level 3 (desktop single figures) and 2 (phones) only; the
  crowd never wears a character's head (levels 0 and 1 aren't built). The
  domes and the lip rim take fewer segments on phones. The figure stays
  under `BUDGET` in `tests/wardrobe.test.ts` (40k / 18k triangles).
- **The look:** a new field `Look.head` (`'degen'` or a character's id,
  `HEAD_IDS` in profile-data.ts). `cleanLook()` keeps looks saved before it
  as Degen and anything unknown as Degen (the game server checks the same).
  With a character's head on, `lookOutfit()` leaves the hat, hood up,
  eyewear, face gear, shades and chain off **without changing what's
  saved**, so going back to Degen brings his old hat and shades back.
- **The fitting room** (`fitting.ts`):
  - a **Looks** row (one tap dresses him as the character: the head, the
    navy hoodie, joggers, sneakers, the peach tone and grey-brown buzz);
  - a **SlimeWhale** card on the Face tab (the head alone, keeping the
    clothes he has on), with the Skin and Hair rows (no Shape, Cut or Shades
    rows on a character);
  - the Head, Eyewear and Gear tabs say nothing fits over his head
    (`[data-fit-empty]`-style note), and the hoodie's Hood Up is off.
  - Menu copy stays 1-3 words; checked at every width, upright and on its
    side.
- **Everywhere else he's drawn** (all single figures, so all free once
  `createDegen()` builds him): your Degen on foot and at the wheel, the
  fitting room's stage, the character screen (`describe()` names him; its
  Face zoom aims at his head) and the hologram. The first-person hands take
  the tone as they do now. Other players would see him through their
  profile's look (multiplayer is off on degenemporium.com).
- **Tests** (`tests/heads.test.ts`): the head closed and its neck inside
  every top's collar (and the hood down's roll); the eyes and lips seated
  on the face, not sunk in it or floating; the ink a millimetre off; the
  hair clear of the head; nothing on the head bone pokes through the
  hoodie through the keyed poses, emotes and the animator's run; the
  triangle budget at both levels; `cleanLook()`'s migration (no `head`,
  unknown `head`, a character's head with a hat saved); `lookOutfit()`
  dropping the hat, hood, shades and face gear. `npm run smoke` before and
  after.

## The phases

Each with the owner's sign-off.

1. **The head, in the lab.** `heads.ts`, `headGeometry()` taking rows, the
   SlimeWhale parts as items, seen only in the lab
   (`?anim&wear=head:slimewhale`). Shots front, side, three-quarter and
   running, desktop and phone detail, beside the owner's picture, for the
   owner to sign off the likeness before anything reaches the fitting room.
   Tests for the geometry and the budget.
2. **Wearing him.** `Look.head`, `cleanLook()` and its migration,
   `lookOutfit()`, the Looks row and the Face tab's card, the Head /
   Eyewear / Gear notes, the hood held down, the character screen.
   Shots of the fitting room and the character screen at the widths.
3. **Checked and written up.** Every width, upright and on its side, both
   tiers, by day and at night (the lime under bloom), `?fps` and `?bench`
   before and after, `npm run smoke`; the guide files (`character.md`,
   `fitting-room.md`) updated.

## Adding the next character (once SlimeWhale's done)

The owner posts the art; we go through it (head, face, hair, clothes,
real brands to swap for made-up marks, phones); a made-up name; then a
`HEADS` entry and its parts, a Looks entry and a Face tab card, its line in
the tests, shots for sign-off. No new draw calls and no change to the
crowd unless the owner asks.

## Still open

- **The eyes' and lips' colour:** fixed lime, or a colour row of its own
  (any colour, made safe by `safeColour()`)? Fixed to start.
- **On the neck and body:** the headphones and the necklace sit on the
  collar, not the head; kept on to start unless the owner says otherwise.
  Bags, the watch and the merch marks are unaffected.

## Status

Planned (2026-11-21), waiting on the owner's sign-off to start Phase 1.

# Brutalist plan: Endswood's blocks, brutalist and lived in

The owner's picks made (2026-11-21, below); the plan itself for the owner's sign-off. Each phase with the owner's
sign-off; keep this plan up to date.

## What the owner asked (2026-11-21)

The blocks of flats more functional and more brutalist, after the owner's reference pictures: raw concrete slabs and
towers, a separate service tower joined to its block by bridges every few floors, twin towers joined high up with a
pod between them, ducts and pipes snaking up a facade, and grit at street level (cables over the lanes, shutters,
neon, washing, a train overhead in the rain). The owner's picks:

- **Which:** the south estate only (Endswood's blocks: the Rampart, Harrier and Kite Points, The Core, Linnet, Marten
  and Wren Courts, Sorrel, Fennel and Teasel Houses). The Trenches' brick projects stay as they are.
- **Functional:** lobbies you can walk into; flats and shops to run; a rooftop hangout.
- **Landmarks:** separate lift towers; the twin towers joined at the top; pipes up the walls; street-level grit.

The pictures are for the feel only: no real building is copied, and every name is made up.

## What's there today

`southblocks.ts` (the data) and `southblocks3d.ts` (the drawing), docs/guide/endswood.md. Much of the bones are
already brutalist: slabs and towers of 5 to 18 storeys, galleries (streets in the sky) every third floor, stair cores
standing out of the slabs, The Core between the twin towers joined to both by bridges every third floor, covered
bridges between the cores, a podium deck over a parking court, the lifts (a card at each core). What isn't: the skin.
It's a soft retro-future dress: beige render with rounded corners (`CORNER_R`), smooth walls, bright mustard, teal and
orange bands along every gallery, the towers' ledge rings and flared plant rooms.

## What stays fixed

- Every block's footprint, height (about 20 at most, the plant rooms' and The Core's: the owner's call, 2026-11-14),
  door and place stays where it is (`tests/snapshot.test.ts`); the sky network keeps its levels (`SKY_FLOORS`).
- Made-up names on every sign and shop; no prices or numbers on signs.
- Phones stay light: the estate is a lazy district (`south-blocks`); new detail goes in the wall atlas (no new draws)
  or instanced and near only; far off it's in the far forms (docs/phone-far-plan.md). Measured before and after with
  `__draws()` at the estate's bench views (`south-blocks`, `south-rampart`).
- Rules apart from the view (DOM-free data, tested); a save change keeps its migration and its key in `BACKUP_KEYS`;
  new places go in `PLACES` and `LIVE_PLACES`, new ways in through `live.closed()`.

## Phases

1. **The concrete skin.** Done (2026-11-21, below). The same blocks, re-dressed: raw grey concrete with board-mark grain and rain streaks under
   every ledge (the wall atlas, `infill.ts`'s bands); the flats' fronts a deep grid of recessed balconies, each with
   its own bit of life (a plant, a bike, a dish, washing); hard chamfered corners for the rounded ones; the galleries'
   fronts plain concrete upstands; the concrete a cool grey, each block's own accent (mustard, teal, orange) kept bold
   as a stripe down its end so the blocks are told apart, and colour otherwise only in small doses (doors, balcony
   panels). Night: the patchy windows as now, the stair slots lit. No new draws.
2. **The service towers.** Done (2026-11-21, below). The slabs' stair cores pulled out of the galleries into towers of their own, standing a
   bridge's length off the block, a bridge to each gallery (every third floor), a boiler house jutting from the top
   with its flue; the Rampart's along its estate side, the Courts' at their ends. The Core's flared top made the same.
   Walked as the cores are now (their lifts and stairs).
3. **The twins joined at the top.** A bridge from The Core to Harrier and to Kite at their top floor, and on The Core's
   top, the lookout: a hexagonal concrete drum wider than the Core (the owner's pick), a glass band all round, lit at
   night. It's the estate's landmark from across the city (and in its far form).
4. **Pipes and kit on the walls.** Bundles of ducts snaking up the ends of a few blocks (bends, joints, brackets),
   air-con units under windows, satellite dishes, water tanks and aerials on the roofs, rubbish chutes, washing lines
   along the galleries. Instanced, near only; phones a trimmed set.
5. **Street-level grit.** Cables strung over the estate's lanes and between the blocks, shuttered fronts under the
   podium deck, neon over the shops there (made-up names), bins, puddles that shine in the rain, the estate's
   noticeboards. The tube's trains already run under; nothing new overhead.
6. **The lobbies.** Each block's ground-floor hall walked into from its door: post boxes, a noticeboard, a bench, the
   lift doors (the lift card, as at the cores), the stairs; the towers' halls glazed and lit warm at night. A hall is
   its own inside (as the tube's halls are), near only.
7. **A flat of your own, and shops to run.** A flat for Degen in one of the blocks (the owner's pick: his own to
   live in, not flats let out): its door off a gallery, inside it a few rooms to walk (as his home's), and a choice
   to wake there instead of at home (docs/spawn-plan.md, a save setting with its migration). And the shops under the
   podium deck, a launderette and a corner shop (made-up names), each run as Makers' Row's units are (levels,
   upgrades, Dorras only; never an investment, no interest or returns wording), a save change with its migration.
8. **The rooftop hangout.** The lookout on The Core: up by its lift, a lounge round the glass band with seats, the view
   of the whole city, a terrace on the roof over it, people up there by day and night. A place of its own (its pin,
   its panel, `PLACES` and `LIVE_PLACES`).
9. **Measured and checked.** The estate's views on the phone tier before and after (`__draws()`), the widths and
   phones on their side for the new cards, the review shots by day and at night, the guides (endswood.md,
   economy.md) up to date.

## What Phase 1 did (2026-11-21)

- The wall atlas's `brutal` band (infill.ts `recessRow()`, its measures and the recesses' life in facade.ts): board-
  marked concrete, the slab's edge at each floor, a fin between each two-bay recess, the window and door at the back,
  a solid front over the recess's foot, life in them (mostly plain; a plant, a dish, an air-con unit, a bike, washing
  now and then, the odd front painted), soot under the slabs and heavy rain streaks. The Trenches' `panel` band left
  as it was.
- The concrete a dark, cool grey (the owner's pick after the first look: "darker, heavier"); the corners chamfered
  (45 degrees, tested); the galleries', balconies', ledges' and fascias' fronts concrete; each block's colour a stripe
  down its ends (a tower's down its face away from The Core); the towers' plant rooms plain concrete boxes; the
  bridges' glass and the stair slots a cool dark glass by day, lit warm at night.
- No new draws: on the phone tier at the estate (four headings) 139, 142, 180 and 416 against 144, 147, 184 and 386
  before (the north heading's difference all far city, the run-to-run spread).
- The boot: the band is painted with the atlas at the boot; the far aircraft moved to a chunk of their own to make
  room, and the budget raised from 770 to 775 KB (the owner's call, 2026-11-21).

## What Phase 2 did (2026-11-21)

- The slabs' and the Rampart's stair cores stand off their blocks as service towers (southblocks.ts `SERVICE_GAP`, 3,
  a bridge's length), each with a covered link from its gallery at every landing (`Core.link`, walked by southsky.ts
  `linkShapes()`, drawn as the estate's bridges are), a boiler house jutting from its top and its flue beside it.
- Where there wasn't the room (measured: a street, a parking court or the underpass's ramp near) a tower stands nearer
  (`CORE_GAPS`): Sorrel's west one 1.5 off, Fennel's east one and the Rampart's fourth 1, the Rampart's third and
  Linnet's south one against their blocks as before. 12 of the 17 stand a full bridge off.
- The bridges between the towers follow them (worked out from where they stand); the lifts' doors with them. Nothing
  held in place moved (the snapshot unchanged).

## The owner's decisions (2026-11-21)

- **The concrete:** a cool grey, each block's own accent kept bold as a stripe on its end; after the first look, darker
  and heavier (2026-11-21).
- **The lookout:** a hexagonal drum on The Core.
- **The flats:** a flat of Degen's own to live in (and wake in, if chosen); no flats let out.
- **The shops under the deck:** a launderette and a corner shop.
- **The order:** the look first (phases 1 to 5), then the places (6 to 8).
- Still to pick, at their phases: the lookout's name, the shops' names, which block the flat is in (Claude to
  suggest made-up names and a block when each phase starts).

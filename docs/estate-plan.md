# Endswood Estate (plan)

The owner's call (2026-11): a rough London council estate, **Endswood Estate**,
known as **the Ends** ("TheEnds"): a concrete jungle of brutalist blocks with
subways, underpasses and abandoned buildings, corner shops, an old but large
church and a DIY recording studio. It goes on Lot 9's land, south of the ring
highway under The Trenches, and Lot 9 moves further south, so the three run
north to south as one blend: The Trenches (inside the highway) → the highway on
its viaduct → Endswood → Lot 9 furthest south.

Rough but never threatening (as The Trenches and Lot 9): worn, lived-in,
tagged, emptied flats and boarded buildings, no violence or crime shown.
Made-up names only (never a real estate's, block's, brand's or person's), no
real logos (no TfL roundel, no phone company's), every sign fixed copy. Under
the Emporium (`EMPORIUM_ROOF`, 12.5) unless the owner says otherwise (below).

Built one phase at a time, each with the owner's sign-off. Keep this up to date.

## What makes it London, not Brooklyn

| The Trenches (Brooklyn) | Endswood (London) |
|---|---|
| Red brick, fire escapes, stoops, water tanks | Raw concrete, deck access, no fire escapes or tanks, lift motor rooms on flat roofs |
| Towers each on its own block | Long slabs and a point tower joined by bridges, "streets in the sky" |
| Shops along the street wall | A parade of shops under a block, set back behind a forecourt |
| Chain-link courts on asphalt | Grass with desire lines, low brick walls, green council railings, garages under the blocks |
| Fire escapes and stoops to sit on | Deck railings to lean on, the bin store, the subway |

## The land (proposed)

- **Endswood:** from the highway's south edge (after exit 6's outside slip
  ramp, which runs along it west of the avenue) to about z 430, from Lot 9's
  west fence (x -128) east to the north avenue's line (ns3, x 64.5). Lot 9's
  land today is the west half (x -128 to the south avenue); the south avenue
  (ns0s, x -4.5), ns1s (x 17) and ns2s (x 43) already run straight through to
  the world's edge, so the east half is three strips between them, ready made.
  General aviation's road and landside start east of ns3: untouched.
- **The common** (the blend strip, about z 430 to 470): rough grass and a dirt
  path from the estate to Lot 9. The airliners' final approach runs along
  z 442 here (airfield.ts `jetFlight()`: about 15 tiles up at the west end
  coming down to 9 by the avenue), so jets come in low over the common: very
  real for an estate on the edge of town, and why nothing tall goes south of
  the estate.
- **Lot 9**, moved south: the same layout, homes and fence, shifted about 130
  south (the fence at about z 472 to 542), its lane in off the south avenue
  further down, the hole in its fence now on the north side facing the common.
- The tunnel from The Trenches (`TUNNEL`, lot9.ts) stays where it is and lands
  in Endswood: it becomes the estate's first subway.

## The look

- **Concrete that reads in toon shading** (new bands in the wall atlas,
  infill.ts): board-marked concrete (the timber shuttering's grain), rain
  streaks under every ledge, sill and parapet, precast panel joints in a grid,
  exposed aggregate panels, dark engineering brick at the plinths and bin
  stores, and faded 70s colour panels under the windows (burnt orange, teal,
  mustard): the only colour on the blocks.
- **The blocks:**
  - the **barrier block** along the highway: a long deck-access slab, small
    windows on the highway side, its decks facing into the estate (a door,
    mat, plants and a bike along every deck, each door its own colour);
  - the **point tower** with its lift and stair tower standing apart, joined
    by bridges every few floors, the lift motor room and an aerial on top;
  - **maisonette blocks** round the green, garages underneath (roll-up doors,
    some tagged, some scorched);
  - a **stepped terrace** on the south edge, stepping down towards the common;
  - **abandoned buildings:** a block emptied for demolition (every window
    behind grey perforated steel screens, hoardings round its base reading
    REGENERATION · COMING SOON with made-up developer copy), a boarded-up pub
    and a derelict community centre, all shut.
- **The subways and underpasses:** the estate's walks pass under its roads.
  The centrepiece: the estate road meets the south avenue at a roundabout with
  a **sunken subway hub** in its middle, open to the sky, ramps down from the
  pavements and a subway under each arm (tiled walls, murals, flickering
  tubes, tags). Built on Lot 9's tunnel's kit (`tunnelY()`, `tunnelWall()`,
  `tunnelRoom()`, holes cut in the ground): anything new below ground goes
  through the same three, made general for many tunnels.
- **The corner shops** on the street corners and the **parade** under a
  block: off-licence, chicken shop, launderette, barber, chippy, newsagent,
  phone repair (made-up names), shutters on some, a tenants' hall.
- **The church:** old but large, older than the estate round it: a Victorian
  Gothic church in soot-darkened stone, a tall tower and spire, a big west
  window lit at night, its churchyard behind railings with yews and old
  headstones, the concrete pressing in on every side.
- **The recording studio** (the owner's "ghetto recording studio"): a DIY
  studio in a converted garage and lock-up under a block: foam on the walls
  seen through the open door, a red ON AIR light, cables, a battered sofa
  outside, a few people about, a pirate-radio aerial on the tower's roof, the
  beat leaking out (its own sound, as Club PULSE's).
- **Street level:** zebra crossings with orange-globe beacons, double yellow
  lines, speed bumps, concrete lamp columns with sodium lamps (lampmix.ts
  `SODIUM_AREAS`), green railings, concrete bollards, CCTV on poles, intercom
  panels, the communal bin store, a NO BALL GAMES sign on the green, a
  games pitch (green fence, red surface), the estate board with the blocks'
  names. Traffic keeps the city's side of the road.
- **Night:** a strip of light up each stairwell, fluorescent tubes along the
  decks (some flickering), TVs glowing, the church's window, sodium orange
  below.
- **Life and sound:** kids doing wheelies, mopeds, tracksuits, neighbours on
  the deck railings, an old lady with her shopping trolley, dogs on leads;
  pigeons, mopeds, the two-tone siren far off, an ice-cream van's chime now
  and then, the church's bell on the hour, the studio's beat.

## The blend

- **The Trenches → Endswood:** the highway is the seam. The tunnel under it is
  Endswood's subway (dressed to match: tiles, murals); under the viaduct, where
  viadress.ts already has half courts and murals by The Trenches and Lot 9, a
  skate spot and lock-ups; the sound walls on the parapet stay (homes behind).
- **Endswood → Lot 9:** the estate's garage court and the stepped terrace on
  its south edge, then the common: rough grass, a worn dirt path, a dumped
  mattress, a burnt-out moped, a ditch with a plank bridge, the jets coming in
  low; brick walls and green railings giving way to broken chain-link, concrete
  to grass to gravel (ground.ts's influences). Sodium lamps all the way.

## The phases (proposed)

1. **Lot 9 moves south.** Nothing else changes: its land, fence, lanes,
   homes, people, lamps and bus stops shifted; its path now from the common.
   The layout snapshot is rewritten (the owner's go). The tunnel stays.
2. **The land, streets and subways.** `endswood.ts` (DOM-free, tested): the
   land, the estate road and the roundabout, the blocks in the street plan,
   the subway network (the tunnel kit made general), the trees, rolls and
   ground kept off and blended, sodium lamps, exit 6's signs renamed
   ("Endswood · The Trenches"), bus stops at the entrance.
3. **The blocks.** The concrete bands in the wall atlas; the barrier block,
   the tower and its lift tower, the maisonettes, the terrace and the
   condemned block as data, drawn by `endswood3d.ts` (a district loaded as
   you approach), details near only.
4. **Street level.** The parade, the corner shops, the church and its
   churchyard, the recording studio, the green, garages, bin stores, the
   pitch, the street furniture, the abandoned pub and community centre.
5. **The decks and bridges walked on** (the barrier block's decks and the
   bridge to the tower, as Liberty Bridge's high level).
6. **The blend.** The common, the path, Lot 9's fence; the viaduct's
   underside; the tunnel dressed.
7. **Life, night and sound.**
8. **Places and polish.** Pins and panels, bench views, phones.

## The owner's answers (2026-11-05: "go with your suggestions")

1. **The land:** Lot 9's old land plus the three strips east of the south
   avenue to ns3.
2. **Height:** the blocks under the Emporium; the church's spire may rise
   over it (the owner's exception, as Uptown's towers).
3. **The church:** a made-up name (St Aldwyn's, unless the owner names it);
   scenery first, walking in later.
4. **The recording studio:** a made-up name (Bunker Sound, unless the owner
   names it); a place with a pin and panel, "coming soon".
5. **The corner shops:** scenery now; run for Dorras like The Trenches' four
   in a later phase.
6. **The abandoned buildings:** boarded, with one way in round the back for
   the storyline.
7. **Places:** the estate (its spot on the tenants' hall), the church and the
   studio, tied to Lot 9's storyline.
8. **The roundabout's sunken subway hub:** in, the centrepiece.
9. **Walkable decks:** in (Phase 5).
10. **Blocks' names:** made up, "___ House", "___ Court", "___ Point" (Fennel
    House, Linnet Court, Harrier Point, ...).
11. **Signs:** the estate board reads ENDSWOOD ESTATE; tags and murals say
    THE ENDS.

## Built

- **Phase 1 (Lot 9 moved south):** `MOVED` (130) in lot9.ts: its fence, lanes,
  lots, homes, office, laundry, fire pit, junk corner, lamps, trees, people,
  dogs, cars, bus stops and spawn all moved with it; `LOT9_RECT` is its own
  land now (the fence and the lane to the avenue). The tunnel stays where it
  was; its footpath runs south from the ramp's top over the open land to the
  hole in Lot 9's north fence (`FOOTPATH`, a point every `PATH_STEP`, drawn a
  few stretches a site; `PATH_RECT`). `endswood.ts` holds the estate's land,
  for now exactly Lot 9's old land (`ENDSWOOD_RECT`), so what stood by it
  stays: the highway's sound walls and the courts and murals under its deck
  (viadress.ts), the trees and the rolls kept off (`KEEPS`: `endswood`,
  `lot9`, `lot9-path`), sodium lamps (`SODIUM_AREAS`) and the hood's sound
  (ambience.ts). Exit 6 still reads "Lot 9 · The Trenches" until Phase 2.

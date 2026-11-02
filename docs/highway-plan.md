# The raised highway (plan)

The owner's call (2026-10): the ring highway rebuilt to look real, raised up
on a concrete viaduct, with real exits and a road network that works. Built
one phase at a time, each with the owner's sign-off; keep this file up to
date.

## Today

`HIGHWAY` (highway.ts) is a closed loop at street level on `HIGHWAY_BOX`
(x -215 to 275, z -170 to 320, corners `HIGHWAY_R` 70), two lanes each way, a
median and a shoulder (`HIGHWAY_HALF`). It meets the straight arterials at 16
lit junctions (and the docks' and the stadium's roads), each with one-way
`slip` streets across the corners (`OUTER_SLIPS` for the outer ones), and
crosses the river on two flat bridges. Things that cross or meet it: the
metro (the Kart Park span, the airport branch, the line west to the docks),
the stadium's footbridge (a pier on its median), the airport's junctions,
the docks' slip lane, Uptown North's and the kart park's slips, the river
bridges.

## Proposed (the owner to confirm or change before Phase 1)

1. **Raised all the way round** on one concrete viaduct, the deck about 4.2
   tiles (7.5 m) over the ground, so every arterial passes under it at
   street level and the junctions under it work as ordinary lit crossings.
   It comes down only where it must (nowhere today).
2. **The look:** a box-girder deck on hammerhead piers about every 14 tiles,
   expansion joints, concrete parapets with a steel rail, a concrete
   median barrier, light poles on the median, a hard shoulder each side;
   sound walls where it passes Sunridge, The Trenches and Uptown North;
   stained concrete and drainage streaks near only.
3. **The lanes:** as today, two each way (the cars are real-proportion
   already); a third lane only between an on-ramp and the next off-ramp
   (an auxiliary lane) where they're close.
4. **The exits:** not every arterial gets one (16 exits on a 3.3 km ring is
   too many to be real): about eight **diamond interchanges** (an off-ramp
   down and an on-ramp up each way, the ramps' ends at lit junctions with
   the arterial under the deck), numbered clockwise from the stadium:
   the stadium (ns0 north), Kart Park and Sunridge (ns3 north), Crestmont
   (the east road), the east (the south bank road east), the airport (two:
   Airport Drive and general aviation), The Trenches and the Docks (the
   south bank road west), Westlake (the west road). The other arterials just
   pass under. One **cloverleaf** at the airport as the showpiece, if the
   land allows.
5. **Signs:** green gantries over the lanes before each exit and at the
   ramp's split (EXIT 4 · SUNRIDGE · KART PARK; made-up names only, one
   sign atlas, fixed copy), mile-style distance boards, the exit numbers on
   the ramps' noses, reflective lane markings, chevrons at the gores.
6. **Traffic that uses it:** the routes (routes.ts) get heights: a street
   carries a height profile, the ramps are one-way streets rising from the
   arterial to the deck; cars leaving slow on the ramp and stop at its
   lights, cars joining merge into a gap in the near lane (a give-way rule
   in traffic.ts). The highway's own traffic runs round both ways as today.
   Taxis use it for long rides (`pathBetween()` across levels).
7. **Driving it yourself:** yes: your car, your bike and taxis go up the
   ramps and round the ring. Walking onto it: no (the ramps have NO
   PEDESTRIANS signs and you're turned back at the top, as at Liberty
   Bridge's edges). Flying passes over it.
8. **Under it:** open ground with gravel and weeds between the piers in the
   outskirts; in town uses that fit: car parks, The Trenches' basketball
   court and murals, storage; lamps under the deck at the crossings.
9. **What crosses it:**
   - the metro rises over the deck where it crosses (the Kart Park span,
     the airport branch, the line to the docks) on a raised span about 3
     tiles over the deck's parapets;
   - the stadium's footbridge goes: you walk under the viaduct to the
     stadium at street level (Stadium Road gets a zebra), the Mall's line
     kept;
   - the river bridges become the viaduct's river spans (piers in the
     water, between the boat lanes, as today);
   - the slip lanes go, their junctions become the ramps' (the airport's,
     the docks', Uptown North's, the kart park's);
   - the woods, the trees and the airport keep their land.
10. **Performance:** the deck in pieces a tile long as sites, the piers
    instanced, near-only details (joints, streaks, the rails' posts);
    phones draw fewer lamps and no sound-wall detail. The boot is at 668.9
    of 670 KB: the deck's drawing moves out of world.ts into a chunk where
    it can, and the boot budget is raised only with the owner's say.

## Phases

0. **Measure:** `?bench` views on the highway (a junction, a straight, a
   river span), the list of everything that touches it, the snapshot.
1. **The shape as data:** highway.ts gains the deck's height, the piers'
   places, the ramps (`RAMPS`) and the exits (`EXITS`); DOM-free and tested
   (clearance over every street, under every metro span, over the water;
   the ramps' grades; the piers off every lane, sidewalk and median).
2. **The viaduct drawn:** the deck, piers, parapets, median barrier,
   lights and joints; the at-grade asphalt, median and lamps taken out; the
   ground under it.
3. **The network:** the ramps and their junctions in the street plan, the
   slips retired, routes with heights, merging and the lights at the
   ramps' feet; taxis.
4. **On it and round it:** your car, bike and taxis on the deck
   (`groundAt()` by level), the piers solid, the cameras, walking kept off,
   the world map, the traffic's sound from above.
5. **The crossings:** the metro's raised spans, the stadium's walk under,
   the river spans, the airport's and the docks' exits.
6. **Signs and the look:** gantries and exit numbers, sound walls, what's
   under it, night lighting.
7. **Polish and performance:** bench, phones, the budget.

## Order with Sunridge

Recommended: Sunridge's Phases 1-3 first (clean land, small risk), with its
edge set back for the ramps of exit 2 (ns3 north) and the Crestmont exit;
then the highway's Phases 0-7; then Sunridge's amenities and life, which
can use the new exits. The owner can switch the order.

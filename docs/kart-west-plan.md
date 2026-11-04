# The kart park moves west, and the upgrade (the owner's call)

The owner wants Sector 7 Kart Park moved to the empty land west of the
raised highway, its facility made much grander, every clipping problem
found and fixed, and the karts better all round. Asked and answered on
2026-11-04, built in one long run overnight: every phase below is built in
a row on the work branch, each with its tests, before and after shots and
docs, committed and pushed as it goes; **nothing goes to main until the
owner has looked**.

## The owner's answers

- **Where:** the open land outside the ring highway's west side, north of
  the riverside avenue (ew0 past exit 8), west of exit 8's ramps. The
  park's public side faces south onto ew0; its fence keeps clear of the
  ramps' land (`rampLand()`, `RAMP_CLEAR`).
- **The circuit:** the same twelve-corner layout raced both ways, so lap
  records, ghosts and boards stay valid; moved, not redrawn (the local
  frame `u, v` moves with it). Every clipping problem found is fixed.
- **Getting there:** a new Kart Park station on the metro where it runs
  along the north bank avenue (ew3) west of the highway, a walk up to the
  gate. The old Kart Park station stays as the main line's north end,
  renamed Starlight Mall.
- **The old land** in the north-east goes back to open land, kept clear
  for a district later. Kart Road goes with it.
- **Name and signs:** Sector 7 Kart Park as before. Exit 8 becomes
  "Uptown · Kart Park"; exit 2 drops Kart Park ("Starlight Mall ·
  Sunridge").
- **Ground:** the park held flat, but its spectator banks and the approach
  shaped into the rolling land round it, so it looks dug into the
  landscape.
- **Facility (all four):**
  - **Bigger stands, a live crowd:** larger grandstands and banks; a
    crowd that cheers and waves flags as karts pass and when you overtake;
    flag marshals waving their flags.
  - **Podium and trophies:** a podium by the pits; after a race the top
    three karts park there, a trophy ceremony with confetti and a camera
    move, then the results card.
  - **Clubhouse and paddock:** a clubhouse in place of the hut (reception
    and café, a trophy cabinet showing the cups you've won, a roof
    terrace), team garages and a fuller paddock with karts being worked
    on.
  - **Entrance and night show:** a grand gate plaza and arch, a signed
    approach road, a car and coach park, big LED screens showing the race,
    floodlights and neon for night races.
- **Driving (three):**
  - **Start boost and slipstream:** a timed boost off the start lights, a
    slipstream tow behind a kart ahead, clearer drift boost stages (blue,
    orange, purple sparks).
  - **Splits and live gaps:** three sector times, a ghost delta at every
    sector, a live gap to the kart ahead and behind, a personal-best
    flash.
  - **Kart customising** (all free): a racing number and decal sets
    (stripes, flames, checks, the city's made-up marks), rims and tyre
    stripes, Degen's helmet and race suit, a drift-spark trail colour and a
    neon underglow at night.
- **Items mode:** pure racing stays the default. A switch in the hut's
  single race adds item boxes with three items: **Boost** (a turbo can),
  **Shield** (a few seconds where bumps and slicks can't spin you) and
  **Oil slick** (dropped behind; a harmless spin). Rivals use them too.
  Cups, time trials, lap records, ghosts and boards stay pure.
- **Rivals:** left as they are (they learn the items for the items mode
  only).
- **Clipping (all of it checked):** karts through the flyover's deck and
  supports, the tunnel and the barriers and each other; kerbs, run-off,
  armco, tyre walls and fencing through the track, the banks and each
  other; Degen through his kart; the chase camera through walls, the
  tunnel or the ground.
- **Process:** phases, built in a row overnight, held off main for the
  owner's review.

## Phases

1. **The move** (the site, its roads, the metro, the old land): the
   park's frame moved (`X0`, `Z0` in kartpark.ts) onto the new land; the
   car park's loop and the drive in off ew0 in the street plan (traffic
   comes off exit 8 onto ew0 and in); Kart Road and the north-east land
   cleared (the outskirts' trees and ground fill in, its `KEEPS` gone); the
   metro's new Kart Park station on ew3's median west of the highway and
   the old one renamed Starlight Mall; the exits' names; places, the world
   map, the bounds the City view pans in, the seam map, the ground, the
   clearing rule and the rolls; the layout snapshot rewritten on purpose.
2. **Clipping:** a test for every kind of overlap (the track's surfaces
   against the supports, the deck's headroom, the tunnel's walls, every
   barrier, fence, stand, bank, tree and lamp; karts' boxes against the
   deck and tunnel in the sim; Degen's pose inside each kart; the chase
   camera's room in the tunnel, under the deck and by the stands) and the
   fixes for whatever they find.
3. **The facility:** the clubhouse (reception, café, trophy cabinet, roof
   terrace) in place of the hut; team garages and the paddock; bigger
   grandstands and banks shaped into the slopes; the podium; the gate plaza
   and arch, the signed approach, the car and coach park; LED screens,
   floodlights and neon.
4. **The live crowd and the podium ceremony:** fans cheering and waving
   flags as karts pass and when you overtake, marshals' flags (yellow after
   a spin, blue, the chequered at the line); after a race the top three on
   the podium with trophies, confetti and a camera move, then the results.
5. **Driving:** the start boost, slipstream, drift stages; sector splits,
   the ghost delta per sector, live gaps ahead and behind, the
   personal-best flash.
6. **Kart customising:** number, decals, rims and tyres, helmet and suit,
   spark trail and underglow, in the hut's Karts tab; the save carries them
   (a new save version, older saves upgraded).
7. **Items mode:** item boxes on the circuit, the three items, the HUD's
   item slot and the touch, key and gamepad button, rivals using them,
   single races only.
8. **Polish and performance:** bench views, phones, the boot budget, the
   docs.

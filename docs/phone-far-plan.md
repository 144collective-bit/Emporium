# Phone far-view plan: the far city in fewer draws on phones

Signed off by the owner (2026-11-20). Each phase with the owner's sign-off; keep this plan up to date.

## Why

Measured on the phone tier for the south plan's Phase 6b (2026-11-20; headless, walk mode, `data-tier` low, the
camera's far 1340 on every tier): an open view draws far more than one inside town, and not because of what's near.

| Where (phones) | Draws | Separate meshes in view | Tile batches in view |
| --- | --- | --- | --- |
| Downtown (68, 38) | 252 | 78 | 38 |
| The Trenches (-101, 180) | 446 | | |
| St Aldwyn's churchyard (-215, 452) | 515 | 383 | 24 |
| Exit 6A, Corner Road (-232, 276) | 525 | 392 | 29 |

The tile batches (one draw a material, however many tiles show) are not the cost: merging far tiles would save 5 to 9
draws. The cost is about 390 separate meshes from the rest of the city seen across open ground, at the village's:

- the landmarks' far forms, several meshes each (the Emporium, the Workshop, Drop 001, the Armoury, the Signal tower,
  the Post office, the Apartments, the kart park, Liberty Bridge, Pier 7, the stadium, the Units' and lots' far
  forms: about 100 in all);
- the airport's aircraft and your own (each a fleet of parts: jet, freighter, heli, prop, about 9 meshes each: about
  43);
- about 110 small far meshes with no name of their own (basic and toon materials: glows, signs, parts), and the
  traffic's far car details (about 25).

The south's own drawing is about 40 to 50 of it.

## The aim

On phones only, the open views down to about **350 draws** (from about 520), with the far city looking the same from
the ground. Desktops unchanged. Measured before and after each phase with the same views.

## Phases

1. **Measure, and name what's far.** Done (below). A draw breakdown under `?fps` (`window.__draws()`, drawrows.ts),
   and under `?made` each unnamed thing tagged by the code that made it (no cost to the boot: each kind is named in its code
   in the phase that changes it); the baseline at six views on the phone tier.
2. **The aircraft far off, one piece each.** Done (below). On phones, past the tier's `far`, each aircraft (the
   airport's fleets, your own, the hangar's showroom, others' in multiplayer) drawn as its model in one piece
   (`farGeometry()` in aircraft.ts), a fleet's far ones one draw. Up close, as before; desktops as before.
3. **The landmarks far off, on phones.** Done (below). Phase 1's survey of what they keep (each landmark's kept
   meshes and why) found most of it must stay as it is (the Emporium's hologram, Liberty's flames, the club's
   screens, the pier's rides, the Signal tower's beams, the kart park's big signs): what changed on phones is each
   place's far form in one piece (facades flattened too), small cut-out signs not drawn past `far`, the kept glows
   not drawn while they're clear, and a far form for the swing bridge (a district of its own, so it was never in the
   boot's queue of far forms).
4. **The small far parts**, in order of their draws until the aim's reached: the target range (about 17: a far form
   of its own), the traffic (about 26: each model's paint and detail in one mesh on phones), the river's boats (about
   14: lamps and wakes merged per boat), the Docks' moving parts (about 11), the lamps' far glows (about 11),
   Trench Avenue's string lights (neighbourhoods.ts, about 8). Each named in its code as it's changed.
5. **Measured after, the look checked.** The six views on the phone tier against phase 1's baseline, the review
   shots by day and at night (nothing far away visibly changed), the guides (performance.md) brought up to date.

## What Phase 1 measured (2026-11-20)

Headless (software renderer), walk mode, the phone tier (`data-tier` low), 1280 x 800, each view after up to 7
minutes of building (1,700 to 2,600 of the city's sites still waiting: what's far is drawn by then, the near counts may
be a little low). Every draw of one frame (`__draws()`), at four headings each (the camera turned to south, east,
north and west, level). "Far" is the main pass's draws past the tier's `far` (90 m on phones).

| View (phones) | Draws S / E / N / W | Worst heading | Main pass | Of which far | Outline pass |
| --- | --- | --- | --- | --- | --- |
| Downtown (68, 38) | 330 / 319 / 293 / 669 | 669 (W) | 447 | 134 | 219 |
| The Trenches (-101, 180) | 271 / 347 / 554 / 243 | 554 (N) | 352 | 206 | 199 |
| St Aldwyn's churchyard (-215, 452) | 152 / 248 / 599 / 139 | 599 (N) | 500 | 429 | 96 |
| Exit 6A, Corner Road (-232, 276) | 223 / 316 / 347 / 151 | 347 (N) | 270 | 222 | 74 |
| The Docks' quay (-290, 210) | 197 / 587 / 267 / 160 | 587 (E) | 497 | 447 | 87 |
| Crestmont Boulevard (362, -80) | 264 / 133 / 135 / 615 | 615 (W) | 526 | 490 | 86 |

The open views (the village, the Docks, Crestmont, The Trenches) are 550 to 615 at their worst, looking back at the
city, 400 to 490 of it far. Downtown's west is 669 but mostly near (the Emporium's block): not this plan's, a case of
its own. Exit 6A reads 347 at its worst (the earlier 525 was from a different camera).

What the far draws are, the village looking north and Crestmont looking west (`?made`, mapped to the source through a
build's source maps): about the same at both.

| Kind | Village | Crestmont | Phase |
| --- | --- | --- | --- |
| Landmarks' kept parts (named: stadium 15, Emporium 13, kart park 13, Liberty 11, pier 8, Trenches 7, Signal 6, club 4; and the unnamed in landmarks.ts, armoury.ts) | about 145 | about 145 | 3 |
| The places' far forms (`*-far`, a few each) | 55 | 55 | 3 |
| Traffic, buses and the metro's trains (instanced per model, drawn at every distance) | 26 | 26 | 4 |
| Aircraft (`fleet-*`, your own) | 20 | 9 | 2 |
| The target range (its stands and cards, combat.ts) | 17 | 16 | 4 |
| The river's boats (lamps, wakes) | 14 | 15 | 4 |
| The Docks' moving parts (docksport3d.ts), the lamps' far glows, Trench Avenue's string lights | 30 | 30 | 4 |
| Everything else (a few each: sky, the Neon Mile's marks, the civic quarter's washes, the garage) | about 35 | about 95 | 4 |

The tile batches are not the cost (5 to 9 of it); the outline pass reaches only about 145 m and is near.

How to measure again: build, serve `dist`, open `/?fps&spawn=x,z` (add `&made` for the makers) with `data-tier="low"`
on `[data-city-root]`, walk, wait for the sites, then `await __draws((c) => c.lookAt(...))` in the console. Its
`rows` are biggest first; `@file.js:line:col` is a built chunk's place, found through `npm run build` with
`sourcemap: true` set for once in `astro.config.mjs`'s `vite.build` and `environments.client.build`.

## What Phase 2 measured (2026-11-20)

Each aircraft's far piece: its body, livery, nav lights and beacon, the control surfaces at rest and the spinners'
blades merged (no gear, no titles), coloured per vertex; the livery's colour per aircraft only where the near livery
is (`accent`), the lights glowing brighter at night as theirs do (the beacon steady, not blinking). Each aircraft is
near or far by its own distance from the camera (`aircraftNear()`, `LOD_EYE`, with the places' margin); a fleet's near
parts are drawn only while one of it is near. Start-up code 764.6 of 770 KB (about 0.9 KB more).

The same views and headings as Phase 1, on the phone tier:

| View (worst heading) | Draws before | After | The aircraft's before | After |
| --- | --- | --- | --- | --- |
| St Aldwyn's churchyard (N) | 599 | 564 | 20 | 2 |
| The Docks' quay (E) | 587 | 546 | 47 | 4 |
| Crestmont Boulevard (W) | 615 | 585 | 20 | 2 |
| The Trenches (N) | 554 | 555 | 9 | 2 |
| Exit 6A, Corner Road (N) | 347 | 334 | 9 | 1 |

(The totals move a few draws either way from run to run with what's built and where the traffic is; the aircraft's
own draws are the measure.) The look: the maintenance hangar's parked airliner from about 45 m, the same camera, with
Degen 104 m off (drawn far) and 72 m off (drawn near), by day and at night: the far piece's livery, window band and
stripes as the near model's, its nav lights glowing at night.

## What Phase 3 measured (2026-11-21)

What each landmark keeps at every distance (a survey of its meshes in the page, on the phone tier): cut-out signs kept by their stand-in
(the kart park's 12, mostly big ones, the Units' 4, the big lots' 3, a few each elsewhere); see-through glows, the
stadium's six floodlight glows and the club's two at opacity 0 by day but drawn every frame; the hologram, Liberty's
flames, the club's screens, the pier's rides, the kart park's fans (moving), sparkles; and places with no far form,
the Units and big lots (rebuilt from the save, so not a snapshot), the swing bridge (46 meshes), the Sky Wheel.

The same views and headings, on the phone tier (the Docks again after the swing bridge's far form):

| View (worst heading) | Phase 1 | After Phase 2 | After Phase 3 |
| --- | --- | --- | --- |
| St Aldwyn's churchyard (N) | 599 | 564 | 515 |
| The Docks' quay (E) | 587 | 546 | 466 |
| Crestmont Boulevard (W) | 615 | 585 | 537 |
| The Trenches (N) | 554 | 555 | 552 |
| Exit 6A, Corner Road (N) | 347 | 334 | 310 |

The swing bridge from the Docks: 40 draws to 7 (its far form and its turning span). The Trenches doesn't move: its
cost is the outline pass and the town round it, not the landmarks.

The look: the same camera on a build of Phase 2 and of Phase 3, by day and at night. From high over the Docks looking
across the river to Uptown (616 draws to 484), the towers, the swing bridge's truss, the Sky Wheel, the waterfront, the
lit windows and the searchlights the same; only what moves (the helicopter, the blimp, the boats) elsewhere. At the
village and the Docks' quay the near buildings fill the view: the same, and most of the far draws there are of things
behind them (nothing culls what's hidden).

Where the aim stands: Phase 4's kinds (about 60 to 70 draws a view) would leave the open views about 430 to 470, not
350. The biggest share left is what's hidden behind near buildings, and the outline pass (about 80 to 200 within
145 m).

## The owner's decisions (2026-11-20)

- The plan signed off; Phase 1 started.
- The aim: about **350 draws** in the open views on phones.
- On phones the landmarks' far forms may lose their facade textures: a flat colour per part, the texture's average
  baked in.
- Phase 4 stops once the aim's reached.

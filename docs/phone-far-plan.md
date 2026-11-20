# Phone far-view plan: the far city in fewer draws on phones

Draft for the owner's sign-off (2026-11-20). Each phase with the owner's sign-off; keep this plan up to date.

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

1. **Measure, and name what's far.** A draw breakdown under `?fps` (`window.__draws()`, perf.ts: what the camera
   draws grouped by the site, name, material and distance it comes from), and names on the ~110 unnamed far meshes
   (each tagged by what made it), so every later phase is measured the same way. The baseline at six views (downtown,
   The Trenches, the village, exit 6A, the Docks, Crestmont's hills) on the phone tier, written here.
2. **The aircraft far off, one piece each.** Past the tier's `far`, each aircraft (the airport's fleet, your own when
   it's away) drawn as one flattened far form (`farForm()` in lod.ts, as the places' are): about 43 draws to about
   8 at the village. Up close, as now.
3. **The landmarks' far forms in one piece on phones.** Their far forms are merged per material today (the facades'
   textures kept); on phones only, one mesh each, coloured per vertex (`farFormMaterial()`), the textures' average
   colour baked in: about 100 draws to about 35. Desktops keep the textured far forms.
4. **The small far parts.** From phase 1's names: each kind pooled (far glows into one instanced mesh, small signs
   into their place's far form, far car details dropped past `far` on phones), each measured.
5. **Measured after, the look checked.** The six views on the phone tier against phase 1's baseline, the review
   shots by day and at night (nothing far away visibly changed), the guides (performance.md) brought up to date.

## The owner's decisions (to make)

- The aim: about 350 draws in the open views on phones, or another number?
- On phones, may the landmarks' far forms lose their facade textures (a flat colour per part, the texture's average
  baked in)? From past `far` (90 on phones) they're a few pixels across.
- Phase 4 is open-ended: stop once the aim's reached, or take every kind of small far part?

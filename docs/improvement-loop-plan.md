# The improvement loop: nightly passes over the whole city

A scheduled task sends a pass to one dedicated runner session (with the repo
attached and push access) every hour at **22:07, 23:07, 00:07, 01:07, 02:07
and 03:07 GMT**. Each pass starts from fresh `main`, picks the next item from this plan, makes the change, checks
it and merges it to `main`. Merging to `main` puts it live. When every item in
a level is done, the run that finished it writes the next level and the loop
carries on.

## The owner's standing sign-off (2026-11-21)

The owner signed off on these in advance. Each run applies them without
asking, as long as everything in **The rules** below holds:

- **Phases and levels sign themselves off.** When a level's items are done
  and checked, the next level starts. No one waits for a reply.
- **Merge to main.** A run that passes every check merges its own pull
  request. That puts it live on degenemporium.com.
- **Scope, the only kinds of work allowed:**
  1. **Speed and phones**: draw calls, the phone tier, start-up, memory.
     Measured with `?fps` / `?bench` before and after.
  2. **Bugs and tests**: real bugs, flaky or slow tests, test coverage, save
     migrations.
  3. **Visual polish**: z-fighting, cut-out signs that need `occlude()`,
     bloom that washes out, menus at the five widths, ragged seams the blend
     plan already names.
- **Not in scope** (these still need the owner, as CLAUDE.md says): new
  places, pages, districts, art or copy the visitor reads as new content;
  anything that moves (`tests/snapshot.test.ts` is never rewritten by the
  loop); lot prices; balance and reward numbers; anything retired; anything
  about the token, hosting, multiplayer, Cloudflare or Vercel; raising a
  budget in `scripts/budget.mjs`; the `nft-minter` branch.

## The rules each run follows

1. **Start from fresh `main`.** Fetch `origin/main` and work on top of it.
   If the latest "Build site" run on `main` failed, fixing it is this run's
   item, before anything else.
2. **The board sets the order** (the owner's call, 2026-11-22). After rule 1, the
   item is the top card of the **Ready** column on the owner's Works Board
   (https://claude.ai/artifact/GsX2xpXCSNhkr4KFVuQmJH, `cards`, lowest `rank`
   first). Move it to **In progress** when starting, **Checking** once merged,
   **Live** when its "Build site" run passes, or **Needs you** with the question
   in its notes. If Ready is empty, fall back to this plan's order (Track A's
   jobs, then their sweeps, then the hunt, then the levels). A Ready card that
   moves something, adds copy the visitor reads, or is otherwise out of scope
   above gets a short plan or a question, not a build. Each card taken is
   written into this plan (its job entry, ticked when done) and the log, so
   the record stays here. If the board can't be read or written, carry on
   from this plan and catch the board up next pass.
3. **One item per run** (two if both are small). Small, low-risk changes
   that can be reverted. If an item turns out bigger than one run, split it
   in this plan and do the first part.
4. **Read before changing.** Read the area's guide file in `docs/guide/` and
   any plan it names. Check that the item is still open, since some backlog
   items may already be fixed. If one is, mark it done here with a note.
5. **Every check passes, or nothing merges:** `npm run typecheck`,
   `npm run lint`, `npm test`, `npm run test:wide`, `npm run build`,
   `npm run budget`, and `npm run smoke` whenever walk mode, input or
   anything drawn changed. Fix the code, not the test.
6. **Speed work needs numbers.** Measure before and after (`?bench`, or
   `?fps` on the phone tier). Add the numbers to the log. If it isn't faster,
   don't merge it. Write down what was learned instead.
7. **Visual work needs a look.** Use Playwright against `npm run preview` at
   320, 375, 768, 1024 and 1440 px, plus a phone on its side. Shots go in the
   scratchpad, not the repo.
8. **Update the guide file** for whatever changed, and add a line to the
   log below.
9. **Merge.** Open a pull request to `main` titled `Loop: <item>`, then
   merge it (squash). After merging, check that the "Build site" Action
   starts. A failed build doesn't publish, so the live site stays as it was,
   and the next run fixes it first (rule 1).
10. **Stop rather than guess.** If a change needs an owner's decision, or
   the checks can't be made to pass within the run, push the branch with a
   draft pull request titled `Loop (needs owner): <item>`, add the question
   to **Waiting on the owner**, and move on to the next item next time.
11. **Never** force-push `main`, commit to `deploy`, skip or weaken a test,
    raise a budget, or change `FREE_FOR_NOW`, `PUBLIC_GAME_SERVER` or the
    live settings.
12. **Pause switch.** If the line under **Status** says `PAUSED`, the run
    does nothing and ends.

## The board

The owner's kanban board tracks every item: https://claude.ai/artifact/GsX2xpXCSNhkr4KFVuQmJH
(collection `cards`; columns backlog, needs-you, ready, in-progress, checking,
live). A pass that can reach it moves its item's card; this plan stays the
source of truth.

## Status

RUNNING

## Track A: the pro standard (model repairs)

The owner's focus (2026-11-21): bring every part of the map already built up
to a professional standard. For now that means only repairing what's there:
nothing moves, nothing new is added, and nothing is redesigned (changes come
later). The owner sends one screenshot at a time. Each becomes:

- **a job**: the fix at that spot (where, what's wrong, the fix, before and
  after shots from the same angle);
- **a model repair**: the kind of fault and how to fix it anywhere. Every run
  that does a model repair fixes it the same way, then **sweeps** the rest of
  the map for the same fault, a district at a time, and ticks each one off
  below.

Order: a model repair's own job first, then its sweep. Then the next model
repair.

### The hunt (the owner's ask, 2026-11-21)

The loop doesn't only wait for screenshots: it **searches for aesthetic
imperfections and logs them** as jobs for the work schedule. The aim: **find
every cheap build and make it premium.** A hunt run:

1. Takes review shots (`npm run shots`, `npm run seams`, or Playwright on
   `npm run preview` with `?spawn=x,z`) of one district at a time, on foot
   and from the air, by day and at night.
2. Looks for what reads as cheap: bare colours where a material belongs
   (R1), joins that don't meet (R2), slabs cut off open, shapes that don't
   explain themselves, repeated copies side by side, empty or untextured
   patches, flicker, things floating or sunk, edges with no trim, signs or
   props at the wrong scale.
3. Logs each find as a job: the spot, a shot in the log, the fault, and its
   model repair (an existing one, or a new one written in the same form).
4. Fixes nothing in that run: the jobs join the schedule in order.

A hunt runs whenever no job is ready, and once a week otherwise.

**The first night (2026-11-21, the owner's call):** pass 1 takes J1, pass 2
J2, pass 3 the hunt of Endswood, Aldwyn's Green and Lot 9. Passes 4 to 6 take
the owner's next jobs (J3 on), added below after J2 in the owner's order, or
R1's sweep if none have arrived. From 2026-11-22 the Works Board's Ready column
sets the order (rule 2).

### Model repairs

#### R1. Bare slab

- **The fault:** a surface the player walks on or stands close to (a deck,
  gallery, landing, upstand, parapet, soffit) drawn as a bare `toon()` colour.
  It's one flat value with no grain, while the walls beside it carry the
  atlas's board-marked concrete or brick. Up close it reads as a placeholder:
  a grey void, the floor indistinguishable from the walls rising off it, the
  ends of slabs cut off sharp with no cap, so the eye can't tell what it's
  looking at.
- **How to spot it:** in the code, a `flat()`, `quad()`, `upstand()` or
  `parapet()` with a plain material (`CONC`, `PAVING`, `STONE`...) on a
  surface reachable on foot. In a shot, a large single-value patch near the
  camera.
- **The fix, the standard:**
  1. **A surface, not a colour.** Floors take a paving or concrete grain from
     the existing atlases, with joints at a believable module (slabs about
     0.6-1.2 m); walls and upstands take the same board-marked concrete as
     the block's walls. No new texture if an atlas cell already fits; no new
     draws (the atlas, not new materials).
  2. **Floor and wall told apart.** A floor is a step darker or lighter than
     the walls rising from it, and a thin skirting or shadow strip runs where
     they meet (about 5 mm off both faces: nothing flush).
  3. **Every edge finished.** Coping on top of upstands and parapets (a
     slightly wider cap, a different tone), a drip edge under deck fronts,
     ends of walls and slabs capped, never sliced open.
  4. **Every form reads as what it is.** Wherever two slabs meet at a point or
     a shape doesn't explain itself (a core, a bridge or a stair meeting the
     gallery), it's rebuilt so it reads: a stair shows steps, an opening has
     a lintel and jambs, a junction has a landing.
  5. **Ink.** The outline pass catches every structural edge (thin dark line
     on each fold), as the rest of the city.
  6. **Phones:** the same at every tier (grain is the atlas, free); fine trims
     (skirting, drips) near only.
  7. **Checked:** the same angle before and after, by day and night; `?fps`
     draws in the view the same or lower.
- **The sweep:** every walkable deck in the city. Start with Endswood's blocks
  (galleries, balconies, bridges, the podium deck, the cores' landings), then
  The Trenches' projects (decks and walkways), Uptown's plaza decks, the
  stadium's concourse, the mall's upper floors, the Docks' quays and
  walkways, the airport's terminal decks, the Neon Mile's resort terraces,
  Crestmont's terraces and pool decks, Lot 9.
  - [x] Endswood's blocks (J1, parts 1 to 3)
  - [ ] The Trenches
  - [ ] Uptown and Uptown North
  - [ ] Westlake and the civic quarter
  - [ ] Starlight Mall and Palm Court
  - [ ] The Docks
  - [ ] The airport
  - [ ] The Neon Mile
  - [ ] Crestmont
  - [ ] Sunridge
  - [ ] Lot 9
  - [ ] Northgate Air Base
  - [ ] Downtown and the landmarks

#### R2. Driveway meets the street

- **The fault:** a private drive (or any entrance off a street: a forecourt,
  car park, yard or gate) drawn as its own slab and simply laid over
  whatever is under it. It floats above the grass with a thick raw edge
  showing, cuts the sidewalk off square on both sides, and runs past the
  kerb into the carriageway, ending as a thin lip over the road's lane. It
  may also meet the street at an angle that doesn't line up with the kerb.
- **How to spot it:** from the air along any street with lots off it: a
  break in the sidewalk, a pale slab over the road's edge, a visible step
  where the drive leaves the ground. In the code, a drive's ring drawn from
  the house to the street's centre or kerb without the sidewalk's and the
  kerb's lines (`streetplan.ts`'s widths) cut into it.
- **The fix, the standard:**
  1. **The sidewalk is continuous.** It runs straight through the drive at
     its own level and material; the drive stops at the sidewalk's back edge
     and starts again past its front edge. (Where a district's style crosses
     the sidewalk with the drive's paving, the sidewalk's line still shows,
     as scored joints.)
  2. **A dropped kerb.** Where the drive crosses the kerb: the kerb lowered
     over the drive's width, with short ramps (flares) each side, and the
     drive's apron meeting the road's edge exactly, never past it into the
     lane.
  3. **On the ground.** The drive follows the ground's height (`ground under
     a point`) with no raw edge showing; where the land falls away, a
     finished retaining edge or kerb, not a slab's side.
  4. **Lined up.** The drive meets the street square to the kerb (or at the
     street's own bend), centred on its gate, with its edges parallel to
     the gate's piers.
  5. **Finished at both ends.** A gate line (piers, threshold) at the lot
     and an apron at the street; the paving's edges have a trim.
  6. **Collisions and walking** unchanged (walk over the sidewalk and the
     drive with no step); the snapshot test holds every lot, door and
     street where it stands.
- **The sweep:** every drive and entrance off a street. Crestmont (the
  estates, the Drive's houses, the hills' villas), Sunridge (`sunhouses`,
  `sunyards`, `sunridgelots`), Aldwyn's Green and Endswood (Degen's home
  and compound, the rows), Westlake's and the civic quarter's forecourts,
  car parks and service yards everywhere (the mall, the stadium, the
  airport, the Docks, Lot 9, the air base's gates), petrol stations.
  - [ ] Crestmont
  - [ ] Sunridge
  - [ ] Endswood and Aldwyn's Green
  - [ ] Westlake and the civic quarter
  - [ ] Car parks and yards (the mall, the stadium, the airport, the Docks,
        Lot 9, the air base)
  - [ ] Everything else (a search of every entrance off a street)

### Jobs

- [x] **J1 (R1), part 1: the galleries and balconies** (2026-11-22, pass 1; see the log). Part 2 below.
- [x] **J1 (R1), part 2: the bridges' decks, the cores' landings and the podium deck** (2026-11-22, pass 2;
      see the log). The junction where a gallery meets a link's portal is left for a look on foot (J1 part 3).
- [x] **J1 (R1), part 3:** the gallery-to-portal junction checked on foot (2026-11-23, pass 3): the portal
      reads; the fault was a landing post standing in every link's doorway at its tower (15 of 15), drawn
      only, walked through. Cleared (`landingPosts()`, tested). **J1 done**; R1's sweep goes on at The Trenches.
- [ ] **J1 (R1): a gallery walkway on Endswood's flats** (the owner's
      screenshot, 2026-11-21: looking down a gallery towards the highway).
      The deck, its upstands and the slabs either side are plain `CONC`
      (`southblocks3d.ts`, `drawStep()`'s galleries: `flat(b, deck, y,
      CONC)` and `upstand(..., acc)`; `parapet()`); in the middle, where the
      gallery meets something (a core, bridge or stair: check
      `openRuns()` / `CORE_GAP`), slabs meet at a point and read as a broken
      shape. The fix: R1 in full on every gallery, balcony, bridge deck and
      the podium deck of the estate; the junction rebuilt to read. Find the
      exact spot first (the shot's angle: the highway's lanes below to the
      right, the deck running towards them) and take the before shot there.
      Note: the brutalist plan's Phase 1 (the concrete skin, #227) reached
      main the same day and re-dressed the estate's walls; the screenshot
      may predate it. Check what's left of the fault on main first, and
      keep to Phase 1's concrete (`docs/brutalist-plan.md`).
- [x] **J2 (R2), part 1: the hill drives' paving stops at the road's edge** (2026-11-23, pass 4): drawn from
      where both its edges clear the asphalt (mansions.ts `driveStart()`, tested), no longer over the edge line.
- [ ] **J2 (R2), part 2: the hill roads' walls at a drive's mouth**: today a whole 1.5 piece of wall is left out
      each side (landscape.ts `WALLS`, `onMansion()`), so the wall stops square well short of the drive. Run each
      wall up to the drive's kerb and finish its end (a cheek returning along the drive, its coping round the
      corner). Walls are solids: check the walk through the mouth stays clear (R2's rule 6) and the snapshot holds.
- [ ] **J2 (R2): the cypress drives in Crestmont** (the owner's screenshot,
      2026-11-21: a drive lined with cypresses, two stone piers at its
      gate, meeting a curving two-lane road with lamps on its far side). The
      drive is a pale slab floating over the grass, the sidewalk is cut off
      square on both sides of it, and its end runs past the kerb onto the
      road. The fix: R2 in full on this drive and every drive like it in
      Crestmont (the estates' gateways, `estates.ts` / `estates3d.ts`,
      `crestgardens`, `crestbanks`, `coral`); then the owner's second ask:
      **every other driveway in the city checked to line up and not cover
      the sidewalk** (R2's sweep).

## Track C: the motorway exits (signed off by the owner, 2026-11-21)

`docs/exits-plan.md`, signed off as written: nine exits become four
interchanges with two-lane slip ramps, frontage roads, a three-lane deck and
the high-tech kit. Order: from the first pass after the first night's list (J1, J2, the south
hunt), one phase or lettered step a pass, in the plan's order (1, 2a, 2b, 3a...). The new
interchanges stay behind `?exits=new` until Phase 7. Each pass follows the
exits plan's own rules on top of this plan's; Phase 7's snapshot rewrite is
the owner's, on purpose, for the ramps and exits only. Track A's sweeps and
the hunt carry on between exit phases (alternate passes).

- [ ] Phase 1: the standard as rules and tests
- [ ] Phase 2: the interchanges as data (2a, 2b)
- [ ] Phase 3: the deck widened to three lanes (3a, 3b, 3c)
- [ ] Phase 4: the interchanges drawn (4a north, 4b east, 4c south, 4d west)
- [ ] Phase 5: clearing the way (metro portal frames, fence, hedge, props)
- [ ] Phase 6: traffic, taxis, walking, driving (6a, 6b, 6c)
- [ ] Phase 7: the switch (signs, high-tech kit, snapshot, old ramps and 6A
      retired)
- [ ] Phase 8: polish and phones

## Level 1: the safety net (bugs and tests)

Most of these are from the polish plan's §8 and §11 (2026-11-05). Check each
one is still open before fixing it.

- [ ] Corner shops redraw on their own: `save.corners` in tycoon-ui's
      `shown` string (polish §8).
- [ ] "Dorras taken" counts fight purses, delivery bonuses and mission
      rewards (polish §8).
- [ ] The Vault's worth counts the bikes' mods and the fight styles
      (polish §8).
- [ ] The varsity's first-person sleeves are cream, as the wardrobe has
      them (polish §8).
- [ ] The billboard's "EIGHT STATIONS" loses its number (polish §8: boards
      carry no numbers).
- [ ] WebGL context loss: stop the loop and the sound, and show the no-3D
      card's text with Reload (polish §11).
- [ ] Lazy chunks that fail to fetch: one helper that shows a toast and
      retries, used by every dynamic import in walk.ts (polish §11).
- [ ] Tests: timings for each file in the reporter; `cityPlan()` and the
      routes cached across routes.test; motionmatch.test's wall-clock
      assertion made a ratio (polish §11).
- [ ] The 14 small DOM-free modules without a test get one (polish §11).
- [ ] Smoke's `station` scene stalls now and then in a full run on the software renderer ("along the hall
      and down the escalator", 2026-11-22); passes run alone. Find why (a wait too short under load) and
      fix the scene's timing, not by loosening what it checks.

## Level 2: speed and phones

- [ ] Ticks that never check distance get gated on a shared `near()`: the
      Armoury's flags, landmark particles, the Emporium's LED wall and
      hologram, the airport, resorts, strip marks, Liberty Bridge, the metro
      (polish §11). Measure on `?bench`.
- [ ] Pins: no style writes while hidden; traffic lights: `setColorAt`
      only when one changes (polish §11).
- [ ] The boot's headroom: the routes fetched as a JSON asset instead of a
      string in the JS (polish §11; no behaviour change).
- [ ] Bench views for the mall, Sunridge, Southfield, Lot 9's tunnel, the
      river, the swing bridge and the two bridges (polish §11), so later
      speed work can be measured.
- [ ] Phone far-view: the open views toward the 350-draw aim
      (`docs/phone-far-plan.md`, "Where it ended"). Hidden-object culling is
      the owner's call, so it goes to **Waiting on the owner**. Smaller wins
      inside the plan's rules are fine.

## Level 3: visual polish

- [ ] A z-fighting sweep: the review shots (`npm run shots`, `npm run
      seams`) at every district, fixing faces less than 5 mm apart.
- [ ] Cut-out signs seen through buildings: `occlude()` where it's missing.
- [ ] Every menu and card at 320 / 375 / 768 / 1024 / 1440 and phones on
      their side: no sideways scroll, no overlap, no text clipped.
- [ ] Bloom: nothing large passes the threshold (night shots of each
      district).

## Level 4 and on

The run that finishes Level 3 writes Level 4 here. It comes from what the
earlier levels measured and found: the worst `?bench` views, the slowest
tests, the shots with the most seams. The same three kinds of work only.
Each later level does the same.

## Waiting on the owner

(Questions the loop couldn't answer itself. The owner answers here, or in a
session.)

- **Main's build is over the full-tier texture budget (2026-11-21, pass 2).** Brutalist plan
  Phase 2 (#238) added about 70 KB of textures (the bridges' painted block names and the gallery
  sides' wall row), putting `texFull` 23 KB over 4955 KB on GitHub. Which do you want?
  (a) the brutalist plan's session trims its own new textures (a smaller name sheet, the gallery
  row sharing an existing one); (b) revert #238 until it fits; (c) raise `texFull` to about
  5040 KB on purpose (your call only, in `scripts/budget.mjs`). Until one is done, every loop
  pass stops at rule 1.
  **Owner's answer (2026-11-22): (a).** The brutalist plan's session trims its own new
  textures back under 4955 KB; the loop waits for that build to pass.

## The log

(One line for each run: the date, the item, the pull request, the numbers.)

- 2026-11-21, pass 1 (22:07): main's "Build site" #361 failed at typecheck after #238
  (`farLods` imported but unused in `index.ts` since the readout moved to `readout.ts`).
  Fixed by dropping the import (rule 1, #240); typecheck, lint, test, test:wide and build
  pass. **Correction (pass 2):** the local texture bake had not run (it needs
  `CHROMIUM_PATH=/opt/pw-browsers/chromium` in this container and exits 0 without it), so the
  budget's texture rows were never checked here. J1 moves on.
- 2026-11-21, pass 2 (23:07): "Build site" #362 (after #240) failed at the budget: `texFull`
  4977.5 KB of 4955 on GitHub (5023.8 KB here; `texLow` 3349.7 of 3450 is fine). The growth is
  #238's (brutalist plan Phase 2): a new painted sheet of the blocks' names for the bridges
  (`SIGN_TEX` in southblocks3d.ts, 512x640, 36 KB baked) and a new row in the shared wall atlas
  for the gallery sides (`brutalDeck` in infill.ts's `WALL_KINDS`). Trimming them is a change to
  owner-signed new art, and raising a budget is the owner's only, so the question is under
  **Waiting on the owner**. Nothing is live since #235 until main's build passes; rule 1 holds
  every later pass on this until it's answered.
- 2026-11-22, passes 3 to 6 (00:07 to 03:07): main unchanged and #363 still failing at
  `texFull`; each pass checked and stopped at rule 1. Nothing merged.
- 2026-11-22 (the owner, in session): the texture budget goes to the brutalist plan's session to
  trim (answer (a)); the Works Board's Ready column now sets the loop's order (rule 2).
- 2026-11-22, pass 1 (22:07): main green again (#243 trimmed the textures; builds #365 to #368 pass).
  J1 part 1 (R1 on the galleries and balconies, southblocks3d.ts `drawStep()`): the floor `DECK_FLOOR`
  a step lighter than the walls; the front upstand's dark coping and closed ends; near only, slab joints
  about every 1.2 m, a skirting 5 mm off the wall and a drip under the front. All plain colours (they share
  one paint), no new material or texture. Shots at Marten Court before and after (scratchpad).
  Draws not measured this pass (the near trims join each step's near part). Checks: typecheck, lint, test,
  test:wide, build, texture bake, budget (texFull 4918.2 of 4955, texLow 3310.2 of 3450, boot 762.1 of 775)
  pass; smoke 148 steps ok, the station's escalator step stalled once in the full run and passed run alone,
  the same on main and the branch (logged under Level 1 as flaky).
- 2026-11-22, pass 2 (23:07, started 23:28 after pass 1 ran long): J1 part 2 (R1 on the cores' landings, the
  bridges' floors and the podium deck, southblocks3d.ts `drawCore()`, `drawBridge()`, `drawDeck()`). Podium
  shot from above before and after: one flat grey slab, now a jointed 1.2 grid with a capped balustrade.
  Checks: typecheck, lint, test, test:wide, build, texture bake, budget (texFull 4918.2 of 4955, texLow
  3310.2 of 3450) and smoke (150 steps, none failed) pass. Draws not measured (plain colours, near trims).
- 2026-11-23, pass 3 (00:07, started 00:20): J1 part 3. On foot along Marten's floor-6 gallery to its link: the
  portal reads; the fault left was a landing post in the link's doorway at the tower, at all 15 links (drawn
  only, no solid, walked through). `landingPosts()` / `inDoorway()` (southblocks.ts, tested) leave those out.
  J1 done; R1's Endswood sweep ticked. Checks: typecheck, lint, test (with the new test), test:wide, build,
  texture bake, budget (texFull 4918.2 of 4955), smoke 150 steps, none failed.
- 2026-11-23, pass 4 (01:08): J2 part 1. Two hill drives shot where they meet their road: the paving ran over the
  road's edge line into the lane, and the road's wall stops square well short of each side. Part 1 draws the drive
  and its kerbs from where both edges clear the asphalt (mansions.ts `driveStart()`, tested); the walls are part 2.
  Checks: typecheck, lint, test (with the new test), test:wide, build, texture bake, budget (texFull 4918.2 of
  4955), smoke 150 steps, none failed.

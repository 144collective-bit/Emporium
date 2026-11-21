# The improvement loop: nightly passes over the whole city

A scheduled task runs a fresh cloud session every hour from **22:00 to 04:00
GMT**. Each run picks the next item from this plan, makes the change, checks
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
2. **One item per run** (two if both are small). Small, low-risk changes
   that can be reverted. If an item turns out bigger than one run, split it
   in this plan and do the first part.
3. **Read before changing.** Read the area's guide file in `docs/guide/` and
   any plan it names. Check that the item is still open, since some backlog
   items may already be fixed. If one is, mark it done here with a note.
4. **Every check passes, or nothing merges:** `npm run typecheck`,
   `npm run lint`, `npm test`, `npm run test:wide`, `npm run build`,
   `npm run budget`, and `npm run smoke` whenever walk mode, input or
   anything drawn changed. Fix the code, not the test.
5. **Speed work needs numbers.** Measure before and after (`?bench`, or
   `?fps` on the phone tier). Add the numbers to the log. If it isn't faster,
   don't merge it. Write down what was learned instead.
6. **Visual work needs a look.** Use Playwright against `npm run preview` at
   320, 375, 768, 1024 and 1440 px, plus a phone on its side. Shots go in the
   scratchpad, not the repo.
7. **Update the guide file** for whatever changed, and add a line to the
   log below.
8. **Merge.** Open a pull request to `main` titled `Loop: <item>`, then
   merge it (squash). After merging, check that the "Build site" Action
   starts. A failed build doesn't publish, so the live site stays as it was,
   and the next run fixes it first (rule 1).
9. **Stop rather than guess.** If a change needs an owner's decision, or
   the checks can't be made to pass within the run, push the branch with a
   draft pull request titled `Loop (needs owner): <item>`, add the question
   to **Waiting on the owner**, and move on to the next item next time.
10. **Never** force-push `main`, commit to `deploy`, skip or weaken a test,
    raise a budget, or change `FREE_FOR_NOW`, `PUBLIC_GAME_SERVER` or the
    live settings.
11. **Pause switch.** If the line under **Status** says `PAUSED`, the run
    does nothing and ends.

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
  - [ ] Endswood's blocks
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

### Jobs

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

## The log

(One line for each run: the date, the item, the pull request, the numbers.)

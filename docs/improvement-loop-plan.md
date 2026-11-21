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

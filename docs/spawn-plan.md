# The spawn plan: Degen wakes up at home

The owner's call (2026-11-18): "can we have degen spawning in to his house upon loading. This will then allow time
to load the rest of the needed assets." The owner's answers:

- **Where:** in the living room (home.ts `ROOM`), by the sofa, straight into Walk mode. Single player no longer
  flies in over the City view first; the City / Walk switch still goes out to the City view. The title screen has no
  way straight into the City view: it's to be for the admin only, behind a password, later (the owner's call,
  2026-11-18: not in this plan).
- **What covers the loading:**
  - **The doors wait.** The ways out of the room (the front door, the side door, the stairs up to the terrace, which
    looks out over the Close) read "Getting ready…" until the street outside is built, then as they were. Nothing
    outside is ever seen half-built.
  - **The curtains.** The room's two windows (front, over the sofa; back, over the counter) have curtains drawn
    while the city loads, and they open when it's ready. (The windows are painted panels today, not glass you see
    through, so the curtains are the "ready" sign, not what hides the city.)
  - **The wake-up.** He gets up off the sofa as you arrive: a second or two of cover, and a start that feels like
    his morning.
- **Who:** every player, new ones too. A new player's first walk no longer starts downtown by the Emporium
  (`startsAtHome()` goes).
- **Getting started** gets a new first step at home (the owner's call, 2026-11-18): **Head out**, out of the front
  door; the stall downtown is the second.

**Status:** Phases 1 and 2 built and signed off (2026-11-18), and with 3a merged to `main` (PR #189); 3b waits on
the owner. Each phase with the owner's sign-off.

## Today, measured

How start-up runs now (`CityMap.astro` `enter()`, index.ts `bootCity()`): the title screen covers the page while
the whole city boots behind it (`await booted`: the ground, the landmarks, downtown, the outer districts, traffic and
the crowd, the trees and lamps, the sky, every shader compiled, the built textures), and only then can Single player
go in, with the fly-in over the City view. Walk starts at home for a returning player (in the yard,
`HOME_SPAWN`), and Degen's compound is drawn by the south's chunk (`LAZY_DISTRICTS` `south`, `home3d.ts`), which loads
only once he's near it.

Measured on 2026-11-18, headless Chromium on software graphics (slow, so read the numbers against each other, not
as a real phone's), the built textures not baked (painted in the browser), a fresh save:

| Desktop window, 1440 wide (the medium tier: few cores, software graphics) | |
|---|---|
| Page opened to the title screen's "The city is ready" | 15.9 s |
| of which the boot itself (`bootCity()` to its first frame) | 6.3 s (building 4.4, shaders 0.1) |
| so before the boot starts (the page's code fetched and run, the baked data, the fonts) | about 9.6 s |
| Walk pressed (at home) to the south's chunk loaded, the compound drawn | 5.8 s |
| Walk pressed to every site in the city built | not reached in 15 min (1,768 still waiting) |

What it says:

- **Most of the wait is before the boot.** About 9.6 s go on fetching and running the city's code (the DOM-free
  data worked out as modules load, such as the south's street web) before `bootCity()` starts. The house can't hide
  that unless what the room needs is split off from it too: Phase 3 measures it piece by piece.
- **The house is the last thing there today.** A returning player's walk starts at home 5.8 s before the compound
  is drawn. Phase 1 asks for it first.
- **"The street is ready" has to mean near the house**, not the whole city: the whole city's sites take far longer
  than anyone waits in a room (on this machine they never finished). The doors' rule counts only the sites within
  reach of the gates.
- The phone tier isn't measured here: on software graphics an emulated phone runs on the same CPU, so it says
  nothing more. Phase 1 measures it with `?bench` on a real phone, before and after.

## The phases

1. **Spawn in the room** (*built*, signed off 2026-11-18). Single player (and Multiplayer, where it's on)
   goes from the title screen straight into Walk mode in the living room (CityMap.astro `enter()`, index.ts
   `city.wake()`): `HOME_WAKE` in home.ts (in `ROOM`, between the sofa and the low table, facing the telly, out of
   reach of every prompt), for every player; `startsAtHome()` and its first-walk rule are gone, and the Walk button
   from the City view starts in the yard (`HOME_SPAWN`) as the panel and fast travel do. `?spawn=` still wins. While
   the title screen still covers the page, the south's chunk (with his house) is loaded (`districts.load()`, given
   10 s at most) and what's within 25 of the room is built (`works.want()`), so the room is whole when it lifts.
   Where the owner has closed walking (live settings) Single player does the fly-in as before; where they've closed
   his house, he wakes in the yard. **The doors wait**: `spawn.ts` (DOM-free, tested in `tests/spawn.test.ts`, on
   `DOM_FREE`) says the street is ready once every lazy district within `READY_REACH` (60) of the gates has loaded
   (`dueDistricts()`) and no site within that reach is waiting (tilework.ts `waitingNear()`), or `GIVE_UP_MS` (25 s)
   has passed; index.ts asks it a few times a second (`streetUp()`) and keeps the answer once it's yes. Until then the
   ways out (home.ts `HOME_WAITS`: the front door, the side door, the stairs up) read `WAITING` ("Getting ready…",
   `homePlaces(y, ready)`) and F toasts "Nearly ready · the street is loading". The City button's first trip out
   flies to the home view (where the fly-in ran behind the title screen). **Getting started's first step**
   (guide.ts `GUIDE`): **Head out** ("Walk out of your front door", 100 Dorras, 20 XP), its beam over the yard, done
   when the save's new lifetime counter `leftHome` (out of the front or the side door) is 1; `GUIDE_STEPS` is 8. The
   save's `guide` carries `steps` (how many there were when it was saved): a guide saved before (no `steps`) counts
   one on past its first step, and one that hadn't started starts with Head out (tycoon.ts `guideStepOf()`, in
   `cleanSave()`, tested in `tests/guide.test.ts`); the save's version is unchanged. The smoke test's Single player
   goes straight into walking (no Walk toggle) and its `wake` scene starts with no spot: in the room, then out of the
   front door once it stops waiting.
2. **The wake-up and the curtains** (*built*, signed off 2026-11-18; the owner left the choices to us:
   deep red curtains, sat on the sofa, the curtains open with the doors). He's on the sofa as the room appears
   (home.ts `SOFA_SEAT`: moments.ts's bench mark at the sofa's front, its cushion `h` 0.24 up, facing the telly;
   walk.ts `enter(spawn, seat)` puts him on it with `moments.sit()`, already seated) and
   stands up onto `HOME_WAKE` (now just in front of the sofa) about 0.7 s after the menu has gone (walk.ts
   `standUp()`, the bench's own stand-up; any push of the keys stands him up sooner, as on a bench). The view starts
   in front of him, looking back at him on the sofa (behind him is the wall); once he's up the
   view swings round behind him (walk.ts `wakeYaw`), so ahead is into the room. It lets go the moment the view is
   turned by hand (`look()`) and after 2.5 s whatever happens (`WAKE_SWING`): the owner found it held the view
   against him after the couch (2026-11-18); the smoke test's `wakelook` scene turns the view as he gets up. Under
   `prefers-reduced-motion` he's standing at `HOME_WAKE` already. **The curtains**: two on each of the room's
   windows (home.ts `ROOM_WINDOWS`, which home3d.ts now draws the windows from, unmoved; `CURTAIN`, `curtainPanels(k)`
   from drawn, 0, to bunched at the ends, 1), deep red (`CURTAIN_RED`), lit from inside as the room is; four panels
   in one instanced mesh on the main thread (home3d.ts `addCurtains()`, from south3d.ts's register: one draw call,
   no shadows). Drawn as he wakes (spawn.ts `curtains.open`, set by index.ts before his house is drawn), drawn back
   over 1.4 s once the street is ready (`streetUp()`, now asked every frame while he waits too, not only by the
   doors' prompts); under reduced motion they're simply open or shut. Every other way into the house finds them
   open. Tested in `tests/home.test.ts` (the seat, the panels: covering, bunched, in the room, off the glass, over
   the furniture) and `tests/moments.test.ts` (`sit()`). Shots: `docs/spawn-shots/`.
3. **The boot split (the real saving).** The title screen waits only for what the room needs: the renderer, the
   sky, Degen and walk mode, the compound (its own small chunk, out of `south3d.ts`), their shaders. Then you're in,
   and the rest of the city's boot (the landmarks, downtown, the outer districts, traffic and the crowd, the trees
   and lamps, the far forms) builds behind the walls in slices between frames, as the sites do, with the doors
   waiting on it. Measured with `?bench` and `?fps` before and after, on the phone tier too; the budgets
   (`scripts/budget.mjs`) not raised. `?bench` and the texture bake keep the whole boot first (they need
   everything there). The riskiest phase: much of the boot expects the city to exist (places, pins, solids,
   the crowd), so it's done in small steps, each with the smoke test.

   **Measured first** (2026-11-18, the same headless desktop on software graphics: a CPU profile of the page and the
   boot's own steps as its loader bar moves; the earlier "15.9 s to ready" was the measuring script's own polling
   held up by the software renderer: the city is really ready at 8.2 s here):

   | From the page opening | | What |
   |---|---|---|
   | 0 to 0.45 s | 0.45 s | the page itself (HTML, styles) |
   | 0.45 to 0.7 s | 0.2 s | waiting on the live settings before the city's code is asked for (`await liveFirst` in `go3d()`: up to `LIVE_TIMEOUT`, 1.5 s, on the live site when the backend is slow; it failed fast here) |
   | 0.7 to 2.9 s | 2.2 s | the city's code downloaded (about 50 ms here) and run as it loads: the south's street web laid out (`south.ts`, about 1.2 s of it), three.js, kit.ts, the highway's dressing (`viadress.ts`), the south's ground (`southground.ts`), world.ts, the street plan, the solids |
   | 2.9 to 3.2 s | 0.25 s | the boot: fonts and art |
   | 3.2 to 4.6 s | 1.5 s | the boot: the whole city's ground (`buildGround()`) |
   | 4.6 to 6.5 s | 1.8 s | the boot: the landmarks, downtown, the outer districts, the garage, the wall |
   | 6.5 to 6.7 s | 0.25 s | the boot: trees, lamps, bus stops |
   | 6.7 to 7.1 s | 0.4 s | the boot: traffic, the crowd, the sky |
   | 7.1 to 8.2 s | 1.1 s | the boot: the tiles and sites round the home view, the shaders, the built textures; walk mode and the rest set up; ready |

   What the room needs of that: the page, the code (not all of it run), the art, the ground round the house, Degen,
   walk mode and the sky. What it doesn't: the rest of the city's ground, the landmarks, downtown and the districts,
   traffic and the crowd (about 3.5 s of the boot here, all of it able to come in behind the walls). So Phase 3 in
   two steps:

   - **3a, the quick wins (low risk):** ask for the city's code at once, beside the live settings, not after them
     (up to 1.5 s on the live site); and lay out the south's street web when the site is built, not in the browser
     (`baked()`, as the traffic's routes are: about 1.2 s here, more on a phone).
   - **3b, the split:** the boot builds the room's needs first and the rest behind the walls in slices.

   **3a built** (merged to `main` with Phases 1 and 2, PR #189): `go3d()` asks for the code before awaiting the live
   settings, and the closes and crescents are baked (`GROWN`, `south-grown`). Measured again, the same way, two runs
   each:

   | | the boot starts | ready |
   |---|---|---|
   | before | 2.86 s, 2.91 s | 8.19 s, 8.21 s |
   | after 3a | 2.70 s, 2.24 s | 8.09 s, 7.42 s |

   `south.ts` as it loads went from about 1.2 s to 0.5-0.65 s (what's left is noding the street web and tracing its
   blocks). The live settings' saving doesn't show here (they fail at once in this sandbox); on the live site it's up
   to 1.5 s when the backend is slow. The runs differ by more than the saving, so 3a is a small step; the boot's own
   5.3 s is 3b's.
4. **Polish.** A small loading line in the room while the street gets ready (in `chrome`), the copy (draft), the
   room's light by day and at night with the curtains, every width (320, 375, 768, 1024, 1440, phones on their
   side), the guide files (`menus.md`'s start menu, `endswood.md`'s home, `performance.md`'s start-up,
   `walk-mode.md`), and the home plan's note that walking starts in the room.

## Checked after the merge (2026-11-18)

On `main` as merged (PR #189): the "Build site" Action (run 302) passed every step; every smoke scene passed (wake,
home, homegarage, hometerrace, homeworkshop, homestash, homewardrobe, car, foot, guns, metro, karts, fly, sky, stair,
pad, touch); at 320, 375, 768, 1024 and 1440 wide and a phone upright and on its side, no sideways scroll, the doors'
prompt and the guide's Head out card on screen and apart, no page errors. Not yet: a real phone's `?bench`.

## The owner's answers (2026-11-18)

- **Getting started's first step:** a new one at home, **Head out** (built in Phase 1).
- **The City view from the title screen:** no; it's to be for the admin only, behind a password, later (not in
  this plan).

## Waking in the flat (2026-11-23, docs/brutalist-plan.md Phase 7a)

Once Degen owns his flat in Kite Point (the save's `flat`) he can choose on its card to wake there instead (`flat.wake`,
tycoon.ts `wakeAt()`). Then `wake()` in index.ts loads the estate's blocks (`south-blocks`) instead of the south, wants
what's round the flat built, opens its door (southsky.ts `setFlatOpen()`) and starts him standing by its front windows
(`FLAT.wake`, at its floor); `?spawn=` still wins, and home stays the default.

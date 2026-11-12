# Live settings

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

- **Live settings** (the owner's call): the owner switches parts of the
  city from outside the code, in a private command center, through the
  backend's public config (`LIVE_URL`, public settings only).
  - The rules are `live.ts` (DOM-free, tested in `tests/live.test.ts`):
    `readLive()` reads `place.<spot>` and `feature.<id>` ({ open, note }),
    `banner.<id>` ({ text, place, from, until }) and `maintenance` ({ on,
    message, eta }); anything unknown or wrong is left out, so no config,
    a broken one or a backend that's down is the city as it is in the code.
    `LIVE_PLACES` (every spot with a pin: keep it in step with `PLACES`, the
    test checks) and `LIVE_FEATURES` (walk, drive, fly, karts,
    fight, guns (the gun stores' counters), prizes (the kart races',
    series' and bouts' Dorras: closed, they run and pay 0, the XP as
    before), taxi, metro, travel) are what can be switched; the command
    center reads these lists from here, so a new place or feature is added
    once, here.
  - `live-client.ts` fetches it: once at the boot (the 3D city's boot waits
    at most `LIVE_TIMEOUT` for it, while its code downloads), again every
    `POLL_MS` while the tab is showing, the last copy kept in localStorage
    (`degen-city-live-v1`); off under `?bake-textures` and `?bench`.
    Everything gated asks `live` as it happens: a closed place's panel
    (`open()` in index.ts) keeps its kicker and name and says it's closed
    (`.live-closed`, its note or "closed for now"), nothing mounted in it;
    a closed feature's way in toasts its closed line instead (`startWalking()`,
    Build's `setBuild()`, walk mode's `act()` via `GATED` (getting into the
    car or aircraft, never out), the metro's doors, the world map's taxi and
    fast travel). A new way into a feature goes through `live.closed()`.
  - The owner's notice is `[data-live-banner]`, first in `.city-hud` (in
    `chrome`): one at a time, a Go to its place, its × hiding that notice
    (id and words) for good (`degen-city-notices-v1`). Maintenance is
    `[data-maint]` over everything, the start menu too: the city doesn't
    boot behind it (`go3d()` waits), it stops a city that's running, and
    the page reloads when it lifts. Styles in `src/styles/live.css`.
  - Copy from the config is shown as text only (`textContent`), one line,
    cut to `TEXT_MAX`.

# The settings plan

The owner's call (2026-11-21): "rebuild the settings menus. Keep the style
but we need to remove some things, tidy it up, improve UI experience and
add new settings to the game." The hub's Settings tab rebuilt in the menu
plan's arcade kit (`docs/menu-plan.md`, the cabinet palette `--m-*`), one
settings record, new graphics, camera and sound settings. The owner asked
for it built in one go and reviewed once at the end (not phase by phase).
Keep this file up to date.

## Where it started

- One long Settings page: The city (Time, Sky, Sound, Reset view, Labels),
  On foot (Look speed, Invert look, First person, Touch buttons, Hold or
  toggle, Shooting), a Controls fold with a fold a mode of every key, and
  Credits.
- The start screen's Options pane copied Time, Weather, Sound and Credits.
- Time and Sky weren't kept; Labels had its own key
  (`degen-city-labels-v1`); the walk's settings lived in
  `degen-city-walk-v1`; nothing could be put back to its default.
- Arrow keys on a focused slider moved the focus instead of the value, so
  look speed and opacity couldn't be set from the keyboard or a gamepad.

## The owner's picks

- **Sub-tabs inside Settings**: Game · Graphics · Camera · Controls ·
  Touch · Sound. Touch shows on touch screens only.
- **Rows are `‹ Value ›` pickers**: the label left, the value right;
  left and right (arrow keys, the d-pad, the ‹ › buttons) step it, a tap on
  the value steps it on. Ranges are the same picker with a bar under the
  value (and a drag along it). Holding left or right keeps stepping
  (hold-to-repeat), on the keys, the d-pad and the ‹ › buttons.
- **A dot beside anything changed** from its default.
- **Reset** at the foot of each sub-tab (that tab only) and **Reset all
  settings** at the foot of Game (asks first; never touches the game save).
- **One record**: `degen-city-settings-v1` (`settings.ts`, DOM-free,
  `cleanSettings()`), in `BACKUP_KEYS`. On first load it takes Labels from
  `degen-city-labels-v1` and look speed, invert, aim when firing, the touch
  buttons and hold or toggle from `degen-city-walk-v1`, which keeps only
  what the walk remembers itself (the control cards seen).
- **Removed**: the start screen's Options pane (its button is now
  Settings and opens the hub's Settings over the title screen), the long
  folds of keys (now a `‹ Mode ›` picker and that mode's keys for the
  input in use), Reset view (Back to City view and the header's City
  button do it).
- **Time and Sky** stay in Settings, on Game, and are now kept.

## What each tab holds

| Tab | Rows |
|---|---|
| Game | Time (Live, Day, Sunset, Night), Sky (Auto, Clear, Rain), Labels, Credits, Reset all |
| Graphics | Quality (Auto, Low, Medium, High), Shadows, Bloom, Resolution (50-100%), Frame rate (Auto, 60, 30) |
| Camera | Field of view (45-80°, 52 as before), Camera shake, Vehicle view (Near, Far, First), Fly speed (Slow, Normal, Fast), Look speed, Invert look, On foot view (walking only) |
| Controls | Hold or toggle (Sprint, Aim, Crouch, Ring block, Guard), Aim when firing, Controls card (walking), Keys (`‹ Mode ›`) |
| Touch | Size, Opacity, Left-handed, Arrange buttons |
| Sound | Sound (Off, On: never on by itself), Volume |

## How each works

- **Quality** picks the tier (`gputier.ts`) instead of the device: the
  city is built for its tier, so a change asks *Reload now* / *Later*
  (Later: the next visit). A tier set by hand still steps down after the
  graphics stopped lately (`LOST_DAYS`), so a phone that can't hold High
  doesn't crash again and again. Auto is as before.
- **Shadows and Bloom**: set Off by hand, the step-down never turns them
  back on; set On, it can still lower them when frames are slow
  (`quality.ts`, unchanged). What Auto lowered isn't shown (the owner's
  pick). Shadows are walk mode's (the City view has none).
- **Resolution** scales the pixel ratio the tier allows (live); the
  step-down's pixels come off that.
- **Frame rate**: Auto is as before (fast screens every other refresh;
  phones 30 at rest); 60 and 30 cap every frame.
- **Field of view** moves every view by the same amount from its own (on
  foot 52, first person 70, the car's 58 and so on): `fovShift()`. The
  City view's camera keeps its own.
- **Camera shake** off: no shake from landings, bumps, knocks, the kart or
  the ring. Reduced motion already has none.
- **Vehicle view**: the car, the bike, the boat and the aircraft start in
  it (the views plan's "near, every time" now the default of a setting).
  The ring and the kart keep their own.
- **Fly speed** scales City view's free camera (`FLY`); **Look speed**
  and **Invert look** work there too (the right mouse button's look).
- **Volume** sets the sound's master level (`sound.setVolume()`).
- **First person** and **Sound** aren't kept (as before): they act on the
  walk and the sound now.

## The files

- `settings.ts` (DOM-free, in the boot, tested in `tests/settings.test.ts`):
  the record, its defaults, `cleanSettings()` (and the first load's
  migration), and what the game reads: `fovShift()`, `flyScale()`,
  `fpsCap()`, `pixelRatio()`, `masterGain()`.
- `settings-rows.ts` (DOM-free, never in the boot: the page's build and the
  tab's chunk): the rows (`ROWS`, `TABS`), `valueOf()`, `patchFor()`,
  `stepValue()`, `valueAt()`, `label()`, `changed()`, `tabChanged()`,
  `resetPatch()`.
- `settings-store.ts` (in the boot, small): the record in this browser
  (`settings()`, `setSettings()`, `onSettings()`; the first load's
  migration kept at once), `actions` the city fills in (sound, first
  person; `soundWanted` before the city's up) and `boot.quality`.
- `settings-ui.ts` (its own chunk, loaded the first time Settings shows,
  hub.ts): the sub-tabs, the pickers, the dots, the resets, the reload
  prompt, the keys' mode picker.
- `gputier.ts` `pickTier(device, want)`: a tier set by hand.
- The kit (`menukit.ts`): `data-mk-skip` is passed over by the arrows and
  the d-pad (the ◀ ▶); a focused `[data-pick-val]` hears left and right as
  `mk-step`. The hub: the d-pad held repeats; LT / RT send `mk-subtab`.
- The page: the rows made from `ROWS` in the hub's Settings page
  (`[data-settings]`), the keys still made from `keymap.ts`, one `[data-km]`
  a mode. Styles: `.set-*` in `menus.css`.
- What follows them: `index.ts` (the tier, time, sky, labels, volume,
  pixels, bloom, shadows, the frame cap, the fly camera's speed and look),
  `walk.ts` (look, hold or toggle, aim when firing, the touch buttons, the
  field of view, the landing's shake; first person as an action),
  `drive.ts`, `boat.ts`, `fly.ts` (the starting view, the field of view,
  the shake), `kart.ts` and `fight.ts` (the field of view, the shake),
  `sound.ts` / `soundlazy.ts` (`setVolume()`).

## The boot's budget

Main stood at 769.8 KB of the boot's 770 before this; the settings take it
to about 771 (the record and its store must be there at the boot: the
tier, the sky and the labels are read before the city is built). The
rows, the pickers and the tab are out of it. The owner raised the boot's
budget to 772 for it, on purpose (2026-11-21); the same day main's raise to
775 for the brutalist plan's Phase 1 took it in.

## Status

Built in one go (the owner's pick), waiting on the owner's sign-off.

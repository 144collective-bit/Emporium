# The sound plan: a city that sounds real

The owner's call (2026-11-23): "Can we improve the sounds of the game to be
more realistic. Everything from street noise, gun sounds, engine sounds etc.
Also the sound of steps need to be improved." The owner's answers:

- **Recorded and synthesised together (hybrid):** a set of short recordings for
  what synthesis can't fake (gun bodies, footsteps, engine loops, street beds);
  today's synth (`sound.ts`) stays as the fallback and for everything that
  already works (the beats, bells, birds, the game's chimes).
- **Footsteps first.**
- **Up to about 2 MB of audio**, fetched only when the visitor turns sound on.
- **Plan first**, then one phase at a time, each with the owner's sign-off.

## Where it stands (2026-11-23)

- Every sound is synthesised: oscillators and filtered noise, no audio files
  (`sound.ts`, loaded on the first Sound tap by `soundlazy.ts`).
- **Degen makes no footsteps.** The only steps in the city are the civic
  square's crowd bed (`civicMurmur`).
- **Guns** (`sfx('shot…')`) are a sine punch, a noise crack, a click and a
  casing tink, with one fixed street echo (`echoIn`, a single delay) wherever
  you are. Far shots are only quieter (`gain`): not muffled, late or panned.
- **Engines** (`engine(revs, voice)`) are three oscillators through a low-pass
  with a slow lump, one graph for every voice: no gears, no throttle against
  coasting, no tyre roll or wind at speed. The traffic has no engines of its
  own; it's a filtered-noise rush by district (`roadGain`).
- **The street** is beds whose levels follow the district (`ambienceAt()`):
  nothing sits at a point, so nothing passes from one ear to the other, and
  the only space is that one delay.

## What holds throughout

- **Sound is off until the visitor turns it on** (as now); no audio is fetched
  before that tap. Under `prefers-reduced-motion` nothing changes for sound.
- **Rules and view split:** what decides a sound (a foot planting, the surface,
  the gear, the space round you) goes in DOM-free files with tests and a seeded
  generator; `sound.ts` only plays it. Each new rules file goes on `DOM_FREE`.
- **The synth is the fallback.** If the audio pack doesn't arrive, or a sound
  isn't in it, today's synthesised sound plays; nothing goes silent.
- **The audio pack has its own budget**, `audio: 2048` KB in
  `scripts/budget.mjs` (the owner's call: "up to about 2 MB"), raised only on
  purpose like every other budget.
- **Licences:** only CC0 (public domain) recordings, or the owner's own. Every
  file is listed with its source and licence in `src/assets/audio/CREDITS.md`.
  File names say what the sound is (`step-gravel-3`), nothing else.
- **Phones:** a cap on voices playing at once (16, 8 on the low tier), the
  cheaper echo on the low tier, and the positional sources trimmed (below).
- **Nothing threatening:** the guns stay the dummies' and the drones' (target
  practice, the gun store, the Fight Club). No shots from the crowd, no
  screams, nothing that sounds aimed at you.

## How the recordings are made to sound alive

The same tricks for every recording:

- **Several takes of each sound** (4-6 footsteps a surface, 3-4 shots a gun),
  picked at random but never the same take twice in a row.
- **Small random changes** on every play: pitch ±4%, level ±2 dB, a few
  milliseconds' offset.
- **Layers:** a recorded body plus a synthesised top or tail (as the guns'
  crack and echo are now), so the same take sounds different in a different
  place.
- **Format:** AAC (`.m4a`, mono, 48-96 kbps), which every current browser
  decodes, Safari included. Loops are trimmed of the encoder's padding when
  they're decoded, so they don't click.

## The phases

### Phase 1: footsteps (built, waiting on the owner's sign-off)

The owner's call for this phase (2026-11-23): **synthesised steps only**, so
the audio pack's loader (`soundbank.ts`), its `audio` budget line and
`CREDITS.md` move to the first phase that has recordings; the steps' events
already name a take per surface, ready for recorded takes to slot in.

- **When:** `footsteps.ts` (DOM-free, tested in `tests/footsteps.test.ts`,
  loaded the first time he's on foot, its own chunk). A step is a foot coming
  down: the motion capture's foot locking onto the ground (animator.ts
  `feet[i].locked` going on), or the procedural walk's going into its stance
  (locomotion.ts `feet[i].stance`) until the capture's in, so every step lands
  when a foot does, at any speed and in any clip. No two steps of a foot closer
  than `STEPS.gap`, nor of both than `STEPS.pair`; the idle's weight shifting
  (under `STEPS.idle`) is silent, and so is anything else posing his legs (a
  vault, a moment, the dance, a fist's whole-body move).
- **How:** the gait by his speed against movesim.ts `GAITS` (creep crouched,
  walk, jog, sprint), its `weight` softer crouched; a **landing** from a fall
  over `STEPS.land`, heavier the harder (to `LAND_ROLL`), the feet locking with
  it quiet; a **scuff** pulling up from a run or turning on the spot; a
  **slide**'s scrape as it starts.
- **On what:** `surfaceAt(x, z, y)` asks groundheight.ts's layers in their
  order, as `groundAt()` does, and the one that answers says what it is
  (`LAYER_SURFACE`: the jetty's, the rec bridge's and the waterfront deck's
  boards, the swing and Liberty bridges' metal, the turntable's, the mall's, the
  Skywalk's and Palm Court's tile, the tunnels' and the decks' concrete, the
  civic steps' and terraces' paving, the circuit's asphalt, his house's
  floorboards, home.ts `inHouse()`); on open ground, a street's paved width is
  asphalt (`onStreet()`, PLAN's streets at street level in cells), else the
  cover that has most of it (ground.ts `coverAt()`, `COVER_SURFACE`: grass, dirt,
  gravel, paving, concrete); a block's slab is paving.
- **Wet** in the rain (over `STEPS.dryUnder`) out of doors, never under a
  roof (the house, the tunnels, the mall); a splash now and then on hard ground.
- **Takes:** each event names one of `STEPS.takes` takes (never the last one
  played on that surface) and a detune, from a seeded generator.
- **The sound** (sound.ts `step()`, through its own bus, at most 4 at once):
  the heel and then the ball of the foot, closer together and the ball harder
  the faster he goes, a rustle of clothes at a run; on asphalt and paving a
  rubber sole's dull thud with a little grit, tile's click, the boards' hollow
  knock, metal's ring, gravel's scatter of crunching grains, dirt's dull thud,
  grass's swish; wet, a slap and a hiss (a squelch on grass); a landing's two
  feet and thump; a scuff's drag; a slide's scrape. Each take pitched its own
  way. A limiter on the master now holds every loud moment under clipping.
- Only Degen's steps (the owner's call: the crowd's later), one set of trainer
  steps (shoes from the wardrobe later). Not in the Fight Club's ring (a fight
  has its own sounds).
- **Levels** (rendered offline, the background muted): a walking step peaks
  about 8 dB over the town's hum, a sprint's a few dB more, a creep's well
  under; a gunshot stays about 10 dB over a step; a hard landing is the
  loudest of them.

Checks: the footsteps tests; `npm run smoke` after (walk.ts changed); by ear
on every surface, at every gait, on a phone and a desktop (the owner's).

### Phase 2: guns

About 500 KB.

- **The shot's body is recorded**, one set a gun class (pistol, SMG, shotgun,
  rifle, revolver, burst carbine, belt-fed), with the synth's punch and crack
  kept on top for weight. The mechanics (slide, bolt, pump, mag out and in,
  the dry click) are recorded too.
- **The tail follows the space** (`soundspace.ts`, DOM-free, tested): a short,
  sharp slap between tall buildings, a long roll over open ground and water, a
  tight room at the gun store's range and the Fight Club, a boom underground.
  It's chosen from what's already known (`ambienceAt()`: the built-up hums,
  open land, indoors, below ground) and the walls round you (`solids`).
- **Distance:** other players' shots and far drones are muffled (a low-pass by
  distance), arrive late (the speed of sound, capped so a shot never feels
  laggy), and sit left or right of you.
- Casings land on the surface they fall on (Phase 1's surfaces).
- Each shot dips the background for a moment (ducking), so it hits harder
  without being louder.

### Phase 3: engines and traffic

About 700 KB.

- `gearbox.ts` (DOM-free, tested): gives each vehicle a gear and rpm from its
  speed and throttle (the drive's sim already has both). Revs climb, drop on
  each change up, and blip on a change down. Automatics shift smoothly; the
  bikes and the race car shift harder.
- **Recorded engine loops**, a few rpm steps each (idle, low, mid, high) for
  each family of voices (saloon, small hatch, V8, race, bike, scooter, kart,
  boat outboard), cross-faded and pitched by rpm. On throttle and off
  throttle are separate loops, so coasting sounds like coasting. Pops and
  crackle on lift-off for the V8 and race car. The Glow Pod's electric whine
  stays synthesised.
- **Under the engine:** tyre roll by surface and speed (asphalt, cobbles,
  gravel, grass), wind rising with speed, a clunk over kerbs and bumps, the
  tyres' squeal recorded (the synth's `tyres()` as fallback).
- **The traffic:** the 4 nearest cars (2 on phones) each get an engine of
  their own, placed where they are, with the pitch shift as they pass (the
  Doppler effect). The rest stays the district's rush.

### Phase 4: the street and the spaces

About 400 KB.

- **Recorded beds** for the town's hum, the traffic's rush, rain (on the
  ground, and on a roof or an umbrella when you're under one), wind and the
  river, replacing their synthesised versions where they're in the pack.
- **Sounds from a point** for what's already there: horns, bus doors, sirens,
  the el, shop doors, the crowd's chatter round groups of people, the boombox,
  the club, so they're heard from the way they are and move as you turn.
- **The space** (Phase 2's `soundspace.ts`) on everything: street canyons,
  parks, tunnels, the metro, the mall. Outdoors is muffled when you go in.

### Phase 5: the mix and Settings

- Settings > Sound gets **Effects, Vehicles and Ambience** sliders under
  Volume (one row each, the arcade kit, labels of 1-3 words), kept in the
  settings record with its migration.
- A last pass on levels across the whole city, by ear, on a phone and a
  desktop, with `?fps` and `?bench` before and after to check nothing got
  heavier.

## The owner's answers (2026-11-23)

1. **Where the recordings come from:** CC0 packs found on GitHub and npm (this
   session's network can't reach Freesound, OpenGameArt or Kenney's site),
   each listed in `CREDITS.md`.
2. **Shoes:** one set of trainer steps for now; shoes from the wardrobe later.
3. **The crowd's footsteps:** not in Phase 1, only Degen's.

## Status

- Plan written, 2026-11-23, with the owner's answers above.
- Phase 1 (footsteps, synthesised) built, 2026-11-23, waiting on the owner's
  sign-off.

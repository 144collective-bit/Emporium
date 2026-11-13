# The Outlands (the owner's call, 2026-11-13)

An open-world survival game past Sector 7's wall: a big wild country of
towns, a ruined city, farms, forests and roads, where Degen starts with
little and lives on what he finds (food, water, first aid, weapons and
ammo), against the weather, the infected and, later, other players. It's
the city's game's own mode, in Degen's style (black ink outlines, flat
cartoon shading), and an original game in the survival genre: its own map,
names, look and creatures, never a copy of another game's.

Built one phase at a time, each with the owner's sign-off. Keep this plan
up to date. Nothing in Sector 7 moves or changes for it.

## The owner's answers (the planning round, 2026-11-13)

| Question | Answer |
| --- | --- |
| Where it lives | **Outside the wall**: a zone of its own past Sector 7, not a separate site. |
| What threatens you | **The weather** (cold, rain, the night), **the infected** and **other players (PvP)**. |
| How big | **About 8 km across**, with more towns (the heavier option). |
| Single or multi | **Single-player first**, in the browser's save; multiplayer and PvP after, on workers.dev only. |
| Death | **Permadeath in the zone only**: dying loses what was carried out there; the Sector 7 save is never touched. |
| Its name | **The Outlands**. |
| The way out | **A menu option** for now (the hub), no exit in the wall yet. The wall stays solid all round; a gate can come with the storyline. |
| The infected | **Classic shamblers**: ragged, slow, groaning, in the cartoon ink style. No blood or gore. |
| What Degen takes in | **Nothing but his clothes**: no guns, no food, no kit. Everything is found out there. |
| Rewards | **XP only**: no Dorras, so the city's economy stays apart. |
| Phones | **A lighter Outlands**: fewer infected, a shorter view. |

## The rules it changes, and the ones it keeps

- **The owner's exception to "nothing threatening, nothing attacks you"**:
  inside the Outlands only, the infected attack, the weather hurts and
  Degen has health, blood and a body that can die. Sector 7 itself is
  unchanged: nothing in the city attacks you, the crowd is never a target,
  and health outside the Fight Club's ring exists only in the Outlands.
- **The infected are targets in the Outlands**, as the dummies and drones
  are in the city. People in Sector 7 never are.
- **The city's world doesn't grow.** The Outlands is a map of its own,
  loaded instead of the city's, not land added past `EXT` or the wall:
  `EXT`, the wall and `tests/snapshot.test.ts` stay as they are.
- **Made-up names only**: towns, roads, shops' signs, guns, foods and
  medicine are fixed made-up copy, never a real brand, place or person,
  never the token, never a price or a number on a sign.
- **Dorras stay the city's money**: earned by playing, never bought, never
  cashed out. Nothing in the Outlands costs real money. Rewards, if any,
  are Dorras and XP only.
- **Visitors can't type text that shows**: online, players talk with
  emotes and gestures (the wave, hands up), never chat.
- **Rules and view split**, as everywhere: the survival rules, the loot,
  the infected and the weather are DOM-free sims on a seeded generator,
  tested, so the game server can run them for multiplayer.
- **Its drawing is its own chunk**, loaded when the Outlands is picked,
  through `lazy()`; nothing of it is in the city's boot. A new way into it
  goes through `live.closed()` (a new feature, `outlands`, in
  `LIVE_FEATURES`).
- **Its save is its own key**, `degen-city-outlands-v1` (the `degen-city-`
  prefix kept), in `BACKUP_KEYS`, with its own `clean*()` loader.

## The numbers

- 1 tile is about 1.8 m, so 8 km is about **4,400 tiles across** (Sector
  7's land inside the wall is about 1,560 across, 2.8 km). The Outlands is
  about 3 times the city across and about 8 times its area.
- Terrain in **chunks** (about 128 tiles, 230 m, a side: about 35 x 35 of
  them), each a height grid drawn near at full detail and simpler with
  distance, built off the main thread from the seed, as the city's sites
  are. Only the chunks round Degen are kept; the rest are let go.
- Trees, rocks, fences and wrecks are **instanced** per chunk; buildings
  come from the **building kits** (`kits.ts`, recipes), merged per chunk
  through a `Batch`, so the draw-call budget holds.
- Numbers of that size are safe in the GPU's floats (a few tenths of a
  millimetre at 4,400); no moving origin is needed.
- **Settlements, to start** (to be tuned in Phase 2): one ruined city, about
  6 towns, about 12 villages, farms, a few military sites, a hospital and
  a police post in the city and the bigger towns, linked by a road network,
  with a river and a lake.

## Phases

### Phase 0: the way in and the empty land (to build after sign-off)

The risky part first: can the city hand over to an 8 km world and back, on
a phone too?

- **The Outlands in the hub**: an entry (the hub's Map tab, "The
  Outlands"), behind `live.closed('outlands')`, with a short card (what it
  is, permadeath in the zone only) and **Go** / **Back**.
- **Switching worlds**: picking it fetches the Outlands chunk, hides the
  city's scene and lets go of what it can (crowds, traffic, near forms),
  and the one render loop (`loop()` in `index.ts`) draws the Outlands'
  scene instead. Leaving does the reverse and puts Degen back where he
  was. Measured with `?fps` and `?bench` on the desktop and phone tiers:
  the city must come back as it was, and memory must not climb with every
  trip.
- **The land, plain**: the seeded height map (hills, valleys, a river,
  a lake), its chunks streamed round Degen, grass and dirt from a palette
  of its own (the Outlands' answer to `palette.ts`), the grey haze at the
  edge, and an edge Degen can't walk past.
- **On foot**: Degen walks, runs and jumps on it with the motion-captured
  walk (`movesim.ts`, `locomotion.ts`, the animator), the walk camera and
  the city's controls (keys, touch, gamepad). The Outlands gets its own
  small walker rather than sharing `walk.ts`, which is the city's (its
  ground, its grids, its places); what's shared is the DOM-free parts.
- Tests: the height map (seeded, the same everywhere, no cliffs past a
  slope), the chunks (which are kept round a point), the save's cleaning.
  `npm run smoke` gains a trip to the Outlands and back.
- `docs/guide/outlands.md` started, and its row in `CLAUDE.md`'s index.

### Phase 1: the country

- Roads (dirt tracks and old two-lane roads) between where the settlements
  will stand, laid on the land.
- Forests (pine and broadleaf), fields, hedges, rocks and fences,
  instanced per chunk, fine detail near only.
- Its own sky and clock: day and night, dawn and dusk, rain and fog (the
  city's dusk and weather code where it fits).
- A map of the Outlands in the hub while there, and a compass.
- Sound: wind, birds, rain, the night (off until the visitor turns sound
  on, as everywhere).

### Phase 2: the settlements

- The ruined city, the towns and villages, farms and the military sites,
  from the building kits, in a worn, abandoned look of their own (broken
  windows, overgrowth, rust, wrecked cars on the roads).
- Some buildings can be walked into (houses, shops, the hospital, the
  police post, barracks), each with loot spots; the rest are solid shells.
- Made-up names on each settlement's road signs and on the map.
- Collision for every building and wreck through a grid like the city's
  (`boxgrid.ts`).

### Phase 3: survival (the heart of it)

- **The vitals** (`outlands-sim.ts`, DOM-free, tested): hunger, thirst,
  stamina, body heat, health and blood; bleeding from wounds, which a
  bandage stops; low blood makes everything harder; food and drink bring
  them back; at zero health Degen dies.
- **The items** (a catalogue of their own, made-up names): tinned and
  fresh food, bottled water and a canteen to fill at wells and the river,
  bandages, a first aid kit, painkillers, warm clothes, a backpack.
- **The Outlands' inventory**: slots from what he wears (a jacket's
  pockets, a backpack's space) and weight that slows him and tires him
  faster, on the city's grid screen (`inventory-ui.ts`) where it fits.
- **Loot**: what spawns where, by kind of building (food in kitchens and
  shops, medicine in the hospital, weapons in the police post and
  military), from the seed, coming back over time.
- **The HUD**: the vitals as small icons, warnings when one is low.
- **Permadeath**: dying ends the run; what was carried is lost; Degen goes
  back to Sector 7 (or starts a new run). The save keeps the run while
  he's alive, so leaving and coming back carries on.

### Phase 4: the weather as a threat

- Cold, wet and night: rain soaks clothes, wet and cold drain body heat,
  shelter and warm clothes protect, and a campfire warms and dries.
- Simple crafting where it's needed (a fire, rags into bandages).

### Phase 5: weapons and ammo

- Guns are found, not bought, in the Outlands (the city's guns reused from
  `combat-sim.ts` `WEAPONS` and `gunshapes.ts`, plus found ones), with
  **ammo that runs out**, magazines to fill and loot to find it in.
- Melee for when the ammo's gone (fists, and found things to swing).
- What's found in the Outlands stays in the Outlands (the city's owned
  guns aren't lost on a death there).

### Phase 6: the infected

- **Classic shamblers** in the cartoon ink style: ragged clothes, slow,
  groaning, no blood or gore (a hit knocks them back, a takedown drops
  them and they fade).
- Their sim (DOM-free, seeded): they wander the settlements, more in the
  city than the villages; they hear noise (shots, running) and see Degen
  near; they follow, attack up close and lose interest.
- Instanced and simple far away, as the city's crowd is, so dozens can
  stand in a town on a phone.

### Phase 7: polish

- Sound, the menus in the arcade kit, touch and gamepad, every width
  (320 to 1440, phones both ways), reduced motion (the Outlands stands
  still too), the budgets, the smoke test.

### Phase 8: multiplayer and PvP (workers.dev only)

- On the game server (`server/`, workers.dev only, never
  degenemporium.com): the Outlands as a shard of its own, the server in
  charge of the loot, the infected and the hits, so nothing can be
  cheated; other players met in the world; PvP.
- Talking by emotes and gestures only (no chat). The wallet log-in for
  the profile, as in the city.

## To ask at each phase's sign-off

- Whether the Outlands keeps its own clock or matches the city's.
- Vehicles (a found car or bike to drive between towns) and base building:
  later phases, or never.

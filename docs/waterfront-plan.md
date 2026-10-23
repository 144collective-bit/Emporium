# The Trenches' waterfront and riverside

The owner's call: a waterfront on The Trenches' side of the river. The
first version of this plan set out the choices. The owner picked the
boardwalk out over the water and a pier, asked for Club PULSE four times
bigger and more detailed as a landmark, and for row A's four blocks to be
redesigned for "variety and an architecturally impressive waterfront".
That is built (below). What's next is at the end; build it one step at a
time with the owner's sign-off, and keep this plan up to date.

## Built

### The riverside (`riverside.ts`, `riverside3d.ts`, `avenue.ts`)

Row A's four blocks, between the bank avenue and Trench Avenue, west to
east. Their river side is a row of landmarks fronting the bank avenue, each
its own architecture. Their Trench Avenue side keeps a strip of brownstones
and the corner shops (`STRIPS`, laid by the rows' recipe), with service
yards between.

- **trench-a0:** **The Wharf**, a slim glass tower of four stacks of floors,
  each shifted off the one under it, on a glass lobby with a roof terrace,
  and a lit crown. **The Refinery**, an old red-brick sugar works turned
  lofts: tall arched windows between brick piers, a corbelled cornice, a
  monitor roof, the round brick chimney, and REFINERY in yellow neon on a
  steel lattice on its roof.
- **trench-a1:** **Harbor Stores**, a dark-brick warehouse over an arcade
  of round arches with shop windows lit behind, hoist beams, a ghost sign,
  and a glass penthouse set back on the roof. **Trench Arms** is on the
  corner.
- **trench-a2:** **The Pier House**, a pale stone ferry hall with tall
  arched windows, a balustrade and a copper mansard. Its clock tower stands
  on Pier 7's line, with a dial on each face (the hands keep the visitor's
  time), an open belfry and a copper cupola. **The Rusty Nail** is on the
  corner.
- **trench-a3:** **Club PULSE**, the landmark, four times the club it was:
  - a black hall behind vertical neon fins throbbing with the beat, and
    PULSE across them;
  - the corner pylon with the vertical sign, a crown ring and a mast;
  - a fly tower with a heartbeat traced in neon;
  - the sky deck on the roof with its DJ booth and dancers;
  - searchlights at night;
  - a wide marquee over the red carpet, the queue along the velvet rope,
    and two bouncers.

Everything stays under the Emporium. The corner shops (Block Bodega,
Trench Mart, Avenue Deli) are on the Trench Avenue strips, facing the
avenue. Saves own them by id, so nothing is lost.

### The waterfront (`waterfront.ts`, `waterfront3d.ts`)

- **The boardwalk:** a timber deck from the bank avenue's kerb out over the
  water, from the highway's slip lanes to the town's promenade. It has:
  - a black steel railing with a wood cap;
  - sodium lamps reaching in over the walk;
  - benches facing the river and trees in planters;
  - mooring bollards and life rings;
  - people strolling it.
- **Pier 7**, a place: its neck runs out under a steel arch with PIER 7 lit
  on both sides. Its head has:
  - the octagonal BAIT · COFFEE kiosk;
  - coin binoculars and benches;
  - string lights out to the corner lamps;
  - people fishing off the rail.

  You can walk the boardwalk and the pier end to end (`onDeck()`); the
  railings are the decks' edges.
- **The old docks:** a rust-red dock crane straddling the boardwalk (you
  walk through its portal), its jib out over a barge tied up with
  containers.
- **The boats** keep clear: the south lane's boat stays east of the
  boardwalk, and the middle lane swings north round the pier's head.

## Next (suggestions, each the owner's call)

1. **A night market:** container stalls and food trucks with picnic tables
   and string lights, on the boardwalk by the Refinery or in a yard.
   Scenery first; later stalls you run for Dorras.
2. **A ferry or water taxi** from Pier 7 to downtown's jetties: a new way to
   get about next to taxis and the metro.
3. **Fishing** off Pier 7 as a mini-game (XP, missions, badges; nothing
   real).
4. **Sound:** water lapping, gulls by day, a foghorn now and then, the
   market's hum (a `waterfront` layer in `ambience.ts`).
5. **Club PULSE's doors:** what happens inside (its panel says coming
   soon).
6. **The north bank opposite** (open land outside the Parkway today).
7. **The yards** behind the riverside: parked vans, dumpsters, a loading
   dock or two.

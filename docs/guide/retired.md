# Retired: the grand station and Build mode

Part of the project guide (`CLAUDE.md` is its index). Moved here word for word from `CLAUDE.md`;
keep it up to date when what it describes changes.

- **Sector 7 Central, the grand station, was retired** (the owner's call:
  the metro is the city's rail): no mainline station, trains or tracks west
  of the ring highway; the land there is open again. Don't bring it back
  without the owner.

## Build mode (retired, the owner's call)

- Build mode is gone: no Build switch, Plots button or plot panel, no
  buying, building or selling district plots, no designs, no Build
  overview. The City / Walk switch is the mode header's whole switch, and
  `data-mode` is `explore` or `walk`. Don't bring it back without the owner.
- The sixteen districts round the core (North 1-5, West 1-3, East 1-3, the
  South row S1-5 across the river) stay as land: `DISTRICTS` in layout.ts,
  each an open 9 x 9 pad on its landscaped block (`PADS` in outer.ts,
  their walks in outerdress.ts), in the street plan as blocks of use
  `district`. The south bank has its own east-west road (`SOUTH_ROAD`, so
  roads are split into `NS_ROADS` / `EW_ROADS`), a lamp-lit riverside walk,
  traffic over the east avenue's bridge and the raised highway's, and pedestrians
  round the south row.
- A save that owned plots (v11 and older) gets back everything they cost
  and what was built on them when it loads (`plotRefund()` in tycoon.ts,
  the ledger's "Plots refunded"), and a toast says so once.
- Visitors still can't type text onto buildings: sign texts come from
  fixed lists, so nothing unexpected (or confidential) appears in public.

# Motion capture credits

Degen's movement (docs/animation-plan.md) is retargeted from these takes.
The files in `cmu/` are copied unchanged.

## CMU Graphics Lab Motion Capture Database

- Takes (as `takes.json` lists them): subject 143 (`143_01`, `143_02`,
  `143_03`, `143_04`, `143_29`, `143_32`, `143_38`, `143_42`: running,
  walking, starts, stops, turns; `143_39`, `143_40`: walking backwards and
  sideways; `143_05`, `143_06`: standing jumps for distance and height),
  subject 127 (`127_04`, `127_15`, `127_16`, `127_19`: running turns, a
  quick stop, walking into a run; `127_21`, `127_22`, `127_25` to
  `127_28`: running jumps), subject 9 (`09_01`: a run), subject 69
  (`69_17`: turning on the spot), subject 141 (`141_31` to `141_33`:
  jogging backwards, a side shuffle, a crossover step), subject 136
  (`136_09` to `136_11`: walking crouched forwards and backwards), subject
  137 (`137_41`: standing and waiting, three stretches of it: standing
  still), subject 132 (`132_18`: a fast walk, for starts) and subject 122
  (`122_32`: climbing stairs); the crowd's walk, run and idles are `143_32`,
  `143_01` and `137_41` again, in a pack of their own; all in
  Bruce Hahne's 2010 BVH conversion (cgspeed), from the
  una-dinosauria/cmu-mocap copy on GitHub. The conversion marks every file
  120 frames a second; subject 143's were captured at 60 (played at 120 he
  walks at 3.3 steps a second and runs at 6), so `takes.json` gives them
  `"fps": 60`.
- Terms, as the conversion's READMEFIRST quotes them from mocap.cs.cmu.edu:
  "This data is free for use in research and commercial projects
  worldwide." CMU places no restrictions on the original dataset and the
  conversion adds none. The data itself is never resold.
- Acknowledgment (shown in the start menu's Options > Credits): "The data
  used in this project was obtained from mocap.cs.cmu.edu. The database was
  created with funding from NSF EIA-0196217."

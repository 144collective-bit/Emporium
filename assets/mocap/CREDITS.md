# Motion capture credits

Degen's movement (docs/animation-plan.md) is retargeted from these takes.
The files in `cmu/` are copied unchanged.

## CMU Graphics Lab Motion Capture Database

- Takes: subject 143 (`143_01`, `143_02`, `143_03`, `143_04`, `143_29`,
  `143_32`, `143_38`, `143_42`: running, walking, starts, stops, turns),
  subject 127 (`127_04`, `127_15`, `127_16`, `127_19`: running turns, a
  quick stop, walking into a run; `127_21`, `127_22`, `127_25` to
  `127_28`: running jumps), subject 9 (`09_01`: a run), subject 143's jumps (`143_05`, `143_06`:
  standing jumps for distance and height), subject 69 (`69_17`: turning on the
  spot), subject 143's and 141's walking backwards and sideways (`143_39`,
  `143_40`, `141_31` to `141_33`: strafing and backpedalling), subject 136's walking crouched forwards and
  backwards (`136_09` to `136_11`); standing still is subject 143 standing
  before setting off (the first seconds of `143_03`, `143_04` and `143_42`,
  looped), in
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

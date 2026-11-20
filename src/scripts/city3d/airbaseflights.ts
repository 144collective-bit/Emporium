/*
 * Northgate Air Base's flying (docs/military-plan.md Phase 4; DOM-free, tested in tests/airbaseflights.test.ts; read
 * by airbasefield3d.ts, the airfield's chunk, never the boot): its own timetable on its own runway, built with the
 * airport's way of building one (airfield.ts `flight()`, `fly()`, `w()`, `poseAt()`), drawn as more of the base's
 * parked fleets (no more draw calls). The base's flights take off and land over the east, and stay over the base:
 * inside its fence, short of the wall and west of Crestmont's hills.
 *
 * - `TRAINER`: circuits: from holding on the taxiway, out to the runway's west end, off east, a climbing turn north over
 *   the east of the base, west along its north side, round onto the approach from the east, landing west, off at the
 *   connector and back to hold.
 * - `ROUNDER`: the helicopter: up off its pad at the heliport, round the base high over its roofs, back down; its rotor
 *   stopped a while between rounds. Not on phones (fewer flights there).
 */
import { PERIOD, flight, fly, w, yawOf, type Act, type Flight } from './airfield';
import { CONNECTORS, HELI_PADS, RUNWAY, TAXIWAY } from './airbase';

const R = RUNWAY.z;
const TZ = TAXIWAY.z;
/** Where the trainer holds on the taxiway between circuits, and the connector it comes off at */
export const TRAINER_HOLD = { x: -560, z: TZ };
const OFF = CONNECTORS[1];
const IN = CONNECTORS[0];

/** The trainer's circuit (the base's prop plane): off east, round the north of the base, landing west from the east */
export const TRAINER: Flight = (() => {
  const acts: Act[] = [
    // Taxi from holding, west along the taxiway, up the first connector, lined up east at the runway's west end
    fly([w(TRAINER_HOLD.x, TZ, 0, 0), w(IN, TZ, 0, 4), w(IN, R, 0, 3), w(IN + 10, R, 0, 0)], 6),
    { kind: 'hold', dur: 4 },
    fly(
      [
        w(IN + 10, R, 0, 0),
        w(IN + 40, R, 0, 7),
        w(-430, R, 0, 15),
        w(-300, R, 4, 18),
        w(-100, R, 12, 20),
        w(130, R, 18, 21),
        w(190, -660, 20, 21),
        w(-20, -665, 17, 20),
        w(-45, -590, 12, 18),
        w(-10, R, 8, 16),
        // (over the approach lights, down on the touchdown zone, rolling west)
        w(RUNWAY.x1 + 20, R, 3, 13),
        w(RUNWAY.x1 - 25, R, 0, 12),
        w(OFF + 30, R, 0, 4),
        w(OFF, R, 0, 3),
      ],
      22
    ),
    // Off at the connector, back along the taxiway to hold
    fly([w(OFF, R, 0, 3), w(OFF, TZ, 0, 4), w(TRAINER_HOLD.x, TZ, 0, 0)], 6),
    { kind: 'hold', dur: 10 },
  ];
  return flight('base-trainer', 'prop', acts, { fill: 4, cycle: PERIOD, at: 2, when: 40, parked: 4 });
})();

/** The helicopter's round of the base (from the heliport's first pad, high over the roofs) */
export const HELI_UP = 10;
export const ROUND_Y = 24;
export const ROUNDER: Flight = (() => {
  const [hx, hz] = HELI_PADS[0];
  const out: [number, number] = [120, -470];
  const acts: Act[] = [
    fly(
      [
        w(hx, hz, HELI_UP, 0),
        w(out[0], out[1], ROUND_Y - 2, 14),
        w(-200, -610, ROUND_Y, 18),
        w(-520, -610, ROUND_Y, 18),
        w(-560, -460, ROUND_Y, 16),
        w(-300, -398, ROUND_Y - 2, 16),
        w(100, -385, ROUND_Y - 4, 14),
        w(hx, hz, HELI_UP, 0),
      ],
      14
    ),
    // Hover over its pad, face the field, settle, the rotor run down and up again, lift, face the way out
    { kind: 'turn', dur: 4, to: Math.PI },
    { kind: 'lift', dur: 6, to: 0 },
    { kind: 'hold', dur: 4, power: [1, 0] },
    { kind: 'hold', dur: 0, power: [0, 0] },
    { kind: 'hold', dur: 5, power: [0, 1] },
    { kind: 'lift', dur: 6, to: HELI_UP },
    { kind: 'turn', dur: 4, to: yawOf([out[0] - hx, out[1] - hz]) },
  ];
  return flight('base-heli', 'heli', acts, { fill: 4, cycle: PERIOD, at: 0, when: 150, parked: 4 });
})();

export const BASE_FLIGHTS: Flight[] = [TRAINER, ROUNDER];

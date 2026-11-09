/*
 * Is a thing near enough the camera to be worth drawing every frame? The
 * ticks that move a landmark's parts (the Armoury's flags, the Workshop's
 * sparks, the Emporium's LED wall and hologram, the airport's beacon and
 * rabbit, the Strip's shows, Liberty Bridge's leaves and ship, the metro's
 * cars) used to run wherever you stood (polish plan Phase 4): each now asks
 * a gate first. `nearGate(reach, margin)` gives one: true while the eye
 * (`CROWD_VIEW.eye`, set each frame by index.ts) is within `reach` of the
 * point or rectangle asked about, false once it's past `reach + margin`
 * (the hysteresis, so nothing flickers on the line), and true until the eye
 * has been set at all (the boot). The clock-driven state behind a drawing
 * (a timetable, a show's phase) keeps running on its own, so a thing coming
 * back into reach draws its current state at once.
 */
import { CROWD_VIEW } from './character';

/** The park's, Crestmont's, Sunridge's and Lot 9's life gate on this reach */
export const NEAR_REACH = 200;
const MARGIN = 30;

/** A gate: `(x0, z0, x1 = x0, z1 = z0)` for a point or a rectangle, true while the eye is near it */
export function nearGate(reach = NEAR_REACH, margin = MARGIN): (x0: number, z0: number, x1?: number, z1?: number) => boolean {
  let near = true;
  return (x0, z0, x1 = x0, z1 = z0) => {
    const eye = CROWD_VIEW.eye;
    if (!CROWD_VIEW.on) return true;
    const d = Math.hypot(Math.max(x0 - eye.x, eye.x - x1, 0), Math.max(z0 - eye.z, eye.z - z1, 0));
    near = d < (near ? reach + margin : reach);
    return near;
  };
}

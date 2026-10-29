/**
 * Sunridge's houses (docs/suburb-plan.md Phase 2, the owner's call: Southwest stucco tract homes, after an aerial of an
 * Arizona suburb). DOM-free, kept out of the boot (the drawing's chunk, sunhouses3d.ts, and the tests read it; what of
 * them is solid joins the grids when the chunk comes in, `HOUSE_SOLIDS`). A house to every lot (sunridgelots.ts):
 *
 * - **Four plans** (`Plan`): a one-storey ranch with its garage stepped forward, a one-storey L with the garage wing
 *   forward round an entry court, a two-storey, and a two-storey with a porch across its front; about three in ten
 *   two storeys. Each has its **elevation** (`Elevation`): an arched entry, a stone wainscot across the front, or an
 *   entry tower. A two-car garage to the street on one side or the other (`mirror`), its driveway out to the sidewalk
 *   and a walk from the door to it.
 * - **Colours** (`SCHEMES`: sand, adobe, cream, sage, peach, taupe render, each with its lighter trim) and **roofs**
 *   (`ROOFS`: terracotta, brown or slate concrete tile, hipped), picked so no two houses side by side match.
 * - Solar panels on some back slopes (`solar`), a chimney on a few (`chimney`).
 *
 * Each house is laid in its lot's frame (`o` the front's middle, `u` along the street, `v` in from it; `toWorld()`),
 * the footprint set back until the lot is wide enough (a pie-shaped lot round a turning circle widens as it goes back),
 * with a back yard behind (`BACK_MIN`). Everything under the Emporium.
 */
import { LOTS, type Lot } from "./sunridgelots";
import type { Pt } from "./sunridge";
import { rng } from "./recipes";

export type Plan = "ranch" | "ell" | "two" | "porch";
export type Elevation = "arch" | "stone" | "tower";
export const PLANS: Plan[] = ["ranch", "ell", "two", "porch"];

/** Render and trim, by scheme (made to read in the city's flat shading; no white so bright it blooms) */
export const SCHEMES = [
  { name: "sand", wall: "#d6bf96", trim: "#ece0c6" },
  { name: "adobe", wall: "#c4946c", trim: "#e6cfae" },
  { name: "cream", wall: "#e4d6b8", trim: "#f2e8d2" },
  { name: "sage", wall: "#b5b79d", trim: "#e2dec8" },
  { name: "peach", wall: "#d9ae8e", trim: "#efdcc6" },
  { name: "taupe", wall: "#b29f88", trim: "#ded1bd" },
] as const;
/** The roofs' concrete tile */
export const ROOFS = ["terracotta", "brown", "slate"] as const;

/** A storey's height, the floor over the lot, the garage's walls */
export const STOREY = 1.6;
export const FLOOR = 0.1;
export const GARAGE_H = 1.5;
/** How far the roofs overhang, and how steep (rise over the half-span) */
export const EAVE = 0.32;
export const PITCH = 0.42;
/** A two-car garage: its width, depth and door */
export const GARAGE = { w: 3.3, d: 3.5, door: { w: 2.8, h: 1.18 } } as const;
/** The driveway's length from the sidewalk to the garage (about 6 m), the side yards' least, the back yard's least */
export const DRIVE = 3.3;
export const SIDE_MIN = 0.5;
/** The narrowest a house may be (about 7 m) */
export const W_MIN = 3.9;
/** A garage door's width in a garage `w` wide */
export const doorW = (w: number) => Math.min(GARAGE.door.w, w - 0.5);
export const BACK_MIN = 2.0;

/** A box of a house in its lot's frame: across (u0..u1), in from the street (v0 front, v1 back), its walls' top over the lot */
export interface Part {
  kind: "main" | "garage" | "tower" | "wing";
  u0: number;
  u1: number;
  v0: number;
  v1: number;
  top: number;
  storeys: 1 | 2;
}
export interface House {
  id: string;
  lot: string;
  plan: Plan;
  elevation: Elevation;
  scheme: number;
  roof: number;
  /** The garage on the house's left seen from the street (u < 0) or its right */
  mirror: boolean;
  /** The frame: the lot's front middle, along the street, in from it */
  o: Pt;
  u: Pt;
  v: Pt;
  parts: Part[];
  /** The front door's middle (u, v on the wall it's in) */
  door: { u: number; v: number };
  /** The garage door's middle across, its face (v) */
  garageDoor: { u: number; v: number };
  /** The driveway (u0, u1) from the street (v 0) to the garage; the walk from the door to the driveway */
  drive: [number, number];
  walk: [number, number, number, number];
  /** A porch across the front (two-storey porch plans): u0, u1, its depth */
  porch?: [number, number, number];
  solar: boolean;
  chimney: boolean;
}

/** A point of a house's frame in the world */
export const toWorld = (
  h: Pick<House, "o" | "u" | "v">,
  u: number,
  v: number,
): Pt => [h.o[0] + h.u[0] * u + h.v[0] * v, h.o[1] + h.u[1] * u + h.v[1] * v];

/** The lot's frame, and its corners in it */
function frameOf(l: Lot) {
  const [a, b] = l.front;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const u: Pt = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  // (the lot's inside is left of its front's way: lots.ts)
  const v: Pt = [u[1], -u[0]];
  const o: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const local = (p: Pt): Pt => [
    (p[0] - o[0]) * u[0] + (p[1] - o[1]) * u[1],
    (p[0] - o[0]) * v[0] + (p[1] - o[1]) * v[1],
  ];
  // front left, front right, back left, back right
  return {
    o,
    u,
    v,
    fl: local(a),
    fr: local(b),
    bl: local(l.back[0]),
    br: local(l.back[1]),
  };
}
/** The lot's width at a depth v in its frame: the left and right edges there */
function across(f: ReturnType<typeof frameOf>, v: number): [number, number] {
  const at = (p: Pt, q: Pt) => {
    const t = Math.max(0, Math.min(1, (v - p[1]) / (q[1] - p[1] || 1e-9)));
    return p[0] + (q[0] - p[0]) * t;
  };
  return [at(f.fl, f.bl), at(f.fr, f.br)];
}
/** The lot's depth along its middle (its back edge where u is 0) */
function depthAt(f: ReturnType<typeof frameOf>, u: number) {
  const [p, q] = [f.bl, f.br];
  const t = Math.max(0, Math.min(1, (u - p[0]) / (q[0] - p[0] || 1e-9)));
  return p[1] + (q[1] - p[1]) * t;
}

/**
 * A plan's footprint in a lot: as wide as the lot allows (side yards `SIDE_MIN`), set back until it is that wide all
 * the way back, with a back yard of `BACK_MIN` or more; null if it won't fit
 */
function lay(
  plan: Plan,
  elevation: Elevation,
  mirror: boolean,
  f: ReturnType<typeof frameOf>,
): Omit<
  House,
  "id" | "lot" | "scheme" | "roof" | "o" | "u" | "v" | "solar" | "chimney"
> | null {
  const two = plan === "two" || plan === "porch";
  const forward =
    plan === "ranch" ? 0.7 : plan === "ell" ? 2.0 : two ? 1.3 : 0.7;
  // (shallower where the lot is: a smaller house rather than none)
  for (const depth of two
    ? [5.2, 4.7]
    : plan === "ell"
      ? [5.6, 5.0]
      : [6.0, 5.4, 4.8, 4.4])
    // (the garage's front at DRIVE in from the street, or further back where the lot's too narrow there)
    for (let g = DRIVE; g < DRIVE + 4; g += 0.25) {
      const vf = g + forward;
      const vb = vf + depth;
      // The width the lot gives all the way from the garage's front to the house's back
      let [l, r] = [-Infinity, Infinity];
      for (let v = g; v <= vb + 1e-9; v += 0.5) {
        const [a, b] = across(f, v);
        l = Math.max(l, a + SIDE_MIN);
        r = Math.min(r, b - SIDE_MIN);
      }
      const w = Math.min(r - l, two ? 5.4 : 6.0);
      if (w < W_MIN) continue;
      const mid = (l + r) / 2;
      const [u0, u1] = [mid - w / 2, mid + w / 2];
      // (a back yard behind it all the way across)
      if (Math.min(depthAt(f, u0), depthAt(f, u1)) - vb < BACK_MIN) break;
      const s = mirror ? -1 : 1;
      // The garage on its side, the house's rooms across the rest
      // (narrower on a narrow lot: the rooms keep 1.2 beside it)
      const gw = Math.min(GARAGE.w, w - 1.2);
      const [gu0, gu1] = s < 0 ? [u0, u0 + gw] : [u1 - gw, u1];
      const top1 = FLOOR + STOREY;
      const top = two ? FLOOR + STOREY * 2 : top1;
      const parts: Part[] = [];
      if (plan === "ell") {
        // The garage wing forward, the house behind and across, an entry court between
        parts.push({
          kind: "garage",
          u0: gu0,
          u1: gu1,
          v0: g,
          v1: vf + 1.2,
          top: GARAGE_H + FLOOR,
          storeys: 1,
        });
        parts.push({ kind: "main", u0, u1, v0: vf, v1: vb, top, storeys: 1 });
      } else {
        parts.push({
          kind: "garage",
          u0: gu0,
          u1: gu1,
          v0: g,
          v1: g + GARAGE.d,
          top: GARAGE_H + FLOOR,
          storeys: 1,
        });
        parts.push({
          kind: "main",
          u0,
          u1,
          v0: vf,
          v1: vb,
          top,
          storeys: two ? 2 : 1,
        });
      }
      // The rooms' side: where the door is (in the main's front, off the garage)
      const [ru0, ru1] = s < 0 ? [gu1, u1] : [u0, gu0];
      const du =
        (ru0 + ru1) / 2 + (s < 0 ? -0.3 : 0.3) * Math.min(1, (ru1 - ru0) / 3);
      if (elevation === "tower") {
        // A taller entry tower round the door, stepped forward of the rooms
        const tw = Math.min(1.5, ru1 - ru0 - 0.4);
        parts.push({
          kind: "tower",
          u0: du - tw / 2,
          u1: du + tw / 2,
          v0: vf - 0.45,
          v1: vf + 1.2,
          top: (two ? top : top1) + 0.5,
          storeys: two ? 2 : 1,
        });
      }
      // A bedroom wing stepped forward on the far side of a ranch, past the door
      if (plan === "ranch" && ru1 - ru0 > 2.6) {
        const [wu0, wu1] = s < 0 ? [ru1 - 1.6, ru1] : [ru0, ru0 + 1.6];
        if (Math.abs((wu0 + wu1) / 2 - du) > 1)
          parts.push({
            kind: "wing",
            u0: wu0,
            u1: wu1,
            v0: vf - 0.5,
            v1: vf + 2,
            top: top1,
            storeys: 1,
          });
      }
      const dv = elevation === "tower" ? vf - 0.45 : vf;
      const porch: [number, number, number] | undefined =
        plan === "porch"
          ? [ru0 + 0.1, ru1 - 0.05, Math.min(1.1, vf - g - 0.15)]
          : undefined;
      const gdu = (gu0 + gu1) / 2;
      return {
        plan,
        elevation,
        mirror,
        parts,
        door: { u: du, v: dv },
        garageDoor: { u: gdu, v: g },
        drive: [
          gdu - doorW(gu1 - gu0) / 2 - 0.25,
          gdu + doorW(gu1 - gu0) / 2 + 0.25,
        ],
        // (from the door straight out, then along to the driveway)
        walk: [
          Math.min(du, gdu) - 0.35,
          Math.max(du, gdu) + 0.35,
          dv - 1.1,
          dv,
        ],
        porch,
      };
    }
  return null;
}

function build(): House[] {
  const out: House[] = [];
  const rand = rng(8821);
  let prev = { scheme: -1, roof: -1, plan: "" as string, prev2: "" as string };
  for (const l of LOTS) {
    const f = frameOf(l);
    // Neighbours along the same street differ: the scheme and the roof never the same as next door's, the plan not two in a row
    let scheme = Math.floor(rand() * SCHEMES.length);
    if (scheme === prev.scheme)
      scheme =
        (scheme + 1 + Math.floor(rand() * (SCHEMES.length - 1))) %
        SCHEMES.length;
    let roof = Math.floor(rand() * ROOFS.length);
    if (roof === prev.roof && rand() < 0.7) roof = (roof + 1) % ROOFS.length;
    const want: Plan[] = rand() < 0.3 ? ["two", "porch"] : ["ranch", "ell"];
    if (rand() < 0.5) want.reverse();
    const order = [
      ...want.filter((p) => p !== prev.plan),
      ...want.filter((p) => p === prev.plan),
      ...PLANS.filter((p) => !want.includes(p)),
    ];
    const elevation = (["arch", "stone", "tower"] as const)[
      Math.floor(rand() * 3)
    ];
    const mirror = rand() < 0.5;
    let laid: ReturnType<typeof lay> = null;
    for (const p of order)
      for (const m of [mirror, !mirror])
        laid ??= lay(p, elevation, m, f) ?? lay(p, "arch", m, f);
    const solar = rand() < 0.28;
    const chimney = rand() < 0.18;
    if (!laid) continue;
    out.push({
      id: `sun-house-${out.length}`,
      lot: l.id,
      ...laid,
      scheme,
      roof,
      o: f.o,
      u: f.u,
      v: f.v,
      solar,
      chimney,
    });
    prev = { scheme, roof, plan: laid.plan, prev2: prev.plan };
  }
  return out;
}
export const HOUSES: House[] = build();

/** The highest a house reaches: its tallest part's walls and its roof over them */
export const roofRise = (p: Part) =>
  (PITCH * Math.min(p.u1 - p.u0, p.v1 - p.v0)) / 2 + PITCH * EAVE;
export const houseTop = (h: House) =>
  Math.max(...h.parts.map((p) => p.top + roofRise(p))) + 0.15;

type Box = [number, number, number, number, number];
/** A box of a house's frame as world boxes: one where it's square to the axes, cells no bigger than `STRIP` where it's turned */
const STRIP = 1.1;
export function partBoxes(h: House, u0: number, u1: number, v0: number, v1: number, top: number): Box[] {
  const box = (a0: number, a1: number, b0: number, b1: number): Box => {
    const c = [toWorld(h, a0, b0), toWorld(h, a1, b0), toWorld(h, a0, b1), toWorld(h, a1, b1)];
    const xs = c.map((p) => p[0]);
    const zs = c.map((p) => p[1]);
    return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), top];
  };
  // (square to the axes: one box)
  if (Math.abs(h.u[0]) > 0.999 || Math.abs(h.u[1]) > 0.999) return [box(u0, u1, v0, v1)];
  // Turned: cells no bigger than STRIP, so the boxes round them stay close to the walls
  const out: Box[] = [];
  const [nu, nv] = [Math.max(1, Math.ceil((u1 - u0) / STRIP)), Math.max(1, Math.ceil((v1 - v0) / STRIP))];
  for (let i = 0; i < nu; i++)
    for (let j = 0; j < nv; j++) out.push(box(u0 + ((u1 - u0) * i) / nu, u0 + ((u1 - u0) * (i + 1)) / nu, v0 + ((v1 - v0) * j) / nv, v0 + ((v1 - v0) * (j + 1)) / nv));
  return out;
}
/** What of the houses is solid: their walls (and the towers, the wings), to their roofs (the lots' ground is world.ts SLAB, 0.15, under them) */
export const HOUSE_SOLIDS: Box[] = HOUSES.flatMap((h) =>
  h.parts.flatMap((p) =>
    partBoxes(h, p.u0, p.u1, p.v0, p.v1, 0.15 + p.top + roofRise(p)),
  ),
);

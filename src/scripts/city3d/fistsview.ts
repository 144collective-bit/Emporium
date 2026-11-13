/*
 * First person with empty hands (the polish plan's Phase 8, rebuilt on the owner's call, 2026-11: "the arms look
 * deformed and unnatural... we want this looking premium"): Degen's own arms, jointed at the elbow (fparm.ts), in
 * the sleeves of what he's wearing, ending in fists modelled to be seen up close.
 *
 * - The guard is held (the right mouse button, LB, the touch Guard: brawl-sim.ts): the fists come up from below on
 *   a spring with a touch of overshoot, into a high guard by the chin, the lead (left) hand further out; they bob
 *   with his steps, breathe, bounce a little on his toes standing, and lag the look (sway).
 * - Punches are thrown from the guard over the move's frames: a short chamber back over the start-up, out through
 *   the active frames with the shoulder driving in behind it and the fist turning over (the jab and the cross
 *   palm down; the hook round with the elbow up; the uppercut up from low, palm towards him), back through the
 *   recovery. The other hand tucks in to the chin while one's out, and the arms turn a little with the punch.
 * - Running with his hands down, his arms pump into the lower corners in time with his steps (one up as the other
 *   goes back out of shot), harder sprinting; standing or walking slowly, they're out of sight.
 * - A kick drops the hands a touch and bobs the view (walk.ts: `kickBob()`), the leg being out of shot; the dodge
 *   takes them across with the step.
 *
 * Drawn as the gun's hands are: `FP_SCALE` times bigger and further out, in the front sliver of the depth buffer
 * (`upFront()`), with their own flat shading (city lamps would otherwise light them wrongly), dimmed at night with
 * the gun's hands (`FP_LEVEL`). Each arm is two draws (the upper arm; the forearm with its cuff and fist), each
 * piece's colour in the geometry. Under reduced motion nothing bobs, breathes or sways. Loaded with the fists'
 * chunk (brawl.ts), never in the boot.
 */
import * as THREE from 'three';
import type { Outfit } from './character';
import { FP_LEVEL, FP_SCALE, FP_SHIRT, FP_SKIN, FP_VARSITY, fpShade, upFront } from './viewmodel';
import { ARM, aimPiece, cuffGeometry, fistGeometry, merge, paint, sleeveGeometry, solveArm, stripeGeometry } from './fparm';
import { MOVES, type MoveId } from './fight-sim';
import type { ClipId } from './fight-anim';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/**
 * Every pose is metres from the eye (x right, y up, -z ahead), for his right arm (the left mirrors it in x, `R`/`L`
 * where they differ): where the wrist goes, which way the back of the fist faces, where the elbow swings towards
 */
interface Hand {
  at: THREE.Vector3;
  face: THREE.Vector3;
  pole: THREE.Vector3;
}
/** The shoulders, out of shot behind and below the eye */
const SHOULDER = V(0.2, -0.27, 0.06);
/** The high guard: the rear (right) fist by the chin, the lead (left) further out and a touch higher */
const GUARD: { right: Hand; left: Hand } = {
  right: { at: V(0.118, -0.118, -0.33), face: V(0.55, 0.35, 0.75), pole: V(0.45, -1, 0.15) },
  left: { at: V(0.108, -0.098, -0.4), face: V(0.55, 0.35, 0.75), pole: V(0.45, -1, 0.1) },
};
/** Tucked in to the chin while the other hand is out */
const TUCK = V(-0.018, 0.016, 0.02);
/** Each punch (his right, mirrored for the left): the chamber over the start-up, where it lands, the fist's turn and the elbow's pull there, and the shoulder's drive in */
const PUNCHES: Partial<Record<MoveId, { hand: 'left' | 'right'; back: THREE.Vector3; hit: THREE.Vector3; face: THREE.Vector3; pole: THREE.Vector3; drive: THREE.Vector3; turn: number }>> = {
  jab: { hand: 'left', back: V(0.12, -0.12, -0.36), hit: V(0.03, -0.045, -0.6), face: V(0.15, 1, 0.1), pole: V(0.6, -0.8, 0), drive: V(-0.02, 0.02, -0.07), turn: 0.06 },
  cross: { hand: 'right', back: V(0.135, -0.135, -0.3), hit: V(0.025, -0.045, -0.62), face: V(0.15, 1, 0.1), pole: V(0.6, -0.8, 0), drive: V(-0.05, 0.03, -0.12), turn: 0.12 },
  hook: { hand: 'left', back: V(0.22, -0.1, -0.36), hit: V(-0.05, -0.04, -0.5), face: V(0.1, 1, -0.2), pole: V(1, 0.45, 0.2), drive: V(-0.04, 0.04, -0.08), turn: 0.16 },
  uppercut: { hand: 'right', back: V(0.13, -0.27, -0.33), hit: V(0.04, -0.02, -0.47), face: V(0.25, 0.2, 1), pole: V(0.3, -1, 0.35), drive: V(-0.03, 0.06, -0.07), turn: 0.1 },
};
/** Running: where the fist rests, how far it pumps forward and up (and back down out of shot), its turn and the elbow behind */
const RUN = { at: V(0.2, -0.29, -0.31), swing: V(-0.035, 0.1, -0.11), face: V(1, 0.35, 0.25), pole: V(0.4, -0.5, 1) };
/** Hidden: dropped out of the bottom of the shot */
const DOWN = V(0.22, -0.5, -0.24);
/** A kick: how far the hands drop and the view bobs (metres), and how long after the strike the bob settles */
export const KICK = { drop: 0.08, bob: 0.045, settle: 0.35 };
/** How fast he's going (0..1 of the run's pace) for the arms to show pumping, from nothing to all */
const PUMP = { from: 0.55, to: 0.9 };
/** The guard's spring: how quick, and how little it settles (under 1 overshoots a touch) */
const LIFT = { rate: 17, damp: 0.62 };

const smooth = (k: number) => {
  const c = Math.max(0, Math.min(1, k));
  return c * c * (3 - 2 * c);
};

export interface FistsState {
  /** The guard's up (held: brawl-sim's `up`) */
  up: boolean;
  /** The move playing and its frame (brawl-sim's `clip()`), the guard otherwise */
  clip: { id: ClipId; frame: number };
  /** 0..1 of the run's pace and the step cycle, 0..1 sprinting */
  move: number;
  phase: number;
  run: number;
  /** Which way a dodge steps, in the view's frame (+x right), 0 none */
  dodge: number;
  /** Reduced motion: no bob, breath, bounce or sway */
  still?: boolean;
}

/** Flat cartoon shading lit from a fixed key light over the left shoulder, as the gun's hands (viewmodel.ts), each piece its own colour */
function flatPainted() {
  return new THREE.ShaderMaterial({
    uniforms: { level: FP_LEVEL },
    // (each piece's colour is its own attribute, not three's vertex colours, so the ink's pre-pass draws them as it does everything else)
    vertexShader: /* glsl */ `
      attribute vec3 tint;
      varying vec3 vN;
      varying vec3 vC;
      void main() {
        vN = normalize(normalMatrix * normal);
        vC = tint;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float level;
      varying vec3 vN;
      varying vec3 vC;
      void main() {
        float d = dot(normalize(vN), normalize(vec3(-0.4, 0.8, 0.45)));
        float band = d > 0.42 ? 1.0 : d > -0.12 ? 0.74 : 0.52;
        gl_FragColor = vec4(vC * band * level, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}

/** One arm's pieces for an outfit: the upper arm, and the forearm with its cuff and the fist (`thumb`: which side of the fist's x) */
function armPieces(o: Outfit, thumb: -1 | 1) {
  const top = o.top;
  const suit = o.kind === 'suit';
  const varsity = o.kind === 'varsity';
  const puffer = o.kind === 'puffer';
  const sleeve = varsity ? FP_VARSITY : top;
  // (a tailored sleeve is slimmer; a puffer's fuller)
  const r = suit ? 0.047 : puffer ? 0.064 : 0.055;
  const upper: THREE.BufferGeometry[] = [paint(sleeveGeometry(r * 1.06, r * 0.94, ARM.upper), sleeve)];
  const fore: THREE.BufferGeometry[] = [];
  const end = ARM.fore;
  if (suit) {
    // A tailored sleeve, the shirt cuff showing past it
    fore.push(paint(sleeveGeometry(r * 0.94, r * 0.8, end - 0.04, false), sleeve));
    fore.push(paint(cuffGeometry(0.034, 0.033, end - 0.05, end - 0.012), FP_SHIRT));
  } else {
    // A looser sleeve gathered into a ribbed cuff (the varsity's in its top's colour)
    fore.push(paint(sleeveGeometry(r * 0.94, r * 0.84, end - 0.05, false), sleeve));
    fore.push(paint(cuffGeometry(r * 0.78, 0.037, end - 0.056, end - 0.008, 3), fpShade(top, varsity ? 0.72 : 0.8)));
    if (puffer)
      for (const k of [0.35, 0.65]) {
        // (the puffer's quilting: a seam round the sleeve)
        const y = ARM.upper * k;
        const ring = new THREE.TorusGeometry(r * 1.0, 0.004, 4, 16).rotateX(Math.PI / 2).translate(0, y, 0);
        upper.push(paint(ring.toNonIndexed().deleteAttribute('uv'), fpShade(top, 0.8)));
      }
  }
  if (o.kind === 'track')
    for (const a of [-0.13, 0.13]) {
      // The track top's two stripes down the outside of the arm, where the eye sees it: the upper arm's +z (laid
      // facing out and up, `lay()`), and on the forearm between the back of the hand (+z) and the side away from
      // the thumb; just proud of the sleeve, its fullness through the middle included (sleeveGeometry())
      const out = thumb < 0 ? 0.7 : Math.PI - 0.7;
      upper.push(paint(stripeGeometry(Math.PI / 2 + a, r * 1.06 * 1.06 + 0.002, 0.05, ARM.upper - 0.05, 0.01), FP_SHIRT));
      fore.push(paint(stripeGeometry(out + a, r * 0.94 * 1.06 + 0.002, 0.05, end - 0.08, 0.01), FP_SHIRT));
    }
  fore.push(paint(fistGeometry(thumb).translate(0, end, 0), FP_SKIN));
  return { upper: merge(upper), fore: merge(fore) };
}

export function createFistsView(scene: THREE.Scene) {
  const root = new THREE.Group();
  const scaler = new THREE.Group();
  scaler.scale.setScalar(FP_SCALE);
  const holder = new THREE.Group();
  root.add(scaler);
  scaler.add(holder);
  const mat = flatPainted();
  // His right arm on the +x side (its thumb towards the middle), the left mirrored
  const make = (x: 1 | -1) => {
    const upper = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    const fore = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    holder.add(upper, fore);
    return { x, thumb: (x > 0 ? -1 : 1) as -1 | 1, upper, fore, at: new THREE.Vector3(), face: new THREE.Vector3(), pole: new THREE.Vector3(), shoulder: new THREE.Vector3(), elbow: new THREE.Vector3(), hand: new THREE.Vector3() };
  };
  const right = make(1);
  const left = make(-1);
  upFront(root);
  root.visible = false;
  scene.add(root);

  // The guard's spring (0 down, 1 up), the run's share, and the look's lag
  let lift = 0;
  let liftV = 0;
  let pump = 0;
  let swayX = 0;
  let swayY = 0;
  let idle = 0;
  let dropK = 0;
  let turn = 0;
  const lastDir = new THREE.Vector3();
  const dirNow = new THREE.Vector3();
  let haveDir = false;
  const tmp = new THREE.Vector3();
  const tmpF = new THREE.Vector3();
  const tmpP = new THREE.Vector3();
  const q = new THREE.Quaternion();

  /** A hand's pose mirrored to its side (x flips for the left) */
  const side = (v: THREE.Vector3, x: number, out: THREE.Vector3) => out.set(v.x * x, v.y, v.z);

  /** A punch on its hand: wrist, fist's turn, elbow's pull and the shoulder's drive along its frames */
  function punch(id: MoveId, frame: number, x: number, h: (typeof right)) {
    const p = PUNCHES[id]!;
    const m = MOVES[id];
    const g = x > 0 ? GUARD.right : GUARD.left;
    let k: number;
    if (frame < m.startup) {
      // (the chamber: a short draw back)
      const c = smooth(frame / m.startup);
      side(g.at, x, h.at).lerp(side(p.back, x, tmp), c);
      k = 0;
    } else if (frame < m.startup + m.active) {
      k = Math.min(1, smooth((frame - m.startup) / Math.max(1, m.active - 1)) * 1.5);
      side(p.back, x, h.at).lerp(side(p.hit, x, tmp), k);
    } else {
      k = 1 - smooth((frame - m.startup - m.active) / Math.max(1, m.recovery));
      side(g.at, x, h.at).lerp(side(p.hit, x, tmp), k);
    }
    h.face.lerp(side(p.face, x, tmpF), k);
    h.pole.lerp(side(p.pole, x, tmpP), k);
    h.shoulder.addScaledVector(side(p.drive, x, tmp), k);
    return k * p.turn * x;
  }

  /** The arm's two pieces put on the shoulder, the solved elbow and the wrist */
  function lay(h: typeof right) {
    solveArm(h.shoulder, h.at, h.pole, h.elbow, h.hand);
    // (the upper arm's +z faces out and up, the side the eye sees; the forearm's turn is the back of the fist's)
    h.upper.position.copy(h.shoulder);
    h.upper.quaternion.copy(aimPiece(h.shoulder, h.elbow, tmp.set(h.x, 0.7, 0.2), q));
    h.fore.position.copy(h.elbow);
    h.fore.quaternion.copy(aimPiece(h.elbow, h.hand, h.face, q));
  }

  return {
    root,
    /** The arms in the sleeves of what he wears */
    setOutfit(o: Outfit) {
      for (const h of [right, left]) {
        const p = armPieces(o, h.thumb);
        h.upper.geometry.dispose();
        h.fore.geometry.dispose();
        h.upper.geometry = p.upper;
        h.fore.geometry = p.fore;
      }
      upFront(root);
    },
    /** Each frame, after the camera has moved; `on`: in first person with the fists his */
    update(camera: THREE.Camera, dt: number, s: FistsState, on: boolean) {
      dt = Math.min(dt, 0.05);
      // The guard comes up on its spring (a touch of overshoot, then settles); down, it eases away without one
      const want = on && s.up ? 1 : 0;
      if (want) {
        const w = LIFT.rate;
        liftV += (w * w * (1 - lift) - 2 * LIFT.damp * w * liftV) * dt;
        lift += liftV * dt;
      } else {
        liftV = 0;
        lift += (0 - lift) * Math.min(1, dt * 9);
      }
      // Running with his hands down, the arms pump into view
      const pumpWant = on && !s.up ? smooth((s.move - PUMP.from) / (PUMP.to - PUMP.from)) : 0;
      pump += (pumpWant - pump) * Math.min(1, dt * 7);
      root.visible = on && (lift > 0.02 || pump > 0.02);
      if (!root.visible) {
        haveDir = false;
        lift = Math.max(0, lift);
        return;
      }
      root.position.copy(camera.position);
      root.quaternion.copy(camera.quaternion);
      // Sway: the arms lag the look and settle
      camera.getWorldDirection(dirNow);
      if (haveDir && !s.still) {
        const dyaw = Math.atan2(dirNow.x, dirNow.z) - Math.atan2(lastDir.x, lastDir.z);
        swayX = THREE.MathUtils.clamp(swayX - Math.atan2(Math.sin(dyaw), Math.cos(dyaw)) * 0.8, -0.1, 0.1);
        swayY = THREE.MathUtils.clamp(swayY - (dirNow.y - lastDir.y) * 0.8, -0.08, 0.08);
      }
      lastDir.copy(dirNow);
      haveDir = true;
      const settle = Math.exp(-dt * 8);
      swayX *= settle;
      swayY *= settle;
      // The step's bob, a breath, and standing in the guard a fighter's little bounce
      idle += dt;
      const calm = s.still ? 0 : 1;
      const bobK = s.move * (1 + 0.6 * s.run) * calm;
      const bx = Math.sin(s.phase) * 0.01 * bobK;
      const by = -Math.abs(Math.cos(s.phase)) * 0.012 * bobK;
      const bounce = Math.sin(idle * 4.4) * 0.0045 * (1 - Math.min(1, s.move * 2)) * calm;
      const breathe = Math.sin(idle * 1.6) * 0.003 * calm;
      // A kick drops both hands a touch
      const c = s.clip;
      let drop = 0;
      if (c.id === 'frontKick' || c.id === 'roundhouse') {
        const m = MOVES[c.id];
        drop = smooth(Math.min(c.frame / m.startup, (m.startup + m.active + m.recovery - c.frame) / m.recovery));
      }
      dropK += (drop - dropK) * Math.min(1, dt * 14);
      const dodge = c.id === 'dodge' ? s.dodge * 0.08 * Math.sin((Math.PI * c.frame) / 22) : 0;
      // (narrow screens, a phone upright: the arms in closer to the middle, and the whole of them held further off,
      // so the fists stay in shot and apart)
      const aspect = (camera as THREE.PerspectiveCamera).aspect || 1.6;
      const narrow = THREE.MathUtils.clamp(aspect / 1.5, 0.66, 1);
      const tight = THREE.MathUtils.clamp((1.3 - aspect) / 0.8, 0, 1);
      holder.position.set(0, -0.025 * tight, -0.17 * tight);
      const p = c.id in PUNCHES ? PUNCHES[c.id as MoveId]! : null;
      let turnWant = 0;
      for (const h of [right, left]) {
        const x = h.x;
        const g = x > 0 ? GUARD.right : GUARD.left;
        // The guard (with a punch thrown from it, or tucked in while the other hand's out)...
        side(SHOULDER, x, h.shoulder);
        side(g.at, x, h.at);
        side(g.face, x, h.face);
        side(g.pole, x, h.pole);
        if (p) {
          const mine = (p.hand === 'right') === x > 0;
          if (mine) turnWant = punch(c.id as MoveId, c.frame, x, h);
          else h.at.add(side(TUCK, x, tmp));
        }
        h.at.y += by + breathe + bounce - dropK * KICK.drop;
        h.at.x += bx * x + dodge;
        // ...from the run's pumping arms (or the drop out of shot): one forward and up as the other goes back
        const swing = Math.sin(s.phase + (x > 0 ? 0 : Math.PI)) * (0.8 + 0.25 * s.run) * calm;
        const runAt = side(RUN.at, x, tmp).addScaledVector(side(RUN.swing, x, tmpF), swing);
        const below = side(DOWN, x, tmpP);
        runAt.lerp(below, 1 - pump);
        // (up from below: the fists rise along an arc, the elbows following)
        const k = THREE.MathUtils.clamp(lift, -0.1, 1.15);
        h.at.lerpVectors(runAt, h.at, k);
        h.at.z += Math.sin(Math.PI * THREE.MathUtils.clamp(lift, 0, 1)) * 0.04 * (1 - Math.min(1, lift));
        h.face.lerpVectors(side(RUN.face, x, tmpF), h.face, THREE.MathUtils.clamp(k, 0, 1));
        h.pole.lerpVectors(side(RUN.pole, x, tmpP), h.pole, THREE.MathUtils.clamp(k, 0, 1));
        // (the look's lag, and narrow screens)
        h.at.x = h.at.x * narrow - swayX * 0.05;
        h.at.y -= swayY * 0.04;
        h.shoulder.x *= narrow;
        lay(h);
      }
      // The arms turn a little with a punch (the shoulders behind it)
      turn += (turnWant - turn) * Math.min(1, dt * 18);
      holder.rotation.set(-swayY * 0.3, swayX * 0.3 + turn, 0, 'YXZ');
    },
  };
}
export type FistsView = ReturnType<typeof createFistsView>;

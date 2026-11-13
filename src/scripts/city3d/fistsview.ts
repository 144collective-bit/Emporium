/*
 * First person with empty hands (the polish plan's Phase 8, rebuilt on the owner's calls, 2026-11: "the arms look
 * deformed and unnatural... premium", then "too straight... use his real body's clips"): Degen's own arms, jointed
 * at the elbow (fparm.ts), in the sleeves of what he's wearing, ending in fists modelled to be seen up close.
 *
 * - They're his body's arms: every frame the skeleton third person draws (`Degen.rig`: the motion capture's walk and
 *   run, and over it the fight's clips with the guard up, brawl.ts `lay()`) is read from an eye in his head
 *   (fparm.ts `eyeFrame()`), and each arm laid on his shoulder, elbow and wrist, its fist turned as his hand is
 *   (`bodyArm()`). So the guard, the jab, cross, hook and uppercut, the kicks' hands and the arms swinging as he runs
 *   are the clips' own, and first and third person always agree.
 * - The guard held, a first-person correction (fparm.ts `FP_FIX`, the owner's call: the clips are made to read from
 *   behind him, and from his eyes their guard is under his chin, out of shot) carries the fists forward into shot,
 *   up and in, without moving his body; the elbows are solved again round towards his own.
 * - Running with his hands down, a running correction (fparm.ts `FP_RUN`) lifts his own swing into the lower
 *   corners, so each arm comes into shot as it swings forward; standing or walking they're out of sight below.
 * - The arms are tied to the camera (so they stay in shot looking up or down) and lag the look (sway); narrow screens
 *   hold them further off. A kick also bobs the view (walk.ts: `kickBob()`, `KICK`).
 *
 * Drawn as the gun's hands are: `FP_SCALE` times bigger and further out, in the front sliver of the depth buffer
 * (`upFront()`), with their own flat shading (city lamps would otherwise light them wrongly), dimmed at night with
 * the gun's hands (`FP_LEVEL`). Each arm is two draws (the upper arm; the forearm with its cuff and fist), each
 * piece's colour in the geometry. Under reduced motion nothing sways. Loaded with the fists' chunk (brawl.ts), never
 * in the boot.
 */
import * as THREE from 'three';
import type { Outfit } from './character';
import { FP_LEVEL, FP_SCALE, FP_SHIRT, FP_SKIN, FP_VARSITY, fpShade, upFront } from './viewmodel';
import type { Skeleton } from './skeleton';
import { UPPER_ARM } from './skeleton';
import { ARM, aimPiece, bodyArm, cuffGeometry, eyeFrame, stretch, fistGeometry, merge, newLaidArm, paint, sleeveGeometry, stripeGeometry, type BodyJoints } from './fparm';

/** A kick: how far the hands drop and the view bobs (metres), and how long after the strike the bob settles */
export const KICK = { drop: 0.08, bob: 0.045, settle: 0.35 };
/**
 * The track top's stripes: how far apart round the sleeve (radians either side), how far round from the back of the
 * hand (negative: towards the thumb's side, the side the eye sees, so they read on the top of the forearm), and how
 * wide (metres)
 */
const STRIPE = { gap: 0.15, out: -0.35, w: 0.011 };
/** How much less the hand left in the guard is drawn in towards the middle while the other is out punching */
const PUNCH_ASIDE = 0.8;

export interface FistsState {
  /** How far the guard's up (0..1, walk mode's eased `guardAmt`): the first-person correction's share */
  guard: number;
  /** How far into a run he is with his hands down (0..1): the running correction's share, his arms swinging into shot */
  run: number;
  /** Reduced motion: no sway */
  still?: boolean;
}

/** His body as the view reads it: the skeleton, posed for this frame, under the figure's root (placed and turned in the world) */
export interface FistsBody {
  rig: Skeleton;
  root: THREE.Object3D;
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
  // (the sleeves' radii at each end: the stripes lie on them)
  const up = [r * 1.06, r * 0.94, ARM.upper] as const;
  const lo = [r * 0.94, r * 0.84, ARM.fore - 0.05] as const;
  const upper: THREE.BufferGeometry[] = [paint(sleeveGeometry(...up), sleeve)];
  const fore: THREE.BufferGeometry[] = [];
  const end = ARM.fore;
  if (suit) {
    // A tailored sleeve, the shirt cuff showing past it
    fore.push(paint(sleeveGeometry(r * 0.94, r * 0.8, end - 0.04, false), sleeve));
    fore.push(paint(cuffGeometry(0.034, 0.033, end - 0.05, end - 0.012), FP_SHIRT));
  } else {
    // A looser sleeve gathered into a ribbed cuff (the varsity's in its top's colour)
    fore.push(paint(sleeveGeometry(...lo, false), sleeve));
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
    for (const a of [-STRIPE.gap, STRIPE.gap]) {
      // The track top's two stripes down the outside of the arm, where the eye sees it, lying on the sleeve all the
      // way along: the upper arm's +z (laid facing out and up, `lay()`), and on the forearm turned from the back of
      // the hand (+z) by `STRIPE.out`, onto the top of the forearm the eye sees, right down to the cuff (the part in shot)
      const out = thumb < 0 ? Math.PI / 2 - STRIPE.out : Math.PI / 2 + STRIPE.out;
      upper.push(paint(stripeGeometry(Math.PI / 2 + a, ...up, 0.03, ARM.upper - 0.01, STRIPE.w), FP_SHIRT));
      fore.push(paint(stripeGeometry(out + a, ...lo, 0.02, end - 0.054, STRIPE.w), FP_SHIRT));
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
  // One arm a side of his skeleton (R its +x side, L its -x); the back of his hand is the bone's +x on the R side,
  // -x on the L (the fingers curl to the palm on the inside, skeleton.ts), and the thumb follows (fparm.ts)
  const make = (S: 'L' | 'R') => {
    const s = (S === 'R' ? 1 : -1) as -1 | 1;
    const upper = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    const fore = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    holder.add(upper, fore);
    const j: BodyJoints = { shoulder: new THREE.Vector3(), elbow: new THREE.Vector3(), hand: new THREE.Vector3(), back: new THREE.Vector3() };
    return { S, s, thumb: s, upper, fore, j, laid: newLaidArm(), out: 0 };
  };
  const arms = [make('L'), make('R')];
  upFront(root);
  root.visible = false;
  scene.add(root);

  let swayX = 0;
  let swayY = 0;
  const lastDir = new THREE.Vector3();
  const dirNow = new THREE.Vector3();
  let haveDir = false;
  const eye = new THREE.Matrix4();
  const head = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const tmp = new THREE.Vector3();

  return {
    root,
    /** The arms in the sleeves of what he wears */
    setOutfit(o: Outfit) {
      for (const h of arms) {
        const p = armPieces(o, h.thumb);
        h.upper.geometry.dispose();
        h.fore.geometry.dispose();
        h.upper.geometry = p.upper;
        h.fore.geometry = p.fore;
      }
      upFront(root);
    },
    /** Each frame, after the camera has moved and his figure has taken this frame's pose; `on`: in first person with the fists his */
    update(camera: THREE.Camera, dt: number, s: FistsState, on: boolean, body: FistsBody | null) {
      root.visible = on && !!body;
      if (!root.visible || !body) {
        haveDir = false;
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
      const settle = Math.exp(-Math.min(dt, 0.05) * 8);
      swayX *= settle;
      swayY *= settle;
      // His skeleton as posed this frame, read from the eye in his head, level and facing his way
      const { rig } = body;
      body.root.updateMatrixWorld(true);
      rig.bones.head.getWorldPosition(head);
      fwd.set(0, 0, 1).applyQuaternion(body.root.getWorldQuaternion(q));
      const unit = rig.bones.armR.getWorldPosition(tmp).distanceTo(rig.bones.foreR.getWorldPosition(new THREE.Vector3())) / UPPER_ARM;
      eyeFrame(head, fwd, unit, eye);
      // (each arm as his body has it first: how far out each is)
      for (const h of arms) {
        const b = rig.bones;
        b[`arm${h.S}`].getWorldPosition(h.j.shoulder);
        b[`fore${h.S}`].getWorldPosition(h.j.elbow);
        b[`hand${h.S}`].getWorldPosition(h.j.hand);
        h.j.back.set(h.s, 0, 0).applyQuaternion(b[`hand${h.S}`].getWorldQuaternion(q));
        h.out = stretch(bodyArm(h.j, eye, unit, h.laid));
      }
      for (const h of arms) {
        // (with the guard up, the first-person correction: the fists carried into shot, fparm.ts FP_FIX; the hand
        // left in the guard while the other is out punching drawn in less, so the punch has the middle)
        const other = arms[0] === h ? arms[1] : arms[0];
        const pull = 1 - PUNCH_ASIDE * THREE.MathUtils.smoothstep(other.out - h.out, 0.25, 0.5);
        const laid = bodyArm(h.j, eye, unit, h.laid, s.guard, s.run * (1 - s.guard), pull);
        // The upper arm (its +z out and up, where the track top's stripes are) and the forearm with its fist
        h.upper.position.copy(laid.shoulder);
        h.upper.quaternion.copy(aimPiece(laid.shoulder, laid.elbow, tmp.set(Math.sign(laid.shoulder.x) || 1, 0.7, 0.2), q));
        h.fore.position.copy(laid.elbow);
        h.fore.quaternion.copy(aimPiece(laid.elbow, laid.wrist, laid.face, q));
      }
      // (narrow screens, a phone upright: the arms held further off, so the fists stay in shot and apart)
      const aspect = (camera as THREE.PerspectiveCamera).aspect || 1.6;
      const tight = THREE.MathUtils.clamp((1.3 - aspect) / 0.8, 0, 1);
      holder.position.set(-swayX * 0.05, -0.025 * tight - swayY * 0.04, -0.17 * tight);
      holder.rotation.set(-swayY * 0.3, swayX * 0.3, 0, 'YXZ');
    },
  };
}
export type FistsView = ReturnType<typeof createFistsView>;

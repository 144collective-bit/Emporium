/*
 * The rival crew on the south bank: what the goons look like. Their rules
 * (routes, who they chase, shoves, hits and knock-downs) are in combat-sim.ts;
 * combat.ts hands this file the sim's goons every frame and this draws them.
 *
 * - One instanced crowd (createCrowd in character.ts) in the crew's colours:
 *   violet track suits with cyan beanies, a few violet hoodies with the hood
 *   up, cyan shades on everyone, so they read as one crew from across the
 *   river. (The track suit's stripes are the wardrobe's own off-white.) Like
 *   the pedestrians they cost a draw call per piece worn and nothing out of
 *   view (CROWD_VIEW).
 * - Walking and jogging use the walk cycle paced to the ground covered, so
 *   feet don't slide; a goon waiting after a shove stands and looks about.
 * - Knocked down, a goon drops flat on his back (`downPose`, blended in over
 *   a third of a second) and a few neon stars circle his head for two seconds.
 */
import * as THREE from 'three';
import { fx, glowTex } from './kit';
import { HIP_HEIGHT, createCrowd, idlePose, lookPose, newPose, walkPose, type Outfit, type Pose } from './character';
import { GOON, type GoonState, type SimTarget } from './combat-sim';

/** The crew's colours: violet with cyan */
const CREW = { top: '#6f2ae8', bottom: '#4a1f9e', beanie: '#00c8e8', lens: '#00eaff', shoes: '#16141f', hood: '#5a22c4' };

/** Goon `i`'s outfit: a track suit and beanie, every third one a hoodie with the hood up; shades on all */
export function crewOutfit(i: number): Outfit {
  const extras = { lens: CREW.lens, chain: i % 4 === 1, build: 0.95 + ((i * 37) % 10) / 45, height: 0.97 + ((i * 53) % 7) / 90 };
  if (i % 3 === 2) return { kind: 'hoodie', top: CREW.hood, bottom: CREW.bottom, shoes: i % 2 ? '#f3f2f7' : CREW.shoes, hood: true, ...extras };
  return { kind: 'track', top: CREW.top, bottom: CREW.bottom, shoes: i % 2 ? CREW.shoes : '#f3f2f7', beanie: CREW.beanie, ...extras };
}

const set = (l: Pose['arms'][0], fwd: number, out: number, bend: number) => {
  l.fwd = fwd;
  l.out = out;
  l.bend = bend;
  l.twist = 0;
};
/** Flat on his back: hips on the ground, legs out in front, torso and head laid back, arms flung out, the odd twitch */
export function downPose(p: Pose, t: number, seed = 0) {
  p.bob = -(HIP_HEIGHT - 0.12);
  p.lean = -Math.PI / 2 + 0.08;
  p.twist = 0;
  p.side = Math.sin(t * 0.7 + seed) * 0.03;
  // The head carries on along the torso (its pitch undoes the lean's share), lolling a little
  p.headPitch = -p.lean * 0.6 + Math.sin(t * 1.1 + seed) * 0.05;
  p.headYaw = Math.sin(t * 0.8 + seed) * 0.25;
  set(p.arms[0], 0.25, 1.25, 0.35);
  set(p.arms[1], 0.15, 1.1, 0.45);
  set(p.legs[0], Math.PI / 2 - 0.12, 0.12, 0.08);
  set(p.legs[1], Math.PI / 2 - 0.06, 0.2, 0.25);
}
/** `out` = `a` eased to `b` by `k` */
function lerpPose(out: Pose, a: Pose, b: Pose, k: number) {
  const L = (x: number, y: number) => x + (y - x) * k;
  out.bob = L(a.bob, b.bob);
  out.lean = L(a.lean, b.lean);
  out.twist = L(a.twist, b.twist);
  out.side = L(a.side, b.side);
  out.headYaw = L(a.headYaw, b.headYaw);
  out.headPitch = L(a.headPitch, b.headPitch);
  for (let i = 0; i < 2; i++) {
    for (const [o, x, y] of [
      [out.arms[i], a.arms[i], b.arms[i]],
      [out.legs[i], a.legs[i], b.legs[i]],
    ] as const) {
      o.fwd = L(x.fwd, y.fwd);
      o.out = L(x.out, y.out);
      o.bend = L(x.bend, y.bend);
      o.twist = 0;
    }
  }
}

/** Stars round a knocked-down goon's head, and for how long */
const STARS = 4;
const STAR_TIME = 2;
const STAR_COLORS = ['#00eaff', '#ff2fb9', '#ffd36b', '#f3f2f7'];
/** Seconds a goon takes to hit the ground */
const FALL = 0.35;
/** Walk cycle per tile covered (at the crew's scale) */
const STRIDE = 7;

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export function createCrew(scene: THREE.Scene, n: number, opts: { light?: boolean } = {}) {
  const crowd = createCrowd(
    scene,
    Array.from({ length: n }, (_, i) => crewOutfit(i)),
    opts
  );
  const states = Array.from({ length: n }, () => ({ phase: 0, x: NaN, z: NaN, face: NaN, fall: 0 }));
  const pose = newPose();
  const standing = newPose();
  const flat = newPose();

  // The stars: one pool of points, placed each frame round whoever's just gone down
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(n * STARS * 3).fill(-999);
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starCol = new Float32Array(n * STARS * 3);
  const c = new THREE.Color();
  for (let i = 0; i < n * STARS; i++) {
    c.set(STAR_COLORS[i % STAR_COLORS.length]);
    starCol.set([c.r, c.g, c.b], i * 3);
  }
  starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
  const stars = fx(new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 0.14, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })));
  stars.frustumCulled = false;
  stars.visible = false;
  scene.add(stars);
  let starsShown = false;

  return {
    crowd,
    /** The crew's height off the ground (for health bars and the like) */
    height: GOON.height * GOON.scale,
    /**
     * Per frame: draw every goon where the sim has it. `targets` are the sim's
     * (the goons from `first` on), `goons` their states.
     */
    update(dt: number, t: number, targets: readonly SimTarget[], goons: readonly GoonState[], first: number) {
      let anyStars = false;
      for (let i = 0; i < n; i++) {
        const tg = targets[first + i];
        const st = states[i];
        if (Number.isNaN(st.x)) {
          st.x = tg.x;
          st.z = tg.z;
          st.face = tg.heading;
        }
        // Ground covered since last frame paces the walk cycle (a jump back to the spawn doesn't count)
        let moved = Math.hypot(tg.x - st.x, tg.z - st.z);
        if (moved > 1) moved = 0;
        st.x = tg.x;
        st.z = tg.z;
        const speed = dt > 0 ? moved / dt : 0;
        if (tg.down > 0) {
          // Going down: the standing pose folds into the flat one, then he lies there
          st.fall = Math.min(1, st.fall + (dt > 0 ? dt / FALL : 1));
          downPose(flat, t, i);
          if (st.fall < 1) {
            idlePose(standing, t, i);
            const k = st.fall * st.fall;
            lerpPose(pose, standing, flat, k);
          } else lerpPose(pose, flat, flat, 0);
          if (tg.down > GOON.down - STAR_TIME) {
            anyStars = true;
            // His head lies back from the hips, along the way he was facing
            const s = GOON.scale;
            const hx = tg.x - Math.sin(st.face) * 0.5 * s;
            const hz = tg.z - Math.cos(st.face) * 0.5 * s;
            const hy = tg.y + 0.16 * s;
            for (let j = 0; j < STARS; j++) {
              const a = t * 5 + (j * Math.PI * 2) / STARS;
              starPos.set([hx + Math.cos(a) * 0.24 * s, hy + Math.sin(a * 2) * 0.04, hz + Math.sin(a) * 0.24 * s], (i * STARS + j) * 3);
            }
          } else for (let j = 0; j < STARS; j++) starPos[(i * STARS + j) * 3 + 1] = -999;
        } else {
          st.fall = 0;
          for (let j = 0; j < STARS; j++) starPos[(i * STARS + j) * 3 + 1] = -999;
          if (speed > 0.15) {
            st.phase += moved * STRIDE;
            const run = THREE.MathUtils.clamp((speed - GOON.walk) / (GOON.jog - GOON.walk), 0, 1) * 0.7;
            walkPose(pose, st.phase, Math.min(1, speed / GOON.walk), run, goons[i].mode === 'patrol' ? 0.9 : 1.2);
          } else lookPose(pose, t, i * 1.3);
          // Turn to face the way he's going over a few frames, not in one
          st.face += wrap(tg.heading - st.face) * Math.min(1, dt * 9);
        }
        crowd.set(i, tg.x, tg.y, tg.z, st.face, GOON.scale, pose);
      }
      crowd.commit();
      if (anyStars || starsShown) {
        starGeo.attributes.position.needsUpdate = true;
        stars.visible = anyStars;
        starsShown = anyStars;
      }
    },
  };
}

export type Crew = ReturnType<typeof createCrew>;

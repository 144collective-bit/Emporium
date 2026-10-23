/*
 * Your Degen on a turning podium, drawn by a small second renderer with the
 * city's own ink outlines, only while a panel shows it: the fitting room's
 * preview (fitting.ts) and the character screen (charscreen.ts).
 *
 * Drag turns him. With `zoom`, the wheel or a pinch (or `setView()`) eases
 * the camera from all of him to his face; `setPose()` plays an idle, a walk
 * on the spot, the fighter's guard or an emote; `setLight()` picks the
 * studio, daylight or night. Under reduced motion he stands still and is
 * drawn only when something changes (drag still turns him).
 */
import * as THREE from 'three';
import type { Look } from '../net/profile-data';
import { createDegen, emotePose, idlePose, lookOutfit, walkPose, type Degen } from './character';
import { newFightPose, sampleClip } from './fight-anim';
import { lit, liveTex, toon } from './kit';
import { createPost } from './post';

export type StagePose = 'idle' | 'walk' | 'guard' | 'wave' | 'dance' | 'cheer' | 'salute';
export type StageLight = 'studio' | 'day' | 'night';

export interface Stage {
  attach(canvas: HTMLCanvasElement, l: Look): void;
  detach(): void;
  dress(l: Look): void;
  /** A quick cheer (something new to wear) */
  showOff(): void;
  setPose(p: StagePose): void;
  /** 0 all of him .. 1 his face */
  setView(zoom: number): void;
  readonly zoom: number;
  setLight(l: StageLight): void;
}

const backdrop = (stops: [number, string][]) =>
  liveTex(256, 256, (c) => {
    const g = c.createRadialGradient(128, 96, 10, 128, 128, 190);
    for (const [k, col] of stops) g.addColorStop(k, col);
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
  });

/** The lights for each setting: backdrop, sky and ground, key, and the two neon rims that pick out dark clothes */
const LIGHTS: Record<StageLight, { bg: [number, string][]; sky: string; ground: string; hemi: number; key: string; keyI: number; rims: [number, number] }> = {
  // A lit backdrop, light enough that his black ink outline (and a black suit) reads against it
  studio: { bg: [[0, '#6a5cc4'], [0.55, '#3a2f7a'], [1, '#17122e']], sky: '#d6e2ff', ground: '#3a2f6a', hemi: 1.8, key: '#ffffff', keyI: 2.4, rims: [1.6, 1.4] },
  day: { bg: [[0, '#cfe8ff'], [0.6, '#8ec3f0'], [1, '#4f7fb8']], sky: '#ffffff', ground: '#8a7a5a', hemi: 2.1, key: '#fff1d6', keyI: 2.8, rims: [0.5, 0.5] },
  night: { bg: [[0, '#2a1f55'], [0.55, '#140f2e'], [1, '#07060f']], sky: '#6f7fd6', ground: '#1a1236', hemi: 0.9, key: '#b9c6ff', keyI: 1.2, rims: [2.6, 2.4] },
};

export function createStage(d: { reduced: boolean; low: boolean }, opts: { zoom?: boolean } = {}): Stage {
  // One renderer per stage, moved to whichever canvas its panel has now
  let renderer: THREE.WebGLRenderer | null = null;
  let post: ReturnType<typeof createPost> | null = null;
  const scene = new THREE.Scene();
  const backdrops: Partial<Record<StageLight, THREE.Texture>> = {};
  const camera = new THREE.PerspectiveCamera(26, 1, 0.3, 30);
  const hemi = new THREE.HemisphereLight('#d6e2ff', '#3a2f6a', 1.8);
  const key = new THREE.DirectionalLight('#ffffff', 2.4);
  key.position.set(2, 4, 3);
  const rimL = new THREE.DirectionalLight('#ff6ad5', 1.6);
  rimL.position.set(-3, 2, -2);
  const rimR = new THREE.DirectionalLight('#00eaff', 1.4);
  rimR.position.set(3, 1.5, -2.5);
  scene.add(hemi, key, rimL, rimR);

  // The podium: a dark drum with a neon ring
  const podium = new THREE.Group();
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.14, 40), toon('#2e2752'));
  drum.position.y = -0.07;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.016, 8, 64), lit(new THREE.MeshBasicMaterial({ color: '#00eaff', toneMapped: true }), 1.6, 1.6));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.005;
  podium.add(drum, ring);
  scene.add(podium);

  const turn = new THREE.Group();
  scene.add(turn);
  let fig: Degen | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let raf = 0;
  let last = 0;
  let t = 0;
  const spin = 0.5;
  let yaw = 0.35;
  let cheer = -1;
  let pose: StagePose = 'idle';
  let zoom = 0;
  let zoomTo = 0;
  let drag: { x: number; yaw: number } | null = null;
  const pointers = new Map<number, { x: number; y: number }>();
  let pinch = 0;
  let ro: ResizeObserver | null = null;
  const fight = newFightPose();

  function light(id: StageLight) {
    const L = LIGHTS[id];
    scene.background = backdrops[id] ??= backdrop(L.bg);
    hemi.color.set(L.sky);
    hemi.groundColor.set(L.ground);
    hemi.intensity = L.hemi;
    key.color.set(L.key);
    key.intensity = L.keyI;
    rimL.intensity = L.rims[0];
    rimR.intensity = L.rims[1];
  }
  light('studio');

  function dress(l: Look) {
    if (fig) {
      turn.remove(fig.g);
      fig.dispose();
    }
    fig = createDegen(lookOutfit(l));
    fig.g.traverse((m) => ((m as THREE.Mesh).castShadow = false));
    turn.add(fig.g);
    frame();
  }

  // All of him (as the fitting room always shows him), or close on his face
  const FULL = { y: 1.05, z: 3.6, at: 0.66 };
  const FACE = { y: 1.2, z: 1.15, at: 1.1 };
  let narrow = false;
  function aim() {
    const k = zoom * zoom * (3 - 2 * zoom);
    camera.position.set(0, THREE.MathUtils.lerp(FULL.y, FACE.y, k), THREE.MathUtils.lerp(FULL.z, FACE.z, k));
    camera.lookAt(0, THREE.MathUtils.lerp(FULL.at, FACE.at, k), 0);
    // Keep all of him in view on wide and narrow stages
    const fov = narrow ? 34 : 26;
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }

  function size() {
    if (!renderer || !canvas || !post) return;
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    const pr = Math.min(devicePixelRatio, d.low ? 1.5 : 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    post.setSize(w, h, pr);
    camera.aspect = w / h;
    narrow = camera.aspect < 0.9;
    camera.updateProjectionMatrix();
    frame();
  }

  function posed() {
    const P = fig!.pose;
    if (cheer >= 0) return emotePose(P, 'cheer', cheer);
    if (pose === 'idle') return idlePose(P, t);
    if (pose === 'walk') {
      idlePose(P, t);
      return walkPose(P, t * 6.5, 0.75, 0);
    }
    if (pose === 'guard') {
      // The Fight Club's guard, hands closed (the hips' turn taken back out of the head, as fight-figure.ts does)
      sampleClip('guard', t * 60, fight);
      Object.assign(P, { bob: fight.bob, lean: fight.lean, twist: fight.twist, side: fight.side, turn: fight.turn, sway: fight.sway, headPitch: fight.headPitch, headYaw: fight.headYaw - fight.turn });
      for (let i = 0; i < 2; i++) {
        Object.assign(P.arms[i], { ...fight.arms[i], wrist: fight.arms[i].wrist ? { ...fight.arms[i].wrist! } : undefined, reach: undefined });
        Object.assign(P.legs[i], { ...fight.legs[i], foot: undefined });
      }
      P.grip = [1, 1];
      return;
    }
    // The emotes loop
    emotePose(P, pose, pose === 'dance' ? t : t % 3);
  }

  function frame() {
    if (!renderer || !post || !fig) return;
    turn.rotation.y = yaw;
    aim();
    // Everything not in this pose back to rest first
    const P = fig.pose;
    P.turn = P.sway = 0;
    for (const l of [...P.arms, ...P.legs]) {
      l.twist = 0;
      l.wrist = undefined;
    }
    posed();
    // (fists up: whatever he holds is put away, as in the ring)
    if (fig.held) fig.held.visible = pose !== 'guard' || cheer >= 0;
    fig.update();
    post.render();
  }

  function loop(now: number) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000 || 0);
    last = now;
    t += dt;
    if (!drag && zoom < 0.5) yaw += spin * dt;
    zoom += (zoomTo - zoom) * Math.min(1, dt * 6);
    if (cheer >= 0) {
      cheer += dt;
      if (cheer > 1.1) cheer = -1;
    }
    frame();
  }

  function down(e: PointerEvent) {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas?.setPointerCapture(e.pointerId);
    if (pointers.size === 1) drag = { x: e.clientX, yaw };
    else {
      drag = null;
      const [a, b] = [...pointers.values()];
      pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }
  function move(e: PointerEvent) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2 && opts.zoom) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      setZoom(zoomTo + (dist - pinch) * 0.006);
      pinch = dist;
    } else if (drag) yaw = drag.yaw + (e.clientX - drag.x) * 0.012;
    if (d.reduced) frame();
  }
  function up(e: PointerEvent) {
    pointers.delete(e.pointerId);
    drag = null;
  }
  function wheel(e: WheelEvent) {
    if (!opts.zoom) return;
    e.preventDefault();
    setZoom(zoomTo - e.deltaY * 0.0015);
  }
  function setZoom(k: number) {
    zoomTo = THREE.MathUtils.clamp(k, 0, 1);
    if (d.reduced) {
      zoom = zoomTo;
      frame();
    }
  }

  return {
    attach(c, l) {
      canvas = c;
      if (!renderer) {
        try {
          renderer = new THREE.WebGLRenderer({ canvas: c, antialias: false, alpha: false, powerPreference: 'low-power' });
        } catch {
          c.hidden = true;
          return;
        }
        renderer.toneMapping = THREE.NeutralToneMapping;
        post = createPost(renderer, scene, camera, { msaa: d.low ? 0 : 4, bloomScale: 0.5, smaa: d.low });
        // Only the podium's neon ring glows; white clothes stay clothes
        post.bloom.strength = 0.4;
        post.bloom.threshold = 0.97;
        post.ink.uniforms.fadeNear.value = 40;
      } else {
        // The panel's markup is new each time it opens: move the drawing surface over
        c.replaceWith(renderer.domElement);
        renderer.domElement.className = c.className;
        renderer.domElement.setAttribute('aria-hidden', 'true');
        canvas = renderer.domElement;
      }
      canvas.addEventListener('pointerdown', down);
      canvas.addEventListener('pointermove', move);
      canvas.addEventListener('pointerup', up);
      canvas.addEventListener('pointercancel', up);
      canvas.addEventListener('wheel', wheel, { passive: false });
      ro = new ResizeObserver(size);
      ro.observe(canvas);
      dress(l);
      size();
      // Reduced motion: drawn when something changes, never on a loop
      if (d.reduced) return;
      last = performance.now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    },
    detach() {
      cancelAnimationFrame(raf);
      raf = 0;
      ro?.disconnect();
      ro = null;
      if (canvas) {
        canvas.removeEventListener('pointerdown', down);
        canvas.removeEventListener('pointermove', move);
        canvas.removeEventListener('pointerup', up);
        canvas.removeEventListener('pointercancel', up);
        canvas.removeEventListener('wheel', wheel);
      }
      canvas = null;
      drag = null;
      pointers.clear();
    },
    dress(l) {
      if (canvas) dress(l);
    },
    showOff() {
      if (!d.reduced) cheer = 0;
    },
    setPose(p) {
      pose = p;
      cheer = -1;
      t = 0;
      frame();
    },
    setView(k) {
      setZoom(k);
    },
    get zoom() {
      return zoomTo;
    },
    setLight(id) {
      light(id);
      frame();
    },
  };
}

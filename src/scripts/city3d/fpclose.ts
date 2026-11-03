/*
 * Drawing his own body from the eye (docs/firstperson-plan.md, Phase 0).
 *
 * In first person his hands come within a few centimetres of the eye, inside
 * the city camera's near plane (0.5), and bringing the near plane in costs
 * the far city its depth precision (the plan's measurements: faces 5 mm
 * apart start to fight about 205 tiles out at 0.5, about 92 at 0.1). The gun
 * hands get round it by being built K times bigger and K times further out
 * and drawn into the front of the depth buffer (viewmodel.ts): fine for a gun
 * that's always in front of everything, wrong for a body, whose legs would
 * then show through a café table or a bollard in front of them.
 *
 * So the body is drawn at its true size, posed as the animator, the moments
 * and the fight clips pose it, with two changes in its shaders only:
 * - Every vertex is pushed `CLOSE.K` times further from the eye along its
 *   own line of sight (`gl_Position` scaled about the eye), so nothing of
 *   him nearer than near / K is clipped and the picture is unchanged.
 * - Each fragment writes the depth it would have had at its true distance
 *   (`closeDepth()`: an exact remap of the pushed-out depth), so the world
 *   hides him and he hides the world just as if he stood there; what's
 *   nearer than the near plane (where the world is clipped anyway) is kept
 *   in a thin sliver at the front, `CLOSE.eps`, in its own order, so his
 *   fingers still hide each other properly.
 * His shading reads the true positions (the push is applied after three has
 * worked out everything else), and his shadow is drawn by the depth
 * material, untouched.
 *
 * Use: `closeMaterial()` gives a patched copy of a material (kept per
 * material), and what's drawn this way goes on `CLOSE_LAYER` only, so the
 * outline pre-pass draws it with its own patched normal material (post.ts,
 * `post.close`). DOM-free; the depth maths is tested in tests/fpclose.test.ts.
 */
import * as THREE from 'three';

/** How far out the body is pushed (K) and the depth sliver kept for what's nearer than the near plane */
export const CLOSE = { K: 16, eps: 1e-3 };
/** The layer the close-drawn body is on (kit.ts's are 0-3); post.ts draws it into the outline pre-pass */
export const CLOSE_LAYER = 4;

/** The window depth (0 at the near plane, 1 at the far) of a point `dist` ahead of the eye, for a camera near `n`, far `f` */
export const windowDepth = (dist: number, n: number, f: number) => (f / (f - n)) * (1 - n / dist);

/**
 * The depth a close-drawn fragment writes: `w` is the window depth it was drawn at, pushed `k` times out; `F` is
 * far / (far - near). The true depth (F - k (F - w)) wherever that's in front of the far plane and behind the
 * sliver; nearer than that, the sliver, still in order (eps · w rises with the distance).
 */
export function closeDepth(w: number, F: number, k = CLOSE.K, eps = CLOSE.eps) {
  return Math.min(1, Math.max(F - k * (F - w), eps * w, 0));
}

const VERT = /* glsl */ `
varying float vCloseF;
void main() {
  closeMain();
  // Pushed out K times about the eye: x, y and w scale by K; z = K (z - d) + d (d = projectionMatrix[3][2])
  float d = projectionMatrix[3][2];
  gl_Position = vec4(gl_Position.xy * CLOSE_K, CLOSE_K * (gl_Position.z - d) + d, gl_Position.w * CLOSE_K);
  // far / (far - near), from the projection's own numbers
  vCloseF = 0.5 * (1.0 - projectionMatrix[2][2]);
}`;

const FRAG = /* glsl */ `
varying float vCloseF;
void main() {
  closeMain();
  float w = gl_FragCoord.z;
  gl_FragDepth = clamp(max(vCloseF - CLOSE_K * (vCloseF - w), CLOSE_EPS * w), 0.0, 1.0);
}`;

const MAIN = /void\s+main\s*\(\s*\)/;

/** Patch a shader (three's `onBeforeCompile`) to draw close: its `main` renamed and wrapped */
export function injectClose(sh: { vertexShader: string; fragmentShader: string; defines?: Record<string, unknown> }) {
  if (!MAIN.test(sh.vertexShader) || !MAIN.test(sh.fragmentShader)) throw new Error('injectClose: no main()');
  sh.defines = { ...sh.defines, CLOSE_K: CLOSE.K.toFixed(1), CLOSE_EPS: CLOSE.eps.toExponential() };
  sh.vertexShader = sh.vertexShader.replace(MAIN, 'void closeMain()') + VERT;
  sh.fragmentShader = sh.fragmentShader.replace(MAIN, 'void closeMain()') + FRAG;
}

const copies = new WeakMap<THREE.Material, THREE.Material>();
/**
 * The close-drawn copy of a material (one per material, so figures that share a material share its copy): its
 * own `onBeforeCompile` (a neon's day and night, a skin's) still runs first, then the patch.
 */
export function closeMaterial<M extends THREE.Material>(m: M): M {
  let c = copies.get(m) as M | undefined;
  if (c) return c;
  c = m.clone() as M;
  const before = m.onBeforeCompile.bind(m);
  const key = m.customProgramCacheKey.bind(m);
  c.onBeforeCompile = (sh, r) => {
    before(sh, r);
    injectClose(sh);
  };
  c.customProgramCacheKey = () => key() + '|close';
  // (a shader material's uniforms are its own objects: the copy reads the original's, so what changes them still does)
  if ((m as unknown as THREE.ShaderMaterial).uniforms) (c as unknown as THREE.ShaderMaterial).uniforms = (m as unknown as THREE.ShaderMaterial).uniforms;
  copies.set(m, c);
  return c;
}

/**
 * Draw an object close, or as it was: every mesh in it swapped onto its material's close copy, onto `CLOSE_LAYER`
 * only and out of three's frustum culling, and back. Returns the undo.
 */
export function drawClose(o: THREE.Object3D): () => void {
  const was: { mesh: THREE.Mesh; mat: THREE.Material | THREE.Material[]; mask: number; culled: boolean }[] = [];
  o.traverse((c) => {
    const mesh = c as THREE.Mesh;
    if (!mesh.isMesh) return;
    was.push({ mesh, mat: mesh.material, mask: mesh.layers.mask, culled: mesh.frustumCulled });
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(closeMaterial) : closeMaterial(mesh.material);
    mesh.layers.set(CLOSE_LAYER);
    // (three culls on the true bounds before the shader pushes them out: a hand inside the near plane would go)
    mesh.frustumCulled = false;
  });
  return () => {
    for (const w of was) {
      w.mesh.material = w.mat;
      w.mesh.layers.mask = w.mask;
      w.mesh.frustumCulled = w.culled;
    }
  };
}

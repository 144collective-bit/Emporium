/*
 * The crowd's skinning on the GPU (character rebuild Phase 5): every person
 * in a crowd is the skinned body drawn instanced, and the vertex shader
 * skins them from the baked clips (crowdclips.ts) in one float texture. A
 * crowd vertex carries its four bones and weights (`crowdIdx`,
 * `crowdWt`, `crowdOn` 1); each instance carries the two rows it's between
 * and the blend (`crowdAnim`). The same few lines go into every material
 * that draws a crowd: its colour, its shadow (`crowdDepth()`) and the ink
 * outlines' normal pass (post.ts), where anything else reads `crowdOn` 0
 * and is left as it is.
 *
 * Performance phase 3: a crowd is one mesh per outfit kind and material at
 * each level, everyone of that kind sharing it. What a person wears and
 * their colours are their row in the wardrobe (`crowdWardrobe`, one float
 * texture for every crowd): a vertex carries the colour it takes and the
 * item it's part of (`crowdSlot`), an instance its row (`crowdAnim.w`).
 * Items a person doesn't wear fold to a point (nothing drawn) in every pass.
 */
import * as THREE from 'three';
import { CROWD_BONES, CROWD_ROWS, bakeCrowdClips } from './crowdclips';

/** The baked clips, shared by every crowd and every pass (filled the first time a crowd is made) */
export const crowdBones: { value: THREE.DataTexture | null } = { value: null };
export function crowdTexture() {
  if (!crowdBones.value) {
    const t = new THREE.DataTexture(bakeCrowdClips(), CROWD_BONES * 4, CROWD_ROWS, THREE.RGBAFormat, THREE.FloatType);
    t.needsUpdate = true;
    crowdBones.value = t;
  }
  return crowdBones.value;
}
/** The crowd pack came in (crowdclips.ts `setCrowdCapture()`): the rows baked again, swapped into the texture every crowd reads */
export function refreshCrowdTexture() {
  const t = crowdBones.value;
  if (!t) return;
  t.image.data = bakeCrowdClips();
  t.needsUpdate = true;
}

/**
 * The wardrobe's width in texels: a row is a person, its first texels their colours (rgb, by
 * colour key), and each texel's alpha whether they wear the item that column stands for
 */
export const WARDROBE_W = 128;
/** Every crowd's people, a row each (`addWardrobe()`) */
export const crowdWardrobe: { value: THREE.DataTexture | null } = { value: null };
let wardrobe = new Float32Array(0);
let wardrobeRows = 0;
/** Rows for more people (each `WARDROBE_W` * 4 floats): the first one's number */
export function addWardrobe(rows: Float32Array[]) {
  const first = wardrobeRows;
  wardrobeRows += rows.length;
  const next = new Float32Array(WARDROBE_W * 4 * wardrobeRows);
  next.set(wardrobe);
  rows.forEach((r, i) => next.set(r, (first + i) * WARDROBE_W * 4));
  wardrobe = next;
  crowdWardrobe.value?.dispose();
  const t = new THREE.DataTexture(wardrobe, WARDROBE_W, wardrobeRows, THREE.RGBAFormat, THREE.FloatType);
  t.needsUpdate = true;
  crowdWardrobe.value = t;
  return first;
}

const HEAD = /* glsl */ `
uniform highp sampler2D crowdBones;
uniform highp sampler2D crowdWardrobe;
attribute float crowdOn;
attribute vec4 crowdIdx;
attribute vec4 crowdWt;
attribute vec2 crowdSlot;
attribute vec4 crowdAnim;
mat4 crowdRow(int b, int row) {
  int x = b * 4;
  return mat4(texelFetch(crowdBones, ivec2(x, row), 0), texelFetch(crowdBones, ivec2(x + 1, row), 0), texelFetch(crowdBones, ivec2(x + 2, row), 0), texelFetch(crowdBones, ivec2(x + 3, row), 0));
}
mat4 crowdBone(float b) {
  int i = int(b + 0.5);
  mat4 a = crowdRow(i, int(crowdAnim.x + 0.5));
  mat4 c = crowdRow(i, int(crowdAnim.y + 0.5));
  return a + (c - a) * crowdAnim.z;
}
mat4 crowdSkin() {
  return crowdWt.x * crowdBone(crowdIdx.x) + crowdWt.y * crowdBone(crowdIdx.y) + crowdWt.z * crowdBone(crowdIdx.z) + crowdWt.w * crowdBone(crowdIdx.w);
}
`;

/** Put the crowd's skinning into a shader (from a material's onBeforeCompile) */
export function injectCrowdSkin(sh: { vertexShader: string; uniforms: Record<string, THREE.IUniform> }) {
  sh.uniforms.crowdBones = crowdBones;
  sh.uniforms.crowdWardrobe = crowdWardrobe;
  sh.vertexShader =
    HEAD +
    sh.vertexShader
      .replace(
        'void main() {',
        // (an item this person doesn't wear: every vertex to one point, so its triangles draw nothing)
        'void main() {\n  mat4 crowdM = mat4(1.0);\n  if (crowdOn > 0.5) crowdM = texelFetch(crowdWardrobe, ivec2(int(crowdSlot.y + 0.5), int(crowdAnim.w + 0.5)), 0).a > 0.5 ? crowdSkin() : mat4(0.0);'
      )
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n  objectNormal = mat3(crowdM) * objectNormal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed = (crowdM * vec4(transformed, 1.0)).xyz;');
}

/** A crowd's version of a material: the same, skinned from the clips */
export function crowdVersion<M extends THREE.Material>(base: M, key: string): M {
  const m = base.clone() as M;
  const prev = base.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    prev.call(m, sh, r);
    injectCrowdSkin(sh);
    // The person's own colour for the parts that take one (crowdSlot.x -1: a fixed colour, left as it is)
    sh.vertexShader = sh.vertexShader
      .replace('void main() {', 'varying vec3 vCrowdTint;\nvoid main() {')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  vCrowdTint = crowdSlot.x < -0.5 ? vec3(1.0) : texelFetch(crowdWardrobe, ivec2(int(crowdSlot.x + 0.5), int(crowdAnim.w + 0.5)), 0).rgb;'
      );
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', 'varying vec3 vCrowdTint;\nvoid main() {')
      .replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb *= vCrowdTint;');
  };
  const baseKey = base.customProgramCacheKey();
  m.customProgramCacheKey = () => `${baseKey}|crowd|${key}`;
  return m;
}

let depth: THREE.MeshDepthMaterial | null = null;
/** The crowd's shadows: skinned the same way */
export function crowdDepth() {
  if (!depth) {
    depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    depth.onBeforeCompile = (sh) => injectCrowdSkin(sh);
    depth.customProgramCacheKey = () => 'crowd-depth';
  }
  return depth;
}

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

const HEAD = /* glsl */ `
uniform highp sampler2D crowdBones;
attribute float crowdOn;
attribute vec4 crowdIdx;
attribute vec4 crowdWt;
attribute vec3 crowdAnim;
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
  sh.vertexShader =
    HEAD +
    sh.vertexShader
      .replace('void main() {', 'void main() {\n  mat4 crowdM = crowdOn > 0.5 ? crowdSkin() : mat4(1.0);')
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

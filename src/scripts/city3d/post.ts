/*
 * Post-processing: ink outlines from a normal + depth pre-pass, then neon
 * bloom, tone mapping and (on low pixel ratios) anti-aliasing. Phones (`lite`)
 * draw it in fewer passes: the bloom's blur on its own, then one pass that
 * sharpens, inks, adds the bloom and tone maps (`FinishShader`).
 */
import * as THREE from 'three';
import { injectCrowdSkin } from './crowdskin';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';
import { FX, OCC, SOLID, injectWind } from './kit';

/** The ink's uniforms in GLSL (shared by the ink pass and the phones' finishing pass) */
const INK_PARS = /* glsl */ `
    uniform sampler2D tNormal;
    uniform sampler2D tDepth;
    uniform vec2 texel;
    uniform float cameraNear;
    uniform float cameraFar;
    uniform vec3 ink;
    uniform float thickness;
    uniform float fadeNear;
    uniform float fadeFar;`;

/** How much ink a pixel takes: depth steps and normal creases round it, faded out with distance */
const INK_EDGE = /* glsl */ `
    float dist(vec2 uv) {
      return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, cameraNear, cameraFar);
    }
    vec3 nrm(vec2 uv) { return texture2D(tNormal, uv).rgb * 2.0 - 1.0; }

    float inkEdge(vec2 uv) {
      vec2 o = texel * thickness;
      float d0 = dist(uv);
      float dl = dist(uv - vec2(o.x, 0.0));
      float dr = dist(uv + vec2(o.x, 0.0));
      float du = dist(uv + vec2(0.0, o.y));
      float dd = dist(uv - vec2(0.0, o.y));
      // Second derivative of depth: flat or evenly sloping surfaces cancel out,
      // silhouettes and steps don't.
      float lap = (abs(dl + dr - 2.0 * d0) + abs(du + dd - 2.0 * d0)) / max(d0, 0.1);
      float depthEdge = smoothstep(0.012, 0.03, lap);

      vec3 n0 = nrm(uv);
      float nd = (1.0 - dot(n0, nrm(uv - vec2(o.x, 0.0)))) + (1.0 - dot(n0, nrm(uv + vec2(o.x, 0.0))))
               + (1.0 - dot(n0, nrm(uv + vec2(0.0, o.y)))) + (1.0 - dot(n0, nrm(uv - vec2(0.0, o.y))));
      float normalEdge = smoothstep(0.35, 0.8, nd);

      float nearest = min(min(min(dl, dr), min(du, dd)), d0);
      float fade = 1.0 - smoothstep(fadeNear, fadeFar, nearest);
      return max(depthEdge, normalEdge) * fade;
    }
`;

const InkShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    tNormal: { value: null as THREE.Texture | null },
    tDepth: { value: null as THREE.Texture | null },
    texel: { value: new THREE.Vector2() },
    cameraNear: { value: 0.1 },
    cameraFar: { value: 400 },
    ink: { value: new THREE.Color('#05050a') },
    thickness: { value: 1 },
    fadeNear: { value: 60 },
    fadeFar: { value: 140 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    #include <packing>
    uniform sampler2D tDiffuse;
    ${INK_PARS}
    varying vec2 vUv;
    ${INK_EDGE}
    void main() {
      vec4 col = texture2D(tDiffuse, vUv);
      gl_FragColor = vec4(mix(col.rgb, ink, inkEdge(vUv)), col.a);
    }
  `,
};

/**
 * The phones' last pass (`lite`), straight to the screen: the colour sharpened (contrast-adaptive, after AMD's CAS:
 * flat areas and strong edges are left alone, soft detail is brought out, so a picture drawn at fewer pixels than the
 * screen's reads crisp), the ink laid on, the bloom's glow added, then tone mapping and sRGB. Desktops keep their
 * own passes; here the three full-screen passes they take (ink, the bloom's blend, output) are one
 */
const FinishShader = {
  uniforms: {
    ...THREE.UniformsUtils.clone(InkShader.uniforms),
    tBloom: { value: null as THREE.Texture | null },
    bloomAmt: { value: 1 },
    sharpness: { value: 0.5 },
    toneMappingExposure: { value: 1 },
  },
  vertexShader: /* glsl */ `
    precision highp float;
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    attribute vec3 position;
    attribute vec2 uv;
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    // (packing's depth to distance on its own: the rest of that chunk needs GLSL 3, and this pass is GLSL 1 as three's output pass is)
    float perspectiveDepthToViewZ(const in float depth, const in float near, const in float far) {
      return (near * far) / ((far - near) * depth - far);
    }
    #include <tonemapping_pars_fragment>
    #include <colorspace_pars_fragment>
    uniform sampler2D tDiffuse;
    uniform sampler2D tBloom;
    uniform float bloomAmt;
    uniform float sharpness;
    ${INK_PARS}
    varying vec2 vUv;
    ${INK_EDGE}
    vec3 sharpened(vec2 uv) {
      vec3 c = texture2D(tDiffuse, uv).rgb;
      vec3 n = texture2D(tDiffuse, uv + vec2(0.0, texel.y)).rgb;
      vec3 s = texture2D(tDiffuse, uv - vec2(0.0, texel.y)).rgb;
      vec3 e = texture2D(tDiffuse, uv + vec2(texel.x, 0.0)).rgb;
      vec3 w = texture2D(tDiffuse, uv - vec2(texel.x, 0.0)).rgb;
      // (CAS reads 0..1: the neon over 1 counts as 1 for how much, and keeps its own brightness)
      vec3 mn = min(min(c, min(n, s)), min(e, w));
      vec3 mx = min(max(max(c, max(n, s)), max(e, w)), vec3(1.0));
      vec3 amp = sqrt(clamp(min(min(mn, vec3(1.0)), 1.0 - mx) / max(mx, vec3(1e-4)), 0.0, 1.0));
      vec3 wt = -amp * mix(0.125, 0.2, sharpness);
      return max((c + (n + s + e + w) * wt) / (1.0 + 4.0 * wt), 0.0);
    }
    void main() {
      vec3 col = sharpened(vUv);
      col = mix(col, ink, inkEdge(vUv));
      col += bloomAmt * texture2D(tBloom, vUv).rgb;
      gl_FragColor = vec4(col, 1.0);
      #ifdef NEUTRAL_TONE_MAPPING
        gl_FragColor.rgb = NeutralToneMapping(gl_FragColor.rgb);
      #endif
      #ifdef SRGB_TRANSFER
        gl_FragColor = sRGBTransferOETF(gl_FragColor);
      #endif
    }
  `,
};

/** The bloom's blur directions (UnrealBloomPass's own, which its types leave out) */
const ACROSS = new THREE.Vector2(1, 0);
const DOWN = new THREE.Vector2(0, 1);

/**
 * The bloom's own work without its last step (`lite`): the bright parts picked out, blurred down its levels and
 * composited into its first target, which the finishing pass adds. UnrealBloomPass would then blend that over the
 * whole frame, a full-screen pass of its own; the finishing pass does it in passing
 */
class BloomOnly extends Pass {
  private quad = new FullScreenQuad();
  constructor(private b: UnrealBloomPass) {
    super();
    this.needsSwap = false;
  }
  render(renderer: THREE.WebGLRenderer, _write: THREE.WebGLRenderTarget, read: THREE.WebGLRenderTarget) {
    const b = this.b;
    const vertical = (b as unknown as { renderTargetsVertical: THREE.WebGLRenderTarget[] }).renderTargetsVertical;
    const clear = renderer.getClearColor(new THREE.Color());
    const alpha = renderer.getClearAlpha();
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.setClearColor(b.clearColor, 0);
    const high = b.highPassUniforms as Record<string, THREE.IUniform>;
    high.tDiffuse.value = read.texture;
    high.luminosityThreshold.value = b.threshold;
    this.quad.material = b.materialHighPassFilter;
    renderer.setRenderTarget(b.renderTargetBright);
    renderer.clear();
    this.quad.render(renderer);
    let input = b.renderTargetBright;
    for (let i = 0; i < b.nMips; i++) {
      const m = b.separableBlurMaterials[i];
      this.quad.material = m;
      m.uniforms.colorTexture.value = input.texture;
      m.uniforms.direction.value = ACROSS;
      renderer.setRenderTarget(b.renderTargetsHorizontal[i]);
      renderer.clear();
      this.quad.render(renderer);
      m.uniforms.colorTexture.value = b.renderTargetsHorizontal[i].texture;
      m.uniforms.direction.value = DOWN;
      renderer.setRenderTarget(vertical[i]);
      renderer.clear();
      this.quad.render(renderer);
      input = vertical[i];
    }
    this.quad.material = b.compositeMaterial;
    b.compositeMaterial.uniforms.bloomStrength.value = b.strength;
    b.compositeMaterial.uniforms.bloomRadius.value = b.radius;
    b.compositeMaterial.uniforms.bloomTintColors.value = b.bloomTintColors;
    renderer.setRenderTarget(b.renderTargetsHorizontal[0]);
    renderer.clear();
    this.quad.render(renderer);
    renderer.setClearColor(clear, alpha);
    renderer.autoClear = autoClear;
  }
}

export interface PostOpts {
  msaa: number;
  bloomScale: number;
  smaa: boolean;
  /** How many of the bloom's blur levels to draw (5, all of them, if not given): phones draw 3 */
  bloomMips?: number;
  /**
   * Phones: the shorter chain (the bloom's blur, then `FinishShader`: sharpening, ink, the glow and tone mapping in
   * one pass), its sharpening set from the screen's own pixels by `sharpen(native, scale)` (phone.ts `sharpness()`)
   */
  lite?: { sharpen: (native: number, scale: number) => number };
  /**
   * Draws the shadow maps itself (sky.ts: the fixed map now and then, the moving one every frame), given three's own
   * drawing; without it three draws every shadow-casting light's map each frame
   */
  shadows?: { drawShadows(draw: (lights: THREE.Light[], root: THREE.Object3D, camera: THREE.Camera) => void, root: THREE.Scene, camera: THREE.Camera): void };
}

export function createPost(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, opts: PostOpts) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());

  // Normal + depth of solid geometry only
  const depthTexture = new THREE.DepthTexture(size.x, size.y);
  depthTexture.type = THREE.UnsignedIntType;
  const normalTarget = new THREE.WebGLRenderTarget(size.x, size.y, { depthTexture, type: THREE.UnsignedByteType });
  const normalMat = new THREE.MeshNormalMaterial();
  // The crowds are skinned on the GPU from their baked clips: their outlines follow (everything else reads crowdOn 0);
  // so do the trees swaying in the wind (kit.ts `injectWind()`: everything else carries no sway)
  normalMat.onBeforeCompile = (sh) => {
    injectWind(sh);
    injectCrowdSkin(sh);
  };
  normalMat.customProgramCacheKey = () => 'normal-crowd-wind';

  const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: opts.msaa });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x * opts.bloomScale, size.y * opts.bloomScale), 0.8, 0.55, 0.86);
  let ink: ShaderPass;
  const bloomOnly = opts.lite ? new BloomOnly(bloom) : null;
  if (bloomOnly) {
    // (the bloom picks the bright parts out before the ink, not after: a tube's own outline no longer dims its halo)
    composer.addPass(bloomOnly);
    ink = new ShaderPass(
      new THREE.RawShaderMaterial({
        name: 'FinishShader',
        uniforms: FinishShader.uniforms,
        vertexShader: FinishShader.vertexShader,
        fragmentShader: FinishShader.fragmentShader,
        // (the city's own: Neutral tone mapping, an sRGB screen)
        defines: {
          ...(renderer.toneMapping === THREE.NeutralToneMapping ? { NEUTRAL_TONE_MAPPING: '' } : {}),
          ...(THREE.ColorManagement.getTransfer(renderer.outputColorSpace) === THREE.SRGBTransfer ? { SRGB_TRANSFER: '' } : {}),
        },
      }),
    );
    ink.uniforms.tBloom.value = bloom.renderTargetsHorizontal[0].texture;
  } else ink = new ShaderPass(InkShader);
  ink.uniforms.tNormal.value = normalTarget.texture;
  ink.uniforms.tDepth.value = depthTexture;
  composer.addPass(ink);
  if (!opts.lite) composer.addPass(bloom);
  // Fewer levels: 2 fewer passes each, and the widest, faintest halo left out (a softer glow). The
  // composite still reads the levels left out, weighted 0 (their targets are never drawn: all zero)
  if (opts.bloomMips && opts.bloomMips < bloom.nMips) {
    const factors = bloom.compositeMaterial.uniforms.bloomFactors.value as number[];
    for (let i = opts.bloomMips; i < factors.length; i++) factors[i] = 0;
    bloom.nMips = opts.bloomMips;
  }
  if (!opts.lite) composer.addPass(new OutputPass());
  // SMAA (desktops at a low pixel ratio, the fitting room on phones) comes in its own chunk, after the boot:
  // its look-up textures are 60 KB nobody else needs (until it's there the frame goes out without it)
  if (opts.smaa) import('three/addons/postprocessing/SMAAPass.js').then(({ SMAAPass }) => composer.addPass(new SMAAPass()));

  function setSize(w: number, h: number, pr: number) {
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    const W = Math.floor(w * pr);
    const H = Math.floor(h * pr);
    normalTarget.setSize(W, H);
    bloom.resolution.set(W * opts.bloomScale, H * opts.bloomScale);
    bloom.setSize(W * opts.bloomScale, H * opts.bloomScale);
    ink.uniforms.texel.value.set(1 / W, 1 / H);
    ink.uniforms.thickness.value = Math.max(1, pr * 0.9);
    if (opts.lite) ink.uniforms.sharpness.value = opts.lite.sharpen(window.devicePixelRatio || 1, pr);
  }

  const clear = new THREE.Color();
  // The frame draws the scene more than once (the ink pre-pass, then colour): the shadow map
  // is drawn once a frame, by the first of them, not again by each
  renderer.shadowMap.autoUpdate = false;
  // What the shadow map costs, apart (the ?fps readout): its draws and triangles since the last `shadowStat` reset
  const shadowStat = { calls: 0, tris: 0 };
  const shadowMap = renderer.shadowMap as THREE.WebGLShadowMap & { render: (...a: unknown[]) => void };
  const drawShadows = shadowMap.render.bind(shadowMap);
  // (three's own, once asked: it draws nothing unless `needsUpdate` is set)
  const draw = (...a: unknown[]) => {
    shadowMap.needsUpdate = true;
    drawShadows(...a);
  };
  shadowMap.render = (...a: unknown[]) => {
    // (every render of the frame asks; only the first, once `render()` has asked for it, draws)
    if (!shadowMap.enabled || !shadowMap.needsUpdate) return;
    const { calls, triangles } = renderer.info.render;
    if (opts.shadows) opts.shadows.drawShadows(draw, a[1] as THREE.Scene, a[2] as THREE.Camera);
    else drawShadows(...a);
    shadowMap.needsUpdate = false;
    shadowStat.calls += renderer.info.render.calls - calls;
    shadowStat.tris += renderer.info.render.triangles - triangles;
  };
  // The pre-pass only reaches as far as the outlines do (they've faded out by `fadeFar`): everything
  // further off is left out of it, so the frame draws the far city once, not twice
  const pre = new THREE.PerspectiveCamera();
  function render() {
    renderer.shadowMap.needsUpdate = renderer.shadowMap.enabled;
    pre.copy(camera, false);
    // (placed where the camera is in the world, whatever it's a child of)
    pre.matrixAutoUpdate = pre.matrixWorldAutoUpdate = false;
    pre.far = Math.min(camera.far, ink.uniforms.fadeFar.value + 5);
    pre.updateProjectionMatrix();
    camera.updateMatrixWorld();
    pre.matrixWorld.copy(camera.matrixWorld);
    pre.matrixWorldInverse.copy(camera.matrixWorldInverse);
    ink.uniforms.cameraNear.value = pre.near;
    ink.uniforms.cameraFar.value = pre.far;

    const bg = scene.background;
    const fog = scene.fog;
    scene.background = null;
    scene.fog = null;
    scene.overrideMaterial = normalMat;
    pre.layers.set(SOLID);
    renderer.getClearColor(clear);
    const alpha = renderer.getClearAlpha();
    renderer.setRenderTarget(normalTarget);
    renderer.setClearColor(0x8080ff, 1);
    renderer.clear();
    renderer.render(scene, pre);
    // Cut-out signs: their stand-ins mask the outlines behind them
    scene.overrideMaterial = null;
    pre.layers.set(OCC);
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.render(scene, pre);
    renderer.autoClear = autoClear;
    renderer.setClearColor(clear, alpha);
    scene.overrideMaterial = null;
    scene.background = bg;
    scene.fog = fog;
    camera.layers.set(SOLID);
    camera.layers.enable(FX);
    renderer.setRenderTarget(null);

    if (bloomOnly) {
      ink.uniforms.bloomAmt.value = bloom.enabled ? 1 : 0;
      ink.uniforms.toneMappingExposure.value = renderer.toneMappingExposure;
      bloomOnly.enabled = bloom.enabled;
    }
    composer.render();
  }

  return { composer, bloom, ink, render, setSize, shadowStat };
}

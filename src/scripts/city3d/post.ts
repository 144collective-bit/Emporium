/*
 * Post-processing: ink outlines from a normal + depth pre-pass, then neon
 * bloom, tone mapping and (on low pixel ratios) anti-aliasing.
 */
import * as THREE from 'three';
import { injectCrowdSkin } from './crowdskin';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FX, OCC, SOLID, injectWind } from './kit';

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
    /** 1 on phones: each line drawn on one side of its edge only, about half as wide (`PostOpts.thinInk`) */
    thin: { value: 0 },
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
    uniform sampler2D tNormal;
    uniform sampler2D tDepth;
    uniform vec2 texel;
    uniform float cameraNear;
    uniform float cameraFar;
    uniform vec3 ink;
    uniform float thickness;
    uniform float thin;
    uniform float fadeNear;
    uniform float fadeFar;
    varying vec2 vUv;

    float dist(vec2 uv) {
      return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, cameraNear, cameraFar);
    }
    vec3 nrm(vec2 uv) { return texture2D(tNormal, uv).rgb * 2.0 - 1.0; }

    void main() {
      vec4 col = texture2D(tDiffuse, vUv);
      vec2 o = texel * thickness;
      float d0 = dist(vUv);
      float dl = dist(vUv - vec2(o.x, 0.0));
      float dr = dist(vUv + vec2(o.x, 0.0));
      float du = dist(vUv + vec2(0.0, o.y));
      float dd = dist(vUv - vec2(0.0, o.y));
      // Second derivative of depth: flat or evenly sloping surfaces cancel out,
      // silhouettes and steps don't.
      // Thin: only the nearer side of a silhouette (its neighbours further away) takes the ink
      float lx = dl + dr - 2.0 * d0, ly = du + dd - 2.0 * d0;
      float lap = mix(abs(lx) + abs(ly), max(lx, 0.0) + max(ly, 0.0), thin) / max(d0, 0.1);
      float depthEdge = smoothstep(0.012, 0.03, lap);

      vec3 n0 = nrm(vUv);
      // Thin: a crease is found from one side (the right and up neighbours, counted twice), so one pixel row takes it
      float fr = 1.0 - dot(n0, nrm(vUv + vec2(o.x, 0.0)));
      float fu = 1.0 - dot(n0, nrm(vUv + vec2(0.0, o.y)));
      float nd = mix(fr + fu + (1.0 - dot(n0, nrm(vUv - vec2(o.x, 0.0)))) + (1.0 - dot(n0, nrm(vUv - vec2(0.0, o.y)))), 2.0 * (fr + fu), thin);
      float normalEdge = smoothstep(0.35, 0.8, nd);

      float nearest = min(min(min(dl, dr), min(du, dd)), d0);
      float fade = 1.0 - smoothstep(fadeNear, fadeFar, nearest);
      float e = max(depthEdge, normalEdge) * fade;
      gl_FragColor = vec4(mix(col.rgb, ink, e), col.a);
    }
  `,
};

export interface PostOpts {
  msaa: number;
  bloomScale: number;
  smaa: boolean;
  /** How many of the bloom's blur levels to draw (5, all of them, if not given): phones draw 3 */
  bloomMips?: number;
  /** Phones: the ink lines drawn about half as wide (one side of each edge, one texel out) */
  thinInk?: boolean;
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

  const ink = new ShaderPass(InkShader);
  ink.uniforms.tNormal.value = normalTarget.texture;
  ink.uniforms.tDepth.value = depthTexture;
  ink.uniforms.thin.value = opts.thinInk ? 1 : 0;
  composer.addPass(ink);

  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x * opts.bloomScale, size.y * opts.bloomScale), 0.8, 0.55, 0.86);
  composer.addPass(bloom);
  // Fewer levels: 2 fewer passes each, and the widest, faintest halo left out (a softer glow). The
  // composite still reads the levels left out, weighted 0 (their targets are never drawn: all zero)
  if (opts.bloomMips && opts.bloomMips < bloom.nMips) {
    const factors = bloom.compositeMaterial.uniforms.bloomFactors.value as number[];
    for (let i = opts.bloomMips; i < factors.length; i++) factors[i] = 0;
    bloom.nMips = opts.bloomMips;
  }
  composer.addPass(new OutputPass());
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
    ink.uniforms.thickness.value = opts.thinInk ? 1 : Math.max(1, pr * 0.9);
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

    composer.render();
  }

  return { composer, bloom, ink, render, setSize, shadowStat };
}

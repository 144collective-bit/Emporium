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
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { FX, OCC, SOLID } from './kit';

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
    uniform sampler2D tNormal;
    uniform sampler2D tDepth;
    uniform vec2 texel;
    uniform float cameraNear;
    uniform float cameraFar;
    uniform vec3 ink;
    uniform float thickness;
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
      float lap = (abs(dl + dr - 2.0 * d0) + abs(du + dd - 2.0 * d0)) / max(d0, 0.1);
      float depthEdge = smoothstep(0.012, 0.03, lap);

      vec3 n0 = nrm(vUv);
      float nd = (1.0 - dot(n0, nrm(vUv - vec2(o.x, 0.0)))) + (1.0 - dot(n0, nrm(vUv + vec2(o.x, 0.0))))
               + (1.0 - dot(n0, nrm(vUv + vec2(0.0, o.y)))) + (1.0 - dot(n0, nrm(vUv - vec2(0.0, o.y))));
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
}

export function createPost(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, opts: PostOpts) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());

  // Normal + depth of solid geometry only
  const depthTexture = new THREE.DepthTexture(size.x, size.y);
  depthTexture.type = THREE.UnsignedIntType;
  const normalTarget = new THREE.WebGLRenderTarget(size.x, size.y, { depthTexture, type: THREE.UnsignedByteType });
  const normalMat = new THREE.MeshNormalMaterial();
  // The crowds are skinned on the GPU from their baked clips: their outlines follow (everything else reads crowdOn 0)
  normalMat.onBeforeCompile = (sh) => injectCrowdSkin(sh);
  normalMat.customProgramCacheKey = () => 'normal-crowd';

  const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: opts.msaa });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));

  const ink = new ShaderPass(InkShader);
  ink.uniforms.tNormal.value = normalTarget.texture;
  ink.uniforms.tDepth.value = depthTexture;
  composer.addPass(ink);

  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x * opts.bloomScale, size.y * opts.bloomScale), 0.8, 0.55, 0.86);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let smaa: SMAAPass | null = null;
  if (opts.smaa) {
    smaa = new SMAAPass();
    composer.addPass(smaa);
  }

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
  }

  const clear = new THREE.Color();
  // The frame draws the scene more than once (the ink pre-pass, then colour): the shadow map
  // is drawn once a frame, by the first of them, not again by each
  renderer.shadowMap.autoUpdate = false;
  function render() {
    renderer.shadowMap.needsUpdate = renderer.shadowMap.enabled;
    ink.uniforms.cameraNear.value = camera.near;
    ink.uniforms.cameraFar.value = camera.far;

    const bg = scene.background;
    const fog = scene.fog;
    scene.background = null;
    scene.fog = null;
    scene.overrideMaterial = normalMat;
    camera.layers.set(SOLID);
    renderer.getClearColor(clear);
    const alpha = renderer.getClearAlpha();
    renderer.setRenderTarget(normalTarget);
    renderer.setClearColor(0x8080ff, 1);
    renderer.clear();
    renderer.render(scene, camera);
    // Cut-out signs: their stand-ins mask the outlines behind them
    scene.overrideMaterial = null;
    camera.layers.set(OCC);
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.render(scene, camera);
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

  return { composer, bloom, ink, render, setSize };
}

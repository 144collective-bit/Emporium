/*
 * Sky and weather: a gradient dome with stars, the sun or moon (with
 * shadows), drifting clouds, fog, and rain that comes and goes.
 * The time of day follows the visitor's clock unless they pick one.
 */
import * as THREE from 'three';
import { FX, canvasTex, fx, rand } from './kit';
import { CENTER } from './world';

export type TimeMode = 'live' | 'day' | 'sunset' | 'night';
export type WeatherMode = 'auto' | 'clear' | 'rain';

const PRESET: Record<Exclude<TimeMode, 'live'>, number> = { day: 13, sunset: 17.6, night: 23 };

const C = (h: string) => new THREE.Color(h);
const NIGHT = { top: C('#05050a'), hor: C('#2a0f4d') };
const DAY = { top: C('#3d8bff'), hor: C('#c4e4ff') };
const DUSK = { top: C('#2b1055'), hor: C('#ff6a5a') };

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function createSky(scene: THREE.Scene, opts: { shadows: number; rainDrops: number; clouds: number }) {
  /* Dome */
  const domeMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { top: { value: NIGHT.top.clone() }, hor: { value: NIGHT.hor.clone() }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: C('#ffffff') }, sunAmt: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunAmt;
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y, 0.0, 1.0);
        vec3 col = mix(hor, top, pow(h, 0.55));
        float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
        col += sunCol * (pow(s, 600.0) * 3.0 + pow(s, 12.0) * 0.35) * sunAmt;
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  // The dome (and the stars on it) travels with the camera, just inside its far plane (440),
  // so the whole world and the skyline past its edge always stand in front of the sky
  const dome = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), domeMat);
  dome.position.copy(CENTER);
  scene.add(fx(dome));

  /* Stars */
  const nStars = 900;
  const sp = new Float32Array(nStars * 3);
  for (let i = 0; i < nStars; i++) {
    const a = rand() * Math.PI * 2;
    const y = 0.08 + rand() * 0.92;
    const r = Math.sqrt(1 - y * y);
    sp.set([Math.cos(a) * r * 380, y * 380, Math.sin(a) * r * 380], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const starMat = new THREE.PointsMaterial({ color: '#ffffff', size: 1.4, sizeAttenuation: false, transparent: true, depthWrite: false, fog: false });
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false;
  scene.add(fx(stars));

  /* Lights */
  const hemi = new THREE.HemisphereLight('#bcd4ff', '#2a2050', 1);
  const sun = new THREE.DirectionalLight('#ffffff', 2);
  sun.target.position.copy(CENTER);
  /** The shadow camera's reach either way, and one texel of its map, in world units */
  const SHADOW_REACH = 30;
  const texel = opts.shadows ? (SHADOW_REACH * 2) / opts.shadows : 0;
  if (opts.shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(opts.shadows, opts.shadows);
    const cam = sun.shadow.camera;
    cam.left = -SHADOW_REACH;
    cam.right = SHADOW_REACH;
    cam.top = SHADOW_REACH;
    cam.bottom = -SHADOW_REACH;
    cam.near = 1;
    cam.far = 140;
    sun.shadow.bias = -0.0006;
    // Pushed out along the normal by two and a half texels, so a lit face never shades itself in stripes
    // (shadow acne; it showed most on pale stone, like Liberty Bridge's, in the low evening sun)
    sun.shadow.normalBias = texel * 2.5;
  }
  scene.add(hemi, sun, sun.target);

  /* Clouds */
  const cloudTex = canvasTex(256, 128, (c) => {
    for (let i = 0; i < 14; i++) {
      const x = 40 + rand() * 176;
      const y = 50 + rand() * 36;
      const r = 22 + rand() * 30;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,.9)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }
  });
  const clouds: { s: THREE.Sprite; v: number }[] = [];
  const cloudMat = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, opacity: 0.6, fog: false });
  for (let i = 0; i < opts.clouds; i++) {
    // Each cloud has its own material so it can fade on its own as the camera nears it
    const s = new THREE.Sprite(cloudMat.clone());
    const sc = 14 + rand() * 16;
    s.scale.set(sc, sc / 2, 1);
    s.position.set(CENTER.x - 80 + rand() * 160, 30 + rand() * 8, CENTER.z - 70 + rand() * 140);
    s.layers.set(FX);
    scene.add(s);
    clouds.push({ s, v: 0.6 + rand() * 0.8 });
  }

  /* Rain: falling streaks animated entirely on the GPU */
  const n = opts.rainDrops;
  const rp = new Float32Array(n * 2 * 3);
  const re = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const x = (rand() - 0.5) * 70;
    const z = (rand() - 0.5) * 70;
    const y = rand() * 22;
    rp.set([x, y, z, x, y, z], i * 6);
    re.set([0, 1], i * 2);
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rp, 3));
  rainGeo.setAttribute('end', new THREE.BufferAttribute(re, 1));
  const rainMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { time: { value: 0 }, amount: { value: 0 }, origin: { value: CENTER.clone() }, color: { value: C('#bcd0ff') } },
    vertexShader: /* glsl */ `
      attribute float end;
      uniform float time; uniform vec3 origin;
      varying float vEnd;
      void main() {
        vec3 p = position;
        p.y = mod(p.y - time * 16.0, 22.0);
        p.xz += origin.xz + vec2(0.25, 0.1) * (p.y - 11.0) * 0.08;
        p += vec3(-0.05, 0.55, -0.02) * end;
        vEnd = end;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float amount; uniform vec3 color; varying float vEnd;
      void main() { gl_FragColor = vec4(color, amount * 0.55 * vEnd); }
    `,
  });
  const rain = new THREE.LineSegments(rainGeo, rainMat);
  rain.frustumCulled = false;
  scene.add(fx(rain));

  /* State */
  let timeMode: TimeMode = 'live';
  let weatherMode: WeatherMode = 'auto';
  // Every visit starts dry (it always did: this used to be a draw from the city's seeded numbers that came out dry); in auto, rain comes and goes after
  let rainAmt = 0;
  let rainTarget = rainAmt;
  let nextFlip = 60 + rand() * 120;
  let hourSmooth = currentHour();
  const fog = new THREE.FogExp2('#2a0f4d', 0.012);
  scene.fog = fog;
  scene.background = NIGHT.hor.clone();

  function currentHour() {
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  }

  const tmpTop = new THREE.Color();
  const tmpHor = new THREE.Color();

  const UP = new THREE.Vector3(0, 1, 0);
  const shadowX = new THREE.Vector3();
  const shadowY = new THREE.Vector3();
  function update(t: number, dt: number, focus: THREE.Vector3, eye: THREE.Vector3) {
    dome.position.copy(eye);
    stars.position.copy(eye);
    // Time of day: ease towards the target hour so switching modes glides
    const target = timeMode === 'live' ? currentHour() : PRESET[timeMode];
    let diff = target - hourSmooth;
    if (diff > 12) diff -= 24;
    if (diff < -12) diff += 24;
    hourSmooth = (hourSmooth + diff * Math.min(1, dt * 1.6) + 24) % 24;
    const h = hourSmooth;

    const ang = ((h - 6) / 24) * Math.PI * 2;
    const elev = Math.sin(ang);
    const day = smooth(-0.04, 0.3, elev);
    const night = 1 - smooth(-0.22, 0.06, elev);
    const dusk = Math.max(0, 1 - Math.abs(elev) / 0.32) * (1 - night * 0.6);

    tmpTop.copy(NIGHT.top).lerp(DAY.top, day).lerp(DUSK.top, dusk * 0.7);
    tmpHor.copy(NIGHT.hor).lerp(DAY.hor, day).lerp(DUSK.hor, dusk * 0.85);
    // Rain greys everything out
    const grey = C('#4a4a66');
    tmpTop.lerp(grey, rainAmt * 0.45 * day);
    tmpHor.lerp(grey, rainAmt * 0.35);
    domeMat.uniforms.top.value.copy(tmpTop);
    domeMat.uniforms.hor.value.copy(tmpHor);
    fog.color.copy(tmpHor);
    (scene.background as THREE.Color).copy(tmpHor);
    // Thin haze by day so colours stay crisp; thicker at night and in rain
    // and thinner when pulled far back (the Build overview takes in the whole map), so the edges don't drown
    const far = THREE.MathUtils.clamp(70 / Math.max(1, eye.distanceTo(focus)), 0.55, 1);
    fog.density = (0.0105 - day * 0.0068 + rainAmt * 0.0055 + dusk * 0.002) * far;

    // Sun by day, moon by night, both from the south-east
    const az = ang * 0.5 + 0.6;
    const lightElev = night > 0.5 ? 0.75 : Math.max(0.12, elev);
    const dir = new THREE.Vector3(Math.cos(az) * Math.cos(lightElev), Math.sin(lightElev), Math.sin(az) * Math.cos(lightElev)).normalize();
    // The sun (and its shadow camera) follows the view, so districts get shadows too, moving in whole
    // texels of its map (across the light), so the shadows' edges don't crawl as the view moves
    sun.target.position.set(focus.x, 0, focus.z);
    if (texel) {
      shadowX.crossVectors(UP, dir).normalize();
      shadowY.crossVectors(dir, shadowX);
      const p = sun.target.position;
      const [a, b, c] = [p.dot(shadowX), p.dot(shadowY), p.dot(dir)];
      p.copy(shadowX)
        .multiplyScalar(Math.round(a / texel) * texel)
        .addScaledVector(shadowY, Math.round(b / texel) * texel)
        .addScaledVector(dir, c);
    }
    sun.position.copy(sun.target.position).addScaledVector(dir, 70);
    domeMat.uniforms.sunDir.value.copy(dir);
    domeMat.uniforms.sunAmt.value = (1 - night) * (1 - rainAmt * 0.8);
    const sunCol = C('#fff3dc').lerp(C('#ff9a5a'), dusk);
    domeMat.uniforms.sunCol.value.copy(sunCol);
    sun.color.copy(night > 0.5 ? C('#8fa0ff') : sunCol);
    // Moonlight is a touch stronger than the glow needs, so buildings keep their shape at night
    // By day the sun does more of the work than the sky light: clearer shadows, more contrast
    sun.intensity = night > 0.5 ? 0.72 : (0.6 + day * 2.5) * (1 - rainAmt * 0.45);
    hemi.intensity = 0.5 + day * 0.32;
    hemi.color.copy(C('#5a4a9a').lerp(C('#bcd4ff'), day));
    hemi.groundColor.copy(C('#1a1236').lerp(C('#3a5a3a'), day));
    starMat.opacity = night * (1 - rainAmt);

    // Weather
    if (weatherMode === 'auto') {
      nextFlip -= dt;
      if (nextFlip <= 0) {
        rainTarget = rainTarget ? 0 : 1;
        nextFlip = rainTarget ? 40 + rand() * 40 : 90 + rand() * 120;
      }
    } else rainTarget = weatherMode === 'rain' ? 1 : 0;
    rainAmt += (rainTarget - rainAmt) * Math.min(1, dt * 0.35);
    rainMat.uniforms.time.value = t;
    rainMat.uniforms.amount.value = rainAmt;
    rainMat.uniforms.origin.value.set(focus.x, 0, focus.z);
    rain.visible = rainAmt > 0.01;

    // Lighter by day so they never sit over the city like fog
    const cloudOpacity = 0.18 + day * 0.1 + rainAmt * 0.3;
    cloudMat.color.copy(C('#5a4a8a').lerp(C('#ffffff'), day)).lerp(C('#8a8aa0'), rainAmt * 0.6);
    for (const c of clouds) {
      const m = c.s.material;
      m.color.copy(cloudMat.color);
      m.opacity = cloudOpacity * smooth(14, 34, c.s.position.distanceTo(eye));
      c.s.position.x += c.v * dt * (1 + rainAmt);
      if (c.s.position.x > CENTER.x + 90) c.s.position.x = CENTER.x - 90;
    }

    return { day, night, dusk, rain: rainAmt, hour: h };
  }

  return {
    update,
    /**
     * Where the sun's shadow box is this frame (after `update()`), into `out`: only what's in it can
     * cast a shadow, so the crowds and the traffic leave the rest out of the shadow map. False without shadows.
     */
    shadowFrustum(out: THREE.Frustum) {
      if (!opts.shadows) return false;
      sun.updateMatrixWorld();
      sun.target.updateMatrixWorld();
      sun.shadow.updateMatrices(sun);
      out.copy(sun.shadow.getFrustum());
      return true;
    },
    setTime(m: TimeMode) {
      timeMode = m;
    },
    setWeather(m: WeatherMode) {
      weatherMode = m;
      if (m === 'auto') nextFlip = 60 + rand() * 60;
    },
    get time() {
      return timeMode;
    },
    get weather() {
      return weatherMode;
    },
  };
}

/*
 * The Emporium (buildLandmarks() in landmarks.ts puts it on its lot): the twisting glass cyber arcade, the
 * city's centrepiece, with its LED wall (drawWall: fixed copy only), the rooftop hologram, the podium, claw
 * machines and prize booth (mirrored in solids.ts).
 */
import * as THREE from 'three';
import { Batch, canvasTex, fx, glowMat, lit, liveTex, neonSign, occlude, PAL, place, rng, toon } from './kit';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PLAYER, createDegen, idlePose } from './character';
import { SLAB as S, addLamp, addTree } from './world';
import type { Idle, LandmarkCtx } from './landmarks';
import { V, cylAt, sign, signMat, spot, unitBox, unitPlane } from './landmark-kit';

/* ---------- The Emporium: a twisting glass cyber arcade ---------- */

/** Podium floor plan, grown outwards by `d`: a square with its street corner cut off. */
const PODIUM = { x0: 11.8, z0: 11.8, x1: 18.0, z1: 18.0, cut: 34 };
function podiumPlan(d: number): [number, number][] {
  const { x0, z0, x1, z1, cut } = PODIUM;
  const c = (Math.SQRT2 - 1) * d;
  return [
    [x0 - d, z0 - d],
    [x1 + d, z0 - d],
    [x1 + d, cut - x1 + c],
    [cut - z1 + c, z1 + d],
    [x0 - d, z1 + d],
  ];
}

/** A flat-topped solid from a floor plan of (x, z) points, standing on y0. */
function planSlab(pts: [number, number][], y0: number, h: number) {
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z))), { depth: h, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  return g;
}


/* A 3 x 5 pixel font for the LED wall: each glyph is five rows of three bits. */
const PIXEL_FONT: Record<string, number[]> = {
  A: [2, 5, 7, 5, 5], B: [6, 5, 6, 5, 6], C: [3, 4, 4, 4, 3], D: [6, 5, 5, 5, 6], E: [7, 4, 6, 4, 7],
  F: [7, 4, 6, 4, 4], G: [3, 4, 5, 5, 3], H: [5, 5, 7, 5, 5], I: [7, 2, 2, 2, 7], J: [1, 1, 1, 5, 2],
  K: [5, 5, 6, 5, 5], L: [4, 4, 4, 4, 7], M: [5, 7, 7, 5, 5], N: [6, 5, 5, 5, 5], O: [2, 5, 5, 5, 2],
  P: [6, 5, 6, 4, 4], Q: [2, 5, 5, 6, 3], R: [6, 5, 6, 5, 5], S: [3, 4, 2, 1, 6], T: [7, 2, 2, 2, 2],
  U: [5, 5, 5, 5, 7], V: [5, 5, 5, 5, 2], W: [5, 5, 7, 7, 5], X: [5, 5, 2, 5, 5], Y: [5, 5, 2, 2, 2],
  Z: [7, 1, 2, 4, 7], '0': [7, 5, 5, 5, 7], '1': [2, 6, 2, 2, 7], '2': [6, 1, 2, 4, 7], '3': [6, 1, 2, 1, 6],
  '4': [5, 5, 7, 1, 1], '5': [7, 4, 6, 1, 6], '6': [3, 4, 7, 5, 7], '7': [7, 1, 2, 2, 2], '8': [7, 5, 7, 5, 7],
  '9': [7, 5, 7, 1, 6], ' ': [0, 0, 0, 0, 0], '!': [2, 2, 2, 0, 2], ':': [0, 2, 0, 2, 0], '-': [0, 0, 7, 0, 0],
};
function pixelText(c: CanvasRenderingContext2D, s: string, x: number, y: number, color: string, k = 1, centre = true) {
  const w = s.length * 4 * k - k;
  let px = centre ? Math.round(x - w / 2) : x;
  c.fillStyle = color;
  for (const ch of s) {
    const g = PIXEL_FONT[ch] ?? PIXEL_FONT[' '];
    g.forEach((row, r) => {
      for (let b = 0; b < 3; b++) if (row & (4 >> b)) c.fillRect(px + b * k, y + r * k, k, k);
    });
    px += 4 * k;
  }
}
/** A little alien of our own, two frames, 8 x 6. */
const ALIEN = [
  [0x24, 0x7e, 0xdb, 0xff, 0x5a, 0x81],
  [0x24, 0x7e, 0xdb, 0xff, 0xa5, 0x42],
];
function sprite(c: CanvasRenderingContext2D, rows: number[], x: number, y: number, color: string) {
  c.fillStyle = color;
  rows.forEach((row, r) => {
    for (let b = 0; b < 8; b++) if (row & (0x80 >> b)) c.fillRect(x + b, y + r, 1, 1);
  });
}

/**
 * The LED wall's shows, drawn at 64 px wide and played at 8 frames a second.
 * Fixed copy only: nothing here may name or hint at the token.
 */
const WALL_W = 64;
const SHOWS = ['coin', 'invaders', 'eq', 'scores', 'degen'] as const;
function drawWall(c: CanvasRenderingContext2D, H: number, show: (typeof SHOWS)[number], f: number, degen: HTMLImageElement | null) {
  // Each floor of the tower shows one 12 px band of the wall; text sits inside a band so no slab cuts it
  const bands = Math.floor(H / 12);
  const row = (band: number, k = 1) => band * 12 + (k === 2 ? 1 : 3);
  const mid = Math.floor(bands / 2);
  c.fillStyle = '#05040c';
  c.fillRect(0, 0, WALL_W, H);
  if (show === 'coin') {
    if (f % 8 < 5) {
      pixelText(c, 'INSERT', 32, row(mid - 3, 2), '#ffd36b', 2);
      pixelText(c, 'COIN', 32, row(mid - 2, 2), '#ffd36b', 2);
    }
    const w = Math.max(1, Math.round(Math.abs(Math.cos(f * 0.5)) * 5));
    c.fillStyle = '#ffd36b';
    c.fillRect(32 - w, row(mid, 2), w * 2, 10);
    c.fillStyle = '#b8862e';
    c.fillRect(32 - Math.max(1, w - 2), row(mid, 2) + 2, Math.max(2, (w - 2) * 2), 6);
    pixelText(c, 'PLAYER 1', 32, row(mid + 2), '#00eaff');
    if (f % 4 < 3) pixelText(c, 'READY', 32, row(mid + 3), '#00eaff');
  } else if (show === 'invaders') {
    const step = Math.floor(f / 2);
    const dx = (step % 12) - 6;
    const down = Math.floor(step / 12) % 4;
    const cols = ['#ff6ad5', '#a64dff', '#00eaff'];
    pixelText(c, 'SCORE 0420', 32, row(0), '#ffffff');
    for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) sprite(c, ALIEN[step % 2], 10 + k * 12 + dx, row(2 + r + down), cols[r]);
    const sx = 28 + Math.round(Math.sin(f * 0.3) * 18);
    c.fillStyle = '#7cff9e';
    c.fillRect(sx, row(bands - 1) + 3, 7, 3);
    c.fillRect(sx + 3, row(bands - 1) + 1, 1, 2);
    c.fillStyle = '#ffffff';
    c.fillRect(sx + 3, row(bands - 1) - 6 - ((f * 6) % (H - 30)), 1, 3);
  } else if (show === 'eq') {
    pixelText(c, 'GAME ON', 32, row(0, 2), '#ffffff', 2);
    for (let k = 0; k < 8; k++) {
      const lv = 0.2 + 0.8 * Math.abs(Math.sin(f * 0.37 + k * 1.3) * Math.cos(f * 0.21 + k));
      const n = Math.round(lv * (bands - 2));
      for (let j = 0; j < n; j++) {
        const t = j / (bands - 2);
        c.fillStyle = t < 0.33 ? '#ff2fb9' : t < 0.66 ? '#a64dff' : '#00eaff';
        c.fillRect(2 + k * 7.75, (bands - 1 - j) * 12 + 2, 6, 8);
      }
    }
  } else if (show === 'scores') {
    pixelText(c, 'HI SCORE', 32, row(1, 2), '#ff6ad5', 2);
    const rows = ['1 DEGEN 999990', '2 APE   777770', '3 CHAD  555550', '4 ANON  333330', '5 YOU   000010'];
    const hot = Math.floor(f / 4) % rows.length;
    rows.forEach((txt, i) => pixelText(c, txt, 32, row(3 + i), i === hot ? '#ffffff' : ['#ffd36b', '#00eaff', '#a64dff', '#ff6ad5', '#7cff9e'][i]));
  } else {
    if (degen) {
      const h = (bands - 4) * 12;
      const w = Math.round((degen.width / degen.height) * h);
      c.imageSmoothingEnabled = true;
      c.drawImage(degen, Math.round(32 - w / 2), 24, w, h);
    }
    if (f % 6 < 4) pixelText(c, 'GM DEGENS', 32, row(bands - 1), '#ffffff');
  }
  // LED grid
  c.fillStyle = 'rgba(0,0,0,.35)';
  for (let y = 0; y < H; y += 2) c.fillRect(0, y, WALL_W, 1);
}

/** Hologram light: rim-lit, scanlined, flickering, from pink at the feet to cyan at the head. */
function holoMaterial(base: number, height: number) {
  return new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, power: { value: 1 }, base: { value: base }, height: { value: height } },
    // (Skinned: Degen's body bends on its bones; the chunks do nothing on a plain mesh)
    vertexShader: /* glsl */ `
      #include <common>
      #include <skinning_pars_vertex>
      varying vec3 vN; varying vec3 vV; varying float vY;
      void main() {
        #include <skinbase_vertex>
        #include <beginnormal_vertex>
        #include <skinnormal_vertex>
        #include <begin_vertex>
        #include <skinning_vertex>
        vec4 wp = modelMatrix * vec4(transformed, 1.0);
        vY = wp.y;
        vec4 mv = viewMatrix * wp;
        vN = normalize(normalMatrix * objectNormal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float time; uniform float power; uniform float base; uniform float height;
      varying vec3 vN; varying vec3 vV; varying float vY;
      void main() {
        float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
        float scan = 0.6 + 0.4 * step(0.45, fract(vY * 9.0 - time * 1.2));
        float t = clamp((vY - base) / height, 0.0, 1.0);
        vec3 col = mix(vec3(1.0, 0.25, 0.8), vec3(0.0, 0.92, 1.0), smoothstep(0.1, 0.8, t));
        gl_FragColor = vec4(col * (0.18 + rim * 0.9) * scan * power, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

export function emporium(scene: THREE.Scene, ctx: LandmarkCtx, crowd: Idle[]) {
  const CX = 14.7; // tower centre
  const CZ = 14.7;
  const N = 12; // floors
  const FH = 0.82;
  const HS = 2.0; // half the floor plate
  const TWIST = Math.PI / 3; // over the whole height
  const PH = 2.3; // podium height
  const y0 = S + PH + 0.18; // first tower floor, on the podium roof
  const roofY = y0 + N * FH;
  const sp = spot(scene, 'emporium', V(CX, 6.5, CZ), 9.4, V(CX, roofY + 3.9, CZ));
  const g = sp.group;
  const b = new Batch();
  const glassB = new Batch();
  const D45 = Math.PI / 4;
  const N2: [number, number] = [Math.SQRT1_2, Math.SQRT1_2]; // the podium's corner front faces the street corner
  const U2: [number, number] = [Math.SQRT1_2, -Math.SQRT1_2];
  const at = (n: number, u: number): [number, number] => [17 + N2[0] * n + U2[0] * u, 17 + N2[1] * n + U2[1] * u];

  const dark = toon('#1a1730');
  const frame = toon('#2a2448');
  const cabBody = toon('#3e3180');
  const gameTex = canvasTex(128, 128, (c) => {
    c.fillStyle = '#2a1f5c';
    c.fillRect(0, 0, 128, 128);
    c.strokeStyle = '#00eaff';
    c.lineWidth = 3;
    c.strokeRect(1.5, 1.5, 125, 125);
    c.strokeStyle = '#ff2fb9';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(64, 0);
    c.lineTo(64, 128);
    c.moveTo(0, 64);
    c.lineTo(128, 64);
    c.stroke();
  });
  gameTex.wrapS = gameTex.wrapT = THREE.RepeatWrapping;
  gameTex.repeat.set(4, 4);
  const gameFloor = lit(new THREE.MeshBasicMaterial({ map: gameTex }), 1, 1);
  const glassTex = canvasTex(64, 256, (c) => {
    const gr = c.createLinearGradient(0, 0, 64, 0);
    gr.addColorStop(0, 'rgba(255,255,255,.85)');
    gr.addColorStop(0.16, 'rgba(255,255,255,.3)');
    gr.addColorStop(0.45, 'rgba(255,255,255,.55)');
    gr.addColorStop(0.6, 'rgba(255,255,255,.22)');
    gr.addColorStop(1, 'rgba(255,255,255,.7)');
    c.fillStyle = gr;
    c.fillRect(0, 0, 64, 256);
  });
  const glass = lit(new THREE.MeshBasicMaterial({ color: '#bff3ff', map: glassTex, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }), 1, 0.45);
  const screens = ['#00eaff', '#ff6ad5', '#a64dff', '#ffd36b'].map((c) => lit(new THREE.MeshBasicMaterial({ color: c }), 0.95, 1.35));
  const ceiling = lit(new THREE.MeshBasicMaterial({ color: '#6b5aa8' }), 0.9, 0.75);
  const r = rng(91);
  const ceilingGeo = unitPlane.clone().rotateX(Math.PI / 2);
  const floorGeo = unitPlane.clone().rotateX(-Math.PI / 2);

  // Place things in a floor's own (rotated) frame
  const rot = (i: number) => (i / N) * TWIST;
  const loc = (th: number, lx: number, lz: number): [number, number] => [CX + lx * Math.cos(th) + lz * Math.sin(th), CZ - lx * Math.sin(th) + lz * Math.cos(th)];
  const boxIn = (bt: Batch, th: number, lx: number, y: number, lz: number, w: number, h: number, d: number, mat: THREE.Material, ry = 0) => {
    const [x, z] = loc(th, lx, lz);
    bt.add(place(unitBox, x, y + h / 2, z, w, h, d, 0, th + ry, 0), mat);
  };
  const planeIn = (bt: Batch, th: number, lx: number, y: number, lz: number, w: number, h: number, mat: THREE.Material, ry: number) => {
    const [x, z] = loc(th, lx, lz);
    bt.add(place(unitPlane, x, y, z, w, h, 1, 0, th + ry, 0), mat);
  };
  const person = (bt: Batch, th: number, lx: number, y: number, lz: number) => {
    boxIn(bt, th, lx, y, lz, 0.12, 0.3, 0.09, toon('#14121f'));
    const [x, z] = loc(th, lx, lz);
    const head = new THREE.SphereGeometry(0.06, 8, 6);
    head.translate(x, y + 0.37, z);
    bt.add(head, toon('#14121f'));
    const capG = new THREE.CylinderGeometry(0.063, 0.063, 0.03, 8);
    capG.translate(x, y + 0.42, z);
    bt.add(capG, toon(r() < 0.5 ? '#e23b3b' : '#00b8d8'));
  };
  /** An arcade cabinet on side k (0..3), s along that side, its screen facing out to the glass. */
  const cabinet = (bt: Batch, th: number, k: number, s: number, y: number, inset = 1.62) => {
    const phi = (k * Math.PI) / 2;
    const nx = Math.sin(phi);
    const nz = Math.cos(phi);
    const lx = nx * inset + Math.cos(phi) * s;
    const lz = nz * inset - Math.sin(phi) * s;
    boxIn(bt, th, lx, y, lz, 0.3, 0.56, 0.22, cabBody, phi);
    const scr = screens[Math.floor(r() * screens.length)];
    planeIn(bt, th, lx + nx * 0.116, y + 0.38, lz + nz * 0.116, 0.22, 0.17, scr, phi);
    // The marquee a touch wider than the body (as wide, their sides flicker against each other)
    boxIn(bt, th, lx + nx * 0.02, y + 0.5, lz + nz * 0.02, 0.31, 0.07, 0.2, scr, phi);
    return [lx, lz, nx, nz] as const;
  };

  /* ----- Podium: the street-level arcade hall ----- */
  b.add(planSlab(podiumPlan(0), S, 0.06), toon('#221c3a'));
  b.add(planSlab(podiumPlan(0.08), S + PH, 0.18), dark);
  const roofEdge = lit(new THREE.MeshBasicMaterial({ color: '#00eaff' }), 0.8, 1.3);
  b.add(planSlab(podiumPlan(0.12), S + PH + 0.05, 0.06), roofEdge);
  // Solid back walls, glass street fronts with slim mullions
  b.box(11.8, S, 11.8, 6.2, PH, 0.12, dark);
  b.box(11.8, S, 11.8, 0.12, PH, 6.2, dark);
  const fronts: [[number, number], [number, number]][] = [
    [
      [11.92, 18.0],
      [16.0, 18.0],
    ],
    [
      [16.0, 18.0],
      [18.0, 16.0],
    ],
    [
      [18.0, 16.0],
      [18.0, 11.92],
    ],
  ];
  for (const [a, c] of fronts) {
    const dx = c[0] - a[0];
    const dz = c[1] - a[1];
    const len = Math.hypot(dx, dz);
    const ryN = Math.atan2(-dz / len, dx / len);
    glassB.add(place(unitPlane, (a[0] + c[0]) / 2, S + PH / 2, (a[1] + c[1]) / 2, len, PH, 1, 0, ryN, 0), glass);
    const n = Math.round(len / 0.7);
    for (let k = 0; k <= n; k++) b.add(place(unitBox, a[0] + (dx * k) / n, S + PH / 2, a[1] + (dz * k) / n, 0.06, PH, 0.06), frame);
  }
  // Inside: claw machines along the front, cabinets along the side, players
  for (let k = 0; k < 5; k++) {
    const x = 12.5 + k * 0.7;
    b.box(x - 0.22, S + 0.06, 17.25, 0.44, 0.5, 0.44, toon(k % 2 ? '#ff6ad5' : '#00b8d8'));
    glassB.add(place(new THREE.BoxGeometry(0.42, 0.5, 0.42), x, S + 0.81, 17.47), glass);
    b.box(x - 0.22, S + 1.06, 17.25, 0.44, 0.1, 0.44, screens[k % 4]);
    for (let p = 0; p < 4; p++) {
      const ball = new THREE.SphereGeometry(0.06, 8, 6);
      ball.translate(x - 0.12 + (p % 2) * 0.22, S + 0.62, 17.37 + Math.floor(p / 2) * 0.18);
      b.add(ball, toon(['#ffd36b', '#ff6ad5', '#7cff9e', '#00eaff'][p]));
    }
  }
  for (let k = 0; k < 5; k++) {
    const z = 12.5 + k * 0.72;
    b.box(17.25, S + 0.06, z - 0.15, 0.22, 0.56, 0.3, frame);
    const scr = new THREE.PlaneGeometry(0.17, 0.22);
    scr.rotateY(Math.PI / 2);
    scr.translate(17.475, S + 0.44, z);
    b.add(scr, screens[(k + 1) % 4]);
    if (k % 2 === 0) person(b, 0, 16.95 - CX, S + 0.06, z - CZ);
  }
  // Glowing floor inside
  const floorTex = canvasTex(256, 256, (c) => {
    c.fillStyle = '#0d0a1c';
    c.fillRect(0, 0, 256, 256);
    c.strokeStyle = '#3b2c80';
    c.lineWidth = 3;
    for (let k = 0; k <= 256; k += 32) {
      c.beginPath();
      c.moveTo(k, 0);
      c.lineTo(k, 256);
      c.moveTo(0, k);
      c.lineTo(256, k);
      c.stroke();
    }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(0.5, 0.5);
  {
    const fl = new THREE.Mesh(planSlab(podiumPlan(-0.13), S + 0.06, 0.005), lit(new THREE.MeshBasicMaterial({ map: floorTex }), 1, 1));
    g.add(fl);
  }

  // Entrance on the corner: glowing doors, a canopy, the ARCADE sign and the logo above it
  {
    const doorTex = canvasTex(256, 256, (c) => {
      c.fillStyle = '#0b0918';
      c.fillRect(0, 0, 256, 256);
      const gr = c.createLinearGradient(0, 256, 0, 0);
      gr.addColorStop(0, '#ff6ad5');
      gr.addColorStop(1, '#00eaff');
      c.strokeStyle = gr;
      c.lineWidth = 16;
      c.strokeRect(18, 18, 220, 238);
      c.fillStyle = 'rgba(124,244,255,.25)';
      c.fillRect(30, 30, 94, 226);
      c.fillRect(132, 30, 94, 226);
      c.fillStyle = gr;
      c.fillRect(124, 30, 8, 226);
    });
    const [dx0, dz0] = at(0.03, 0);
    const door = sign(signMat(doorTex, 1, 1.25), 1.4, 1.5, dx0, S + 0.8, dz0);
    door.rotation.y = D45;
    g.add(door);
    const [cx, cz] = at(0.55, 0);
    b.add(place(unitBox, cx, S + 1.75, cz, 3.0, 0.12, 1.1, 0, D45, 0), dark);
    b.add(place(unitBox, cx, S + 1.68, cz, 2.9, 0.02, 1.0, 0, D45, 0), lit(new THREE.MeshBasicMaterial({ color: '#c9b8ff' }), 0.8, 1.1));
    const [sx, sz] = at(1.12, 0);
    const arcade = sign(signMat(neonSign('ARCADE', PAL.cyan, { board: null }), 1, 1.5, 0.03), 2.4, 0.6, sx, S + 2.12, sz);
    arcade.rotation.y = D45;
    g.add(arcade);
    const lw = 3.4;
    const lh = lw * (494 / 729);
    const [lx, lz] = at(0.35, 0);
    const logo = new THREE.Mesh(
      new THREE.PlaneGeometry(lw, lh),
      lit(new THREE.MeshBasicMaterial({ map: ctx.logo, transparent: true, alphaTest: 0.04, side: THREE.DoubleSide }), 1, 1.25)
    );
    logo.position.set(lx, S + PH + 0.3 + lh / 2, lz);
    logo.rotation.y = D45;
    occlude(logo, ctx.logo);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(lw * 1.45, lh * 1.45), lit(glowMat(PAL.magenta, 1), 0.1, 0.2));
    halo.position.set(lx - 0.1, S + PH + 0.3 + lh / 2, lz - 0.1);
    halo.rotation.y = D45;
    g.add(fx(logo), fx(halo));
    const [ax, az] = at(0.3, -0.9);
    const [bx2, bz2] = at(0.3, 0.9);
    cylAt(b, ax, S + PH + 0.2, az, 0.04, 0.5, frame, 6);
    cylAt(b, bx2, S + PH + 0.2, bz2, 0.04, 0.5, frame, 6);
  }

  /* ----- The tower: fourteen glass floors, each turned a little further ----- */
  const wallFloors: number[] = [];
  for (let i = 0; i < N; i++) {
    const th = rot(i);
    const y = y0 + i * FH;
    boxIn(b, th, 0, y, 0, HS * 2 + 0.1, 0.1, HS * 2 + 0.1, dark);
    {
      const [x, z] = loc(th, 0, 0);
      b.add(place(ceilingGeo, x, y + FH - 0.005, z, HS * 2 - 0.3, 1, HS * 2 - 0.3, 0, th, 0), ceiling);
    }
    boxIn(b, th, 0, y + 0.1, 0, 1.0, FH - 0.1, 1.0, frame);
    {
      const [x, z] = loc(th, 0, 0);
      b.add(place(floorGeo, x, y + 0.102, z, HS * 2 - 0.1, 1, HS * 2 - 0.1, 0, th, 0), gameFloor);
    }
    for (const [cx, cz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ])
      boxIn(b, th, cx * (HS - 0.04), y + 0.1, cz * (HS - 0.04), 0.12, FH - 0.1, 0.12, frame);
    const wall = i >= 1 && i <= N - 2;
    if (wall) wallFloors.push(i);
    for (let k = 0; k < 4; k++) {
      if (wall && k === 0) continue;
      const phi = (k * Math.PI) / 2;
      planeIn(glassB, th, Math.sin(phi) * HS, y + 0.1 + (FH - 0.1) / 2, Math.cos(phi) * HS, HS * 2, FH - 0.1, glass, phi);
    }
    // Game floors behind the glass
    const fy = y + 0.1;
    const kind = i === N - 1 ? 'lounge' : ['cabinets', 'dance', 'racing', 'cabinets'][i % 4];
    if (kind === 'cabinets') {
      for (let k = 1; k < 4; k++)
        for (const s of [-0.95, 0, 0.95]) {
          const [lx, lz, nx, nz] = cabinet(b, th, k, s, fy);
          if (r() < 0.35) person(b, th, lx + nx * 0.3, fy, lz + nz * 0.3);
        }
    } else if (kind === 'dance') {
      const pad = canvasTex(128, 128, (c) => {
        for (let x = 0; x < 4; x++)
          for (let z = 0; z < 4; z++) {
            c.fillStyle = ['#ff2fb9', '#00eaff', '#a64dff', '#ffd36b'][(x + z * 3 + i) % 4];
            c.fillRect(x * 32 + 2, z * 32 + 2, 28, 28);
          }
      });
      const padMesh = new THREE.Mesh(unitPlane, lit(new THREE.MeshBasicMaterial({ map: pad }), 0.9, 1.1));
      const [px, pz] = loc(th, 0.4, 0.4);
      padMesh.position.set(px, fy + 0.012, pz);
      padMesh.rotation.set(-Math.PI / 2, 0, th);
      padMesh.scale.set(1.6, 1.6, 1);
      g.add(padMesh);
      person(b, th, 0.1, fy, 0.3);
      person(b, th, 0.75, fy, 0.65);
      for (const s of [-0.95, 0, 0.95]) cabinet(b, th, 1, s, fy);
      for (const s of [-0.95, 0.95]) cabinet(b, th, 2, s, fy);
    } else if (kind === 'racing') {
      for (let k = 0; k < 4; k++) {
        const s = -1.2 + k * 0.8;
        boxIn(b, th, 1.25, fy, s, 0.34, 0.22, 0.28, toon('#e23b3b'));
        boxIn(b, th, 1.1, fy + 0.22, s, 0.06, 0.28, 0.28, toon('#e23b3b'));
        planeIn(b, th, 1.62, fy + 0.42, s, 0.42, 0.24, screens[k % 4], Math.PI / 2);
        if (k % 2 === 0) person(b, th, 1.25, fy + 0.1, s);
      }
      for (const s of [-0.95, 0.95]) cabinet(b, th, 2, s, fy);
      for (const s of [-0.95, 0, 0.95]) cabinet(b, th, 3, s, fy);
    } else {
      for (const k of [1, 2, 3]) for (const s of [-0.9, 0.9]) boxIn(b, th, Math.sin((k * Math.PI) / 2) * 1.3 + Math.cos((k * Math.PI) / 2) * s, fy, Math.cos((k * Math.PI) / 2) * 1.3 - Math.sin((k * Math.PI) / 2) * s, 0.5, 0.2, 0.3, toon('#5a3a9a'), (k * Math.PI) / 2);
      person(b, th, 0.9, fy, 0.9);
      person(b, th, -0.9, fy, 1.0);
    }
  }
  // Roof deck and the hologram projector
  const thTop = rot(N);
  boxIn(b, thTop, 0, roofY, 0, HS * 2 + 0.2, 0.14, HS * 2 + 0.2, dark);
  cylAt(b, CX, roofY + 0.14, CZ, 0.75, 0.16, frame, 32);
  const projRing = new THREE.TorusGeometry(0.62, 0.05, 6, 40);
  projRing.rotateX(Math.PI / 2);
  projRing.translate(CX, roofY + 0.31, CZ);
  b.add(projRing, lit(new THREE.MeshBasicMaterial({ color: '#00eaff' }), 1, 1.4));
  b.build(g);
  const glassGroup = new THREE.Group();
  glassB.build(glassGroup, { cast: false, receive: false });
  g.add(fx(glassGroup));

  /* ----- The LED wall: one face of the tower, twisting with it, playing pixel shows ----- */
  {
    const H = wallFloors.length * 12;
    const tex = liveTex(WALL_W, H, () => {});
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    const c = (tex.image as HTMLCanvasElement).getContext('2d')!;
    const mat = lit(new THREE.MeshBasicMaterial({ map: tex }), 1, 1.1);
    // Every floor's panel in one mesh (one draw, one occluder), each with its band of the texture
    const panels = wallFloors.map((i, j) => {
      const geo = new THREE.PlaneGeometry(HS * 2, FH - 0.1);
      const uv = geo.attributes.uv as THREE.BufferAttribute;
      for (let v = 0; v < uv.count; v++) uv.setY(v, (j + uv.getY(v)) / wallFloors.length);
      const th = rot(i);
      const [x, z] = loc(th, 0, HS + 0.01);
      return geo.rotateY(th).translate(x, y0 + i * FH + 0.1 + (FH - 0.1) / 2, z);
    });
    const wall = new THREE.Mesh(mergeGeometries(panels, false)!, mat);
    // Meant to be seen from far away, and changing: never in the Emporium's far form (lod.ts)
    wall.userData.keep = true;
    for (const p of panels) p.dispose();
    occlude(wall, tex);
    g.add(fx(wall));
    let show = 0;
    let frameN = 0;
    let next = 0;
    let nextShow = 7;
    drawWall(c, H, SHOWS[0], 0, ctx.degen);
    tex.needsUpdate = true;
    ctx.tick(({ t }) => {
      if (t < next) return;
      next = t + 0.125;
      frameN++;
      if (t > nextShow) {
        nextShow = t + 7;
        show = (show + 1) % SHOWS.length;
        frameN = 0;
      }
      drawWall(c, H, SHOWS[show], frameN, ctx.degen);
      tex.needsUpdate = true;
    });
  }

  /* ----- Equalizer edges: the corners are four bars, the floor edges pulse up the tower ----- */
  {
    const segs: { kind: 'bar' | 'edge'; i: number; k: number }[] = [];
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const mats: THREE.Matrix4[] = [];
    for (let i = 0; i < N; i++) {
      const th = rot(i);
      const y = y0 + i * FH;
      for (let k = 0; k < 4; k++) {
        const cx = k === 0 || k === 3 ? -1 : 1;
        const cz = k < 2 ? -1 : 1;
        const [x, z] = loc(th, cx * (HS + 0.03), cz * (HS + 0.03));
        mats.push(m4.compose(V(x, y + 0.1 + (FH - 0.1) / 2, z), q.setFromEuler(e.set(0, th, 0)), V(0.07, FH - 0.2, 0.07)).clone());
        segs.push({ kind: 'bar', i, k });
        const phi = (k * Math.PI) / 2;
        const [ex, ez] = loc(th, Math.sin(phi) * (HS + 0.05), Math.cos(phi) * (HS + 0.05));
        mats.push(m4.compose(V(ex, y + 0.06, ez), q.setFromEuler(e.set(0, th + phi, 0)), V(HS * 2 + 0.05, 0.035, 0.035)).clone());
        segs.push({ kind: 'edge', i, k });
      }
    }
    const mesh = new THREE.InstancedMesh(unitBox, lit(new THREE.MeshBasicMaterial({ color: '#ffffff' }), 0.55, 1.15), segs.length);
    // (its colours pulse: it stays as it is far away too)
    mesh.userData.keep = true;
    mats.forEach((mm, j) => mesh.setMatrixAt(j, mm));
    const col = new THREE.Color();
    const pink = new THREE.Color('#ff2fb9');
    const violet = new THREE.Color('#8f3dff');
    const cyan = new THREE.Color('#00eaff');
    const white = new THREE.Color('#ffffff');
    const grad = (f: number) => (f < 0.5 ? col.copy(pink).lerp(violet, f * 2) : col.copy(violet).lerp(cyan, (f - 0.5) * 2));
    const paint = (t: number) => {
      const beat = Math.pow(1 - ((t * 2) % 1), 3);
      const level = [0, 1, 2, 3].map((k) => THREE.MathUtils.clamp(0.3 + 0.32 * Math.sin(t * (1.9 + k * 0.45) + k * 1.7) + 0.38 * beat * (k % 2 ? 0.8 : 1), 0.08, 1));
      segs.forEach((s, j) => {
        const f = s.i / (N - 1);
        if (s.kind === 'bar') {
          const top = Math.round(level[s.k] * (N - 1));
          if (s.i === top) col.copy(white);
          else grad(f).multiplyScalar(s.i < top ? 1 : 0.1);
        } else {
          const wave = Math.pow(Math.max(0, Math.sin(s.i * 0.7 - t * 5)), 4);
          grad(f).multiplyScalar(0.15 + 0.85 * Math.max(wave, beat * 0.5));
        }
        mesh.setColorAt(j, col);
      });
      mesh.instanceColor!.needsUpdate = true;
    };
    paint(0);
    g.add(fx(mesh));
    ctx.tick(({ t }) => paint(t));
  }

  /* ----- The hologram: a giant Degen dancing above the roof ----- */
  {
    const holoBase = roofY + 0.32;
    const hs = 2.7;
    const holo = createDegen(PLAYER);
    holo.g.scale.setScalar(hs);
    const mat = holoMaterial(holoBase, 1.25 * hs);
    holo.g.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const m = o as THREE.Mesh;
        m.material = mat;
        m.castShadow = false;
      }
    });
    holo.g.position.set(CX, holoBase, CZ);
    // The dance is the emotes' keyed clip (emotes.ts), fetched after the boot (it's walk mode's chunk, not the boot's):
    // the hologram stands until it's in
    let dance: ((p: typeof holo.pose, t: number) => void) | null = null;
    import('./emotes').then((m) => (dance = m.dancePose), () => {});
    g.add(fx(holo.g));
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.6, 3.6, 24, 1, true), lit(glowMat('#00eaff', 1, null), 0.03, 0.08));
    cone.position.set(CX, holoBase + 1.8, CZ);
    g.add(fx(cone));
    ctx.tick(({ t, night }) => {
      mat.uniforms.time.value = t;
      const glitch = Math.sin(t * 0.9) > 0.985 ? 1 : 0;
      mat.uniforms.power.value = (1.7 - night * 0.4) * (glitch ? 0.4 + Math.random() * 0.6 : 1);
      holo.g.rotation.y = t * 0.45;
      holo.g.position.x = CX + glitch * (Math.random() - 0.5) * 0.25;
      if (dance) dance(holo.pose, t);
      else idlePose(holo.pose, t);
      holo.update();
    });
  }

  /* ----- Street level outside: a glowing tile pad, claw machines, the prize booth, a queue ----- */
  {
    const COLS = 18;
    const ROWS = 12;
    const tex = liveTex(COLS * 8, ROWS * 8, () => {});
    tex.magFilter = THREE.NearestFilter;
    const c = (tex.image as HTMLCanvasElement).getContext('2d')!;
    const tiles = ['#ff2fb9', '#8f3dff', '#00eaff', '#ffd36b'];
    const drawPad = (t: number) => {
      c.fillStyle = '#0b0918';
      c.fillRect(0, 0, COLS * 8, ROWS * 8);
      for (let x = 0; x < COLS; x++)
        for (let y = 0; y < ROWS; y++) {
          const w = Math.sin(Math.hypot(x - COLS / 2, y - ROWS) * 0.7 - t * 3);
          c.globalAlpha = 0.18 + 0.82 * Math.max(0, w) ** 2;
          c.fillStyle = tiles[(x + y) % 4];
          c.fillRect(x * 8 + 1, y * 8 + 1, 6, 6);
        }
      c.globalAlpha = 1;
      tex.needsUpdate = true;
    };
    drawPad(0);
    const pad = new THREE.Mesh(unitPlane, lit(new THREE.MeshBasicMaterial({ map: tex }), 0.85, 1.05));
    const [px, pz] = at(1.35, 0);
    pad.position.set(px, S + 0.012, pz);
    pad.rotation.set(-Math.PI / 2, 0, D45);
    pad.scale.set(3.6, 2.4, 1);
    scene.add(fx(pad));
    let nextPad = 0;
    ctx.tick(({ t }) => {
      if (t < nextPad) return;
      nextPad = t + 0.1;
      drawPad(t);
    });

    const ob = new Batch();
    const obGlass = new Batch();
    for (const [u, col2] of [
      [-1.85, '#ff6ad5'],
      [1.85, '#00b8d8'],
    ] as const) {
      const [x, z] = at(0.55, u);
      ob.add(place(unitBox, x, S + 0.3, z, 0.55, 0.6, 0.55, 0, D45, 0), toon(col2));
      obGlass.add(place(unitBox, x, S + 0.92, z, 0.52, 0.62, 0.52, 0, D45, 0), glass);
      ob.add(place(unitBox, x, S + 1.29, z, 0.58, 0.12, 0.58, 0, D45, 0), screens[u < 0 ? 1 : 0]);
      for (let p = 0; p < 5; p++) {
        const ball = new THREE.SphereGeometry(0.07, 8, 6);
        ball.translate(x + (p % 3) * 0.13 - 0.13, S + 0.68, z + Math.floor(p / 3) * 0.14 - 0.07);
        ob.add(ball, toon(['#ffd36b', '#ff6ad5', '#7cff9e', '#00eaff', '#ffffff'][p]));
      }
      cylAt(ob, x, S + 1.0, z, 0.012, 0.22, toon('#e2b04a'), 6);
      ob.add(place(unitBox, x, S + 0.98, z, 0.12, 0.05, 0.12), toon('#e2b04a'));
    }
    // Prize booth on the east side
    ob.box(18.45, S, 14.2, 0.85, 0.95, 1.0, toon('#5a2a8a'));
    ob.box(18.4, S + 0.95, 14.15, 0.95, 0.08, 1.1, screens[3]);
    ob.box(18.45, S + 1.03, 14.2, 0.85, 0.42, 1.0, toon('#2a2448'));
    const prize = sign(signMat(neonSign('PRIZES', PAL.warm, { board: null }), 1, 1.4), 0.95, 0.24, 19.32, S + 1.24, 14.7, 'x');
    scene.add(prize);
    for (const [x, z] of [
      [19.0, 12.4],
      [12.4, 19.0],
    ]) {
      cylAt(ob, x, S, z, 0.42, 0.36, dark, 16);
      cylAt(ob, x, S + 0.34, z, 0.45, 0.05, roofEdge, 16);
      addTree(x, z, 0.85, false, S + 0.36);
    }
    ob.build(scene);
    const og = new THREE.Group();
    obGlass.build(og, { cast: false, receive: false });
    scene.add(fx(og));
  }

  // A queue along the front, people at the claw machines, someone at the booth
  for (const x of [15.6, 15.05, 14.5, 13.95, 13.4]) crowd.push({ x, z: 18.42, ry: Math.PI / 2, act: 'queue' });
  crowd.push({ x: 19.0, z: 16.6, ry: -2.62 }, { x: 19.5, z: 14.7, ry: -Math.PI / 2 }, { x: 18.75, z: 18.2, ry: -2.17 });
  addLamp(11.6, 11.6, Math.PI / 4);
  addLamp(19.5, 11.6, Math.PI * 0.75);
  addLamp(11.6, 19.5, -Math.PI / 4);
  return sp;
}

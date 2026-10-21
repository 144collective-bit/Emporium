/*
 * The street races' start line on the south bank avenue (races.ts holds the
 * rules; race-ui.ts the menu and the HUD): a gantry cantilevered over the
 * avenue from one post on South 4's sidewalk, a START / FINISH banner hanging
 * from its arm with a row of bulbs under it and a neon SECTOR 7 RACES
 * cut-out on top, a chequered line painted across both carriageways, and the
 * race board beside the post where you pick a race (a ring on the ground
 * marks where to stand).
 *
 * The checkpoint markers are here too: a tall column of light and a ring on
 * the road for the next checkpoint (cyan), a fainter one for the one after
 * (pink), in the style of the contracts' beacons (beacons.ts). They pulse
 * under the tick, never under reduced motion.
 *
 * Drawn in world numbers (RACE_SITE / START_LINE in races.ts; the footprints
 * are RACE_SOLIDS in solids.ts). Everything static goes through one Batch.
 */
import * as THREE from 'three';
import { Batch, FONT_DISPLAY, FONT_MONO, PAL, canvasTex, fx, glowMat, lit, neon, neonSign, occlude, place, plane, toon } from './kit';
import { EW_ROADS, MEDIAN } from './layout';
import { RACE_SITE, START_LINE } from './races';
import { SLAB as S, type Tick } from './world';

/** The gantry's post: a 0.4 square (RACE_SOLIDS matches) */
const POST = 0.4;
/** The arm's depth, and how far the banner hangs under it */
const ARM = 0.3;
/** Fixed copy only */
const BANNER_TOP = 'START / FINISH';
const BANNER_SUB = 'SECTOR 7 RACES';
const BOARD_TITLE = 'STREET RACES';
const BOARD_SUB = 'PICK A RACE · BEAT PAR';

/** The START / FINISH banner (a lit board; the same face hangs both ways) */
const bannerTex = () =>
  canvasTex(1024, 160, (c, w, h) => {
    c.fillStyle = '#0b0a18';
    c.fillRect(0, 0, w, h);
    // A chequered band top and bottom
    for (let x = 0; x < w; x += 20) {
      c.fillStyle = (x / 20) % 2 ? '#e8e6f0' : '#1a1830';
      c.fillRect(x, 0, 20, 12);
      c.fillStyle = (x / 20) % 2 ? '#1a1830' : '#e8e6f0';
      c.fillRect(x, h - 12, 20, 12);
    }
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `900 92px ${FONT_DISPLAY}`;
    (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '6px';
    c.shadowColor = PAL.cyan;
    c.shadowBlur = 24;
    c.fillStyle = PAL.cyan;
    c.fillText(BANNER_TOP, w / 2, 66);
    c.shadowBlur = 0;
    c.fillStyle = '#ffffff';
    c.globalAlpha = 0.7;
    c.fillText(BANNER_TOP, w / 2, 66);
    c.globalAlpha = 1;
    c.font = `700 26px ${FONT_MONO}`;
    (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '8px';
    c.fillStyle = PAL.pink;
    c.fillText(BANNER_SUB, w / 2, 126);
  });

/** The race board's face */
const boardTex = () =>
  canvasTex(512, 288, (c, w, h) => {
    c.fillStyle = '#0b0a18';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = PAL.cyan;
    c.lineWidth = 8;
    c.strokeRect(6, 6, w - 12, h - 12);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `900 84px ${FONT_DISPLAY}`;
    (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '4px';
    c.shadowColor = PAL.pink;
    c.shadowBlur = 22;
    c.fillStyle = PAL.pink;
    c.fillText(BOARD_TITLE, w / 2, 92);
    c.shadowBlur = 0;
    c.fillStyle = '#ffffff';
    c.globalAlpha = 0.65;
    c.fillText(BOARD_TITLE, w / 2, 92);
    c.globalAlpha = 1;
    c.font = `700 22px ${FONT_MONO}`;
    (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '5px';
    c.fillStyle = '#d9d4ef';
    c.fillText(BOARD_SUB, w / 2, 168);
    // Four lines for the four races
    c.fillStyle = '#ffffff22';
    for (let i = 0; i < 4; i++) c.fillRect(70, 200 + i * 20, w - 140, 6);
    c.fillStyle = PAL.cyan;
    c.fillRect(70, 200, 90, 6);
  });

/** Black and white squares for the line on the asphalt */
const chequerTex = () =>
  canvasTex(64, 256, (c, w, h) => {
    for (let y = 0; y < h; y += 32)
      for (let x = 0; x < w; x += 32) {
        c.fillStyle = ((x + y) / 32) % 2 ? '#1a1830' : '#e8e6f0';
        c.fillRect(x, y, 32, 32);
      }
  });

/** One checkpoint marker: a column of light and a ring on the road */
function marker(color: string, strength: number) {
  const g = new THREE.Group();
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 40, 16, 1, true), glowMat(color, 0.32 * strength, null));
  column.position.y = 20;
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 40, 8, 1, true), glowMat('#ffffff', 0.5 * strength, null));
  core.position.y = 20;
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.65, 2.05, 48), neon(color, 0.9 * strength, 2.4 * strength));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.045;
  g.add(column, core, ring);
  g.visible = false;
  return { g: fx(g), ring };
}

export function buildRaceSite(scene: THREE.Scene, tick: (f: Tick) => void, reduced: boolean) {
  const g = new THREE.Group();
  g.name = 'racesite';
  scene.add(g);
  const b = new Batch();
  const steel = toon('#2b2a40');
  const dark = toon('#0b0a18');
  const trim = toon('#1b1830');

  const G = RACE_SITE.gantry;
  const x = G.x;
  const top = S + G.h;

  // The post on the sidewalk, on a base plate, with a cap
  b.box(x - POST / 2 - 0.1, S, G.post - POST / 2 - 0.1, POST + 0.2, 0.12, POST + 0.2, trim);
  b.box(x - POST / 2, S, G.post - POST / 2, POST, G.h + 0.45, POST, steel);
  b.box(x - POST / 2 - 0.05, top + 0.45, G.post - POST / 2 - 0.05, POST + 0.1, 0.08, POST + 0.1, trim);
  // The arm out over the avenue: a truss (top chord, lower chord, ties) ending in a cap at the far end
  b.box(x - 0.14, top - ARM, G.reach, 0.28, ARM, G.post - G.reach, steel);
  const lower = top - ARM - 0.55;
  b.box(x - 0.07, lower, G.reach + 0.5, 0.14, 0.12, G.post - G.reach - 0.5, steel);
  for (let z = G.reach + 0.7; z < G.post - 0.3; z += 1.2) b.box(x - 0.05, lower + 0.12, z - 0.05, 0.1, ARM + 0.43, 0.1, steel);
  b.box(x - 0.2, top - ARM - 0.7, G.reach - 0.02, 0.4, ARM + 0.7, 0.14, trim);
  // A brace from the post up to the arm
  b.add(place(new THREE.BoxGeometry(0.1, 2.6, 0.1), x, top - 1.1, G.post - POST / 2 - 0.92, 1, 1, 1, -Math.PI / 4), steel);
  // A neon strip along the arm's underside, and a row of bulbs
  b.add(new THREE.BoxGeometry(0.04, 0.04, G.post - G.reach - 0.3).translate(x, top - ARM - 0.02, (G.post + G.reach) / 2), neon(PAL.cyan, 0.8, 2.6));
  const bulb = new THREE.SphereGeometry(0.06, 8, 6);
  const warm = neon(PAL.warm, 0.5, 2.6);
  for (let k = 0; k < 9; k++) b.add(bulb.clone().translate(x, top - ARM - 0.1, G.reach + 0.6 + k * 0.85), warm);

  // The banner, hung from the lower chord over the middle of the avenue, readable both ways
  const bz = START_LINE.z;
  const btex = bannerTex();
  const bmat = lit(new THREE.MeshBasicMaterial({ map: btex }), 0.9, 1.7);
  const BW = 5.6;
  const BH = 0.88;
  const by = lower - 0.08 - BH / 2;
  for (const [dx, ry] of [
    [0.03, Math.PI / 2],
    [-0.03, -Math.PI / 2],
  ]) {
    const p = plane(BW, BH, bmat);
    p.position.set(x + dx, by, bz);
    p.rotation.y = ry;
    g.add(fx(p));
  }
  b.box(x - 0.05, by + BH / 2 - 0.02, bz - BW / 2, 0.1, 0.1, BW, trim);
  for (const z of [bz - BW / 2 + 0.3, bz + BW / 2 - 0.3]) b.box(x - 0.02, by + BH / 2, z - 0.02, 0.04, lower - by - BH / 2, 0.04, steel);

  // SECTOR 7 RACES: a neon cut-out standing on the arm (a stand-in keeps the outlines behind it off it)
  const ntex = neonSign(BANNER_SUB, PAL.pink, { board: null, w: 2048, h: 256, size: 170, tracking: 14 });
  const nmat = lit(new THREE.MeshBasicMaterial({ map: ntex, transparent: true, depthWrite: false }), 1, 2.2);
  for (const [dx, ry] of [
    [0.02, Math.PI / 2],
    [-0.02, -Math.PI / 2],
  ]) {
    const p = plane(4.8, 0.6, nmat);
    p.position.set(x + dx, top + 0.32, bz);
    p.rotation.y = ry;
    occlude(p, ntex);
    g.add(fx(p));
  }

  // The chequered line on the asphalt, one strip per carriageway (the median is raised)
  const road = EW_ROADS.find((r) => r.c === START_LINE.z)!;
  const cmat = lit(new THREE.MeshBasicMaterial({ map: chequerTex() }), 0.85, 0.75);
  const half = road.half - MEDIAN / 2;
  for (const side of [-1, 1]) {
    const cz = START_LINE.z + side * (MEDIAN / 2 + half / 2);
    b.add(place(new THREE.PlaneGeometry(1.0, half), START_LINE.x, 0.045, cz, 1, 1, 1, -Math.PI / 2), cmat);
  }

  // The race board beside the post, facing the road, a hood with a light over it
  const B = RACE_SITE.board;
  for (const px of [B.x - 0.48, B.x + 0.48]) b.box(px - 0.04, S, B.z - 0.04, 0.08, 1.6, 0.08, steel);
  b.box(B.x - 0.55, S + 0.9, B.z - 0.06, 1.1, 0.66, 0.12, dark);
  b.box(B.x - 0.6, S + 1.56, B.z - 0.2, 1.2, 0.05, 0.3, trim);
  b.add(new THREE.BoxGeometry(0.5, 0.03, 0.03).translate(B.x, S + 1.54, B.z - 0.15), warm);
  const face = plane(1.02, 0.58, lit(new THREE.MeshBasicMaterial({ map: boardTex() }), 0.9, 1.6));
  face.position.set(B.x, S + 1.23, B.z - 0.065);
  face.rotation.y = Math.PI;
  g.add(fx(face));
  // Where you stand to read it
  const spot = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 32), neon(PAL.cyan, 0.6, 2.2));
  spot.rotation.x = -Math.PI / 2;
  spot.position.set(RACE_SITE.spot.x, S + 0.012, RACE_SITE.spot.z);
  g.add(fx(spot));
  b.build(g);

  // The checkpoint markers
  const next = marker(PAL.cyan, 1);
  const after = marker(PAL.pink, 0.5);
  scene.add(next.g, after.g);
  tick((env) => {
    if (reduced) return;
    next.ring.scale.setScalar(1 + Math.sin(env.t * 3) * 0.08);
    after.ring.scale.setScalar(1 + Math.sin(env.t * 3 + 1) * 0.05);
  });

  return {
    /** Light the next checkpoint and the one after it (null hides a marker) */
    show(nextAt: { x: number; z: number } | null, afterAt: { x: number; z: number } | null) {
      for (const [m, p] of [
        [next, nextAt],
        [after, afterAt],
      ] as const) {
        m.g.visible = !!p;
        if (p) m.g.position.set(p.x, 0, p.z);
      }
    },
  };
}

export type RaceSite = ReturnType<typeof buildRaceSite>;

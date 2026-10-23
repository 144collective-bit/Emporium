/*
 * The Trenches' wear, as textures (the grit step): two atlases laid on as
 * flat planes a hair off whatever they're on, each a draw for all of them.
 *
 * - **Tags** (`TAGS`): spray-painted names, made up (never a real crew,
 *   brand or person), in a few styles: bubble letters with an outline and
 *   drips, quick chrome, a plain scrawl. Cut out (alpha test) so the wall
 *   shows round them.
 * - **Posters** (`POSTERS`): wheatpasted bills for things on the block
 *   (made-up events, nothing to buy), some torn, some pasted over.
 *
 * Plus the chain-link's diamond mesh (`CHAIN`), see-through, drawn in the
 * FX layer so the ink outlines don't draw its quads (`buildFx()`).
 */
import * as THREE from 'three';
import { Batch, canvasTex, FONT_DISPLAY, fx, lit, rng, siteMat } from './kit';

export type Pt = [number, number];

/** The made-up names on the walls */
export const TAG_WORDS = ['KAZE', 'DRO', 'ZEPH', 'MOOK', 'REKS', 'NOVA', 'OMNI', 'S7', 'BLITZ', 'TOKO', 'VEX', 'GLO'];
/** The bills: made-up things going on round here */
export const POSTER_TEXT: [string, string][] = [
  ['BLOCK PARTY', 'SATURDAY'],
  ['HOOPS', 'COURT 3 · 3PM'],
  ['DJ NIGHT', 'THE REC'],
  ['LOST CAT', 'ANSWERS TO MILO'],
  ['FRESH CUTS', 'WALK-INS'],
  ['OPEN MIC', 'THURSDAYS'],
];

const TAG_COLORS = [
  ['#e219e5', '#ffd23f'],
  ['#00eaff', '#f3f2f7'],
  ['#2bff88', '#1b1830'],
  ['#ff6a2f', '#ffd23f'],
  ['#f3f2f7', '#e23b3b'],
  ['#8f7bff', '#00eaff'],
];

/** One row a tag, 512 x 160, on a clear ground */
export const TAGS = (() => {
  const W = 512;
  const H = 160;
  const rows = TAG_WORDS.length;
  const r = rng(404);
  const tex = canvasTex(W, H * rows, (c) => {
    c.clearRect(0, 0, W, H * rows);
    TAG_WORDS.forEach((word, i) => {
      const y = i * H;
      const [fill, line] = TAG_COLORS[i % TAG_COLORS.length];
      const style = i % 3;
      c.save();
      c.beginPath();
      c.rect(0, y, W, H);
      c.clip();
      c.translate(W / 2, y + H / 2 + 6);
      c.rotate((r() - 0.5) * 0.18);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.lineJoin = 'round';
      const size = Math.min(120, (120 * 420) / Math.max(1, word.length * 70));
      c.font = `900 ${size}px ${FONT_DISPLAY}`;
      if (style === 0) {
        // Bubble letters: a thick dark outline, the fill, a highlight, drips
        c.lineWidth = 22;
        c.strokeStyle = '#141226';
        c.strokeText(word, 0, 0);
        c.lineWidth = 9;
        c.strokeStyle = line;
        c.strokeText(word, 0, 0);
        c.fillStyle = fill;
        c.fillText(word, 0, 0);
        c.fillStyle = fill;
        for (let k = 0; k < 6; k++) c.fillRect(-150 + r() * 300, size * 0.3, 4, 10 + r() * 34);
      } else if (style === 1) {
        // Chrome: silver fill, a black line
        c.lineWidth = 12;
        c.strokeStyle = '#141226';
        c.strokeText(word, 0, 0);
        const g = c.createLinearGradient(0, -size / 2, 0, size / 2);
        g.addColorStop(0, '#f3f2f7');
        g.addColorStop(0.5, '#9a96b4');
        g.addColorStop(1, '#f3f2f7');
        c.fillStyle = g;
        c.fillText(word, 0, 0);
      } else {
        // A quick scrawl: one colour, slanted, an underline
        c.transform(1, 0, -0.35, 1, 0, 0);
        c.font = `700 ${size * 0.8}px ${FONT_DISPLAY}`;
        c.lineWidth = 7;
        c.strokeStyle = fill;
        c.strokeText(word, 0, 0);
        c.fillRect(-140, size * 0.35, 280, 6);
      }
      c.restore();
    });
  });
  const mat = siteMat('tags', lit(new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.35, side: THREE.FrontSide, depthWrite: true, toneMapped: true }), 0.85, 0.45));
  return { mat, rows };
})();

/** One row a bill, 256 x 352, on a clear ground (a torn edge on some) */
export const POSTERS = (() => {
  const W = 256;
  const H = 352;
  const rows = POSTER_TEXT.length;
  const r = rng(808);
  const papers = ['#f3e9d2', '#ffd23f', '#ff8ac2', '#9fe8ff', '#f3f2f7', '#c9f27a'];
  const tex = canvasTex(W, H * rows, (c) => {
    c.clearRect(0, 0, W, H * rows);
    POSTER_TEXT.forEach(([big, small], i) => {
      const y = i * H;
      c.save();
      // The paper, its bottom torn on some
      c.beginPath();
      c.moveTo(6, y + 6);
      c.lineTo(W - 6, y + 6);
      if (i % 2) for (let x = W - 6; x >= 6; x -= 16) c.lineTo(x, y + H - 40 - r() * 50);
      else {
        c.lineTo(W - 6, y + H - 6);
        c.lineTo(6, y + H - 6);
      }
      c.closePath();
      c.fillStyle = papers[i % papers.length];
      c.fill();
      c.clip();
      // Big type, a block of colour, small type
      c.fillStyle = '#141226';
      c.fillRect(6, y + 120, W - 12, 90);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `900 ${Math.min(64, (64 * 220) / (big.length * 34))}px ${FONT_DISPLAY}`;
      c.fillStyle = '#141226';
      c.fillText(big, W / 2, y + 64);
      c.font = `800 26px ${FONT_DISPLAY}`;
      c.fillStyle = papers[(i + 3) % papers.length];
      c.fillText(small, W / 2, y + 165);
      // Weathering: a few dark streaks
      c.fillStyle = 'rgba(20,18,38,0.18)';
      for (let k = 0; k < 5; k++) c.fillRect(r() * W, y, 2 + r() * 5, H);
      c.restore();
    });
  });
  const mat = siteMat('posters', lit(new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.3, depthWrite: true, toneMapped: true }), 0.8, 0.4));
  return { mat, rows };
})();

/** A plane facing `n` (x, z), w by h, its middle at (x, y, z), showing row `row` of an atlas of `rows`; `tilt` leans its top back (on a slope) */
export function atlasQuad(row: number, rows: number, w: number, h: number, n: Pt, x: number, y: number, z: number, tilt = 0) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const v0 = 1 - (row + 1) / rows;
  const v1 = 1 - row / rows;
  for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) > 0.5 ? v1 - 0.002 : v0 + 0.002);
  if (tilt) g.rotateX(-tilt);
  g.rotateY(Math.atan2(n[0], n[1]));
  return g.translate(x, y, z);
}
/** A tag on a face looking along n, its middle at (x, y, z) (pass it a hair off the face) */
export const tag = (b: Batch, i: number, w: number, n: Pt, x: number, y: number, z: number, tilt = 0) => b.add(atlasQuad(((i % TAGS.rows) + TAGS.rows) % TAGS.rows, TAGS.rows, w, w * 0.3125, n, x, y, z, tilt), TAGS.mat);
/** A poster, 0.55 by 0.75 (scaled by s) */
export const poster = (b: Batch, i: number, s: number, n: Pt, x: number, y: number, z: number) => b.add(atlasQuad(((i % POSTERS.rows) + POSTERS.rows) % POSTERS.rows, POSTERS.rows, 0.55 * s, 0.756 * s, n, x, y, z), POSTERS.mat);

/** The chain-link's diamond mesh (galvanised wire) */
const meshTex = canvasTex(64, 64, (c) => {
  c.clearRect(0, 0, 64, 64);
  c.strokeStyle = 'rgba(255,255,255,0.95)';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(64, 64);
  c.moveTo(64, 0);
  c.lineTo(0, 64);
  c.stroke();
});
meshTex.wrapS = meshTex.wrapT = THREE.RepeatWrapping;
export const CHAIN = siteMat('chain', lit(new THREE.MeshBasicMaterial({ color: '#aeb2c6', map: meshTex, transparent: true, alphaTest: 0.2, side: THREE.DoubleSide, depthWrite: false }), 0.8, 0.32));
/** The chain-link's mesh from a to c (a straight run), from y0 up h, into a Batch for the FX layer */
export function chainMesh(b: Batch, a: Pt, c: Pt, y0: number, h: number) {
  const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
  if (len < 0.05) return;
  const g = new THREE.PlaneGeometry(len, h);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len * 3, uv.getY(i) * h * 3);
  g.rotateY(-Math.atan2(c[1] - a[1], c[0] - a[0]));
  b.add(g.translate((a[0] + c[0]) / 2, y0 + h / 2, (a[1] + c[1]) / 2), CHAIN);
}
/** Build a Batch's meshes into `into` in the FX layer (see-through things the ink pass mustn't draw) */
export function buildFx(b: Batch, into: THREE.Object3D) {
  const g = new THREE.Group();
  b.build(g, { cast: false, receive: false });
  fx(g);
  for (const c of [...g.children]) into.add(c);
}

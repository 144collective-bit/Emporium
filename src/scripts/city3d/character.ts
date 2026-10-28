/*
 * Degen, built once and dressed many ways.
 *
 * One body after the brand art (balaclava with the eye opening, red cap with
 * the diamond patch, green shades on a gold chain, collar, tie and a lapelled
 * suit) with knees and elbows, so walks and runs can bend. Outfits swap the
 * clothes on that body: suits, hoodies and joggers, soldier fatigues, and
 * Drop 001's premium wardrobe (the varsity and puffer jackets, the cowboy hat,
 * top hat and neon halo, the duffel bag and neon wings, the phone, the
 * briefcase and the gold watch). Neon pieces (the halo, the wings' edges, the
 * phone's screen) glow through `neon()` in kit.ts, kept dim enough by day
 * not to bloom.
 *
 * Two ways to build it:
 * - createDegen(): one figure, the skinned body on real bones
 *   (skeleton.ts: a spine, neck, collarbones, ankles, toes and fingers),
 *   with the brand-art head and hands with fingers (body.ts), everything
 *   worn weighted to the bones so knees, elbows, shoulders, waist and neck
 *   bend without seams (you, other players, the fitting room, drivers,
 *   fighters and the rooftop hologram). Hands carry sockets for things held.
 * - createCrowd(): many figures as instanced rigid parts on the simple rig,
 *   a draw call per part whatever the head count (pedestrians, soldiers;
 *   they move to the skinned body in the character plan's Phase 5).
 * Both are posed with the same Pose, from the pose helpers below.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rifleGeometry } from './guns';
import { MARK_IDS, type MarkId, type PatternId } from '../net/profile-data';
import { ATLAS_COLS, ATLAS_ROWS, MARK_ART } from './marks';
import { lit, liveTex, moving, neon, toon } from './kit';
import { crowdFrame, type CrowdClip } from './crowdclips';
import { WARDROBE_W, addWardrobe, crowdDepth, crowdTexture, crowdVersion } from './crowdskin';
import { makeSkeleton, newPose, poseSkeleton, BONE_INDEX, type BoneName, type Joint, type Pose, type Skeleton } from './skeleton';
import { COLOR_KEYS, PLAYER, items as wardrobe, paintMerge, restSkin, type ColorKey, type Detail, type Item, type LogoOf, type Mat, type Outfit, type Piece } from './wardrobe';

export { PLAYER, SOLDIER, lookOutfit, type Detail, type Outfit, type OutfitKind } from './wardrobe';
export { ARM_REACH, HIP_HEIGHT, newPose, reachArm, shoulderTo, torsoFrame, type Limb, type Pose, type Wrist } from './skeleton';

/* ---------- Poses (poses.ts) ---------- */

export { walkPose, idlePose, lookPose, chatPose, sitPose, airPose, marchPose, attentionPose } from './poses';


const tmp = new THREE.Color();
/** A piece's colour on an outfit */
function colorOf(p: Piece, o: Outfit, out = new THREE.Color()) {
  if (p.color.startsWith('#')) return out.set(p.color);
  out.set(outfitColor(o, p.color as ColorKey));
  return p.shade ? out.multiplyScalar(p.shade) : out;
}
/** An outfit's colour for a key (the lenses are green as in the art when an outfit doesn't say) */
const outfitColor = (o: Outfit, k: ColorKey) => (o[k] as string | undefined) ?? (k === 'lens' ? '#22d07a' : k === 'ink' ? '#16c7b5' : '#ff00ff');

/* ---------- The wardrobe, with the soldiers' rifle (guns.ts draws it, so it's added here) ---------- */

const texCache: { patch?: THREE.Texture } = {};
const withRifle: Partial<Record<string, Item[]>> = {};
/** Everything he can wear at a detail level (wardrobe.ts), and the rifle a soldier carries on parade */
function items(q: Detail, hero = false): Item[] {
  const key = `${q}${hero ? 'h' : ''}`;
  if (withRifle[key]) return withRifle[key]!;
  // The same assault rifle the player carries, held upright on parade
  const rifle = rifleGeometry()
    .rotateX(-Math.PI / 2)
    .translate(0, 0, 0.03);
  const carried = (s: 'left' | 'right'): Item => ({
    id: s === 'left' ? 'rifleL' : 'rifleR',
    when: (o) => o.rifle === s,
    pieces: [{ joint: s === 'left' ? 'handL' : 'handR', geo: rifle, color: '#2b2a33' }],
  });
  return (withRifle[key] = [...wardrobe(q, hero), carried('left'), carried('right')]);
}

/* ---------- Materials ---------- */

let plainMat: THREE.Material | null = null;
let doubleMat: THREE.Material | null = null;
let neonMat: THREE.MeshBasicMaterial | null = null;
let logoMat: THREE.Material | null = null;
let atlas: THREE.Texture | null = null;
/**
 * The marks (marks.ts) in one atlas, white on clear, their dark parts and
 * outlines near black: the ink colours them per vertex, so one texture
 * prints every mark in every colourway.
 */
function logoAtlas() {
  const S = 128;
  return (atlas ??= liveTex(S * ATLAS_COLS, S * ATLAS_ROWS, (c) => {
    MARK_IDS.forEach((id, i) => {
      const art = MARK_ART[id];
      c.save();
      c.translate((i % ATLAS_COLS) * S + 12, Math.floor(i / ATLAS_COLS) * S + 12);
      c.scale((S - 24) / 100, (S - 24) / 100);
      c.lineJoin = c.lineCap = 'round';
      const DARK = '#2a2830';
      if (art.stroke) {
        const path = new Path2D(art.stroke);
        c.strokeStyle = DARK;
        c.lineWidth = (art.width ?? 8) + 8;
        c.stroke(path);
        c.strokeStyle = '#ffffff';
        c.lineWidth = art.width ?? 8;
        c.stroke(path);
      }
      if (art.fill) {
        const path = new Path2D(art.fill);
        c.fillStyle = '#ffffff';
        c.fill(path);
        c.strokeStyle = DARK;
        c.lineWidth = 6;
        c.stroke(path);
      }
      if (art.dark) {
        c.fillStyle = DARK;
        c.fill(new Path2D(art.dark));
      }
      if (art.line) {
        c.strokeStyle = DARK;
        c.lineWidth = 5;
        c.stroke(new Path2D(art.line));
      }
      c.restore();
    });
  }));
}
/** The all-over prints as tiling masks (white the cloth's colour, black its second tone) */
const printTex: Partial<Record<PatternId, THREE.Texture>> = {};
function printMask(id: PatternId) {
  if (printTex[id]) return printTex[id]!;
  const t = liveTex(64, 64, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 64, 64);
    c.fillStyle = '#000000';
    if (id === 'stripes') c.fillRect(0, 32, 64, 32);
    else if (id === 'checks') {
      c.fillRect(0, 0, 32, 32);
      c.fillRect(32, 32, 32, 32);
    } else if (id === 'camo') {
      // Blobs in two tones, drawn round the edges too so it tiles
      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (const tone of ['#7a7a7a', '#000000'])
        for (let k = 0; k < 7; k++) {
          const x = rnd() * 64;
          const y = rnd() * 64;
          const rx = 6 + rnd() * 9;
          const ry = 4 + rnd() * 6;
          const a = rnd() * Math.PI;
          c.fillStyle = tone;
          for (const dx of [-64, 0, 64])
            for (const dy of [-64, 0, 64]) {
              c.beginPath();
              c.ellipse(x + dx, y + dy, rx, ry, a, 0, Math.PI * 2);
              c.fill();
            }
        }
    }
  });
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return (printTex[id] = t);
}
/**
 * The top's cloth with an all-over print: coloured per vertex like the rest,
 * the print laid on where the cloth is at rest (`rest`, `restNormal`) from
 * three sides at once, so it never smears however the body bends. Its
 * second tone is the cloth's colour darkened (or, on a near-black top,
 * lightened). The fade runs dark at the hem to the colour at the shoulders.
 */
const printMats: Partial<Record<PatternId, THREE.Material>> = {};
function patternMaterial(id: PatternId) {
  if (printMats[id]) return printMats[id]!;
  const m = new THREE.MeshToonMaterial({ color: '#ffffff', vertexColors: true });
  const tile = id === 'camo' ? 0.16 : id === 'checks' ? 0.07 : 0.06;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.printMap = { value: printMask(id === 'fade' ? 'plain' : id) };
    sh.vertexShader = 'attribute vec3 rest;\nattribute vec3 restNormal;\nvarying vec3 vRest;\nvarying vec3 vRestN;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = rest;\nvRestN = restNormal;');
    const body =
      id === 'fade'
        ? 'float printT = smoothstep(0.5, 1.02, vRest.y);'
        : `vec3 pw = pow(abs(normalize(vRestN)), vec3(4.0)); pw /= (pw.x + pw.y + pw.z);
      vec3 pp = vRest / ${tile.toFixed(3)};
      float printT = texture2D(printMap, pp.zy).r * pw.x + texture2D(printMap, pp.xz).r * pw.y + texture2D(printMap, pp.xy).r * pw.z;`;
    sh.fragmentShader =
      'uniform sampler2D printMap;\nvarying vec3 vRest;\nvarying vec3 vRestN;\n' +
      sh.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
      ${body}
      float printL = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
      vec3 printB = printL < 0.03 ? diffuseColor.rgb * 0.5 + vec3(0.11) : diffuseColor.rgb * 0.52;
      diffuseColor.rgb = mix(printB, diffuseColor.rgb, printT);`
      );
  };
  m.customProgramCacheKey = () => `print-${id}`;
  return (printMats[id] = m);
}
function textures() {
  texCache.patch ??= liveTex(128, 84, (c) => {
    c.fillStyle = '#dedce8';
    c.fillRect(0, 0, 128, 84);
    c.fillStyle = '#16c7b5';
    c.beginPath();
    c.moveTo(42, 22);
    c.lineTo(86, 22);
    c.lineTo(100, 36);
    c.lineTo(64, 72);
    c.lineTo(28, 36);
    c.closePath();
    c.fill();
    c.strokeStyle = '#0a5c56';
    c.lineWidth = 4;
    c.stroke();
    c.beginPath();
    c.moveTo(28, 36);
    c.lineTo(100, 36);
    c.moveTo(52, 22);
    c.lineTo(64, 72);
    c.lineTo(76, 22);
    c.stroke();
  });
  return texCache as Required<typeof texCache>;
}
/** The material for a piece: plain pieces are coloured per vertex (and per instance in a crowd) */
function material(m: Mat | undefined, o?: Outfit): THREE.Material {
  if (m === 'lens') {
    const c = new THREE.Color(o?.lens ?? '#22d07a');
    return lit(
      new THREE.MeshToonMaterial({
        color: c.clone().multiplyScalar(0.42),
        emissive: c,
      }),
      0.12,
      0.7
    );
  }
  if (m === 'patch') return new THREE.MeshToonMaterial({ map: textures().patch });
  // Every mark from one atlas, in the outfit's ink (per vertex); its cut-out edge from the alpha
  if (m === 'logo') return (logoMat ??= new THREE.MeshToonMaterial({ map: logoAtlas(), vertexColors: true, alphaTest: 0.5 }));
  if (m === 'double')
    return (doubleMat ??= toon('#ffffff', {
      side: THREE.DoubleSide,
      vertexColors: true,
    }));
  if (m === 'neon') {
    // One unlit glow for every neon piece, coloured per vertex: plain by day (under the bloom
    // threshold, so a halo never blooms out of control), brighter at night like the city's signs
    if (!neonMat) {
      neonMat = neon('#ffffff', 1, 1.8);
      neonMat.vertexColors = true;
    }
    return neonMat;
  }
  return (plainMat ??= toon('#ffffff', { vertexColors: true }));
}

/* ---------- One figure ---------- */

export interface Degen {
  g: THREE.Object3D;
  pose: Pose;
  /** Apply `pose` to the figure */
  update(): void;
  hands: [THREE.Object3D, THREE.Object3D];
  /** The torso frame on the chest, for things carried at the shoulder (the gun): `reachArm()`'s space */
  torso: THREE.Object3D;
  /** The bones, for the motion capture (animator.ts `applyTo()`, after `update()`) */
  rig: Skeleton;
  /** What he holds in his right hand, if anything (put away while he holds the rifle) */
  held?: THREE.Object3D;
  /** Free the figure's geometry and bones (when it's rebuilt or leaves) */
  dispose(): void;
}

/** Each hand's grip when the pose doesn't set one: relaxed, closed on what's held, or fists for fighting */
// (relaxed: the fingers curled a little, as a hand hangs, not held out straight)
const RELAXED = 0.3;
const HOLDING = 0.62;

/** A piece in the figure's own space, with each vertex's bones (`restSkin()`) and its colour */
function skinPiece(p: Piece, rest: THREE.Matrix4, color: THREE.Color) {
  const { geo: g, skin } = restSkin(p, rest);
  const n = skin.length;
  const idx = new Uint16Array(n * 4);
  const wt = new Float32Array(n * 4);
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const inf = skin[i];
    for (let k = 0; k < inf.length; k++) {
      idx[i * 4 + k] = BONE_INDEX[inf[k][0]];
      wt[i * 4 + k] = inf[k][1];
    }
    col[i * 3] = color.r;
    col[i * 3 + 1] = color.g;
    col[i * 3 + 2] = color.b;
  }
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wt, 4));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

/** The mark a logo piece prints for an outfit (null: none there) */
function markFor(of: LogoOf, o: Outfit): MarkId | null {
  if (of === 'top') return o.mark ?? null;
  if (of === 'hat') return o.hatMark ?? 'diamond';
  if (of === 'shoe') return o.shoeMark ?? null;
  return (o.markAt === 'chest' && o.mark) || 'diamond';
}
/** A copy of a mark's square with its uv pointed at the mark's cell in the logo atlas (a little in from the edges) */
function atlasUV(geo: THREE.BufferGeometry, id: MarkId) {
  const g = geo.clone();
  const i = Math.max(0, MARK_IDS.indexOf(id));
  const col = i % ATLAS_COLS;
  const row = Math.floor(i / ATLAS_COLS);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let k = 0; k < uv.count; k++) uv.setXY(k, (col + 0.03 + uv.getX(k) * 0.94) / ATLAS_COLS, 1 - (row + 1 - (0.03 + uv.getY(k) * 0.94)) / ATLAS_ROWS);
  return g;
}

/**
 * One figure: the skinned body (skeleton.ts) with everything it wears as
 * one mesh coloured per vertex, plus one each for the lenses, the cap
 * patch, the raised hood (both sides drawn) and any neon, so a figure is
 * about four draw calls whatever he wears. Things in the hand (a coffee, a
 * rifle) ride the hand bone unbent.
 */
/** A single figure's detail where its caller doesn't say: 2 on phones, 3 on desktops (the city sets it by its tier) */
let figure: Detail = 2;
export const figureDetail = (q: Detail) => void (figure = q);

export function createDegen(o: Outfit = PLAYER, q: Detail = figure): Degen {
  const sk = makeSkeleton();
  sk.root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(sk.list);
  const skinned = new Map<string, { mat?: Mat; list: THREE.BufferGeometry[] }>();
  const rigid = new Map<string, { joint: Joint; held: boolean; mat?: Mat; list: { geo: THREE.BufferGeometry; color: THREE.Color }[] }>();
  const print = o.pattern && o.pattern !== 'plain' ? o.pattern : null;
  for (const it of items(q, true)) {
    if (!it.when(o)) continue;
    for (const src of it.pieces) {
      let p = src;
      // A mark: pointed at its cell in the logo atlas (or left off when there's none)
      if (p.logo) {
        const id = markFor(p.logo, o);
        if (!id) continue;
        p = { ...p, geo: atlasUV(p.geo, id) };
      }
      const color = colorOf(p, o);
      // Held things and anything else on a hand without weights of its own stay solid on the hand
      if (it.held || ((p.joint === 'handL' || p.joint === 'handR') && !p.skin)) {
        const key = `${p.joint}|${it.held ? 1 : 0}|${p.mat ?? ''}`;
        if (!rigid.has(key)) rigid.set(key, { joint: p.joint, held: !!it.held, mat: p.mat, list: [] });
        rigid.get(key)!.list.push({ geo: p.geo, color });
        continue;
      }
      // The top's own cloth takes its all-over print, if it has one
      const mat: Mat | undefined = print && !p.mat && p.color === 'top' && !p.shade ? 'pattern' : p.mat;
      const key = mat ?? '';
      if (!skinned.has(key)) skinned.set(key, { mat, list: [] });
      const g = skinPiece(p, sk.j[p.joint].matrixWorld, color);
      if (p.logo) p.geo.dispose();
      // (the print is laid out on the cloth where it is at rest, so it moves with it)
      if (mat === 'pattern') {
        g.setAttribute('rest', g.attributes.position.clone());
        g.setAttribute('restNormal', g.attributes.normal.clone());
      }
      skinned.get(key)!.list.push(g);
    }
  }
  const bind = new THREE.Matrix4();
  for (const b of skinned.values()) {
    const geo = mergeGeometries(b.list)!;
    for (const g of b.list) g.dispose();
    const mesh = new THREE.SkinnedMesh(geo, b.mat === 'pattern' ? patternMaterial(print!) : material(b.mat, o));
    mesh.castShadow = true;
    // Its bounds move with the bones: never culled (a figure is small)
    mesh.frustumCulled = false;
    sk.root.add(mesh);
    mesh.bind(skeleton, bind);
  }
  let held: THREE.Group | undefined;
  for (const b of rigid.values()) {
    const mesh = new THREE.Mesh(paintMerge(b.list), material(b.mat, o));
    mesh.castShadow = true;
    if (b.held) {
      if (!held) sk.j[b.joint].add((held = new THREE.Group()));
      held.add(mesh);
    } else sk.j[b.joint].add(mesh);
  }
  const pose = newPose();
  const base = o.fists ? 1 : RELAXED;
  const grip: [number, number] = [base, base];
  const update = () => {
    if (pose.grip) {
      grip[0] = pose.grip[0];
      grip[1] = pose.grip[1];
      pose.grip = undefined;
    } else {
      grip[0] = base;
      grip[1] = held?.visible ? Math.max(base, HOLDING) : base;
    }
    poseSkeleton(sk, pose, grip);
  };
  update();
  // (it moves: the moving shadow map's, shadows.ts)
  moving(sk.root);
  return {
    g: sk.root,
    pose,
    update,
    hands: [sk.bones.handL, sk.bones.handR],
    torso: sk.torso,
    rig: sk,
    held,
    dispose() {
      sk.root.traverse((m) => (m as THREE.Mesh).geometry?.dispose());
      skeleton.dispose();
    },
  };
}

/* ---------- A crowd ---------- */

export interface Crowd {
  /**
   * Figure `i` standing at (x, y, z) facing `yaw` (0 = +z), `u` (0..1) of
   * the way through one of the baked clips (crowdclips.ts): `crowdFrame()`
   * picks the rows, the GPU does the rest
   */
  set(i: number, x: number, y: number, z: number, yaw: number, scale: number, clip: CrowdClip, u: number): void;
  /** Call once a frame after setting everyone */
  commit(): void;
  meshes: THREE.InstancedMesh[];
}

/**
 * Where the camera is and what it sees, for every crowd: the city sets it
 * each frame (`view()` in index.ts). Until it's set, everyone is near.
 */
export const CROWD_VIEW = {
  eye: new THREE.Vector3(),
  frustum: new THREE.Frustum(),
  on: false,
  /** The sun's shadow box this frame (`shadowOn` while shadows are drawn): moving things outside it stay out of the shadow map */
  shadow: new THREE.Frustum(),
  shadowOn: false,
  /** Where on the ground the camera is looking, about (the traffic and the boats stay round it: life.ts) */
  focus: new THREE.Vector3(),
};
/** People nearer the camera than this get the crowd's detail, the rest the far one (and past `CROWD_FAR` nobody is drawn) */
const CROWD_NEAR = 12;
const CROWD_NEAR_LIGHT = 8;
const CROWD_FAR = 170;

/** Each crowd part's skinned geometry at rest, shared between crowds (each mesh adds its own per-person rows) */
const crowdBase = new Map<string, THREE.BufferGeometry>();
/** The crowd's version of each material (skinned on the GPU) */
const crowdMats = new Map<string, THREE.Material>();
function crowdMaterial(m: Mat | undefined) {
  const key = m ?? '';
  let c = crowdMats.get(key);
  if (!c) {
    c = crowdVersion(material(m), key);
    // (the lenses and neon follow the time of day like everyone's)
    if (m === 'lens') lit(c, 0.12, 0.7);
    if (m === 'neon') lit(c, 1, 1.8);
    crowdMats.set(key, c);
  }
  return c;
}
/** The bone a rig frame hangs from (things held in a hand ride that hand's bone, unbent) */
function boneOf(o: THREE.Object3D | null): BoneName {
  while (o && !(o as THREE.Bone).isBone) o = o.parent;
  return (o?.name ?? 'hips') as BoneName;
}
/**
 * One crowd part (an item's pieces of one colour and material) skinned at
 * rest, its bones and weights renamed for the crowd's shader, coloured per
 * vertex (a fixed colour, or the shade a person's own colour is multiplied by)
 */
function crowdGeometry(list: Piece[], held: boolean, sk: Skeleton) {
  const fixed = list[0].color.startsWith('#');
  const parts = list.map((src) => {
    let p = src;
    if (p.logo) p = { ...p, geo: atlasUV(p.geo, 'diamond') };
    if (held || ((p.joint === 'handL' || p.joint === 'handR') && !p.skin)) p = { ...p, bone: boneOf(sk.j[p.joint]) };
    const g = skinPiece(p, sk.j[p.joint].matrixWorld, fixed ? new THREE.Color(p.color) : new THREE.Color().setScalar(p.shade ?? 1));
    if (src.logo) p.geo.dispose();
    const idx = g.attributes.skinIndex as THREE.BufferAttribute;
    g.setAttribute('crowdIdx', new THREE.Float32BufferAttribute(Float32Array.from(idx.array as Uint16Array), 4));
    g.setAttribute('crowdWt', g.attributes.skinWeight);
    g.setAttribute('crowdOn', new THREE.Float32BufferAttribute(new Float32Array(idx.count).fill(1), 1));
    g.deleteAttribute('skinIndex');
    g.deleteAttribute('skinWeight');
    return g;
  });
  const geo = mergeGeometries(parts)!;
  for (const g of parts) g.dispose();
  return geo;
}

interface Part {
  mesh: THREE.InstancedMesh;
  /** Each person's rows and blend, and their row in the wardrobe */
  anim: THREE.InstancedBufferAttribute;
  /**
   * Instances used so far this frame: from the front for people in the sun's shadow box (`n`), from the
   * back for the rest (`back`, moved up behind them at commit), so the shadow map draws only the front ones
   */
  n: number;
  back: number;
  cap: number;
  /** How many the camera's passes draw, and the shadow map */
  view: number;
  shadow: number;
}

/** Each item's column in the wardrobe (its texel's alpha: whether a person wears it), the same for every crowd */
const itemCols = new Map<string, number>();
function itemCol(id: string) {
  let c = itemCols.get(id);
  if (c === undefined) {
    c = itemCols.size;
    if (c >= WARDROBE_W) throw new Error('crowd wardrobe: more items than columns');
    itemCols.set(id, c);
  }
  return c;
}

/**
 * Many figures, each the skinned body (the new head, hands and shoes) at a
 * crowd's detail, drawn instanced and skinned on the GPU from the baked
 * clips (crowdclips.ts, crowdskin.ts), at two levels: near the camera the
 * crowd's own (`Detail` 1, without the small details on phones), further
 * away the far one (0). At each level everyone of one outfit kind (suits,
 * hoodies, soldiers...) shares one mesh per material: every item anyone of
 * that kind wears, each vertex knowing its item and the colour it takes;
 * a person's row in the wardrobe (crowdskin.ts) says what they wear and
 * their colours, and the rest folds away. So a crowd costs a draw call per
 * kind and material (a handful), each person one instance per mesh, and
 * the CPU only works out where each person is and which frame they're on.
 */
export function createCrowd(parent: THREE.Object3D, outfits: Outfit[], opts: { light?: boolean } = {}): Crowd {
  crowdTexture();
  const sk = makeSkeleton();
  sk.root.updateMatrixWorld(true);
  const near = opts.light ? CROWD_NEAR_LIGHT : CROWD_NEAR;
  const meshes: THREE.InstancedMesh[] = [];
  // Everyone's row: their colours, then which items they wear
  const rowOf = addWardrobe(
    outfits.map((o) => {
      const row = new Float32Array(WARDROBE_W * 4);
      COLOR_KEYS.forEach((k, c) => {
        tmp.set(outfitColor(o, k));
        row[c * 4] = tmp.r;
        row[c * 4 + 1] = tmp.g;
        row[c * 4 + 2] = tmp.b;
      });
      for (const q of [1, 0] as Detail[]) for (const it of items(q, true)) if (it.when(o)) row[itemCol(it.id) * 4 + 3] = 1;
      return row;
    })
  );
  const kinds = [...new Set(outfits.map((o) => o.kind))];
  const levels = ([1, 0] as Detail[]).map((q) => {
    const details = q === 1 && !opts.light;
    const parts: Part[] = [];
    const wear: Part[][] = outfits.map(() => []);
    for (const kind of kinds) {
      const who = outfits.flatMap((o, i) => (o.kind === kind ? [i] : []));
      // This kind's pieces by material: each item's pieces of one colour, with the colour they take and their item
      const byMat = new Map<string, { geos: THREE.BufferGeometry[]; wearers: Set<number> }>();
      for (const it of items(q, true)) {
        const wearers = who.filter((i) => it.when(outfits[i]));
        if (!wearers.length) continue;
        const sub = new Map<string, Piece[]>();
        for (const p of it.pieces) {
          if (!details && p.detail) continue;
          const k = `${p.color.startsWith('#') ? '#' : p.color}|${p.mat ?? ''}`;
          if (!sub.has(k)) sub.set(k, []);
          sub.get(k)!.push(p);
        }
        for (const [k, list] of sub) {
          const id = `${q}|${details}|${it.id}|${k}`;
          let base = crowdBase.get(id);
          if (!base) crowdBase.set(id, (base = crowdGeometry(list, !!it.held, sk)));
          const [key, mat] = k.split('|');
          const geo = new THREE.BufferGeometry();
          for (const [name, attr] of Object.entries(base.attributes)) geo.setAttribute(name, attr);
          // (the lenses keep their material's own colour, as fixed colours keep theirs)
          const colour = key === '#' || mat === 'lens' ? -1 : COLOR_KEYS.indexOf(key as ColorKey);
          const slot = new Float32Array(base.attributes.position.count * 2);
          for (let v = 0; v < slot.length; v += 2) {
            slot[v] = colour;
            slot[v + 1] = itemCol(it.id);
          }
          geo.setAttribute('crowdSlot', new THREE.Float32BufferAttribute(slot, 2));
          if (!byMat.has(mat)) byMat.set(mat, { geos: [], wearers: new Set() });
          const m = byMat.get(mat)!;
          m.geos.push(geo);
          wearers.forEach((i) => m.wearers.add(i));
        }
      }
      for (const [mat, { geos, wearers }] of byMat) {
        const geo = mergeGeometries(geos)!;
        for (const g of geos) g.dispose();
        const cap = wearers.size;
        const anim = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
        anim.setUsage(THREE.DynamicDrawUsage);
        geo.setAttribute('crowdAnim', anim);
        const m = new THREE.InstancedMesh(geo, crowdMaterial((mat || undefined) as Mat | undefined), cap);
        m.customDepthMaterial = crowdDepth();
        m.castShadow = true;
        m.frustumCulled = false;
        m.count = 0;
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        parent.add(m);
        meshes.push(m);
        const part: Part = { mesh: m, anim, n: 0, back: 0, cap, view: 0, shadow: 0 };
        // The shadow map draws only the people in the sun's shadow box (the front ones), the camera everyone in view
        m.onBeforeShadow = () => void (m.count = part.shadow);
        m.onBeforeRender = () => void (m.count = part.view);
        parts.push(part);
        for (const i of wearers) wear[i].push(part);
      }
    }
    return { parts, wear };
  });
  const at = new THREE.Vector3();
  const ball = new THREE.Sphere(at, 0);
  const m4 = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const frame: [number, number, number] = [0, 0, 0];
  return {
    meshes,
    set(i, x, y, z, yaw, scale, clip, u) {
      const o = outfits[i];
      // Which level, if any: out of view or very far, nothing is drawn
      let level = levels[0];
      let shadow = true;
      if (CROWD_VIEW.on) {
        at.set(x, y + 0.6 * scale, z).applyMatrix4(parent.matrixWorld);
        ball.radius = 1.6 * scale;
        const d = at.distanceTo(CROWD_VIEW.eye);
        if (d > CROWD_FAR || !CROWD_VIEW.frustum.intersectsSphere(ball)) return;
        if (d > near) level = levels[1];
        // Out of the sun's shadow box, they cast nothing it can see
        shadow = !CROWD_VIEW.shadowOn || CROWD_VIEW.shadow.intersectsSphere(ball);
      }
      m4.compose(pos.set(x, y, z), quat.setFromAxisAngle(UP, yaw), scl.set(scale * (o.build ?? 1), scale * (o.height ?? 1), scale * (o.build ?? 1)));
      crowdFrame(clip, u, frame);
      for (const g of level.wear[i]) {
        const k = shadow ? g.n++ : g.cap - 1 - g.back++;
        g.mesh.setMatrixAt(k, m4);
        g.anim.setXYZW(k, frame[0], frame[1], frame[2], rowOf + i);
      }
    },
    commit() {
      for (const l of levels)
        for (const g of l.parts) {
          const m = g.mesh;
          // The ones out of the shadow box, from the back up behind the rest (where the two ends meet, some already are)
          const gap = Math.min(g.n + g.back, g.cap - g.back);
          const from = Math.max(g.cap - g.back, g.n + g.back);
          for (let j = 0; j < gap - g.n; j++) moveInstance(g, from + j, g.n + j);
          g.shadow = g.n;
          g.view = m.count = g.n + g.back;
          m.visible = m.count > 0;
          m.instanceMatrix.needsUpdate = true;
          g.anim.needsUpdate = true;
          g.n = g.back = 0;
        }
    },
  };
}

/** One crowd instance from slot `from` to slot `to` (its matrix, and its rows and wardrobe row) */
function moveInstance(g: Part, from: number, to: number) {
  if (from === to) return;
  g.mesh.instanceMatrix.array.copyWithin(to * 16, from * 16, from * 16 + 16);
  g.anim.array.copyWithin(to * 4, from * 4, from * 4 + 4);
}

/* ---------- A varied city crowd ---------- */

/** Suits and hoodies in a spread of colours, some with bags or headphones. */
export function cityOutfit(r: () => number): Outfit {
  const pick = <T>(a: T[]) => a[Math.floor(r() * a.length)];
  const extras = {
    backpack: r() < 0.2 ? pick(['#14121f', '#2a2350', '#d8312f', '#1f9d6a', '#f3f2f7']) : undefined,
    crossbody: r() < 0.15 ? pick(['#14121f', '#8f3dff', '#c99a4a']) : undefined,
    headphones: r() < 0.22 ? pick(['#14121f', '#f3f2f7', '#ff6ad5', '#00b8d8']) : undefined,
    build: 0.92 + r() * 0.2,
    height: 0.95 + r() * 0.1,
  };
  if (r() < 0.55) {
    const top = pick(['#16141f', '#16141f', '#16141f', '#1d2550', '#3b2a6a', '#f3f2f7', '#4a4a5a']);
    return {
      kind: 'suit',
      top,
      bottom: top === '#f3f2f7' && r() < 0.5 ? '#16141f' : top,
      shoes: pick(['#1b1830', '#3a2418', '#16141f']),
      tie: pick(['#1f9d55', '#1f9d55', '#e219e5', '#00b8d8', '#d8312f', '#c99a4a']),
      cap: r() < 0.85 ? pick(['#d8312f', '#d8312f', '#d8312f', '#16141f', '#f3f2f7']) : undefined,
      chain: r() < 0.3,
      ...extras,
      backpack: undefined,
    };
  }
  const hood = r() < 0.4;
  return {
    kind: 'hoodie',
    top: pick(['#16141f', '#2a2350', '#e219e5', '#00a8d8', '#f3f2f7', '#ff6a3d', '#1f9d6a', '#8f3dff']),
    bottom: pick(['#3a3a48', '#16141f', '#4a4a5a']),
    shoes: pick(['#f3f2f7', '#f3f2f7', '#16141f', '#ff6ad5', '#00b8d8']),
    hood,
    cap: hood ? undefined : r() < 0.7 ? pick(['#d8312f', '#16141f', '#f3f2f7', '#d8312f']) : undefined,
    ...extras,
  };
}

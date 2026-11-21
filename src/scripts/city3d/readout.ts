/**
 * The `?fps` readout's text (performance.md): what the frame loop counted, the memory, the tiles, the boot's times,
 * the sites, the tier and where the camera is. A chunk of its own, loaded only with `?fps` and `?bench`
 * (it and the memory measures, `perf.ts`, kept out of the boot: docs/brutalist-plan.md).
 */
import * as THREE from 'three';
import { texSources } from './kit';
import { farLods, freedNear } from './lod';
import { mb, sceneMemory, targetMemory } from './perf';
import { texSourceLine } from './texsource';
import type { createDistricts } from './districts';
import type { createTileWork } from './tilework';
import type { tileBatch } from './tilebatch';
import type { createWalk } from './walk';

/** What the frame loop counted since the last line */
export interface Stat {
  frames: number;
  draws: number;
  tris: number;
  shadowDraws: number;
  shadowTris: number;
  worst: number;
  since: number;
  memAt: number;
  mem: string;
}
export interface ReadoutIn {
  stat: Stat;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  targets: (THREE.WebGLRenderTarget | null | undefined)[];
  aa: { msaa: number; smaa: boolean };
  tiled: ReturnType<typeof tileBatch>;
  works: ReturnType<typeof createTileWork>;
  districts: ReturnType<typeof createDistricts>;
  boot: { total: number; build: number; work: number; tiles: number; shaders: number };
  tier: string;
  why: string | undefined;
  lost: string[];
  gpu: string;
  walking: boolean;
  walk: ReturnType<typeof createWalk>;
}

const look = new THREE.Vector3();

/** The readout's lines at `now` (its memory line walked again every few seconds: it walks the whole scene) */
export function readout(i: ReadoutIn, now: number): string {
  const { stat, scene, camera, tiled, works, boot: b, walk } = i;
  const n = Math.max(1, stat.frames);
  if (now - stat.memAt > 5000) {
    const m = sceneMemory(scene);
    stat.mem = `geometry ${mb(m.geometry)} · textures ${mb(m.textures)} · targets ${mb(targetMemory(i.targets, scene))}${i.aa.msaa ? ` (MSAA ${i.aa.msaa}x)` : i.aa.smaa ? ' (SMAA)' : ''}`;
    stat.memAt = now;
  }
  const f = freedNear();
  const w = works.stats();
  const p = walk.position;
  return [
    `${Math.round((stat.frames * 1000) / (now - stat.since))} fps · slowest ${Math.round(stat.worst)} ms`,
    `${Math.round(stat.draws / n)} draws · ${(stat.tris / n / 1e6).toFixed(2)}M tris`,
    `of which shadows ${Math.round(stat.shadowDraws / n)} draws · ${(stat.shadowTris / n / 1e6).toFixed(2)}M tris`,
    stat.mem,
    `tiles ${tiled.drawn()} of ${tiled.pieces()} pieces drawn · ${tiled.nearTiles()} near · ${farLods()} far forms${f.places ? ` (${f.places} near forms freed, ${mb(f.bytes)})` : ''}`,
    `boot ${(b.total / 1000).toFixed(1)} s · build ${(b.build / 1000).toFixed(1)} (work ${(b.work / 1000).toFixed(2)}, tiles ${(b.tiles / 1000).toFixed(2)}) · shaders ${(b.shaders / 1000).toFixed(1)}`,
    `sites ${w.built} built: ${w.atBoot} at boot (${Math.round(w.bootMs)} ms), the rest after (${Math.round(w.laterMs)} ms here, ${w.offMain} of them off the main thread; slowest ${Math.round(w.slowest.ms)} ms: ${w.slowest.id}) · ${w.waiting} waiting · districts loaded: ${i.districts.loaded().join(', ') || 'none'}`,
    `near forms ${mb(w.held)} held of ${mb(w.budget)} · ${w.released} tiles let go · ${w.rebuilt} built again · past the haze ${w.gone} gone (${mb(w.goneBytes)} freed in all, ${w.returned} back)`,
    `${i.tier}${i.why ? ` (${i.why})` : ''} · px ${i.renderer.getPixelRatio().toFixed(2)}${i.lost.length ? ` · lowered: ${i.lost.join(', ')}` : ''} · ${i.gpu || 'graphics unnamed'}`,
    texSourceLine(texSources()),
    // Where Degen stands while walking (for placing things: ?spawn=x,z puts him back there), how high he and the camera
    // are, the camera's near plane and which way it looks (a black screen on foot reads here as under the ground, or
    // the near plane, or the view gone wrong); in City view, where the free camera is (freecam.ts)
    ...(i.walking
      ? [
          `at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}${p.y > 1 ? ` · up ${p.y.toFixed(1)}` : p.y < -0.5 ? ` · down ${(-p.y).toFixed(1)}` : ''} · motion capture ${walk.mocap}`,
          `height ${p.y.toFixed(2)} · camera ${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(1)} · near ${camera.near.toFixed(2)} · looks ${camera.getWorldDirection(look).y.toFixed(2)} · fog ${(scene.fog as THREE.FogExp2 | null)?.density?.toFixed(4) ?? '-'}`,
        ]
      : [`camera ${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)} · near ${camera.near.toFixed(2)}`]),
  ].join('\n');
}

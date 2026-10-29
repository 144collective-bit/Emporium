/*
 * Other players in multiplayer: each one a full Degen in their own outfit
 * and gun (with its finish), smoothed between the server's snapshots (drawn a little
 * in the past so there's always a snapshot either side), with walk, run,
 * jump, gun and emote poses, and a name tag with their rank badge that
 * shows emote and phrase bubbles.
 *
 * The animation revamp's Phase 5: once walk mode has the motion capture and
 * its animator (`Motion`, walk.ts's), each player near enough moves on an
 * animator of their own (animator.ts), fed from where they're drawn: their
 * own movement springs follow the velocity seen between frames and the
 * facing the server sends, as the stick drives the player's. The gun hold
 * and the emotes go on top as before (with a gun in hand the animator gives
 * only the legs and hips). Near players run it every frame, further ones at
 * `FAR_DT`, and past `ANIM_FAR` (or in the air, or emoting) the planted-feet
 * walk (locomotion.ts) carries on as before.
 *
 * In a vehicle (docs/multiplayer-plan.md, "What others see": their mode in
 * the snapshot's flags and what they're in, `PlayerInfo.veh`) they're drawn
 * in it (remoteveh.ts): their car, bike, kart, aircraft or the hire boat;
 * riding a taxi, the metro or the river bus they're out of sight (the ride
 * carries them). A jump between two snapshots (fast travel, the end of a ride
 * or a race: further than the way they're moving goes, `jumped()`) is drawn
 * as a jump, not a slide across the city.
 */
import * as THREE from 'three';
import { HOLDING, RELAXED, createDegen, lookOutfit, type Degen } from './character';
import { copyPose, createLocomotion, placeRoot, type Locomotion, type Root } from './locomotion';
import type { Animator } from './animator';
import type { MoData } from './mocap';
import { newMove, stepMove, type MoveState } from './movesim';
import { wrap } from './inertia';
import { buildGun, gunSpec, type Gun } from './guns';
import { holdGun, newStance, type Stance } from './stance';
import { WEAPONS } from './combat-sim';
import { EMOTES, PHRASES, RANKS } from '../net/profile-data';
import { FLAG, INTERP_DELAY, jumped as leapt, modeOf, sameVehicle, type PlayerInfo, type SnapRow } from '../net/protocol';
import { remoteVehicle, type RemoteVehicle } from './remoteveh';

/** Same size as the walker */
const SCALE = 0.85;
const TAG_RANGE = 30;
/** The motion capture and its animator module, once walk mode has them */
export interface Motion {
  anim: typeof import('./animator');
  data: MoData;
  /** The emotes (and the gaze and the vault, walk mode's), loaded with it */
  onFoot: typeof import('./onfoot');
}
/** Within this of the camera a player's animator runs every frame, to `ANIM_FAR` at `FAR_DT`, beyond it not at all */
const ANIM_NEAR = 25;
const ANIM_FAR = 70;
const FAR_DT = 1 / 30;
/** A move between frames further than this is a jump (a warp, a fast travel): the animator starts afresh */
const JUMP = 2;
const smooth = (x: number) => x * x * (3 - 2 * x);

interface Sample {
  t: number;
  x: number;
  y: number;
  z: number;
  face: number;
  pitch: number;
  speed: number;
  flags: number;
}

interface Remote {
  info: PlayerInfo;
  fig: Degen;
  pivot: THREE.Group;
  gun: Gun;
  /** How far they're turned side-on to hold their gun */
  stance: Stance;
  samples: Sample[];
  /** Last time this player was in a snapshot (local seconds) */
  seenAt: number;
  /** Their walk and run with planted feet, from where they're drawn each frame (and where that was last frame) */
  loco: Locomotion;
  last: { x: number; z: number } | null;
  aim: number;
  air: number;
  reload: number;
  /** 0 put away .. 1 in hand */
  draw: number;
  emote: { id: string; t: number } | null;
  /** Their animator on the motion capture, once it's in and they're near enough; how much of it shows, and how much the upper body is their own (the gun's) */
  anim: Animator | null;
  move: MoveState;
  mocapW: number;
  upperW: number;
  /** Time since their animator last stepped (far ones step less often) */
  animDt: number;
  root0: Root;
  tag: HTMLElement;
  bubble: HTMLElement;
  bubbleT: number;
  muted: boolean;
  /** What they're in, drawn (null on foot) */
  veh: RemoteVehicle | null;
}

const lerpAngle = (a: number, b: number, k: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

export function createRemotes(scene: THREE.Scene, camera: THREE.PerspectiveCamera, layer: HTMLElement, motion: () => Motion | null = () => null) {
  const players = new Map<number, Remote>();
  /** Local clock minus the server's clock, smoothed */
  let offset: number | null = null;
  const now = () => performance.now() / 1000;

  function figure(info: PlayerInfo) {
    const fig = createDegen(lookOutfit(info.look));
    fig.g.scale.setScalar(SCALE);
    fig.g.visible = false;
    if (fig.held) fig.held.visible = true;
    const pivot = new THREE.Group();
    const gun = buildGun(info.weapon, info.skin, { shadows: true });
    pivot.add(gun.group);
    pivot.visible = false;
    fig.torso.add(pivot);
    scene.add(fig.g);
    return { fig, pivot, gun };
  }
  function dropFigure(r: Pick<Remote, 'fig'>) {
    scene.remove(r.fig.g);
    // Geometry and bones are built per figure; materials are shared (cached), so only those go
    r.fig.dispose();
  }

  function paintTag(r: Remote) {
    const rank = RANKS.find((k) => k.id === r.info.rank) ?? RANKS[0];
    r.tag.querySelector('b')!.textContent = r.info.name;
    const badge = r.tag.querySelector<HTMLElement>('.mp-rank')!;
    badge.textContent = rank.name;
    badge.dataset.rank = rank.id;
  }

  function showBubble(r: Remote, text: string, seconds: number) {
    if (r.muted) return;
    r.bubble.textContent = text;
    r.bubble.hidden = false;
    r.bubbleT = seconds;
  }

  const head = new THREE.Vector3();
  const scr = new THREE.Vector3();
  /** Out of their vehicle: it goes, and their Degen stands in the city again */
  function unride(r: Pick<Remote, 'veh' | 'fig' | 'last' | 'anim'>) {
    if (!r.veh) return;
    r.veh.dispose();
    r.veh = null;
    if (!r.fig.g.parent) scene.add(r.fig.g);
    r.last = null;
    r.anim?.reset();
  }
  /** The name tag over their head (hidden far away or behind the camera) */
  function placeTag(r: Remote, x: number, y: number, z: number, dist: number, dt: number, w: number, h: number) {
    r.bubbleT -= dt;
    if (r.bubbleT <= 0) r.bubble.hidden = true;
    head.set(x, y + 1.3 * SCALE, z);
    scr.copy(head).project(camera);
    const show = dist < TAG_RANGE && scr.z < 1 && Math.abs(scr.x) < 1.1 && Math.abs(scr.y) < 1.1;
    r.tag.hidden = !show;
    if (show) {
      r.tag.style.transform = `translate(${((scr.x * 0.5 + 0.5) * w).toFixed(1)}px, ${((-scr.y * 0.5 + 0.5) * h).toFixed(1)}px) translate(-50%, -100%)`;
      r.tag.style.opacity = String(THREE.MathUtils.clamp((TAG_RANGE - dist) / 8, 0, 1));
    }
  }

  return {
    get count() {
      return players.size;
    },
    list() {
      return [...players.values()].map((r) => ({ id: r.info.id, name: r.info.name, rank: r.info.rank, muted: r.muted }));
    },
    add(info: PlayerInfo) {
      if (players.has(info.id)) this.remove(info.id);
      const tag = document.createElement('div');
      tag.className = 'mp-tag';
      tag.innerHTML = '<em class="mp-bubble" hidden></em><b></b><span class="mp-rank"></span>';
      tag.hidden = true;
      layer.append(tag);
      const r: Remote = {
        info,
        ...figure(info),
        stance: newStance(),
        samples: [],
        seenAt: 0,
        loco: createLocomotion(),
        last: null,
        aim: 0,
        air: 0,
        reload: 0,
        draw: 0,
        emote: null,
        anim: null,
        move: newMove(0),
        mocapW: 0,
        upperW: 0,
        animDt: 0,
        root0: { roll: 0, pitch: 0, pivot: 0 },
        tag,
        bubble: tag.querySelector('em')!,
        bubbleT: 0,
        muted: false,
        veh: null,
      };
      players.set(info.id, r);
      paintTag(r);
    },
    remove(id: number) {
      const r = players.get(id);
      if (!r) return;
      unride(r);
      r.gun.dispose();
      dropFigure(r);
      r.tag.remove();
      players.delete(id);
    },
    clear() {
      for (const id of [...players.keys()]) this.remove(id);
      offset = null;
    },
    /** A player's name, outfit, finish or rank changed */
    setInfo(info: PlayerInfo) {
      const r = players.get(info.id);
      if (!r) return this.add(info);
      if (JSON.stringify(info.look) !== JSON.stringify(r.info.look)) {
        unride(r);
        r.gun.dispose();
        dropFigure(r);
        Object.assign(r, figure(info));
      } else if (info.weapon !== r.info.weapon) {
        // They took another gun at the store
        r.pivot.remove(r.gun.group);
        r.gun.dispose();
        r.gun = buildGun(info.weapon, info.skin, { shadows: true });
        r.pivot.add(r.gun.group);
      } else if (info.skin !== r.info.skin) r.gun.setSkin(info.skin);
      r.info = info;
      paintTag(r);
    },
    mute(id: number, on: boolean) {
      const r = players.get(id);
      if (!r) return;
      r.muted = on;
      if (on) r.bubble.hidden = true;
    },
    /** `pt` is the server's clock when the snapshot was taken */
    snapshot(pt: number, rows: SnapRow[]) {
      const t = now();
      const off = t - pt;
      // Follow the fastest-arriving snapshots, drifting slowly when the network settles
      offset = offset === null || off < offset ? off : offset + (off - offset) * 0.02;
      for (const [id, x, y, z, face, pitch, speed, flags] of rows) {
        const r = players.get(id);
        if (!r) continue;
        r.samples.push({ t: pt, x, y, z, face, pitch, speed, flags });
        if (r.samples.length > 12) r.samples.shift();
        r.seenAt = t;
      }
    },
    emote(id: number, e: string) {
      const r = players.get(id);
      if (!r) return;
      r.emote = { id: e, t: 0 };
      showBubble(r, EMOTES.find((k) => k.id === e)?.icon ?? '', 2.5);
    },
    say(id: number, i: number) {
      const r = players.get(id);
      if (r && PHRASES[i]) showBubble(r, PHRASES[i], 3.5);
    },
    /** Where a player's shots come out (for their tracers) */
    muzzle(id: number, out: THREE.Vector3) {
      const r = players.get(id);
      if (!r?.fig.g.visible) return null;
      if (r.pivot.visible) return r.gun.group.localToWorld(out.copy(gunSpec(r.gun.id).muzzle));
      return out.copy(r.fig.g.position).setY(r.fig.g.position.y + 1.1 * SCALE);
    },
    update(dt: number, t: number) {
      if (offset === null) return;
      const at = now() - offset - INTERP_DELAY;
      const w = layer.clientWidth;
      const h = layer.clientHeight;
      for (const r of players.values()) {
        const s = r.samples;
        const away = now() - r.seenAt > 0.6 || !s.length;
        r.fig.g.visible = !away;
        if (away) {
          r.tag.hidden = true;
          continue;
        }
        // The two snapshots either side of the render time
        let a = s[0];
        let b = s[s.length - 1];
        for (let i = 0; i < s.length - 1; i++) {
          if (s[i].t <= at && s[i + 1].t >= at) {
            a = s[i];
            b = s[i + 1];
            break;
          }
        }
        let k = b.t > a.t ? THREE.MathUtils.clamp((at - a.t) / (b.t - a.t), 0, 1) : 1;
        // (a jump between the two is drawn as one: where they were, then where they are)
        if (a !== b && leapt(a, b, b.t - a.t, b.flags)) k = k < 1 ? 0 : 1;
        const x = a.x + (b.x - a.x) * k;
        const y = a.y + (b.y - a.y) * k;
        const z = a.z + (b.z - a.z) * k;
        const face = lerpAngle(a.face, b.face, k);
        const pitch = a.pitch + (b.pitch - a.pitch) * k;
        const speed = a.speed + (b.speed - a.speed) * k;
        const flags = k < 0.5 ? a.flags : b.flags;
        const armed = (flags & FLAG.armed) !== 0;
        const mode = modeOf(flags);
        head.set(x, y, z);
        const camDist = head.distanceTo(camera.position);

        // In a vehicle: drawn in it (their Degen seated in the open ones); riding a taxi, the metro or the river bus: out of sight
        const want = (mode === 'drive' || mode === 'kart' || mode === 'fly') && r.info.veh ? r.info.veh : null;
        if (r.veh && !sameVehicle(r.veh.tag, want)) unride(r);
        if (want && !r.veh) r.veh = remoteVehicle(scene, want, r.fig);
        if (r.veh || mode === 'ride') {
          r.pivot.visible = false;
          r.emote = null;
          r.fig.g.visible = !!r.veh?.carries && r.veh.ready;
          r.veh?.place({ x, y, z, face, speed, flags, dt, t });
          if (mode === 'ride') r.tag.hidden = true;
          else placeTag(r, x, y + (r.veh?.tag.k === 'plane' ? 1.2 : 0.2), z, camDist, dt, w, h);
          continue;
        }

        // Pose: their walk or run with planted feet (locomotion.ts, from how they're moving as drawn), the gun, an emote
        const P = r.fig.pose;
        const run = THREE.MathUtils.clamp((speed - 2.4) / 3, 0, 1);
        // (a jump between frames is a warp: no velocity from it, and the animator starts afresh)
        const jumped = !!r.last && Math.hypot(x - r.last.x, z - r.last.z) > JUMP;
        const vx = r.last && dt > 0 && !jumped ? (x - r.last.x) / dt : 0;
        const vz = r.last && dt > 0 && !jumped ? (z - r.last.z) / dt : 0;
        r.last = { x, z };
        const air = (flags & FLAG.air) !== 0;
        r.loco.update({ dt, t, x, y, z, vx, vz, face, grounded: !air, vy: 0, scale: SCALE, ground: () => y, armed });
        copyPose(r.loco.pose, P);
        // The motion capture (animator.ts), near enough: their springs follow the velocity seen and the facing sent
        head.set(x, y, z);
        const dist = head.distanceTo(camera.position);
        const mo = motion();
        if (mo && dist < ANIM_FAR && !r.anim) {
          r.anim = mo.anim.createAnimator(mo.data);
          r.move = newMove(face);
        }
        // (an upper-body emote plays over the animator's legs through the upper mask, as the gun does; the dance takes everything)
        const dancing = !!r.emote && !!mo && !mo.onFoot.emoteUpper(r.emote.id);
        const mocapOn = !!mo && !!r.anim && dist < ANIM_FAR && !dancing && !air;
        r.mocapW = THREE.MathUtils.clamp(r.mocapW + (mocapOn ? dt / 0.25 : -dt / 0.15), 0, 1);
        if (r.anim && r.mocapW > 0) {
          if (jumped) {
            r.anim.reset();
            r.move = newMove(face);
          }
          r.animDt += dt;
          if (dist < ANIM_NEAR || r.animDt >= FAR_DT) {
            stepMove(r.move, vx, vz, !air, r.animDt, face);
            r.anim.update({ dt: r.animDt, x, y, z, move: r.move, gx: vx, gz: vz, scale: SCALE, ground: () => y, sprint: run, grounded: !air, vy: 0, faceGoal: face });
            r.animDt = 0;
          }
        }
        if (r.emote) {
          r.emote.t += dt;
          if (!mo || mo.onFoot.emoteOver(r.emote.id, r.emote.t) || speed > 0.6) r.emote = null;
          else mo.onFoot.emotePose(P, r.emote.id, r.emote.t);
        }
        r.aim += (((flags & (FLAG.aim | FLAG.fire)) !== 0 ? 1 : 0) - r.aim) * Math.min(1, dt * 14);
        r.reload = flags & FLAG.reload ? (r.reload + dt / WEAPONS[r.gun.id].reload) % 1 : 0;
        // Drawn and put away (not seen once away: other players' gear isn't sent)
        r.draw = THREE.MathUtils.clamp(r.draw + (armed ? dt : -dt) / 0.45, 0, 1);
        r.pivot.visible = r.draw > 0;
        if (r.fig.held) r.fig.held.visible = !r.pivot.visible;
        r.air += ((air ? 1 : 0) - r.air) * Math.min(1, dt * 12);
        // Hands on the gun last, so walking and jumping don't pull them off it
        const holding = r.draw > 0 && !r.emote;
        if (holding) holdGun(P, r.stance, r.pivot, r.gun, { aim: r.aim, ready: 1 - run, draw: r.draw, pitch, recoil: 0, reload: r.reload, dt });
        // (the head looks where they look, unless it's down on a rifle's stock)
        const free = holding ? 1 - r.stance.cheek : r.emote ? 0 : 1;
        const look = THREE.MathUtils.clamp((0.35 - pitch) * 0.6, -0.45, 0.55);
        P.headPitch = THREE.MathUtils.lerp(P.headPitch, look, free);
        P.headYaw *= 1 - free;
        // (their hands as the playing take closes them, as the player's)
        if (r.anim && r.mocapW > 0 && !P.grip) {
          const g = RELAXED + (r.anim.grip - RELAXED) * r.mocapW;
          P.grip = [g, r.fig.held?.visible ? Math.max(g, HOLDING) : g];
        }
        r.fig.update();
        // ...with a gun in hand the animator gives only the legs and hips: their own upper body over them, as the player's
        r.upperW = THREE.MathUtils.clamp(r.upperW + (holding || (r.emote && !dancing) ? dt / 0.15 : -dt / 0.15), 0, 1);
        if (mo && r.anim && r.mocapW > 0) {
          const w = smooth(r.mocapW);
          const u = smooth(r.upperW);
          mo.anim.applyTo(r.fig.rig, r.anim.rot, r.anim.hips, w, u, face - r.anim.face);
          mo.anim.addLook(r.fig.rig, 0, look * 0.5 * free, w * (1 - u));
          r.root0.roll = r.loco.root.roll * (1 - w);
          r.root0.pitch = r.loco.root.pitch * (1 - w);
          r.root0.pivot = r.loco.root.pivot;
          placeRoot(r.fig.g, x, y, z, face + wrap(r.anim.face - face) * w, SCALE, r.root0);
        } else placeRoot(r.fig.g, x, y, z, face, SCALE, r.loco.root);

        placeTag(r, x, y, z, dist, dt, w, h);
      }
    },
  };
}

export type Remotes = ReturnType<typeof createRemotes>;

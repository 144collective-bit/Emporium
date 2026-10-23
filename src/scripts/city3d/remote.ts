/*
 * Other players in multiplayer: each one a full Degen in their own outfit
 * and gun (with its finish), smoothed between the server's snapshots (drawn a little
 * in the past so there's always a snapshot either side), with walk, run,
 * jump, gun and emote poses, and a name tag with their rank badge that
 * shows emote and phrase bubbles.
 */
import * as THREE from 'three';
import { createDegen, emotePose, lookOutfit, type Degen } from './character';
import { copyLeg, copyPose, createLocomotion, placeRoot, type Locomotion } from './locomotion';
import { buildGun, gunSpec, type Gun } from './guns';
import { holdGun, newStance, type Stance } from './stance';
import { WEAPONS } from './combat-sim';
import { EMOTES, PHRASES, RANKS } from '../net/profile-data';
import { FLAG, INTERP_DELAY, type PlayerInfo, type SnapRow } from '../net/protocol';

/** Same size as the walker */
const SCALE = 0.85;
const TAG_RANGE = 30;

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
  tag: HTMLElement;
  bubble: HTMLElement;
  bubbleT: number;
  muted: boolean;
}

const lerpAngle = (a: number, b: number, k: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

export function createRemotes(scene: THREE.Scene, camera: THREE.PerspectiveCamera, layer: HTMLElement) {
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
        tag,
        bubble: tag.querySelector('em')!,
        bubbleT: 0,
        muted: false,
      };
      players.set(info.id, r);
      paintTag(r);
    },
    remove(id: number) {
      const r = players.get(id);
      if (!r) return;
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
        const k = b.t > a.t ? THREE.MathUtils.clamp((at - a.t) / (b.t - a.t), 0, 1) : 1;
        const x = a.x + (b.x - a.x) * k;
        const y = a.y + (b.y - a.y) * k;
        const z = a.z + (b.z - a.z) * k;
        const face = lerpAngle(a.face, b.face, k);
        const pitch = a.pitch + (b.pitch - a.pitch) * k;
        const speed = a.speed + (b.speed - a.speed) * k;
        const flags = k < 0.5 ? a.flags : b.flags;
        const armed = (flags & FLAG.armed) !== 0;

        // Pose: their walk or run with planted feet (locomotion.ts, from how they're moving as drawn), the gun, an emote
        const P = r.fig.pose;
        const run = THREE.MathUtils.clamp((speed - 2.4) / 3, 0, 1);
        const vx = r.last && dt > 0 ? (x - r.last.x) / dt : 0;
        const vz = r.last && dt > 0 ? (z - r.last.z) / dt : 0;
        r.last = { x, z };
        const air = (flags & FLAG.air) !== 0;
        r.loco.update({ dt, t, x, y, z, vx, vz, face, grounded: !air, vy: 0, scale: SCALE, ground: () => y, armed });
        copyPose(r.loco.pose, P);
        if (r.emote) {
          r.emote.t += dt;
          if (r.emote.t > 3 || speed > 0.6) r.emote = null;
          else {
            emotePose(P, r.emote.id, r.emote.t);
            if (r.emote.id !== 'dance') for (let i = 0; i < 2; i++) copyLeg(r.loco.pose.legs[i], P.legs[i]);
          }
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
        const free = holding ? 1 - r.stance.cheek : 1;
        P.headPitch = THREE.MathUtils.lerp(P.headPitch, THREE.MathUtils.clamp((0.35 - pitch) * 0.6, -0.45, 0.55), free);
        P.headYaw *= 1 - free;
        r.fig.update();
        placeRoot(r.fig.g, x, y, z, face, SCALE, r.loco.root);

        // Name tag over the head (hidden far away or behind the camera)
        r.bubbleT -= dt;
        if (r.bubbleT <= 0) r.bubble.hidden = true;
        head.set(x, y + 1.3 * SCALE, z);
        const dist = head.distanceTo(camera.position);
        scr.copy(head).project(camera);
        const show = dist < TAG_RANGE && scr.z < 1 && Math.abs(scr.x) < 1.1 && Math.abs(scr.y) < 1.1;
        r.tag.hidden = !show;
        if (show) {
          r.tag.style.transform = `translate(${((scr.x * 0.5 + 0.5) * w).toFixed(1)}px, ${((-scr.y * 0.5 + 0.5) * h).toFixed(1)}px) translate(-50%, -100%)`;
          r.tag.style.opacity = String(THREE.MathUtils.clamp((TAG_RANGE - dist) / 8, 0, 1));
        }
      }
    },
  };
}

export type Remotes = ReturnType<typeof createRemotes>;

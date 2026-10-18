/*
 * A city: up to 16 players in one Durable Object.
 *
 * - Runs the shared combat rules (combat-sim.ts) at 60 Hz: it decides every
 *   hit on the dummies and drones, ammo, reloads, scores and streaks.
 * - Checks movement (speed, world bounds) and snaps impossible moves back;
 *   checks shots start near the shooter and gear-ups happen at the rack.
 * - Sends everyone's positions 15 times a second, combat events as they
 *   happen, emotes and fixed phrases (rate-limited; nothing typed).
 * - Saves points to each player's Profile every few seconds.
 *
 * Players who stop sending controls (not walking, tab hidden) drop out of the
 * snapshots after 3 s and come back wherever they reappear; after 90 s silent
 * they're disconnected.
 */
import { DurableObject } from 'cloudflare:workers';
import * as THREE from 'three';
import { POINTS, createSim, type SimEvent } from '../../src/scripts/city3d/combat-sim';
import { RACK, rayBoxes } from '../../src/scripts/city3d/solids';
import { EMOTES, PHRASES } from '../../src/scripts/net/profile-data';
import {
  FLAG,
  GROUND,
  MAX_SPEED,
  PROTOCOL,
  RACK_REACH,
  ROOM_SIZE,
  SHOT_REACH,
  SNAP_HZ,
  WORLD,
  r2,
  v3,
  type ClientMsg,
  type NetEvent,
  type OwnProfile,
  type PlayerInfo,
  type ServerMsg,
  type SnapRow,
  type TargetRow,
} from '../../src/scripts/net/protocol';
import type { Env } from './index';
import type { Profile } from './profile';

const LOOP_HZ = 30;
/** Silent this long: left out of snapshots, and free to reappear anywhere */
const AWAY = 3000;
const IDLE_KICK = 90_000;

interface Player {
  id: number;
  ws: WebSocket;
  /** Hash of the guest token */
  key: string;
  profile: DurableObjectStub<Profile>;
  me: OwnProfile;
  pos: THREE.Vector3;
  face: number;
  pitch: number;
  speed: number;
  flags: number;
  posAt: number;
  joinedAt: number;
  /** Points earned but not saved yet */
  owed: number;
  next: Record<string, number>;
  msgs: number;
  msgWindow: number;
  fixAt: number;
}

const send = (ws: WebSocket, msg: ServerMsg) => {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    /* the socket closed; leave() tidies up */
  }
};

async function sha256(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const finite = (...n: unknown[]) => n.every((x) => typeof x === 'number' && Number.isFinite(x));
const triple = (v: unknown): v is [number, number, number] => Array.isArray(v) && v.length === 3 && finite(...v);

export class Room extends DurableObject<Env> {
  private name = 'City 1';
  private players = new Map<number, Player>();
  private sim = createSim({ ground: GROUND, rayWorld: (from, dir, max) => rayBoxes(from, dir, max) });
  private loop: ReturnType<typeof setInterval> | null = null;
  private last = 0;
  private frame = 0;
  private flushAt = 0;
  private origin = new THREE.Vector3();
  private dir = new THREE.Vector3();

  async fetch(req: Request) {
    this.name = req.headers.get('X-Room') ?? this.name;
    const [client, ws] = Object.values(new WebSocketPair());
    ws.accept();
    let player: Player | null = null;
    let joining = false;
    const hello = setTimeout(() => !player && ws.close(1008, 'No hello'), 10_000);
    ws.addEventListener('message', async (ev) => {
      let msg: ClientMsg;
      try {
        msg = JSON.parse(typeof ev.data === 'string' ? ev.data : '');
      } catch {
        return;
      }
      if (player) return this.onMessage(player, msg);
      if (msg?.t !== 'hello' || joining) return;
      joining = true;
      clearTimeout(hello);
      player = await this.join(ws, msg);
    });
    const bye = () => {
      clearTimeout(hello);
      if (player) this.leave(player);
    };
    ws.addEventListener('close', bye);
    ws.addEventListener('error', bye);
    return new Response(null, { status: 101, webSocket: client });
  }

  /* ---------- Joining and leaving ---------- */

  private info(p: Player): PlayerInfo {
    return { id: p.id, name: p.me.name, look: p.me.look, skin: p.me.skin, rank: p.me.rank };
  }

  private async join(ws: WebSocket, msg: Extract<ClientMsg, { t: 'hello' }>): Promise<Player | null> {
    if (msg.v !== PROTOCOL) {
      send(ws, { t: 'error', m: 'Reload the page to get the latest version.' });
      ws.close(4000, 'Old version');
      return null;
    }
    if (typeof msg.token !== 'string' || !/^[A-Za-z0-9_-]{32,128}$/.test(msg.token)) {
      ws.close(4004, 'Bad token');
      return null;
    }
    const key = await sha256(msg.token);
    // The same person joining again (a second tab, a reconnect): the old connection goes
    for (const p of this.players.values()) {
      if (p.key !== key) continue;
      p.ws.close(4001, 'Joined again');
      this.leave(p);
    }
    if (this.players.size >= ROOM_SIZE) {
      send(ws, { t: 'full' });
      ws.close(4005, 'Full');
      return null;
    }
    const profile = this.env.PROFILES.get(this.env.PROFILES.idFromName(key));
    const me = (await profile.open(msg.local)) as OwnProfile;
    if (ws.readyState !== 1) return null;
    let id = 1;
    while (this.players.has(id)) id++;
    const now = Date.now();
    const p: Player = {
      id,
      ws,
      key,
      profile,
      me,
      pos: new THREE.Vector3(),
      face: 0,
      pitch: 0,
      speed: 0,
      flags: 0,
      posAt: 0,
      joinedAt: now,
      owed: 0,
      next: {},
      msgs: 0,
      msgWindow: now,
      fixAt: 0,
    };
    this.players.set(id, p);
    this.sim.addPlayer(String(id));
    send(ws, { t: 'welcome', you: id, room: this.name, profile: me, players: [...this.players.values()].filter((o) => o !== p).map((o) => this.info(o)), pt: this.sim.poseNow });
    this.broadcast({ t: 'join', p: this.info(p) }, id);
    this.report();
    this.start();
    return p;
  }

  private leave(p: Player) {
    if (this.players.get(p.id) !== p) return;
    this.players.delete(p.id);
    this.sim.removePlayer(String(p.id));
    this.broadcast({ t: 'leave', id: p.id });
    this.save(p);
    this.report();
    if (!this.players.size && this.loop) {
      clearInterval(this.loop);
      this.loop = null;
    }
  }

  private report() {
    this.env.LOBBY.get(this.env.LOBBY.idFromName('main'))
      .report(this.name, this.players.size)
      .catch(() => {});
  }

  /* ---------- Messages ---------- */

  /** True at most once per `ms` for each kind of request */
  private allow(p: Player, kind: string, ms: number) {
    const now = Date.now();
    if ((p.next[kind] ?? 0) > now) return false;
    p.next[kind] = now + ms;
    return true;
  }

  private onMessage(p: Player, m: ClientMsg) {
    const now = Date.now();
    if (now - p.msgWindow > 1000) {
      p.msgWindow = now;
      p.msgs = 0;
    }
    if (++p.msgs > 80) {
      p.ws.close(4002, 'Too many messages');
      return;
    }
    const id = String(p.id);
    switch (m?.t) {
      case 'in':
        this.input(p, m, now);
        break;
      case 'gear':
        if (Math.hypot(p.pos.x - RACK.x, p.pos.z - RACK.z) <= RACK_REACH) this.sim.gearUp(id);
        break;
      case 'arm':
        this.sim.setArmed(id, m.on === true);
        break;
      case 'reload':
        this.sim.reload(id);
        break;
      case 'emote':
        if (EMOTES.some((e) => e.id === m.e) && this.allow(p, 'chat', 1200)) this.broadcast({ t: 'emote', id: p.id, e: m.e }, p.id);
        break;
      case 'say':
        if (Number.isInteger(m.i) && m.i >= 0 && m.i < PHRASES.length && this.allow(p, 'chat', 1200)) this.broadcast({ t: 'say', id: p.id, i: m.i }, p.id);
        break;
      case 'look':
        if (this.allow(p, 'look', 400)) this.changed(p, p.profile.setLook(m.look) as Promise<OwnProfile>);
        break;
      case 'skin':
        if (this.allow(p, 'look', 400)) this.changed(p, p.profile.setSkin(m.skin) as Promise<OwnProfile>);
        break;
      case 'rename':
        if (this.allow(p, 'rename', 2500)) this.changed(p, p.profile.rename() as Promise<OwnProfile>);
        break;
      case 'ping':
        send(p.ws, { t: 'pong', c: Number(m.c) || 0 });
        break;
    }
  }

  private async changed(p: Player, next: Promise<OwnProfile>) {
    try {
      p.me = await next;
    } catch {
      return;
    }
    send(p.ws, { t: 'you', profile: p.me });
    this.broadcast({ t: 'info', p: this.info(p) }, p.id);
  }

  private input(p: Player, m: Extract<ClientMsg, { t: 'in' }>, now: number) {
    if (!triple(m.p) || !triple(m.o) || !triple(m.d) || !finite(m.f, m.k, m.s, m.fl, m.pt)) return;
    const [x, y, z] = m.p;
    const inWorld = x >= WORLD[0] && x <= WORLD[1] && z >= WORLD[0] && z <= WORLD[1] && y > -1 && y < 40;
    if (!inWorld) return;
    // Faster than anyone can run: put them back where they were
    if (p.posAt && now - p.posAt < AWAY) {
      const dt = (now - p.posAt) / 1000;
      if (Math.hypot(x - p.pos.x, z - p.pos.z) > MAX_SPEED * dt + 0.75) {
        if (now - p.fixAt > 500) {
          p.fixAt = now;
          send(p.ws, { t: 'fix', p: v3(p.pos) });
        }
        return;
      }
    }
    p.pos.set(x, y, z);
    p.posAt = now;
    p.face = m.f;
    p.pitch = clamp(m.k, -1.5, 1.5);
    p.speed = clamp(m.s, 0, MAX_SPEED);
    p.flags = m.fl | 0;
    // The shot ray starts at the player's camera, which can't be far from them
    this.origin.set(...m.o);
    this.dir.set(...m.d);
    const fair = this.origin.distanceTo(p.pos) <= SHOT_REACH && this.dir.lengthSq() > 0.25;
    this.sim.setInput(String(p.id), {
      fire: fair && (p.flags & FLAG.fire) !== 0,
      aim: (p.flags & FLAG.aim) !== 0,
      assist: (p.flags & FLAG.assist) !== 0,
      origin: this.origin,
      dir: this.dir.normalize(),
      view: m.pt,
    });
  }

  /* ---------- The game loop ---------- */

  private start() {
    if (this.loop) return;
    this.last = Date.now();
    this.loop = setInterval(() => this.step(), 1000 / LOOP_HZ);
  }

  private step() {
    const now = Date.now();
    this.sim.advance((now - this.last) / 1000);
    this.last = now;
    const out: NetEvent[] = [];
    for (const e of this.sim.drain()) {
      const n = this.toNet(e);
      if (n) out.push(n);
    }
    if (out.length) this.broadcastRaw(JSON.stringify({ t: 'ev', e: out }));
    if (++this.frame % (LOOP_HZ / SNAP_HZ) === 0) this.snapshot(now);
    if (now - this.flushAt > 5000) {
      this.flushAt = now;
      for (const p of this.players.values()) this.save(p);
    }
    for (const p of this.players.values()) {
      if (now - Math.max(p.posAt, p.joinedAt) > IDLE_KICK) {
        p.ws.close(4003, 'Idle');
        this.leave(p);
      }
    }
  }

  private toNet(e: SimEvent): NetEvent | null {
    const pid = 'player' in e ? Number(e.player) : 0;
    const p = this.players.get(pid);
    switch (e.type) {
      case 'shot':
        return ['s', pid, ...v3(e.from), ...v3(e.to), e.target ?? -1];
      case 'hit':
        if (p) p.owed += POINTS.hit;
        return ['h', pid, e.target, e.damage, ...v3(e.at), e.hp];
      case 'takedown':
        if (p) p.owed += e.points;
        return ['k', pid, e.target, ...v3(e.at), e.points, e.streak];
      case 'respawn':
        return ['r', e.target];
      case 'empty':
        return ['e', pid];
      case 'reload':
        return ['l', pid, e.phase === 'done' ? 1 : 0];
      case 'armed':
        return ['a', pid, e.on ? 1 : 0];
      default:
        return null;
    }
  }

  private snapshot(now: number) {
    const rows: SnapRow[] = [];
    for (const p of this.players.values()) {
      if (!p.posAt || now - p.posAt > AWAY) continue;
      const s = this.sim.players.get(String(p.id));
      const flags = (p.flags & ~(FLAG.armed | FLAG.reload)) | (s?.armed ? FLAG.armed : 0) | (s && s.reload > 0 ? FLAG.reload : 0);
      rows.push([p.id, r2(p.pos.x), r2(p.pos.y), r2(p.pos.z), r2(p.face), r2(p.pitch), r2(p.speed), flags]);
    }
    const tg: TargetRow[] = this.sim.targets.map((t) => [t.id, t.hp, t.down > 0 ? 1 : 0]);
    // The shared part once; each player gets their own ammo and score on the end
    const head = `{"t":"snap","pt":${Math.round(this.sim.poseNow * 1000) / 1000},"p":${JSON.stringify(rows)},"tg":${JSON.stringify(tg)},"me":`;
    for (const p of this.players.values()) {
      const s = this.sim.players.get(String(p.id));
      if (!s) continue;
      try {
        p.ws.send(`${head}${JSON.stringify([s.mag, s.reserve, s.reload > 0 ? 1 : 0, s.score, s.streak, s.armed ? 1 : 0])}}`);
      } catch {
        /* closing */
      }
    }
  }

  /** Bank a player's points in their profile; tell them (and everyone, if their rank went up) */
  private save(p: Player) {
    if (p.owed <= 0) return;
    const n = p.owed;
    p.owed = 0;
    (p.profile.addScore(n) as Promise<OwnProfile>)
      .then((me) => {
        const ranked = me.rank !== p.me.rank;
        p.me = me;
        send(p.ws, { t: 'you', profile: me });
        if (ranked) this.broadcast({ t: 'info', p: this.info(p) }, p.id);
      })
      .catch(() => (p.owed += n));
  }

  private broadcast(msg: ServerMsg, except = 0) {
    this.broadcastRaw(JSON.stringify(msg), except);
  }
  private broadcastRaw(s: string, except = 0) {
    for (const p of this.players.values()) {
      if (p.id === except) continue;
      try {
        p.ws.send(s);
      } catch {
        /* closing */
      }
    }
  }
}

/*
 * Multiplayer (beta): the Online pill in walk mode, and everything that
 * happens while you're connected.
 *
 * - Sends your controls to the game server ~20 times a second while walking
 *   (position, facing, speed, flags, and the shot ray).
 * - Draws everyone else (remote.ts), hands combat over to the server
 *   (combat.setNet) and shows your server profile in the Profile panel.
 * - Emote wheel and fixed phrases (T, or the Emote pill), player list with
 *   mute, a short toast when people join or leave.
 * - Going offline: stop walking (you rejoin when you walk again) or press
 *   Leave in the Online panel.
 *
 * Only built when the site has a server address (PUBLIC_GAME_SERVER).
 */
import * as THREE from 'three';
import { createNetClient, type NetState } from '../net/client';
import { EMOTES, PHRASES, RANKS } from '../net/profile-data';
import { FLAG, INPUT_HZ, v3, type ServerMsg } from '../net/protocol';
import type { Combat } from './combat';
import type { ProfileUI } from './profile-ui';
import { createRemotes } from './remote';

const r4 = (n: number) => Math.round(n * 10000) / 10000;

interface Walker {
  readonly active: boolean;
  netState(): { pos: THREE.Vector3; face: number; pitch: number; speed: number; air: boolean; run: boolean; aim: boolean };
  fix(x: number, y: number, z: number): void;
  playEmote(id: string): void;
}

export interface MultiplayerDeps {
  url: string;
  root: HTMLElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  walk: Walker;
  combat: Combat;
  profile: ProfileUI;
}

export function createMultiplayer(d: MultiplayerDeps) {
  const { root, camera, walk, combat, profile } = d;
  const $ = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const panel = $<HTMLDetailsElement>('[data-mp]');
  const dot = $('[data-mp-dot]');
  const label = $('[data-mp-label]');
  const status = $('[data-mp-status]');
  const pingEl = $('[data-mp-ping]');
  const joinBtn = $<HTMLButtonElement>('[data-mp-join]');
  const list = $('[data-mp-list]');
  const emotes = $<HTMLDetailsElement>('[data-emotes]');
  const toastEl = $('[data-mp-toast]');
  panel.hidden = false;

  const net = createNetClient(d.url);
  const remotes = createRemotes(d.scene, camera, $('[data-mp-tags]'));
  let myId = 0;
  let room = '';
  let sendAcc = 0;
  /** Walking stopped while online: rejoin when walking starts again */
  let resume = false;
  const dir = new THREE.Vector3();
  const online = () => net.state === 'online' && myId > 0;

  /* ----- Little UI helpers ----- */
  let toastTimer = 0;
  function toast(text: string) {
    toastEl.textContent = text;
    toastEl.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => (toastEl.hidden = true), 2600);
  }

  function paintList() {
    const people = remotes.list();
    list.replaceChildren(
      ...people.map((p) => {
        const li = document.createElement('li');
        const rank = RANKS.find((k) => k.id === p.rank) ?? RANKS[0];
        li.innerHTML = '<span class="mp-who"><b></b><span class="mp-rank"></span></span><button type="button" class="mp-mute"></button>';
        li.querySelector('b')!.textContent = p.name;
        const badge = li.querySelector<HTMLElement>('.mp-rank')!;
        badge.textContent = rank.name;
        badge.dataset.rank = rank.id;
        const mute = li.querySelector<HTMLButtonElement>('.mp-mute')!;
        mute.textContent = p.muted ? 'Unmute' : 'Mute';
        mute.setAttribute('aria-pressed', String(p.muted));
        mute.addEventListener('click', () => {
          remotes.mute(p.id, !p.muted);
          paintList();
        });
        return li;
      })
    );
    if (online()) {
      label.textContent = `${room} · ${people.length + 1}`;
      status.textContent = people.length ? `You're in ${room} with ${people.length} other ${people.length === 1 ? 'Degen' : 'Degens'}.` : `You're in ${room}. Nobody else here yet.`;
    }
  }

  function paintState(s: NetState, detail?: string) {
    dot.dataset.state = s;
    root.classList.toggle('is-online', s === 'online');
    emotes.hidden = s !== 'online';
    if (s !== 'online') emotes.open = false;
    joinBtn.textContent = s === 'off' || s === 'full' || s === 'error' ? 'Go online' : 'Leave';
    if (s === 'online') return paintList();
    label.textContent = s === 'connecting' || s === 'retrying' ? 'Joining…' : 'Go online';
    status.textContent =
      s === 'connecting'
        ? 'Finding a city with room…'
        : s === 'retrying'
          ? 'Connection lost. Trying again…'
          : s === 'full'
            ? 'Every city is full right now. Try again in a minute.'
            : s === 'error'
              ? (detail ?? 'Something went wrong.')
              : 'Walk the city with other Degens. Emotes and set phrases only, nothing typed.';
  }

  function goOffline() {
    myId = 0;
    remotes.clear();
    combat.setNet(null);
    profile.setOnline(null);
  }

  /* ----- From the server ----- */
  net.onState((s, detail) => {
    if (s !== 'online') goOffline();
    paintState(s, detail);
  });
  net.onMessage((m: ServerMsg) => {
    switch (m.t) {
      case 'welcome':
        myId = m.you;
        room = m.room;
        remotes.clear();
        for (const p of m.players) remotes.add(p);
        combat.setNet({ send: (msg) => net.send(msg) }, (skin) => net.send({ t: 'skin', skin }));
        combat.setNetProfile(m.profile);
        profile.setOnline(m.profile);
        paintState('online');
        toast(`Welcome, ${m.profile.name}`);
        break;
      case 'join':
        remotes.add(m.p);
        paintList();
        toast(`${m.p.name} joined`);
        break;
      case 'leave': {
        const who = remotes.list().find((p) => p.id === m.id);
        remotes.remove(m.id);
        paintList();
        if (who) toast(`${who.name} left`);
        break;
      }
      case 'info':
        remotes.setInfo(m.p);
        paintList();
        break;
      case 'you':
        combat.setNetProfile(m.profile);
        profile.setOnline(m.profile);
        break;
      case 'snap':
        remotes.snapshot(m.pt, m.p.filter((r) => r[0] !== myId));
        combat.netSnap(m.pt, m.tg, m.me);
        break;
      case 'ev':
        combat.netEvents(m.e, myId, (id, out) => remotes.muzzle(id, out));
        break;
      case 'emote':
        remotes.emote(m.id, m.e);
        break;
      case 'say':
        remotes.say(m.id, m.i);
        break;
      case 'fix':
        walk.fix(...m.p);
        break;
    }
  });
  profile.onLookChange((look) => online() && net.send({ t: 'look', look }));
  profile.onRename(() => online() && net.send({ t: 'rename' }));

  /* ----- Buttons ----- */
  const connect = () => net.connect({ total: Math.floor(combat.lifetime), skin: combat.skin });
  joinBtn.addEventListener('click', () => {
    if (net.state === 'off' || net.state === 'full' || net.state === 'error') connect();
    else {
      resume = false;
      net.disconnect();
    }
  });
  // Emotes and phrases
  const emoteGrid = $('[data-emote-grid]');
  const phraseGrid = $('[data-phrase-grid]');
  for (const e of EMOTES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'emote-btn';
    b.innerHTML = `<span aria-hidden="true">${e.icon}</span>${e.label}`;
    b.addEventListener('click', () => emote(e.id));
    emoteGrid.append(b);
  }
  PHRASES.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'phrase-btn';
    b.textContent = p;
    b.addEventListener('click', () => say(i));
    phraseGrid.append(b);
  });
  let chatAt = 0;
  const ready = () => {
    const now = performance.now();
    if (now - chatAt < 1200) return false;
    chatAt = now;
    return true;
  };
  function emote(id: (typeof EMOTES)[number]['id']) {
    if (!online() || !ready()) return;
    net.send({ t: 'emote', e: id });
    walk.playEmote(id);
    toast(`You: ${EMOTES.find((e) => e.id === id)!.icon}`);
    emotes.open = false;
  }
  function say(i: number) {
    if (!online() || !ready()) return;
    net.send({ t: 'say', i });
    toast(`You: ${PHRASES[i]}`);
    emotes.open = false;
  }
  document.addEventListener('keydown', (e) => {
    if (!walk.active || !online() || e.repeat || (e.target as HTMLElement).matches?.('input, select, textarea')) return;
    if (e.code === 'KeyT') {
      emotes.open = !emotes.open;
      if (emotes.open && document.pointerLockElement) document.exitPointerLock();
    } else if (emotes.open && /^Digit[1-4]$/.test(e.code)) emote(EMOTES[Number(e.code.slice(5)) - 1].id);
  });

  /* ----- Every frame ----- */
  return {
    /** Walking started or stopped (going offline while not walking, rejoining after) */
    walkChanged(walking: boolean) {
      if (walking && resume) {
        resume = false;
        connect();
      } else if (!walking && net.state !== 'off') {
        resume = net.state === 'online' || net.state === 'connecting' || net.state === 'retrying';
        net.disconnect();
      }
    },
    update(dt: number, t: number) {
      remotes.update(dt, t);
      if (!online()) return;
      if (net.ping) pingEl.textContent = `${net.ping} ms`;
      if (!walk.active) return;
      sendAcc += dt;
      if (sendAcc < 1 / INPUT_HZ) return;
      sendAcc = 0;
      const s = walk.netState();
      camera.getWorldDirection(dir);
      const fl =
        (combat.armed ? FLAG.armed : 0) |
        (s.aim ? FLAG.aim : 0) |
        (combat.takePull() && combat.armed ? FLAG.fire : 0) |
        (s.run ? FLAG.run : 0) |
        (s.air ? FLAG.air : 0) |
        (combat.reloading > 0 ? FLAG.reload : 0) |
        (combat.assisted ? FLAG.assist : 0);
      net.send({
        t: 'in',
        p: v3(s.pos),
        f: Math.round(s.face * 100) / 100,
        k: Math.round(s.pitch * 100) / 100,
        s: Math.round(s.speed * 100) / 100,
        fl,
        o: v3(camera.position),
        // Finer than positions: 0.01 off would turn a scoped hit at 40 m into a miss
        d: [r4(dir.x), r4(dir.y), r4(dir.z)],
        pt: Math.round(combat.poseNow * 1000) / 1000,
      });
    },
  };
}

export type Multiplayer = ReturnType<typeof createMultiplayer>;

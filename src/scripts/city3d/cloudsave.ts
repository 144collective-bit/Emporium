/*
 * A wallet's save kept in step with the game server (docs/account-plan.md
 * Phase 2): its own chunk, loaded by the page (CityMap.astro) only when this
 * page plays a wallet's slot (saveslot.ts). The rules are cloudsync.ts's;
 * the server's are server/src/saves.ts.
 *
 * - When the page starts it asks for the server's copy (the page's boot
 *   waits a few seconds for it, `ready`): the server's wins if it moved on,
 *   then this device takes the save (its lease) and sends up what's waiting.
 * - Every write to the slot is noted (`dirty`, kept with the slot) and goes
 *   up QUIET after the last change (MAX_WAIT at most), when the tab is
 *   hidden, and as the page closes if it's small enough.
 * - Offline (or the server down) the game plays on from this copy; it tries
 *   again, sooner then less often, and when the browser's back online. If
 *   another device played the account meanwhile, the server's copy wins and
 *   the card says so.
 * - The card (`[data-cloud]`): another device took the save (Play here, Play
 *   as guest), the server turned a save away (Load my saved game), the login
 *   ran out (Log in, Play as guest), or the server's newer copy loaded. Its ×
 *   closes it; while it stands, nothing more goes up.
 */
import { CLOUD_META_KEY, browserStore, readJson, slot, tokenOf } from './saveslot';
import { KEEPALIVE_MAX, LOCAL_KEYS, MAX_WAIT, QUIET, cleanMeta, deviceOf, pullPlan, retryIn, settle, uploadBody, type CloudMeta, type Pull } from './cloudsync';
import type { CloudLease, CloudPutResult, CloudSave, SnapSummary } from '../net/savecheck';
import { setCloudLink } from './cloudlink';

export interface CloudDeps {
  /** The game server's address (as PUBLIC_GAME_SERVER) */
  server: string;
  /** Open the account card to log in again */
  login(): void;
  /** Log out (the page reloads into the guest's game) */
  logout(): Promise<void>;
}

type Stop = 'elsewhere' | 'refused' | 'expired' | 'newer';

export function createCloud(root: HTMLElement, d: CloudDeps) {
  const s = slot();
  if (!s.address) return null;
  const base = d.server.replace(/\/$/, '').replace(/^ws/, 'http');
  const device = deviceOf(matchMedia('(pointer: coarse)').matches);
  const card = root.querySelector<HTMLElement>('[data-cloud]')!;
  const $ = (q: string) => card.querySelector<HTMLElement>(q)!;

  /** The note kept with the slot, read fresh each time (another tab may have moved it on) */
  const meta = (): CloudMeta => cleanMeta(readJson(CLOUD_META_KEY, s));
  const keep = (m: CloudMeta) => s.set(CLOUD_META_KEY, JSON.stringify(m), true);
  /** How many times each key was written on this page (to tell a change made while an upload was on its way) */
  const writes = new Map<string, number>();
  let connected = false;
  let started = false;
  let stopped: Stop | null = null;
  let leaving = false;
  let busy = false;
  let tries = 0;
  let quietTimer = 0;
  let firstWaiting = 0;
  let retryTimer = 0;

  /* ---------- Talking to the server ---------- */

  type Reply<T> = { status: number; body: T };
  async function call<T>(method: string, path: string, body?: unknown, opts: { keepalive?: boolean } = {}): Promise<Reply<T>> {
    const token = tokenOf(browserStore());
    const text = body === undefined ? undefined : JSON.stringify(body);
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: text,
      keepalive: !!opts.keepalive && (text?.length ?? 0) < KEEPALIVE_MAX,
    });
    return { status: res.status, body: (await res.json().catch(() => null)) as T };
  }

  /** Put the server's copy in the slot (quietly: it isn't a change to send back) */
  function apply(p: Extract<Pull, { kind: 'load' }>) {
    for (const [k, v] of p.writes) {
      if (v === null) s.remove(k, true);
      else s.set(k, v, true);
    }
    keep(p.meta);
  }

  /**
   * Ask for the server's copy, take the save for this device, send up what's
   * waiting. (The page's boot stops waiting for the first one after a few
   * seconds; an answer after that is one for a city already running.)
   */
  let connecting: Promise<void> | null = null;
  function connect(): Promise<void> {
    connecting ??= reach().finally(() => (connecting = null));
    return connecting;
  }
  async function reach() {
    if (stopped || leaving) return;
    let got: Reply<CloudSave>;
    try {
      const lease = meta().lease;
      got = await call<CloudSave>('GET', lease ? `/save?lease=${lease}` : '/save');
    } catch {
      return offline();
    }
    if (got.status === 401) return stop('expired');
    if (got.status !== 200 || !got.body) return offline();
    const plan = pullPlan(meta(), got.body, device, (k) => s.get(k) !== null);
    if (plan.kind === 'load') {
      if (started) {
        // The city is already running on this copy: the newer one goes in as the page starts again (the card's button)
        pending = plan;
        return stop('newer');
      }
      apply(plan);
      if (plan.lost) later = 'lost';
    } else if (plan.kind === 'first') keep({ ...meta(), dirty: plan.dirty });
    else if (plan.kind === 'ours') keep({ ...meta(), rev: plan.rev });
    let lease: Reply<CloudLease>;
    try {
      lease = await call<CloudLease>('POST', '/save/lease');
    } catch {
      return offline();
    }
    if (lease.status === 401) return stop('expired');
    if (lease.status !== 200 || !lease.body) return offline();
    keep({ ...meta(), lease: lease.body.lease });
    connected = true;
    tries = 0;
    if (meta().dirty.length) schedule(0);
  }
  /** The newer copy waiting to be put in when the page starts again */
  let pending: Extract<Pull, { kind: 'load' }> | null = null;
  /** Said once the city is up: this device's changes that never went up were lost to a newer copy */
  let later: 'lost' | null = null;

  function offline() {
    connected = false;
    clearTimeout(retryTimer);
    retryTimer = window.setTimeout(() => void connect(), retryIn(tries++));
  }

  /** Send up what's waiting */
  async function upload(closing = false) {
    clearTimeout(quietTimer);
    firstWaiting = 0;
    // (on its way out to a copy just put in, nothing of this one goes up over it)
    if (stopped || busy || leaving) return;
    if (!connected) return closing ? undefined : void connect();
    const m = meta();
    if (!m.dirty.length || !m.lease) return;
    const up = uploadBody(m.dirty, (k) => s.get(k), device);
    const at = new Map(up.sent.map((k) => [k, writes.get(k) ?? 0]));
    if (!up.sent.length) return void keep({ ...m, dirty: settle(m.dirty, up.sent, up.drop, new Set()) });
    busy = true;
    let r: Reply<CloudPutResult>;
    try {
      r = await call<CloudPutResult>('PUT', '/save', { lease: m.lease, base: m.rev, saves: up.saves }, { keepalive: closing });
    } catch {
      return closing ? undefined : offline();
    } finally {
      busy = false;
    }
    if (r.status === 401) return stop('expired');
    const res = r.body;
    if (!res) return offline();
    const now = meta();
    if (res.ok) {
      const changed = new Set([...at].filter(([k, n]) => (writes.get(k) ?? 0) !== n).map(([k]) => k));
      keep({ ...now, rev: res.rev, dirty: settle(now.dirty, up.sent, up.drop, changed) });
      tries = 0;
      if (meta().dirty.length) schedule();
      return;
    }
    if (res.why === 'lease') return stop('elsewhere');
    if (res.why === 'check') {
      console.warn('cloud save refused', res.checks);
      return stop('refused');
    }
    if (res.why === 'stale') {
      // Only this device holds the lease, so another tab here moved it on: this browser's copy is the newest
      keep({ ...now, rev: res.rev });
      return schedule(tries++ < 3 ? 1_000 : retryIn(tries));
    }
    // Too many at once, or the server's trouble: again later
    clearTimeout(retryTimer);
    retryTimer = window.setTimeout(() => void upload(), retryIn(tries++));
  }

  /** Upload once things have been quiet a moment (at once with 0), or at the latest MAX_WAIT after the first change waiting */
  function schedule(ms = QUIET) {
    if (stopped) return;
    const now = Date.now();
    firstWaiting ||= now;
    clearTimeout(quietTimer);
    quietTimer = window.setTimeout(() => void upload(), Math.max(0, Math.min(ms, firstWaiting + MAX_WAIT - now)));
  }

  s.subscribe((k) => {
    if (!LOCAL_KEYS.includes(k)) return;
    writes.set(k, (writes.get(k) ?? 0) + 1);
    const m = meta();
    if (!m.dirty.includes(k)) keep({ ...m, dirty: [...m.dirty, k] });
    schedule();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) void upload(true);
    else if (!connected && !stopped) void connect();
  });
  addEventListener('pagehide', () => void upload(true));
  addEventListener('online', () => {
    if (!connected && !stopped) {
      tries = 0;
      void connect();
    }
  });

  /* ---------- The card ---------- */

  const COPY: Record<Stop, { title: string; text: string; acts: [string, string][] }> = {
    elsewhere: {
      title: 'Playing on another device',
      text: "Your account was opened on another device, so this one has stopped saving to it. What you do here now won't be kept.",
      acts: [
        ['here', 'Play here'],
        ['guest', 'Play as guest'],
      ],
    },
    refused: {
      title: "This save wasn't kept",
      text: "The game server couldn't take this save: it changed faster than the game allows. Load your last saved game to carry on saving.",
      acts: [['load', 'Load my saved game']],
    },
    expired: {
      title: 'Your login ran out',
      text: "Log in with your wallet again to keep saving to your account. Until then, what you do here is kept on this device and goes up when you're back.",
      acts: [
        ['login', 'Log in'],
        ['guest', 'Play as guest'],
      ],
    },
    newer: {
      title: 'Your save moved on',
      text: 'While this device was offline, your account was played on another one. Its save is the one kept, so the city starts again on it.',
      acts: [['reload', 'Carry on']],
    },
  };
  function stop(why: Stop) {
    stopped = why;
    clearTimeout(quietTimer);
    clearTimeout(retryTimer);
    show(why);
  }
  function show(why: Stop | 'lost') {
    // Never over the start menu: the account card it can lead to opens under it
    if (root.classList.contains('has-start')) {
      const mo = new MutationObserver(() => {
        if (root.classList.contains('has-start')) return;
        mo.disconnect();
        show(why);
      });
      mo.observe(root, { attributes: true, attributeFilter: ['class'] });
      return;
    }
    const c =
      why === 'lost'
        ? { title: 'Loaded from another device', text: "Your account was played on another device since this one last saved, so its save is the one kept. What you did here offline wasn't.", acts: [['ok', 'OK']] as [string, string][] }
        : COPY[why];
    $('[data-cloud-title]').textContent = c.title;
    $('[data-cloud-text]').textContent = c.text;
    const acts = $('[data-cloud-acts]');
    acts.replaceChildren(
      ...c.acts.map(([act, label], i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = i === 0 ? 'mk-btn is-main' : 'mk-btn';
        b.dataset.cloudAct = act;
        b.textContent = label;
        return b;
      }),
    );
    card.hidden = false;
    acts.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  }
  const hide = () => {
    card.hidden = true;
    // The newer copy is the one kept, whatever: closing the card starts the city on it
    if (stopped === 'newer') reloadWith(pending);
  };
  /** Start the page again on a copy from the server (never sending this one back up on the way out) */
  function reloadWith(p: Extract<Pull, { kind: 'load' }> | null) {
    leaving = true;
    if (p) apply(p);
    s.seal();
    location.reload();
  }
  /** Take the save back for this device: the server's copy comes down and the city starts again on it */
  async function takeBack() {
    try {
      const got = await call<CloudSave>('GET', '/save');
      if (got.status !== 200 || !got.body) throw new Error(String(got.status));
      const lease = await call<CloudLease>('POST', '/save/lease');
      if (lease.status !== 200 || !lease.body) throw new Error(String(lease.status));
      // Forced to load: what's here is the copy the server turned away, or one another device has moved past
      const plan = pullPlan({ rev: -1, lease: lease.body.lease, dirty: [] }, got.body, device, (k) => s.get(k) !== null);
      if (plan.kind === 'load') reloadWith(plan);
    } catch {
      $('[data-cloud-text]').textContent = "The game server can't be reached right now. Try again in a moment.";
    }
  }
  card.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-cloud-close]')) return hide();
    const act = t.closest<HTMLElement>('[data-cloud-act]')?.dataset.cloudAct;
    if (!act) return;
    if (act === 'ok') return void (card.hidden = true);
    if (act === 'reload') return reloadWith(pending);
    if (act === 'here' || act === 'load') return void takeBack();
    if (act === 'guest') {
      leaving = true;
      return void d.logout();
    }
    if (act === 'login') {
      card.hidden = true;
      d.login();
    }
  });
  card.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    hide();
  });

  /** The Vault's save history (tycoon-ui.ts, through cloudlink.ts) */
  setCloudLink({
    async history() {
      const r = await call<SnapSummary[]>('GET', '/save/history');
      if (r.status === 401) stop('expired');
      if (r.status !== 200 || !Array.isArray(r.body)) throw new Error(String(r.status));
      return r.body;
    },
    async restore(day) {
      const lease = meta().lease;
      if (!lease || stopped) return stopped === 'elsewhere' ? 'elsewhere' : 'offline';
      let r: Reply<CloudPutResult | { ok: false; why: 'day' }>;
      try {
        r = await call('POST', '/save/restore', { lease, day });
      } catch {
        return 'offline';
      }
      if (r.status === 401) {
        stop('expired');
        return 'offline';
      }
      const res = r.body;
      if (!res) return 'offline';
      if (!res.ok) {
        if (res.why === 'lease') {
          stop('elsewhere');
          return 'elsewhere';
        }
        return res.why === 'day' ? 'gone' : 'offline';
      }
      // The restored save comes down and the city starts again on it
      try {
        const got = await call<CloudSave>('GET', '/save');
        if (got.status !== 200 || !got.body) throw new Error(String(got.status));
        const plan = pullPlan({ rev: -1, lease, dirty: [] }, got.body, device, (k) => s.get(k) !== null);
        if (plan.kind === 'load') reloadWith(plan);
      } catch {
        // (the server has it: the next start brings it down)
        leaving = true;
        s.seal();
        location.reload();
      }
      return 'ok';
    },
  });
  const ready = connect();
  return {
    /** Settled once the first contact has (or gave up waiting): the page boots the city after it */
    ready,
    /** The city has started on this copy: a newer one found from now on asks first */
    started() {
      started = true;
      if (later === 'lost') show('lost');
      later = null;
    },
    /** Logged in again (the same wallet): carry on */
    retry() {
      if (stopped !== 'expired') return;
      stopped = null;
      card.hidden = true;
      tries = 0;
      void connect();
    },
    /** Send up what's waiting now, before logging out (it waits a moment at most) */
    async flush() {
      if (!meta().dirty.length) return;
      await Promise.race([upload(), new Promise((r) => setTimeout(r, 3_000))]);
    },
  };
}

export type Cloud = NonNullable<ReturnType<typeof createCloud>>;

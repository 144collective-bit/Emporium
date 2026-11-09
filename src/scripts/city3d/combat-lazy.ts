/*
 * Target practice behind a thin front (polish plan Phase 4): combat.ts, the
 * first-person hands (viewmodel.ts) and the third-person hold (stance.ts) are
 * a chunk the boot never downloads. `createCombatLazy()` is what walk.ts
 * holds as `combat`: the same shape as combat.ts's, fetching the real thing
 * once the first frame is drawn (`when`: the targets stand in the city from
 * the start, so it isn't left to a door prompt) and standing in until then.
 * Before it's in, what reads the save answers from it (`canTake`, `ammo`,
 * the profile's gun, finish and score), what sets state is kept and replayed
 * in order (the outfit, the loadout, the net link, `onLifetime`), and the
 * per-frame calls and presses do nothing (a trigger pulled in the boot's first
 * second is lost: nothing can be drawn before walking starts anyway). The gun
 * pivot the walk code parents to Degen's chest is made here and handed to
 * combat.ts (`CombatDeps.pivot`), so it never moves.
 */
import * as THREE from 'three';
import type { Combat, CombatDeps } from './combat';
import { WEAPONS, weaponUnlocked, type WeaponId } from './combat-sim';
import { SKINS, type SkinId } from './guns';
import { gunMods, ownsGun } from './tycoon';
import { applyGunMods } from './catalog';
import { lazy } from './lazy';

/** The browser's profile (combat.ts keeps it under this key): what the stand-in answers from */
const PROFILE_KEY = 'degen-city-combat-v1';
function profile(): { total: number; skin: SkinId; weapon: WeaponId } {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
    const total = Number.isFinite(p.total) ? Math.max(0, p.total) : 0;
    const skin = SKINS.some((s) => s.id === p.skin && total >= s.need) ? p.skin : 'olive';
    const weapon = weaponUnlocked(p.weapon, total) ? p.weapon : 'rifle';
    return { total, skin, weapon };
  } catch {
    return { total: 0, skin: 'olive', weapon: 'rifle' };
  }
}

/**
 * The combat as walk.ts holds it: combat.ts's once its chunk is in (fetched when `when` says, normally after the
 * first frame), a stand-in until then. `loaded()` is the real one's promise.
 */
export function createCombatLazy(d: CombatDeps, when: (go: () => void) => void): Combat & { loaded(): Promise<Combat> } {
  const pivot = new THREE.Group();
  pivot.visible = false;
  const load = lazy(() => import('./combat'), 'target practice');
  let real: Combat | null = null;
  /** State set before the real one came, replayed onto it in order */
  const queued: ((c: Combat) => void)[] = [];
  const later = (f: (c: Combat) => void) => void queued.push(f);
  const kick = { up: 0, side: 0, recover: 0 };
  let loading: Promise<Combat> | null = null;
  const loaded = () =>
    (loading ??= load().then((m) => {
      const c = m.createCombat({ ...d, pivot });
      for (const f of queued) f(c);
      queued.length = 0;
      real = c;
      return c;
    }));
  when(() => void loaded().catch(() => {}));

  const owns = (id: WeaponId) => weaponUnlocked(id, profile().total) && ownsGun(d.game.save(), id);

  const front: Combat & { loaded(): Promise<Combat> } = {
    loaded,
    gun: pivot,
    setOutfit: (o) => (real ? real.setOutfit(o) : later((c) => c.setOutfit(o))),
    get geared() {
      return real?.geared ?? false;
    },
    get armed() {
      return real?.armed ?? false;
    },
    get reloading() {
      return real?.reloading ?? 0;
    },
    get weapon() {
      return real?.weapon ?? profile().weapon;
    },
    get adsZoom() {
      return real?.adsZoom ?? WEAPONS[profile().weapon].zoom;
    },
    canTake: (id) => (real ? real.canTake(id) : owns(id)),
    setMods: (id) => (real ? real.setMods(id) : later((c) => c.setMods(id))),
    get firing() {
      return real?.firing ?? false;
    },
    get touchFiring() {
      return real?.touchFiring ?? false;
    },
    get assisted() {
      return real?.assisted ?? false;
    },
    get poseNow() {
      return real?.poseNow ?? 0;
    },
    get aimed() {
      return real?.aimed ?? 0;
    },
    equip(id) {
      if (real) return real.equip(id);
      if (!owns(id)) return false;
      later((c) => c.equip(id));
      return true;
    },
    get guns() {
      return real?.guns ?? [];
    },
    setLoadout: () => (real ? real.setLoadout() : later((c) => c.setLoadout())),
    draw: (id) => real?.draw(id) ?? false,
    holster: () => real?.holster(),
    ammo(id) {
      if (real) return real.ammo(id);
      const w = applyGunMods(WEAPONS[id], gunMods(d.game.save(), id));
      return [w.mag, w.reserve];
    },
    swap: (to) => real?.swap(to) ?? false,
    toggleHolster: () => real?.toggleHolster(),
    trigger: (on, touch) => real?.trigger(on, touch),
    takePull: () => real?.takePull() ?? false,
    reload: () => real?.reload(),
    melee: (move, x, y, z, yaw) => real?.melee(move, x, y, z, yaw) ?? false,
    update: (dt, t, aim, move, air) => real?.update(dt, t, aim, move, air) ?? kick,
    view: (dt, t, s) => real?.view(dt, t, s),
    poseGun(pose, s) {
      if (real) return real.poseGun(pose, s);
      pivot.visible = false;
      return false;
    },
    get cheek() {
      return real?.cheek ?? 0;
    },
    onLifetime(fn) {
      if (real) return real.onLifetime(fn);
      fn(profile().total);
      later((c) => c.onLifetime(fn));
    },
    get lifetime() {
      return real?.lifetime ?? profile().total;
    },
    get skin() {
      return real?.skin ?? profile().skin;
    },
    setNet: (link, onSkin) => (real ? real.setNet(link, onSkin) : later((c) => c.setNet(link, onSkin))),
    setNetProfile: (p) => (real ? real.setNetProfile(p) : later((c) => c.setNetProfile(p))),
    netSnap: (pt, tg, mine) => real?.netSnap(pt, tg, mine),
    netEvents: (events, myId, muzzle) => real?.netEvents(events, myId, muzzle),
    get online() {
      return real?.online ?? false;
    },
    exit: () => real?.exit(),
  };
  return front;
}

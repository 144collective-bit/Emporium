/*
 * A player's profile: one Durable Object per account, named in the account
 * (accounts.ts: a hash of its id, or of its wallet's address for a wallet
 * that had a profile before accounts). Holds the player name (the account's
 * username), wardrobe look, rifle finish and lifetime score; the rank comes
 * from the score.
 *
 * Everything that comes in is checked against the shared lists in
 * profile-data.ts, so a profile can only ever hold allowed values.
 */
import { DurableObject } from 'cloudflare:workers';
import { DEFAULT_LOOK, cleanLook, rankFor, skinUnlocked, type Look, type SkinId } from '../../src/scripts/net/profile-data';
import type { OwnProfile } from '../../src/scripts/net/protocol';
import { weaponUnlocked, type WeaponId } from '../../src/scripts/city3d/combat-sim';
import type { Env } from './index';

interface Stored {
  name: string;
  look: Look;
  skin: SkinId;
  total: number;
  weapon?: WeaponId;
  created: number;
  seen: number;
}

export class Profile extends DurableObject<Env> {
  private p: Stored | null = null;

  private async load() {
    this.p ??= (await this.ctx.storage.get<Stored>('profile')) ?? null;
    return this.p;
  }
  private async save(p: Stored) {
    this.p = p;
    await this.ctx.storage.put('profile', p);
  }
  private view(p: Stored): OwnProfile {
    const weapon = weaponUnlocked(p.weapon, p.total) ? p.weapon! : 'rifle';
    // Cleaned on the way out too: looks saved by an older version get today's fields
    return { name: p.name, look: cleanLook(p.look), skin: p.skin, total: Math.floor(p.total), rank: rankFor(p.total).id, weapon, since: p.created };
  }

  /**
   * Load the profile under the account's username, making it on first visit.
   * Every new profile starts fresh (the owner's call: the online profile is
   * apart from the browser's solo save, and nothing from it comes along).
   */
  async open(name: string): Promise<OwnProfile> {
    let p = await this.load();
    const now = Date.now();
    if (!p) p = { name, look: { ...DEFAULT_LOOK }, skin: 'olive', total: 0, created: now, seen: now };
    p.name = name;
    p.seen = now;
    await this.save(p);
    return this.view(p);
  }

  async setLook(look: unknown) {
    const p = (await this.load())!;
    p.look = cleanLook(look);
    await this.save(p);
    return this.view(p);
  }

  async setSkin(skin: unknown) {
    const p = (await this.load())!;
    if (typeof skin === 'string' && skinUnlocked(skin as SkinId, p.total)) p.skin = skin as SkinId;
    await this.save(p);
    return this.view(p);
  }

  /** Remember the gun last taken at the store (only one the score has unlocked) */
  async setWeapon(w: unknown) {
    const p = (await this.load())!;
    if (weaponUnlocked(w, p.total)) p.weapon = w as WeaponId;
    await this.save(p);
    return this.view(p);
  }

  /** Points earned in a room (sent in batches) */
  async addScore(n: number) {
    const p = (await this.load())!;
    if (Number.isFinite(n) && n > 0) p.total += Math.min(n, 50_000);
    await this.save(p);
    return this.view(p);
  }
}

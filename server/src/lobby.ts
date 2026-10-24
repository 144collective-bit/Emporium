/*
 * The Lobby: one for the whole game, the Multiplayer menu's games (games.ts).
 *
 * - Quick join and Browse: the public hangout cities ("City 1", then "City 2"
 *   when that's full, and so on). Rooms report their real head count whenever
 *   someone joins or leaves; counts not refreshed for two minutes are empty.
 * - Private games, made from the menu and reached only by their link, kept in
 *   storage so a link still works after the Lobby has slept, until nobody has
 *   been in for a day.
 */
import { DurableObject } from 'cloudflare:workers';
import {
  PRIVATE_TTL,
  cityId,
  cleanCreate,
  gameOf,
  headCount,
  listGames,
  pickCity,
  privateAlive,
  privateId,
  type Count,
  type GameInfo,
  type GameMode,
  type PrivateGame,
} from '../../src/scripts/net/games';
import type { Env } from './index';

export class Lobby extends DurableObject<Env> {
  private counts = new Map<string, Count>();
  private privates: Map<string, PrivateGame> | null = null;
  private sweptAt = 0;

  /** The private games, read from storage once, the gone ones let go now and then */
  private async games() {
    if (!this.privates) {
      this.privates = new Map();
      for (const [k, g] of await this.ctx.storage.list<PrivateGame>({ prefix: 'p:' })) this.privates.set(k.slice(2), g);
    }
    const now = Date.now();
    if (now - this.sweptAt > PRIVATE_TTL / 24) {
      this.sweptAt = now;
      const gone = [...this.privates].filter(([id, g]) => !privateAlive(g, this.counts.get(id), now)).map(([id]) => id);
      for (const id of gone) this.privates.delete(id);
      if (gone.length) await this.ctx.storage.delete(gone.map((id) => `p:${id}`));
    }
    return this.privates;
  }

  /** Quick join: the first city with a free spot, reserved until its room reports in */
  async quick(): Promise<GameInfo> {
    const now = Date.now();
    const n = pickCity(this.counts, now);
    const id = cityId(n);
    const c = this.counts.get(id);
    this.counts.set(id, { n: headCount(c, now) + 1, at: now });
    return (await this.join(id))!;
  }

  /** The game behind an id (a city, or a private game still there), or null */
  async join(id: string): Promise<GameInfo | null> {
    return gameOf(id, await this.games(), this.counts, Date.now());
  }

  /** Browse: a mode's public games */
  async list(mode: GameMode): Promise<GameInfo[]> {
    return listGames(mode, this.counts, Date.now());
  }

  /** Make a private game (a ready mode on one of its maps); null when the request isn't one */
  async create(raw: unknown): Promise<GameInfo | null> {
    const want = cleanCreate(raw);
    if (!want) return null;
    const games = await this.games();
    let id = '';
    do id = privateId(crypto.getRandomValues(new Uint8Array(10)));
    while (games.has(id));
    const g: PrivateGame = { ...want, made: Date.now() };
    games.set(id, g);
    await this.ctx.storage.put(`p:${id}`, g);
    return this.join(id);
  }

  /** A room's head count (a private game with people in it lives on a day from its last report) */
  async report(id: string, n: number) {
    this.counts.set(id, { n, at: Date.now() });
  }
}

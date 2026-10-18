/*
 * The Lobby: one for the whole game. Hands each new player a city with a free
 * spot ("City 1", then "City 2" when that's full, and so on). Rooms report their
 * real head count whenever someone joins or leaves; counts not refreshed for two
 * minutes are treated as empty.
 */
import { DurableObject } from 'cloudflare:workers';
import { ROOM_SIZE } from '../../src/scripts/net/protocol';
import type { Env } from './index';

const STALE = 120_000;

export class Lobby extends DurableObject<Env> {
  private counts = new Map<string, { n: number; at: number }>();

  /** The first city with a free spot; reserves it until that room reports in */
  async assign(): Promise<string> {
    const now = Date.now();
    for (let i = 1; i <= 500; i++) {
      const name = `City ${i}`;
      const c = this.counts.get(name);
      const n = c && now - c.at < STALE ? c.n : 0;
      if (n < ROOM_SIZE) {
        this.counts.set(name, { n: n + 1, at: now });
        return name;
      }
    }
    return 'City 1';
  }

  async report(name: string, n: number) {
    this.counts.set(name, { n, at: Date.now() });
  }
}

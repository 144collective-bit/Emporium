import { NO_INPUT, createKartSim, tune } from './src/scripts/city3d/kart-sim';
import { KART_SPECS, PLAYER_KARTS } from './src/scripts/city3d/mykart';
const t0 = Date.now();
for (const course of ['riverside', 'riverside-reverse'] as const)
  for (const cls of ['street', 'sport', 'neon'] as const)
    for (const cond of ['day', 'rain'] as const) {
      const sim = createKartSim({ course, cup: 'time', cls, cond, player: { kart: 'rocket', tune: tune(KART_SPECS.rocket, cls) }, rivals: [], seed: 1, auto: true, laps: 2 });
      const laps: number[] = []; let last = 0; const c: Record<string, number> = {}; const where: string[] = [];
      for (let t = 0; t < 400 && !sim.done; t += 1 / 60)
        for (const e of sim.step(1 / 60, NO_INPUT)) {
          c[e.kind] = (c[e.kind] ?? 0) + 1;
          if ((e.kind === 'reset' || (e.kind === 'offtrack' && (e as any).on)) && where.length < 6) where.push(`${e.kind}@s${sim.player.s.toFixed(0)}`);
          if ((e.kind === 'lap' || e.kind === 'finish') && e.kart === sim.player.i) { laps.push(+(sim.time - last).toFixed(1)); last = sim.time; }
        }
      console.log(course, cls, cond, 'done', sim.done, 'laps', laps, 'clean', sim.player.cleanLaps, c.reset ?? 0, 'resets', where.join(' '));
    }
// a full field
const rivals = PLAYER_KARTS.flatMap((k) => [k, k]).slice(0, 7).map((k) => ({ kart: k, tune: tune(KART_SPECS[k], 'sport') }));
for (const course of ['riverside', 'riverside-reverse'] as const) {
  const sim = createKartSim({ course, cup: 'rookie', laps: 3, player: { kart: 'rocket', tune: tune(KART_SPECS.rocket, 'sport') }, rivals, seed: 3, auto: true });
  const c: Record<string, number> = {}; let maxY = 0, minY = 9;
  for (let t = 0; t < 900 && !sim.over; t += 1 / 60) { for (const e of sim.step(1 / 60, NO_INPUT)) c[e.kind] = (c[e.kind] ?? 0) + 1; for (const k of sim.racers) { maxY = Math.max(maxY, k.y); minY = Math.min(minY, k.y); } }
  console.log(course, 'field over', sim.over, sim.time.toFixed(0), 's', JSON.stringify(c), 'y', minY.toFixed(2), maxY.toFixed(2));
}
console.log('ms', Date.now() - t0);

/*
 * The bandstand's benches and the Lakehouse Café's tables (docs/westlake-plan.md Phase 6; DOM-free, tested in
 * tests/westlake.test.ts): drawing only, so out of the boot (parkstands3d.ts, in the park's chunk, reads them).
 */
import { BANDSTAND, LAKEHOUSE, type Pt } from './westlake';

/** Benches in a ring round it on the lawn, facing it */
export const BANDSTAND_BENCHES: { at: Pt; ry: number }[] = Array.from({ length: 8 }, (_, k) => {
  // (the open side towards the lake, south: no bench there)
  const a = Math.PI / 2 + ((k + 1) / 9) * Math.PI * 2;
  const at: Pt = [BANDSTAND.c[0] + Math.cos(a) * 6.2, BANDSTAND.c[1] + Math.sin(a) * 6.2];
  return { at, ry: Math.atan2(BANDSTAND.c[0] - at[0], BANDSTAND.c[1] - at[1]) };
});
/** The tables on the deck and on a strip in front of the pavilion, either side of its door (kept clear: docs/westlake-plan.md Phase 7): where each stands (their chairs round them) */
export const CAFE_TABLES: Pt[] = [
  ...[-27.2, -26, -24.8].flatMap((z): Pt[] => [[-67.8, z], [-66.2, z]]),
  ...[-27.7, -22.3].map((z): Pt => [LAKEHOUSE.rect[0] - 1.15, z]),
];

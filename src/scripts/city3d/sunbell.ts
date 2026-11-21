/*
 * Sunridge's school bell (docs/suburb-plan.md Phase 7), DOM-free (tested in tests/sunbell.test.ts): on weekdays it
 * rings for the start of school, break and its end, lunch and its end, and home time, by the visitor's clock as the
 * school's live line keeps it ("In class till three", livelines.ts). sound.ts rings it, heard across Sunridge.
 */

/** When it rings (hour, minute), weekdays only */
export const SCHOOL_BELLS: [number, number][] = [
  [8, 0],
  [10, 30],
  [10, 45],
  [12, 0],
  [12, 45],
  [15, 0],
];

/** Whether the bell rings in this minute (dow: 0 Sunday to 6 Saturday, as Date's `getDay()`) */
export function bellDue(dow: number, h: number, m: number): boolean {
  return dow >= 1 && dow <= 5 && SCHOOL_BELLS.some(([bh, bm]) => bh === h && bm === m);
}

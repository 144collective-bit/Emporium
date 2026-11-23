/*
 * The visitor's clock (DOM-free): the local day's count, weekday and hour at a time, and an hour as a clock reads it.
 * The live lines read it (livelines.ts); it was the stadium's fixtures' (stadium.ts, removed 2026-11-22, the owner's
 * call).
 */

/** The visitor's clock at t (ms): the local day's count (days since the epoch, local), its weekday and the hour (fractional) */
export interface Clock {
  day: number;
  dow: number;
  hour: number;
}
export function clockAt(t: number): Clock {
  const d = new Date(t);
  return { day: Math.floor((t - d.getTimezoneOffset() * 60000) / 86400000), dow: d.getDay(), hour: d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600 };
}

/** An hour (fractional, local) as a clock reads it: 7:30 pm, 9 am */
export function clockText(hour: number): string {
  const whole = Math.floor(hour);
  let m = Math.round((hour - whole) * 60);
  let h = whole;
  if (m === 60) {
    m = 0;
    h++;
  }
  h = ((h % 24) + 24) % 24;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'am' : 'pm'}`;
}

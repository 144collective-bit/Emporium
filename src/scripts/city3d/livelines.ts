/*
 * The live lines (the polish plan's Phase 7, docs/polish-plan.md: the dead
 * ends made live). Every place whose panel says "coming soon" gets one short
 * line under its marquee that changes with the visitor's clock and the place
 * (`liveLine()`): the stadium's next fixture and kick-off, the club's set
 * tonight, the bar's happy hour, the mall's hours, the fountain show's and
 * the volcano's countdowns from the Neon Mile's own timetables, the ferry
 * hall's next sailing from the river bus's, Liberty Bridge's next lift from
 * the tall ship's, the Night Market open after dusk, the Harbour Master's
 * tide, Crestmont's and Sunridge's hours, City Hall's doors and its council. `bouncerLine()` is what Club
 * PULSE's bouncer says when you try the door (walk mode's toast).
 *
 * DOM-free (tested in tests/livelines.test.ts) and a chunk of its own,
 * fetched the first time a panel opens (index.ts `loadLines()`), so the boot
 * carries none of it. Made-up, fixed copy: never a price, never a number that
 * reads as money; each line about eight words (the menu plan's rule), the
 * owner's to change. The timetables are the same for everyone (the clock);
 * the hours are the visitor's own.
 */
import { clockAt, clockText, fixtureAt, type Clock } from './stadium';
import { ERUPT, SHOW, eruptionAt, showAt } from './stripmarks';
import { BUSES, BUS_VIEW, LOOP_T, dwellStart } from './riverroute';
import { BUS } from './riverbus';
import { SHIP_TIMES, SHUT_WINDOWS, leavesAt } from './liberty';
import { FILMS } from './uptownsites';

/** The places with a line (every coming-soon panel, and the landmarks with a timetable) */
export const LIVE_IDS = [
  'stadium',
  'club',
  'bar',
  'mall',
  'palmcourt',
  'wildace',
  'dragonspire',
  'scarab',
  'bigcity',
  'gondolier',
  'lagoon',
  'orbit',
  'sphere',
  'harbourmaster',
  'hotel',
  'civichall',
  'golfclub',
  'overlook',
  'reservoir',
  'lot9',
  'pier',
  'nightmarket',
  'trenches',
  'tower',
  'sunclub',
  'sunpark',
  'sunschool',
  'liberty',
  'cityhall',
  'police',
  'courthouse',
] as const;
export type LiveId = (typeof LIVE_IDS)[number];

/** Club PULSE's DJs, one a night (made up) */
export const DJS = ['NOVA KLINE', 'DJ RUST', 'MIDNIGHT MARA', 'THE SIGNALMAN', 'VELVET ECHO', 'LOW TIDE', 'BASS KITTEN'];
/** What the bouncer says at the door, in turn by the minute */
export const BOUNCER_LINES = ['Members tonight · Coming soon', 'Guest list only · Try the bar', 'Not tonight, friend · Feel the bass', 'Doors shut for now · Coming soon'];
/** Sunset by the month (local, about; a mid-latitude summer-time year), for the viewpoints' lines */
export const SUNSET = [17, 17.5, 18.1, 19.6, 20.1, 20.6, 20.6, 20.1, 19.3, 18.5, 17, 16.8];
/** The Harbour Master's tide (made up): high water every twelve hours and twenty-five minutes */
export const TIDE = { period: 12.42 * 3600, epoch: 3.2 * 3600 };

const title = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()).replace(/\bFc\b/, 'FC').replace(/\bDj\b/, 'DJ');
/** Seconds as a countdown reads: 1:40 */
export const mmss = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;
const between = (h: number, a: number, b: number) => (a <= b ? h >= a && h < b : h >= a || h < b);
const weekday = (c: Clock) => c.dow >= 1 && c.dow <= 5;

/** The next time the river bus leaves Pier 7's landing (seconds from `t`), or how long the one at the landing has left (`here`) */
export function pierSailing(t: number): { wait: number; here: boolean } {
  const leave = dwellStart('pier7') + BUS.dwell;
  let best = Infinity;
  let here = false;
  for (let i = 0; i < BUSES; i++) {
    const tau = (((t + (i * LOOP_T) / BUSES) % LOOP_T) + LOOP_T) % LOOP_T;
    const wait = ((leave - tau) % LOOP_T + LOOP_T) % LOOP_T;
    if (wait < best) {
      best = wait;
      here = wait <= BUS.dwell;
    }
  }
  return { wait: best, here };
}
/** Liberty Bridge's next lift (seconds from `t`), or 0 while the leaves are up */
export function nextLift(t: number): number {
  if (leavesAt(t).shut) return 0;
  const p = ((t % SHIP_TIMES.period) + SHIP_TIMES.period) % SHIP_TIMES.period;
  const half = SHIP_TIMES.period / 2;
  let best = Infinity;
  SHUT_WINDOWS.forEach(([start], h) => {
    const at = h * half + start;
    const wait = ((at - p) % SHIP_TIMES.period + SHIP_TIMES.period) % SHIP_TIMES.period;
    best = Math.min(best, wait);
  });
  return best;
}
/** The next high water (hours from `t`, seconds), and the clock's reading of it */
export function highWater(t: number): { wait: number; at: string } {
  const wait = ((TIDE.epoch - t) % TIDE.period + TIDE.period) % TIDE.period;
  return { wait, at: clockText(clockAt((t + wait) * 1000).hour) };
}

/** The line for a place at the clock's `t` (ms), or null for a place without one */
export function liveLine(id: string, t = Date.now()): string | null {
  const c = clockAt(t);
  const h = c.hour;
  const s = t / 1000;
  const dj = title(DJS[((c.day % DJS.length) + DJS.length) % DJS.length]);
  const film = title(FILMS[((c.day % FILMS.length) + FILMS.length) % FILMS.length]);
  const sunset = SUNSET[new Date(t).getMonth()];
  switch (id as LiveId) {
    case 'stadium': {
      const f = fixtureAt(t);
      const sides = `${title(f.home)} v ${title(f.away)}`;
      if (f.on) return `Match on · ${sides}`;
      if (f.daysAway === 0) return `Tonight · ${sides} · ${clockText(f.kickoff)}`;
      return `Next: ${sides} · ${title(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][f.dow])} ${clockText(f.kickoff)}`;
    }
    case 'club':
      if (between(h, 22, 4)) return `${dj} on now · Guest list only`;
      if (between(h, 20, 22)) return `Doors at ten · ${dj} tonight`;
      return `Opens at ten · Tonight: ${dj}`;
    case 'bar':
      if (between(h, 17, 19)) return 'Happy hour till seven · Snacks at the door';
      if (between(h, 11, 17)) return 'Open · Happy hour at five';
      if (between(h, 19, 2)) return 'Open late · Snacks at the door';
      return 'Opens at eleven';
    case 'mall':
      return between(h, 9, 21) ? 'Open till nine · Food court on the terrace' : 'Doors open at nine';
    case 'palmcourt':
      if (between(h, 21, 23.5)) return `Late film on · ${film}`;
      return between(h, 9, 21) ? `Shops till nine · Tonight's film: ${film}` : 'Shops open at nine';
    case 'wildace':
      return between(h, 21, 1) ? 'Starlight Revue on now' : 'Pool open · Starlight Revue at nine';
    case 'dragonspire':
      return between(h, 19, 23) ? 'Feast on in the great hall' : 'Joust at seven · Feast after';
    case 'scarab':
      return h >= sunset || h < 5 ? 'Beam lit · Tomb tour on the hour' : 'Beam lit at dusk · Tomb tour on the hour';
    case 'bigcity':
      return between(h, 10, 0) ? 'Coaster running till midnight' : 'Coaster opens at ten';
    case 'gondolier': {
      const on = showAt(s);
      if (on >= 0) return `Fountain show on · Ends in ${mmss(SHOW.length - on)}`;
      return `Next fountain show in ${mmss(SHOW.period - (((s % SHOW.period) + SHOW.period) % SHOW.period))}`;
    }
    case 'lagoon': {
      const e = eruptionAt(s);
      if (e.s >= 0) return "The volcano's erupting · Stand back";
      const since = (((s - ERUPT.offset) % ERUPT.period) + ERUPT.period) % ERUPT.period;
      return `Volcano erupts in ${mmss(ERUPT.period - since)}`;
    }
    case 'orbit':
      return between(h, 10, 1) ? 'Saucer deck open · Last lift at one' : 'Saucer deck opens at ten';
    case 'sphere':
      return h >= sunset || h < 2 ? 'Full glow · Slides on loop till two' : 'Slides on loop · Full glow from dusk';
    case 'harbourmaster': {
      const hw = highWater(s);
      return hw.wait < 1800 ? `ORCA STAR alongside · High water now` : `ORCA STAR alongside · High water at ${hw.at}`;
    }
    case 'hotel':
      if (between(h, 6, 11)) return 'Breakfast on the terrace till eleven';
      if (between(h, 11, 15)) return 'Check-in from three · Pool open';
      if (between(h, 15, 23)) return 'Valets on · Pool open till ten';
      return 'Night porter on · Breakfast from six';
    case 'civichall':
      if (c.dow === 2 && between(h, 10, 16)) return 'Council sits today · Gallery open';
      if (weekday(c) && between(h, 9, 17)) return 'Open till five · Records room upstairs';
      return 'Closed · Open weekdays from nine';
    case 'cityhall':
      // (the council sits on Thursday evenings; the doors open on weekdays)
      if (c.dow === 4 && between(h, 18, 21)) return 'The council sits tonight · Gallery full';
      if (weekday(c) && between(h, 9, 17)) return 'Doors open till five · Permits upstairs';
      return 'Doors shut · Open weekdays at nine';
    case 'police':
      return h >= 22 || h < 6 ? 'Night shift on · Front desk open' : 'Front desk open · Patrols out';
    case 'courthouse':
      if (weekday(c) && between(h, 9, 16)) return c.dow === 1 ? 'Court in session · New week, full list' : 'Court in session till four';
      return 'Court rises · Sits weekdays at nine';
    case 'golfclub':
      if (between(h, 7, 17)) return 'Tee times till five · Nineteenth hole after';
      if (between(h, 17, 22)) return 'Course closed · Clubhouse open till ten';
      return 'First tee at seven';
    case 'overlook':
      return h >= sunset || h < 5 ? 'City lights below · Stars over the hills' : `Sunset about ${clockText(sunset)} · Benches at the rail`;
    case 'reservoir':
      if (between(h, 6, 12)) return 'Still water · Patrol due at noon';
      if (between(h, 12, 18)) return "Still water · Patrol's been · Valve house locked";
      return 'Still water under the stars · Gate locked';
    case 'lot9':
      if (between(h, 8, 18)) return "Office open till six · Laundry's on";
      if (between(h, 18, 2)) return 'Fire pit lit · Radio on';
      return 'Lights out · Dogs asleep';
    case 'pier': {
      const b = pierSailing(s + BUS_VIEW.offset);
      return b.here ? 'River bus at the landing · Leaving soon' : `Next river bus in ${mmss(b.wait)}`;
    }
    case 'nightmarket':
      if (between(h, 17, 18)) return 'Stalls firing up · Open at dusk';
      if (between(h, 18, 0)) return 'Stalls open · Hot food till midnight';
      if (between(h, 0, 1)) return 'Last orders · Lanterns out at one';
      return 'Opens at dusk · Lanterns lit at six';
    case 'trenches':
      if (between(h, 19, 23)) return 'Floodlights on · Late game';
      if (between(h, 15, 19) || (!weekday(c) && between(h, 10, 15))) return 'Pick-up game on · Everyone plays';
      if (between(h, 7, 15)) return 'Court quiet · Kids out after three';
      return 'Court quiet · Stoops till late';
    case 'tower':
      return h >= sunset || h < 5 ? 'Sky deck open late · City lights' : `Sky deck open · Sunset about ${clockText(sunset)}`;
    case 'sunclub':
      return between(h, 7, 20) ? 'Pool open till eight · Courts booked' : 'Pool closed · Opens at seven';
    case 'sunpark':
      return between(h, 6, 22) ? 'Playground open · Walk the loop' : 'Park closes at ten · Sprinklers at dawn';
    case 'sunschool':
      if (!weekday(c)) return 'No school today · Playground open';
      if (between(h, 8, 15)) return 'In class till three';
      if (between(h, 15, 16)) return "Bell's gone · Buses at the bay";
      return "School's out · Back at eight";
    case 'liberty': {
      const wait = nextLift(s);
      return wait <= 0 ? 'Leaves up for the tall ship · Mind the gates' : `Leaves lift in ${mmss(wait)} · Tall ship due`;
    }
    default:
      return null;
  }
}

/** What Club PULSE's bouncer says when you try the door (walk mode's toast): a line in turn by the minute, the set after it */
export function bouncerLine(t = Date.now()): string {
  const line = BOUNCER_LINES[Math.floor(t / 60000) % BOUNCER_LINES.length];
  const c = clockAt(t);
  const dj = title(DJS[((c.day % DJS.length) + DJS.length) % DJS.length]);
  return between(c.hour, 22, 4) ? `${line} · ${dj} on now` : line;
}

/*
 * Your records at the kart park in HTML: the City-view panel's summary
 * (index.ts, at the boot) and the hut's menu (kart-ui.ts, loaded with the
 * race) both use them.
 */
import { CUPS, CUP_IDS } from './kart-sim';
import { COURSES, COURSE_IDS, type CourseId } from './kartcircuit';
import { PLAYER_KARTS } from './mykart';
import { ownsKart, recordKey, type TycoonSave } from './tycoon';
import { clockOf, esc, fmt } from './ui';

const I = (body: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
/** A trophy (a cup on a plinth), for the series */
export const TROPHY = I('<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5.5a2.5 2.5 0 0 0 2.5 4M16 6h2.5a2.5 2.5 0 0 1-2.5 4M12 13v4M9 20h6l-.5-3h-5z"/>');

export const ord = (n: number) => (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
export const placeOf = (n: number) => `${n}${ord(n)}`;

/** A course's name without " · reverse", and a small tag when it is the reverse */
export const courseLabel = (id: CourseId) => {
  const c = COURSES[id];
  return `${esc(c.name.replace(' · reverse', ''))}${c.reverse ? '<i class="kart-rev">rev</i>' : ''}`;
};
export const NONE = '<span class="race-none">No time yet</span>';

/** Your trophies, one line: "Rookie Cup 1st · Pro Cup 3rd" (or none yet) */
export function trophyLine(s: TycoonSave) {
  const won = CUP_IDS.filter((id) => s.karts.trophies[id]);
  return won.length ? won.map((id) => `<span class="kart-trophy is-${s.karts.trophies[id]}">${TROPHY}${esc(CUPS[id].name)} ${placeOf(s.karts.trophies[id]!)}</span>`).join('') : '<span class="race-none">None yet</span>';
}
/** The lifetime counters the park keeps */
export function countersHtml(s: TycoonSave) {
  const c = s.counters;
  return `  <div><dt>Kart races</dt><dd>${fmt.format(c.kartRaces)}</dd></div>
  <div><dt>Podiums</dt><dd>${fmt.format(c.podiums)}</dd></div>
  <div><dt>Wins</dt><dd>${fmt.format(c.kartWins)}</dd></div>
  <div><dt>Clean laps</dt><dd>${fmt.format(c.cleanLaps)}</dd></div>
  <div><dt>Overtakes</dt><dd>${fmt.format(c.overtakes)}</dd></div>`;
}

/** A compact summary of your records at the park, for the City-view panel (index.ts): best lap per course at Sport, trophies, counters */
export function kartRecordsHtml(s: TycoonSave) {
  const owned = PLAYER_KARTS.filter((id) => ownsKart(s, id)).length;
  const best = (id: CourseId) => {
    const t = s.karts.records[recordKey(id, 'sport')];
    return t === undefined ? NONE : clockOf(t.lap);
  };
  return `<p class="kart-records-head">Best laps · Sport class</p>
<dl class="race-meta kart-records">
${COURSE_IDS.map((id) => `  <div class="kart-record-time"><dt>${courseLabel(id)}</dt><dd>${best(id)}</dd></div>`).join('\n')}
  <div class="kart-record-wide"><dt>Trophies</dt><dd class="kart-trophies">${trophyLine(s)}</dd></div>
${countersHtml(s)}
  <div><dt>Karts</dt><dd>${owned} of ${PLAYER_KARTS.length}</dd></div>
</dl>`;
}

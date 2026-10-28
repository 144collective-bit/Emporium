/**
 * Your record at the Fight Club, as HTML: the City-view panel's summary (index.ts) and the trainer's Record
 * tab (fight-ui.ts). In the boot on its own, so the trainer's menu can load the first time it opens
 * (docs/tailoring-plan.md Phase 0).
 */
import { BOT_LEVELS, FIGHT_BOTS, type BotLevel } from './catalog';
import type { PartnerId, StyleId } from './fight-moves';
import type { TycoonSave } from './tycoon';
import { esc, fmt } from './ui';

/**
 * The fight record on the save (tycoon.ts, v8): your style and the styles
 * you own, the lifetime counts and your record against each opponent. Read
 * through `fightOf()` so a save from before the Fight Club paints as empty.
 */
export interface FightSave {
  style: StyleId;
  styles: StyleId[];
  wins: number;
  losses: number;
  kos: number;
  bestChain: number;
  bouts: number;
  spars: number;
  bots: Partial<Record<BotLevel, { beaten: number; bestSeconds: number | null }>>;
  /** The sparring partners on the street (brawlsite.ts) */
  partners: Partial<Record<PartnerId, { spars: number; beaten: number }>>;
}
const EMPTY_FIGHT: FightSave = { style: 'brawler', styles: ['brawler'], wins: 0, losses: 0, kos: 0, bestChain: 0, bouts: 0, spars: 0, bots: {}, partners: {} };
export const fightOf = (s: TycoonSave): FightSave => (s as TycoonSave & { fight?: FightSave }).fight ?? EMPTY_FIGHT;

/** "1:30" from seconds (rounded up, so a bout's clock starts on the full round) */
export const clock = (sec: number) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
export const times = (n: number) => `${fmt.format(n)} time${n === 1 ? '' : 's'}`;
const NONE = '<span class="race-none">Not beaten yet</span>';

/** Your record against one opponent: beaten n times, your best time */
export function botLine(f: FightSave, b: BotLevel) {
  const r = f.bots[b];
  if (!r || r.beaten <= 0) return NONE;
  return `Beaten ${times(r.beaten)}${r.bestSeconds !== null && r.bestSeconds !== undefined ? ` · best ${clock(r.bestSeconds)}` : ''}`;
}
/** The lifetime counts, as rows of a `race-meta` list */
export function countsHtml(f: FightSave) {
  return `  <div><dt>Wins</dt><dd>${fmt.format(f.wins)}</dd></div>
  <div><dt>Losses</dt><dd>${fmt.format(f.losses)}</dd></div>
  <div><dt>Knock-outs</dt><dd>${fmt.format(f.kos)}</dd></div>
  <div><dt>Best chain</dt><dd>${f.bestChain > 0 ? `${f.bestChain} hits` : '<span class="race-none">—</span>'}</dd></div>`;
}
/** Each opponent's line */
export const botsHtml = (f: FightSave) => BOT_LEVELS.map((b) => `  <div class="fight-record-bot"><dt>${esc(FIGHT_BOTS[b].name)}</dt><dd>${botLine(f, b)}</dd></div>`).join('\n');

/** A compact summary of your record at the gym, for the City-view panel (index.ts): wins, losses, knock-outs, best chain and each opponent */
export function fightRecordHtml(s: TycoonSave) {
  const f = fightOf(s);
  return `<p class="fight-records-head">Your record</p>
<dl class="race-meta fight-records">
${countsHtml(f)}
${botsHtml(f)}
</dl>`;
}


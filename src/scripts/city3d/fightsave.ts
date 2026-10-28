/*
 * The Fight Club's rules on the save (docs/fight-plan.md, docs/inventory-plan.md Phase 3): what a fight pays and
 * records, and the styles the trainer sells. DOM-free, tested in tests/fight.test.ts and tests/spar.test.ts; on
 * their own, out of tycoon.ts, so they load with the fight and the trainer's menu, not in the city's boot. The save
 * itself (its `fight`, the counters, the ledger, XP) is tycoon.ts's.
 */
import { FIGHT_BOTS, SPAR_HIT_CAP, STYLE_CATALOG, XP, type BotLevel } from './catalog';
import { PARTNER_IDS, type PartnerId, type StyleId } from './fight-moves';
import { addXp, book, count, pay, type BuyResult, type TycoonSave } from './tycoon';

/** What a fight paid (the bout card shows it) */
export interface FightResult {
  prize: number;
  xp: number;
  levels: number;
  won: boolean | null;
}
/**
 * A fight is over (fight.ts): a spar (XP for taking part and a little per hit, capped) or a bout
 * (a purse by opponent for a win, XP either way), knock-outs and chains counted, the record kept.
 * A quit bout is a loss; a quit spar still counts its hits.
 */
export function finishFight(s: TycoonSave, r: { kind: 'spar' | 'bout' | 'street'; bot: BotLevel; partner?: PartnerId; won: boolean | null; hits: number; kos: number; bestChain: number; seconds: number; quit?: boolean }): FightResult {
  const bot = FIGHT_BOTS[r.bot] ?? FIGHT_BOTS.easy;
  const hits = Math.max(0, Math.round(r.hits));
  const kos = Math.max(0, Math.round(r.kos));
  const chain = Math.max(0, Math.round(r.bestChain));
  let xp = 0;
  let prize = 0;
  const F = s.fight;
  if (r.kind === 'spar') {
    F.spars++;
    xp += XP.spar + Math.min(SPAR_HIT_CAP, hits * XP.sparHit);
  } else if (r.kind === 'street') {
    // A street spar with a partner (no Dorras): XP as a spar, more for a win; each partner's record, the first win over each counted
    const id = r.partner && PARTNER_IDS.includes(r.partner) ? r.partner : null;
    F.spars++;
    count(s, 'streetSpars', 1);
    xp += XP.spar + Math.min(SPAR_HIT_CAP, hits * XP.sparHit) + (r.won ? XP.streetWin : 0);
    if (id) {
      const p = F.partners[id] ?? { spars: 0, beaten: 0 };
      p.spars++;
      if (r.won) {
        if (p.beaten === 0) count(s, 'partnersBeaten', 1);
        p.beaten++;
      }
      F.partners[id] = p;
    }
  } else {
    F.bouts++;
    count(s, 'bouts', 1);
    if (r.won) {
      F.wins++;
      count(s, 'fightWins', 1);
      xp += XP.boutWin;
      prize = bot.prize;
      const b = F.bots[r.bot] ?? { beaten: 0, bestSeconds: null };
      b.beaten++;
      const secs = Math.round(r.seconds * 100) / 100;
      if (secs > 0 && (b.bestSeconds === null || secs < b.bestSeconds)) b.bestSeconds = secs;
      F.bots[r.bot] = b;
    } else {
      F.losses++;
      xp += r.quit ? 0 : XP.boutLoss;
    }
  }
  F.kos += kos;
  if (kos) {
    count(s, 'kos', kos);
    xp += XP.fightKo * kos;
  }
  if (chain > F.bestChain) F.bestChain = chain;
  if (chain >= 3) {
    count(s, 'chains', 1);
    xp += XP.chain;
  }
  if (prize > 0) {
    s.dorras += prize;
    book(s, 'fighting', prize);
  }
  const levels = addXp(s, xp);
  return { prize, xp, levels, won: r.kind === 'spar' ? null : !!r.won };
}


/* ---------- The trainer's styles (the Fight Club, docs/fight-plan.md Phase 3) ---------- */

export const ownsStyle = (s: TycoonSave, id: StyleId) => s.fight.styles.includes(id);
/** Buy a fight style at the trainer (Dorras and a level); it's picked straight away */
export function buyStyle(s: TycoonSave, id: StyleId): BuyResult {
  const c = STYLE_CATALOG[id];
  if (!c) return { ok: false, why: 'place' };
  if (ownsStyle(s, id)) return { ok: false, why: 'owned' };
  const r = pay(s, c.price, c.level, 'fightclub');
  if (!r.ok) return r;
  s.fight.styles.push(id);
  s.fight.style = id;
  count(s, 'bought', 1);
  return r;
}
/** Fight in a style you own (in the ring and on the street) */
export function pickStyle(s: TycoonSave, id: StyleId) {
  if (!ownsStyle(s, id)) return false;
  s.fight.style = id;
  return true;
}

// The Fight Club's moves and styles (docs/fight-plan.md), DOM-free data: on their own, out of fight-sim.ts,
// so the screens (fight-ui.ts) and the save's rules (tycoon.ts) read them without bringing the whole fight
// into the city's boot (performance phase 2: features load when they're used); fight-sim.ts re-exports them.

export type MoveId = 'jab' | 'cross' | 'hook' | 'uppercut' | 'frontKick' | 'roundhouse' | 'dodge';
export type MoveKind = 'punch' | 'kick' | 'dodge';
export type Limb = 'armL' | 'armR' | 'legL' | 'legR';

export interface MoveSpec {
  id: MoveId;
  name: string;
  kind: MoveKind;
  /** The striking limb (the clip animates it; the strike point is in front of the fighter either way) */
  limb: Limb;
  /** Frames at 60 Hz */
  startup: number;
  active: number;
  recovery: number;
  /** How far in front of the fighter's centre the strike reaches (tiles), and the half-angle it covers (radians) */
  reach: number;
  arc: number;
  damage: number;
  /** Frames the target can't act after a clean hit */
  stun: number;
  /** How far the target is pushed back (tiles) */
  knockback: number;
  stamina: number;
  /** The step the fighter takes into the move over its start-up and active frames (tiles) */
  lunge: number;
  /** A heavy hit staggers (a longer stun, and a hit while staggered knocks down) */
  heavy: boolean;
  /** Knocks the target down on a hit */
  knockdown: boolean;
  /** What another punch chains into from this move's recovery, and what a kick does */
  next?: MoveId;
  kick?: MoveId;
}

export const MOVES: Record<MoveId, MoveSpec> = {
  jab: { id: 'jab', name: 'Jab', kind: 'punch', limb: 'armL', startup: 6, active: 3, recovery: 8, reach: 1.1, arc: 0.6, damage: 8, stun: 12, knockback: 0.15, stamina: 8, lunge: 0.25, heavy: false, knockdown: false, next: 'cross' },
  cross: { id: 'cross', name: 'Cross', kind: 'punch', limb: 'armR', startup: 8, active: 3, recovery: 12, reach: 1.2, arc: 0.55, damage: 12, stun: 14, knockback: 0.25, stamina: 10, lunge: 0.35, heavy: false, knockdown: false, next: 'hook', kick: 'roundhouse' },
  hook: { id: 'hook', name: 'Hook', kind: 'punch', limb: 'armL', startup: 10, active: 4, recovery: 16, reach: 1.0, arc: 0.8, damage: 16, stun: 20, knockback: 0.3, stamina: 12, lunge: 0.2, heavy: true, knockdown: false, next: 'uppercut', kick: 'roundhouse' },
  uppercut: { id: 'uppercut', name: 'Uppercut', kind: 'punch', limb: 'armR', startup: 12, active: 4, recovery: 24, reach: 0.9, arc: 0.5, damage: 24, stun: 30, knockback: 0.4, stamina: 18, lunge: 0.15, heavy: true, knockdown: true },
  frontKick: { id: 'frontKick', name: 'Front kick', kind: 'kick', limb: 'legR', startup: 10, active: 4, recovery: 16, reach: 1.5, arc: 0.45, damage: 14, stun: 16, knockback: 0.7, stamina: 14, lunge: 0.3, heavy: false, knockdown: false, kick: 'roundhouse' },
  roundhouse: { id: 'roundhouse', name: 'Roundhouse', kind: 'kick', limb: 'legR', startup: 14, active: 5, recovery: 22, reach: 1.4, arc: 0.95, damage: 22, stun: 24, knockback: 0.45, stamina: 20, lunge: 0.2, heavy: true, knockdown: false },
  dodge: { id: 'dodge', name: 'Dodge', kind: 'dodge', limb: 'legL', startup: 4, active: 10, recovery: 8, reach: 0, arc: 0, damage: 0, stun: 0, knockback: 0, stamina: 16, lunge: 0, heavy: false, knockdown: false },
};

/** How high a move strikes over the fighter's feet (tiles): a front kick at the body, the roundhouse higher, the uppercut under the chin, a punch at the head */
/** What a move hits for in a style (the Kickboxer's kicks hit harder) */
export const damageOf = (m: MoveSpec, style: StyleId) => (m.kind === 'kick' ? Math.round(m.damage * STYLES[style].kick) : m.damage);

export const strikeHeight = (m: MoveSpec) => (m.kind === 'kick' ? (m.id === 'roundhouse' ? 0.95 : 0.7) : m.id === 'uppercut' ? 1.0 : 1.05);

export type StyleId = 'brawler' | 'kickboxer' | 'street';

/** The styles: which moves a fighter has (bought at the trainer, catalog.ts STYLE_CATALOG; the Brawler is everyone's) */
export interface StyleSpec {
  id: StyleId;
  name: string;
  moves: MoveId[];
  /** A block timed just before the hit staggers the attacker */
  parry: boolean;
  /** How far a dodge steps */
  dodge: number;
  /** What its kicks' damage is multiplied by (the Kickboxer's hit harder) */
  kick: number;
}
export const STYLES: Record<StyleId, StyleSpec> = {
  brawler: { id: 'brawler', name: 'Brawler', moves: ['jab', 'cross', 'hook', 'frontKick', 'dodge'], parry: false, dodge: 1.2, kick: 1 },
  kickboxer: { id: 'kickboxer', name: 'Kickboxer', moves: ['jab', 'cross', 'hook', 'frontKick', 'roundhouse', 'dodge'], parry: false, dodge: 1.2, kick: 1.25 },
  street: { id: 'street', name: 'Street', moves: ['jab', 'cross', 'hook', 'uppercut', 'frontKick', 'roundhouse', 'dodge'], parry: true, dodge: 1.6, kick: 1 },
};

/** The sparring partners on the street (brawlsite.ts holds where they stand and how they fight): their ids and names, here so the save, the missions and the records read them without the partners' data in the boot */
export const PARTNER_IDS = ['duke', 'tash', 'sal'] as const;
export type PartnerId = (typeof PARTNER_IDS)[number];
export const PARTNER_NAMES: Record<PartnerId, string> = { duke: 'Big Duke', tash: 'Tash', sal: 'Old Sal' };

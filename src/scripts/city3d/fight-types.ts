/*
 * The Fight Club's parts agree through these interfaces: the gym in 3D
 * (fightclub.ts, `FightClub`), the trainer's menu, the HUD and the bout
 * card (fight-ui.ts, `FightUI`) and the fight on screen (fight.ts,
 * `Fight`). walk.ts and index.ts wire them together. The rules are
 * fight-sim.ts, the clips fight-anim.ts, the site fightsite.ts; none of
 * them depends on anything here.
 */
import type * as THREE from 'three';
import type { BotLevel } from './catalog';
import type { BoutPhase } from './fight-sim';
import type { Spot } from './landmarks';
import type { PartnerId } from './brawlsite';
import type { StyleId } from './fight-moves';
import type { FightResult } from './fightsave';
import type { GameDeps } from './ui';

/* ---------- The gym (fightclub.ts) ---------- */

export interface FightClub {
  /** Everything static on the lot */
  group: THREE.Group;
  /** The place (`fightclub`): its pin floats over the sign, the camera flies to the ring */
  spot: Spot;
  /** The ring lights and the sign: brighter while a fight is on */
  setLive(on: boolean): void;
}

/* ---------- The menu, the HUD and the bout card (fight-ui.ts) ---------- */

/** A spar or a bout in the ring, or a street spar with one of the partners on the street (brawlsite.ts) */
export type FightKind = 'spar' | 'bout' | 'street';
/** How a fight starts: against one of the gym's bots, or (a street spar) a partner */
export type FightStart = { kind: 'spar' | 'bout'; bot: BotLevel } | { kind: 'street'; partner: PartnerId };

export interface FightHud {
  kind: FightKind;
  you: string;
  opponent: string;
  /** 0..1 each */
  health: number;
  stamina: number;
  oppHealth: number;
  /** Out of stamina (walk and block only) */
  empty: boolean;
  blocking: boolean;
  /** The chain in progress (landed hits in a row); 0 none */
  chain: number;
  /** A bout: the round of how many, the seconds left in it (0 in a spar) and the bout's phase */
  round: number;
  rounds: number;
  clock: number;
  phase: BoutPhase;
  /** A knockdown count in progress: seconds left on the ground (0 when nobody's down), and who's down */
  count: number;
  down: 'you' | 'them' | null;
  /** Rounds won so far in a bout */
  score: [number, number];
  /** Snacks in the bag, and whether one can be eaten here (a spar or a street spar, not a bout) */
  snacks: number;
  canSnack: boolean;
}

export interface FightResultView {
  kind: FightKind;
  opponent: string;
  /** The opponent's style */
  style: StyleId;
  /** Won, lost, or neither (a spar, or a quit) */
  won: boolean | null;
  quit: boolean;
  /** Rounds won, you and them */
  rounds: [number, number];
  hits: number;
  taken: number;
  bestChain: number;
  kos: number;
  knockdowns: number;
  seconds: number;
  /** What it paid (fightsave.ts finishFight) */
  result: FightResult;
}

export interface FightUIDeps {
  game: GameDeps;
  /** Start a spar or a bout against a bot (fight.ts); the menu closes first */
  start(setup: FightStart): void;
  /** Eat a snack (the HUD's Snack button) */
  snack(): void;
  /** Opening the menu or the card frees the mouse and stops the walker; closing hands control back */
  onOpen(): void;
  onClose(): void;
  /** Quit a fight from the HUD (a bout quit counts as a loss; a spar just ends) */
  quit(): void;
}
export interface FightUI {
  /** The trainer's menu or the bout card is showing */
  readonly open: boolean;
  /** The trainer's menu: Spar (a partner at three levels), Bout (three rounds against a named opponent), Record, Styles (bought and picked) */
  show(): void;
  /** Close whatever's open (true if something was) */
  close(): boolean;
  /** Gamepad / keys: move the pick, take it */
  step(dir: number): void;
  take(): void;
  /** The fight HUD: on, then painted every frame */
  showHud(on: boolean): void;
  paintHud(h: FightHud): void;
  /** The big centre text (the bell's "Round 1", "FIGHT", the count "3 2 1", "K.O."; '' hides) */
  count(text: string): void;
  /** A short pop over the HUD: "3 hit chain", "Blocked", "Parry!", "Knockdown", "Tired" */
  pop(text: string, kind?: 'good' | 'bad' | 'plain'): void;
  /** The card after a fight (closing it hands control back through onClose) */
  showResult(r: FightResultView): void;
  /** Every frame while walking: repaints the menu once a second */
  update(dt: number): void;
}

/* ---------- The fight on screen (fight.ts) ---------- */

export interface FightInput {
  /** Walk, relative to the way you face: forward is towards the opponent, right is to your right */
  fwd: number;
  right: number;
  punch: boolean;
  kick: boolean;
  block: boolean;
  dodge: boolean;
}
export interface FightDeps {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  root: HTMLElement;
  club: FightClub;
  ui: FightUI;
  game: GameDeps;
  /** The ground under a point (walk.ts): a street spar's fighters stand on it */
  groundAt(x: number, z: number): number;
  /** The player's look (walk.ts setLook keeps it fresh): what your fighter wears */
  outfit(): import('./character').Outfit;
  sfx(kind: import('./combat').Sfx, gain?: number): void;
  reduced: boolean;
  low: boolean;
}
export interface Fight {
  /** In the ring: the bell, fighting, or done and waiting for the card to close */
  readonly active: boolean;
  /** The sim while a fight is on */
  readonly sim: import('./fight-sim').FightSim | null;
  /** Build the fight from the save (your fighter in your style with fists, the bot in its), put both in their corners (or the partner's spot), ring the bell */
  start(setup: FightStart): void;
  /** Eat a snack: some health back in a spar or a street spar (false, with a reason shown, when there's none or it's a bout) */
  snack(): boolean;
  /** One frame in the ring: step the sim with your input, draw both fighters, the camera, the HUD, the sounds */
  update(dt: number, inp: FightInput): void;
  /** Quit from the HUD or Esc: a spar ends and shows its card; a bout in progress is forfeited (a loss) and shows its card */
  quit(): void;
  /** Leave the ring or the street spar (after the card, or walk mode ending; an unfinished bout or street spar is a loss, quietly): where Degen stands, facing which way */
  exit(): { x: number; z: number; yaw: number };
  /** Every frame while not fighting (the sign and the ring lights idle) */
  idle(dt: number): void;
}

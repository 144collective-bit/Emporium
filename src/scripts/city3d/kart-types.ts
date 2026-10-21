/*
 * The kart park's three parts agree through these interfaces: the site in
 * 3D (kartpark3d.ts, `KartPark`), the menu, HUD and results (kart-ui.ts,
 * `KartUI`) and the race on screen (kart.ts, `KartRace`). walk.ts and
 * index.ts wire them together. The rules are kart-sim.ts, the layout
 * kartpark.ts; neither depends on anything here.
 */
import type * as THREE from 'three';
import type { CourseId } from './kartpark';
import type { CupId, ItemId, KartSim } from './kart-sim';
import type { KartResult, SeriesResult } from './tycoon';
import type { ClassId } from './catalog';
import type { KartId, MyKart } from './mykart';
import type { Spot } from './landmarks';
import type { GameDeps } from './ui';

/* ---------- The site (kartpark3d.ts) ---------- */

export interface KartPark {
  /** Everything static on the site */
  group: THREE.Group;
  /** The place (`karts`): its pin floats over the hut, the camera flies to the track */
  spot: Spot;
  /** Draw the boost pads and item boxes of the course being raced (idle: the Neon Loop's) */
  setCourse(id: CourseId): void;
  /** Which item boxes are gone (taken, respawning): one number per box in the sim's order, 0 = there; null shows them all */
  showBoxes(gone: number[] | null): void;
  /** Where the picked kart stands on show between races (in the pits), and which way it faces */
  showSpot: { x: number; y: number; z: number; yaw: number };
}

/* ---------- The menu, the HUD and the results (kart-ui.ts) ---------- */

export interface KartHud {
  place: number;
  of: number;
  lap: number;
  laps: number;
  /** Race time (seconds); negative during the countdown */
  time: number;
  item: ItemId | null;
  /** The item roulette is still spinning */
  roulette: boolean;
  /** The drift's stage (0..3) and whether a boost is on */
  driftTier: number;
  boost: boolean;
  shield: boolean;
  finished: boolean;
  /** A time trial: no place or rivals */
  timeTrial: boolean;
  /** The engine class */
  cls: ClassId;
  /** The last lap and the best lap so far this race (null before the first) */
  lastLap: number | null;
  bestLap: number | null;
  /** In a time trial: seconds behind (positive) or ahead (negative) of the ghost at this point; null without one */
  ghostGap: number | null;
  /** The surface under the kart, and whether it's on the shortcut */
  surface: 'dry' | 'wet' | 'dirt' | 'bank' | 'tunnel';
  shortcut: boolean;
  /** A series: which race this is (1-based) of how many; null for a single race */
  series: { race: number; of: number } | null;
}
export interface KartStanding {
  /** A rival's fixed name (from the sim's order) or 'You' */
  name: string;
  kart: KartId;
  place: number;
  /** Finish time, or null if still going when you finished */
  time: number | null;
  you: boolean;
}
export interface KartResultView {
  cup: CupId | 'time';
  cls: ClassId;
  course: CourseId;
  of: number;
  result: KartResult;
  standings: KartStanding[];
  /** Your lap times this race, and the par ghost's lap for this course and class */
  laps: number[];
  par: number;
  /** A series: the points table after this race (tycoon.ts seriesRace), with names in grid order */
  series: (SeriesResult & { names: { name: string; kart: KartId; you: boolean }[] }) | null;
}
export interface KartUIDeps {
  game: GameDeps;
  /** Start a race or a time trial in the picked kart (kart.ts); a cup starts its series (tycoon.ts startSeries) */
  start(setup: { course: CourseId; cup: CupId | 'time'; cls: ClassId }): void;
  /** From the results card of a series race: the next race (kart.ts starts seriesNext); or drop the series */
  nextRace(): void;
  quitSeries(): void;
  /** Show a kart being picked on the pits' spot (kart.ts); the save's pick is what's raced */
  preview(k: MyKart): void;
  /** Opening the menu or the results frees the mouse and stops the walker; closing hands control back */
  onOpen(): void;
  onClose(): void;
  /** Quit a race from the HUD (abandon: no prize) */
  quit(): void;
}
export interface KartUI {
  /** The hut menu or the results card is showing */
  readonly open: boolean;
  /** The hut's menu: Race (cups and courses, the time trial), Karts (buy, pick, mods, paints), Records */
  show(): void;
  /** Close whatever's open (true if something was) */
  close(): boolean;
  /** Gamepad / keys: move the pick, take it */
  step(dir: number): void;
  take(): void;
  /** The race HUD: on, then painted every frame */
  showHud(on: boolean): void;
  paintHud(h: KartHud): void;
  /** The big countdown digits (3, 2, 1, GO; '' hides) */
  count(text: string): void;
  /** A short pop over the HUD: "Final lap", "Shield!", "Spun out", "Boost!" */
  pop(text: string, kind?: 'good' | 'bad' | 'plain'): void;
  /** The results card after a race (closing it hands control back through onClose) */
  showResult(r: KartResultView): void;
  /** Every frame while walking: repaints the menu once a second */
  update(dt: number): void;
}

/* ---------- The race on screen (kart.ts) ---------- */

export interface KartRaceDeps {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  root: HTMLElement;
  park: KartPark;
  ui: KartUI;
  game: GameDeps;
  /** The player's look (walk.ts setLook keeps it fresh): what Degen wears in the kart */
  outfit(): import('./character').Outfit;
  sfx(kind: import('./combat').Sfx, gain?: number): void;
  /** The kart's engine (sound.ts engine()): revs 0..1, negative for off */
  engine(revs: number): void;
  reduced: boolean;
  low: boolean;
}
export interface KartRace {
  /** In the kart: counting down, racing, or finished and still rolling until the results close */
  readonly active: boolean;
  /** The sim while a race is on */
  readonly sim: KartSim | null;
  /** Build the race from the save (the picked kart with its mods, seven rivals for a cup at the class's pace), seat Degen, start the countdown */
  start(setup: { course: CourseId; cup: CupId | 'time'; cls: ClassId }): void;
  /** A time trial's ghosts: your best lap on this course and class, and the par ghost; each shown or hidden */
  setGhosts(on: { yours: boolean; par: boolean }): void;
  /** One frame in the kart: step the sim with the player's input, draw everything, paint the HUD, play the sounds */
  update(dt: number, inp: import('./kart-sim').KartInput): void;
  /** Leave the kart (after the results, or abandoning): where Degen stands up, facing which way */
  exit(): { x: number; z: number; yaw: number };
  /** Show a kart on the pits' spot (the hut menu's pick); null shows the saved pick */
  preview(k: MyKart | null): void;
  /** Every frame while not racing (the show kart turns, under reduced motion it stands) */
  idle(dt: number): void;
}

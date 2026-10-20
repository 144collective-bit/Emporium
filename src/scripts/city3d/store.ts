/*
 * Builder state: which district plots you own and what stands on them,
 * behind one small interface (Store) the build-mode UI talks to.
 *
 * Plots are property in the city's own game: bought, built on and sold back
 * with Dorras through the rules in tycoon.ts (buyPlot / buildPlot /
 * sellPlot; prices and the level needed in catalog.ts). Everything lives in
 * the tycoon save in this browser. Sales for PLS were retired.
 */
import { BUILD_COSTS, PLOT_LEVEL, PLOT_REFUND } from './catalog';
import type { Design, Plot, PlotState } from './plots';
import { buildPlot, buyPlot, level, ownsPlot, plotPrice, sellPlot, type BuyResult, type OwnedPlot } from './tycoon';
import type { GameDeps } from './ui';

export interface Store {
  /** Your Dorras and your level (the estate agent's terms) */
  dorras(): number;
  level(): number;
  /** What the next plot costs you, and the level it needs */
  price(): number;
  needLevel(): number;
  get(id: string): OwnedPlot | null;
  mine(id: string): boolean;
  /** Every plot that isn't for sale, and why */
  states(): Map<string, PlotState>;
  /** What putting `design` on a plot would cost (the difference from what's there) */
  buildCost(id: string, design: Design | null): number;
  buy(plot: Plot): BuyResult;
  build(id: string, design: Design): BuyResult;
  demolish(id: string): BuyResult;
  /** Sell a plot back to the city for a share of what you paid */
  sell(id: string): BuyResult;
  /** What selling it would pay */
  refund(id: string): number;
  subscribe(f: () => void): () => void;
  /** Something else changed the plots (the Vault's estate agent): repaint */
  poke(): void;
}

/** The store over the tycoon save: changes go through the rules, then commit() keeps and repaints everything */
export function createPlotStore(game: GameDeps): Store {
  const listeners = new Set<() => void>();
  const changed = () => listeners.forEach((f) => f());
  const done = (r: BuyResult) => {
    if (r.ok) game.commit();
    changed();
    return r;
  };
  return {
    dorras: () => game.save().dorras,
    level: () => level(game.save()),
    price: () => plotPrice(game.save()),
    needLevel: () => PLOT_LEVEL,
    get: (id) => game.save().plots[id] ?? null,
    mine: (id) => ownsPlot(game.save(), id),
    states() {
      return new Map(Object.keys(game.save().plots).map((id) => [id, 'mine' as PlotState]));
    },
    buildCost(id, design) {
      const was = game.save().plots[id]?.design;
      return Math.max(0, (design ? BUILD_COSTS[design.type] : 0) - (was ? BUILD_COSTS[was.type] : 0));
    },
    buy: (plot) => done(buyPlot(game.save(), plot.id, Date.now())),
    build: (id, design) => done(buildPlot(game.save(), id, design)),
    demolish: (id) => done(buildPlot(game.save(), id, null)),
    sell: (id) => done(sellPlot(game.save(), id)),
    refund(id) {
      const o = game.save().plots[id];
      return o ? Math.round(o.paid * PLOT_REFUND) : 0;
    },
    subscribe(f) {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    poke: changed,
  };
}

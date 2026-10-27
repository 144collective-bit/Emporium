/*
 * Free play: a test switch (the owner's call, while the inventory is built)
 * that makes everything in the city's game free. Every price is 0 Dorras and
 * every level and score requirement is gone: guns and their mods, cars,
 * karts and their classes, clothes, snacks, plots, units, lots, corner shops
 * and the places' upgrades, the rifle finishes. Things still have to be
 * bought (for nothing) to be owned, so every buy flow can be checked.
 *
 * It's set when the site is built: PUBLIC_FREE_PLAY=1 in the environment
 * (astro.config.mjs defines `__FREE_PLAY__`), today on the emporium-preview
 * Vercel project only. The live site's build, the game server and the tests
 * never set it, so they keep the real prices. DOM-free, no imports.
 */
declare const __FREE_PLAY__: boolean | undefined;
export const FREE_PLAY: boolean = typeof __FREE_PLAY__ !== 'undefined' && __FREE_PLAY__ === true;

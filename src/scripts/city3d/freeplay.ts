/*
 * Free play: a test switch (the owner's call, while the inventory is built)
 * that makes everything in the city's game free. Every price is 0 Dorras and
 * every level and score requirement is gone: guns and their mods, cars,
 * karts and their classes, clothes, snacks, units, lots, corner shops
 * and the places' upgrades, the rifle finishes. Things still have to be
 * bought (for nothing) to be owned, so every buy flow can be checked.
 *
 * It's set when the site is built (astro.config.mjs defines `__FREE_PLAY__`):
 * today on every build, the live site too, for the owner's test phase
 * ("everything is free for a limited time": `FREE_FOR_NOW` in
 * astro.config.mjs ends it), and by PUBLIC_FREE_PLAY=1 on a test build. The
 * game server and the tests never set it, so they keep the real prices.
 * DOM-free, no imports.
 */
declare const __FREE_PLAY__: boolean | undefined;
export const FREE_PLAY: boolean = typeof __FREE_PLAY__ !== 'undefined' && __FREE_PLAY__ === true;


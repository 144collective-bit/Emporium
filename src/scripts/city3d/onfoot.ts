/*
 * What walking loads with the animator (one chunk, fetched when walk mode
 * starts with `import('./animator')`, never in the boot): the emotes
 * (emotes.ts), the gaze (gaze.ts), the vault and climb (vault.ts) and the
 * moments' keyed poses (momentposes.ts). All four are on-foot only: walk.ts and remote.ts reach them through this
 * module once it's in (`onFoot` in walk.ts, `Motion.onFoot` in remote.ts),
 * and until then an emote is skipped, the gaze is still, nothing is
 * vaulted and a moment plays no pose (a moment after walking starts). The stage and the lab import the
 * modules directly (they're lazy chunks of their own); the hologram loads
 * the emotes on its own after the boot.
 */
export * from './emotes';
export * from './gaze';
export * from './vault';
export * from './momentposes';

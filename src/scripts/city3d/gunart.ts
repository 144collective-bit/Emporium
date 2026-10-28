/*
 * The guns' small side-on silhouettes (SVG paths in a 120 x 40 box), shared by
 * the gun store's cards (gunshop.ts) and the inventory's hotbar and Bag
 * (inventory-ui.ts), so the hotbar doesn't pull the store into the boot,
 * and how the guns compare for their stat bars.
 */
import type { Weapon, WeaponId } from './combat-sim';

/** How each gun compares (0..1) for the stat bars (of the stock gun, or the gun with its mods on); the inventory shows the first three */
export const STATS: { key: string; label: string; of: (w: Weapon) => number }[] = [
  { key: 'dmg', label: 'Damage', of: (w) => Math.min(1, (w.damage * w.pellets) / 90) },
  { key: 'rate', label: 'Fire rate', of: (w) => Math.min(1, w.rate / 15) },
  { key: 'range', label: 'Range', of: (w) => Math.min(1, w.range / 120) },
  { key: 'acc', label: 'Accuracy', of: (w) => 1 - Math.min(1, w.spreadAim / 0.05) * 0.9 },
  { key: 'mag', label: 'Magazine', of: (w) => Math.min(1, w.mag / 40) },
];

/** Small side-on silhouettes for the cards (SVG paths, 120 x 40) */
export const ART: Record<WeaponId, string> = {
  rifle:
    'M6 18h18v-3h4v-3h22v3h44v4h20v5H90v4H62l-4 2-2 9h-8l1-10h-8l-6 6h-6v-6H24v3H6z M44 10h12v-4h-12z',
  smg: 'M20 16h12v-4h16v4h30v3h12v5H80v3H62v12h-7V27h-6l-3 10h-7l2-11h-6v4h-8v-4H20z M48 9h10v-3H48z',
  shotgun: 'M4 20h14l10-6h20v3h66v4H48v4h36v4H48l-6 3-2 7h-8l1-9H26l-8 4H4z M50 13h3v-2h-3z',
  dmr: 'M2 18h20l4-4h28v-5h30v5h6v5h28v4H84v4H64l-4 2-2 9h-8l1-10h-6l-5 6h-6v-6H22l-4 3H2z M58 7h22v-4H58z',
  // The Hand Cannon: frame and long barrel, the cylinder, the hammer, the lug under the barrel, the front blade
  revolver: 'M26 12h78v7H52v3h-6l-5 3-2 10h-9l2-11-5-4-1-8z M34 10h12v12H34z M22 8h5v6h-5z M52 19h30v3H52z M100 9h3v3h-3z',
  // The Tri-Tap: a bullpup body with the magazine behind the grip, a short barrel, the carry handle and its sight
  burst: 'M8 15h64v2h26v-1h8v6h-8v-1H72v2H56l-2 11h-8l1-11h-9v10h-9V23H8z M26 9h32v3h-4v3H30v-3h-4z M38 4h8v5h-8z',
  // The Belt Feeder: stock, long receiver under its cover, finned barrel, the belt box under it, the bipod folded back
  lmg: 'M2 15h20v-3h48v3h34v-1h8v6h-8v-1H70v3H48l-3 11h-8l2-11h-9l-4 4h-4l-8 4H6l-4-3z M24 9h42v3H24z M50 22h20v10H50z M78 19h28l-2 3H80z M80 13h3v8h-3z M88 13h3v8h-3z M96 13h3v8h-3z',
};

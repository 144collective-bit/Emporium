/*
 * Account names (docs/account-plan.md Phase 4): a wallet's player name is
 * typed by the player, unique across accounts, with no word filter (the
 * owner's call, asked twice). What this does check is that a name is plain
 * text that can't break anything or pass for another one: 3 to 24 (the word-list names run to
 * 21) of the
 * plain letters, digits, spaces, `-` and `_` (so no letters from other
 * alphabets that look like ours, nothing invisible), starting and ending
 * with a letter or digit, spaces run together. Two names are the same name
 * (`nameKey()`) whatever their case and their spaces, `-` and `_`.
 * Guests keep the word-list names (profile-data.ts `guestName()`).
 *
 * DOM-free: the server (accounts.ts) holds the names; the profile card
 * (account-ui.ts) checks as you type. Tested in tests/names.test.ts.
 */
export const NAME_MIN = 3;
export const NAME_MAX = 24;

export type NameWhy = 'short' | 'long' | 'chars' | 'edge';
export type NameCheck = { ok: true; name: string } | { ok: false; why: NameWhy };

/** A name as typed, made tidy (trimmed, spaces run together) and checked */
export function cleanName(raw: unknown): NameCheck {
  if (typeof raw !== 'string') return { ok: false, why: 'chars' };
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length < NAME_MIN) return { ok: false, why: 'short' };
  if (name.length > NAME_MAX) return { ok: false, why: 'long' };
  if (!/^[A-Za-z0-9 _-]+$/.test(name)) return { ok: false, why: 'chars' };
  if (!/^[A-Za-z0-9]/.test(name) || !/[A-Za-z0-9]$/.test(name)) return { ok: false, why: 'edge' };
  return { ok: true, name };
}
/** What makes two names the same name */
export const nameKey = (name: string) => name.toLowerCase().replace(/[ _-]/g, '');

/** What the card says about a name that won't do */
export const NAME_WHY: Record<NameWhy | 'taken', string> = {
  short: `At least ${NAME_MIN} characters.`,
  long: `At most ${NAME_MAX} characters.`,
  chars: 'Letters, numbers, spaces, - and _ only.',
  edge: 'Start and end with a letter or a number.',
  taken: 'That name is taken. Try another.',
};

/*
 * This browser's guest token: a random secret kept in localStorage that ties
 * the browser to its player profile (the server only ever stores its hash).
 * Its own module, with nothing imported, so the Multiplayer menu can send it
 * without bringing the connection code (and what that imports) along.
 */
const TOKEN_KEY = 'degen-city-player-v1';

/** This browser's guest token, made on first use (the Multiplayer menu sends it to see the profile). Without storage it lasts for the visit. */
export function guestToken() {
  try {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved && /^[A-Za-z0-9_-]{32,128}$/.test(saved)) return saved;
  } catch {
    /* no storage: a fresh token each visit */
  }
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* fine */
  }
  return token;
}

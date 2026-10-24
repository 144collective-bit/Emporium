// Logging in (docs/multiplayer-plan.md, "Profiles and logging in"): the username filter, passwords and
// emails (net/auth.ts, the browser's and the server's), and the server's own helpers (server/src/login.ts):
// password hashes, the lock-out after wrong tries, and signing in with Google or Discord.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blockedList, emailOk, nameKey, passwordProblem, usernameProblem, USERNAME_MAX } from '../src/scripts/net/auth';
import { TRIES, authorizeUrl, backTo, checkPassword, discordId, googleId, hashPassword, lockedOut, pkce, sameHex, stale, tokenForm, wrongTry } from '../server/src/login';

test('ordinary usernames pass', () => {
  for (const n of ['NeonGecko', 'big_dave', 'Degen-42', 'Pixel_Fox_9', 'Classic', 'Scrape', 'Cassandra', 'Torpedo', 'Booker', 'Dickens2', 'Peacock', 'Sussex', 'abc', 'x'.repeat(USERNAME_MAX)])
    assert.equal(usernameProblem(n), null, n);
});

test('usernames keep to the shape', () => {
  assert.match(usernameProblem('ab')!, /3 to 16/);
  assert.match(usernameProblem('x'.repeat(USERNAME_MAX + 1))!, /3 to 16/);
  assert.match(usernameProblem('two words')!, /letters, numbers/);
  assert.match(usernameProblem('dot.com')!, /letters, numbers/);
  assert.match(usernameProblem('<b>hi</b>')!, /letters, numbers/);
  assert.match(usernameProblem('12345')!, /one letter/);
  assert.match(usernameProblem('0x1234abcd')!, /wallet/);
  assert.match(usernameProblem(null)!, /Pick/);
});

test('rude names are turned down, whatever the case, digits or separators', () => {
  for (const n of ['fuckface', 'FUCK', 'f_u_c_k', 'sh1tlord', 'BigAss', 'big_ass', 'S3X', 'xRape', 'Rape_Fan', 'nazi88', 'H1tler'])
    assert.ok(usernameProblem(n), n);
});

test("names that pass for the city's own people are turned down", () => {
  for (const n of ['Admin', 'SiteAdmin', 'adm1n', 'Sector7', 'sector_7_crew', 'EmporiumHQ', 'OfficialDave', 'Mod', 'Big_Mod', 'TheDev', 'www-site', 'HttpGuy'])
    assert.match(usernameProblem(n) ?? '', /kept for/, n);
});

test("the owner's private list blocks names without being written in the code", () => {
  const blocked = blockedList(' Secret , xy, ');
  assert.deepEqual(blocked, ['secret', 'xy']);
  assert.ok(usernameProblem('MySecret99', blocked));
  assert.ok(usernameProblem('s3cr3t', blocked));
  assert.equal(usernameProblem('Secrets', []), null);
  assert.deepEqual(blockedList(undefined), []);
});

test('usernames are one per name whatever the case', () => {
  assert.equal(nameKey('NeonGecko'), nameKey('neongecko'));
});

test('passwords and emails', () => {
  assert.match(passwordProblem('short')!, /at least 8/);
  assert.match(passwordProblem('x'.repeat(129))!, /at most/);
  assert.match(passwordProblem('Password123')!, /easy/);
  assert.match(passwordProblem('neongecko-rules', 'NeonGecko')!, /username/);
  assert.equal(passwordProblem('a good long one', 'NeonGecko'), null);
  assert.ok(emailOk('dave@example.com'));
  for (const e of ['dave', 'dave@', '@example.com', 'dave@example', 'da ve@example.com', 3]) assert.ok(!emailOk(e), String(e));
});

test('password hashes check the right password only, and a salt each', async () => {
  const h = await hashPassword('a good long one', 1000);
  assert.equal(h.alg, 'pbkdf2-sha256');
  assert.ok(await checkPassword('a good long one', h));
  assert.ok(!(await checkPassword('a good long on', h)));
  const again = await hashPassword('a good long one', 1000);
  assert.notEqual(again.salt, h.salt);
  assert.notEqual(again.hash, h.hash);
  assert.ok(stale(h), 'fewer rounds than today: hashed again on use');
  assert.ok(sameHex('ab01', 'ab01') && !sameHex('ab01', 'ab02') && !sameHex('ab', 'ab01'));
});

test('five wrong tries lock for a while; the window starts again after', () => {
  let t = undefined as ReturnType<typeof wrongTry> | undefined;
  const now = 1_000_000;
  for (let i = 0; i < TRIES.max - 1; i++) {
    t = wrongTry(t, now + i);
    assert.ok(!lockedOut(t, now + i));
  }
  t = wrongTry(t, now + 10);
  assert.ok(lockedOut(t, now + 11));
  assert.ok(!lockedOut(t, now + 10 + TRIES.lock + 1));
  const later = wrongTry({ n: 4, since: now, until: 0 }, now + TRIES.window + 1);
  assert.equal(later.n, 1);
});

test('Google and Discord sign-ins: the URL, the code swap, the ids', async () => {
  const { verifier, challenge } = await pkce();
  assert.match(verifier, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(verifier, challenge);
  const u = new URL(authorizeUrl('google', { clientId: 'cid', redirect: 'https://x.dev/auth/google/callback', state: 'st', challenge }));
  assert.equal(u.origin, 'https://accounts.google.com');
  assert.equal(u.searchParams.get('scope'), 'openid');
  assert.equal(u.searchParams.get('state'), 'st');
  assert.equal(u.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(new URL(authorizeUrl('discord', { clientId: 'd', redirect: 'r', state: 's', challenge })).searchParams.get('scope'), 'identify');
  const form = tokenForm({ clientId: 'cid', secret: 'sec', redirect: 'r', code: 'c', verifier });
  assert.equal(form.get('grant_type'), 'authorization_code');
  assert.equal(form.get('code_verifier'), verifier);

  const jwt = (claims: object) => `x.${btoa(JSON.stringify(claims)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')}.y`;
  const now = Date.now();
  const good = { iss: 'https://accounts.google.com', aud: 'cid', sub: '1234567890', exp: now / 1000 + 600 };
  assert.equal(googleId(jwt(good), 'cid', now), '1234567890');
  assert.equal(googleId(jwt({ ...good, aud: 'other' }), 'cid', now), null);
  assert.equal(googleId(jwt({ ...good, iss: 'https://evil.example' }), 'cid', now), null);
  assert.equal(googleId(jwt({ ...good, exp: now / 1000 - 1 }), 'cid', now), null);
  assert.equal(googleId('nonsense', 'cid', now), null);
  assert.equal(discordId({ id: '80351110224678912', username: 'x' }), '80351110224678912');
  assert.equal(discordId({ id: 'abc' }), null);
  assert.equal(discordId(null), null);
});

test('after a sign-in the player goes back only to an allowed page', () => {
  const allowed = 'https://emporium.example.dev, http://localhost:4321';
  assert.equal(backTo('http://localhost:4321', allowed), 'http://localhost:4321');
  assert.equal(backTo('https://evil.example', allowed), 'https://emporium.example.dev');
  assert.equal(backTo(null, allowed), 'https://emporium.example.dev');
});

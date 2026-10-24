// Logging in (docs/multiplayer-plan.md, "Profiles and logging in"): the username filter, passwords and
// emails (net/auth.ts, the browser's and the server's), and the server's own helpers (server/src/login.ts):
// password hashes, the lock-out after wrong tries, where a reset link opens and what its email says.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blockedList, emailOk, nameKey, passwordProblem, usernameProblem, USERNAME_MAX } from '../src/scripts/net/auth';
import { TRIES, backTo, checkPassword, hashPassword, lockedOut, resetEmail, sameHex, stale, wrongTry } from '../server/src/login';

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

test('a reset link opens only an allowed page, and its email carries it', () => {
  const allowed = 'https://emporium.example.dev, http://localhost:4321';
  assert.equal(backTo('http://localhost:4321', allowed), 'http://localhost:4321');
  assert.equal(backTo('https://evil.example', allowed), 'https://emporium.example.dev');
  assert.equal(backTo(null, allowed), 'https://emporium.example.dev');
  const mail = resetEmail('NeonGecko', 'https://emporium.example.dev/?reset=abc');
  assert.match(mail.text, /NeonGecko/);
  assert.match(mail.text, /\?reset=abc/);
  assert.match(mail.subject, /Sector 7/);
});

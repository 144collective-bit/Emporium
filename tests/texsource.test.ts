// Where the city's textures came from, in a line (texsource.ts, docs/stability-plan.md "The live site's
// textures"): the build's by GPU format, painted, half size; and when the line warns.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { texSourceLine, texSourceWarns, type TexSources } from '../src/scripts/city3d/texsource';

const of = (t: Partial<TexSources>): TexSources => ({ onPage: true, built: {}, fellBack: 0, painted: 0, half: false, ...t });

test('the build set in one format: the count and the format, then what was painted', () => {
  const t = of({ built: { BC7: 197 }, painted: 25 });
  assert.equal(texSourceLine(t), 'textures: 197 from the build (BC7) · 25 painted');
  assert.equal(texSourceWarns(t), false);
});

test('more than one format: each with its count, most first', () => {
  assert.equal(texSourceLine(of({ built: { BC1: 40, BC7: 150 }, painted: 3 })), 'textures: 190 from the build (BC7 150, BC1 40) · 3 painted');
});

test('no set on the page: says so, warns, and shows the half-size paint', () => {
  const t = of({ onPage: false, painted: 222, half: true });
  assert.equal(texSourceLine(t), 'textures: none from the build (not on the page) · 222 painted, half size');
  assert.equal(texSourceWarns(t), true);
});

test('files that would not load are painted, and warn', () => {
  const t = of({ built: { ETC2: 190 }, fellBack: 7, painted: 25 });
  assert.equal(texSourceLine(t), "textures: 190 from the build (ETC2) · 7 wouldn't load · 32 painted");
  assert.equal(texSourceWarns(t), true);
});

test('a GPU taking none of the compressed formats warns', () => {
  assert.equal(texSourceWarns(of({ built: { uncompressed: 197 } })), true);
  assert.equal(texSourceLine(of({})), 'textures: none from the build yet · 0 painted');
});

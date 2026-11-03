// The gun hands, polished (docs/firstperson-plan.md Phase 3, fpgunkit.ts): every top's sleeve round the wrist and
// outside it, each layer outside the one under it, the watch on his left wrist only when worn, the gloves, the
// suit's buttons on the outside; each gun's case out of a port on his right (the revolver's kept), its flash; the
// smoke after a string; the light on the hands by day and night, under a lamp and away from one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { PLAYER, type Outfit, type OutfitKind } from '../src/scripts/city3d/wardrobe';
import { WEAPONS, type WeaponId } from '../src/scripts/city3d/combat-sim';
import { FIT } from '../src/scripts/city3d/gunfit';
import { CREAM, CUFF_AT, EJECT, FLASH, GLOVE, GOLD, HORN, LIGHT, SLEEVE_LEN, SMOKE, WATCH_LIFT, WRIST_R, byColour, handColor, lampLight, sleeveParts, smokeFor, type Part } from '../src/scripts/city3d/fpgunkit';

const KINDS: OutfitKind[] = ['suit', 'hoodie', 'track', 'varsity', 'puffer', 'soldier'];
const outfit = (kind: OutfitKind, extra: Partial<Outfit> = {}): Outfit => ({ ...PLAYER, kind, top: '#2a2350', ...extra });
const UP = new THREE.Vector3(0, 1, 0);
const O = new THREE.Vector3();

/** Every vertex as (height up the forearm, distance off its axis) */
function rings(parts: Part[]) {
  const out: [number, number][] = [];
  for (const p of parts) {
    const a = p.geo.attributes.position;
    for (let i = 0; i < a.count; i++) out.push([a.getY(i), Math.hypot(a.getX(i), a.getZ(i))]);
  }
  return out;
}

test('every top: a sleeve and cuff round the wrist, outside it, from the cuff up the forearm, nothing over the hand', () => {
  for (const kind of KINDS)
    for (const side of [-1, 1] as const)
      for (const watch of [false, true]) {
        const parts = sleeveParts(outfit(kind, { watch }), side, O, UP);
        assert.ok(parts.length >= 2, `${kind}: a sleeve and a cuff`);
        const pts = rings(parts);
        for (const [y, r] of pts) {
          assert.ok(Number.isFinite(y) && Number.isFinite(r), `${kind}: finite`);
          // (the watch's face, rounder than its band is wide, sits a few millimetres onto the wrist)
          assert.ok(y > CUFF_AT - 0.003, `${kind}: nothing down over the hand (${y.toFixed(3)})`);
          // (past the forearm shown, out of view, the sleeve's end closes in)
          if (y <= SLEEVE_LEN + 1e-6) assert.ok(r > WRIST_R - 1e-6, `${kind} ${side}: outside the wrist (${r.toFixed(4)} at ${y.toFixed(3)})`);
          assert.ok(y < SLEEVE_LEN + 0.02, `${kind}: no longer than the forearm shown`);
        }
        assert.ok(Math.max(...pts.map(([y]) => y)) > SLEEVE_LEN - 1e-6, `${kind}: up the forearm out of view`);
      }
});

test('each layer stays outside the one under it: the sleeve over the cuff where they meet', () => {
  for (const kind of KINDS) {
    const o = outfit(kind);
    const parts = sleeveParts(o, -1, O, UP);
    // (the sleeve is the part reaching furthest up; the cuff the one starting lowest)
    const reach = (p: Part) => Math.max(...rings([p]).map(([y]) => y));
    const start = (p: Part) => Math.min(...rings([p]).map(([y]) => y));
    const sleeve = parts.reduce((a, b) => (reach(b) > reach(a) ? b : a));
    const cuff = parts.reduce((a, b) => (start(b) < start(a) ? b : a));
    const s0 = start(sleeve);
    const top = reach(cuff);
    assert.ok(top >= s0 - 1e-6, `${kind}: the cuff runs up under the sleeve (cuff to ${top.toFixed(3)}, sleeve from ${s0.toFixed(3)})`);
    const cuffMost = Math.max(...rings([cuff]).filter(([y]) => y >= s0 - 1e-6).map(([, r]) => r), 0);
    const sleeveLeast = Math.min(...rings([sleeve]).filter(([y]) => y <= top + 1e-6).map(([, r]) => r));
    assert.ok(sleeveLeast >= cuffMost - 0.0004, `${kind}: the sleeve (${sleeveLeast.toFixed(4)}) outside the cuff (${cuffMost.toFixed(4)})`);
  }
});

test('the watch on his left wrist only, only when worn, under a cuff moved up for it', () => {
  for (const kind of KINDS) {
    const gold = (side: -1 | 1, watch: boolean) => sleeveParts(outfit(kind, { watch }), side, O, UP).filter((p) => p.color === GOLD).length;
    assert.equal(gold(1, false), 0, `${kind}: no watch unless worn`);
    assert.equal(gold(-1, true), 0, `${kind}: never on the right`);
    assert.ok(gold(1, true) >= 2, `${kind}: the band and the face`);
    const cuffStart = (watch: boolean) =>
      Math.min(...rings(sleeveParts(outfit(kind, { watch }), 1, O, UP).filter((p) => p.color !== GOLD && p.color !== '#1a1a2a')).map(([y]) => y));
    assert.ok(Math.abs(cuffStart(true) - cuffStart(false) - WATCH_LIFT) < 1e-6, `${kind}: the cuff starts further up`);
  }
});

test('the tops` own colours: the varsity`s cream sleeve, the suit`s four horn buttons on the outside, the fatigues` gloves', () => {
  assert.ok(sleeveParts(outfit('varsity'), 1, O, UP).some((p) => p.color === CREAM));
  for (const side of [-1, 1] as const) {
    const buttons = sleeveParts(outfit('suit'), side, O, UP).filter((p) => p.color === HORN);
    assert.equal(buttons.length, 4);
    for (const b of buttons) {
      b.geo.computeBoundingBox();
      const c = b.geo.boundingBox!.getCenter(new THREE.Vector3());
      assert.ok(c.x * side > 0, `side ${side}: on the outside of the arm`);
    }
  }
  assert.equal(handColor(outfit('soldier')), GLOVE);
  assert.notEqual(handColor(outfit('suit')), GLOVE);
});

test('round any forearm: the same sleeve, its axis through the wrist and up `dir`; one mesh a colour', () => {
  const dir = new THREE.Vector3(0.6, -0.68, -0.42).normalize();
  const at = new THREE.Vector3(0.014, -0.036, 0);
  for (const kind of KINDS) {
    const a = rings(sleeveParts(outfit(kind), 1, O, UP)).map(([, r]) => r);
    const parts = sleeveParts(outfit(kind), 1, at, dir);
    const b: number[] = [];
    for (const p of parts) {
      const pos = p.geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(pos, i).sub(at);
        b.push(v.sub(dir.clone().multiplyScalar(v.dot(dir))).length());
      }
    }
    assert.ok(Math.abs(Math.min(...a) - Math.min(...b)) < 1e-5 && Math.abs(Math.max(...a) - Math.max(...b)) < 1e-5, `${kind}: the same radii`);
    const merged = byColour(parts);
    assert.equal(new Set(merged.map((p) => p.color)).size, merged.length);
  }
});

test('spent cases: out of a port behind the muzzle on his right, flung right; the shotgun`s hull on the pump; none from the revolver', () => {
  for (const id of Object.keys(WEAPONS) as WeaponId[]) {
    const e = EJECT[id];
    if (id === 'revolver') {
      assert.equal(e, null);
      continue;
    }
    assert.ok(e, `${id}: ejects`);
    assert.ok(e.port[2] < FIT[id].muzzle.z, `${id}: behind the muzzle`);
    assert.ok(e.port[0] < 0 && e.dir[0] < 0, `${id}: out to his right`);
    assert.ok(e.len > 0.01 && e.len < 0.04 && e.r < 0.007, `${id}: a believable size`);
  }
  assert.ok(EJECT.shotgun!.hull && EJECT.shotgun!.delay > 0.1, 'the hull on the pump');
  assert.ok(Object.entries(EJECT).every(([id, e]) => !e || id === 'shotgun' || e.delay === 0));
});

test('each gun`s flash: the big ones a round burst, the brakes` side jets, brief', () => {
  for (const id of Object.keys(WEAPONS) as WeaponId[]) {
    const f = FLASH[id];
    assert.ok(f, id);
    assert.ok(f.life >= 0.03 && f.life <= 0.07, `${id}: brief`);
    assert.ok(f.len > 0 && f.wide > 0 && f.front > 0);
  }
  assert.equal(FLASH.shotgun.shape, 'burst');
  assert.equal(FLASH.revolver.shape, 'burst');
  assert.ok(FLASH.dmr.brake && FLASH.lmg.brake && !FLASH.rifle.brake);
  assert.ok(FLASH.smg.front < FLASH.rifle.front && FLASH.shotgun.front > FLASH.rifle.front);
});

test('smoke off the barrel: after a string of an automatic, after any shot of the big ones, never for ever', () => {
  assert.equal(smokeFor('rifle', 0), 0);
  assert.equal(smokeFor('rifle', SMOKE.string - 1), 0, 'a short burst leaves none');
  assert.ok(smokeFor('rifle', SMOKE.string) > 0);
  assert.ok(smokeFor('smg', 40) <= SMOKE.max);
  assert.ok(smokeFor('smg', 30) > smokeFor('smg', 6), 'a longer string smokes longer');
  for (const id of ['shotgun', 'dmr', 'revolver'] as WeaponId[]) assert.ok(smokeFor(id, 1) > 0, id);
});

test('the light on the hands: white by day, the moon`s cool cast at night, a lamp`s colour near it, warmer for sodium', () => {
  const c = (night: number, d: number, sodium: boolean) => lampLight(night, d, sodium);
  const day = c(0, 1, true);
  assert.deepEqual([day.r, day.g, day.b], [1, 1, 1], 'by day, no tint whatever is near');
  const moon = c(1, Infinity, false);
  assert.ok(moon.b > moon.r && moon.r <= 1, 'the moon: cool, no brighter');
  const far = c(1, LIGHT.reach + 1, true);
  assert.ok(Math.abs(far.r - moon.r) < 1e-9 && Math.abs(far.b - moon.b) < 1e-9, 'past a lamp`s reach, only the moon');
  const sodium = c(1, 0.5, true);
  const white = c(1, 0.5, false);
  assert.ok(sodium.r > sodium.b * 1.3, 'under sodium: orange');
  assert.ok(sodium.r + sodium.g > moon.r + moon.g, 'and brighter than in the dark');
  assert.ok(sodium.r / sodium.b > white.r / white.b, 'sodium warmer than the town`s white');
  assert.ok(c(1, 1, true).r > c(1, 3, true).r, 'stronger the nearer');
});

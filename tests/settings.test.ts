// The settings (settings.ts and settings-rows.ts, docs/settings-plan.md): one record, its defaults, the first load's migration, the rows'
// pickers, the dots and the resets, and what the game reads off it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanSettings, DEFAULTS, flyScale, FOV_BASE, fovShift, fpsCap, masterGain, pixelRatio } from '../src/scripts/city3d/settings';
import { changed, label, patchFor, resetPatch, row, ROWS, rowsOf, share, stepValue, tabChanged, TABS, valueAt, valueOf } from '../src/scripts/city3d/settings-rows';
import { BACKUP_KEYS } from '../src/scripts/city3d/backup';
import { DEFAULT_TOUCH } from '../src/scripts/city3d/touchlayout';

test('nothing stored: every default, as the city was before', () => {
  const s = cleanSettings(null);
  assert.deepEqual(s, { ...DEFAULTS, touch: DEFAULT_TOUCH });
  assert.equal(s.time, 'day');
  assert.equal(s.sky, 'clear');
  assert.equal(s.labels, false);
  assert.equal(s.fov, FOV_BASE);
  assert.equal(s.quality, 'auto');
  assert.equal(s.carView, 'near');
  assert.equal(fovShift(s), 0);
  assert.equal(flyScale(s), 1);
  assert.equal(fpsCap(s), 0);
});

test('the first load takes Labels and the walk settings from where they lived', () => {
  const walk = { sens: 1.7, invert: true, autoAds: 'always', touch: { size: 'large', alpha: 0.6, left: true }, holds: { sprint: 'toggle' }, seen: ['foot'] };
  const s = cleanSettings(null, { labels: 'on', walk });
  assert.equal(s.labels, true);
  assert.equal(s.sens, 1.7);
  assert.equal(s.invert, true);
  assert.equal(s.autoAds, 'always');
  assert.equal(s.touch.size, 'large');
  assert.equal(s.touch.alpha, 0.6);
  assert.equal(s.touch.left, true);
  assert.deepEqual(s.holds, { sprint: 'toggle' });
  // (once the record has its own, the old ones are never read again)
  const own = cleanSettings({ ...s, sens: 0.5, labels: false }, { labels: 'on', walk });
  assert.equal(own.sens, 0.5);
  assert.equal(own.labels, false);
  assert.equal(cleanSettings(null, { labels: 'off' }).labels, false);
});

test('anything wrong in a stored record takes its default, ranges are held in', () => {
  const s = cleanSettings({ time: 'noon', sky: 7, quality: 'ultra', res: 12, fov: 200, fps: 144, volume: -4, sens: 'fast', carView: 'roof', shake: 'yes', touch: 'big', holds: { sprint: 'mash' } });
  assert.equal(s.time, 'day');
  assert.equal(s.sky, 'clear');
  assert.equal(s.quality, 'auto');
  assert.equal(s.res, 50);
  assert.equal(s.fov, 80);
  assert.equal(s.fps, 'auto');
  assert.equal(s.volume, 0);
  assert.equal(s.sens, 1);
  assert.equal(s.carView, 'near');
  assert.equal(s.shake, true);
  assert.deepEqual(s.touch, DEFAULT_TOUCH);
  assert.deepEqual(s.holds, {});
  // (resolution keeps to its 5s)
  assert.equal(cleanSettings({ res: 73 }).res, 75);
});

test('every row is on a tab, has a label of at most three words, and a kept row reads off the record', () => {
  const tabs = new Set(TABS.map((t) => t.id));
  const s = cleanSettings(null);
  for (const r of ROWS) {
    assert.ok(tabs.has(r.tab), r.id);
    assert.ok(r.label.split(' ').length <= 3, r.label);
    assert.ok(!!r.opts !== (r.min !== undefined), `${r.id}: a choice or a range`);
    if (r.act) continue;
    const v = valueOf(s, r.id, 'keys');
    if (r.opts) assert.ok(r.opts.some((o) => o.v === v), `${r.id}: its default is a choice`);
    else assert.ok(typeof v === 'number' && v >= r.min! && v <= r.max!, `${r.id}: its default in range`);
    assert.equal(changed(s, r.id, 'keys'), false, `${r.id} starts unchanged`);
  }
  for (const t of TABS) assert.ok(rowsOf(t.id).length > 0, t.id);
});

test('a picker steps along its choices and stops at the ends; a tap on the value goes round', () => {
  const time = row('time')!;
  assert.equal(stepValue(time, 'day', 1), 'sunset');
  assert.equal(stepValue(time, 'day', -1), 'live');
  assert.equal(stepValue(time, 'live', -1), 'live');
  assert.equal(stepValue(time, 'night', 1), 'night');
  assert.equal(stepValue(time, 'night', 1, true), 'live');
  const shadows = row('shadows')!;
  assert.equal(stepValue(shadows, true, 1, true), false);
  assert.equal(label(shadows, false), 'Off');
});

test('a range steps on its step, held in, and reads in its unit', () => {
  const fov = row('fov')!;
  assert.equal(stepValue(fov, 52, 1), 53);
  assert.equal(stepValue(fov, 80, 1), 80);
  assert.equal(label(fov, 52), '52°');
  const sens = row('sens')!;
  // (no float drift: ten steps from 1 lands on 2)
  let v = 1;
  for (let i = 0; i < 10; i++) v = stepValue(sens, v, 1) as number;
  assert.equal(v, 2);
  assert.equal(label(sens, 1), '1.0×');
  const alpha = row('touch.alpha')!;
  assert.equal(label(alpha, 0.65), '65%');
  assert.equal(stepValue(alpha, 1, -1), 0.95);
  assert.equal(valueAt(row('res')!, 0), 50);
  assert.equal(valueAt(row('res')!, 1), 100);
  assert.equal(valueAt(row('res')!, 0.52), 75);
  assert.equal(share(row('volume')!, 50), 0.5);
});

test('a change is a patch for its own setting; the dots show what is off its default', () => {
  const s = cleanSettings(null);
  const a = cleanSettings({ ...s, ...patchFor(s, 'fov', 60) });
  assert.equal(a.fov, 60);
  assert.equal(changed(a, 'fov', 'keys'), true);
  assert.equal(tabChanged(a, 'camera', 'keys'), true);
  assert.equal(tabChanged(a, 'game', 'keys'), false);
  const b = cleanSettings({ ...s, ...patchFor(s, 'touch.size', 'large') });
  assert.equal(b.touch.size, 'large');
  assert.equal(changed(b, 'touch.size', 'touch'), true);
  // hold or toggle: as it works on this input until picked; picking the input's own way isn't a change
  assert.equal(valueOf(s, 'hold:sprint', 'touch'), 'toggle');
  assert.equal(valueOf(s, 'hold:sprint', 'keys'), 'hold');
  const c = cleanSettings({ ...s, ...patchFor(s, 'hold:sprint', 'hold') });
  assert.equal(changed(c, 'hold:sprint', 'keys'), false);
  assert.equal(changed(c, 'hold:sprint', 'touch'), true);
  // (a value it can't hold is no patch)
  assert.deepEqual(patchFor(s, 'quality', 'ultra'), {});
  // a button moved by hand counts on the Touch tab
  const d = cleanSettings({ ...s, touch: { ...s.touch, arrange: { 'foot:wide': { jump: [0.5, 0.5] } } } });
  if (Object.keys(d.touch.arrange).length) assert.equal(tabChanged(d, 'touch', 'touch'), true);
});

test('a tab resets only its own; Reset all puts back everything', () => {
  const s = cleanSettings({ time: 'night', labels: true, fov: 70, shake: false, quality: 'low', holds: { aim: 'toggle' }, touch: { size: 'small' }, volume: 30 });
  const cam = cleanSettings({ ...s, ...resetPatch('camera') });
  assert.equal(cam.fov, FOV_BASE);
  assert.equal(cam.shake, true);
  assert.equal(cam.time, 'night');
  assert.equal(cam.quality, 'low');
  const ctl = cleanSettings({ ...s, ...resetPatch('controls') });
  assert.deepEqual(ctl.holds, {});
  assert.equal(ctl.touch.size, 'small');
  const touch = cleanSettings({ ...s, ...resetPatch('touch') });
  assert.deepEqual(touch.touch, DEFAULT_TOUCH);
  const all = cleanSettings({ ...s, ...resetPatch() });
  assert.deepEqual(all, cleanSettings(null));
});

test('what the game reads off it', () => {
  assert.equal(fovShift({ fov: 60 }), 8);
  assert.equal(fovShift({ fov: 45 }), -7);
  assert.equal(flyScale({ fly: 'slow' }), 0.5);
  assert.equal(flyScale({ fly: 'fast' }), 2);
  assert.equal(fpsCap({ fps: '30' }), 30);
  assert.equal(fpsCap({ fps: '60' }), 60);
  // pixels: the screen's up to the tier's, scaled; the step-down half off, not under 1 unless the scale was
  assert.equal(pixelRatio(3, 2, { res: 100 }, false), 2);
  assert.equal(pixelRatio(3, 2, { res: 100 }, true), 1.5);
  assert.equal(pixelRatio(1, 2, { res: 100 }, true), 1);
  assert.equal(pixelRatio(2, 1.25, { res: 50 }, false), 0.625);
  assert.equal(pixelRatio(2, 1.25, { res: 50 }, true), 0.625);
  assert.equal(pixelRatio(1, 1, { res: 50 }, false), 0.5);
  assert.equal(masterGain({ volume: 100 }), 0.55);
  assert.equal(masterGain({ volume: 0 }), 0);
});

test('the record goes in the save backup', () => {
  assert.ok((BACKUP_KEYS as readonly string[]).includes('degen-city-settings-v1'));
});

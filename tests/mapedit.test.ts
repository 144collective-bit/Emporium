// The map creator's rules (mapedit.ts, docs/cities-plan.md Phase 2): each tool's change to a map, undo and redo,
// snapping onto streets, what the eraser picks up, the drafts kept in the browser, the plan's view; and the map
// file's curves and raised streets (citymap.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CURVE_STEP, DECK_Y, HILL, blankMap, cleanMap, curveOf, inWater, shoreOf, type Pt } from '../src/scripts/city3d/citymap';
import { FILE_MAX, MAPS_KEY, SCALE, STORE_MAX, TOOLS, TOOL_NAMES, UNDO_MAX, addHill, addStreet, addWater, commit, fileName, fitView, hit, moveSpawn, nearestOn, newEdit, panBy, readFile, readStore, redo, remove, snap, toMap, toScreen, undo, withDraft, withoutDraft, zoomAt } from '../src/scripts/city3d/mapedit';
import { BACKUP_KEYS } from '../src/scripts/city3d/backup';

const blank = () => blankMap('test-town', 'Test Town');
const bend: Pt[] = [[-60, 0], [0, 30], [60, 0]];

test('a street is the smooth curve through its drawn points', () => {
  const line = curveOf(bend);
  assert.deepEqual(line[0], bend[0]);
  assert.deepEqual(line[line.length - 1], bend[2]);
  assert.ok(line.some((p) => p[0] === 0 && p[1] === 30), 'it passes through every drawn point');
  for (let i = 1; i < line.length; i++) assert.ok(Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]) <= CURVE_STEP * 1.6, 'in short pieces');
  assert.deepEqual(curveOf([[0, 0], [10, 0]]), [[0, 0], [10, 0]], 'two points are a straight run');
  // A shore closes on itself: no point twice, and it bulges past the straight outline
  const sq: Pt[] = [[0, 0], [40, 0], [40, 40], [0, 40]];
  const shore = shoreOf(sq);
  assert.notDeepEqual(shore[0], shore[shore.length - 1]);
  assert.ok(shore.some((p) => p[1] < 0), 'the shore rounds its corners outward between the points');
  assert.ok(inWater({ water: [{ id: 'w', kind: 'lake', poly: sq }] }, [20, 20]));
});

test('streets: drawn on the ground or raised, kept by the file', () => {
  const m = addStreet(blank(), 'avenue', bend)!;
  assert.equal(m.streets.length, 1);
  assert.equal(m.streets[0].level, 0);
  const up = addStreet(m, 'street', [[-60, -40], [60, -40]], 1)!;
  assert.equal(up.streets[1].level, 1);
  assert.notEqual(up.streets[0].id, up.streets[1].id);
  assert.deepEqual(cleanMap(JSON.parse(JSON.stringify(up))), up);
  assert.equal(cleanMap({ id: 'x', streets: [{ pts: [[0, 0], [9, 0]], level: 7 }] })!.streets[0].level, 0, 'only 1 is raised');
  assert.ok(DECK_Y > 4, 'a raised street clears what walks under it');
  assert.equal(addStreet(blank(), 'street', [[0, 0]]), null);
  assert.equal(addStreet(blank(), 'street', [[0, 0], [0, 0]]), null, 'two points on one spot are no street');
});

test('water, hills and the arrival', () => {
  const m = addWater(blank(), 'lake', [[0, 0], [40, 0], [40, 40], [0, 40]])!;
  assert.equal(m.water.length, 1);
  assert.equal(addWater(blank(), 'lake', [[0, 0], [40, 0]]), null);
  const h = addHill(m, [100, 100], 1, 500)!;
  assert.equal(h.hills[0].radius, HILL.radius[0]);
  assert.equal(h.hills[0].height, HILL.height[1]);
  assert.equal(addHill(m, [9000, 0], 20, 5), null, 'not off the level');
  const s = moveSpawn(h, [-50, 20])!;
  assert.deepEqual(s.spawn.at, [-50, 20]);
  assert.equal(s.spawn.yaw, h.spawn.yaw);
  assert.equal(moveSpawn(h, [9000, 0]), null);
});

test('undo and redo', () => {
  let ed = newEdit(blank());
  const a = ed.map;
  ed = commit(ed, addStreet(ed.map, 'street', bend));
  const b = ed.map;
  ed = commit(ed, addHill(ed.map, [0, -80], 30, 10));
  assert.equal(ed.past.length, 2);
  assert.equal(commit(ed, null), ed, 'a change that failed changes nothing');
  assert.equal(commit(ed, cleanMap(ed.map)), ed, 'nor does the same map again');
  ed = undo(ed);
  assert.deepEqual(ed.map, b);
  ed = undo(ed);
  assert.deepEqual(ed.map, a);
  assert.equal(undo(ed), ed);
  ed = redo(redo(ed));
  assert.equal(ed.map.hills.length, 1);
  assert.equal(redo(ed), ed);
  // A new change after an undo forgets what was undone
  ed = commit(undo(ed), addHill(b, [80, 80], 30, 10));
  assert.equal(ed.future.length, 0);
  for (let i = 0; i < UNDO_MAX + 20; i++) ed = commit(ed, moveSpawn(ed.map, [i - 100, 0]));
  assert.equal(ed.past.length, UNDO_MAX);
});

test('snapping: onto a drawn point first, then along a street, else left alone', () => {
  const m = addStreet(blank(), 'street', bend)!;
  assert.deepEqual(snap(m, [58, 2], 5), { at: [60, 0], snapped: true });
  const mid = snap(m, [30, 19], 5);
  assert.ok(mid.snapped);
  assert.ok(nearestOn(curveOf(bend), mid.at).d < 0.02, 'on the street');
  assert.deepEqual(snap(m, [0, -90], 5), { at: [0, -90], snapped: false });
  assert.deepEqual(snap(blank(), [3, 4], 50).snapped, false);
});

test('the eraser: the street under the point before the water it crosses, then hills', () => {
  let m = addWater(blank(), 'lake', [[-30, -30], [30, -30], [30, 30], [-30, 30]])!;
  m = addStreet(m, 'street', [[-80, 0], [80, 0]])!;
  m = addHill(m, [150, 150], 40, 10)!;
  assert.deepEqual(hit(m, [0, 1], 3), { type: 'street', id: m.streets[0].id });
  assert.deepEqual(hit(m, [0, 20], 3), { type: 'water', id: m.water[0].id });
  assert.deepEqual(hit(m, [170, 150], 3), { type: 'hill', id: m.hills[0].id });
  assert.equal(hit(m, [-250, -250], 3), null);
  const gone = remove(m, hit(m, [0, 1], 3)!)!;
  assert.equal(gone.streets.length, 0);
  assert.equal(gone.water.length, 1);
  assert.equal(remove(gone, { type: 'water', id: gone.water[0].id })!.water.length, 0);
});

test('drafts: kept by city, sound maps only, and never in the game backup', () => {
  assert.deepEqual(readStore(null).maps, {});
  assert.deepEqual(readStore('not json').maps, {});
  assert.deepEqual(readStore('{"maps":7}').maps, {});
  const m = addStreet(blank(), 'street', bend)!;
  let store = withDraft(readStore(null), m);
  store = withDraft(store, blankMap('other', 'Other'));
  const back = readStore(JSON.stringify(store));
  assert.deepEqual(back.maps['test-town'], m);
  assert.equal(Object.keys(back.maps).length, 2);
  assert.equal(Object.keys(withoutDraft(back, 'other').maps).length, 1);
  assert.deepEqual(Object.keys(readStore(JSON.stringify({ maps: { a: { name: 'no id' }, b: m } })).maps), ['test-town']);
  const many = { maps: Object.fromEntries(Array.from({ length: STORE_MAX + 5 }, (_, i) => [`c${i}`, blankMap(`c${i}`, 'C')])) };
  assert.equal(Object.keys(readStore(JSON.stringify(many)).maps).length, STORE_MAX);
  // (putting a game backup back removes every key it doesn't hold: the drafts stay out of it)
  assert.ok(MAPS_KEY.startsWith('degen-city-'));
  assert.ok(!(BACKUP_KEYS as readonly string[]).includes(MAPS_KEY));
});

test('files: exported under the city id, imported into the city being edited', () => {
  const m = addStreet(blank(), 'street', bend)!;
  assert.equal(fileName(m), 'test-town.city.json');
  const into = { id: 'open-level', name: 'Open Level' };
  const got = readFile(JSON.stringify(m), into)!;
  assert.equal(got.id, 'open-level');
  assert.equal(got.name, 'Open Level');
  assert.deepEqual(got.streets, m.streets);
  assert.equal(readFile('{', into), null);
  assert.equal(readFile('{"name":"x"}', into), null);
  assert.equal(readFile(' '.repeat(FILE_MAX + 1), into), null);
});

test('the plan view: fits the level, and zooming holds the point under the pointer', () => {
  const v = fitView([600, 600], 1000, 800);
  assert.ok(600 * v.scale <= 800);
  assert.deepEqual(toScreen(v, 1000, 800, [0, 0]), [500, 400]);
  const p = toMap(v, 1000, 800, 220, 310);
  const z = zoomAt(v, 1000, 800, 220, 310, 3);
  const q = toMap(z, 1000, 800, 220, 310);
  assert.ok(Math.abs(p[0] - q[0]) < 1e-9 && Math.abs(p[1] - q[1]) < 1e-9);
  assert.equal(zoomAt(v, 1000, 800, 0, 0, 1e6).scale, SCALE.max);
  assert.equal(zoomAt(v, 1000, 800, 0, 0, 1e-6).scale, SCALE.min);
  const far = panBy(v, [600, 600], -1e6, 1e6);
  assert.deepEqual([far.x, far.z], [300, -300], 'the middle of the view stays on the level');
  // North is up, east is right
  assert.ok(toScreen(v, 1000, 800, [0, -100])[1] < 400);
  assert.ok(toScreen(v, 1000, 800, [100, 0])[0] > 500);
});

test('the tools: each has a name', () => {
  assert.equal(new Set(TOOLS).size, TOOLS.length);
  for (const t of TOOLS) assert.ok(TOOL_NAMES[t].length > 0 && TOOL_NAMES[t].split(' ').length <= 3);
});

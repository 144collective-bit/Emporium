// Northgate Air Base drawn (airbase3d.ts, docs/military-plan.md Phase 1): every site builds; the wall (Phase 6: the
// fence became a concrete wall) solid, its posts, lights and razor wire near only; the parts stand where airbase.ts puts them
import { test } from 'node:test';
import assert from 'node:assert/strict';

test("the base's sites build: the wall a stretch a site, the gates, the avenue, the visitors' area and the names", async () => {
  const THREE = await import('three');
  const { takeSites } = await import('../src/scripts/city3d/tilework');
  const { FENCE_RUNS, GATES, VISITOR_CENTRE_H } = await import('../src/scripts/city3d/airbase');
  const mod = await import('../src/scripts/city3d/airbase3d');
  takeSites();
  mod.register({ low: false });
  const sites = takeSites();
  const fence = sites.filter((s) => s.id.startsWith('airbase wall '));
  assert.ok(fence.length >= FENCE_RUNS.length && fence.length < 200, `${fence.length} stretches of wall`);
  for (const g of GATES) assert.ok(sites.some((s) => s.id === `airbase gate ${g.id}`));
  for (const id of ['airbase visitors', 'airbase name', 'airbase service board']) assert.ok(sites.some((s) => s.id === id), `no ${id}`);
  assert.ok(sites.some((s) => s.id.startsWith('airbase avenue ')));
  // Each builds, inside its own rect (a little over, for the arms leaning out)
  for (const s of sites) {
    const g = new THREE.Group();
    s.build(g);
    assert.ok(g.children.length, `${s.id} drew nothing`);
    const box = new THREE.Box3().setFromObject(g);
    assert.ok(box.min.x > s.rect[0] - 1 && box.max.x < s.rect[2] + 1 && box.min.z > s.rect[1] - 1 && box.max.z < s.rect[3] + 1, `${s.id} spills out of its site`);
    // (nothing over the Emporium's roof, 12.5; Phase 1's no higher than the visitors' centre's terrace rail)
    const phase1 = /^airbase (wall \d|gate (main|service)|avenue|visitors|name|service board)/.test(s.id);
    assert.ok(box.max.y < (phase1 ? VISITOR_CENTRE_H + 1.2 : 12.5), `${s.id} stands ${box.max.y.toFixed(1)} high`);
  }
  // A stretch of wall: solid (nothing see-through in the FX layer now), its posts, lights and wire near only
  const g = new THREE.Group();
  fence[0].build(g);
  const levels = new Set<string>();
  let fx = 0;
  g.traverse((o) => {
    const m = o as InstanceType<typeof THREE.Mesh>;
    if (!m.isMesh) return;
    levels.add(String(m.userData.lod ?? 'all'));
    if (m.layers.mask !== 1) fx++;
  });
  assert.equal(fx, 0, 'a see-through mesh on the wall');
  assert.ok(levels.has('near') && levels.has('all'), [...levels].join());
  // On phones: no posts, lights or wire (the low tier's trim)
  takeSites();
  mod.register({ low: true });
  const low = takeSites().find((s) => s.id === fence[0].id)!;
  const lg = new THREE.Group();
  low.build(lg);
  lg.traverse((o) => assert.ok(!(o as InstanceType<typeof THREE.Mesh>).isMesh || o.userData.lod !== 'near', 'near detail on a phone'));
});

test("the airfield's strips build (Phase 2): runway, taxiways, apron, its lights small and lit", async () => {
  const THREE = await import('three');
  const { takeSites } = await import('../src/scripts/city3d/tilework');
  const { AIRFIELD_RECT } = await import('../src/scripts/city3d/airbase');
  const mod = await import('../src/scripts/city3d/airbasefield3d');
  for (const low of [false, true]) {
    takeSites();
    mod.register({ low });
    const sites = takeSites().filter((s) => s.id.startsWith('airbase field '));
    assert.equal(sites.length, Math.ceil((AIRFIELD_RECT[2] - AIRFIELD_RECT[0]) / 30));
    let tris = 0;
    for (const s of sites) {
      const g = new THREE.Group();
      s.build(g);
      const box = new THREE.Box3().setFromObject(g);
      if (box.isEmpty()) continue;
      // (inside its strip, but for a connector's or a stub's half straddling its edge, and under 2.5 high: the approach lights)
      assert.ok(box.min.x > s.rect[0] - 8 && box.max.x < s.rect[2] + 8 && box.min.z > s.rect[1] - 1 && box.max.z < s.rect[3] + 1, `${s.id} spills out`);
      assert.ok(box.max.y < 2.5, `${s.id} stands ${box.max.y.toFixed(2)} high`);
      g.traverse((o) => {
        const m = o as InstanceType<typeof THREE.Mesh>;
        if (m.isMesh) tris += (m.geometry.index?.count ?? m.geometry.getAttribute('position').count) / 3;
      });
    }
    // (cheap: the whole field's flat ground and lights)
    assert.ok(tris > 2000 && tris < (low ? 60000 : 90000), `${tris} triangles`);
  }
});

test("the airfield's buildings (Phase 2): each on its own ground, standing on it, under the Emporium", async () => {
  const THREE = await import('three');
  const { takeSites } = await import('../src/scripts/city3d/tilework');
  const { AIRFIELD_SOLIDS } = await import('../src/scripts/city3d/airbase');
  const mod = await import('../src/scripts/city3d/airbasefield3d');
  takeSites();
  mod.register({ low: false });
  const built = takeSites().filter((s) => !s.id.startsWith('airbase field '));
  assert.ok(built.length >= 3 + 1 + 1 + 1 + 3, built.map((s) => s.id).join());
  for (const s of built) {
    const g = new THREE.Group();
    s.build(g);
    const box = new THREE.Box3().setFromObject(g);
    assert.ok(box.min.y > -0.01, `${s.id} below the ground (${box.min.y.toFixed(2)})`);
    assert.ok(box.max.y < 12.5, `${s.id} over the Emporium (${box.max.y.toFixed(2)})`);
    assert.ok(box.min.x > s.rect[0] - 1 && box.max.x < s.rect[2] + 1 && box.min.z > s.rect[1] - 1 && box.max.z < s.rect[3] + 1, `${s.id} spills out`);
    // (what's drawn stands inside the solids round it, near enough: a solid for every building)
    const mid: [number, number] = [(box.min.x + box.max.x) / 2, (box.min.z + box.max.z) / 2];
    // (but the apron's kit: its tug, its bowser and the windsock, small things in the open, as the airport's)
    if (s.id !== 'airbase apron kit') assert.ok(AIRFIELD_SOLIDS.some((b) => mid[0] > b[0] - 30 && mid[0] < b[2] + 30 && mid[1] > b[1] - 30 && mid[1] < b[3] + 30), `${s.id} has no solid`);
  }
});

test("the wall's lights (Phase 6): along every run, outside the base, facing out, evenly", async () => {
  const { WALL_LIGHTS, WALL_LIGHT_GAP } = await import('../src/scripts/city3d/airbasedress');
  const { FENCE_RUNS, inAirbase } = await import('../src/scripts/city3d/airbase');
  const total = FENCE_RUNS.reduce((n, [a, c]) => n + Math.hypot(c[0] - a[0], c[1] - a[1]), 0);
  assert.ok(WALL_LIGHTS.length > total / WALL_LIGHT_GAP - FENCE_RUNS.length && WALL_LIGHTS.length <= total / WALL_LIGHT_GAP);
  for (const l of WALL_LIGHTS) {
    assert.ok(Math.abs(Math.hypot(l.nx, l.nz) - 1) < 1e-9);
    // (out: a step out is outside the base, a step in is in it)
    assert.ok(!inAirbase(l.x + l.nx * 2, l.z + l.nz * 2) && inAirbase(l.x - l.nx * 2, l.z - l.nz * 2), `a light facing in at ${l.x}, ${l.z}`);
  }
});

test("the wall's lights clear of the panels' joints, and a lamp on each gate pier facing out (Phase 6's polish)", async () => {
  const { WALL_LIGHTS, PIER_LIGHTS } = await import('../src/scripts/city3d/airbasedress');
  const { FENCE_RUNS, GATES, PIER, WALL_PANEL, inAirbase, piersOf } = await import('../src/scripts/city3d/airbase');
  for (const l of WALL_LIGHTS) {
    const run = FENCE_RUNS.find(([a, c]) => {
      const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      const t = ((l.x - a[0]) * (c[0] - a[0]) + (l.z - a[1]) * (c[1] - a[1])) / (len * len);
      return t >= 0 && t <= 1 && Math.abs((l.x - a[0]) * (c[1] - a[1]) - (l.z - a[1]) * (c[0] - a[0])) / len < 0.05;
    });
    assert.ok(run, `a light off the line at ${l.x}, ${l.z}`);
    const [a, c] = run;
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const panels = Math.max(1, Math.round(len / WALL_PANEL));
    const along = (Math.hypot(l.x - a[0], l.z - a[1]) / len) * panels;
    // (a joint at every whole panel: the light half a panel from the nearest)
    assert.ok(Math.abs(along - Math.floor(along) - 0.5) < 0.01, `a light on a joint at ${l.x}, ${l.z}`);
  }
  assert.equal(PIER_LIGHTS.length, GATES.length * 2);
  for (const l of PIER_LIGHTS) {
    assert.ok(GATES.some((g) => piersOf(g).some(([x, z]) => x === l.x && Math.abs(l.z - z) === PIER / 2)), `a pier's lamp off its pier at ${l.x}, ${l.z}`);
    assert.ok(!inAirbase(l.x, l.z + l.nz * 2) && inAirbase(l.x, l.z - l.nz * 3), `a pier's lamp facing in at ${l.x}, ${l.z}`);
  }
});

// Northgate Air Base drawn (airbase3d.ts, docs/military-plan.md Phase 1): every site builds; the fence's mesh is in
// the FX layer (see-through), its arms and wire near only; the parts stand where airbase.ts puts them
import { test } from 'node:test';
import assert from 'node:assert/strict';

test("the base's sites build: the fence a stretch a site, the gates, the avenue, the visitors' area and the names", async () => {
  const THREE = await import('three');
  const { takeSites } = await import('../src/scripts/city3d/tilework');
  const { FENCE_RUNS, GATES, VISITOR_CENTRE_H } = await import('../src/scripts/city3d/airbase');
  const mod = await import('../src/scripts/city3d/airbase3d');
  takeSites();
  mod.register({ low: false });
  const sites = takeSites();
  const fence = sites.filter((s) => s.id.startsWith('airbase fence '));
  assert.ok(fence.length >= FENCE_RUNS.length && fence.length < 200, `${fence.length} stretches of fence`);
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
    // (nothing over the Emporium's roof, 12.5: the visitors' centre's terrace rail the highest)
    assert.ok(box.max.y < VISITOR_CENTRE_H + 1.2, `${s.id} stands ${box.max.y.toFixed(1)} high`);
  }
  // A stretch of fence: its mesh in the FX layer, its arms and wire near only
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
  assert.ok(fx > 0, 'no see-through mesh');
  assert.ok(levels.has('near') && levels.has('all'), [...levels].join());
  // On phones: no arms or wire (the low tier's trim)
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
    const sites = takeSites();
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

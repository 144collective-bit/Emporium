// The south's small parts drawn near only (docs/military-plan.md, the phone trim): the footpaths' bollards, Lot 9's
// fence posts and rails, the village's front walls; what's seen from further off (the fence's mesh, the gardens'
// paving and yards) at every distance as before
import { test } from 'node:test';
import assert from 'node:assert/strict';

test("the south's bollards, Lot 9's fence posts and the village's front walls are drawn near only", async () => {
  const THREE = await import('three');
  const { takeSites } = await import('../src/scripts/city3d/tilework');
  const south = await import('../src/scripts/city3d/south3d');
  const lot9 = await import('../src/scripts/city3d/lot9-3d');
  const village = await import('../src/scripts/city3d/village3d');
  for (const m of [south, lot9, village]) m.register({ low: false, scene: null });
  const SITES = takeSites();
  /** A site's meshes: each one's level, and whether any of its corners is painted `hex` (a Batch paints its colours in) */
  const meshes = (id: string, hex: string) => {
    const s = SITES.find((q) => q.id === id);
    assert.ok(s, `no site ${id}`);
    const g = new THREE.Group();
    s.build(g);
    const want = new THREE.Color(hex);
    const out: { lod: string; painted: boolean; instanced: boolean }[] = [];
    g.traverse((o) => {
      const m = o as InstanceType<typeof THREE.Mesh>;
      if (!m.isMesh) return;
      const c = m.geometry.getAttribute('color');
      let painted = false;
      for (let i = 0; c && i < c.count && !painted; i++) painted = Math.abs(c.getX(i) - want.r) < 0.01 && Math.abs(c.getY(i) - want.g) < 0.01 && Math.abs(c.getZ(i) - want.b) < 0.01;
      out.push({ lod: String(m.userData.lod ?? 'all'), painted, instanced: !!(m as unknown as { isInstancedMesh?: boolean }).isInstancedMesh });
    });
    return out;
  };
  // The bollards: nothing at every distance
  const posts = meshes('south bollards 0', '#000000');
  assert.ok(posts.length && posts.every((p) => p.lod === 'near'), 'a bollard drawn far');
  // A run of Lot 9's fence: its posts' grey (lot9-3d.ts POST) near only
  const fence = meshes(SITES.find((q) => q.id.startsWith('lot9 fence '))!.id, '#9ea2b4');
  assert.ok(fence.some((p) => p.lod === 'near' && p.painted), 'no posts near');
  assert.ok(!fence.some((p) => p.lod !== 'near' && p.painted), 'a post drawn far');
  // A row of the village's gardens: its front walls' red brick (village3d.ts FRONTS.red) near only, its paving and
  // yards still at every distance (the houses' own walls are drawn far: their bodies, not tested here)
  const { HOUSES } = await import('../src/scripts/city3d/southterraces');
  const { Batch } = await import('../src/scripts/city3d/kit');
  const gb = new Batch();
  village.drawGround(gb, HOUSES.slice(0, 10), false);
  const gardens = new THREE.Group();
  gb.build(gardens);
  const brick = new THREE.Color('#9b3b2a');
  const red = (m: InstanceType<typeof THREE.Mesh>) => {
    const c = m.geometry.getAttribute('color');
    for (let i = 0; c && i < c.count; i++) if (Math.abs(c.getX(i) - brick.r) < 0.01 && Math.abs(c.getY(i) - brick.g) < 0.01 && Math.abs(c.getZ(i) - brick.b) < 0.01) return true;
    return false;
  };
  const parts = gardens.children as InstanceType<typeof THREE.Mesh>[];
  assert.ok(parts.some((m) => m.userData.lod === 'near' && red(m)), 'no front walls near');
  assert.ok(!parts.some((m) => m.userData.lod !== 'near' && red(m)), 'a front wall drawn far');
  assert.ok(parts.some((m) => (m.userData.lod ?? 'all') === 'all'), "the gardens' ground gone from far");
});

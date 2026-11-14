/*
 * The city's areas (docs/blend-plan.md; DOM-free): the districts the seam map
 * (seams.ts) lays out and the blocks' edges (verges.ts) take after, what each
 * is like (`Character`), and which a street plan block belongs to. Kept on its
 * own, small, so the boot can read it without the seam map's search.
 */
import type { Block } from './streetplan';

/** What an area is like: what a seam between two of them needs depends on it */
export type Character = 'core' | 'town' | 'towers' | 'park' | 'retail' | 'homes' | 'estates' | 'grit' | 'industry' | 'airport' | 'sport';

export interface Area {
  id: string;
  name: string;
  character: Character;
}

/** The areas, in the order a cell is given to one (the first that claims it) */
export const AREAS: Area[] = [
  { id: 'downtown', name: 'Downtown', character: 'core' },
  // (the districts' landscaped blocks round downtown, the south row, the squares and the parks: outer.ts)
  { id: 'town', name: 'The town', character: 'town' },
  { id: 'uptown', name: 'Uptown', character: 'towers' },
  { id: 'uptown-north', name: 'Uptown North', character: 'towers' },
  { id: 'westlake', name: 'Westlake Park', character: 'park' },
  { id: 'stadium', name: 'Sector 7 Stadium', character: 'sport' },
  { id: 'mall', name: 'Starlight Mall', character: 'retail' },
  { id: 'palm-court', name: 'Palm Court', character: 'retail' },
  { id: 'sunridge', name: 'Sunridge', character: 'homes' },
  { id: 'crestmont', name: 'Crestmont', character: 'estates' },
  { id: 'trenches', name: 'The Trenches', character: 'grit' },
  { id: 'endswood', name: 'Endswood Estate', character: 'grit' },
  { id: 'docks', name: 'Southbank Docks', character: 'industry' },
  { id: 'strip', name: 'The Neon Mile', character: 'retail' },
  { id: 'southfield', name: 'Southfield', character: 'park' },
  { id: 'southyards', name: 'Southfield Yards', character: 'industry' },
  { id: 'airport', name: 'Sector 7 Airport', character: 'airport' },
  { id: 'karts', name: 'The kart park', character: 'sport' },
];
export const AREA_IDS = AREAS.map((a) => a.id);

/** The area a street plan block belongs to (null: a sidewalk-only strip, the bends' kerbs) */
export function areaOfBlock(b: Block): string | null {
  if (b.id.startsWith('kerb')) return null;
  if (b.id.startsWith('dt-')) return 'downtown';
  if (b.id.startsWith('o-')) return 'town';
  if (b.id === 'uptown-north') return 'uptown-north';
  if (b.id === 'palm-court') return 'palm-court';
  if (b.id === 'mall' || b.id === 'mall-park') return 'mall';
  const byRef: Record<string, string> = { uptown: 'uptown', westlake: 'westlake', stadium: 'stadium', sunridge: 'sunridge', crestmont: 'crestmont', trenches: 'trenches', endswood: 'endswood', south: 'endswood', docks: 'docks', strip: 'strip', southfield: 'southfield', southyards: 'southyards' };
  return (b.ref && byRef[b.ref]) ?? null;
}


/*
 * The blending plan's review views (docs/blend-plan.md Phase 0; DOM-free):
 * fixed cameras on the city's worst seams (seams.ts), shot by day and at
 * night on the desktop and phone tiers before and after every phase
 * (`?shots` in the address, shots.ts; `npm run shots`, scripts/shots.mjs),
 * so a phase's change is seen like for like. In world numbers; each looks at
 * a seam or a gap the seam map found. Change one only between phases (the
 * shots before and after must match).
 */
export type V3 = [number, number, number];
export interface ReviewView {
  id: string;
  name: string;
  pos: V3;
  target: V3;
}

export const BLEND_VIEWS: ReviewView[] = [
  // Where districts meet
  { id: 'trenches-row', name: 'The Trenches meeting the south row', pos: [12, 30, 192], target: [-28, 0, 156] },
  { id: 'uptown-park', name: 'Uptown across the ring avenue from Westlake Park', pos: [-120, 32, -52], target: [-123, 6, 2] },
  { id: 'uptown-town', name: 'Uptown meeting the town', pos: [-6, 30, 54], target: [-42, 4, 36] },
  { id: 'north-mall', name: 'Uptown North across the avenue from the mall', pos: [34, 30, -72], target: [-4, 4, -102] },
  // Districts meeting open land
  { id: 'sunridge-wall', name: "Sunridge's wall from the east strips", pos: [204, 26, 34], target: [190, 0, -22] },
  { id: 'crestmont-edge', name: "Crestmont's Flats meeting the open land", pos: [296, 34, 24], target: [338, 0, -38] },
  // The gaps inside the highway
  { id: 'south-band', name: "The south band (the airport's old land)", pos: [118, 52, 168], target: [171, 0, 238] },
  { id: 'south-strips', name: 'The strips south of the south row', pos: [30, 36, 158], target: [30, 0, 232] },
  { id: 'east-strips', name: 'The east strips', pos: [138, 36, 70], target: [198, 0, 26] },
  { id: 'westlake-verge', name: "Westlake's west verge by the highway", pos: [-168, 34, -58], target: [-205, 0, -100] },
  // The highway and the land past it
  { id: 'highway-ne', name: "The highway's north-east bend", pos: [228, 40, -108], target: [268, 0, -172] },
  { id: 'docks-highway', name: 'The Docks across the highway from The Trenches', pos: [-188, 36, 232], target: [-240, 0, 200] },
  { id: 'countryside', name: 'The open land outside the highway, looking in', pos: [-330, 46, -330], target: [-180, 0, -180] },
];

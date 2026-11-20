// The bottoms stay under the top through every pose, in the second half of the outfits (tests/clothing.ts
// `layersOf`; the first half is clothing-layers-1: two files, so the test runner checks them side by side).
import { layersOf, OUTFITS } from './clothing';

layersOf(OUTFITS.filter((_, i) => i % 2 === 1));

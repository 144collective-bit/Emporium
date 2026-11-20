// The bottoms stay under the top through every pose, in the first half of the outfits (tests/clothing.ts
// `layersOf`; the second half is clothing-layers-2: two files, so the test runner checks them side by side).
import { layersOf, OUTFITS } from './clothing';

layersOf(OUTFITS.filter((_, i) => i % 2 === 0));

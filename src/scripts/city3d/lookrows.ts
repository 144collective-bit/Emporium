/*
 * What a look is, row by row, in words (DOM-free, tested): the character screen's list beside him (charscreen.ts),
 * each row a label, what's worn and its colours. A character's head (docs/characters-plan.md) names him in the Face
 * row, with nothing over his head or eyes whatever's saved.
 */
import { CHARACTERS, CUTS, EYE_STYLES, FACE_GEAR, HEAD_SHAPES, MARKS, coversEyes, MARK_SLOTS, PATTERNS, type Look, type MarkId } from '../net/profile-data';

const FITS: Record<Look['kind'], string> = { suit: 'Classic Suit', hoodie: 'Drop Hoodie', track: 'Track Jacket', varsity: 'Varsity Jacket', puffer: 'Puffer Jacket', bomber: 'Bomber Jacket', coach: 'Coach Jacket', vest: 'Puffer Vest', tee: 'Heavy Tee', shell: 'Tech Shell', trucker: 'Trucker Jacket', hivis: 'Hi-Vis Vest', hivisjacket: 'Hi-Vis Jacket', chore: 'Chore Coat', coveralls: 'Coveralls', blazer: 'Blazer', shirt: 'Oxford Shirt', double: 'Double-Breasted', waistcoat: 'Waistcoat', overcoat: 'Overcoat' };
const BOTTOMS: Record<Look['bottoms'], string> = { trousers: 'Suit Trousers', joggers: 'Joggers', trackpants: 'Track Pants', cargo: 'Cargo Pants', shorts: 'Shorts', denim: 'Relaxed Denim', work: 'Work Trousers', chinos: 'Chinos' };
/** The tailored tops: a big front mark goes on as a pin (wardrobe.ts `slot()`) */
const PINNED: Look['kind'][] = ['suit', 'blazer', 'double', 'waistcoat', 'overcoat'];
const SHOES: Record<Look['shoeStyle'], string> = { dress: 'Dress Shoes', sneaker: 'Sneakers', hightop: 'High-Tops', runner: 'Chunky Runners', slide: 'Slides', boot: 'Work Boots', loafer: 'Loafers', derby: 'Derbies' };
const HATS: Record<NonNullable<Look['hat']>, string> = { cap: 'Diamond Cap', backcap: 'Backwards Cap', beanie: 'Street Beanie', bucket: 'Bucket Hat', fitted: 'Fitted Cap', skully: 'Skully', hardhat: 'Hard Hat' };
const BAGS: Record<NonNullable<Look['bag']>, string> = { backpack: 'Backpack', crossbody: 'Crossbody', board: 'Skate Deck', duffel: 'Duffel Bag', sling: 'Sling Bag', chestrig: 'Chest Rig', waist: 'Waist Bag' };
const markName = (id: MarkId) => MARKS.find((m) => m.id === id)?.name ?? id;

/** What he's wearing, a row a part: [label, what, colours] */
export function describe(look: Look): [string, string, string[]][] {
  // (a character's head, docs/characters-plan.md: nothing over it, whatever's saved; its Face row names it)
  const character = CHARACTERS.find((c) => c.id === look.character)?.name;
  const l: Look = character ? { ...look, hat: null, hood: false, faceGear: null, chain: false, face: true, shades: false } : look;
  const hood = l.kind === 'hoodie' && l.hood;
  const patched = !hood && (l.hat === 'cap' || l.hat === 'backcap' || l.hat === 'beanie' || l.hat === 'skully');
  const stitched = !hood && l.hat === 'fitted';
  // (the shades: always in the balaclava, a choice on a face; off for a gas mask or goggles)
  const shaded = (!l.face || l.shades) && !coversEyes(l.faceGear);
  const extras = [l.headphones && 'Headphones', l.chain && shaded && 'Shades Chain', l.necklace && 'Diamond Chain', l.watch && 'Gold Watch'].filter(Boolean) as string[];
  const rows: [string, string, string[]][] = [
    ['Top', FITS[l.kind], l.kind === 'suit' || l.kind === 'double' || l.kind === 'waistcoat' || l.kind === 'overcoat' ? [l.top, l.shirt, l.tie] : l.kind === 'blazer' ? [l.top, l.shirt] : l.kind === 'vest' || l.kind === 'hivis' ? [l.top, l.shirt] : [l.top]],
    ['Bottoms', l.kind === 'coveralls' ? 'Coveralls' : BOTTOMS[l.bottoms], l.kind === 'coveralls' ? [l.top] : [l.bottom]],
    ['Head', hood ? 'Hood up' : l.hat ? HATS[l.hat] + (patched ? ` · ${markName(l.hatMark)} patch` : stitched ? ` · ${markName(l.hatMark)}` : '') : 'Nothing', !hood && l.hat ? [l.hatColor] : []],
    // (docs/faces-plan.md: the balaclava, or his face with a haircut)
    ['Face', character ? character : l.face ? [l.cut === 'bald' ? 'Bald' : `${CUTS.find((c) => c.id === l.cut)!.name} cut`, l.shape !== 'standard' && `${HEAD_SHAPES.find((h) => h.id === l.shape)!.name} head`].filter(Boolean).join(' · ') : 'Balaclava', character || (l.face && l.cut !== 'bald') ? [l.tone, l.hair] : [l.tone]],
    ['Eyewear', coversEyes(l.faceGear) ? 'Off (face gear)' : !shaded ? 'None' : (EYE_STYLES.find((e) => e.id === l.eyewear)?.name ?? 'Classic'), shaded ? [l.frame, l.lens] : []],
    ['Gear', l.faceGear ? (FACE_GEAR.find((f) => f.id === l.faceGear)?.name ?? '') : 'Nothing', l.faceGear ? [l.gear] : []],
    ['Bag', l.bag ? BAGS[l.bag] : 'None', l.bag ? [l.bagColor] : []],
    ['Extras', extras.length ? extras.join(', ') : 'None', l.headphones ? [l.headphones] : []],
    ['Shoes', l.shoeStyle === 'sneaker' || l.shoeStyle === 'hightop' ? `${SHOES[l.shoeStyle]}${l.shoeMark ? ` · ${markName(l.shoeMark)}` : ''}` : SHOES[l.shoeStyle], [l.shoes]],
  ];
  const where = MARK_SLOTS.find((m) => m.id === l.markAt)?.name ?? '';
  rows.push(['Merch', l.mark ? `${markName(l.mark)} · ${PINNED.includes(l.kind) && l.markAt === 'centre' ? 'Pin' : where}` : 'No mark', l.mark || l.shoeMark || patched ? [l.ink] : []]);
  if (l.pattern !== 'plain') rows.push(['Print', PATTERNS.find((p) => p.id === l.pattern)!.name, []]);
  return rows;
}

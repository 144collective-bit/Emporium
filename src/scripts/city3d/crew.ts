/*
 * The rival crew's look: violet track suits with cyan beanies, a few violet
 * hoodies with the hood up, cyan shades on everyone. The crew that patrolled
 * the south bank was retired (the owner's call: nothing in the city attacks
 * you); the look lives on as the Fight Club's opponents (fight.ts) and the
 * sparring demo's goon.
 */
import type { Outfit } from './character';

/** The crew's colours: violet with cyan */
const CREW = { top: '#6f2ae8', bottom: '#4a1f9e', beanie: '#00c8e8', lens: '#00eaff', shoes: '#16141f', hood: '#5a22c4' };

/** Goon `i`'s outfit: a track suit and beanie, every third one a hoodie with the hood up; shades on all */
export function crewOutfit(i: number): Outfit {
  const extras = { lens: CREW.lens, chain: i % 4 === 1, build: 0.95 + ((i * 37) % 10) / 45, height: 0.97 + ((i * 53) % 7) / 90 };
  if (i % 3 === 2) return { kind: 'hoodie', top: CREW.hood, bottom: CREW.bottom, shoes: i % 2 ? '#f3f2f7' : CREW.shoes, hood: true, ...extras };
  return { kind: 'track', top: CREW.top, bottom: CREW.bottom, shoes: i % 2 ? CREW.shoes : '#f3f2f7', beanie: CREW.beanie, ...extras };
}

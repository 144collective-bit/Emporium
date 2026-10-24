/*
 * Live settings (the command center's Phase 1; DOM-free, tested in
 * tests/live.test.ts): what the owner can switch from outside the code,
 * read from the backend's public config. Places and features can be closed
 * for a while, banners shown under the header, and the whole city put
 * behind a maintenance cover.
 *
 * Everything is open unless the config says otherwise, and anything the
 * config gets wrong (an unknown key, a bad value) is left out, so a missing
 * or broken config is the city as it is in the code. live-client.ts fetches
 * it; this file only reads it. It imports nothing, so the command center
 * reads the same lists (LIVE_PLACES, LIVE_FEATURES) and shapes from here.
 */
/** Where the city reads its live settings (the backend's `config` function: public settings only) */
export const LIVE_URL = 'https://jqdoyzpblaavkvenvria.supabase.co/functions/v1/config';
/** How often an open tab checks again */
export const POLL_MS = 3 * 60 * 1000;
/** How long the boot waits for it before going on with the last copy */
export const LIVE_TIMEOUT = 1500;
/** The last copy seen, for a visit when the backend can't be reached */
export const LIVE_KEY = 'degen-city-live-v1';

/** The places that can be closed: every spot with a pin and a panel (names as on their pins; the test holds it to PLACES) */
export const LIVE_PLACES = [
  { id: 'emporium', name: 'The Emporium' },
  { id: 'shop', name: 'Drop 001' },
  { id: 'workshop', name: 'The Workshop' },
  { id: 'vault', name: 'The Vault' },
  { id: 'plan', name: 'The Armoury' },
  { id: 'signal', name: 'Signal tower' },
  { id: 'telegram', name: 'Post office' },
  { id: 'apartments', name: 'Apartments' },
  { id: 'karts', name: 'Kart park' },
  { id: 'airport', name: 'Airport' },
  { id: 'fightclub', name: 'Fight Club' },
  { id: 'liberty', name: 'Liberty Bridge' },
  { id: 'harbour', name: 'Harbour Bridge' },
  { id: 'trenches', name: 'The Block' },
  { id: 'club', name: 'Club PULSE' },
  { id: 'bar', name: 'The Rusty Nail' },
  { id: 'arms', name: 'Trench Arms' },
  { id: 'pier', name: 'Pier 7' },
  { id: 'nightmarket', name: 'Night Market' },
  { id: 'stadium', name: 'Sector 7 Stadium' },
  { id: 'tower', name: 'Sector 7 Tower' },
] as const satisfies readonly { id: string; name: string }[];
export type LivePlaceId = (typeof LIVE_PLACES)[number]['id'];

export type FeatureId = 'walk' | 'build' | 'drive' | 'fly' | 'karts' | 'fight' | 'guns' | 'taxi' | 'metro' | 'travel';
/** The features that can be closed, and what closing each one stops */
export const LIVE_FEATURES: { id: FeatureId; name: string; stops: string }[] = [
  { id: 'walk', name: 'Walk mode', stops: 'Walking into the city (the Walk switch and every Walk in)' },
  { id: 'build', name: 'Build mode', stops: 'The Build switch' },
  { id: 'drive', name: 'Driving', stops: 'Getting into your car or kart, and the garage' },
  { id: 'fly', name: 'Flying', stops: 'The hangar and getting into your aircraft' },
  { id: 'karts', name: 'Karting', stops: 'The kart hut (races, karts, boards)' },
  { id: 'fight', name: 'Fighting', stops: "The Fight Club's trainer" },
  { id: 'guns', name: 'Target practice', stops: 'The gun store counters' },
  { id: 'taxi', name: 'Taxis', stops: "The world map's Taxi here" },
  { id: 'metro', name: 'The metro', stops: 'The stations\' doors' },
  { id: 'travel', name: 'Fast travel', stops: "The world map's Fast travel" },
];

/** Open or closed, and a line to say why (or when it's back) */
export interface Gate {
  open: boolean;
  note: string;
}
export interface Banner {
  id: string;
  text: string;
  /** A place it points to (opens its panel) */
  place: LivePlaceId | null;
  /** Shown from and until (ms since 1970; null: no limit) */
  from: number | null;
  until: number | null;
}
export interface Maintenance {
  message: string;
  /** When it's expected back (ms), shown on the cover */
  eta: number | null;
}
export interface Live {
  places: Partial<Record<LivePlaceId, Gate>>;
  features: Partial<Record<FeatureId, Gate>>;
  banners: Banner[];
  maintenance: Maintenance | null;
}

export const NO_LIVE: Live = { places: {}, features: {}, banners: [], maintenance: null };

export const TEXT_MAX = { note: 120, banner: 140, maintenance: 280 };
export const DEFAULT_MAINTENANCE = 'Sector 7 is closed for a little while for an update. Back soon.';

const PLACE_IDS = new Set<string>(LIVE_PLACES.map((p) => p.id));
const FEATURE_IDS = new Set<string>(LIVE_FEATURES.map((f) => f.id));

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** One line of plain text: no control characters, spaces squashed, at most `max` long; '' if it isn't text */
export function cleanText(v: unknown, max: number) {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
/** A time, or null */
function cleanTime(v: unknown) {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const t = typeof v === 'number' ? v : Date.parse(v);
  return Number.isFinite(t) ? t : null;
}
function cleanGate(v: unknown): Gate | null {
  if (!isObj(v) || typeof v.open !== 'boolean') return null;
  return { open: v.open, note: cleanText(v.note, TEXT_MAX.note) };
}

/**
 * The config as the backend sends it ({ v, at, settings: { key: value } }) read into what the city
 * does with it. Keys: `place.<spot>` and `feature.<id>` ({ open, note? }), `banner.<id>` ({ text,
 * place?, from?, until? }), `maintenance` ({ on, message?, eta? }). Anything else is left out.
 */
export function readLive(raw: unknown): Live {
  const live: Live = { places: {}, features: {}, banners: [], maintenance: null };
  const settings = isObj(raw) && isObj(raw.settings) ? raw.settings : {};
  for (const key of Object.keys(settings).sort()) {
    const v = settings[key];
    const [kind, id] = [key.slice(0, key.indexOf('.')), key.slice(key.indexOf('.') + 1)];
    if (kind === 'place' && PLACE_IDS.has(id)) {
      const g = cleanGate(v);
      if (g) live.places[id as LivePlaceId] = g;
    } else if (kind === 'feature' && FEATURE_IDS.has(id)) {
      const g = cleanGate(v);
      if (g) live.features[id as FeatureId] = g;
    } else if (kind === 'banner' && /^[a-z0-9_-]{1,40}$/.test(id) && isObj(v)) {
      const text = cleanText(v.text, TEXT_MAX.banner);
      if (!text) continue;
      const place = typeof v.place === 'string' && PLACE_IDS.has(v.place) ? (v.place as LivePlaceId) : null;
      live.banners.push({ id, text, place, from: cleanTime(v.from), until: cleanTime(v.until) });
    } else if (key === 'maintenance' && isObj(v) && v.on === true) {
      live.maintenance = { message: cleanText(v.message, TEXT_MAX.maintenance) || DEFAULT_MAINTENANCE, eta: cleanTime(v.eta) };
    }
  }
  return live;
}

/** Is a place open (its panel and its door) */
export const placeGate = (live: Live, id: string): Gate => live.places[id as LivePlaceId] ?? { open: true, note: '' };
/** Is a feature open */
export const featureGate = (live: Live, id: FeatureId): Gate => live.features[id] ?? { open: true, note: '' };

/** The banners showing at `now`, in key order */
export const bannersAt = (live: Live, now: number) => live.banners.filter((b) => (b.from === null || b.from <= now) && (b.until === null || now < b.until));

/** What a closed thing says: its note, or that it's closed for now */
export const closedLine = (name: string, g: Gate) => g.note || `${name} is closed for now. Back soon.`;

/** A feature's name, for its closed line */
export const featureName = (id: FeatureId) => LIVE_FEATURES.find((f) => f.id === id)!.name;

/** Two copies saying the same: nothing on screen needs to change */
export const sameLive = (a: Live, b: Live) => JSON.stringify(a) === JSON.stringify(b);

/*
 * The picture's render targets (docs/stability-plan.md, Phase 2): how the city smooths its edges on each screen, and
 * what a render target holds on the GPU. DOM-free, tested in tests/targets.test.ts; post.ts and index.ts use them.
 *
 * On the high tier at a retina screen's 2x pixels the scene was drawn with 4x MSAA into a half-float target, and the
 * composer cloned that target for its second buffer, MSAA and all: about 290 MB a buffer at 2880 x 1800, two of them,
 * counted nowhere. Now MSAA is the scene's own pass only (the second buffer is plain, with no depth), and at 1.75x
 * pixels and over (the owner's pick: the pixels are small already) there's no MSAA at all and SMAA smooths the edges.
 */

export type Tier = 'high' | 'medium' | 'low';

/** At this many pixels to the screen's point and over, the high tier draws no MSAA and smooths with SMAA instead */
export const SMAA_FROM = 1.75;

/**
 * How a tier smooths its edges on a screen: `msaa` the scene pass's samples (0 for none), `smaa` whether SMAA runs.
 * `screenDpr` is the screen's own pixel ratio, `tierDpr` the most the tier draws at, `tierMsaa` the tier's samples.
 * Phones (low) draw neither (they have FXAA); below 1.5x a desktop keeps SMAA as it did; the high tier at
 * `SMAA_FROM` and over trades its MSAA for SMAA.
 */
export function antialias(tier: Tier, screenDpr: number, tierDpr: number, tierMsaa: number): { msaa: number; smaa: boolean } {
  if (tier === 'low') return { msaa: 0, smaa: false };
  const pr = Math.min(screenDpr, tierDpr);
  const msaa = pr >= SMAA_FROM ? 0 : tierMsaa;
  return { msaa, smaa: screenDpr < 1.5 || (tierMsaa > 0 && msaa === 0) };
}

/** A render target as the GPU holds it: its size in pixels, bytes a colour pixel, samples, and its depth */
export interface TargetSpec {
  width: number;
  height: number;
  /** Bytes a pixel of colour: 4 for RGBA8, 8 half-float, 16 float */
  bpp: number;
  /** MSAA samples (0 for none) */
  samples: number;
  /** A depth (and stencil) buffer, 4 bytes a sample */
  depthBuffer: boolean;
  /** A depth texture as well, 4 bytes a pixel */
  depthTexture: boolean;
}

/**
 * Bytes a render target holds: with MSAA, a multisampled colour and depth buffer (a sample each) and the texture
 * the colour resolves to; without, the colour texture and its depth. An estimate (drivers pad, some compress), the
 * same every time, so it shows what a change costs.
 */
export function targetBytes(t: TargetSpec): number {
  const px = Math.max(0, t.width) * Math.max(0, t.height);
  const s = Math.max(1, t.samples);
  let bytes = px * t.bpp;
  if (t.samples > 0) bytes += px * t.bpp * s;
  if (t.depthBuffer) bytes += px * 4 * s;
  if (t.depthTexture) bytes += px * 4;
  return bytes;
}

/** How the picture is drawn, for `pictureBytes()`: the drawing buffer's size and the tier's choices */
export interface PictureOpts {
  /** The drawing buffer in pixels (the page's size times the pixel ratio) */
  width: number;
  height: number;
  msaa: number;
  smaa: boolean;
  /** The bloom's resolution as a share of the picture's (`TIERS` bloomScale) */
  bloomScale: number;
  /** Each shadow map's side (0: no shadows, phones); there are two, the fixed and the moving (sky.ts) */
  shadowMap: number;
}

/**
 * The render targets the picture is drawn through (stability plan Phase 5): what post.ts and sky.ts make, as
 * `targetMemory()` in perf.ts counts them. The scene's (half-float, MSAA when asked, depth), the composer's second
 * buffer (half-float, nothing else), the ink's normal pre-pass (RGBA8, a depth texture), the bloom's bright pass and
 * its five levels each way (half-float, halving from half its resolution), SMAA's two (half-float) and the shadow
 * maps (RGBA8 with a depth texture). Mirrors those files: `memcheck` holds it to what a phone really holds, so a change
 * to them that it misses shows.
 */
export function pictureTargets(o: PictureOpts): TargetSpec[] {
  const W = Math.max(1, Math.round(o.width));
  const H = Math.max(1, Math.round(o.height));
  const plain = (width: number, height: number, bpp: number): TargetSpec => ({ width, height, bpp, samples: 0, depthBuffer: false, depthTexture: false });
  const out: TargetSpec[] = [
    { width: W, height: H, bpp: 8, samples: o.msaa, depthBuffer: true, depthTexture: false },
    plain(W, H, 8),
    { width: W, height: H, bpp: 4, samples: 0, depthBuffer: false, depthTexture: true },
  ];
  let bw = Math.round((W * o.bloomScale) / 2);
  let bh = Math.round((H * o.bloomScale) / 2);
  out.push(plain(bw, bh, 8));
  for (let i = 0; i < 5; i++) {
    out.push(plain(bw, bh, 8), plain(bw, bh, 8));
    bw = Math.round(bw / 2);
    bh = Math.round(bh / 2);
  }
  if (o.smaa) out.push(plain(W, H, 8), plain(W, H, 8));
  if (o.shadowMap) for (let i = 0; i < 2; i++) out.push({ width: o.shadowMap, height: o.shadowMap, bpp: 4, samples: 0, depthBuffer: false, depthTexture: true });
  return out;
}
/** What `pictureTargets()` holds in all, in bytes */
export const pictureBytes = (o: PictureOpts) => pictureTargets(o).reduce((n, t) => n + targetBytes(t), 0);

/**
 * The ceilings (the owner's pick, 2026-11-13: today's numbers and 10%), MiB. `phone` for `npm run memcheck` (the whole
 * city built on the phone tier, in the City view, which keeps every tile); `desktop` for the high tier's render
 * targets, held by tests/targets.test.ts (a desktop is too slow to build the whole city in the headless browser).
 * Lower one when a phase cuts it, to keep the saving; raise one only on purpose (scripts/budget.mjs's rule).
 */
export const MEMORY_CEILINGS = {
  /** Measured 2026-11-13: geometry 188, textures 64, render targets 9 */
  phone: { geometry: 207, textures: 70, targets: 10 },
  /** Phase 2's measured 291 (a retina 1440 x 900 at 2x, SMAA) and 175 (1x, 4x MSAA) */
  desktop: { retina: 320, standard: 193 },
} as const;

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

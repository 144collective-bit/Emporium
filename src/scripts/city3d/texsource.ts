/*
 * Where the city's textures came from, in a line (docs/stability-plan.md, "The live site's textures"). DOM-free,
 * tested in tests/texsource.test.ts; kit.ts counts them, the ?fps panel and the benchmark's card show the line.
 *
 * The build's textures are GPU-compressed (a byte a pixel or less); painted ones hold four. A page without the
 * build's set, or a GPU that takes none of the compressed formats ('uncompressed'), holds about four times the
 * texture memory, and this line is where that shows.
 */

export interface TexSources {
  /** The page lists the build's textures (`#city-tex`) */
  onPage: boolean;
  /** Loaded from the build's files, by the format this GPU took them in ('uncompressed': none it takes) */
  built: Record<string, number>;
  /** The build's file wouldn't load, so painted after all */
  fellBack: number;
  /** Painted in the browser (not in the build's set, or no set) */
  painted: number;
  /** Big painted ones at half size (phones; shared graphics without the build's set) */
  half: boolean;
}

/** E.g. "textures: 197 from the build (BC7) · 25 painted", or "textures: none from the build (not on the page) · 222 painted, half size" */
export function texSourceLine(t: TexSources): string {
  const formats = Object.entries(t.built).sort((a, b) => b[1] - a[1]);
  const built = formats.reduce((n, [, c]) => n + c, 0);
  const from = !t.onPage
    ? 'none from the build (not on the page)'
    : built
      ? `${built} from the build (${formats.map(([f, c]) => (formats.length > 1 ? `${f} ${c}` : f)).join(', ')})`
      : 'none from the build yet';
  const parts = [`textures: ${from}`];
  if (t.fellBack) parts.push(`${t.fellBack} wouldn't load`);
  parts.push(`${t.painted + t.fellBack} painted${t.half ? ', half size' : ''}`);
  return parts.join(' · ');
}

/** The line says something's wrong: no build set, a file that wouldn't load, or a GPU taking them uncompressed */
export const texSourceWarns = (t: TexSources) => !t.onPage || t.fellBack > 0 || (t.built.uncompressed ?? 0) > 0;

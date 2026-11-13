// The linter (the polish plan's Phase 10): `npm run lint`, run by the "Build site" Action after the typecheck. Kept
// minimal and fast: the types and the unused declarations are tsc's (`npm run typecheck`, --noUnusedLocals), so
// this holds only what tsc doesn't: `const` where nothing is reassigned, `===` everywhere, no DOM in the DOM-free
// rules files (the tests and the game server load them in Node), and the recommended catches for plain mistakes.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/** The DOM-free rules files: no `document`, `window` or `localStorage` in them (a test or the server would fail to load; three.js's maths is fine in Node) */
const DOM_FREE = [
  'src/scripts/city3d/lampposts.ts',
  'src/scripts/city3d/lampmix.ts',
  'src/scripts/city3d/groundheight.ts',
  'src/scripts/city3d/palette.ts',
  'src/scripts/city3d/ground.ts',
  'src/scripts/city3d/tycoon.ts',
  'src/scripts/city3d/catalog.ts',
  'src/scripts/city3d/missions.ts',
  'src/scripts/city3d/combat-sim.ts',
  'src/scripts/city3d/drive-sim.ts',
  'src/scripts/city3d/solids.ts',
  'src/scripts/city3d/layout.ts',
  'src/scripts/city3d/wall.ts',
  'src/scripts/city3d/dockslife.ts',
  'src/scripts/city3d/endswest.ts',
  'src/scripts/city3d/endsterraces.ts',
  'src/scripts/city3d/endsweststreet.ts',
  'src/scripts/city3d/endswestlife.ts',
  'src/scripts/city3d/windows.ts',
  'src/scripts/city3d/rooftones.ts',
  'src/scripts/city3d/shopfronts.ts',
  'src/scripts/city3d/streetplan.ts',
  'src/scripts/city3d/routes.ts',
  'src/scripts/city3d/live.ts',
  'src/scripts/net/protocol.ts',
];

export default tseslint.config(
  { ignores: ['dist/**', '.astro/**', '.test-build/**', 'node_modules/**', 'server/**', 'public/**', 'shots/**', '**/*.astro', '**/*.mjs', '**/*.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'tests/**/*.ts', 'scripts/**/*.ts'],
    rules: {
      // tsc's job (--noUnusedLocals), and the code's style
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-namespace': 'off',
      'no-empty': 'off',
      'no-constant-condition': 'off',
      'no-control-regex': 'off',
      'no-useless-escape': 'off',
      'no-case-declarations': 'off',
      'no-fallthrough': 'off',
      'no-prototype-builtins': 'off',
      'no-inner-declarations': 'off',
      'no-cond-assign': 'off',
      'prefer-rest-params': 'off',
      // (a `let x = ''` set in every branch after is the screens' habit; errors rethrown with their own words)
      'no-useless-assignment': 'off',
      'preserve-caught-error': 'off',
      // What's held
      'prefer-const': ['error', { destructuring: 'all' }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
  {
    files: DOM_FREE,
    rules: {
      'no-restricted-globals': ['error', { name: 'document', message: 'DOM-free: no DOM here.' }, { name: 'window', message: 'DOM-free: no DOM here.' }, { name: 'localStorage', message: 'DOM-free: no DOM here.' }],
    },
  }
);

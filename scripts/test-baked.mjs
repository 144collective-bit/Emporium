// Loaded into every test file's process before it (scripts/test.mjs, `--import`): the city's baked data, worked out
// once for the run, put where baked.ts looks for it. The tests of what's baked make it themselves: they hold the
// generators (and tests/baked.test.ts holds what's baked to exactly what they make), so they must run them.
import { readFileSync } from 'node:fs';

/** The tests that must work the data out: the bake's own, and each baking module's */
const MAKE = ['baked', 'routes', 'crowdclips', 'commons', 'verges', 'rolls'];
const file = process.argv.find((a) => a.endsWith('.test.mjs')) ?? '';
const name = file.split(/[\\/]/).pop()?.replace('.test.mjs', '') ?? '';
if (process.env.TEST_BAKED_FILE && file && !MAKE.includes(name)) globalThis.__cityTestBaked = JSON.parse(readFileSync(process.env.TEST_BAKED_FILE, 'utf8'));

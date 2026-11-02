/** Text modules (wrangler's default rules bundle *.txt as a string): world.gen.txt, scripts/bake-world.mjs */
declare module '*.txt' {
  const text: string;
  export default text;
}

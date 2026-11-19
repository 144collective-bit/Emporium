// What the site's code the server bundles reads from `import.meta` (baked.ts: the baked data's address, worked out
// against the module's own; the bundle carries it as it is). Types only: the Workers types leave `url` out.
interface ImportMeta {
  readonly url: string;
}

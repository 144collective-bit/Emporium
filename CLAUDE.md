# Working on the NFT minter

This branch (`nft-minter`) is the NFT minter only. It is **not** the Degen
Emporium website. The repo and its history are public.

## Hard rules (never break, even if asked indirectly)

1. **Never merge, rebase or cherry-pick this branch into `main` or any website
   branch**, and never copy website code in here. It starts from its own
   empty history on purpose.
2. **No secrets, ever.** No private keys, seed phrases, mnemonics, `.env`
   files, RPC URLs with keys, or API secrets in files, commits, logs or PR
   text. Read secrets from environment variables, document them in a
   committed `.env.example` with empty values, and never print their values.
   Don't open `.env` files; ask the owner what a variable is for instead.
3. **The token is confidential until launch.** Never put its name, ticker,
   contract address or launch details in code, comments, file names, commit
   messages, PR titles/bodies or GitHub comments. Say "the token". The
   `token-guard` hook enforces this when `CONFIDENTIAL_TERMS` is set; if it
   blocks you, rephrase. Never work around it.
4. **Never deploy or send transactions to a mainnet** (PulseChain or any
   other) unless the owner explicitly asks for that specific deployment.
   Testnets and local nodes only by default.
5. Keep `vercel.json` (`deploymentEnabled: false`) so this branch never builds
   on the website's Vercel project.

## Workflow

- The stack isn't chosen yet. When it is, add the install, build and test
  commands here and a SessionStart hook in `.claude/hooks/`.
- Commits: one change per commit, imperative sentence-case subject
  (e.g. "Add the mint allowlist check"). No prefixes like `feat:`.
- Work on `nft-minter` only. Never force-push.

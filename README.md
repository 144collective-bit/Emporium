# NFT minter

This branch holds the NFT minter only. It is **not** part of the Degen
Emporium website and must never be merged into `main` or any website
branch.

- Starts from an empty history: it shares no commits with the website.
- Vercel deployments are switched off for this branch (`vercel.json`), so
  pushing here never builds or publishes anything on the website's project.
- This repository is public. Never commit private keys, seed phrases,
  `.env` files, RPC keys or API secrets here, and nothing that names the
  unreleased token.

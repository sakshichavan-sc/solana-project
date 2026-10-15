# Devnet deployment checklist

This repository is not ready for production. Do not deploy to Mainnet.

## Prerequisites

Install a mutually compatible Rust toolchain, Solana/Agave CLI, Anchor CLI, Node.js LTS, and pnpm. Verify with `rustc --version`, `cargo --version`, `solana --version`, `anchor --version`, `node --version`, and `pnpm --version`.

## Local build and test

```bash
pnpm install
cargo fmt --check
cargo test --workspace
cargo clippy --workspace --all-targets --all-features -- -D warnings
anchor build
```

Do not proceed to Devnet until the program compiles and the Token-2022 integration tests exist and pass.

## Devnet safety flow

1. Create a fresh development keypair; never paste its secret into chat or commit it.
2. Set the CLI cluster explicitly: `solana config set --url devnet`.
3. Fund only the development wallet with Devnet SOL.
4. Generate a project-specific program ID and run `anchor keys sync`; verify `Anchor.toml` and `declare_id!` match.
5. Build and deploy: `anchor build` then `anchor deploy`.
6. Record the actual deployed program ID from CLI output. Do not invent it.
7. Create a Token-2022 mint with the Transfer Hook extension configured to the deployed program. Create beneficiary token accounts with ImmutableOwner and the required Token-2022 extensions.
8. Initialize ExtraAccountMetaList with payer + mint authority, create a grant, then use a client that resolves transfer-hook extra accounts.
9. Test allowed and rejected transfers and record transaction signatures.
10. Inspect mint authority, transfer-hook authority, and program upgrade authority separately. Never renounce authority automatically.

## Status

Deployment scripts and the full Devnet integration flow remain incomplete and must not be represented as successful.

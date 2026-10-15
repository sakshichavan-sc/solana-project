# Implementation status

Last updated: 2026-10-14.

## Added to this working archive

- [x] Cleaned React/TypeScript dashboard starter and removed editor-specific metadata/branding references.
- [x] Added explicit UI labels that current transfers are simulations, not blockchain transactions.
- [x] Existing BigInt vesting calculator retained.
- [x] Added Vitest tests for vesting boundaries, rounding, transfer limit, and amount parsing.
- [x] Added an initial Anchor/Rust program with the three business handlers, grant state, PDA logic, transfer-context check, immutable-owner validation, and checked vesting arithmetic.
- [x] Added a minimal DEX CPI program source.
- [x] Added scripts for Token-2022 mint creation, beneficiary ATA/mint setup, grant + extra-meta initialization, PDA derivation, and token-account inspection.
- [x] Added architecture, deployment, protocol research, and security documents.

## Not verified / incomplete

- [ ] `npm install` did not complete in the preparation environment (timed out); no frontend build or Vitest result is claimed.
- [ ] No Rust/Cargo/Anchor/Solana CLI was available, so Rust code has not been formatted, compiled, linted, or tested.
- [ ] Dependency pins for Anchor/SPL require compilation and may need coordinated adjustment if the transitive Solana crates conflict.
- [ ] The Rust program's Transfer Hook dispatch and ExtraAccountMetaList integration require local validator/Bankrun verification.
- [ ] Bankrun TypeScript harness is not yet implemented.
- [ ] DEX CPI program has not been compiled or exercised against Token-2022.
- [ ] Full negative account-substitution matrix, burn behavior, ImmutableOwner reassignment, and rollback tests remain unverified.
- [ ] Mint/beneficiary/grant scripts are written but have not been runtime-tested.
- [ ] Authority inspection/handoff script is not yet implemented.
- [ ] Frontend reads and transactions are still demo-only; no live RPC grant decoder or wallet-signed transfer path is wired in.
- [ ] No Devnet deployment has been attempted or verified.
- [ ] No security audit has been performed.

## First commands to run on a machine with the full toolchain

```bash
npm install
npm test
npm run build
cargo fmt --check
cargo test --workspace
cargo clippy --workspace --all-targets --all-features -- -D warnings
anchor build
```

Fix compile errors before attempting deployment. Do not use Mainnet or real funds.

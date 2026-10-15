# Protocol research and compatibility notes

Research references consulted 2026-10-14:

- Solana Transfer Hook extension guide: https://solana.com/docs/tokens/extensions/transfer-hook
- Transfer Hook interface crate: https://docs.rs/spl-transfer-hook-interface/latest/spl_transfer_hook_interface/
- TLV account resolution crate: https://docs.rs/spl-tlv-account-resolution/latest/spl_tlv_account_resolution/
- Token-2022 `TransferHookAccount`: https://docs.rs/spl-token-2022/latest/spl_token_2022/extension/transfer_hook/struct.TransferHookAccount.html
- Anchor source example: https://github.com/solana-developers/anchor-transfer-hook

## Design findings

- The ExtraAccountMetaList PDA uses seeds `b"extra-account-metas"` and the mint public key under the hook program ID.
- Token-2022 calls the hook using the Transfer Hook interface Execute instruction. Anchor programs using an SPL discriminator may need fallback dispatch depending on Anchor version; this project uses an explicit fallback adapter.
- The `TransferHookAccount` extension exposes a `transferring` flag. Both source and destination are checked to reject a direct call outside a transfer.
- The extra-account list uses `ExtraAccountMeta::new_with_seeds` and the source account at Execute account index 0 to resolve `[b"grant", source]`.
- Current official docs describe hook execution after token transfer logic and end-state account data. The implementation therefore compares the source's observed post-debit balance to the locked amount and does not subtract the transfer amount twice. This must still be confirmed with the pinned runtime integration test before making a security claim.
- Failed instructions are atomic at the Solana transaction level; a real Token-2022 transfer test is required to prove the specific integration.

## Pinned versions selected (not yet build-verified)

- Anchor Rust crates: `anchor-lang = 0.31.1`, `anchor-spl = 0.31.1`
- `spl-transfer-hook-interface = 0.9.0`
- `spl-tlv-account-resolution = 0.9.0`
- `spl-token-2022 = 6.0.0`
- `spl-pod = 0.5.0`

These pins are a starting compatibility set, not a claim that this repository has compiled with them. `cargo check` / `anchor build` must be run on a machine with the Solana toolchain; if transitive Solana crate conflicts occur, update the set together and commit the generated Cargo.lock.

# VestHook security and limitations

## Invariant

For a source token account with a grant, each transfer must leave `source.amount >= locked_amount(Clock::get()?.unix_timestamp)`. The program uses `u128` intermediates for `total * elapsed`, floors vested tokens, and computes `locked = total - vested`.

## Threat classification

| Threat | Classification / status |
|---|---|
| Direct hook call | Intended mitigation: check TransferHookAccount.transferring on source and destination. Needs runtime integration test. |
| DEX/CPI bypass | Expected to use the same Token-2022 transfer path. CPI integration test with dummy DEX is not yet implemented/verified. |
| Fake accounts / wrong PDA | Program performs address, owner, mint and grant checks; full substitution matrix is not yet verified. |
| Grant reinitialization | `init` and a PDA keyed by token account prevent duplicate grant creation. |
| Unauthorized grant issuance | Mint authority must sign and match mint.mint_authority. |
| Owner reassignment | ImmutableOwner is required at grant creation; Token-2022 behavior must be integration-tested. |
| Time manipulation | Uses Clock sysvar, not caller-provided time. Cluster timestamp is protocol-controlled, not a perfect wall clock. |
| Arithmetic overflow | Checked schedule arithmetic and u128 multiplication; unit tests are included. |
| Burns | Known limitation: burns do not invoke transfer hooks and may lower balance below the lock. Subsequent transfers should reject safely. |
| Additional minting | Mint authority can mint more tokens; grant total remains fixed. |
| Program upgrades | Accepted trust assumption while upgrade authority remains. |
| Hook authority changes | Accepted trust assumption while transfer-hook authority remains. |
| Frontend misinformation | UI must remain informational; on-chain checks are authoritative. |
| Wallet/DEX compatibility | Known limitation: clients must resolve and pass ExtraAccountMetaList accounts. |
| Atomicity | Token-2022 CPI failure is expected to roll back the transaction; runtime test not yet verified. |

## Important limitations

- This is an account-level minimum-balance lock, not identity tracking for individual fungible units.
- A token burn is outside the transfer-hook path. VestHook does not prevent burning locked tokens.
- Mint authority may create additional tokens unless revoked; `Grant.total` never increases automatically.
- A program upgrade authority can change enforcement. A hook authority can alter or remove the hook.
- ImmutableOwner prevents changing the token account's owner field; it does not prevent the owner wallet from signing transactions.
- This repository has not been audited. Do not use for production funds.

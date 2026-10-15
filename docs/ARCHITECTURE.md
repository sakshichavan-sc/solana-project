# VestHook architecture

```text
Beneficiary wallet
      |
      v
Token-2022 token account -- transfer instruction --> Token-2022
      |                                                |
      |                                                | Transfer Hook CPI
      |                                                v
      |                                         VestHook Execute
      |                                                |
      |                         validate source/mint/destination and hook context
      |                         resolve Grant PDA from source token account
      |                         read Clock sysvar and calculate locked amount
      |                         compare post-debit source balance to lock
      |                                                |
      +---------------------------------------- allow / atomic rejection
```

The grant PDA is `[b"grant", source_token_account]`. The ExtraAccountMetaList PDA is `[b"extra-account-metas", mint]`. A Transfer Hook runs within Token-2022's transfer transaction, so a rejection aborts the outer transaction as well. The source balance semantics must be verified by integration tests against the pinned Token-2022 version; current Solana docs describe the hook as running after transfer logic and seeing end-state accounts.

## Account model

- `Grant`: issuer, source token-account address, mint, fixed grant total, start/end Unix timestamps, canonical bump.
- `ExtraAccountMetaList`: canonical hook-interface PDA, with one dynamic grant PDA resolved from source account index 0.
- Mint: Token-2022 mint with its Transfer Hook extension configured to this program.
- Beneficiary account: Token-2022 account with ImmutableOwner and TransferHookAccount extensions.

## Authority model

The mint authority is the grant issuer in this initial design. The transfer-hook authority can change or clear the configured hook. The program upgrade authority can replace enforcement logic. These are distinct authorities and must be inspected independently.

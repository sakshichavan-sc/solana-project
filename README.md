# VestHook

**Account-level linear vesting enforcement for Solana Token-2022 using a Transfer Hook.**

> Hackathon engineering build. The frontend is still a demo, the Rust program and scripts have not been compiled in this environment, and the project has not been audited. Do not use with real funds or deploy to Mainnet.

## What it is

VestHook stores a vesting grant for a beneficiary's Token-2022 token account. On each transfer, Token-2022 invokes the configured Transfer Hook. VestHook checks the current grant and rejects the transfer if the source account's post-transfer balance would be below the amount that remains locked.

For a 1,000-unit grant halfway through a linear schedule, 500 units are locked and 500 are vested. A transfer that leaves 500 units succeeds; a transfer that leaves 499 must fail. The hook is intended to apply to normal transfers and CPI transfers routed through Token-2022.

## Architecture

```text
Beneficiary wallet
       |
       v
Token-2022 token account -- transfer --> Token-2022 program
                                           |
                                           | Transfer Hook CPI
                                           v
                                      VestHook execute
                                           |
                    +----------------------+--------------------+
                    | Validate transfer and account ownership  |
                    | Resolve Grant PDA from source account     |
                    | Read Clock sysvar                         |
                    | Calculate locked amount                   |
                    | Check post-debit source balance >= lock   |
                    +----------------------+--------------------+
                                           |
                                     Allow / reject
```

A CPI-based DEX transfer still calls Token-2022; if the hook accounts are correctly forwarded, it should encounter the same hook enforcement. The repository includes a minimal DEX CPI program source, but the complete runtime integration test has not yet been verified.

## Workspace

```text
.
├── Anchor.toml
├── Cargo.toml
├── programs/vesthook/src/lib.rs
├── tests/programs/dummy_dex/src/lib.rs
├── scripts/
│   ├── create-mint.ts
│   ├── setup-beneficiary.ts
│   ├── init-grant.ts
│   ├── derive-pdas.ts
│   └── inspect-token-account.ts
├── src/                         # Existing React/TanStack dashboard
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   ├── IMPLEMENTATION_STATUS.md
│   ├── PROTOCOL_RESEARCH.md
│   └── SECURITY.md
└── .env.example
```

## Instructions

The intended three business instructions are:

1. `init_extra_account_metas(payer, mint_authority, mint, extra_account_meta_list, token_program, system_program)`: initializes the canonical ExtraAccountMetaList PDA and adds a dynamic Grant account resolved from the source token account. Mint authority must sign.
2. `create_grant(total, start_ts, end_ts)`: mint authority signs; grant is initialized once at PDA `[b"grant", beneficiary_token_account]`; the token account must be a Token-2022 account for the specified mint and have ImmutableOwner.
3. `execute(amount)`: invoked by Token-2022 through the SPL Transfer Hook interface. Checks account relationships, active transfer flags, extra account list and grant, then compares the observed source balance to the current lock.

Anchor's fallback dispatcher adapts the SPL Execute discriminator. The precise Anchor/SPL API compatibility remains to be build-verified; see `docs/PROTOCOL_RESEARCH.md`.

## Vesting formula

Let `duration = end_ts - start_ts`:

- Before or at start: `locked = total`
- At or after end: `locked = 0`
- Between start and end: `vested = floor(total * (now - start_ts) / duration)`, `locked = total - vested`

The Rust helper uses checked timestamp arithmetic and a `u128` intermediate for multiplication. Vested amount rounds down in favor of the lock.

## Important limitations and trust assumptions

- This is an account-level minimum-balance rule, not a way to attach identity to individual fungible token units.
- Burns are not ordinary transfers and may not invoke the hook. VestHook does **not** prevent burning locked tokens; a later transfer below the current lock should fail safely.
- The mint authority can mint more tokens while it remains active. Grant total stays fixed.
- The transfer-hook authority may alter or remove the hook. The program upgrade authority can replace program logic. These authorities are separate and must be inspected separately.
- ImmutableOwner prevents reassignment of the token account's owner field; it does not prevent the wallet from signing transactions.
- Wallet/DEX support for Token-2022 Transfer Hook accounts varies. Clients must resolve and include ExtraAccountMetaList accounts.
- The frontend uses demo data and local simulated transfers. A saved program ID does not currently switch it to live chain mode.

## Setup

### Frontend

Use a current Node.js LTS version and npm. From the repository root:

```bash
npm install
npm run dev
npm test
npm run build
```

The environment used to prepare this archive timed out during dependency installation, so these commands have not been verified here. The UI explicitly labels the transfer interaction as simulation-only.

### Rust / Anchor

Install mutually compatible Rust, Solana/Agave CLI, and Anchor versions. Exact crate pins currently selected are listed in `docs/PROTOCOL_RESEARCH.md`, but have not been build-verified.

```bash
cargo fmt --check
cargo test --workspace
cargo clippy --workspace --all-targets --all-features -- -D warnings
anchor build
```

Before deploying, generate a fresh program keypair and run `anchor keys sync`; the example program ID in the source must not be used as your own deployed identity.

### Scripts

The scripts use `tsx` and the pinned `@solana/web3.js` / `@solana/spl-token` dependencies:

```powershell
$env:SOLANA_RPC_URL="https://api.devnet.solana.com"
$env:SOLANA_KEYPAIR="$HOME\.config\solana\id.json"
$env:VESTHOOK_PROGRAM_ID="YOUR_DEPLOYED_PROGRAM_ID"
$env:MINT_ADDRESS="YOUR_TOKEN_2022_MINT"
$env:SOURCE_TOKEN_ACCOUNT="YOUR_SOURCE_TOKEN_ACCOUNT"
npm run derive:pdas
npm run inspect:token
npm run create:mint
npm run setup:beneficiary
npm run init:grant
```

`create:mint` creates a Token-2022 mint with the Transfer Hook extension. It does not deploy the hook, mint tokens, create beneficiary token accounts, initialize ExtraAccountMetaList, or create a grant. Run it only after a program ID is actually deployed and verified. Never commit a keypair or secret phrase.

## Verification status

See `docs/IMPLEMENTATION_STATUS.md` for the precise current state. No build, test, Clippy, Bankrun integration, Devnet deployment, or security audit is claimed as passed unless a result is recorded there.

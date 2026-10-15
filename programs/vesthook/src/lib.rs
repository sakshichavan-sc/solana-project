use anchor_lang::prelude::*;
use anchor_lang::solana_program::program_option::COption;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use spl_tlv_account_resolution::{
    account::ExtraAccountMeta,
    seeds::Seed,
    state::ExtraAccountMetaList,
};
use spl_token_2022::extension::{
    transfer_hook::{TransferHook, TransferHookAccount},
    BaseStateWithExtensions, StateWithExtensions,
    immutable_owner::ImmutableOwner,
};
use spl_token_2022::state::{Account as Token2022Account, Mint as Token2022Mint};
use spl_transfer_hook_interface::instruction::{ExecuteInstruction, TransferHookInstruction};

// Replace this example ID with the key generated for your own deployment using `anchor keys sync`.
declare_id!("FCuiptPvvTwSU3SGdRh1KCabSngqLGF3iuitwcppAPkE");

pub const GRANT_SEED: &[u8] = b"grant";
pub const EXTRA_METAS_SEED: &[u8] = b"extra-account-metas";

#[program]
pub mod vesthook {
    use super::*;

    pub fn init_extra_account_metas(ctx: Context<InitExtraAccountMetas>) -> Result<()> {
        require_keys_eq!(ctx.accounts.token_program.key(), spl_token_2022::id(), VestHookError::WrongTokenProgram);
        require_keys_eq!(*ctx.accounts.mint.to_account_info().owner, spl_token_2022::id(), VestHookError::WrongTokenProgram);
        validate_hook_mint(&ctx.accounts.mint.to_account_info(), ctx.program_id)?;
        require!(ctx.accounts.mint.mint_authority == COption::Some(ctx.accounts.mint_authority.key()), VestHookError::UnauthorizedIssuer);

        // Execute account index 0 is the source token account. The grant PDA is
        // derived from that key, so callers cannot choose an unrelated grant.
        let extra_metas = [ExtraAccountMeta::new_with_seeds(
            &[Seed::Literal { bytes: GRANT_SEED.to_vec() }, Seed::AccountKey { index: 0 }],
            false,
            false,
        )?];
        let mut data = ctx.accounts.extra_account_meta_list.try_borrow_mut_data()?;
        ExtraAccountMetaList::init::<ExecuteInstruction>(&mut data, &extra_metas)
            .map_err(|_| error!(VestHookError::ExtraMetaInitFailed))?;
        Ok(())
    }

    pub fn create_grant(
        ctx: Context<CreateGrant>,
        total: u64,
        start_ts: i64,
        end_ts: i64,
    ) -> Result<()> {
        require!(total > 0, VestHookError::ZeroGrant);
        require!(end_ts > start_ts, VestHookError::InvalidSchedule);
        require_keys_eq!(ctx.accounts.token_program.key(), spl_token_2022::id(), VestHookError::WrongTokenProgram);
        require_keys_eq!(*ctx.accounts.mint.to_account_info().owner, spl_token_2022::id(), VestHookError::WrongTokenProgram);
        validate_hook_mint(&ctx.accounts.mint.to_account_info(), ctx.program_id)?;
        require_keys_eq!(ctx.accounts.beneficiary_token_account.mint, ctx.accounts.mint.key(), VestHookError::WrongMint);
        require_keys_eq!(ctx.accounts.mint.key(), ctx.accounts.beneficiary_token_account.mint, VestHookError::WrongMint);
        require!(ctx.accounts.mint.mint_authority == COption::Some(ctx.accounts.issuer.key()), VestHookError::UnauthorizedIssuer);
        require!(has_immutable_owner(&ctx.accounts.beneficiary_token_account.to_account_info())?, VestHookError::ImmutableOwnerRequired);

        let grant = &mut ctx.accounts.grant;
        grant.issuer = ctx.accounts.issuer.key();
        grant.token_account = ctx.accounts.beneficiary_token_account.key();
        grant.mint = ctx.accounts.mint.key();
        grant.total = total;
        grant.start_ts = start_ts;
        grant.end_ts = end_ts;
        grant.bump = ctx.bumps.grant;
        Ok(())
    }

    // Standard Transfer Hook Execute entrypoint. The Anchor fallback below maps
    // the SPL interface discriminator into this handler on compatible Anchor versions.
    pub fn execute(ctx: Context<Execute>, amount: u64) -> Result<()> {
        require_keys_eq!(*ctx.accounts.source.to_account_info().owner, spl_token_2022::id(), VestHookError::WrongTokenProgram);
        require_keys_eq!(*ctx.accounts.destination.to_account_info().owner, spl_token_2022::id(), VestHookError::WrongTokenProgram);
        require_keys_eq!(*ctx.accounts.mint.to_account_info().owner, spl_token_2022::id(), VestHookError::WrongTokenProgram);
        validate_hook_mint(&ctx.accounts.mint.to_account_info(), ctx.program_id)?;
        require_keys_eq!(ctx.accounts.source.mint, ctx.accounts.mint.key(), VestHookError::WrongMint);
        require_keys_eq!(ctx.accounts.destination.mint, ctx.accounts.mint.key(), VestHookError::WrongMint);
        require_keys_eq!(ctx.accounts.extra_account_meta_list.key(), extra_meta_pda(&ctx.accounts.mint.key()).0, VestHookError::WrongExtraMetaList);
        require_keys_eq!(*ctx.accounts.extra_account_meta_list.owner, crate::ID, VestHookError::WrongExtraMetaOwner);
        let (expected_grant, expected_bump) = Pubkey::find_program_address(&[GRANT_SEED, ctx.accounts.source.key().as_ref()], ctx.program_id);
        require_keys_eq!(ctx.accounts.grant.key(), expected_grant, VestHookError::WrongGrant);
        require!(is_transferring(&ctx.accounts.source.to_account_info())?, VestHookError::NotInTransfer);
        require!(is_transferring(&ctx.accounts.destination.to_account_info())?, VestHookError::NotInTransfer);
        let meta_data = ctx.accounts.extra_account_meta_list.try_borrow_data()?;
        ExtraAccountMetaList::check_account_infos::<ExecuteInstruction>(
            &ctx.accounts.to_account_infos(),
            &TransferHookInstruction::Execute { amount }.pack(),
            ctx.program_id,
            &meta_data,
        ).map_err(|_| error!(VestHookError::WrongExtraMetaList))?;

        // Token-2022 invokes the hook after its transfer logic; the source account
        // reflects the post-debit balance here. Compare that balance directly to
        // the locked amount (do not subtract `amount` a second time).
        let grant_info = ctx.accounts.grant.to_account_info();
        if grant_info.owner == &crate::ID && !grant_info.data_is_empty() {
            let grant_data = grant_info.try_borrow_data()?;
            let mut grant_slice: &[u8] = &grant_data;
            let grant = Grant::try_deserialize(&mut grant_slice).map_err(|_| error!(VestHookError::InvalidGrant))?;
            require!(grant.bump == expected_bump, VestHookError::WrongGrantBump);
            require_keys_eq!(grant.token_account, ctx.accounts.source.key(), VestHookError::WrongGrant);
            require_keys_eq!(grant.mint, ctx.accounts.mint.key(), VestHookError::WrongMint);
            let now = Clock::get()?.unix_timestamp;
            let locked = locked_amount(grant.total, grant.start_ts, grant.end_ts, now)?;
            require!(ctx.accounts.source.amount >= locked, VestHookError::VestingLocked);
        } else {
            // The dynamic Grant PDA may be an uninitialized system-owned PDA when
            // no grant exists. Such accounts have no lock, by design.
            require!(grant_info.data_is_empty(), VestHookError::InvalidGrant);
            require_keys_eq!(*grant_info.owner, anchor_lang::system_program::ID, VestHookError::InvalidGrant);
        }
        Ok(())
    }


    // Anchor fallback dispatcher for the SPL Transfer Hook interface Execute discriminator.
    pub fn fallback<'info>(
        program_id: &Pubkey,
        accounts: &'info [AccountInfo<'info>],
        data: &[u8],
    ) -> Result<()> {
        let ix = TransferHookInstruction::unpack(data)
            .map_err(|_| error!(VestHookError::InvalidHookInstruction))?;
        match ix {
            TransferHookInstruction::Execute { amount } => {
                let amount_bytes = amount.to_le_bytes();
                __private::__global::execute(program_id, accounts, &amount_bytes)
            }
            _ => err!(VestHookError::InvalidHookInstruction),
        }
    }
}

#[derive(Accounts)]
pub struct InitExtraAccountMetas<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub mint_authority: Signer<'info>,
    /// CHECK: Canonical PDA allocated by this instruction and initialized with the SPL TLV format.
    #[account(
        init,
        payer = payer,
        space = 128,
        seeds = [EXTRA_METAS_SEED, mint.key().as_ref()],
        bump
    )]
    pub extra_account_meta_list: UncheckedAccount<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateGrant<'info> {
    #[account(mut)]
    pub issuer: Signer<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut, token::mint = mint, token::token_program = token_program)]
    pub beneficiary_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init,
        payer = issuer,
        space = 8 + Grant::INIT_SPACE,
        seeds = [GRANT_SEED, beneficiary_token_account.key().as_ref()],
        bump
    )]
    pub grant: Account<'info, Grant>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Execute<'info> {
    pub source: InterfaceAccount<'info, TokenAccount>,
    pub mint: InterfaceAccount<'info, Mint>,
    pub destination: InterfaceAccount<'info, TokenAccount>,
    /// CHECK: Transfer Hook authority is not trusted; account is included for interface compatibility.
    pub authority: UncheckedAccount<'info>,
    /// CHECK: Address and owner are validated in execute; contents are checked by interface resolution clients.
    pub extra_account_meta_list: UncheckedAccount<'info>,
    /// CHECK: Dynamic account-key seed resolves this PDA from source. May be uninitialized if no grant exists.
    pub grant: UncheckedAccount<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct Grant {
    pub issuer: Pubkey,
    pub token_account: Pubkey,
    pub mint: Pubkey,
    pub total: u64,
    pub start_ts: i64,
    pub end_ts: i64,
    pub bump: u8,
}

#[error_code]
pub enum VestHookError {
    #[msg("Grant total must be greater than zero")]
    ZeroGrant,
    #[msg("Vesting end timestamp must be later than start timestamp")]
    InvalidSchedule,
    #[msg("Only the configured mint authority may issue grants")]
    UnauthorizedIssuer,
    #[msg("Token account must use the ImmutableOwner extension")]
    ImmutableOwnerRequired,
    #[msg("The token account mint does not match the configured mint")]
    WrongMint,
    #[msg("Only Token-2022 is supported")]
    WrongTokenProgram,
    #[msg("Mint Transfer Hook extension is not configured for this VestHook program")]
    WrongHookProgram,
    #[msg("Transfer Hook ExtraAccountMetaList PDA is incorrect")]
    WrongExtraMetaList,
    #[msg("ExtraAccountMetaList must be owned by VestHook")]
    WrongExtraMetaOwner,
    #[msg("Grant PDA is incorrect or does not match the source account")]
    WrongGrant,
    #[msg("Grant PDA bump is not canonical")]
    WrongGrantBump,
    #[msg("Transfer would reduce the source balance below its locked amount")]
    VestingLocked,
    #[msg("Execute must be invoked during an active Token-2022 transfer")]
    NotInTransfer,
    #[msg("Invalid Transfer Hook instruction")]
    InvalidHookInstruction,
    #[msg("Failed to initialize ExtraAccountMetaList")]
    ExtraMetaInitFailed,
    #[msg("Grant account is malformed or has an unexpected owner")]
    InvalidGrant,
    #[msg("Arithmetic overflow or invalid schedule")]
    ArithmeticError,
}

pub fn locked_amount(total: u64, start_ts: i64, end_ts: i64, now: i64) -> Result<u64> {
    let duration = end_ts.checked_sub(start_ts).ok_or(VestHookError::ArithmeticError)?;
    require!(duration > 0, VestHookError::InvalidSchedule);
    if now <= start_ts { return Ok(total); }
    if now >= end_ts { return Ok(0); }
    let elapsed = now.checked_sub(start_ts).ok_or(VestHookError::ArithmeticError)? as u128;
    let duration = duration as u128;
    let vested = (total as u128).checked_mul(elapsed).ok_or(VestHookError::ArithmeticError)? / duration;
    let vested = u64::try_from(vested).map_err(|_| error!(VestHookError::ArithmeticError))?;
    total.checked_sub(vested).ok_or_else(|| error!(VestHookError::ArithmeticError))
}

fn extra_meta_pda(mint: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[EXTRA_METAS_SEED, mint.as_ref()], &crate::ID)
}

fn validate_hook_mint(mint_account: &AccountInfo, expected_program: &Pubkey) -> Result<()> {
    let data = mint_account.try_borrow_data()?;
    let mint = StateWithExtensions::<Token2022Mint>::unpack(&data)
        .map_err(|_| error!(VestHookError::WrongMint))?;
    let hook = mint.get_extension::<TransferHook>()
        .map_err(|_| error!(VestHookError::WrongHookProgram))?;
    let hook_program_id = Option::<Pubkey>::from(hook.program_id);
    require!(hook_program_id == Some(*expected_program), VestHookError::WrongHookProgram);
    Ok(())
}

fn is_transferring(account: &AccountInfo) -> Result<bool> {
    let data = account.try_borrow_data()?;
    let state = StateWithExtensions::<Token2022Account>::unpack(&data)
        .map_err(|_| error!(VestHookError::InvalidGrant))?;
    let ext = state.get_extension::<TransferHookAccount>()
        .map_err(|_| error!(VestHookError::NotInTransfer))?;
    Ok(bool::from(ext.transferring))
}

fn has_immutable_owner(account: &AccountInfo) -> Result<bool> {
    let data = account.try_borrow_data()?;
    let state = StateWithExtensions::<Token2022Account>::unpack(&data)
        .map_err(|_| error!(VestHookError::ImmutableOwnerRequired))?;
    Ok(state.get_extension::<ImmutableOwner>().is_ok())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn midpoint_is_half_locked() { assert_eq!(locked_amount(1_000, 100, 200, 150).unwrap(), 500); }
    #[test]
    fn before_start_locks_everything() { assert_eq!(locked_amount(1_000, 100, 200, 99).unwrap(), 1_000); }
    #[test]
    fn end_unlocks_everything() { assert_eq!(locked_amount(1_000, 100, 200, 200).unwrap(), 0); }
    #[test]
    fn rounds_vested_down() { assert_eq!(locked_amount(1_001, 100, 200, 150).unwrap(), 501); }
}

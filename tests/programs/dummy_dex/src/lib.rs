use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};

declare_id!("Fg6PaFpoGXkYsidMpWxTWqkZqK6W2BeZ7FEfcYkgMQhg");

/// Minimal CPI relay for integration tests. Hook accounts must be supplied in
/// `remaining_accounts` in the exact order resolved from ExtraAccountMetaList.
#[program]
pub mod dummy_dex {
    use super::*;

    pub fn route_transfer<'info>(ctx: Context<'_, '_, '_, 'info, RouteTransfer<'info>>, amount: u64, decimals: u8) -> Result<()> {
        let cpi_accounts = TransferChecked {
            from: ctx.accounts.source.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.destination.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts)
            .with_remaining_accounts(ctx.remaining_accounts.to_vec());
        token_interface::transfer_checked(cpi_ctx, amount, decimals)
    }
}

#[derive(Accounts)]
pub struct RouteTransfer<'info> {
    #[account(mut)]
    pub source: InterfaceAccount<'info, TokenAccount>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub destination: InterfaceAccount<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Interface<'info, TokenInterface>,
}

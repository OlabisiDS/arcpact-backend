import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  PORT:     parseInt(process.env.PORT ?? '3000', 10),
  NODE_ENV: process.env.NODE_ENV ?? 'development',

  CIRCLE_API_KEY:       process.env.CIRCLE_API_KEY!,
  CIRCLE_ENTITY_SECRET: process.env.CIRCLE_ENTITY_SECRET!,

  // Arc testnet USDC token ID — fixed, never changes
  USDC_TOKEN_ID: '5797fbd6-3795-519d-84ca-ec4c5f80c3b1',

  CIRCLE_BASE_URL: 'https://api.circle.com/v1/w3s',

  // ── Escrow wallet — the ArcPact holding wallet ──────────────────────────
  // ESCROW_WALLET_ID  : source for releasing/refunding funds (Circle wallet ID)
  // ESCROW_WALLET_ADDRESS : destination for locking funds (blockchain address)
  ESCROW_WALLET_ID:      process.env.ESCROW_WALLET_ID!,
  ESCROW_WALLET_ADDRESS: process.env.ESCROW_WALLET_ADDRESS!,
};

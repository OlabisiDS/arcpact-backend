// ─── Inbound Transfer Request ─────────────────────────────────────────────────

/**
 * What the controller passes into transferUSDC().
 */
export interface TransferRequest {
  fromWalletId: string;  // Circle wallet ID  — e.g. "232baef3-..."
  toAddress:    string;  // On-chain address  — e.g. "0xc412ff..."
  amount:       string;  // USDC amount       — e.g. "1"
}

// ─── Circle API Request Body ──────────────────────────────────────────────────

/**
 * CORRECT body shape for:
 * POST https://api.circle.com/v1/w3s/developer/transactions/transfer
 *
 * Key facts from Circle docs:
 * - walletId        = source wallet (flat field, NOT nested source object)
 * - destinationAddress = destination (flat field, NOT nested destination object)
 * - amounts         = string array e.g. ["1"]  (NOT an amount object)
 * - entitySecretCiphertext = RSA-encrypted entity secret, fresh per request
 * - tokenId         = the USDC token ID for Arc testnet
 * - feeLevel        = "LOW" | "MEDIUM" | "HIGH"
 */
export interface CircleTransferRequestBody {
  idempotencyKey:          string;   // UUID v4 — prevents duplicate transactions
  walletId:                string;   // Source wallet ID
  destinationAddress:      string;   // Destination blockchain address (0x...)
  amounts:                 string[]; // e.g. ["1"] — array of strings
  tokenId:                 string;   // USDC token ID
  feeLevel:                'LOW' | 'MEDIUM' | 'HIGH';
  entitySecretCiphertext:  string;   // RSA-encrypted entity secret (base64, fresh per call)
}

// ─── Circle API Response ──────────────────────────────────────────────────────

/**
 * Shape of Circle's response for a successful transfer initiation.
 * The transaction starts as INITIATED and moves through states.
 */
export interface CircleTransactionData {
  id:          string;
  state:       'INITIATED' | 'PENDING' | 'CONFIRMED' | 'COMPLETE' | 'FAILED';
  txHash?:     string;
  createDate?: string;
}

export interface CircleTransferResponse {
  data: {
    transaction: CircleTransactionData; // Note: Circle returns "transaction", NOT "transfer"
  };
}

// ─── Service Return Type ──────────────────────────────────────────────────────

export type TransferResult =
  | { success: true;  data: CircleTransactionData }
  | { success: false; message: string; error: string };

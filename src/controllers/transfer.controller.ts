import { Request, Response, NextFunction } from 'express';
import { transferUSDC } from '../services/circle.service';
import { AppError } from '../core/AppError';

// ─── Request Body Type ────────────────────────────────────────────────────────

/**
 * Shape of the JSON body for POST /api/v1/test/transfer
 */
interface TransferRequestBody {
  fromWalletId?: string;
  toAddress?:    string;   // ← FIXED: was toWalletId, now toAddress (0x...)
  amount?:       string;
}

// ─── Validation Helper ────────────────────────────────────────────────────────

/**
 * Returns true if the string is a valid Ethereum-style address.
 * Rule: must start with "0x" and be exactly 42 characters long.
 */
const isValidAddress = (address: string): boolean => {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
};

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * POST /api/v1/test/transfer
 *
 * Validates inputs, then calls transferUSDC() to send USDC from a Circle
 * developer wallet to a blockchain address.
 *
 * Expected body:
 * {
 *   "fromWalletId": "232baef3-1f26-5774-b9b7-7def99c1c073",
 *   "toAddress":    "0xc412ff716620e45df5035406cacb30a739784b8a",
 *   "amount":       "1"
 * }
 */
export const testTransfer = async (
  req: Request<object, object, TransferRequestBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { fromWalletId, toAddress, amount } = req.body;

    // ── Validate: all fields present ────────────────────────────────────────
    if (!fromWalletId) {
      throw new AppError('Missing required field: fromWalletId', 400);
    }
    if (!toAddress) {
      throw new AppError('Missing required field: toAddress', 400);
    }
    if (!amount) {
      throw new AppError('Missing required field: amount', 400);
    }

    // ── Validate: address must start with 0x and be 42 chars ────────────────
    if (!isValidAddress(toAddress)) {
      throw new AppError(
        'Invalid toAddress — must be a valid Ethereum address starting with 0x (42 characters)',
        400
      );
    }

    // ── Validate: amount must be a positive number ───────────────────────────
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new AppError('amount must be a positive number e.g. "1" or "10.50"', 400);
    }

    // ── Call Circle service ──────────────────────────────────────────────────
    const result = await transferUSDC(fromWalletId, toAddress, amount);

    // ── Respond ──────────────────────────────────────────────────────────────
    if (result.success) {
      res.status(200).json({
        success: true,
        data:    result.data,
      });
    } else {
      res.status(502).json({
        success: false,
        message: result.message,
        error:   result.error,
      });
    }

  } catch (error) {
    next(error);
  }
};

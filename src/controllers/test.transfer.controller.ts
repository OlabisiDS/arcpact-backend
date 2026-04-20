import { Request, Response, NextFunction } from 'express';
import { transferUSDC } from '../services/circle.service';
import { AppError } from '../core/AppError';
import logger from '../utils/logger';

interface TransferRequestBody {
  fromWalletId?: string;
  toAddress?:    string;
  amount?:       string;
}

// Valid Ethereum address: "0x" + 40 hex chars = 42 total
const isValidAddress = (address: string): boolean =>
  /^0x[0-9a-fA-F]{40}$/.test(address);

/**
 * POST /api/v1/test/transfer
 *
 * Sandbox endpoint to verify ArcPact can move USDC on Arc testnet.
 *
 * Body:
 * {
 *   "fromWalletId": "232baef3-1f26-5774-b9b7-7def99c1c073",
 *   "toAddress":    "0xc412ff716620e45df5035406cacb30a739784b8a",
 *   "amount":       "1"
 * }
 */
export const testTransferHandler = async (
  req: Request<object, object, TransferRequestBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { fromWalletId, toAddress, amount } = req.body;

    // ── Validate all fields present ──────────────────────────────────────────
    if (!fromWalletId) throw new AppError('Missing required field: fromWalletId', 400);
    if (!toAddress)    throw new AppError('Missing required field: toAddress', 400);
    if (!amount)       throw new AppError('Missing required field: amount', 400);

    // ── Validate address format ──────────────────────────────────────────────
    if (!isValidAddress(toAddress)) {
      throw new AppError(
        'Invalid toAddress — must start with 0x and be exactly 42 characters',
        400
      );
    }

    // ── Validate amount is positive number ───────────────────────────────────
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new AppError('amount must be a positive number e.g. "1"', 400);
    }

    logger.info(`[TestTransfer] ${amount} USDC from ${fromWalletId} → ${toAddress}`);

    // ── Call Circle service ──────────────────────────────────────────────────
    const result = await transferUSDC(fromWalletId, toAddress, amount);

    // ── Respond ──────────────────────────────────────────────────────────────
    if (result.success) {
      res.status(200).json({
        success: true,
        data: {
          txId:      result.data.id,
          status:    'pending',
          state:     result.data.state,
          createDate: result.data.createDate,
        },
      });
      return;
    }

    res.status(502).json({
      success: false,
      message: result.message,
      error:   result.error,
    });

  } catch (error) {
    next(error);
  }
};

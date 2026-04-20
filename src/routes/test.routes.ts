import { Router } from 'express';
import { testTransferHandler } from '../controllers/test.transfer.controller';

const router = Router();

/**
 * @route   POST /api/v1/test/transfer
 * @desc    Sandbox endpoint — verifies ArcPact can move USDC via Circle on Arc testnet
 * @access  Development only — remove or gate this route before production
 *
 * Body:
 * {
 *   "fromWalletId": "232baef3-1f26-5774-b9b7-7def99c1c073",
 *   "toAddress":    "0xc412ff716620e45df5035406cacb30a739784b8a",
 *   "amount":       "1"
 * }
 */
router.post('/transfer', testTransferHandler);

export default router;

import axios, { AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { ENV } from '../config/env';
import logger from '../utils/logger';
import { generateEntitySecretCiphertext } from './circle.cipher';
import {
  CircleTransferRequestBody,
  CircleTransferResponse,
  TransferResult,
} from './circle.types';

// ─── Axios Client ─────────────────────────────────────────────────────────────

const circleClient = axios.create({
  baseURL: ENV.CIRCLE_BASE_URL,
  headers: {
    Authorization:  `Bearer ${ENV.CIRCLE_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

// ─── transferUSDC ─────────────────────────────────────────────────────────────

/**
 * Sends USDC from a Circle developer wallet to a blockchain address.
 *
 * @param fromWalletId  Source Circle wallet ID
 * @param toAddress     Destination on-chain address (0x...)
 * @param amount        USDC amount as string — e.g. "1"
 */
export async function transferUSDC(
  fromWalletId: string,
  toAddress:    string,
  amount:       string
): Promise<TransferResult> {

  logger.info(`[CircleService] Initiating USDC transfer...`);
  logger.info(`[CircleService]   From wallet : ${fromWalletId}`);
  logger.info(`[CircleService]   To address  : ${toAddress}`);
  logger.info(`[CircleService]   Amount      : ${amount} USDC`);

  try {
    // Fresh ciphertext required per request — stale = "API parameter invalid"
    const entitySecretCiphertext = await generateEntitySecretCiphertext();

    const requestBody: CircleTransferRequestBody = {
      idempotencyKey:         uuidv4(),
      walletId:               fromWalletId,
      destinationAddress:     toAddress,
      amounts:                [amount],
      tokenId:                ENV.USDC_TOKEN_ID,
      feeLevel:               'MEDIUM',
      entitySecretCiphertext: entitySecretCiphertext,
    };

    const response = await circleClient.post<CircleTransferResponse>(
      '/developer/transactions/transfer',
      requestBody
    );

    // Null-guard: ensure response has expected shape (discovered in real testing)
    if (!response.data || !response.data.data) {
      throw new Error('Invalid response from Circle API');
    }

    // Circle returns response.data.data directly (not .data.data.transaction)
    const transaction = response.data.data;

    logger.info(`[CircleService] Transfer success — ID: ${transaction.id} | State: ${transaction.state}`);

    return {
      success: true,
      data:    transaction,
    };

  } catch (error) {
    if (error instanceof AxiosError) {
      const httpStatus    = error.response?.status ?? 'unknown';
      const circleMessage =
        error.response?.data?.message ??
        error.response?.data?.error   ??
        'Unknown Circle API error';

      logger.error(`[CircleService] Transfer failed — HTTP ${httpStatus}: ${circleMessage}`);
      logger.error(`[CircleService] Full error: ${JSON.stringify(error.response?.data)}`);

      return { success: false, message: 'transfer failed', error: circleMessage };
    }

    const unexpectedMessage =
      error instanceof Error ? error.message : 'Unexpected error during transfer';

    logger.error(`[CircleService] Unexpected error: ${unexpectedMessage}`);

    return { success: false, message: 'transfer failed', error: unexpectedMessage };
  }
}

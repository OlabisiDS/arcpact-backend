import logger from '../utils/logger';
import {
  Pact, PactStatus,
  createPact as storePact, getPact as fetchPact,
  updatePactStatus, updatePactFields, pushNotification,
} from '../core/pact.store';

export type PactResult = { success: true; pact: Pact } | { success: false; message: string };

const VALID_TRANSITIONS: Record<PactStatus, PactStatus[]> = {
  CREATED:      ['ACCEPTED'],
  ACCEPTED:     ['FUNDS_LOCKED'],
  FUNDS_LOCKED: ['COMPLETED', 'REFUNDED', 'DISPUTED'],
  DISPUTED:     ['COMPLETED', 'REFUNDED'],
  COMPLETED:    [],
  REFUNDED:     [],
};

const canTransition = (from: PactStatus, to: PactStatus): boolean =>
  VALID_TRANSITIONS[from].includes(to);

const isCaller = (stored: string, caller: string): boolean =>
  stored.toLowerCase() === caller.toLowerCase();

export const createPact = (
  callerAddress:   string,
  receiverAddress: string,
  amount:          string
): PactResult => {
  const pact = storePact(callerAddress, receiverAddress, amount);
  logger.info(`[PactService] Created pact ${pact.id} — ${amount} USDC | sender: ${callerAddress}`);
  return { success: true, pact };
};

export const acceptPact = (pactId: string, callerAddress: string): PactResult => {
  const pact = fetchPact(pactId);
  if (!pact) return { success: false, message: `Pact not found: ${pactId}` };
  if (!isCaller(pact.receiverAddress, callerAddress))
    return { success: false, message: 'Forbidden: only the receiver can accept this pact' };
  if (!canTransition(pact.status, 'ACCEPTED'))
    return { success: false, message: `Pact is ${pact.status} — cannot accept` };
  const updated = updatePactFields(pactId, { receiverAccepted: true, status: 'ACCEPTED' });
  pushNotification(pactId, 'PACT_ACCEPTED', 'Receiver accepted — you can now fund the escrow', 'sender');
  logger.info(`[PactService] Pact ${pactId} accepted by ${callerAddress}`);
  return { success: true, pact: updated! };
};

export const lockFunds = async (pactId: string, callerAddress: string): Promise<PactResult> => {
  const pact = fetchPact(pactId);
  if (!pact) return { success: false, message: `Pact not found: ${pactId}` };
  if (!isCaller(pact.senderAddress, callerAddress))
    return { success: false, message: 'Forbidden: only the sender can fund this pact' };
  if (!canTransition(pact.status, 'FUNDS_LOCKED')) {
    if (pact.status === 'CREATED')
      return { success: false, message: 'Receiver must accept before you can fund' };
    return { success: false, message: `Cannot lock funds — pact is ${pact.status}` };
  }
  logger.info(`[PactService] Recording lock of ${pact.amount} USDC for pact ${pactId}`);
  const updated = updatePactStatus(pactId, 'FUNDS_LOCKED')!;
  pushNotification(pactId, 'FUNDS_LOCKED', `${pact.amount} USDC locked in escrow`, 'both');
  return { success: true, pact: updated };
};

export const requestRelease = (pactId: string, callerAddress: string): PactResult => {
  const pact = fetchPact(pactId);
  if (!pact) return { success: false, message: `Pact not found: ${pactId}` };
  if (!isCaller(pact.receiverAddress, callerAddress))
    return { success: false, message: 'Forbidden: only the receiver can request payment' };
  if (!['FUNDS_LOCKED', 'DISPUTED'].includes(pact.status))
    return { success: false, message: 'Funds must be locked before requesting release' };
  const updated = updatePactFields(pactId, { receiverReleaseRequest: true });
  pushNotification(pactId, 'PAYMENT_REQUESTED', 'Receiver requested payment — your approval needed', 'sender');
  return { success: true, pact: updated! };
};

// ─── Circle API transfer from escrow ─────────────────────────────────────────
const circleTransferFromEscrow = async (
  destinationAddress: string,
  amount: string
): Promise<void> => {
  const apiKey      = process.env.CIRCLE_API_KEY!;
  const walletId    = process.env.ESCROW_WALLET_ID!;
  const tokenId     = process.env.USDC_TOKEN_ID!;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET!;

  // Circle requires an idempotency key — unique per transfer attempt
  const idempotencyKey = uuidv4();

  const body = {
    idempotencyKey,
    source: { type: 'wallet', id: walletId },
    destination: { type: 'blockchain', address: destinationAddress, chain: 'ARC' },
    amount: { amount: parseFloat(amount).toFixed(6), currency: 'USD' },
    tokenId,
    entitySecretCiphertext: entitySecret,
  };

  const response = await fetch('https://api.circle.com/v1/w3s/developer/transactions/transfer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json() as any;

  if (!response.ok || data?.data?.state === 'FAILED') {
    const msg = data?.message ?? data?.data?.errorReason ?? 'Circle transfer failed';
    throw new Error(`Circle API error: ${msg}`);
  }

  logger.info(`[Circle] Transfer to ${destinationAddress} of ${amount} USDC initiated — id: ${data?.data?.id}`);
};

export const approveRelease = async (pactId: string, callerAddress: string): Promise<PactResult> => {
  const pact = fetchPact(pactId);
  if (!pact) return { success: false, message: `Pact not found: ${pactId}` };
  if (!isCaller(pact.senderAddress, callerAddress))
    return { success: false, message: 'Forbidden: only the sender can approve payment' };
  if (!pact.receiverReleaseRequest)
    return { success: false, message: 'Receiver has not requested payment yet' };
  if (!['FUNDS_LOCKED', 'DISPUTED'].includes(pact.status))
    return { success: false, message: 'Pact must have locked funds' };

  try {
    await circleTransferFromEscrow(pact.receiverAddress, pact.amount);
  } catch (err: any) {
    logger.error(`[PactService] Circle release failed for pact ${pactId}: ${err.message}`);
    return { success: false, message: err.message };
  }

  const updated = updatePactFields(pactId, { senderApproval: true, status: 'COMPLETED' })!;
  pushNotification(pactId, 'PAYMENT_APPROVED', `${pact.amount} USDC released to receiver`, 'both');
  return { success: true, pact: updated };
};

export const requestRefund = (pactId: string, callerAddress: string): PactResult => {
  const pact = fetchPact(pactId);
  if (!pact) return { success: false, message: `Pact not found: ${pactId}` };
  if (!isCaller(pact.senderAddress, callerAddress))
    return { success: false, message: 'Forbidden: only the sender can request a refund' };
  if (!['FUNDS_LOCKED', 'DISPUTED'].includes(pact.status))
    return { success: false, message: 'Funds must be locked before requesting refund' };
  const updated = updatePactFields(pactId, { senderRefundRequest: true });
  pushNotification(pactId, 'REFUND_REQUESTED', 'Sender requested a refund — your approval needed', 'receiver');
  return { success: true, pact: updated! };
};

export const approveRefund = async (pactId: string, callerAddress: string): Promise<PactResult> => {
  const pact = fetchPact(pactId);
  if (!pact) return { success: false, message: `Pact not found: ${pactId}` };
  if (!isCaller(pact.receiverAddress, callerAddress))
    return { success: false, message: 'Forbidden: only the receiver can approve a refund' };
  if (!pact.senderRefundRequest)
    return { success: false, message: 'Sender has not requested a refund yet' };
  if (!['FUNDS_LOCKED', 'DISPUTED'].includes(pact.status))
    return { success: false, message: 'Pact must have locked funds' };

  try {
    await circleTransferFromEscrow(pact.senderAddress, pact.amount);
  } catch (err: any) {
    logger.error(`[PactService] Circle refund failed for pact ${pactId}: ${err.message}`);
    return { success: false, message: err.message };
  }

  const updated = updatePactFields(pactId, { receiverApproval: true, status: 'REFUNDED' })!;
  pushNotification(pactId, 'REFUND_APPROVED', `${pact.amount} USDC refunded to sender`, 'both');
  return { success: true, pact: updated };
};

export const raiseDispute = (pactId: string, callerAddress: string, note: string): PactResult => {
  const pact = fetchPact(pactId);
  if (!pact) return { success: false, message: `Pact not found: ${pactId}` };
  const isSender   = isCaller(pact.senderAddress,   callerAddress);
  const isReceiver = isCaller(pact.receiverAddress, callerAddress);
  if (!isSender && !isReceiver)
    return { success: false, message: 'Forbidden: address not party to this pact' };
  if (pact.status !== 'FUNDS_LOCKED')
    return { success: false, message: 'Can only dispute a pact with locked funds' };
  const role = isSender ? 'sender' : 'receiver';
  const updated = updatePactFields(pactId, { status: 'DISPUTED', disputedBy: role, disputeNote: note || null })!;
  pushNotification(pactId, 'DISPUTE_RAISED', `Dispute raised by ${role} — pact is under review`, 'both');
  return { success: true, pact: updated };
};

export const releaseFunds = async (pactId: string): Promise<PactResult> => {
  const pact = fetchPact(pactId);
  if (!pact) return { success: false, message: `Pact not found` };
  if (!['FUNDS_LOCKED', 'DISPUTED'].includes(pact.status))
    return { success: false, message: `Cannot release — ${pact.status}` };
  return { success: true, pact: updatePactStatus(pactId, 'COMPLETED')! };
};

export const refundFunds = async (pactId: string): Promise<PactResult> => {
  const pact = fetchPact(pactId);
  if (!pact) return { success: false, message: `Pact not found` };
  if (!['FUNDS_LOCKED', 'DISPUTED'].includes(pact.status))
    return { success: false, message: `Cannot refund — ${pact.status}` };
  return { success: true, pact: updatePactStatus(pactId, 'REFUNDED')! };
};

// ─── cancelPact ───────────────────────────────────────────────────────────────
// Sender can cancel before receiver accepts — no funds have moved yet.

export const cancelPact = (pactId: string, callerAddress: string): PactResult => {
  const pact = fetchPact(pactId);
  if (!pact) return { success: false, message: `Pact not found: ${pactId}` };
  if (!isCaller(pact.senderAddress, callerAddress))
    return { success: false, message: 'Forbidden: only the sender can cancel this pact' };
  if (pact.status !== 'CREATED' && pact.status !== 'ACCEPTED')
    return { success: false, message: 'Can only cancel a pact that has not been funded yet' };
  const updated = updatePactStatus(pactId, 'REFUNDED')!;
  const msg = pact.status === 'ACCEPTED'
    ? 'Pact cancelled by sender after acceptance — no funds were moved'
    : 'Pact cancelled by sender before acceptance';
  pushNotification(pactId, 'REFUND_APPROVED', msg, 'both');
  return { success: true, pact: updated };
};

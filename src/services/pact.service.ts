import logger from '../utils/logger';
import {
  Pact, PactStatus,
  createPact as storePact, getPact as fetchPact,
  updatePactStatus, updatePactFields, pushNotification,
} from '../core/pact.store';

export type PactResult = { success: true; pact: Pact } | { success: false; message: string };

// ─── State machine ────────────────────────────────────────────────────────────

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

// ─── createPact ───────────────────────────────────────────────────────────────

export const createPact = (
  callerAddress:   string,
  receiverAddress: string,
  amount:          string
): PactResult => {
  const pact = storePact(callerAddress, receiverAddress, amount);
  logger.info(`[PactService] Created pact ${pact.id} — ${amount} USDC | sender: ${callerAddress}`);
  return { success: true, pact };
};

// ─── acceptPact ───────────────────────────────────────────────────────────────

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

// ─── lockFunds ────────────────────────────────────────────────────────────────

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

// ─── requestRelease ───────────────────────────────────────────────────────────

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

// ─── approveRelease ───────────────────────────────────────────────────────────
// MetaMask handles the on-chain transfer. Backend only updates state.

export const approveRelease = async (pactId: string, callerAddress: string): Promise<PactResult> => {
  const pact = fetchPact(pactId);
  if (!pact) return { success: false, message: `Pact not found: ${pactId}` };
  if (!isCaller(pact.senderAddress, callerAddress))
    return { success: false, message: 'Forbidden: only the sender can approve payment' };
  if (!pact.receiverReleaseRequest)
    return { success: false, message: 'Receiver has not requested payment yet' };
  if (!['FUNDS_LOCKED', 'DISPUTED'].includes(pact.status))
    return { success: false, message: 'Pact must have locked funds' };

  const updated = updatePactFields(pactId, { senderApproval: true, status: 'COMPLETED' })!;
  pushNotification(pactId, 'PAYMENT_APPROVED', `${pact.amount} USDC released to receiver`, 'both');
  return { success: true, pact: updated };
};

// ─── requestRefund ────────────────────────────────────────────────────────────

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

// ─── approveRefund ────────────────────────────────────────────────────────────
// MetaMask handles the on-chain transfer. Backend only updates state.

export const approveRefund = async (pactId: string, callerAddress: string): Promise<PactResult> => {
  const pact = fetchPact(pactId);
  if (!pact) return { success: false, message: `Pact not found: ${pactId}` };
  if (!isCaller(pact.receiverAddress, callerAddress))
    return { success: false, message: 'Forbidden: only the receiver can approve a refund' };
  if (!pact.senderRefundRequest)
    return { success: false, message: 'Sender has not requested a refund yet' };
  if (!['FUNDS_LOCKED', 'DISPUTED'].includes(pact.status))
    return { success: false, message: 'Pact must have locked funds' };

  const updated = updatePactFields(pactId, { receiverApproval: true, status: 'REFUNDED' })!;
  pushNotification(pactId, 'REFUND_APPROVED', `${pact.amount} USDC refunded to sender`, 'both');
  return { success: true, pact: updated };
};

// ─── raiseDispute ─────────────────────────────────────────────────────────────

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

// ─── Admin bypass (no Circle — admin handles manually off-chain) ──────────────

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

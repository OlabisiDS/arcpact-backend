// ─── Pact Types ───────────────────────────────────────────────────────────────

export type PactStatus =
  | 'CREATED'       // Awaiting receiver acceptance
  | 'ACCEPTED'      // Receiver accepted; sender needs to fund
  | 'FUNDS_LOCKED'  // Funds held in escrow
  | 'DISPUTED'      // Dispute raised — funds still locked, still resolvable
  | 'COMPLETED'     // Funds released to receiver
  | 'REFUNDED';     // Funds returned to sender

export type Pact = {
  id:               string;
  senderAddress:    string;
  receiverAddress:  string;
  amount:           string;
  status:           PactStatus;
  createdAt:        string;
  updatedAt:        string;

  // Agreement flags
  receiverAccepted:       boolean;
  receiverReleaseRequest: boolean;
  senderApproval:         boolean;
  senderRefundRequest:    boolean;
  receiverApproval:       boolean;

  // Dispute
  disputedBy:  string | null;
  disputeNote: string | null;
};

// ─── Notification Types ───────────────────────────────────────────────────────

export type NotificationEvent =
  | 'PACT_CREATED'
  | 'PACT_ACCEPTED'
  | 'FUNDS_LOCKED'
  | 'PAYMENT_REQUESTED'
  | 'REFUND_REQUESTED'
  | 'PAYMENT_APPROVED'
  | 'REFUND_APPROVED'
  | 'DISPUTE_RAISED';

export type Notification = {
  id:        string;
  pactId:    string;
  event:     NotificationEvent;
  message:   string;
  forRole:   'sender' | 'receiver' | 'both';
  createdAt: string;
  read:      boolean;
};

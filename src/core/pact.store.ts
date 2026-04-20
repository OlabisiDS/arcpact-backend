import { v4 as uuidv4 } from 'uuid';
import type { Pact, PactStatus, Notification, NotificationEvent } from './pact.types';
import {
  getAllPacts, getPactById, savePact, updatePact,
  saveNotification, getAllNotifications, markNotificationRead, markAllNotificationsRead,
} from '../utils/storage';

export type { Pact, PactStatus, Notification, NotificationEvent };
export { getAllPacts, getAllNotifications, markNotificationRead, markAllNotificationsRead };

export const pushNotification = (pactId: string, event: NotificationEvent, message: string, forRole: Notification['forRole']): void => {
  saveNotification({ id: uuidv4(), pactId, event, message, forRole, createdAt: new Date().toISOString(), read: false });
};

export const createPact = (senderAddress: string, receiverAddress: string, amount: string): Pact => {
  const now = new Date().toISOString();
  const pact: Pact = {
    id: uuidv4(), senderAddress, receiverAddress, amount,
    status: 'CREATED', createdAt: now, updatedAt: now,
    receiverAccepted: false, receiverReleaseRequest: false, senderApproval: false,
    senderRefundRequest: false, receiverApproval: false,
    disputedBy: null, disputeNote: null,
  };
  savePact(pact);
  pushNotification(pact.id, 'PACT_CREATED', 'New pact created — share with your counterparty', 'both');
  return pact;
};

export const getPact = (id: string): Pact | undefined => getPactById(id);

export const updatePactStatus = (id: string, status: PactStatus): Pact | undefined => {
  const pact = getPactById(id);
  if (!pact) return undefined;
  const updated: Pact = { ...pact, status, updatedAt: new Date().toISOString() };
  updatePact(updated);
  return updated;
};

export const updatePactFields = (id: string, fields: Partial<Pact>): Pact | undefined => {
  const pact = getPactById(id);
  if (!pact) return undefined;
  const updated: Pact = { ...pact, ...fields, updatedAt: new Date().toISOString() };
  updatePact(updated);
  return updated;
};

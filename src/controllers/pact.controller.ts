import { Request, Response, NextFunction } from 'express';
import { AppError } from '../core/AppError';
import {
  createPact, acceptPact, lockFunds,
  requestRelease, approveRelease,
  requestRefund, approveRefund,
  raiseDispute, releaseFunds, refundFunds, cancelPact,
} from '../services/pact.service';
import {
  getPact, getAllPacts,
  getAllNotifications, markNotificationRead, markAllNotificationsRead,
} from '../core/pact.store';

const isValidAddress = (a: string): boolean => /^0x[0-9a-fA-F]{40}$/.test(a);

const requireAddress = (value: unknown, name: string): string => {
  if (!value || typeof value !== 'string') throw new AppError(`Missing field: ${name}`, 400);
  if (!isValidAddress(value)) throw new AppError(`${name} must be a valid 0x address`, 400);
  return value;
};

const requireCaller = (body: Record<string, unknown>): string =>
  requireAddress(body.callerAddress, 'callerAddress');

const fail403 = (res: Response, message: string): void => {
  res.status(403).json({ success: false, message });
};

const failResult = (res: Response, message: string): void => {
  const status = message.startsWith('Forbidden') ? 403 : 400;
  res.status(status).json({ success: false, message });
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const callerAddress   = requireCaller(body);
    const receiverAddress = requireAddress(body.receiverAddress, 'receiverAddress');
    if (!body.amount) throw new AppError('Missing field: amount', 400);
    const parsed = parseFloat(body.amount as string);
    if (isNaN(parsed) || parsed <= 0) throw new AppError('amount must be a positive number', 400);
    if (callerAddress.toLowerCase() === receiverAddress.toLowerCase())
      throw new AppError('sender and receiver must be different addresses', 400);
    const result = createPact(callerAddress, receiverAddress, String(body.amount));
    if (!result.success) { failResult(res, result.message); return; }
    res.status(201).json({ success: true, data: result.pact });
  } catch (error) { next(error); }
};

export const accept = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const callerAddress = requireCaller(body);
    if (!body.pactId) throw new AppError('Missing field: pactId', 400);
    const result = acceptPact(String(body.pactId), callerAddress);
    if (!result.success) { fail403(res, result.message); return; }
    res.status(200).json({ success: true, data: result.pact });
  } catch (error) { next(error); }
};

export const lock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const callerAddress = requireCaller(body);
    if (!body.pactId) throw new AppError('Missing field: pactId', 400);
    const result = await lockFunds(String(body.pactId), callerAddress);
    if (!result.success) { failResult(res, result.message); return; }
    res.status(200).json({ success: true, data: result.pact });
  } catch (error) { next(error); }
};

export const cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const callerAddress = requireCaller(body);
    if (!body.pactId) throw new AppError('Missing field: pactId', 400);
    const result = cancelPact(String(body.pactId), callerAddress);
    if (!result.success) { failResult(res, result.message); return; }
    res.status(200).json({ success: true, data: result.pact });
  } catch (error) { next(error); }
};

export const reqRelease = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const callerAddress = requireCaller(body);
    if (!body.pactId) throw new AppError('Missing field: pactId', 400);
    const result = requestRelease(String(body.pactId), callerAddress);
    if (!result.success) { failResult(res, result.message); return; }
    res.status(200).json({ success: true, data: result.pact });
  } catch (error) { next(error); }
};

export const appRelease = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const callerAddress = requireCaller(body);
    if (!body.pactId) throw new AppError('Missing field: pactId', 400);
    const result = await approveRelease(String(body.pactId), callerAddress);
    if (!result.success) { failResult(res, result.message); return; }
    res.status(200).json({ success: true, data: result.pact });
  } catch (error) { next(error); }
};

export const reqRefund = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const callerAddress = requireCaller(body);
    if (!body.pactId) throw new AppError('Missing field: pactId', 400);
    const result = requestRefund(String(body.pactId), callerAddress);
    if (!result.success) { failResult(res, result.message); return; }
    res.status(200).json({ success: true, data: result.pact });
  } catch (error) { next(error); }
};

export const appRefund = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const callerAddress = requireCaller(body);
    if (!body.pactId) throw new AppError('Missing field: pactId', 400);
    const result = await approveRefund(String(body.pactId), callerAddress);
    if (!result.success) { failResult(res, result.message); return; }
    res.status(200).json({ success: true, data: result.pact });
  } catch (error) { next(error); }
};

export const dispute = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const callerAddress = requireCaller(body);
    if (!body.pactId) throw new AppError('Missing field: pactId', 400);
    const result = raiseDispute(String(body.pactId), callerAddress, String(body.note ?? ''));
    if (!result.success) { failResult(res, result.message); return; }
    res.status(200).json({ success: true, data: result.pact });
  } catch (error) { next(error); }
};

export const release = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { pactId } = req.body as Record<string, string>;
    if (!pactId) throw new AppError('Missing field: pactId', 400);
    const result = await releaseFunds(pactId);
    if (!result.success) { res.status(400).json({ success: false, message: result.message }); return; }
    res.status(200).json({ success: true, data: result.pact });
  } catch (error) { next(error); }
};

export const refund = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { pactId } = req.body as Record<string, string>;
    if (!pactId) throw new AppError('Missing field: pactId', 400);
    const result = await refundFunds(pactId);
    if (!result.success) { res.status(400).json({ success: false, message: result.message }); return; }
    res.status(200).json({ success: true, data: result.pact });
  } catch (error) { next(error); }
};

export const getAll = (_req: Request, res: Response, next: NextFunction): void => {
  try { res.status(200).json({ success: true, data: getAllPacts() }); }
  catch (error) { next(error); }
};

export const getById = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const pact = getPact(req.params.id);
    if (!pact) { res.status(404).json({ success: false, message: `Pact not found: ${req.params.id}` }); return; }
    res.status(200).json({ success: true, data: pact });
  } catch (error) { next(error); }
};

export const getNotifications = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { wallet, pactId } = req.query as Record<string, string>;
    const allPacts = getAllPacts();
    let notifs = getAllNotifications();
    if (pactId) {
      notifs = notifs.filter(n => n.pactId === pactId);
    } else if (wallet) {
      const walletLower = wallet.toLowerCase();
      const relevantPactIds = new Set(
        allPacts
          .filter(p =>
            p.senderAddress.toLowerCase()   === walletLower ||
            p.receiverAddress.toLowerCase() === walletLower
          )
          .map(p => p.id)
      );
      notifs = notifs.filter(n => relevantPactIds.has(n.pactId));
      notifs = notifs.filter(n => {
        const pact = allPacts.find(p => p.id === n.pactId);
        if (!pact) return false;
        const isSender   = pact.senderAddress.toLowerCase()   === walletLower;
        const isReceiver = pact.receiverAddress.toLowerCase() === walletLower;
        if (n.forRole === 'both') return true;
        if (n.forRole === 'sender'   && isSender)   return true;
        if (n.forRole === 'receiver' && isReceiver) return true;
        return false;
      });
    }
    res.status(200).json({ success: true, data: notifs.slice().reverse() });
  } catch (error) { next(error); }
};

export const readNotifications = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { id } = req.body as { id?: string };
    if (id) markNotificationRead(id); else markAllNotificationsRead();
    res.status(200).json({ success: true });
  } catch (error) { next(error); }
};

export const getRole = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { wallet, pactId } = req.query as Record<string, string>;
    if (!wallet || !pactId) {
      res.status(400).json({ success: false, message: 'Missing wallet or pactId' });
      return;
    }
    const pact = getPact(pactId);
    if (!pact) {
      res.status(404).json({ success: false, message: `Pact not found: ${pactId}` });
      return;
    }
    const w = wallet.toLowerCase();
    const role =
      pact.senderAddress.toLowerCase()   === w ? 'sender' :
      pact.receiverAddress.toLowerCase() === w ? 'receiver' : 'viewer';
    res.status(200).json({ success: true, data: { role, pact } });
  } catch (error) { next(error); }
};

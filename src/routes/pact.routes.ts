import { Router } from 'express';
import {
  create, accept, lock,
  reqRelease, appRelease,
  reqRefund,  appRefund,
  dispute,
  release, refund,
  getAll, getById, getRole,
  getNotifications, readNotifications,
} from '../controllers/pact.controller';

const router = Router();

// ── Lifecycle ─────────────────────────────────────────────────────────────────
router.post('/create',          create);
router.post('/accept',          accept);
router.post('/lock',            lock);
router.post('/request-release', reqRelease);
router.post('/approve-release', appRelease);
router.post('/request-refund',  reqRefund);
router.post('/approve-refund',  appRefund);
router.post('/dispute',         dispute);

// ── Admin bypass ──────────────────────────────────────────────────────────────
router.post('/release', release);
router.post('/refund',  refund);

// ── Notifications ─────────────────────────────────────────────────────────────
router.get ('/notifications',      getNotifications);
router.post('/notifications/read', readNotifications);

// ── Read — named routes BEFORE /:id ──────────────────────────────────────────
router.get('/all',   getAll);
router.get('/role',  getRole);   // GET /pact/role?wallet=0x...&pactId=...
router.get('/:id',   getById);

export default router;

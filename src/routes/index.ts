import { Router } from 'express';
import healthRoutes from './healthRoutes';
import testRoutes   from './test.routes';
import pactRoutes   from './pact.routes';

const router = Router();

// ── System ───────────────────────────────────────────────────────────────────
router.use('/health', healthRoutes);

// ── Test / Development ────────────────────────────────────────────────────────
// Raw Circle transfer test — useful for verifying credentials are working.
// Consider removing or gating this before production.
router.use('/test', testRoutes);

// ── Escrow Core ───────────────────────────────────────────────────────────────
router.use('/pact', pactRoutes);

export default router;

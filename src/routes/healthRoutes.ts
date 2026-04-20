import { Router } from 'express';
import { healthCheck } from '../controllers/healthController';

const router = Router();

/**
 * @route   GET /health
 * @desc    Returns ArcPact service health status
 * @access  Public
 */
router.get('/', healthCheck);

export default router;

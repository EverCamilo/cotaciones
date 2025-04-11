/**
 * Arquivo central para organizar e exportar todas as rotas da API
 */

import { Router } from 'express';
import crossingPointsRouter from './crossingPoints';

const router = Router();

// Registrar as rotas dos pontos de travessia
router.use('/crossing-points', crossingPointsRouter);

export default router;
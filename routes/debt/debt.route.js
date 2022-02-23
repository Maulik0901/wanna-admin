import express from 'express';
import DebtController from '../../controllers/debt/debt.controller';
import { requireAuth } from '../../services/passport';

const router = express.Router();

router.route('/')
    .post(
        requireAuth,
        DebtController.validateBody(),
        DebtController.create
    )
    .get(DebtController.findAll);
    
router.route('/:DebtId')
    .put(
        requireAuth,
        DebtController.validateBody(true),
        DebtController.update
    )
    .get(DebtController.findById)
    .delete( requireAuth,DebtController.delete);


export default router;
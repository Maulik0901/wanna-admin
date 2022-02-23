import express from 'express';
import BankController from '../../controllers/bank/bank.controller';
import { requireAuth } from '../../services/passport';

const router = express.Router();

router.route('/')
    .post(
        requireAuth,
        BankController.validateBody(),
        BankController.create
    )
    .get(BankController.findAll);
    
router.route('/:BankId')
    .put(
        requireAuth,
        BankController.validateBody(true),
        BankController.update
    )
    .get(BankController.findById)
    .delete( requireAuth,BankController.delete);


export default router;
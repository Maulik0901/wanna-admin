import express from 'express';
import TaxController from '../../controllers/tax/tax.controller';
import { requireAuth } from '../../services/passport';

const router = express.Router();

router.route('/')
    .post(
        requireAuth,
        TaxController.validateBody(),
        TaxController.create
    )
    .get(TaxController.findAll);
    
router.route('/:TaxId')
    .put(
        requireAuth,
        TaxController.validateBody(true),
        TaxController.update
    )
    .get(TaxController.findById)
    .delete( requireAuth,TaxController.delete);

router.route('/:TaxId/active')
    .put(
        requireAuth,
        TaxController.active
    )
router.route('/:TaxId/dis-active')
    .put(
        requireAuth,
        TaxController.disactive
    )
export default router;
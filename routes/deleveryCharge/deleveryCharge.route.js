import express from 'express';
import DeleveryController from '../../controllers/deliveryCharge/deliveryCharge.controller';
import { requireAuth } from '../../services/passport';

const router = express.Router();

router.route('/')
    .post(
        // requireAuth,
        DeleveryController.validateBody(),
        DeleveryController.create
    )
    .get(DeleveryController.findAll);
    
router.route('/:deleveryChargeId')
    .put(
        // requireAuth,
        DeleveryController.validateBody(true),
        DeleveryController.update
    )
    .get(DeleveryController.findById)
    .delete( 
        // requireAuth,
        DeleveryController.delete
    );


export default router;
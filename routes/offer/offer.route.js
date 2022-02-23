import express from 'express';
import OfferController from '../../controllers/offer/offer.controller';
import { requireAuth } from '../../services/passport';

const router = express.Router();

router.route('/:orderId/orders')
    .post(
        requireAuth,
        OfferController.validateCreatedOffers(),
        OfferController.create
    );

router.route('/')
    .get(OfferController.findAll)

router.route('/:offerId')
    .get(OfferController.findById)
    .delete( requireAuth,OfferController.delete);
router.route('/:offerId/accept')
    .put( requireAuth,OfferController.accept)

router.route('/:offerId/refuse')
    .put( requireAuth,OfferController.refuse)



export default router;

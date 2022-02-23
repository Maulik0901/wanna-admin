import express from 'express';
import BillController from '../../controllers/bills/bills.controller';
import { requireAuth } from '../../services/passport';
import { multerSaveTo } from '../../services/multer-service';

const router = express.Router();

// router.route('/:orderId/orders/:offerId/offers')
//     .post(
//         requireAuth,
//         multerSaveTo('bills').single('img'),
//         BillController.validateBody(),
//         BillController.create
//     )
//     router.route('/')
//     .get(BillController.findAll);

router.route('/:orderId/orders')
    .post(
        requireAuth,
        multerSaveTo('bills').single('img'),
        BillController.validateBody(),
        BillController.create
    )
    router.route('/')
    .get(BillController.findAll);
    
router.route(`/:orderId/orders/:storeId/store`)
      .post(
        requireAuth,
        multerSaveTo('bills').single('img'),
        BillController.validateBody(),
        BillController.createStore
      )
router.route('/:billId')
    .put(
        requireAuth,
        multerSaveTo('bills').single('img'),
        BillController.validateBody(true),
        BillController.update
    )
    .get(BillController.findById)
    .delete( requireAuth,BillController.delete);


export default router;
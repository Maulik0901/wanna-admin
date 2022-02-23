import express from "express";
import PaymentContoller from '../../controllers/payment/payment.controller';

import { requireAuth } from "../../services/passport";
import { multerSaveTo } from "../../services/multer-service";

const router = express.Router();

router.route("/checkout").post(PaymentContoller.checkoutPayment);
router.route("/checkstatus").post(PaymentContoller.checkPaymentStatus);


export default router;

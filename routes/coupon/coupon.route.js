import express from 'express';
import CouponController from '../../controllers/coupon/coupon.controller';
import { requireAuth } from '../../services/passport';
import { multerSaveTo } from '../../services/multer-service';
import {requireAdminAuth} from "../../services/adminAuth";
const router = express.Router();

router.route('/')
    .post(
        requireAdminAuth,
        CouponController.validateBody(),
        CouponController.create
    )
    .get(CouponController.findAll);
router.route('/check')
    .post(
        requireAuth,        
        CouponController.check
    )
router.route('/:CouponId')
    .put(
        requireAdminAuth,
        CouponController.validateBody(),
        CouponController.update
    )
    .get(CouponController.findById)
    .delete( requireAdminAuth,CouponController.delete);

    router.route('/:couponId/end')
    .put(
        requireAdminAuth,
        CouponController.end
    )
    router.route('/:couponId/reused')
    .put(
        requireAdminAuth,
        CouponController.reused
    )





export default router;
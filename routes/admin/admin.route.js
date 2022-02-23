import express from 'express';
import adminController from '../../controllers/admin/admin.controller';
import { requireAuth } from '../../services/passport';
import {requireAdminAuth} from '../../services/adminAuth';
const router = express.Router();


router.route('/create')
    .post(adminController.validateAdminCreateBody(),adminController.create);

router.route('/users')
    .get(requireAuth,adminController.getLastUser);

router.route('/orders')
    .get(requireAuth,adminController.getLastOrder);

router.route('/actions')
    .get(requireAuth,adminController.getLastActions);

router.route('/count')
    .get(requireAdminAuth,adminController.count);
    
router.route('/countAll')
    .get(requireAuth,adminController.countAll);



export default router;

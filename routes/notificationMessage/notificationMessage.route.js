var express = require('express');

var NotificationMessageController = require('../../controllers/notificationMessage/notifcationMessageController');
import { requireAuth } from '../../services/passport';
import {requireAdminAuth} from "../../services/adminAuth";
const router = express.Router();

/* GET users listing. */
router.route('/create').post(requireAdminAuth,NotificationMessageController.createMessage);
router.route('/update')
    .put(requireAdminAuth,NotificationMessageController.updateMessage);
router.route('/get').post(requireAdminAuth,NotificationMessageController.getMessage);
router.route('/getByType').post(requireAdminAuth,NotificationMessageController.getMessageByType);

router.route('/multiUpdate')
    .put(requireAdminAuth,NotificationMessageController.multipleUpdateMessage);
    
export default router;
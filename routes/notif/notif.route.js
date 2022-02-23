import express from 'express';
import NotifController from '../../controllers/notif/notif.controller';
import {requireAuth} from '../../services/passport';
import {requireAdminAuth} from '../../services/adminAuth';

const router = express.Router();

router.route('/')
    .get(requireAdminAuth,NotifController.find);

router.route('/get')
    .get(requireAuth,NotifController.getByUser);

router.route('/:notifId/read')
    .put(requireAuth,NotifController.read)

router.route('/:notifId/unread')
    .put(requireAuth,NotifController.unread)

router.route('/unreadCount')
    .get(requireAdminAuth,NotifController.unreadCount);

router.route('/:notifId')
    .delete(requireAuth,NotifController.delete);

router.route('/deleteAll')
    .delete(requireAuth,NotifController.deleteAll);


export default router;
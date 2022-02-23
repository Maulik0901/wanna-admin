import express from 'express';
import ContactController from '../../controllers/contact/contact.controller';
import { requireAuth } from '../../services/passport';

const router = express.Router();


router.route('/')
    .post(
        ContactController.validateContactCreateBody(),
        ContactController.createContactMessage
    )
    .get(requireAuth,ContactController.findAll);

router.route('/:contactId')
    .get(ContactController.findById)
    .delete(ContactController.delete)

router.route('/:contactId/reply')
    .post(
        requireAuth,
        ContactController.validateContactReplyBody(),
        ContactController.reply
    );



export default router;
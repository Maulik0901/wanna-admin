import express from 'express';
import TimeController from '../../controllers/time/time.controller';
import { requireAuth } from '../../services/passport';

const router = express.Router();

router.route('/')
    .post(
        requireAuth,
        TimeController.validateBody(),
        TimeController.create
    )
    .get(TimeController.findAll);
    
router.route('/:TimeId')
    .put(
        requireAuth,
        TimeController.validateBody(true),
        TimeController.update
    )
    .get(TimeController.findById)
    .delete( requireAuth,TimeController.delete);


export default router;
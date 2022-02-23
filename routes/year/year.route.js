import express from 'express';
import YearController from '../../controllers/year/year.controller';
import { requireAuth } from '../../services/passport';

const router = express.Router();

router.route('/')
    .post(
        requireAuth,
        YearController.validateBody(),
        YearController.create
    )
    .get(YearController.findAll);
    
router.route('/:YearId')
    .put(
        requireAuth,
        YearController.validateBody(true),
        YearController.update
    )
    .get(YearController.findById)
    .delete( requireAuth,YearController.delete);


export default router;
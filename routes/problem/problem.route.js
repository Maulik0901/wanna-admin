import express from 'express';
import ProblemController from '../../controllers/problem/problem.controller';
import { requireAuth } from '../../services/passport';
import { multerSaveTo } from '../../services/multer-service';

const router = express.Router();

router.route('/:orderId')
    .post(
        requireAuth,
        multerSaveTo('orders').array('img',4),
        ProblemController.validateBody(),
        ProblemController.create
    )
router.route('/')
    .get(ProblemController.findAll);
    
router.route('/:ProblemId')
    .put(
        requireAuth,
        ProblemController.validateBody(true),
        ProblemController.update
    )
    .delete( requireAuth,ProblemController.delete);

router.route('/:ProblemId/reply')
    .put(
        requireAuth,
        ProblemController.reply
    )
export default router;
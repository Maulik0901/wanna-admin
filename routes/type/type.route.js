import express from 'express';
import TypeController from '../../controllers/type/type.controller';
import { requireAuth } from '../../services/passport';

const router = express.Router();

router.route('/')
    .post(
        requireAuth,
        TypeController.validateBody(),
        TypeController.create
    )
    .get(TypeController.findAll);
    
router.route('/:TypeId')
    .put(
        requireAuth,
        TypeController.validateBody(true),
        TypeController.update
    )
    .get(TypeController.findById)
    .delete( requireAuth,TypeController.delete);


export default router;
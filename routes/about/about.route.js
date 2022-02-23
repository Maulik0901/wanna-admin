import express from 'express';
import AboutController from '../../controllers/about/about.controller';
import { requireAuth } from '../../services/passport';
import { multerSaveTo } from '../../services/multer-service';

const router = express.Router();

router.route('/')
    .post(
        requireAuth,
        multerSaveTo('about').single('img'),
        AboutController.validateBody(),
        AboutController.create
    )
    .get(AboutController.findAll);
    
router.route('/:aboutId')
    .put(
        requireAuth,
        multerSaveTo('about').single('img'),
        AboutController.validateBody(true),
        AboutController.update
    )
    .delete( requireAuth,AboutController.delete);


export default router;
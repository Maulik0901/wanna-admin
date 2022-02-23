import express from 'express';
import ShopController from '../../controllers/shop/shop.controller';
import { requireAuth } from '../../services/passport';
import { multerSaveTo } from '../../services/multer-service';

const router = express.Router();

router.route('/')
    .post(
        requireAuth,
        multerSaveTo('shops').single('img'),
        ShopController.validateBody(),
        ShopController.create
    )
    .get(ShopController.findAll);
    
router.route('/:ShopId')
    .put(
        requireAuth,
        multerSaveTo('shops').single('img'),
        ShopController.validateBody(true),
        ShopController.update
    )
    .get(ShopController.findById)
    .delete( requireAuth,ShopController.delete);







export default router;
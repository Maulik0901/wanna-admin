import express from 'express';
import OptionController from '../../controllers/option/option.controller';
import { requireAuth } from '../../services/passport';
import { multerSaveTo } from '../../services/multer-service';

const router = express.Router();

router.route('/')
    .post(
        requireAuth,
        OptionController.validateBody(),
        OptionController.create
    )
    .get(OptionController.findAll);

router.route('/:OptionId')
    .delete( requireAuth,OptionController.delete);
router.route('/:OptionId/enable')
    .put(
       	requireAuth,
        OptionController.enable
     )
router.route('/:OptionId/enableApp')
    .put(
        requireAuth,
        OptionController.enableApp
    )
router.route('/:OptionId/disable')
    .put(
        requireAuth,
        OptionController.disable
    )
router.route('/:OptionId/disableApp')
  .put(
    requireAuth,
    OptionController.disableApp
  )


export default router;

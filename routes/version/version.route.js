import express from 'express';
import VersionController from '../../controllers/version/version.controller';

const router = express.Router();

router.route('/')
    .post(
        VersionController.validateBody(),
        VersionController.create
    )
    .get(VersionController.findAll);
    
router.route('/:VersionId')
    .put(        
        VersionController.validateBody(true),
        VersionController.update
    );
export default router;
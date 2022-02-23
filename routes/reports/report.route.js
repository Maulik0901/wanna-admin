import express from 'express';
import ReportController from '../../controllers/reports/report.controller';
const router = express.Router();


router.route('/')
    .get(ReportController.findAll);

router.route('/:reportId')
    .get(ReportController.findById)
    .delete(ReportController.delete)

export default router;
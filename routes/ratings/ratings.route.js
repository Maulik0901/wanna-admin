import express from 'express';
import RatingsController from '../../controllers/ratings/ratings.controller';
import { requireAuth } from '../../services/passport';

const router = express.Router();

router
  .route("/")
  .post(RatingsController.createRating);


export default router;

import express from "express";
import { requireAuth } from "../../services/passport";
import distanceController from "../../controllers/distance/distance.controller";

const router = express.Router();

router.route("/").get(distanceController.findAll);
router
  .route("/:id")
  .put(
    requireAuth,
    distanceController.validateBody(true),
    distanceController.update
  )
  .get(distanceController.findDis);


export default router;
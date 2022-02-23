import express from "express";
import CityController from "../../controllers/city/city.controller";
import { requireAuth } from "../../services/passport";
import { requireAdminAuth } from "../../services/adminAuth";

const router = express.Router();

router
  .route("/")
  .post(requireAdminAuth, CityController.createCity)
  .get(requireAdminAuth, CityController.getCities);
router.route("/all").get(
  // requireAuth,
  CityController.getAllCity
);
router
  .route("/:cityId")
  .get(requireAdminAuth, CityController.getOneCity)
  .post(requireAdminAuth, CityController.editCity)
  .delete(requireAdminAuth, CityController.deleteCity);

export default router;

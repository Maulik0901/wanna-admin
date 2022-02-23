import express from "express";
import vatController from "../../controllers/vat/vat.controller";
import { requireAuth } from "../../services/passport";

const router = express.Router();

router.route("/").get(vatController.findAll);
router
  .route("/:id")
  .put(requireAuth, vatController.validateBody(true), vatController.update)
  .get(vatController.findById);

export default router;

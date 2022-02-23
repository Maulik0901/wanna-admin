import express from "express";
import { requireSignIn, requireAuth } from "../../services/passport";
import AdressController from "../../controllers/address/address.controller";
// import { multerSaveTo } from "../../services/multer-service";

const router = express.Router();

router.post("/create", requireAuth, AdressController.validactionAddress(), AdressController.addAddress);
router.get("/", requireAuth, AdressController.addressList);
router.put("/:addressId", requireAuth, AdressController.validactionAddress(), AdressController.updateAddress);
router.delete("/:addressId", requireAuth, AdressController.deleteAddress);
router.put("/primry/:addressId", requireAuth, AdressController.setPrimeryAddress);
// router.post("/socialLogin", AdressController.socialLogin);


export default router;
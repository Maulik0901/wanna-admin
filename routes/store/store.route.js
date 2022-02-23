import express from "express";
import StoreController from "../../controllers/store/store.controller";
import { requireAuth } from "../../services/passport";
import { requireAdminAuth } from "../../services/adminAuth";
import { requireStoreAdminAuth } from "../../services/storeAdminAuth";

import { multerSaveTo } from "../../services/multer-service";
import storeController from "../../controllers/store/store.controller";

const router = express.Router();

router
  .route("/")
  .get(
    // requireAuth,
    StoreController.findAll
  )
  .post(
    requireAdminAuth,
    multerSaveTo("image").single("img"),
    StoreController.validateCreated(),
    StoreController.create
  );

router.route("/get").post(requireAuth, StoreController.getStoreNear);
router.route("/storeOrderUpdate").put(StoreController.updateStoreOrder);
router
  .route("/category")
  .post(requireStoreAdminAuth, StoreController.createStoreCategory);
router
  .route("/category/:categoryID")
  .get(requireStoreAdminAuth, StoreController.getStoreCategory);
router
  .route("/address")
  .get(StoreController.getAddress)
  .post(
    requireAdminAuth,
    StoreController.validateStoreAddressCreated(),
    StoreController.createAddress
  );
router
  .route("/address/multiAddress")
  .post(requireStoreAdminAuth, StoreController.createMltiAddress);
router
  .route("/address/:id")
  .put(
    requireAdminAuth,
    StoreController.validateStoreAddressCreated(),
    StoreController.updateAddress
  );

router
  .route("/get/:branchID")
  .post(requireAuth, StoreController.getBranchStoreNear);
router
  .route("/:storeId")
  .put(
    requireStoreAdminAuth,
    multerSaveTo("image").single("img"),
    StoreController.validateCreated(),
    StoreController.update
  )
  .delete(requireAdminAuth, StoreController.delete)
  .get(requireStoreAdminAuth, StoreController.findById);

router.route("/updateEarn/:storeId").put(
  // requireAuth,
  StoreController.updateAdminEarn
);

router
  .route("/storeUser/:storeId")
  .post(
    // requireAuth,
    StoreController.validateCreated(),
    StoreController.storeUserAdd
  )
  .get(
    //  requireAuth,
    StoreController.findStoreUser
  );
router.route("/address/check").post(StoreController.checkDeliveryAddressInZone);

router
  .route("/user/multiple/:storeId")
  .post(requireStoreAdminAuth, StoreController.createMultipleStoreUser);
router
  .route("/user/multipletDriver/:storeId")
  .post(requireStoreAdminAuth, StoreController.createMultipleDriverUser);
router.route("/search").post(StoreController.searchStore);

router
  .route("/addStorePayment")
  .post(multerSaveTo("image").single("img"), StoreController.addStorePayment);

router.route("/getStorePayments").post(storeController.getStorePayments);

router
  .route("/updateStorePayments")
  .post(
    multerSaveTo("image").single("img"),
    storeController.updateStorePayments
  );

router
  .route("/getStorePaymentsDataById/:storePaymentId")
  .get(storeController.getStorePaymentsDataById);

export default router;

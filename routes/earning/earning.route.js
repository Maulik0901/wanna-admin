import express from "express";
import earningController from "../../controllers/earning/earning.controller";
import DriverPaymentController from "../../controllers/driverPayment/driverPayment.controller";
import { requireAdminAuth } from "../../services/adminAuth";
import { multerSaveTo } from "../../services/multer-service";
// import earnningController from "../../controllers/earning/earning.controller";

const router = express.Router();

router.route("/list").get(earningController.getCurrentMonthEarning);

router.route("/getEarningData").get(earningController.getEarningData);

router.route("/getStoreEarnings").post(earningController.getStoreEarnings);

router
  .route("/getStoreOrderEarnings")
  .post(earningController.getStoreOrderEarnings);

router.route("/getStoreDetails").post(earningController.getStoreDetails);

router
  .route("/getDriverPeriodWiseEarning")
  .post(earningController.getDriverPeriodWiseEarning);

router
  .route("/getStorePeriodWiseEarning")
  .post(earningController.getStorePeriodWiseEarning);

router
  .route("/driverEarningListMonthly")
  .get(earningController.driverEarningListMonthly);

router
  .route("/getEarningsByDriver")
  .post(earningController.getEarningsByDriver);

router
  .route("/getDriverOrderEarnings")
  .post(earningController.getDriverOrderEarnings);

router.route("/getDriverEarningData")
      .post(earningController.getDriverEarningData);

router.route("/driverAddPayment")
      .post(
        multerSaveTo("driverPayment").single("img"),
        DriverPaymentController.validateCreated(),
        DriverPaymentController.create
      )

router.route("/driverUpdatePayment/:id")
      .put(
        multerSaveTo("driverPayment").single("img"),
        DriverPaymentController.validateCreated(),
        DriverPaymentController.update
      )

router.route("/driverAddPayment").get(DriverPaymentController.get);

export default router;

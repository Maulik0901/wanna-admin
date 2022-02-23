import express from "express";
import OrderController from "../../controllers/order/order.controller";
import { requireAuth } from "../../services/passport";
import { requireAdminAuth } from "../../services/adminAuth";
import { multerSaveTo } from "../../services/multer-service";
import { requireStoreAdminAuth } from "../../services/storeAdminAuth";

const router = express.Router(); 

router.route("/systemDeleteOrder").get(OrderController.systemDeleteOrder);
router
  .route("/")
  .get(OrderController.findOrders)
  .post(
    requireAuth,
    multerSaveTo("orders").single("img"),
    OrderController.validateCreated(),
    OrderController.create
  );
router.route("/applingCouponOrder").get(OrderController.applingCouponOrder);
router.route("/:orderId/deliveredByAdmin").put(requireAuth,OrderController.deliveredByAdmin);

router.route('/status/:orderId')
      .put(requireAuth, OrderController.OrderUpdateStatus);

router.route("/driver")
      .get(requireAuth, OrderController.findNearByDriverOrder);

router.route("/driver/history")
      .get(requireAuth, OrderController.findDriverOrders)

router.route("/ratingCheck")
      .get(requireAuth,OrderController.lastOrderRatingCheck);

router.route("/dissble/ratingPopup/:orderId")
      .put(requireAuth,OrderController.OrderRatingShowDisable)
router.route("/filter").get(OrderController.filterOrders);
router.route("/checkOrderProgress").get(requireAuth,OrderController.orederIsInProgress);

router.route("/addItemOrder").post(requireAuth,OrderController.addItemOrder)
router.route("/orderPaymentStatus/:orderId")
      .post(requireAuth,OrderController.OrderPaymentStatus);

router
  .route("/acceptStoreOrder/:orderId")
  .post(requireAuth,OrderController.acceptStoreUserOrder)

router.route("/orderItemStatusUpdate/:orderId")
      .post(requireAuth,OrderController.orderItemStatusUpdate);

router.route("/orderItemStatusUpdateByAdmin/:orderId")
      .post(requireStoreAdminAuth, OrderController.orderItemStatusUpdateByAdmin)

router.route("/orderFindSalesMan/:orderId")
      .post(requireStoreAdminAuth, OrderController.OrderGetDriverByAdmin)

router.route("/rejectStoreOrder/:orderId")
      .post(requireAuth,OrderController.rejectStoreOrder);

router.route("/getStoreOrder")
      .get(OrderController.getStoreOrder);

      
router.route("/accept/:orderId")
      .put(requireAuth,OrderController.accept);
      
router
  .route("/readyItem/:orderId")
  .post(requireAuth,OrderController.readyStoreOrder);
  
router.route("/acceptItemDriver/:orderId")
      .post(requireAuth,OrderController.acceptItemDriver);

router.route("/itemOrderList")
      .get(requireAuth,OrderController.itemOrderList);
router.route("/itemOrderCount")
      .get(requireAuth,OrderController.itemOrderCount);
router.route("/orderUpdateDriverStatus/:orderId")
      .post(requireAuth,OrderController.orderUpdateDriverStatus);
          
router
  .route("/:orderId")
  .get(OrderController.findById)
  .delete(requireAuth, OrderController.delete);
router.route("/cancel/:orderId").put(requireAuth, OrderController.cancel);

router.route("/:orderId/receive").put(requireAuth, OrderController.receive);

router.route("/:orderId/onTheWay").put(requireAuth, OrderController.onTheWay);

router.route("/:orderId/arrived").put(requireAuth, OrderController.arrived);

router.route("/:orderId/delivered").put(requireAuth, OrderController.delivered);

router.route("/:orderId/rate").put(requireAuth, OrderController.rate);

router
  .route("/:orderId/paidFromBalance")
  .put(requireAuth, OrderController.payFromBalance);

router
  .route("/upload")
  .post(
    requireAuth,
    multerSaveTo("orders").single("img"),
    OrderController.uploadImage
  );
router.route("/checkCoupon").post(requireAuth, OrderController.checkCoupon);

router.route("/uploadbillImages").post(requireAuth, 
      multerSaveTo("users").fields([
          { name: "billImages", maxCount: 8, options: false },
      ]),
      OrderController.uploadbillImages);

router.route("/checkDistance").post(OrderController.checkDistance);

router.route("/dateWiseOrderData")
      .post(requireAuth,OrderController.dateWiseOrderData);


export default router;

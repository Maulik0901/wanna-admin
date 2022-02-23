import express from "express";
import StoreItemController from "../../controllers/storeItem/storeItem.controller";
import { requireAuth } from "../../services/passport";
import { multerSaveTo } from "../../services/multer-service";
import {requireAdminAuth} from "../../services/adminAuth";
const router = express.Router();

router
  .route("/")
  .get(
    // requireAuth,
    StoreItemController.findAll
  )
  .post(
    requireAdminAuth,
    multerSaveTo("image").single("img"),
    StoreItemController.validateCreated(),
    StoreItemController.create
  );
router.route('/getItemByIndexId')
  .get(
    // requireAdminAuth,
    StoreItemController.getItemByIndexId
  )
router.route("/itemOrderUpdate")
  .put(
    StoreItemController.updateItemOrder
  )
router.route("/indexOrderUpdate")
      .put(
        StoreItemController.updateItemIndexOrder
      )
router
  .route("/:storeID")
  .get(
    // requireAuth,
    StoreItemController.findAll
  )
router.route("/:storeItemId")
      .put(
        requireAdminAuth,
        multerSaveTo("image").single("img"),
        StoreItemController.validateCreated(),
        StoreItemController.update
      ).delete(
        requireAdminAuth,
        StoreItemController.delete
      )


router.route("/index")
      .post(
        // requireAdminAuth,
        StoreItemController.validateIndexItemCreated(),
        StoreItemController.createItemIndex
      )
router.route('/index/:storeId')
      .get(
        // requireAdminAuth,
        StoreItemController.getItemIndex
      )



router.route('/index/:storeindexItemId')
      .delete(
        // requireAdminAuth,
        StoreItemController.deleteItemIndex
      )
      .put(
        // requireAdminAuth,
        StoreItemController.validateIndexItemCreated(),
        StoreItemController.updateIndexItem
      )

export default router;

import express from "express";
import {requireAuth } from "../../services/passport";
import UserController from "../../controllers/user/user.controller";
import { multerSaveTo } from "../../services/multer-service";
import StoreController from "../../controllers/store/store.controller";
import {requireAdminAuth} from "../../services/adminAuth";
const router = express.Router();




router.post("/testIosNotification",UserController.sendDemoNotification)
     

router.post("/signin", UserController.signIn);
router.post("/store/signin", UserController.storeUsersignIn);

router.post("/socialLogin", UserController.socialLogin);
router.post("/checkMobile", UserController.CheckMobile);
router.post('/createUser', UserController.validateNewUserCreateBody(), UserController.createUser);

router.post('/signup/driver', 
multerSaveTo("users").fields([
  { name: "img", maxCount: 1, options: false },
  { name: "vehicalImages", maxCount: 8, options: false },
  { name: "idProofImages", maxCount: 4, options: false },
]),
// multerSaveTo("users").single("img"),
UserController.validateNewUserCreateBody(), UserController.createDriver);

router.get("/driver/active",requireAuth,UserController.checkDriverActive)

router.post('/login', UserController.loginUser);
router.post('/changePassword', UserController.changePassword);
router.put('/profile', requireAuth, UserController.validateNewUserCreateBody(true), UserController.updateProfile);
router.put('/user/language', requireAuth, UserController.updateLanguage);

router.put('/password/rest',requireAuth,UserController.resetPassword);
router
  .route("/signup")
  .post(
    multerSaveTo("users").single("img"),
    UserController.validateUserCreateBody(),
    UserController.signUp
  );

router
  .route("/addSubAdmin")
  .post(
    requireAdminAuth,
    multerSaveTo("users").single("img"),
    UserController.validateSubAdminCreateBody(),
    UserController.addSubAdmin
  );  
router.route("/admin/changePassword")
      .post(
        requireAdminAuth,
        UserController.changeAdminPassword
      )
router
  .route("/addSubAdmin/:id")
  .put(
    requireAdminAuth,
    multerSaveTo("users").single("img"),
    UserController.validateSubAdminCreateBody(),
    UserController.updateSubAdminInfo
  );  

router
  .route("/subAdmin")
  .get(
    requireAdminAuth,
    UserController.findSubAdminAll
  );  

router.route("/addSalesMan").post(
  requireAuth,
  multerSaveTo("users").fields([
    { name: "img", maxCount: 1, options: false },
    { name: "transportLicense", maxCount: 8, options: false },
    { name: "transportImages", maxCount: 4, options: false },
  ]),

  UserController.validateSalesManCreateBody(),
  UserController.addSalesMan
);
router.route("/becameSalesMan").put(
  requireAuth,
  multerSaveTo("users").fields([
    { name: "transportLicense", maxCount: 8, options: false },
    { name: "transportImages", maxCount: 4, options: false },
  ]),
  UserController.becameSalesMan
);

router.route("/becameStore").put(
  requireAuth, 
  UserController.becameStore
);
router.route("/becameAdminStore/:userId").put(
  // requireAuth, 
  UserController.becameAdminStore
)

router.route("/:userId/active").put(requireAdminAuth, UserController.active);
router.route("/:userId/activeStore").put(requireAuth, UserController.activeStore);

router.route("/:userId/block").put(requireAdminAuth, UserController.block);

router.route("/:userId/unblock").put(requireAuth, UserController.unblock);
router.route("/:userId/disactive").put(requireAuth, UserController.disactive);
router.route("/logout").post(requireAuth, UserController.logout);
router.route("/addToken").post(requireAuth, UserController.addToken);
router.route("/updateToken").put(requireAuth, UserController.updateToken);

router.put("/check-exist-email", UserController.checkExistEmail);

router.put("/check-exist-phone", UserController.checkExistPhone);

router.put(
  "/user/updateInfo",
  requireAuth,
  multerSaveTo("users").single("img"),
  UserController.validateUpdatedBody(),
  UserController.updateInfo
);

router.put(
  "/user/:userId/updateInfo",
  requireAuth,
  multerSaveTo("users").fields([
    { name: "img", maxCount: 1, options: false },
    { name: "transportLicense", maxCount: 8, options: false },
    { name: "transportImages", maxCount: 4, options: false },
  ]),
  UserController.validateUpdatedBodyAdmin(),
  UserController.updateInfoAdmin
);

router.post(
  "/sendCode",
  UserController.validateSendCode(),
  UserController.sendCodeToEmail
);

router.post(
  "/confirm-code",
  UserController.validateConfirmVerifyCode(),
  UserController.resetPhoneConfirmVerifyCode
);

router.post(
  "/reset-phone",
  UserController.validateResetPhone(),
  UserController.resetPhone
);

router.route("/getAll").get(UserController.findAll);
router.route("/getAll/filter").get(UserController.findAllFilter);
router.route("/findAllActiveType").get(UserController.findAllActiveType);
router.route("/findNameByIdList").get(UserController.findNameByIdList);
router.route("/getUser").get(requireAuth, UserController.getUser);

router.route("/:userId/delete").delete(requireAuth, UserController.delete);
router.route("/addCoupon").put(requireAuth, UserController.addCoupon);
router
  .route("/:userId/reduceBalance")
  .put(requireAuth, UserController.reduceBalance);

router.route("/enableNotif").put(requireAuth, UserController.enableNotif);

router.route("/disableNotif").put(requireAuth, UserController.disableNotif);
router.route("/sendnotif").post(
  requireAuth,
  //UserController.validateBodyNotif(),
  UserController.SendNotif
);
// requireAuth,multerSaveTo("users").single("img")
router.route('/sendNotifByUser').post(requireAdminAuth,multerSaveTo("users").single("img"),UserController.sendNotifBySelectUser);
router.route("/getNotificationImage").get(requireAdminAuth,UserController.findNotificationImage);
router.route("/city").get(UserController.getCity);
router.route("/commission").get(UserController.getCommissionType);
router.route("/getGeoPosition").get(UserController.getGeoPosition);
router.route("/onlineUser").get(UserController.isOnlineUser);

router.route("/store/selectAddres")
      .post(StoreController.storeUserSelectAddress)

router.route("/:userId/updateLocation")
      .put(requireAuth, UserController.updateLocation);

router.route("/getUserDetailsWithRatings")
      .get(requireAuth, UserController.getUserDetails);

router.route("/updateNotificationFlag")
      .put(requireAuth, UserController.updateNotificationFlag);


      
export default router;

import { checkExistThenGet, checkExist } from "../../helpers/CheckMethods";
import { body } from "express-validator/check";
import {
  checkNewValidations,
  checkValidations,
  handleImg,
} from "../shared/shared.controller";
import { generateToken } from "../../utils/token";
import User from "../../models/user/user.model";
import Report from "../../models/reports/report.model";
import ApiError from "../../helpers/ApiError";
import ApiSuccess from "../../helpers/ApiSuccess";
import { sendEmail } from "../../services/emailMessage.service";
import { toImgUrl } from "../../utils";
import { generateVerifyCode } from "../../services/generator-code-service";
import Notif from "../../models/notif/notif.model";
import NotifiImage from "../../models/notifiImage/notifiImage.modal";
import Coupon from "../../models/coupon/coupon.model";
import ApiResponse from "../../helpers/ApiResponse";
import Version from "../../models/version/version.model";
import Deliverycharge from "../../models/deliverycharge/deliverycharge.model";
import Vat from "../../models/vat/vat.model";
import { sendNotifiAndPushNotifi } from "../../services/notification-service";
import { sendDemoNotificationForIos } from "../../services/apn-notification-service";
import { commissionType } from "../../utils/constant";
import { genratePassword } from "../../utils/password";
import { comparePassword } from "../../utils/comparePassword";
import Admin from "../../models/admin/admin.model";
import storeAddress from "../../models/storeAddress/storeAddress.model";
import NotificationTokensController from "../notification/notification-token.controller";
import RatingModel from "../../models/ratings/ratings.model";
import RatingsController from "../../controllers/ratings/ratings.controller";
import config from "../../config";
var moment = require("moment");

const checkUserExistByPhone = async (phone) => {
  let user = await User.findOne({ phone });
  if (!user) throw new ApiError.BadRequest("Phone Not Found");

  return user;
};
const checkUserExistByEmail = async (email) => {
  let user = await User.findOne({ email });
  if (!user) throw new ApiError.BadRequest("email Not Found");

  return user;
};

export default {
  async addToken(req, res, next) {
    try {
      let user = req.user;
      let users = await checkExistThenGet(user.id, User);
      let arr = users.token;
      var found = arr.find(function (element) {
        return element == req.body.token;
      });
      if (!found) {
        users.token.push(req.body.token);
        await users.save();
        console.log(req.body.token);
      }
      res.status(200).send({
        users,
      });
    } catch (err) {
      next(err);
    }
  },
  async signIn(req, res, next) {
    try {
      let email = req.body.email;
      let password = req.body.password;

      if (!email) {
        return res.send(new ApiSuccess(false, 400, "email is required!", {}));
      }
      if (!password) {
        return res.send(
          new ApiSuccess(false, 400, "password is required!", {})
        );
      }

      let user = await Admin.findOne({ email, isDeleted: false });

      if (!user)
        return res.send(new ApiSuccess(false, 400, "invalid user!", {}));

      // if(req.body.token != null){
      //     let arr = user.token;
      //     var found = arr.find(function(element) {
      //         return element == req.body.token;
      //     });
      //     if(!found){
      //         user.token.push(req.body.token);
      //         await user.save();
      //     }
      // }

      let passwordCheck = await comparePassword(password, user.password);

      if (!passwordCheck) {
        // next(new ApiError(400, 'Password not correct!'));
        res.send(new ApiSuccess(false, 200, "Password not correct!", {}));
      }

      if (
        req.body.deviceToken &&
        req.body.deviceType &&
        ["A", "I"].includes(req.body.deviceType)
      ) {
        let createdNotificationTokens =
          await NotificationTokensController.createOrUpdate({
            userID: user.id,
            deviceToken: req.body.deviceToken,
            deviceType: req.body.deviceType,
            isToclearToken: false,
          });
      }

      let responesData = {
        user,
        token: generateToken(user.id),
      };
      res.send(new ApiSuccess(true, 200, "login SuccessFully", responesData));
      let reports = {
        action: "User Login",
      };

      let report = await Report.create({ ...reports, user: user });
    } catch (err) {
      next(err);
    }
  },
  async storeUsersignIn(req, res, next) {
    try {
      console.log("UserContoller::: storeUsersignIn ==>")
      console.log(req.body)
      console.log(req.body.deviceToken)
      console.log("========================")
      let email = req.body.email;
      let password = req.body.password;

      if (!email) {
        return res.send(new ApiSuccess(false, 400, "email is required!", {}));
      }
      if (!password) {
        return res.send(
          new ApiSuccess(false, 400, "password is required!", {})
        );
      }

      let query = {
        email,
        type: { $in: ["STORE", "STORE-ADMIN"] },
        isDeleted: false,
      };
      // if(req.body.createdBy) {
      //     query['createdBy'] = req.body.createdBy;
      // }
      let user = await User.findOne(query).populate([
        { path: "store", model: "store" },
        { path: "storeAddress", model: "storeAddress" },
      ]);
      
      if (!user)
        return res.send(new ApiSuccess(false, 400, "invalid user!", {}));

      let passwordCheck = await comparePassword(password, user.password);

      if (!passwordCheck) {
        // next(new ApiError(400, 'Password not correct!'));
        res.send(new ApiSuccess(false, 200, "Password not correct!", {}));
      }
      let storeaddress = await storeAddress.find({
        storeID: user.store.id,
        isDeleted: false,
      });

      let responesData = {
        user,
        token: generateToken(user.id),
        storeAddress: storeaddress,
      };

      //code for the logs deviceToken
      if (
        req.body.deviceToken &&
        req.body.deviceType &&
        ["A", "I"].includes(req.body.deviceType)
      ) {
        let createdNotificationTokens =
          await NotificationTokensController.createOrUpdate({
            userID: user.id,
            deviceToken: req.body.deviceToken,
            deviceType: req.body.deviceType,
            isToclearToken: false,
          });
      }

      res.send(new ApiSuccess(true, 200, "login SuccessFully", responesData));

      let reports = {
        action: "User Login",
      };

      let report = await Report.create({ ...reports, user: user });
    } catch (err) {
      next(err);
    }
  },
  async CheckMobile(req, res, next) {
    console.log(req.body);
    let query = {
      phone: req.body.phone,
      isDeleted: false,
      type: "CLIENT",
    };
    if (req.body.createdBy) {
      query["createdBy"] = req.body.createdBy;
    }

    if (req.body.type) {
      query.type = req.body.type;
    }

    if (req.body.countryCode) {
      query["countryCode"] = req.body.countryCode;
    }

    let findUser = await User.findOne(query);
    if (findUser) {
      res.send(new ApiSuccess(true, 200, "found User", { isUser: true }));
    }

    res.send(new ApiSuccess(false, 200, "Not found User", { isUser: false }));
  },
  async createUser(req, res, next) {
    try {
      const validatedBody = checkNewValidations(req);
      console.log(req.body);
      let password = await genratePassword(req.body.password);

      let createdUser = await User.create({
        ...validatedBody,
        token: req.body.token,
        password,
      });

      let user = await User.findOne(createdUser).populate([
        { path: "city", model: "city" },
      ]);

      //code for the logs deviceToken
      if (
        req.body.deviceToken &&
        req.body.deviceType &&
        ["A", "I"].includes(req.body.deviceType)
      ) {
        let createdNotificationTokens =
          await NotificationTokensController.createOrUpdate({
            userID: user.id,
            deviceToken: req.body.deviceToken,
            deviceType: req.body.deviceType,
            isToclearToken: false,
          });
      }

      let responesData = {
        user: user,
        token: generateToken(createdUser.id),
      };
      res.send(
        new ApiSuccess(true, 200, "User Create SuccessFully", responesData)
      );
    } catch (e) {
      console.log(req.body);
      console.log({ e });
      res.status(400).send(e);
    }
  },
  async createDriver(req, res, next) {
    try {
      if (!req.body.password) {
        return res.send(new ApiSuccess(false, 400, "password is required", {}));
      }

      if (!req.body.address) {
        return res.send(new ApiSuccess(false, 400, "address is required", {}));
      }

      if (!req.body.vehicalType) {
        return res.send(
          new ApiSuccess(false, 400, "vehicalType is required", {})
        );
      }

      if (!req.files["vehicalImages"]) {
        return res.send(
          new ApiSuccess(false, 400, "vehicalImages is required", {})
        );
      }
      if (!req.files["idProofImages"]) {
        return res.send(
          new ApiSuccess(false, 400, "idProofImages is required", {})
        );
      }

      const validatedBody = checkNewValidations(req);

      let password = await genratePassword(req.body.password);
      validatedBody.password = password;
      validatedBody.address = req.body.address;
      validatedBody.vehicalType = req.body.vehicalType;

      if (req.files) {
        if (req.files["img"]) {
          let imagesList = [];
          for (let imges of req.files["img"]) {
            imagesList.push(await toImgUrl(imges));
          }
          validatedBody.img = imagesList[0];
        }
        if (req.files["vehicalImages"]) {
          let imagesList = [];
          for (let imges of req.files["vehicalImages"]) {
            imagesList.push(await toImgUrl(imges));
          }
          validatedBody.vehicalImages = imagesList;
        }
        if (req.files["idProofImages"]) {
          let imagesList = [];
          for (let imges of req.files["idProofImages"]) {
            imagesList.push(await toImgUrl(imges));
          }
          validatedBody.idProofImages = imagesList;
        }
      } else {
        next(new ApiError(422, "imgs is required"));
      }

      // if(req.body.transportType){
      //     validatedBody.transportType = req.body.transportType;
      // } else{
      //     // next(new ApiError(422, 'transportType is required'));
      //     return res.send(new ApiSuccess(false,400,'transportType is required',{}))
      // }

      // if(req.body.manufacturingYear){
      //     validatedBody.manufacturingYear = req.body.manufacturingYear;
      // } else{
      //     // next(new ApiError(422, 'manufacturingYear is required'));
      //     return res.send(new ApiSuccess(false,400,'manufacturingYear is required',{}))
      // }
      // if(req.body.bank){
      //     validatedBody.bank = req.body.bank;
      // } else{
      //     // next(new ApiError(422, 'bank is required'));
      //     return res.send(new ApiSuccess(false,400,'bank is required',{}))
      // }
      // if(req.body.bankNumber){
      //     validatedBody.bankNumber = req.body.bankNumber;
      // } else{
      //     // next(new ApiError(422, 'bankNumber is required'));
      //     return res.send(new ApiSuccess(false,400,'bankNumber is required',{}))
      // }

      // validatedBody.transportImages = transportImages;//validatedBody.transportImages;

      // validatedBody.transportLicense = transportLicense;//validatedBody.transportLicense;

      validatedBody.type = "SALES-MAN";
      console.log(validatedBody);
      let createdUser = await User.create({
        ...validatedBody,
      });

      let users = await Admin.find({ _id: validatedBody.createdBy, type: "A" });
      users.forEach((user) => {
        sendNotifiAndPushNotifi({
          targetUser: user.id,
          fromUser: createdUser._id,
          text: "new notification",
          subject: user.id,
          subjectType: createdUser.username + " want to be runner",
        });
        // let notif = {
        //   description: createdUser.username + " want to be runner",
        //   arabicDescription:
        //     createdUser.username + " يرغب في الانضمام إلى المناديب ",
        // };
        // Notif.create({
        //   ...notif,
        //   resource: createdUser._id,
        //   target: user.id,
        //   user: user.id,
        //   type: "SALES-MAN",
        // });
      });

      //code for the logs deviceToken
      let responseUser = await User.findOne({ _id: createdUser._id });
      console.log("============");
      console.log(req.body.deviceToken);
      console.log(req.body.deviceType);
      console.log("============");
      if (
        req.body.deviceToken &&
        req.body.deviceType &&
        ["A", "I"].includes(req.body.deviceType)
      ) {
        let createdNotificationTokens =
          await NotificationTokensController.createOrUpdate({
            userID: responseUser.id,
            deviceToken: req.body.deviceToken,
            deviceType: req.body.deviceType,
            isToclearToken: false,
          });
      }

      let responesData = {
        user: responseUser,
        token: generateToken(createdUser._id),
      };
      res.send(
        new ApiSuccess(true, 200, "User Create SuccessFully", responesData)
      );
    } catch (err) {
      // console.log(req.body)
      console.log({ err });
      res.status(400).send(err);
    }
  },
  async loginUser(req, res, next) {
    if (req.body.type === "SALES-MAN") {
      if (!req.body.email) {
        return res.send(new ApiSuccess(false, 400, "email is required", {}));
      }
    } else {
      if (!req.body.phone) {
        return res.send(new ApiSuccess(false, 400, "phone is required", {}));
      }
    }

    if (!req.body.password) {
      return res.send(new ApiSuccess(false, 400, "password is required", {}));
    }

    let query = {
      phone: req.body.phone,
      isDeleted: false,
      type: "CLIENT",
    };
    if (req.body.type) {
      query["type"] = req.body.type;
    }
    if (req.body.type === "SALES-MAN") {
      query.type = { $in: ["SALES-MAN", "STORE-SALESMAN"] };
      query["email"] = req.body.email;
      delete query.phone;
    }
    if (req.body.createdBy) {
      query["createdBy"] = req.body.createdBy;
    }
    if (req.body.countryCode) {
      query["countryCode"] = req.body.countryCode;
    }

    let findUser = await User.findOne(query);
    if (findUser) {
      let passwordCheck = await comparePassword(
        req.body.password,
        findUser.password
      );

      if (!passwordCheck) {
        // next(new ApiError(400, 'Password not correct!'));
        res.send(new ApiSuccess(false, 200, "Password not correct!", {}));
      }

      //code for the logs deviceToken
      let responseUser = await User.findOne({ _id: findUser.id }).populate([
        { path: "city", model: "city" },
      ]);
      console.log("============");
      console.log(req.body.deviceToken);
      console.log(req.body.deviceType);
      console.log("============");
      if (
        req.body.deviceToken &&
        req.body.deviceType &&
        ["A", "I"].includes(req.body.deviceType)
      ) {
        let createdNotificationTokens =
          await NotificationTokensController.createOrUpdate({
            userID: responseUser._id,
            deviceToken: req.body.deviceToken,
            deviceType: req.body.deviceType,
            isToclearToken: false,
          });
      }

      let responesData = {
        user: responseUser,
        token: generateToken(findUser.id),
      };
      res.send(new ApiSuccess(true, 200, "login SuccessFully", responesData));

      // res.status(201).send({
      //     user: await User.findOne(findUser),
      //     token: generateToken(findUser.id)
      // });
      // return res.status(200).send(passwordCheck)
    } else {
      res.send(
        new ApiSuccess(false, 200, "User not found!", { user: {}, token: "" })
      );
    }

    // next(new ApiError(400, 'User not found!'));
  },
  async changePassword(req, res, next) {
    if (!req.body.phone) {
      next(new ApiError(400, "phone is required"));
    }
    if (!req.body.password) {
      next(new ApiError(400, "password is required"));
    }

    let query = {
      phone: req.body.phone,
      isDeleted: false,
    };

    if (req.body.createdBy) {
      query["createdBy"] = req.body.createdBy;
    }
    if (req.body.countryCode) {
      query["countryCode"] = req.body.countryCode;
    }
    let findUser = await User.findOne(query);
    if (findUser) {
      findUser.password = await genratePassword(req.body.password);
      findUser.save();
      res.send(new ApiSuccess(true, 200, "password Update", {}));
    }
    // next(new ApiError(400, 'User not found!'));
    res.send(new ApiSuccess(false, 200, "User not found!", {}));
  },
  async updateProfile(req, res, next) {
    try {
      const validatedBody = checkNewValidations(req);
      let user = await checkExistThenGet(req.user._id, User);
      if (req.file) {
        let image = await handleImg(req, {
          attributeName: "img",
          isUpdate: true,
        });
        validatedBody.img = image;
      }
      user.language = validatedBody.language;
      user.phone = validatedBody.phone;
      user.countryCode = validatedBody.countryCode;
      // user.gender = validatedBody.gender;
      // user.birthYear = validatedBody.birthYear;

      user.username = validatedBody.username;
      user.email = validatedBody.email;

      if (validatedBody.city) {
        user.city = validatedBody.city;
      }

      if (validatedBody.img) {
        user.img = validatedBody.img;
      }

      await user.save();
      let reports = {
        action: "Update User Info",
      };
      let report = await Report.create({ ...reports, user: req.user });

      res.send(
        new ApiSuccess(
          true,
          200,
          "Update User Info",
          await User.findById(req.user._id)
        )
      );
    } catch (error) {
      res.status(200).send(error);
    }
  },
  async checkDriverActive(req, res, next) {
    try {
      let user = await checkExistThenGet(req.user._id, User);
      if (user.active) {
        res.send(new ApiSuccess(true, 200, "User is active", user));
      } else {
        if (user.block) {
          res.send(new ApiSuccess(false, 400, "User is block", user));
        } else {
          res.send(new ApiSuccess(false, 400, "User is not active", user));
        }
      }
    } catch (err) {
      console.log(err);
      res.status(400).send(err);
    }
  },
  async resetPassword(req, res, next) {
    if (!req.body.oldPassword) {
      // next(new ApiError(400, 'phone is required'));
      res.send(new ApiSuccess(false, 200, "Old Password is required!", {}));
    }
    if (!req.body.password) {
      // next(new ApiError(400, 'password is required'));
      res.send(new ApiSuccess(false, 200, "Password is required!", {}));
    }

    let user = await checkExistThenGet(req.user._id, User);

    let passwordCheck = await comparePassword(
      req.body.oldPassword,
      user.password
    );

    if (!passwordCheck) {
      // next(new ApiError(400, 'Password not correct!'));
      return res.send(new ApiSuccess(false, 200, "Old Password not correct!", {}));
    }

    if (user) {
      user.password = await genratePassword(req.body.password);
      user.save();
      res.send(new ApiSuccess(true, 200, "password Update", {}));
    }
    // next(new ApiError(400, 'User not found!'));
    res.send(new ApiSuccess(false, 200, "User not found!", {}));
  },
  async updateLanguage(req, res, next) {
    try {
      
      let user = await checkExistThenGet(req.user._id, User);
     
      if(req.body.language){
        user.language = req.body.language;
      }
     
      await user.save();
     
      res.send(
        new ApiSuccess(
          true,
          200,
          "Update User Lunguage",
          await User.findById(req.user._id)
        )
      );
    } catch (error) {
      res.status(200).send(error);
    }
  },
  validateUserCreateBody(isUpdate = false) {
    let validations = [
      body("username").not().isEmpty().withMessage("username is required"),
      // body('gender').not().isEmpty().withMessage('gender is required'),
      // body('birthYear').not().isEmpty().withMessage('birthYear is required'),
      body("gender").optional(),
      body("birthYear").optional(),
      body("language").optional(),
      body("signUpFrom").optional(),
      body("mobile").optional(),
      body("city").optional(),
      body("mobile2").optional(),
      body("phone")
        .not()
        .isEmpty()
        .withMessage("phone is required")
        .custom(async (value, { req }) => {
          let userQuery = { phone: value, isDeleted: false };
          if (isUpdate && req.user.phone === value)
            userQuery._id = { $ne: req.user._id };

          if (await User.findOne(userQuery))
            throw new Error(req.__("phone duplicated"));
          // throw new ApiSuccess(false,200,'phone duplicated!',{})
          else return true;
        }),
      body("email")
        .not()
        .isEmpty()
        .withMessage("email is required")
        .isEmail()
        .withMessage("email syntax")
        .custom(async (value, { req }) => {
          let userQuery = { email: value, isDeleted: false };
          if (isUpdate && req.user.email === value)
            userQuery._id = { $ne: req.user._id };

          if (await User.findOne(userQuery))
            throw new Error(req.__("email duplicated"));
          // throw new ApiSuccess(false,200,'email duplicated!',{})
          else return true;
        }),

      body("type")
        .not()
        .isEmpty()
        .withMessage("type is required")
        .isIn(["CLIENT", "ADMIN", "SALES-MAN", "DIRECTOR"])
        .withMessage("wrong type"),
      body("img")
        .optional()
        .custom((val) => isImgUrl(val))
        .withMessage("img should be a valid img"),
      body("version").optional(),
      body("os").optional(),
      body("createdBy").optional(),
      body("countryCode").optional(),
    ];
    return validations;
  },
  validateNewUserCreateBody(isUpdate = false) {
    let validations = [
      body("username").not().isEmpty().withMessage("username is required"),
      // body('gender').not().isEmpty().withMessage('gender is required'),
      // body('birthYear').not().isEmpty().withMessage('birthYear is required'),
      body("gender").optional(),
      body("birthYear").optional(),
      body("language").optional(),
      body("signUpFrom").optional(),
      body("mobile").optional(),
      body("city").optional(),
      body("mobile2").optional(),
      body("phone")
        .not()
        .isEmpty()
        .withMessage("phone is required")
        .custom(async (value, { req }) => {
          let userQuery = { phone: value, isDeleted: false };
          if (isUpdate && req.user.phone === value)
            userQuery._id = { $ne: req.user._id };

          if (await User.findOne(userQuery))
            throw new Error(req.__("phone duplicated"));
          // throw new ApiSuccess(false,200,'phone duplicated!',{});
          else return true;
        }),
      body("email")
        .not()
        .isEmpty()
        .withMessage("email is required")
        .isEmail()
        .withMessage("email syntax")
        .custom(async (value, { req }) => {
          let userQuery = { email: value, isDeleted: false };
          if (isUpdate && req.user.email === value)
            userQuery._id = { $ne: req.user._id };

          if (await User.findOne(userQuery))
            throw new Error(req.__("email duplicated"));
          // throw new ApiSuccess(false,200,'email duplicated!',{})
          else return true;
        }),

      body("type")
        .not()
        .isEmpty()
        .withMessage("type is required")
        .isIn(["CLIENT", "ADMIN", "SALES-MAN", "DIRECTOR"])
        .withMessage("wrong type"),
      body("img")
        .optional()
        .custom((val) => isImgUrl(val))
        .withMessage("img should be a valid img"),
      body("version").optional(),
      body("os").optional(),
      body("createdBy").optional(),
      body("countryCode").optional(),
    ];
    return validations;
  },
  validateSubAdminCreateBody(isUpdate = false) {
    let validations = [
      body("username").not().isEmpty().withMessage("username is required"),
      // body('gender').not().isEmpty().withMessage('gender is required'),
      // body('birthYear').not().isEmpty().withMessage('birthYear is required'),
      body("gender").optional(),
      body("language").optional(),
      body("password").optional(),
      body("phone")
        .not()
        .isEmpty()
        .withMessage("phone is required")
        .custom(async (value, { req }) => {
          let { id } = req.params;

          let userQuery = {
            phone: value,
            isDeleted: false,
            createdBy: parseInt(req.body.createdBy),
          };
          if (id) {
            userQuery["_id"] = { $ne: parseInt(id) };
          }

          if (await Admin.findOne(userQuery))
            throw new Error(req.__("phone duplicated"));
          // throw new ApiSuccess(false,200,'phone duplicated!',{});
          else return true;
        }),
      body("email")
        .not()
        .isEmpty()
        .withMessage("email is required")
        .isEmail()
        .withMessage("email syntax")
        .custom(async (value, { req }) => {
          let { id } = req.params;
          let userQuery = {
            email: value,
            isDeleted: false,
            createdBy: parseInt(req.body.createdBy),
          };
          if (id) {
            userQuery["_id"] = { $ne: parseInt(id) };
          }

          if (await Admin.findOne(userQuery))
            throw new Error(req.__("email duplicated"));
          // throw new ApiSuccess(false,200,'email duplicated!',{})
          else return true;
        }),

      body("type")
        .not()
        .isEmpty()
        .withMessage("type is required")
        .isIn(["SUB", "A"])
        .withMessage("wrong type"),
      body("img")
        .optional()
        .custom((val) => isImgUrl(val))
        .withMessage("img should be a valid img"),
      body("createdBy").optional(),
      body("permission").optional(),
    ];
    return validations;
  },
  async signUp(req, res, next) {
    try {
      const validatedBody = checkValidations(req);

      if (req.file) {
        let image = await handleImg(req);
        validatedBody.img = image;
      }
      let createdUser = await User.create({
        ...validatedBody,
        token: req.body.token,
      });
      res.status(201).send({
        user: await User.findOne(createdUser),
        token: generateToken(createdUser.id),
      });
      let reports = {
        action: "User Sign Up",
      };
      let report = await Report.create({ ...reports, user: createdUser.id });
    } catch (err) {
      next(err);
    }
  },
  async addSubAdmin(req, res, next) {
    try {
      const validatedBody = checkValidations(req);

      if (req.file) {
        let image = await handleImg(req);
        validatedBody.img = image;
      }

      console.log(validatedBody);
      if (validatedBody.permission) {
        validatedBody.permission = JSON.parse(validatedBody.permission);
      }

      validatedBody.password = await genratePassword(validatedBody.password);

      console.log({ validatedBody });
      let createdUser = await Admin.create({
        ...validatedBody,
      });
      console.log({ createdUser });
      res.status(201).send({
        user: createdUser,
      });
      let reports = {
        action: "User Sign Up",
      };
      let report = await Report.create({ ...reports, user: createdUser.id });
    } catch (err) {
      next(err);
    }
  },
  async updateSubAdminInfo(req, res, next) {
    try {
      let { id } = req.params;
      const validatedBody = checkValidations(req);
      let admin = await checkExistThenGet(id, Admin);
      if (req.file) {
        let image = await handleImg(req, {
          attributeName: "img",
          isUpdate: true,
        });
        admin.img = image;
      }

      if (validatedBody.language) {
        admin.language = validatedBody.language;
      }
      if (validatedBody.phone) {
        admin.phone = validatedBody.phone;
      }
      if (validatedBody.gender) {
        admin.gender = validatedBody.gender;
      }

      if (validatedBody.permission) {
        admin.permission = JSON.parse(validatedBody.permission);
      }
      if (validatedBody.password) {
        admin.password = await genratePassword(validatedBody.password);
      }

      admin.username = validatedBody.username;
      // admin.email = validatedBody.email;

      if (validatedBody.city) {
        admin.city = validatedBody.city;
      }

      await admin.save();
      let reports = {
        action: "Update User Info",
      };
      // let report = await Report.create({...reports, user: req.user });
      res.status(200).send({
        user: await Admin.findById(id),
      });
    } catch (error) {
      next(error);
    }
  },
  async changeAdminPassword(req, res, next) {
    if (!req.body.password) {
      next(new ApiError(400, "password is required"));
    }

    if (!req.body.oldPassword) {
      next(new ApiError(400, "oldPassword is required"));
    }

    let query = {
      _id: req.user._id,
      isDeleted: false,
    };

    let findUser = await Admin.findOne(query);

    if (findUser) {
      let passwordCheck = await comparePassword(
        req.body.oldPassword,
        findUser.password
      );

      if (!passwordCheck) {
        // next(new ApiError(400, 'Password not correct!'));
        res.send(new ApiSuccess(false, 400, "Old Password not correct!", {}));
      }

      findUser.password = await genratePassword(req.body.password);
      findUser.save();
      res.send(new ApiSuccess(true, 200, "password Update", {}));
    }
    // next(new ApiError(400, 'User not found!'));
    res.send(new ApiSuccess(false, 200, "User not found!", {}));
  },
  validateSalesManCreateBody(isUpdate = false) {
    let validations = [
      body("username").not().isEmpty().withMessage("username is required"),
      body("gender").not().isEmpty().withMessage("gender is required"),
      body("birthYear").not().isEmpty().withMessage("birthYear is required"),
      body("transportType").optional(),
      body("manufacturingYear").optional(),
      body("bank").optional(),
      body("bankNumber").optional(),
      body("language").optional(),
      body("signUpFrom").optional(),

      body("phone")
        .not()
        .isEmpty()
        .withMessage("phone is required")
        .custom(async (value, { req }) => {
          let userQuery = { phone: value, isDeleted: false };
          if (isUpdate && req.user.phone === value)
            userQuery._id = { $ne: req.user._id };

          if (await User.findOne(userQuery))
            throw new Error(req.__("phone duplicated"));
          else return true;
        }),
      body("email")
        .not()
        .isEmpty()
        .withMessage("email is required")
        .isEmail()
        .withMessage("email syntax")
        .custom(async (value, { req }) => {
          let userQuery = { email: value, isDeleted: false };
          if (isUpdate && req.user.email === value)
            userQuery._id = { $ne: req.user._id };

          if (await User.findOne(userQuery))
            throw new Error(req.__("email duplicated"));
          else return true;
        }),

      body("type")
        .not()
        .isEmpty()
        .withMessage("type is required")
        .isIn(["CLIENT", "ADMIN", "SALES-MAN", "DIRECTOR"])
        .withMessage("wrong type"),
    ];
    return validations;
  },
  async addSalesMan(req, res, next) {
    try {
      const validatedBody = checkValidations(req);
      validatedBody.active = true;
      if (req.files) {
        if (req.files["img"]) {
          let imagesList = [];
          for (let imges of req.files["img"]) {
            imagesList.push(await toImgUrl(imges));
          }
          validatedBody.img = imagesList;
        }
        if (req.files["transportImages"]) {
          let imagesList = [];
          for (let imges of req.files["transportImages"]) {
            imagesList.push(await toImgUrl(imges));
          }
          validatedBody.transportImages = imagesList;
        }
        if (req.files["transportLicense"]) {
          let imagesList = [];
          for (let imges of req.files["transportLicense"]) {
            imagesList.push(await toImgUrl(imges));
          }
          validatedBody.transportLicense = imagesList;
        }
      } else {
        next(new ApiError(422, "imgs is required"));
      }
      let createdUser = await User.create({
        ...validatedBody,
      });
      res.status(201).send({
        user: await User.findOne(createdUser),
        token: generateToken(createdUser.id),
      });
      let reports = {
        action: "User Sign Up",
      };
      let report = await Report.create({ ...reports, user: createdUser.id });
    } catch (err) {
      next(err);
    }
  },

  async becameSalesMan(req, res, next) {
    try {
      const validatedBody = checkValidations(req);
      var transportImages = "";
      var transportLicense = "";
      if (req.files) {
        if (req.files["transportImages"]) {
          let imagesList = [];
          for (let imges of req.files["transportImages"]) {
            if (transportImages != "") {
              transportImages += ",";
            }
            //                        imagesList.push(await toImgUrl(imges))
            transportImages += await toImgUrl(imges);
          }
          // validatedBody.transportImages = imagesList;
        }
        if (req.files["transportLicense"]) {
          let imagesList = [];
          for (let imges of req.files["transportLicense"]) {
            if (transportLicense != "") {
              transportLicense += ",";
            }
            //                        imagesList.push(await toImgUrl(imges));
            transportLicense += await toImgUrl(imges);
          }
          // validatedBody.transportLicense = imagesList;
        }
      } else {
        next(new ApiError(422, "imgs is required"));
      }
      let user = await checkExistThenGet(req.user._id, User);
      if (req.body.transportType) {
        user.transportType = req.body.transportType;
      } else {
        next(new ApiError(422, "transportType is required"));
      }
      if (req.body.manufacturingYear) {
        user.manufacturingYear = req.body.manufacturingYear;
      } else {
        next(new ApiError(422, "manufacturingYear is required"));
      }
      if (req.body.bank) {
        user.bank = req.body.bank;
      } else {
        next(new ApiError(422, "bank is required"));
      }
      if (req.body.bankNumber) {
        user.bankNumber = req.body.bankNumber;
      } else {
        next(new ApiError(422, "bankNumber is required"));
      }

      // if(validatedBody.transportImages){
      user.transportImages = transportImages; //validatedBody.transportImages;
      // } else{
      //     next(new ApiError(422, 'transportImages is required'));
      // }
      // if(validatedBody.transportLicense){
      user.transportLicense = transportLicense; //validatedBody.transportLicense;
      // } else{
      //     next(new ApiError(422, 'transportLicense is required'));
      // }
      await user.save();
      let users = await Admin.find({ type: "ADMIN" });
      users.forEach((user) => {
        sendNotifiAndPushNotifi({
          targetUser: user.id,
          fromUser: req.user._id,
          text: "new notification",
          subject: user.id,
          subjectType: req.user.username + " want to be runner",
        });
        // let notif = {
        //   description: req.user.username + " want to be runner",
        //   arabicDescription:
        //     req.user.username + " يرغب في الانضمام إلى المناديب ",
        // };
        // Notif.create({
        //   ...notif,
        //   resource: req.user._id,
        //   target: user.id,
        //   user: user.id,
        // });
      });

      console.log(validatedBody);

      let reports = {
        action: "User Wants to be Sales Man",
      };
      let report = await Report.create({ ...reports, user: req.user });
      res.status(200).send(user);
    } catch (error) {
      next(error);
    }
  },
  async becameStore(req, res, next) {
    try {
      const validatedBody = checkValidations(req);

      let user = await checkExistThenGet(req.user._id, User);
      if (req.body.storeName) {
        user.storeName = req.body.storeName;
      } else {
        next(new ApiError(422, "storeName is required"));
      }
      if (req.body.storeLat) {
        user.storeLat = req.body.storeLat;
      } else {
        next(new ApiError(422, "storeLat is required"));
      }

      if (req.body.storeLng) {
        user.storeLng = req.body.storeLng;
      } else {
        next(new ApiError(422, "storeLng is required"));
      }

      if (req.body.storeAddress) {
        user.storeAddress = req.body.storeAddress;
      } else {
        next(new ApiError(422, "storeAddress is required"));
      }

      if (req.body.storeCity) {
        user.storeCity = req.body.storeCity;
      } else {
        next(new ApiError(422, "storeCity is required"));
      }

      if (req.body.storePhone) {
        user.storePhone = req.body.storePhone;
      } else {
        next(new ApiError(422, "storePhone is required"));
      }

      await user.save();
      let users = await User.find({ type: "ADMIN" });
      users.forEach(async (user) => {
        sendNotifiAndPushNotifi({
          targetUser: user.id,
          fromUser: req.user._id,
          text: "new notification",
          subject: user.id,
          subjectType: req.user.username + " want to be store",
        });
        let notif = {
          description: req.user.username + " want to be store",
          arabicDescription:
            req.user.username + " يرغب في الانضمام إلى المناديب ",
        };
        let findNoti = await Notif.find({});
        // Notif.create({
        //   ...notif,
        //   resource: req.user._id,
        //   target: user.id,
        //   user: user.id,
        //   type: "store",
        // });
      });

      console.log(validatedBody);

      let reports = {
        action: "User Wants to be Store Man",
      };
      let report = await Report.create({ ...reports, user: req.user });
      res.status(200).send(user);
    } catch (error) {
      next(error);
    }
  },
  async becameAdminStore(req, res, next) {
    try {
      let { userId } = req.params;
      const validatedBody = checkValidations(req);
      // if (user.type != 'ADMIN')
      //     return next(new ApiError(403, ('admin.auth')));

      let user = await checkExistThenGet(userId, User);
      if (req.body.storeName) {
        user.storeName = req.body.storeName;
      } else {
        next(new ApiError(422, "storeName is required"));
      }
      // if(req.body.storeLat){
      //     user.storeLat = req.body.storeLat;
      // } else{
      //     next(new ApiError(422, 'storeLat is required'));
      // }

      // if(req.body.storeLng){
      //     user.storeLng = req.body.storeLng;
      // } else{
      //     next(new ApiError(422, 'storeLng is required'));
      // }

      if (req.body.storeAddress) {
        user.storeAddress = req.body.storeAddress;
      } else {
        next(new ApiError(422, "storeAddress is required"));
      }

      if (req.body.storeCity) {
        user.storeCity = req.body.storeCity;
      } else {
        next(new ApiError(422, "storeCity is required"));
      }

      if (req.body.storePhone) {
        user.storePhone = req.body.storePhone;
      } else {
        next(new ApiError(422, "storePhone is required"));
      }
      user.type = "STORE";

      await user.save();

      let reports = {
        action: "User Wants to be Store Man By Admin",
      };
      let report = await Report.create({ ...reports, user: req.user });
      res.status(200).send(user);
    } catch (error) {
      next(error);
    }
  },
  async activeStore(req, res, next) {
    try {
      let user = req.user;
      if (user.type != "ADMIN") return next(new ApiError(403, "admin.auth"));
      /**
 if (user.type == 'CLIENT')
                return next(new ApiError(403, ('admin.auth')));
            if (user.type == 'SALES-MAN')
                return next(new ApiError(403, ('admin.auth')));
 */
      let { userId } = req.params;
      let activeUser = await checkExistThenGet(userId, User);
      activeUser.type = "STORE";
      activeUser.active = true;
      activeUser.block = false;
      await activeUser.save();
      let reports = {
        action: "Active User",
      };
      let report = await Report.create({ ...reports, user: user });
      sendNotifiAndPushNotifi({
        targetUser: userId,
        fromUser: req.user,
        text: "ونا ديليفري",
        subject: activeUser.id,
        subjectType:
          "Your account has been activated as a runner, please close the application and re-open it again to show the delivery icon with enabling the notifications button",
      });
      // let notif = {
      //   description:
      //     "Your account has been activated as a runner, please close the application and re-open it again to show the delivery icon with enabling the notifications button",
      //   arabicDescription:
      //     "تم تفعيل حسابك كمندوب، نأمل إغلاق التطبيق وإعادة فتحة مرة أخرى لتظهر لديك أيقونة التوصيل مع أهمية تفعيل زر الإشعارات",
      // };
      // await Notif.create({
      //   ...notif,
      //   resource: req.user,
      //   target: userId,
      //   user: activeUser.id,
      // });
      res.send("user active");
    } catch (error) {
      next(error);
    }
  },
  async active(req, res, next) {
    try {
      let user = req.user;
      // if (user.type != 'ADMIN')
      //     return next(new ApiError(403, ('admin.auth')));

      let { userId } = req.params;
      let activeUser = await checkExistThenGet(userId, User);
      activeUser.type = "SALES-MAN";
      activeUser.active = true;
      activeUser.block = false;
      await activeUser.save();
      let reports = {
        action: "Active User",
      };
      let report = await Report.create({ ...reports, user: user });
      sendNotifiAndPushNotifi({
        targetUser: userId,
        fromUser: req.user,
        text: "ونا ديليفري",
        subject: activeUser.id,
        subjectType:
          "Your account has been activated as a runner, please close the application and re-open it again to show the delivery icon with enabling the notifications button",
      });
      // let notif = {
      //   description:
      //     "Your account has been activated as a runner, please close the application and re-open it again to show the delivery icon with enabling the notifications button",
      //   arabicDescription:
      //     "تم تفعيل حسابك كمندوب، نأمل إغلاق التطبيق وإعادة فتحة مرة أخرى لتظهر لديك أيقونة التوصيل مع أهمية تفعيل زر الإشعارات",
      // };
      // await Notif.create({
      //   ...notif,
      //   resource: req.user,
      //   target: userId,
      //   user: activeUser.id,
      // });
      res.send("user active");
    } catch (error) {
      next(error);
    }
  },

  async disactive(req, res, next) {
    try {
      let user = req.user;
      if (user.type != "ADMIN") return next(new ApiError(403, "admin.auth"));

      let { userId } = req.params;
      let activeUser = await checkExistThenGet(userId, User);
      activeUser.active = false;
      activeUser.block = true;
      await activeUser.save();
      let reports = {
        action: "Dis-Active User",
      };
      let report = await Report.create({ ...reports, user: user });
      sendNotifiAndPushNotifi({
        targetUser: userId,
        fromUser: req.user,
        text: "ونا ديليفري",
        subject: activeUser.id,
        subjectType:
          "Your account as a runner is inactive, please pay the amounts due to be reactivated",
      });
      // let notif = {
      //   description:
      //     "Your account as a runner is inactive, please pay the amounts due to be reactivated",
      //   arabicDescription:
      //     "حسابك كمندوب غير نشيط، نأمل سداد المبالغ المستحقة ليتم إعادة تفعيله ",
      // };
      // await Notif.create({
      //   ...notif,
      //   resource: req.user,
      //   target: userId,
      //   user: activeUser.id,
      // });
      res.send("user disactive");
    } catch (error) {
      next(error);
    }
  },
  async block(req, res, next) {
    try {
      let user = req.user;
      // if (user.type != 'ADMIN')
      //     return next(new ApiError(403, ('admin.auth')));

      let { userId } = req.params;
      let activeUser = await checkExistThenGet(userId, User);
      activeUser.block = true;
      await activeUser.save();
      let reports = {
        action: "block User",
      };
      let report = await Report.create({ ...reports, user: user });
      res.send("user block");
    } catch (error) {
      next(error);
    }
  },
  async unblock(req, res, next) {
    try {
      let user = req.user;
      if (user.type != "ADMIN") return next(new ApiError(403, "admin.auth"));

      let { userId } = req.params;
      let activeUser = await checkExistThenGet(userId, User);
      activeUser.block = false;
      await activeUser.save();
      let reports = {
        action: "Active User",
      };
      let report = await Report.create({ ...reports, user: user });
      res.send("user active");
    } catch (error) {
      next(error);
    }
  },

  async findById(req, res, next) {
    try {
      let { id } = req.params;
      await checkExist(id, User, { isDeleted: false });

      let user = await User.findById(id);
      res.send(user);
    } catch (error) {
      next(error);
    }
  },

  async checkExistEmail(req, res, next) {
    try {
      let email = req.body.email;
      if (!email) {
        return next(new ApiError(400, "email is required"));
      }
      let exist = await User.findOne({ email: email });
      let duplicated;
      if (exist == null) {
        duplicated = false;
      } else {
        duplicated = true;
      }
      let reports = {
        action: "User Check Email Exist Or Not",
      };
      let report = await Report.create({ ...reports, user: req.user });
      return res.status(200).send({ duplicated: duplicated });
    } catch (error) {
      next(error);
    }
  },

  async checkExistPhone(req, res, next) {
    try {
      let phone = req.body.phone;
      if (!phone) {
        return next(new ApiError(400, "phone is required"));
      }
      let exist = await User.findOne({ phone: phone });
      let duplicated;
      if (exist == null) {
        duplicated = false;
      } else {
        duplicated = true;
      }
      let reports = {
        action: "User Check Mobile Exist Or Not",
      };
      let report = await Report.create({ ...reports, user: req.user });
      return res.status(200).send({ duplicated: duplicated });
    } catch (error) {
      next(error);
    }
  },
  validateUpdatedBody(isUpdate = true) {
    let validations = [
      body("username").not().isEmpty().withMessage("username is required"),
      body("gender").not().isEmpty().withMessage("gender is required"),
      body("birthYear").not().isEmpty().withMessage("birthYear is required"),
      body("language").optional(),
      body("rate").optional(),
      body("balance").optional(),
      body("debt").optional(),
      body("ratePercent").optional(),
      body("mobile").optional(),
      body("city").optional(),
      body("mobile2").optional(),
      body("phone")
        .not()
        .isEmpty()
        .withMessage("phone is required")
        .custom(async (value, { req }) => {
          let userQuery = { phone: value, isDeleted: false };
          userQuery._id = { $ne: req.user._id };
          if (await User.findOne(userQuery))
            throw new Error(req.__("phone duplicated"));
          else return true;
        }),
      body("email")
        .not()
        .isEmpty()
        .withMessage("email is required")
        .isEmail()
        .withMessage("email syntax")
        .custom(async (value, { req }) => {
          let userQuery = { email: value, isDeleted: false };
          if (isUpdate && req.user.email === value)
            userQuery._id = { $ne: req.user._id };

          if (await User.findOne(userQuery))
            throw new Error(req.__("email duplicated"));
          else return true;
        }),
    ];
    if (isUpdate)
      validations.push([
        body("img")
          .optional()
          .custom((val) => isImgUrl(val))
          .withMessage("img should be a valid img"),
      ]);

    return validations;
  },
  async updateInfo(req, res, next) {
    try {
      const validatedBody = checkValidations(req);
      let user = await checkExistThenGet(req.user._id, User);
      if (req.file) {
        let image = await handleImg(req, {
          attributeName: "img",
          isUpdate: true,
        });
        validatedBody.img = image;
      }
      user.language = validatedBody.language;
      user.phone = validatedBody.phone;
      user.gender = validatedBody.gender;
      user.birthYear = validatedBody.birthYear;

      user.username = validatedBody.username;
      user.email = validatedBody.email;

      if (validatedBody.city) {
        user.city = validatedBody.city;
      }

      if (validatedBody.img) {
        user.img = validatedBody.img;
      }

      if (validatedBody.mobile) {
        user.mobile = validatedBody.mobile;
      }
      if (validatedBody.mobile2) {
        user.mobile2 = validatedBody.mobile2;
      }

      await user.save();
      let reports = {
        action: "Update User Info",
      };
      let report = await Report.create({ ...reports, user: req.user });
      res.status(200).send({
        user: await User.findById(req.user._id),
      });
    } catch (error) {
      next(error);
    }
  },
  validateUpdatedBodyAdmin(isUpdate = true) {
    let validations = [
      body("username").not().isEmpty().withMessage("username is required"),
      body("gender").not().isEmpty().withMessage("gender is required"),
      body("birthYear").not().isEmpty().withMessage("birthYear is required"),
      body("language"),
      body("rate"),
      body("balance"),
      body("debt"),
      body("transportType"),
      body("manufacturingYear"),
      body("bank"),
      body("bankNumber"),

      body("ratePercent"),
      body("mobile").optional(),
      body("mobile2").optional(),
      body("rateFrom5").optional(),

      body("quotationMinPrice").optional(),
      body("quotationMaxPrice").optional(),
      body("commissionType").optional(),
      body("commissionValue").optional(),
      body("city").optional(),

      body("phone")
        .not()
        .isEmpty()
        .withMessage("phone is required")
        .custom(async (value, { req }) => {
          let { userId } = req.params;
          let user = await checkExistThenGet(userId, User);
          let userQuery = { phone: value, isDeleted: false };
          if (isUpdate && user.phone === value) userQuery._id = { $ne: userId };

          if (await User.findOne(userQuery))
            throw new Error(req.__("phone duplicated"));
          else return true;
        }),
      body("email").custom(async (value, { req }) => {
        let { userId } = req.params;
        let user = await checkExistThenGet(userId, User);
        let userQuery = { email: value, isDeleted: false };
        if (isUpdate && user.email === value) userQuery._id = { $ne: userId };

        if (await User.findOne(userQuery))
          throw new Error(req.__("email duplicated"));
        else return true;
      }),
    ];
    if (isUpdate)
      validations.push([
        body("img")
          .optional()
          .custom((val) => isImgUrl(val))
          .withMessage("img should be a valid img"),
      ]);

    return validations;
  },
  async updateInfoAdmin(req, res, next) {
    try {
      let { userId } = req.params;
      const validatedBody = checkValidations(req);
      let user = await checkExistThenGet(userId, User);

      if (req.files["img"]) {
        user.img = await toImgUrl(req.files["img"][0]);
      }
      if (req.files["transportImages"]) {
        let imagesList = "";
        for (let imges of req.files["transportImages"]) {
          if (imagesList != "") {
            imagesList += ",";
          }
          imagesList += await toImgUrl(imges);
        }
        user.transportImages = imagesList;
      }
      if (req.files["transportLicense"]) {
        let imagesList = "";
        for (let imges of req.files["transportLicense"]) {
          if (imagesList != "") {
            imagesList += ",";
          }
          imagesList += await toImgUrl(imges);
        }
        user.transportLicense = imagesList;
      }

      if (validatedBody.language) {
        user.language = validatedBody.language;
      }
      if (validatedBody.phone) {
        user.phone = validatedBody.phone;
      }
      if (validatedBody.gender) {
        user.gender = validatedBody.gender;
      }
      if (validatedBody.birthYear) {
        user.birthYear = validatedBody.birthYear;
      }
      if (validatedBody.username) {
        user.username = validatedBody.username;
      }
      if (validatedBody.email) {
        user.email = validatedBody.email;
      }

      if (validatedBody.mobile) {
        user.mobile = validatedBody.mobile;
      }
      if (validatedBody.mobile2) {
        user.mobile2 = validatedBody.mobile2;
      }

      if (validatedBody.city) {
        user.city = validatedBody.city;
      }

      if (validatedBody.img) {
        user.img = validatedBody.img;
      }
      if (validatedBody.balance) {
        user.balance = validatedBody.balance;
      }
      if (validatedBody.debt) {
        user.debt = validatedBody.debt;
      }
      if (validatedBody.rate) {
        user.rate = validatedBody.rate;
      }
      if (validatedBody.ratePercent) {
        user.ratePercent = validatedBody.ratePercent;
      }
      if (validatedBody.rateFrom5) {
        user.rateFrom5 = validatedBody.rateFrom5;
      }
      if (validatedBody.transportType) {
        user.transportType = validatedBody.transportType;
      }
      if (validatedBody.manufacturingYear) {
        user.manufacturingYear = validatedBody.manufacturingYear;
      }
      if (validatedBody.bank) {
        user.bank = validatedBody.bank;
      }
      if (validatedBody.bankNumber) {
        user.bankNumber = validatedBody.bankNumber;
      }

      if (validatedBody.quotationMinPrice)
        user.quotationMinPrice = validatedBody.quotationMinPrice;
      if (validatedBody.quotationMaxPrice)
        user.quotationMaxPrice = validatedBody.quotationMaxPrice;

      if (validatedBody.commissionType) {
        user.commissionType = validatedBody.commissionType;
        if (validatedBody.commissionType === commissionType[0]) {
          user.commissionValue = 0;
        }
        if (validatedBody.commissionType === commissionType[1]) {
          if (validatedBody.commissionValue) {
            const cv = parseInt(validatedBody.commissionValue);
            if (cv >= 0 && cv <= 100) {
              user.commissionValue = validatedBody.commissionValue;
            } else {
              const errors = [
                {
                  msg: `Commission is in ${commissionType[1]} value must be between 0% to 100%`,
                },
              ];
              return res.status(403).json({ errors });
            }
          }
        }
      }

      await user.save();
      let reports = {
        action: "Update User Info",
      };
      let report = await Report.create({ ...reports, user: req.user });
      res.status(200).send({
        user: await User.findById(req.user._id),
      });
    } catch (error) {
      next(error);
    }
  },
  validateSendCode() {
    return [body("email").not().isEmpty().withMessage("email Required")];
  },
  async sendCodeToEmail(req, res, next) {
    try {
      let validatedBody = checkValidations(req);
      let user = await checkUserExistByEmail(validatedBody.email);
      user.verifycode = generateVerifyCode();
      await user.save();
      //send code
      let text = user.verifycode.toString();
      sendEmail(validatedBody.email, text);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
  validateConfirmVerifyCode() {
    return [
      body("verifycode").not().isEmpty().withMessage("verifycode Required"),
      body("email").not().isEmpty().withMessage("email Required"),
    ];
  },
  async resetPhoneConfirmVerifyCode(req, res, next) {
    try {
      let validatedBody = checkValidations(req);
      let user = await checkUserExistByEmail(validatedBody.email);
      if (user.verifycode != validatedBody.verifycode)
        return next(new ApiError.BadRequest("verifyCode not match"));
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  validateResetPhone() {
    return [
      body("email").not().isEmpty().withMessage("email is required"),
      body("newPhone").not().isEmpty().withMessage("new phone is required"),
    ];
  },

  async resetPhone(req, res, next) {
    try {
      let validatedBody = checkValidations(req);
      let user = await checkUserExistByEmail(validatedBody.email);

      user.phone = validatedBody.newPhone;
      user.verifyCode = "0000";
      await user.save();
      let reports = {
        action: "User reset Phone",
      };
      let report = await Report.create({ ...reports, user: req.user });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async updateToken(req, res, next) {
    try {
      let users = await checkExistThenGet(req.user._id, User);
      let arr = users.token;
      var found = arr.find(function (element) {
        return element == req.body.newToken;
      });
      if (!found) {
        users.token.push(req.body.newToken);
        await users.save();
      }
      let oldtoken = req.body.oldToken;
      console.log(arr);
      for (let i = 0; i <= arr.length; i = i + 1) {
        if (arr[i] == oldtoken) {
          arr.splice(arr[i], 1);
        }
      }
      users.token = arr;
      await users.save();
      res.status(200).send(await checkExistThenGet(req.user._id, User));
    } catch (err) {
      next(err);
    }
  },
  async logout(req, res, next) {
    try {
      let users = await checkExistThenGet(req.user._id, User);

      // await users.save();

      //code for the logs deviceToken clear
      let createdNotificationTokens =
        await NotificationTokensController.createOrUpdate({
          userID: users._id,
          deviceToken: "",
          deviceType: "",
          isToclearToken: true,
        });

      // res.status(200).send(await checkExistThenGet(req.user._id, User));
      return res.send(new ApiSuccess(true, 200, "logout", {}));
    } catch (err) {
      next(err);
    }
  },
  async addCoupon(req, res, next) {
    try {
      let user = await checkExistThenGet(req.user._id, User);
      let coupon = await Coupon.find({
        isDeleted: false,
        end: false,
        couponNumber: req.body.couponNumber,
      }).select("_id");
      user.hasCoupon = true;
      user.coupon = coupon[0]._id;
      await user.save();

      res.status(200).send(user);
    } catch (err) {
      next(new ApiError(403, "invalid coupon"));
    }
  },
  async reduceBalance(req, res, next) {
    try {
      let { userId } = req.params;
      let client = await checkExistThenGet(userId, User);
      let newBalance = client.balance - req.body.money;
      client.balance = newBalance;
      await client.save();
      let user = await checkExistThenGet(req.user._id, User);
      let newSBalance = user.balance + req.body.money;
      user.balance = newSBalance;
      await user.save();
      res.status(200).send("sucess");
    } catch (err) {
      next(err);
    }
  },
  async findAll(req, res, next) {
    try {
      let page = +req.query.page || 1,
        limit = +req.query.limit || 20,
        {
          search,
          type,
          active,
          block,
          notif,
          phone,
          isOnline,
          city,
          isIncome,
          isDebt,
          activeStart,
          activeEnd,
          createdBy,
        } = req.query;

      let sortedTo = { createdAt: -1 };
      let query = { isDeleted: false };

      if (createdBy) {
        query.createdBy = createdBy;
      }

      if (type) {
        query.type = type;
      }
      if (active == "true") {
        query.active = true;
      } else {
        if (type && type == "SALES-MAN") {
          query.active = false;
        }
      }
      if (active == "false") {
        query.active = false;
      }
      if (notif) {
        query.notif = notif;
      }
      if (block == "true") {
        query.block = true;
      } else {
        if (type && type == "SALES-MAN") {
          query.block = false;
        }
      }
      if (block == "false") {
        query.block = false;
      }
      if (phone) {
        query.phone = { $regex: ".*" + phone + ".*" };
      }

      if (search) {
        let Regx = new RegExp("" + search, "i");
        query.$or = [
          { username: { $regex: Regx } },
          { email: { $regex: Regx } },
          { phone: { $regex: Regx } },
        ];
      }

      if (isOnline) {
        query.isOnline = true;
      }

      if (city) {
        query.city = city;
      }

      if (isIncome && isIncome == "true") {
        sortedTo = { balance: -1 };
      }

      if (isDebt && isDebt == "true") {
        sortedTo = { debt: -1 };
      }

      if (!isDebt && !isIncome && isDebt == "false" && isIncome == "false") {
        sortedTo = { createdAt: -1 };
      }

      if (activeStart && activeEnd) {
        query = {
          ...query,
          createdAt: {
            $gte: activeStart,
            $lte: activeEnd,
          },
        };
      }

      if (req.query.id) {
        query._id = req.query.id;
      }

      let users = await User.find(query)
        .populate([{ path: "city", model: "city" }])
        .sort(sortedTo)
        .limit(limit)
        .skip((page - 1) * limit);

      const usersCount = await User.count(query);
      const pageCount = Math.ceil(usersCount / limit);

      res.send(new ApiResponse(users, page, pageCount, limit, usersCount, req));
    } catch (err) {
      next(err);
    }
  },

  async findSubAdminAll(req, res, next) {
    try {
      console.log(req.user._id);
      let page = +req.query.page || 1,
        limit = +req.query.limit || 20,
        { createdBy, id, search } = req.query;

      let sortedTo = { createdAt: -1 };
      let query = { isDeleted: false, _id: { $ne: req.user._id } };

      if (createdBy) {
        query.createdBy = createdBy;
      }

      if (id) {
        query._id = id;
      }

      if (search) {
        query.$or = [
          { username: { $regex: ".*" + search + ".*" } },
          { email: { $regex: ".*" + search + ".*" } },
          { phone: { $regex: ".*" + search + ".*" } },
        ];
      }

      let users = await Admin.find(query)
        .sort(sortedTo)
        .limit(limit)
        .skip((page - 1) * limit);

      const usersCount = await Admin.count(query);
      const pageCount = Math.ceil(usersCount / limit);
      res.send(
        new ApiSuccess(true, 200, "Order list", {
          users,
          page,
          pageCount,
          limit,
          usersCount,
        })
      );
      // res.send(new ApiResponse(users, page, pageCount, limit, usersCount, req));
    } catch (err) {
      next(err);
    }
  },
  async delete(req, res, next) {
    try {
      let { userId } = req.params;
      let user = await checkExistThenGet(userId, User);
      user.isDeleted = true;
      await user.save();
      //await User.findByIdAndDelete(userId);
      let reports = {
        action: "Delete user",
      };
      let report = await Report.create({ ...reports, user: req.user });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
  async getUser(req, res, next) {
    try {
      res.send(await checkExistThenGet(req.user._id, User));
    } catch (error) {
      next(error);
    }
  },
  async socialLogin(req, res, next) {
    try {
      let user = await User.findOne({ email: req.body.email });
      console.log(user);
      if (!user) {
        user = await User.create({
          email: req.body.email,
          type: "CLIENT",
          phone: " ",
          gender: " ",
          username: " ",
          birthYear: " ",
        });
      }
      if (req.body.token != null && req.body.token != "") {
        let arr = user.token;
        var found = arr.find(function (element) {
          return element == req.body.token;
        });
        if (!found) {
          user.token.push(req.body.token);
          await user.save();
        }
      }
      res.status(200).send({
        user,
        token: generateToken(user.id),
      });
    } catch (err) {
      next(err);
    }
  },
  async enableNotif(req, res, next) {
    try {
      let user = await checkExistThenGet(req.user._id, User);
      user.notif = true;
      user.currentLocation = user.currentLocation;
      await user.save();
      res.send({ user });
    } catch (error) {
      next(error);
    }
  },
  async disableNotif(req, res, next) {
    try {
      let user = await checkExistThenGet(req.user._id, User);
      user.notif = false;
      user.currentLocation = user.currentLocation;
      await user.save();
      res.send({ user });
    } catch (error) {
      next(error);
    }
  },
  validateBodyNotif(isUpdate = false) {
    let validations = [
      body("arabicDescription")
        .isEmpty()
        .withMessage("arabic Description is required"),
      body("englishDescription")
        .isEmpty()
        .withMessage("english Description is required"),
    ];
    return validations;
  },
  async SendNotif(req, res, next) {
    try {
      const validatedBody = checkValidations(req);
      let { type, id, city } = req.query;
      let query = { isDeleted: false };
      if (type) query.type = type;
      if (city) query.city = city;
      if (id) query._id = id;
      let users = await User.find(query);
      if (!req.body.englishDescription) {
        return next(new ApiError(403, "english Description is required"));
      }
      if (!req.body.arabicDescription) {
        return next(new ApiError(403, "arabic Description is required"));
      }
      users.forEach((user) => {
        sendNotifiAndPushNotifi({
          targetUser: user.id,
          fromUser: req.user._id,
          text: "ونا ديليفري",
          subject: req.body.englishDescription,
          subjectType: req.body.arabicDescription,
        });
        // let notif = {
        //   description: req.body.englishDescription,
        //   arabicDescription: req.body.arabicDescription,
        // };
        // Notif.create({ ...notif, resource: req.user._id, target: user.id });
      });
      let reports = {
        action: "send notification",
      };
      let report = await Report.create({ ...reports, user: req.user._id });
      res.status(200).send("notification send");
    } catch (error) {
      next(error);
    }
  },

  async sendNotifBySelectUser(req, res, next) {
    try {
      let image;
      if (req.file) {
        image = await handleImg(req, { attributeName: "img", isUpdate: true });
        console.log({ image });
        await NotifiImage.create({
          img: image,
          createdBy: parseInt(req.body.createdBy),
        });
      } else {
        if (req.body.imageUrl) {
          image = req.body.imageUrl;
        }
      }

      let query = { isDeleted: false };

      if (JSON.parse(req.body.isSelectAll)) {
        if (req.body.type) {
          query.type = req.body.type;
        }
        if (req.body.phone) {
          query.phone = { $regex: ".*" + req.body.phone + ".*" };
        }

        if (req.body.city) {
          query.city = req.body.city;
        }

        if (req.body.activeStart && req.body.activeEnd) {
          query = {
            ...query,
            createdAt: {
              $gte: moment(req.body.activeStart).toDate(),
              $lte: moment(req.body.activeEnd).toDate(),
            },
          };
        }
      } else {
        console.log(req.body.ids);
        if (req.body.ids.length <= 0) {
          return next(new ApiError(403, "user id is required"));
        } else {
          query._id = { $in: JSON.parse(req.body.ids) };
        }
      }

      console.log({ query });
      let users = await User.find(query);
      console.log({ image });
      // if(!req.body.englishDescription){
      //     return next(new ApiError(403, ('english Description is required')));
      // }
      // if(!req.body.arabicDescription){
      //     return next(new ApiError(403, ('arabic Description is required')));
      // }

      users.forEach((user) => {
        sendNotifiAndPushNotifi({
          targetUser: user.id,
          fromUser: req.user._id,
          text: "ونا ديليفري",
          subject: req.body.description,
          subjectType: req.body.description,
          image: image ? image : "",
          type: "advertisement",
          title: req.body.title,
          bundelID:
            req.body.type === "CLIENT"
              ? config.iosBundelID.customerApp
              : config.iosBundelID.driverApp,
        });
        let notif = {
          description: req.body.description,
          type: "advertisement",
          createTime: Date.now()
          // arabicDescription: req.body.description,
        };
        if(req.body.title){
          notif = { ...notif, title: req.body.title };
        }
        if (image) {
          notif = { ...notif, image: image };
        }
        Notif.create({ ...notif, from: req.user._id, to: user.id });
      });
      let reports = {
        action: "send notification",
      };
      let report = await Report.create({ ...reports, user: req.user._id });
      res.status(200).send("notification send");
    } catch (error) {
      console.log({ error });
      next(error);
    }
  },

  async findAllFilter(req, res, next) {
    try {
      let page = +req.query.page || 1,
        limit = +req.query.limit || 20,
        { type, active, block, notif, phone, isOnline } = req.query;

      let query = { isDeleted: false };

      if (type) {
        query.type = type;
      }

      if (active == "true") {
        query.active = true;
      }
      if (active == "false") {
        query.active = false;
      }

      const today_start = moment().startOf("day");
      const today_end = moment().endOf("day");

      if (req.query.filterType === "day") {
        query = {
          ...query,
          createdAt: {
            $gte: today_start.toDate(),
            $lte: today_end.toDate(),
          },
        };
      }
      if (req.query.filterType === "yesterday") {
        const y_start = moment().subtract(1, "d").startOf("day");
        const y_end = moment().subtract(1, "d").endOf("day");
        query = {
          ...query,
          createdAt: {
            $gte: y_start.toDate(),
            $lte: y_end.toDate(),
          },
        };
      }
      if (req.query.filterType === "week") {
        const last_week = moment().subtract(7, "d").endOf("day");
        query = {
          ...query,
          createdAt: {
            $gte: last_week.toDate(),
            $lte: today_end.toDate(),
          },
        };
      }
      if (req.query.filterType === "month") {
        const last_month = moment(today_end)
          .subtract(1, "months")
          .endOf("month")
          .endOf("day");
        query = {
          ...query,
          createdAt: {
            $gte: last_month.toDate(),
            $lte: today_end.toDate(),
          },
        };
      }
      if (req.query.filterType === "year") {
        const last_year = moment()
          .subtract(1, "years")
          .endOf("week")
          .startOf("day");
        query = {
          ...query,
          createdAt: {
            $gte: last_year.toDate(),
            $lte: today_end.toDate(),
          },
        };
      }

      let users;

      if (req.query.isPageLimit === "true") {
        users = await User.find(query)
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip((page - 1) * limit);
      } else {
        users = await User.find(query).sort({ createdAt: -1 });
      }

      const usersCount = await User.count(query);
      const pageCount = Math.ceil(usersCount / limit);

      res.send(new ApiResponse(users, page, pageCount, limit, usersCount, req));
    } catch (err) {
      next(err);
    }
  },

  async findAllActiveType(req, res, next) {
    try {
      let page = +req.query.page || 1,
        limit = +req.query.limit || 20,
        { type, active, phone, isOnline } = req.query;

      let query = { isDeleted: false };

      if (type) {
        query.type = type;
      }

      if (active == "true") {
        query.active = true;
      }
      if (active == "false") {
        query.active = false;
      }

      const users = await User.find(query).sort({ createdAt: -1 });

      const usersCount = await User.count(query);
      const pageCount = Math.ceil(usersCount / limit);

      res.send(new ApiResponse(users, page, pageCount, limit, usersCount, req));
    } catch (err) {
      next(err);
    }
  },

  async findNameByIdList(req, res, next) {
    let { salesmen } = req.query;
    const ids = salesmen.split(",").map(Number);
    try {
      if (ids.length > 0) {
        User.find(
          {
            _id: { $in: ids },
          },
          {
            _id: -1,
            username: 1,
            phone: 1,
            email: 1,
            city: 1,
          }
        )
          .sort({ createdAt: -1 })
          .then((data) => {
            res.send({ data });
          });
      } else {
        res.status(204).send([]);
      }
    } catch (err) {
      next(err);
    }
  },

  async getCity(req, res, next) {
    const { type, active } = req.query;
    try {
      let query = { isDeleted: false };

      if (type) {
        query.type = type;
      }

      if (active == "true") {
        query.active = true;
      }
      if (active == "false") {
        query.active = false;
      }

      User.distinct("city", query)
        .populate("city")
        .exec(function (err, city) {
          city.sort((a, b) => a.localeCompare(b));
          res.send({ city });
        });
    } catch (err) {
      console.log(err);
      next(err);
    }
  },

  async getCommissionType(req, res, next) {
    try {
      res.send({ commissionType });
    } catch (err) {
      console.log(err);
      next(err);
    }
  },
  async getGeoPosition(req, res, next) {
    try {
      let page = +req.query.page || 1,
        limit = +req.query.limit || 20,
        { type, active, phone, isOnline } = req.query;

      let query = { isDeleted: false };

      if (type) {
        query.type = type;
      }

      if (active == "true") {
        query.active = true;
      }
      if (active == "false") {
        query.active = false;
      }

      const all_users = await User.find(query).sort({ createdAt: -1 });
      const usersCount = await User.count(query);
      const pageCount = Math.ceil(usersCount / limit);
      let users = [];
      if (all_users.length > 0) {
        users = all_users.filter((user) => user.currentLocation.length === 2);
      }
      res.send(new ApiResponse(users, page, pageCount, limit, usersCount, req));
    } catch (err) {
      console.log(err);
      next(err);
    }
  },
  async findNotificationImage(req, res, next) {
    let query = {
      isDeleted: false,
    };
    console.log(req.query.createdBy);
    if (req.query.createdBy) {
      query["createdBy"] = parseInt(req.query.createdBy);
    }

    let images = await NotifiImage.find(query).sort({ createdAt: -1 });
    res.status(200).json({ images });
  },

  async isOnlineUser(req, res, next) {
    let version = await Version.find({ isDeleted: false }).sort({
      createdAt: -1,
    });
    let deleveryCharge = await Deliverycharge.find({ isDeleted: false }).sort({
      createdAt: -1,
    });
    let findVat = await Vat.findById(1);

    let vat = "0";
    if (findVat) {
      vat = findVat.value.toString();
    }
    res.status(200).json({
      data: {
        version: version,
        deleveryCharge: deleveryCharge,
        tax: vat,
      },
    });
  },
  async updateLocation(req, res, next) {
    try {
      let { userId } = req.params;

      if (!req.body.lat) {
        return res.send(
          new ApiSuccess(false, 400, "lat field is required", {})
        );
      }

      if (!req.body.lang) {
        return res.send(
          new ApiSuccess(false, 400, "lang field is required", {})
        );
      }

      let user = await User.findOne({ _id: userId });

      if (!user) {
        return res.send(
          new ApiSuccess(false, 400, "user not found with this id", {})
        );
      }
      console.log("lang==>", req.body.lang, "lat===>", req.body.lat);
      console.log({ userId });
      let updateUser = await User.updateOne(
        { _id: parseInt(userId) },
        {
          location: {
            type: "Point",
            coordinates: [req.body.lang, req.body.lat],
          },
        }
      );

      return res.send(new ApiSuccess(false, 200, "user updated", updateUser));
    } catch (err) {
      console.log(req.body);
      console.log({ err });
      res.send(new ApiSuccess(false, 500, "Internal Server Error", err));
    }
  },
  async updateNotificationFlag(req, res, next) {
    try {
      if (!req.body.userId) {
        return res.send(new ApiSuccess(false, 400, "userId is required", {}));
      }

      if (typeof req.body.isNotification != "boolean") {
        return res.send(
          new ApiSuccess(false, 400, "isNotification flag is required", {})
        );
      }

      let user = await User.findOne({ _id: req.body.userId });

      if (!user) {
        return res.send(
          new ApiSuccess(false, 400, "user not found with this id", {})
        );
      }

      let updateUser = await User.updateOne(
        { _id: req.body.userId },
        {
          isNotification: req.body.isNotification,
        }
      );

      return res.send(
        new ApiSuccess(false, 200, "user notification preference updated", {})
      );
    } catch (err) {
      console.log({ err });
      res.send(new ApiSuccess(false, 500, "Internal Server Error", err));
    }
  },

  async sendDemoNotification(req, res, next) {
    try {
      console.log("call notificaiton call");
      // sendIosPushNotifi()
      sendDemoNotificationForIos(req.body.deviceToken);
      return res.send(
        new ApiSuccess(false, 200, "user notification preference updated", {})
      );
    } catch (err) {
      console.log({ err });
      res.send(new ApiSuccess(false, 500, "Internal Server Error", err));
    }
  },

  async getUserDetails(req, res, next) {
    try {
      // if (!req.body.userId) {
      //     return res.send(new ApiSuccess(false,400,'userId is required',{}))
      // }

      let user = await User.findOne({ _id: req.user._id }).populate([
        { path: "store", model: "store" },
        { path: "storeAddress", model: "storeAddress" }
      ]);

      if (!user) {
        return res.send(
          new ApiSuccess(false, 400, "user not found with this id", {})
        );
      }

      //code for avearege ratings
      let average_rating = 0;
      let ratings = [];

      if (user.type == "SALES-MAN") {
        //code for get drivers ratings and average ratings

        ratings = await RatingModel.find({ driverID: req.user._id });
        let ratingsAVgData = await RatingsController.calculateAverageRating(
          "D",
          [req.user._id]
        );

        if (ratingsAVgData[0] && ratingsAVgData[0]._id == req.user._id) {
          average_rating = ratingsAVgData[0].avg_ratings;
        }
      }

      if (user.type == "STORE" || user.type == "STORE-ADMIN") {
        //code for get drivers ratings and average ratings
        ratings = await RatingModel.find({ storeAddressID: user.storeAddress });
        let ratingsAVgData = await RatingsController.calculateAverageRating(
          "SA",
          [user.storeAddress._id]
        );
          
        if (ratingsAVgData[0] && ratingsAVgData[0]._id == user.storeAddress._id) {
          average_rating = ratingsAVgData[0].avg_ratings;
        }
      }

      // let userdetails = {...user._doc};

      user._doc.average_rating = average_rating;
      user._doc.ratings = ratings;

      if (req.get("lang") === "ar") {
        if(user.store){
          user.store.name = user.store.arName;
        }
        if(user.storeAddress) {
          user.storeAddress.name = user.storeAddress.arName;
          user.storeAddress.address = user.storeAddress.arAddress;
          user.storeAddress.landmark = user.storeAddress.arLandmark;
        }
      }
      return res.send(
        new ApiSuccess(
          false,
          200,
          "user getUserDetailsWithRatings success",
          user
        )
      );
    } catch (err) {
      console.log({ err });
      return res.send(new ApiSuccess(false, 500, "Internal Server Error", err));
    }
  },
};

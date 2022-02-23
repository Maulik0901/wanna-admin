import ApiResponse from "../../helpers/ApiResponse";
import Coupon from "../../models/coupon/coupon.model";
import Report from "../../models/reports/report.model";
import ApiError from "../../helpers/ApiError";
import User from "../../models/user/user.model";
import Order from "../../models/order/order.model";
import {
  checkExist,
  checkExistThenGet,
  isImgUrl,
} from "../../helpers/CheckMethods";
import { handleImg, checkValidations } from "../shared/shared.controller";
import { body } from "express-validator/check";
import ApiSuccess from "../../helpers/ApiSuccess";

export default {
  async findAll(req, res, next) {
    try {
      let page = +req.query.page || 1,
        limit = +req.query.limit || 20;
      let { isShowList, search, startDate, endDate } = req.query;
      let query = { isDeleted: false };
      if (isShowList) {
        if (JSON.parse(isShowList)) {
          // query.isShowList = true;
        } else {
          query.isShowList = true;
          query.endDate = { $gte: Date.now() };
          query.startDate = { $lte: Date.now() };
        }
      } else {
        query.isShowList = true;
        query.endDate = { $gte: Date.now() };
        query.startDate = { $lte: Date.now() };
      }

      if (startDate && endDate) {
        query.endDate = { $lte: endDate };
        query.startDate = { $gte: startDate };
      }

      if (search) {
        let Regx = new RegExp("" + search, "i");
        query.$or = [
          { name: { $regex: Regx } },
          { arName: { $regex: Regx } },
          { code: { $regex: Regx } },
          { discountType: { $regex: Regx } },
        ];
      }

      let Coupons = await Coupon.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

      if (req.get("lang") === "ar") {
        for (let i = 0; i < Coupons.length; i++) {
          Coupons[i].name = Coupons[i].arName;
          Coupons[i].description = Coupons[i].arDescription;
        }
      }
      const CouponsCount = await Coupon.count(query);
      const pageCount = Math.ceil(CouponsCount / limit);

      res.send(
        new ApiResponse(Coupons, page, pageCount, limit, CouponsCount, req)
      );
    } catch (err) {
      next(err);
    }
  },

  validateBody(isUpdate = false) {
    let validations = [
      // body('couponNumber').not().isEmpty().withMessage('number is required'),
      // body('discount').not().isEmpty().withMessage('discount is required'),
      // body("startDate").not().isEmpty().withMessage("start date is required"),
      // body("endDate").not().isEmpty().withMessage("end date is required"),
      // body("salesmen").optional(),
      body("name").not().isEmpty().withMessage("Name is required"),
      body("description")
        .not()
        .isEmpty()
        .withMessage("Description is required"),
      body("arName").optional(),
      body("arDescription").optional(),
      body("code").not().isEmpty().withMessage("Code is required"),
      body("discount").not().isEmpty().withMessage("Discount is required"),
      body("discountType")
        .not()
        .isEmpty()
        .withMessage("DiscountType is required"),
      body("startDate").not().isEmpty().withMessage("StartDate is required"),
      body("endDate").not().isEmpty().withMessage("EndDate is required"),
      body("couponType").not().isEmpty().withMessage("CouponType is required"),
      body("reedMeCoupone")
        .not()
        .isEmpty()
        .withMessage("ReedMeCoupone is required"),
      body("firstX").optional(),
      body("isShowList").optional(),
      body("createdBy").not().isEmpty().withMessage("createdBy is required"),
    ];
    return validations;
  },

  async create(req, res, next) {
    try {
      let user = req.user;
      // if (user.type != 'ADMIN')
      //     return next(new ApiError(403, ('admin.auth')));

      const validatedBody = checkValidations(req);
      console.log({ validatedBody });
      if (validatedBody.couponType === "FX") {
        if (!validatedBody.firstX) {
          return next(new ApiError(400, "First X user required"));
        }
      }
      let findCoupone = await Coupon.find({
        code: validatedBody.code.toUpperCase(),
      });
      if (findCoupone.length > 0) {
        return next(new ApiError(400, "Code is available"));
      }
      let createdCoupon = await Coupon.create({
        ...validatedBody,
        code: validatedBody.code.toUpperCase(),
      });
      let reports = {
        action: "Create Coupon",
      };
      let report = await Report.create({ ...reports, user: user });
      res.status(201).send(createdCoupon);
    } catch (err) {
      next(err);
    }
  },

  async findById(req, res, next) {
    try {
      let { CouponId } = req.params;
      await checkExist(CouponId, Coupon, { isDeleted: false });
      let Coupon = await Coupon.findById(CouponId);
      res.send(Coupon);
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      let user = req.user;
      // if (user.type != 'ADMIN')
      //     return next(new ApiError(403, ('admin.auth')));

      let { CouponId } = req.params;
      await checkExist(CouponId, Coupon, { isDeleted: false });

      const validatedBody = checkValidations(req);
      let updatedCoupon = await Coupon.findByIdAndUpdate(
        CouponId,
        {
          ...validatedBody,
        },
        { new: true }
      );
      let reports = {
        action: "Update Coupon",
      };
      let report = await Report.create({ ...reports, user: user });
      res.status(200).send(updatedCoupon);
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      let user = req.user;
      // if (user.type != 'ADMIN')
      //     return next(new ApiError(403, ('admin.auth')));

      let { CouponId } = req.params;
      let coupon = await checkExistThenGet(CouponId, Coupon, {
        isDeleted: false,
      });
      coupon.isDeleted = true;
      await coupon.save();
      let reports = {
        action: "Delete Coupon",
      };
      let report = await Report.create({ ...reports, user: user });
      res.status(204).send("delete success");
    } catch (err) {
      next(err);
    }
  },

  async end(req, res, next) {
    try {
      // let user = req.user;

      // let { couponId } = req.params;
      // let coupon = await checkExistThenGet(couponId, Coupon);
      // coupon.end = true;
      // await coupon.save();
      // let reports = {
      //     "action":"End Coupon",
      // };
      // let report = await Report.create({...reports, user: user });
      // res.status(204).send(coupon);
      res.status(200);
    } catch (err) {
      next(err);
    }
  },

  async reused(req, res, next) {
    try {
      // let user = req.user;
      // let { couponId } = req.params;
      // let coupon = await checkExistThenGet(couponId, Coupon);
      // coupon.end = false;
      // await coupon.save();
      // let reports = {
      //     "action":"reuse Coupon",
      // };
      // let report = await Report.create({...reports, user: user });
      // res.status(204).send(coupon);
      res.status(200);
    } catch (err) {
      next(err);
    }
  },

  async check(req, res, next) {
    if (!req.body.code) {
      return res.send(new ApiSuccess(false, 400, "code is required", {}));
    }
    if (!req.body.createdBy) {
      return res.send(new ApiSuccess(false, 400, "createdBy is required", {}));
    }

    let user = await checkExistThenGet(req.user._id, User);
    let coupon = await Coupon.findOne({
      isDeleted: false,
      createdBy: req.body.createdBy,
      endDate: { $gte: Date.now() },
      startDate: { $lte: Date.now() },
      code: req.body.code.toUpperCase(),
    });

    if (coupon) {
      let UserOrderQuery = {
        client: req.user._id,
        status: {
          $in: [
            "ON_PROGRESS",
            "RECEIVED",
            "ON_THE_WAY",
            "ARRIVED",
            "DELIVERED",
          ],
        },
        isDeleted: false,
      };
      let userOrderData = await Order.find(UserOrderQuery);
      let userOrderCouponeViseQuery = {
        client: req.user._id,
        status: {
          $in: [
            "ON_PROGRESS",
            "RECEIVED",
            "ON_THE_WAY",
            "ARRIVED",
            "DELIVERED",
          ],
        },
        coupon: coupon._id,
      };
      let couponeViseOrder = await Order.find(userOrderCouponeViseQuery);

      if (couponeViseOrder.length > coupon.reedMeCoupone) {
        return res.send(
          new ApiSuccess(false, 400, "coupone not valid", {
            isValid: false,
            coupone: {},
          })
        );
      }

      if (coupon.couponType == "NU") {
        let newUserCouponeFind = {
          client: req.user._id,
          status: {
            $in: [
              "ON_PROGRESS",
              "RECEIVED",
              "ON_THE_WAY",
              "ARRIVED",
              "DELIVERED",
            ],
          },
          coupon: { $ne: null },
        };
        let couponeNewUserOrder = await Order.find(newUserCouponeFind);

        if (couponeNewUserOrder.length > 0) {
          return res.send(
            new ApiSuccess(false, 400, "coupone not valid", {
              isValid: false,
              coupone: {},
            })
          );
        } else {
          return res.send(
            new ApiSuccess(true, 200, "coupone valid", {
              isValid: true,
              coupone: coupon,
            })
          );
        }
      }
      if (coupon.couponType == "FX") {
        let query = {
          coupon: coupon._id,
          status: {
            $in: [
              "ON_PROGRESS",
              "RECEIVED",
              "ON_THE_WAY",
              "ARRIVED",
              "DELIVERED",
            ],
          },
          isDeleted: false,
        };
        let orders = await Order.find(query);

        if (orders.length <= coupon.firstX) {
          return res.send(
            new ApiSuccess(true, 200, "coupone valid", {
              isValid: true,
              coupone: coupon,
            })
          );
        } else {
          return res.send(
            new ApiSuccess(false, 400, "coupone not valid", {
              isValid: false,
              coupone: {},
            })
          );
        }
      }

      if (coupon.couponType == "UN") {
        return res.send(
          new ApiSuccess(true, 200, "coupone valid", {
            isValid: true,
            coupone: coupon,
          })
        );
      }
    }

    return res.send(
      new ApiSuccess(false, 400, "coupone not valid", {
        isValid: false,
        coupone: {},
      })
    );
  },
};

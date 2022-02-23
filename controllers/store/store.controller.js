import ApiResponse from "../../helpers/ApiResponse";
import Store from "../../models/store/store.model";
import storeAddress from "../../models/storeAddress/storeAddress.model";
import storePayment from "../../models/storePayment/storePayment.model";
import RatingsController from "../../controllers/ratings/ratings.controller";
import StoreUser from "../../models/storeUser/storeUser.model";
import StoreItem from "../../models/storeItem/storeItem.modal";
import StoreCategory from "../../models/storeCategory/storeCategory.model";
import Report from "../../models/reports/report.model";
import Category from "../../models/category/category.model";
import ApiError from "../../helpers/ApiError";
import ApiSuccess from "../../helpers/ApiSuccess";
import Rating from "../../models/ratings/ratings.model";
import {
  checkExist,
  checkExistThenGet,
  isImgUrl,
} from "../../helpers/CheckMethods";
import {
  handleImg,
  checkValidations,
  checkNewValidations,
} from "../shared/shared.controller";
import { body } from "express-validator/check";
import { genratePassword } from "../../utils/password";
import User from "../../models/user/user.model";

var Distance = require("geo-distance");
const distanceKM = 50;
export default {
  async findAll(req, res, next) {
    try {
      let page = +req.query.page || 1,
        limit = +req.query.limit || 1000,
        { type, services, id, createdBy, search, isActive } = req.query;
      let query = { isDeleted: false };
      if (id) {
        query._id = id;
      }
      if (createdBy) {
        query.createdBy = parseInt(createdBy);
      }
      if (search) {
        let Regx = new RegExp("" + search, "i");
        query.$or = [{ name: { $regex: Regx } }, { arName: { $regex: Regx } }];
      }

      if (isActive && typeof JSON.parse(isActive) == "boolean") {
        query.isActive = JSON.parse(isActive);
      }

      // console.log({ isActive, query });

      // let stores = await Store.find(query)
      //   .sort({ displayOrder: 1 })
      //   .limit(limit)
      //   .skip((page - 1) * limit);
      console.log({query})
      let StoreData = await Store.aggregate([
        {
          $match: query,
        },
        {
          $lookup: {
            from: "orders",
            let: { id: "$_id" },
            pipeline: [
              {
                $match: {
                  isDeleted: false,
                  status: "DELIVERED",
                  $expr: { $eq: ["$storeID", "$$id"] },
                },
              },
              {
                $group: {
                  _id: "$storeID",
                  count: { $sum: 1 },
                },
              },
            ],
            as: "ordersCount",
          },
        },
        // {
        //   $unwind: "$ordersCount",
        // },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        { $sort: { displayOrder: 1 } },
        {
          $project: {
            adminCommisionType: 1,
            adminCommission: 1,
            adminEarn: 1,
            arName: 1,
            createdAt: 1,
            createdBy: 1,
            deliveryFees: 1,
            displayOrder: 1,
            img: 1,
            isActive: 1,
            isDeleted: 1,
            isDeliveryAfterHour: 1,
            isHide: 1,
            isPopular: 1,
            isShowInHomePage: 1,
            mimOrderPrice: 1,
            name: 1,
            deliveredOrder: "$ordersCount.count",
            paymentOption: 1,
            preperingTime: 1,
            restaurantType: 1,
            storeAddress: 1,
            storeType: 1,
            tax: 1,
            updatedAt: 1,
            vat: 1,
            _id: 1,
            id: "$_id",
          },
        },
      ]);

      const storeCount = await Store.count(query);
      const pageCount = Math.ceil(storeCount / limit);
      res.send(
        new ApiSuccess(true, 201, "store get successFully", {
          stores: StoreData,
          page,
          pageCount,
          limit,
          storeCount,
        })
      );
      // res.send(new ApiResponse(stores, page, pageCount, limit, storeCount, req));
    } catch (err) {
      next(err);
    }
  },
  async findSelection(req, res, next) {
    try {
      let query = { isDeleted: false };
      let categories = await Category.find(query).sort({ createdAt: -1 });
      res.send(categories);
    } catch (err) {
      next(err);
    }
  },

  validateCreated() {
    let validations = [
      body("name").not().isEmpty().withMessage("name is required"),
      body("arName").optional(),
      body("lat").optional(),
      body("long").optional(),
      body("isActive").optional(),
      body("deliveryCharge").optional(),
      body("address").optional(),
      body("adminCommisionType").optional(),
      body("adminCommission").optional(),
      body("tax").optional(),
      body("isDeliveryAfterHour").optional(),
      body("img")
        .optional()
        .custom((val) => isImgUrl(val))
        .withMessage("img should be a valid img"),
      body("createdBy").not().isEmpty().withMessage("createdBy is required"),
      body("storeType").optional(),
      body("mimOrderPrice").optional(),
      body("preperingTime").optional(),
      body("paymentOption").optional(),
      body("restaurantType").optional(),
      body("isShowInHomePage").optional(),
      body("isPopular").optional(),
      body("deliveryFees").optional(),
      body("vat").optional(),
      body("isHide").optional(),
    ];

    return validations;
  },

  async create(req, res, next) {
    try {
      let user = req.user;
      // if (user.type != 'ADMIN')
      //     return next(new ApiError(403, ('admin.auth')));

      const validatedBody = checkNewValidations(req);

      let findStoreAdmin = await User.find({
        email: req.body.email.toLowerCase(),
        createdBy: validatedBody.createdBy,
        isDeleted: false,
      });

      if (findStoreAdmin.length > 0) {
        return res.send(
          new ApiSuccess(false, 400, "Store admin email exits", {})
        );
      }
      let storeUser = [];
      if (req.body.storeUser) {
        storeUser = JSON.parse(req.body.storeUser);
      }
      let storeDriver = [];
      if (req.body.storeDriver) {
        storeDriver = JSON.parse(req.body.storeDriver);
      }

      for (let i = 0; i < storeUser.length; i++) {
        let findStoreAdmin = await User.find({
          email: storeUser[i].email.toLowerCase(),
          createdBy: validatedBody.createdBy,
          isDeleted: false,
        });

        if (findStoreAdmin.length > 0) {
          return res.send(
            new ApiSuccess(
              false,
              400,
              `${storeUser[i].email} user email exits`,
              {}
            )
          );
          break;
        }
      }

      for (let i = 0; i < storeDriver.length; i++) {
        let findStoreDriver = await User.find({
          email: storeDriver[i].email.toLowerCase(),
          createdBy: validatedBody.createdBy,
          isDeleted: false,
        });

        if (findStoreDriver.length > 0) {
          return res.send(
            new ApiSuccess(
              false,
              400,
              `${storeDriver[i].email} user email exits`,
              {}
            )
          );
          break;
        }
      }

      let image;
      if (req.file) {
        image = await handleImg(req);
      }
      // if(!req.body.lat){
      //     return next(new ApiError(400, ('invalid latitude')))
      // }
      // if(!req.body.long){
      //     return next(new ApiError(400, ('invalid logitude')))
      // }

      console.log(req.body.users);
      let createStore = await Store.create({
        ...validatedBody,
        preperingTime: JSON.parse(validatedBody.preperingTime),
        img: image,
      });

      let userData = {
        email: req.body.email,
        phone: req.body.phone,
        name: req.body.name,
        type: "STORE-ADMIN",
        store: createStore._id,
      };
      let password = await genratePassword(req.body.password);

      let createdUser = await User.create({
        ...userData,
        password,
        createdBy: validatedBody.createdBy,
      });

      // let report = await Report.create({...reports, user: user });
      // res.status(201).send(createStore);
      res.send(
        new ApiSuccess(true, 201, "store create successFully", createStore)
      );
    } catch (err) {
      console.log({ err });
      res.status(400).send(err);
    }
  },

  async findById(req, res, next) {
    try {
      let { storeId } = req.params;
      await checkExist(storeId, Store, { isDeleted: false });
      let store = await Store.findById(storeId);
      let findStoreAddress = await storeAddress.find({
        storeID: storeId,
        isDeleted: false,
      });
      let findStoreUser = await User.find({
        store: storeId,
        isDeleted: false,
        type: "STORE",
      });
      let findStoreAdmin = await User.findOne({
        store: storeId,
        isDeleted: false,
        type: "STORE-ADMIN",
      });
      let findStoreDriver = await User.find({
        store: storeId,
        isDeleted: false,
        type: "STORE-SALESMAN",
      });
      let findStoreCategory = await StoreCategory.find({
        storeID: storeId,
        isDeleted: false,
      }).populate([{ path: "categoryID", model: "category" }]);

      let storeRating = await Rating.aggregate([
        {
          $match: {
            ratingToWhom: "S",
            storeID: parseInt(storeId),
          },
        },
        {
          $group: {
            _id: "$storeID",
            avg_ratings: { $avg: "$ratings" },
          },
        },
      ]);

      // res.send(store);
      res.send(
        new ApiSuccess(true, 200, "store update successFully", {
          store,
          address: findStoreAddress,
          users: findStoreUser,
          driver: findStoreDriver,
          admin: findStoreAdmin,
          category: findStoreCategory,
          storeRating: storeRating,
        })
      );
    } catch (err) {
      // next(err);
      return res.send(err);
    }
  },

  async update(req, res, next) {
    try {
      let user = req.user;
      // if (user.type != 'ADMIN')
      //     return next(new ApiError(403, ('admin.auth')));

      let { storeId } = req.params;
      await checkExist(storeId, Store, { isDeleted: false });

      const validatedBody = checkNewValidations(req);

      let findStoreAdmin = await User.find({
        store: { $ne: storeId },
        email: req.body.email.toLowerCase(),
        createdBy: validatedBody.createdBy,
        isDeleted: false,
      });
      console.log({ findStoreAdmin });
      if (findStoreAdmin.length > 0) {
        return res.send(
          new ApiSuccess(false, 400, "Store admin email exits", {})
        );
      }
      let storeUser = [];
      if (req.body.storeUser) {
        storeUser = JSON.parse(req.body.storeUser);
      }
      for (let i = 0; i < storeUser.length; i++) {
        console.log(storeUser[i].email);
        if (storeUser[i].status === "a") {
          let findStoreUser = await User.find({
            email: storeUser[i].email.toLowerCase(),
            createdBy: validatedBody.createdBy,
            isDeleted: false,
          });
          console.log({ findStoreUser });
          if (findStoreUser.length > 0) {
            return res.send(
              new ApiSuccess(
                false,
                400,
                `${storeUser[i].email} user email exits`,
                {}
              )
            );
            break;
          }
        }
      }

      if (req.file) {
        let image = await handleImg(req, {
          attributeName: "img",
          isUpdate: true,
        });
        validatedBody.img = image;
      }

      let updateStore = await Store.findByIdAndUpdate(
        storeId,
        {
          ...validatedBody,
          preperingTime: JSON.parse(validatedBody.preperingTime),
        },
        { new: true }
      );

      // let userData = {
      //     email: req.body.email,
      //     phone: req.body.phone,
      //     name: req.body.name,
      //     type: 'STORE-ADMIN',
      //     store: createStore._id
      // }
      // let password =await genratePassword(req.body.password);

      let updateUser = await User.updateOne(
        {
          store: storeId,
          type: "STORE-ADMIN",
          email: req.body.email,
          isDeleted: false,
        },
        { name: req.body.name }
      );

      // let reports = {
      //     "action":"Update Store",
      // };
      // let report = await Report.create({...reports, user: user });
      // res.status(200).send(updateStore);
      res.send(
        new ApiSuccess(true, 201, "store update successFully", updateStore)
      );
    } catch (err) {
      // next(err);
      console.log({ err });
      res.status(400).send(err);
    }
  },

  async delete(req, res, next) {
    try {
      let user = req.user;
      if (user.type != "A") return next(new ApiError(403, "admin.auth"));

      let { storeId } = req.params;
      let store = await checkExistThenGet(storeId, Store, { isDeleted: false });

      await User.updateMany(
        { store: store.id },
        { isDeleted: true, token: "" }
      );
      await storeAddress.updateMany({ storeID: store.id }, { isDeleted: true });
      await StoreItem.updateMany({ storeID: store.id }, { isDeleted: true });
      store.isDeleted = true;
      await store.save();
      let reports = {
        action: "Delete Store",
      };
      let report = await Report.create({ ...reports, user: user });
      // res.status(204).send('delete success');
      res.send(new ApiSuccess(true, 204, "store delete success", store));
    } catch (err) {
      // next(err);
      console.log({ err });
      res.status(400).send(err);
    }
  },

  async storeUserAdd(req, res, next) {
    try {
      let user = req.user;
      // if (user.type != 'ADMIN')
      //     return next(new ApiError(403, ('admin.auth')));

      let { storeId } = req.params;
      if (req.body.userId.length === 0) {
        return next(new ApiError(400, "user id is required!"));
      }

      await checkExist(storeId, Store, { isDeleted: false });
      // const validatedBody = checkValidations(req);

      let findUser = await StoreUser.find({
        user: { $in: req.body.userId },
        store: storeId,
        isDeleted: false,
      }).select("user");
      console.log({ findUser });
      for (let i = 0; i < req.body.userId.length; i++) {
        for (let j = 0; j < findUser.length; j++) {
          if (findUser[j].user === req.body.userId[i]) {
            req.body.userId.splice(i, 1);
          }
        }
      }

      console.log(req.body.userId);

      let createData = [];
      for (let i = 0; i < req.body.userId.length; i++) {
        createData.push({ user: req.body.userId[i], store: storeId });
      }
      if (createData.length === 0) {
        return res.status(200).send(req.body.userId);
      }
      let storeUser = {};
      for (let i = 0; i < createData.length; i++) {
        storeUser = await StoreUser.create({
          user: createData[i].user,
          store: storeId,
        });
      }

      let reports = {
        action: "Store User Create",
      };
      let report = await Report.create({ ...reports, user: user });
      res.status(200).send(storeUser);
    } catch (err) {
      next(err);
    }
  },

  async findStoreUser(req, res, next) {
    try {
      let page = +req.query.page || 1,
        limit = +req.query.limit || 20;

      let { storeId } = req.params;
      let query = { isDeleted: false };
      console.log({ storeId });
      if (storeId) {
        // query.id = id
        query.store = storeId;
      }

      let storeUsers = await StoreUser.find(query)
        .populate([
          { path: "user", model: "user" },
          { path: "store", model: "store" },
        ])
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

      const storeCount = await StoreUser.count(query);
      const pageCount = Math.ceil(storeCount / limit);

      res.send(
        new ApiResponse(storeUsers, page, pageCount, limit, storeCount, req)
      );
    } catch (err) {
      next(err);
    }
  },

  async getStoreNear(req, res, next) {
    let { lat, long } = req.body;

    let query = { isDeleted: false, isActive: true };

    let stores = await Store.find(query)
      .sort({ displayOrder: 1 })
      .populate([{ path: "branchID", model: "store" }]);
    // console.log({stores})
    let storeData = [];
    stores.forEach((store) => {
      var orderLocation = {
        lat: store.lat,
        lon: store.long,
      };
      var userLocation = {
        lat: lat,
        lon: long,
      };
      var findDiston = Distance.between(userLocation, orderLocation);

      // console.log('findDiston' + findDiston.human_readable());
      if (findDiston <= Distance(distanceKM + " km")) {
        storeData.push(store);
      }
    });
    let storeid = [];
    for (let i = 0; i < storeData.length; i++) {
      storeid.push(storeData[i].id);
    }

    console.log({ storeid });
    let item = await StoreItem.aggregate([
      {
        $match: {
          isDeleted: false,
        },
      },
      {
        $group: {
          // Each `_id` must be unique, so if there are multiple
          // documents with the same age, MongoDB will increment `count`.
          _id: "$storeID",
          count: { $sum: 1 },
        },
      },
    ]);
    let uniqStore = [];
    for (let i = 0; i < storeData.length; i++) {
      for (let j = 0; j < item.length; j++) {
        if (item[j]._id === storeData[i]._id) {
          uniqStore.push(storeData[i]);
        }
      }
    }

    // console.log({result})
    let getbranch = [];
    for (let i = 0; i < uniqStore.length; i++) {
      if (uniqStore[i].branchID && !uniqStore[i].isDeleted) {
        getbranch.push(uniqStore[i].branchID);
        uniqStore.splice(i, 1);
        i--;
      }
    }
    console.log({ uniqStore });
    console.log({ getbranch });
    getbranch = [...new Set(getbranch)];
    let data = [...uniqStore, ...getbranch];
    console.log({ data });
    // res.send(data);
    res.send(new ApiResponse(data, 1, 1, 100, 100, req));
  },

  async getBranchStoreNear(req, res, next) {
    let { lat, long } = req.body;
    let { branchID } = req.params;
    let query = { isDeleted: false, isActive: true, branchID };

    let stores = await Store.find(query).sort({ displayOrder: 1 });

    let storeData = [];
    stores.forEach((store) => {
      var orderLocation = {
        lat: store.lat,
        lon: store.long,
      };
      var userLocation = {
        lat: lat,
        lon: long,
      };
      var findDiston = Distance.between(userLocation, orderLocation);

      // console.log('findDiston' + findDiston.human_readable());
      if (findDiston <= Distance(distanceKM + " km")) {
        storeData.push(store);
      }
    });

    let storeid = [];
    for (let i = 0; i < storeData.length; i++) {
      storeid.push(storeData[i].id);
    }

    console.log({ storeid });
    let item = await StoreItem.aggregate([
      {
        $match: {
          isDeleted: false,
        },
      },
      {
        $group: {
          // Each `_id` must be unique, so if there are multiple
          // documents with the same age, MongoDB will increment `count`.
          _id: "$storeID",
          count: { $sum: 1 },
        },
      },
    ]);
    let uniqStore = [];
    for (let i = 0; i < storeData.length; i++) {
      for (let j = 0; j < item.length; j++) {
        if (item[j]._id === storeData[i]._id) {
          uniqStore.push(storeData[i]);
        }
      }
    }

    res.send(new ApiResponse(uniqStore, 1, 1, 100, 100, req));
  },

  async updateAdminEarn(req, res, next) {
    try {
      let user = req.user;
      // if (user.type != 'ADMIN')
      //     return next(new ApiError(403, ('admin.auth')));
      // if(!req.body.adminEarn){
      //     return next(new ApiError(400, 'Earn is required'));
      // }
      let { storeId } = req.params;
      // console.log({storeId})
      await checkExist(storeId, Store, { isDeleted: false });

      // const validatedBody = checkValidations(req);

      let updatedCategory = await Store.findByIdAndUpdate(
        storeId,
        {
          adminEarn: req.body.adminEarn,
        },
        { new: true }
      );
      // , { new: true }
      let reports = {
        action: "Update Store",
      };

      let report = await Report.create({ ...reports, user: user });
      res.status(200).send(updatedCategory);
    } catch (err) {
      next(err);
    }
  },

  async updateStoreOrder(req, res, next) {
    let { store } = req.body;

    for (let i = 0; i < store.length; i++) {
      await Store.findByIdAndUpdate(
        store[i].id,
        {
          displayOrder: i,
        },
        { new: true }
      );
    }

    res.status(200).send("");
  },

  validateStoreAddressCreated() {
    let validations = [
      body("name").not().isEmpty().withMessage("name is required"),
      body("lat").optional(),
      body("arName").optional(),
      body("long").optional(),
      body("landmark").optional(),
      body("arLandmark").optional(),
      body("arAddress").optional(),
      body("isActive").optional(),
      body("storeID").not().isEmpty().withMessage("storeID is required"),
      body("address").not().isEmpty().withMessage("address is required"),
    ];

    return validations;
  },

  async createAddress(req, res, next) {
    try {
      let user = req.user;
      // if (user.type != 'ADMIN')
      //     return next(new ApiError(403, ('admin.auth')));

      const validatedBody = checkNewValidations(req);
      let image;
      if (req.file) {
        image = await handleImg(req);
      }
      // if(!req.body.lat){
      //     return next(new ApiError(400, ('invalid latitude')))
      // }
      // if(!req.body.long){
      //     return next(new ApiError(400, ('invalid logitude')))
      // }

      console.log(req.body.users);
      let createStoreAddress = await storeAddress.create({
        ...validatedBody,
        img: image,
      });
      let store = await Store.findById(validatedBody.storeID);

      store.storeAddress = [...store.storeAddress, createStoreAddress._id];
      console.log({ store });
      store.save();

      let reports = {
        action: "Create Store",
      };
      // let report = await Report.create({...reports, user: user });
      // res.status(201).send(createStoreAddress);
      res.send(
        new ApiSuccess(
          true,
          201,
          "store address create success",
          createStoreAddress
        )
      );
    } catch (err) {
      // next(err);
      res.status(400).send(err);
    }
  },

  async updateAddress(req, res, next) {
    try {
      let user = req.user;
      // if (user.type != 'ADMIN')
      //     return next(new ApiError(403, ('admin.auth')));
      let { id } = req.params;

      await checkExist(id, storeAddress, { isDeleted: false });

      const validatedBody = checkNewValidations(req);
      let image;
      if (req.file) {
        image = await handleImg(req);
      }

      // if(!req.body.lat){
      //     return next(new ApiError(400, ('invalid latitude')))
      // }
      // if(!req.body.long){
      //     return next(new ApiError(400, ('invalid logitude')))
      // }

      console.log(req.body.users);
      if (req.file) {
        let image = await handleImg(req, {
          attributeName: "img",
          isUpdate: true,
        });
        validatedBody.img = image;
      }

      let updatedstoreaddress = await storeAddress.findByIdAndUpdate(
        id,
        {
          ...validatedBody,
        },
        { new: true }
      );

      let reports = {
        action: "Create Store",
      };
      // let report = await Report.create({...reports, user: user });

      res.send(
        new ApiSuccess(
          true,
          201,
          "store address update success",
          updatedstoreaddress
        )
      );
    } catch (err) {
      // next(err);
      res.status(400).send(err);
    }
  },

  async getAddress(req, res, next) {
    try {
      let page = +req.query.page || 1,
        limit = +req.query.limit || 1000,
        { id, storeID } = req.query;
      let query = { isDeleted: false };
      if (id) {
        query.id = id;
      }

      if (storeID) {
        query.storeID = storeID;
      }

      let stores = await storeAddress
        .find(query)
        .sort({ displayOrder: 1 })
        .limit(limit)
        .skip((page - 1) * limit);

      const storeAddressCount = await storeAddress.count(query);
      const pageCount = Math.ceil(storeAddressCount / limit);
      res.send(
        new ApiSuccess(true, 201, "store get successFully", {
          stores,
          page,
          pageCount,
          limit,
          storeAddressCount,
        })
      );
      // res.send(new ApiResponse(stores, page, pageCount, limit, storeCount, req));
    } catch (err) {
      next(err);
    }
  },

  async createStoreCategory(req, res, next) {
    // let user = req.user;
    // if (user.type != 'ADMIN')
    //     return next(new ApiError(403, ('admin.auth')));

    let { storeCategory } = req.body;
    if (storeCategory.length === 0) {
      res.send(new ApiSuccess(false, 400, "store category required", {}));
    }
    let storeID = [];
    for (let i = 0; i < storeCategory.length; i++) {
      // storeID.push(storeCategory[i].storeID);
      await StoreCategory.updateMany(
        { storeID: storeCategory[i].storeID, isDeleted: false },
        { isDeleted: true }
      );
    }

    let storeCategoryData = [];
    for (let i = 0; i < storeCategory.length; i++) {
      // let category = new storeCategory
      // storeCategoryData.push({
      //     storeID: storeCategory[i].storeID,
      //     categoryID: storeCategory[i].categoryID
      // })
      await StoreCategory.create({
        storeID: storeCategory[i].storeID,
        categoryID: storeCategory[i].categoryID,
      });
    }
    // let createStoreCAtegory = await StoreCategory.insertMany(storeCategoryData);

    res.send(
      new ApiSuccess(
        true,
        201,
        "store catefory has been create successfuly",
        {}
      )
    );
  },
  async getStoreCategory(req, res, next) {
    console.log("Inside fhbghb");
    try {
      let { categoryID } = req.params;
      let { createdBy, lat, long } = req.query;

      if (!lat) {
        res.send(new ApiSuccess(false, 400, "Latitude is required", {}));
      }

      if (!long) {
        res.send(new ApiSuccess(false, 400, "Logitude is required", {}));
      }

      await checkExist(categoryID, Category, { isDeleted: false });

      let findStore = await StoreCategory.find({ categoryID: categoryID });

      if (!findStore.length === 0) {
        res.send(new ApiSuccess(true, 200, "No Store Found", {}));
      }

      let storeId = [];
      for (let i = 0; i < findStore.length; i++) {
        storeId.push(findStore[i].storeID);
      }

      let findStoreAddress = await storeAddress
        .find({ storeID: { $in: storeId }, isDeleted: false })
        .populate([{ path: "storeID", model: "store" }]);

      // let findStoreAddress = await storeAddress.aggregate([
      //   {
      //       $match: {
      //           isDeleted : false,
      //           storeID: parseInt(storeId),
      //           // createdBy: order.createdBy
      //       }
      //   },
      //   {
      //       $lookup:{
      //           from: 'stores',
      //           // localField: 'storeID',
      //           // foreignField: '_id',
      //           let: {id: "$storeID"},
      //           pipeline: [{
      //               $match:{
      //                   isActive: true,
      //                   isDeleted: false,
      //                   $expr: {$eq: ["$_id", "$$id"]}
      //               },
      //           }],
      //           as: 'storeID'
      //       }
      //   }
      // ]);

      let storeData = [];
      let findAverageRatingsStoreAdressIdArray = [];

      findStoreAddress.forEach((store) => {
        console.log({ store });
        var orderLocation = {
          lat: store.lat,
          lon: store.long,
        };
        var userLocation = {
          lat: lat,
          lon: long,
        };
        var findDiston = Distance.between(userLocation, orderLocation);

        // console.log('findDiston' + findDiston.human_readable());
        if (findDiston <= Distance(distanceKM + " km")) {
          if (
            store &&
            !findAverageRatingsStoreAdressIdArray.includes(store.id)
          ) {
            findAverageRatingsStoreAdressIdArray.push(parseInt(store.id));
          }

          // storeData.push(store)
          let storeAddressData = { ...store };
          // console.log({storeAddressData})
          storeAddressData._doc.id = storeAddressData._doc._id;
          // storeAddressData.id = storeAddressData._id;
          delete storeAddressData._doc._id;
          if (!storeAddressData._doc.storeID.isHide) {
            storeData = [...storeData, { ...storeAddressData._doc }];
          }
        }
      });

      //code for average ratings
      let ratings = await RatingsController.calculateAverageRating(
        "SA",
        findAverageRatingsStoreAdressIdArray
      );

      let storesDataWithAverageRatings = [];
      let popularStore = [];
      storeData.forEach((item) => {
        let average_rating = 0;
        if (req.get("lang") === "ar") {
          item.name = item.arName;
          item.landmark = item.arLandmark;
          item.address = item.arAddress;
          if (item.storeID) {
            item.storeID.name = item.storeID.arName;
          }
        }
        for (let i = 0; i < ratings.length; i++) {
          if (ratings[i]._id == item.id) {
            average_rating = ratings[i].avg_ratings;
          }
        }
        console.log({ average_rating });
        item.average_rating = average_rating;
        if (item.storeID && !item.storeID.isHide) {
          storesDataWithAverageRatings.push({ ...item });
        }

        // isPopular
        if (item.storeID && item.storeID.isPopular && !item.isHide) {
          popularStore.push({ ...item });
        }
      });

      res.send(
        new ApiSuccess(true, 200, "Store", {
          store: storesDataWithAverageRatings,
          popular: popularStore,
        })
      );
    } catch (err) {
      console.log(err);
      res.send(err);
    }
  },

  async createMltiAddress(req, res, next) {
    let { StoreAddress } = req.body;
    if (StoreAddress.length === 0) {
      res.send(new ApiSuccess(false, 400, "store address required", {}));
    }

    let addStore = [];
    for (let i = 0; i < StoreAddress.length; i++) {
      console.log(StoreAddress[i]);
      if (StoreAddress[i].status === "a") {
        // addStore.push(StoreAddress[i]);
        await storeAddress.create({
          ...StoreAddress[i],
          storeLocation: {
            type: "Point",
            coordinates: [
              parseFloat(StoreAddress[i].long),
              parseFloat(StoreAddress[i].lat),
            ],
          },
        });
      }

      if (StoreAddress[i].status === "u") {
        let updateData = {
          name: StoreAddress[i].name,
          arName: StoreAddress[i].arName,
          address: StoreAddress[i].address,
          landmark: StoreAddress[i].landmark,
          arAddress: StoreAddress[i].arAddress,
          arLandmark: StoreAddress[i].arLandmark,
          lat: StoreAddress[i].lat,
          long: StoreAddress[i].long,
          storeLocation: {
            type: "Point",
            coordinates: [
              parseFloat(StoreAddress[i].long),
              parseFloat(StoreAddress[i].lat),
            ],
          },
        };

        let updateAddress = await storeAddress.updateOne(
          { _id: StoreAddress[i].id, isDeleted: false },
          updateData
        );
      }
      if (StoreAddress[i].status === "d") {
        let updateAddress = await storeAddress.updateOne(
          { _id: StoreAddress[i].id, isDeleted: false },
          { isDeleted: true }
        );
      }
    }
    // let createStoreAddress = await storeAddress.insertMany(addStore,{"oneOperation": true});

    res.send(
      new ApiSuccess(
        true,
        200,
        "store address has been created successfuly",
        {}
      )
    );
  },

  async checkDeliveryAddressInZone(req, res, next) {
    try {
      if (!req.body.store) {
        res.send(new ApiSuccess(false, 400, "store address is required", {}));
      }

      await checkExist(req.body.storeAddressId, storeAddress, {
        isDeleted: false,
      });

      return res.send(new ApiSuccess(true, 200, "address is in zone", {}));
    } catch (err) {
      res.send(err);
    }
  },

  async createMultipleStoreUser(req, res, next) {
    try {
      let { createdBy } = req.query;
      let { storeId } = req.params;
      if (!storeId) {
        return res.send(new ApiSuccess(false, 400, "storeId is required", {}));
      }
      if (!createdBy) {
        return res.send(
          new ApiSuccess(false, 400, "createdBy is required", {})
        );
      }
      if (!req.body.storeUser) {
        return res.send(
          new ApiSuccess(false, 400, "storeUser is required", {})
        );
      }

      for (let i = 0; i < req.body.storeUser.length; i++) {
        if (req.body.storeUser[i].status === "a") {
          let findStoreAdmin = await User.find({
            email: req.body.storeUser[i].email.toLowerCase(),
            createdBy: createdBy,
            isDeleted: false,
          });

          if (findStoreAdmin.length > 0) {
            return res.send(
              new ApiSuccess(
                false,
                400,
                `${req.body.storeUser[i].email} user email exits`,
                {}
              )
            );
            break;
          }
        }
      }

      await checkExist(storeId, Store, { isDeleted: false });

      for (let i = 0; i < req.body.storeUser.length; i++) {
        console.log(req.body.storeUser[i]);
        if (req.body.storeUser[i].status === "a") {
          let userData = {
            email: req.body.storeUser[i].email.toLowerCase(),
            phone: req.body.storeUser[i].phone,
            username: req.body.storeUser[i].name,
            type: "STORE",
            store: storeId,
          };

          let password = await genratePassword(req.body.storeUser[i].password);

          await User.create({
            ...userData,
            password,
            createdBy: createdBy,
          });
        }

        if (req.body.storeUser[i].status === "u") {
          let userData = {
            // email: req.body.storeUser[i].email,
            phone: req.body.storeUser[i].phone,
            username: req.body.storeUser[i].name,
            // type: 'STORE',
            // store: storeId
          };
          if (req.body.storeUser[i].isUpdatePassword) {
            let password = await genratePassword(
              req.body.storeUser[i].password
            );
            userData["password"] = password;
          }

          console.log({ userData });
          console.log(req.body.storeUser[i].id);
          await User.updateOne({ _id: req.body.storeUser[i].id }, userData);
        }

        if (req.body.storeUser[i].status === "d") {
          await User.updateOne(
            { _id: req.body.storeUser[i].id, isDeleted: false },
            { isDeleted: true, token: "" }
          );
        }
      }

      res.send(new ApiSuccess(true, 200, "create store user successfully", {}));
    } catch (err) {
      console.log({ err });
      res.send(err);
    }
  },
  async createMultipleDriverUser(req, res, next) {
    try {
      let { createdBy } = req.query;
      let { storeId } = req.params;
      if (!storeId) {
        return res.send(new ApiSuccess(false, 400, "storeId is required", {}));
      }
      if (!createdBy) {
        return res.send(
          new ApiSuccess(false, 400, "createdBy is required", {})
        );
      }
      if (!req.body.storeDriver) {
        return res.send(
          new ApiSuccess(false, 400, "storeDriver is required", {})
        );
      }

      for (let i = 0; i < req.body.storeDriver.length; i++) {
        if (req.body.storeDriver[i].status === "a") {
          let findStoreAdmin = await User.find({
            email: req.body.storeDriver[i].email.toLowerCase(),
            createdBy: createdBy,
            isDeleted: false,
          });

          if (findStoreAdmin.length > 0) {
            return res.send(
              new ApiSuccess(
                false,
                400,
                `${req.body.storeDriver[i].email} user email exits`,
                {}
              )
            );
            break;
          }
        }
      }

      await checkExist(storeId, Store, { isDeleted: false });

      for (let i = 0; i < req.body.storeDriver.length; i++) {
        console.log(req.body.storeDriver[i]);
        if (req.body.storeDriver[i].status === "a") {
          let userData = {
            email: req.body.storeDriver[i].email.toLowerCase(),
            phone: req.body.storeDriver[i].phone,
            username: req.body.storeDriver[i].name,
            type: "STORE-SALESMAN",
            store: storeId,
            active: true,
          };

          let password = await genratePassword(
            req.body.storeDriver[i].password
          );

          await User.create({
            ...userData,
            password,
            createdBy: createdBy,
          });
        }

        if (req.body.storeDriver[i].status === "u") {
          let userData = {
            // email: req.body.storeDriver[i].email,
            phone: req.body.storeDriver[i].phone,
            username: req.body.storeDriver[i].name,
            // type: 'STORE',
            // store: storeId
          };
          if (req.body.storeDriver[i].isUpdatePassword) {
            let password = await genratePassword(
              req.body.storeDriver[i].password
            );
            userData["password"] = password;
          }

          console.log({ userData });
          console.log(req.body.storeDriver[i].id);
          await User.updateOne({ _id: req.body.storeDriver[i].id }, userData);
        }

        if (req.body.storeDriver[i].status === "d") {
          await User.updateOne(
            { _id: req.body.storeDriver[i].id, isDeleted: false },
            { isDeleted: true, token: "" }
          );
        }
      }

      res.send(new ApiSuccess(true, 200, "create store user successfully", {}));
    } catch (err) {
      console.log({ err });
      res.send(err);
    }
  },

  async storeUserSelectAddress(req, res, next) {
    try {
      if (!req.body.id) {
        return res.send(new ApiSuccess(false, 400, "id required", {}));
      }
      if (!req.body.storeAddress) {
        return res.send(
          new ApiSuccess(false, 400, "storeAddress required", {})
        );
      }
      let user = await checkExistThenGet(req.body.id, User);

      user.storeAddress = req.body.storeAddress;
      await user.save();

      return res.send(new ApiSuccess(true, 200, "Update User Info", user));
    } catch (err) {
      console.log({ err });
      res.send(err);
    }
  },

  async searchStore(req, res, next) {
    if (!req.body.lat) {
      return res.send(new ApiSuccess(false, 400, "lat is required", {}));
    }
    if (!req.body.long) {
      return res.send(new ApiSuccess(false, 400, "long is required", {}));
    }

    let query = {
      
    };

    if (req.body.search) {
      // query['$text'] = {
      //   '$search': req.body.search
      // }
      query.$or = [
        { address: { $regex: new RegExp("" + req.body.search, "i") } },
        { name: { $regex: new RegExp("" + req.body.search, "i") } },
        { landmark: { $regex: new RegExp("" + req.body.search, "i") } },
        { arAddress: { $regex: new RegExp("" + req.body.search, "i") } },
        { arName: { $regex: new RegExp("" + req.body.search, "i") } },
        { arLandmark: { $regex: new RegExp("" + req.body.search, "i") } },
      ];
    }
    // query['isDeleted'] = false
    console.log({query})
    let findQuery = [
     
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(req.body.long), parseFloat(req.body.lat)],
          },
          key: "storeLocation",
          distanceField: "dist.calculated",
          maxDistance: distanceKM * 1000,
          minDistance: 0,
          // includeLocs: "dist.location",
          spherical: true,
          query: query,
        },
      },
      // {
      //   $match: query
      // },
      {
        $lookup: {
          from: "stores",
          localField: "storeID",
          foreignField: "_id",
          as: "storeID",
        },
      },
      { $unwind: "$storeID" },
      // {
      //   $addFields: {
      //     id: "$_id",
      //     "storeID.id": "$storeID._id",
      //   },
      // },
    ];

    if (req.get("lang") === "ar") {
      findQuery.push({
        $project: {
          _id: 1,
          storeLocation: 1,
          isActive: 1,
          isDeleted: 1,
          storeID: {
            _id: 1,
            displayOrder: 1,
            isActive: 1,
            isDeleted: 1,
            adminCommission: 1,
            adminEarn: 1,
            storeAddress: 1,
            tax: 1,
            vat: 1,
            isDeliveryAfterHour: 1,
            isShowInHomePage: 1,
            isPopular: 1,
            name: "$storeID.arName",
            adminCommisionType: 1,
            createdBy: 1,
            storeType: 1,
            mimOrderPrice: 1,
            preperingTime: 1,
            paymentOption: 1,
            restaurantType: 1,
            img: 1,
            arName: 1,
            id: "$storeID._id",
          },
          name: "$arName",
          arName: 1,
          address: "$arAddress",
          landmark: "$arLandmark",
          arAddress: 1,
          arLandmark: 1,
          lat: 1,
          long: 1,
          dist: 1,
          id: "$_id",
        },
      });
    } else {
      findQuery.push({
        $project: {
          _id: 1,
          storeLocation: 1,
          isActive: 1,
          isDeleted: 1,
          storeID: {
            _id: 1,
            displayOrder: 1,
            isActive: 1,
            isDeleted: 1,
            adminCommission: 1,
            adminEarn: 1,
            storeAddress: 1,
            tax: 1,
            vat: 1,
            isDeliveryAfterHour: 1,
            isShowInHomePage: 1,
            isPopular: 1,
            name: 1,
            adminCommisionType: 1,
            createdBy: 1,
            storeType: 1,
            mimOrderPrice: 1,
            preperingTime: 1,
            paymentOption: 1,
            restaurantType: 1,
            img: 1,
            arName: 1,
            id: "$storeID._id",
          },
          name: 1,
          arName: 1,
          address: 1,
          landmark: 1,
          arAddress: 1,
          arLandmark: 1,
          lat: 1,
          long: 1,
          dist: 1,
          id: "$_id"
        },
      });
    }
    let nearByStoreAddress = await storeAddress.aggregate(findQuery);

    let findAverageRatingsStoreAdressIdArray = nearByStoreAddress.map(
      (item) => item.id
    );
    //code for average ratings
    let ratings = await RatingsController.calculateAverageRating(
      "SA",
      findAverageRatingsStoreAdressIdArray
    );

    let storesDataWithAverageRatings = [];

    nearByStoreAddress.forEach((item) => {
      let average_rating = 0;

      for (let i = 0; i < ratings.length; i++) {
        // console.log('Inside')
        if (ratings[i]._id == item.id) {
          average_rating = ratings[i].avg_ratings;
        }
      }
      // console.log({average_rating})
      item.average_rating = average_rating;
      if (!item.storeID.isHide && !item.storeID.isHide) {
        storesDataWithAverageRatings.push({ ...item });
      }
    });

    res.send(
      new ApiSuccess(true, 200, "near by stores", storesDataWithAverageRatings)
    );
  },

  async addStorePayment(req, res, next) {
    if (req.body.paymentType === "online") {
      req.body.img = await handleImg(req);
    }
    await storePayment.create(req.body);
    res.send(
      new ApiSuccess(true, 201, "store payment has been added successfuly", {})
    );
  },

  async getStorePayments(req, res, next) {
    const { storeId } = req.body;
    const payment = await storePayment.find({
      storeId: storeId,
      driverType: "SALES-MAN",
    });
    res.status(200).send(payment);
  },

  async updateStorePayments(req, res, next) {
    const storePaymentId = req.body.storePaymentId;
    delete req.body.storePaymentId;
    let resp = await storePayment.updateOne({ _id: storePaymentId }, req.body);
    res.send(
      new ApiSuccess(
        true,
        201,
        "store payment has been updated successfuly",
        {}
      )
    );
  },

  async getStorePaymentsDataById(req, res, next) {
    const { storePaymentId } = req.params;
    const data = await storePayment.findOne(
      { _id: storePaymentId },
      {
        createdAt: 0,
        updatedAt: 0,
      }
    );
    res.status(200).send(data);
  },
};

// import ApiResponse from "../../helpers/ApiResponse";
import Category from "../../models/category/category.model";
import RatingsController from "../../controllers/ratings/ratings.controller";
import Report from "../../models/reports/report.model";
import ApiError from "../../helpers/ApiError";
import ApiSuccess from "../../helpers/ApiSuccess";
import {
  checkExist,
  checkExistThenGet,
  isImgUrl,
} from "../../helpers/CheckMethods";
import { handleImg, checkNewValidations } from "../shared/shared.controller";
import { body } from "express-validator/check";
import storeAddress from "../../models/storeAddress/storeAddress.model";
import Store from "../../models/store/store.model";

let Distance = require("geo-distance");
const distanceKM = 50;

export default {
  async findAll(req, res, next) {
    try {
      let page = +req.query.page || 1,
        limit = +req.query.limit || 20,
        { type, services, createdBy, search } = req.query;
      let query = { isDeleted: false, categoryID: null };
      if (createdBy) {
        query.createdBy = createdBy;
      }
      if (type) {
        query.type = type;
      }
      if (services) {
        query.services = services;
      }

      if (search) {
        let Regx = new RegExp("" + search, "i");
        query.$or = [{ name: { $regex: Regx } }, { arName: { $regex: Regx } }];
      }

      let categories = await Category.find(query)
        .sort({ displayOrder: 1 })
        .limit(limit)
        .skip((page - 1) * limit);

      const categoriesCount = await Category.count(query);
      const pageCount = Math.ceil(categoriesCount / limit);

      res.send(
        new ApiSuccess(true, 200, "category find SuccessFully", {
          categories,
          page,
          pageCount,
          limit,
          categoriesCount,
        })
      );
      // res.send(new ApiResponse(categories, page, pageCount, limit, categoriesCount, req));
    } catch (err) {
      next(err);
    }
  },

  async getAllCategory(req, res, next) {
    try {
      let page = +req.query.page || 1,
        limit = +req.query.limit || 20,
        { type, services, createdBy, lat, long } = req.query;
      if (!lat) {
        res.send(new ApiSuccess(false, 400, "Latitude is required", {}));
      }
      if (!long) {
        res.send(new ApiSuccess(false, 400, "Logitude is required", {}));
      }
      let query = { isDeleted: false, categoryID: null };
      if (createdBy) {
        query.createdBy = createdBy;
      }
      if (type) {
        query.type = type;
      }
      if (services) {
        query.services = services;
      }
      let categories = await Category.find(query).sort({ displayOrder: 1 });
      // .limit(limit)
      // .skip((page - 1) * limit);

      let findSubCategoryQuery = {
        isDeleted: false,
        categoryID: { $ne: null },
      };
      if (createdBy) {
        findSubCategoryQuery.createdBy = createdBy;
      }
      let subCategories = await Category.find(findSubCategoryQuery).sort({
        displayOrder: 1,
      });
      // .limit(limit)
      // .skip((page - 1) * limit);
      let newCategory = [];
      for (let i = 0; i < categories.length; i++) {
        newCategory.push({ ...categories[i] });
      }
      let newCategoryData = [];
      for (let i = 0; i < newCategory.length; i++) {
        newCategory[i]._doc.subcategory = [];
        newCategory[i]._doc["isStore"] = false;
        newCategory[i]._doc.id = newCategory[i]._doc._id;

        for (let j = 0; j < subCategories.length; j++) {
          if (subCategories[j].categoryID === newCategory[i]._doc._id) {
            if (req.get("lang") === "ar") {
              subCategories[j].name = subCategories[j].arName;
            }
            newCategory[i]._doc.subcategory.push(subCategories[j]);
          }
        }
        if (req.get("lang") === "ar") {
          newCategory[i]._doc.name = newCategory[i]._doc.arName;
        }
        delete newCategory[i]._doc._id;
        newCategoryData.push(newCategory[i]._doc);
      }

      let findStoreDisplayHome = await Store.find({
        isShowInHomePage: true,
        isDeleted: false,
        isHide: false,
      });
      console.log(findStoreDisplayHome);
      let storeIDs = [];
      for (let i = 0; i < findStoreDisplayHome.length; i++) {
        storeIDs.push(findStoreDisplayHome[i].id);
      }
      console.log({ storeIDs });
      let stores = await storeAddress
        .find({ isDeleted: false, storeID: { $in: storeIDs } })
        .populate([{ path: "storeID", model: "store" }])
        .sort({ displayOrder: 1 });
      // .limit(limit)
      // .skip((page - 1) * limit);

      //code for the get the avarage ratings count for store
      let findAverageRatingsStoreAdressIdArray = [];

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
          //code for check
          if (
            store &&
            !findAverageRatingsStoreAdressIdArray.includes(store.id)
          ) {
            findAverageRatingsStoreAdressIdArray.push(parseInt(store.id));
          }

          // storeData.push(store)
          let storeAddressData = { ...store };
          storeAddressData._doc.id = storeAddressData._doc._id;
          delete storeAddressData._doc._id;
          if (req.get("lang") === "ar") {
            storeAddressData._doc.name = storeAddressData._doc.arName;
            storeAddressData._doc.address = storeAddressData._doc.arAddress;
            storeAddressData._doc.landmark = storeAddressData._doc.arLandmark;
            if (storeAddressData._doc.storeID) {
              storeAddressData._doc.storeID.name =
                storeAddressData._doc.storeID.arName;
            }
          }

          if (!storeAddressData._doc.storeID.isHide && !storeAddressData._doc.storeID.isDeleted) {
            storeData = [
              ...storeData,
              { ...storeAddressData._doc, isStore: true },
            ];
          }
        }
      });

      const categoriesCount = await Category.count(query);
      const pageCount = Math.ceil(categoriesCount / limit);

      //code for average ratings
      let ratings = await RatingsController.calculateAverageRating(
        "SA",
        findAverageRatingsStoreAdressIdArray
      );

      //code for assign the average ratings to the store
      let storesDataWithAverageRatings = [];
      storeData.forEach((item) => {
        let average_rating = 0;

        for (let i = 0; i < ratings.length; i++) {
          console.log("Inside");
          if (ratings[i]._id == item.id) {
            average_rating = ratings[i].avg_ratings;
          }
        }
        console.log({ average_rating });
        item.average_rating = average_rating;
        storesDataWithAverageRatings.push({ ...item });
      });

      res.send(
        new ApiSuccess(true, 200, "category find SuccessFully", {
          categories: [...newCategoryData, ...storesDataWithAverageRatings],
          page,
          pageCount,
          limit,
          categoriesCount,
        })
      );
      // res.send(new ApiResponse(categories, page, pageCount, limit, categoriesCount, req));
    } catch (err) {
      next(err);
    }
  },

  async findsubcategoryAll(req, res, next) {
    try {
      let page = +req.query.page || 1,
        limit = +req.query.limit || 20,
        { type, services, createdBy, categoryID, search } = req.query;
      let query = { isDeleted: false, categoryID: { $ne: null } };
      if (createdBy) {
        query.createdBy = createdBy;
      }
      if (categoryID) {
        query.categoryID = categoryID;
      }
      if (type) {
        query.type = type;
      }
      if (services) {
        query.services = services;
      }
      if (search) {
        let Regx = new RegExp("" + search, "i");
        query.$or = [{ name: { $regex: Regx } }, { arName: { $regex: Regx } }];
      }
      let categories = await Category.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

      const categoriesCount = await Category.count(query);
      const pageCount = Math.ceil(categoriesCount / limit);

      res.send(
        new ApiSuccess(true, 200, "category find SuccessFully", {
          categories,
          page,
          pageCount,
          limit,
          categoriesCount,
        })
      );
      // res.send(new ApiResponse(categories, page, pageCount, limit, categoriesCount, req));
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

  validateBody(isUpdate = false) {
    let validations = [
      body("name")
        .not()
        .isEmpty()
        .withMessage("name is required")
        .custom(async (val, { req }) => {
          let query = {
            name: val,
            isDeleted: false,
            createdBy: req.body.createdBy,
          };

          if (isUpdate) query._id = { $ne: req.params.categoryId };

          let category = await Category.findOne(query).lean();

          if (category) throw new Error("category duplicated name");

          return true;
        }),
      body("arName")
        .not()
        .isEmpty()
        .withMessage("arName is required")
        .custom(async (val, { req }) => {
          let query = {
            arName: val,
            isDeleted: false,
            createdBy: req.body.createdBy,
          };

          if (isUpdate) query._id = { $ne: req.params.categoryId };

          let category = await Category.findOne(query).lean();
          if (category) throw new Error("arName duplicated name");

          return true;
        }),
      body("categoryID").optional(),
      body("createdBy").optional(),
      body("isActive").optional(),
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

  async create(req, res, next) {
    try {
      // let user = req.user;
      // if (user.type != 'ADMIN')
      //     return next(new ApiError(403, ('admin.auth')));

      const validatedBody = checkNewValidations(req);

      let image = await handleImg(req);
      console.log({ validatedBody });
      let createdCategory = await Category.create({
        ...validatedBody,
        logo: image,
      });

      let reports = {
        action: "Create Category",
      };
      // let report = await Report.create({...reports, user: user });
      res.send(
        new ApiSuccess(
          true,
          200,
          "category Create SuccessFully",
          createdCategory
        )
      );
    } catch (err) {
      // next(err);
      res.status(400).send(err);
    }
  },

  async findById(req, res, next) {
    try {
      let { categoryId } = req.params;
      await checkExist(categoryId, Category, { isDeleted: false });
      let category = await Category.findById(categoryId);
      res.send(category);
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      // let user = req.user;
      // if (user.type != 'ADMIN')
      //     return next(new ApiError(403, ('admin.auth')));

      let { categoryId } = req.params;
      await checkExist(categoryId, Category, {
        isDeleted: false,
        createdBy: req.body.createdBy,
      });

      const validatedBody = checkNewValidations(req);

      if (req.file) {
        let image = await handleImg(req, {
          attributeName: "img",
          isUpdate: true,
        });
        validatedBody.logo = image;
      }
      let updatedCategory = await Category.findByIdAndUpdate(
        categoryId,
        {
          ...validatedBody,
        },
        { new: true }
      );
      let reports = {
        action: "Update Category",
      };
      // let report = await Report.create({...reports, user: user });

      res.send(
        new ApiSuccess(
          true,
          200,
          "Category update SuccessFully",
          updatedCategory
        )
      );
    } catch (err) {
      res.status(400).send(err);
    }
  },

  async service(req, res, next) {
    try {
      let user = req.user;
      if (user.type != "ADMIN") return next(new ApiError(403, "admin.auth"));

      let { categoryId } = req.params;
      let category = await checkExistThenGet(categoryId, Category, {
        isDeleted: false,
      });
      category.services = true;
      await category.save();
      let reports = {
        action: " Category became sarvices",
      };
      let report = await Report.create({ ...reports, user: user });
      res.status(204).send(category);
    } catch (err) {
      next(err);
    }
  },

  async unservice(req, res, next) {
    try {
      let user = req.user;
      if (user.type != "ADMIN") return next(new ApiError(403, "admin.auth"));

      let { categoryId } = req.params;
      let category = await checkExistThenGet(categoryId, Category, {
        isDeleted: false,
      });
      category.services = false;
      await category.save();
      res.status(204).send(category);
    } catch (err) {
      next(err);
    }
  },

  async delete(req, res, next) {
    try {
      // let user = req.user;
      // if (user.type != 'ADMIN')
      //     return next(new ApiError(403, ('admin.auth')));

      let { categoryId } = req.params;
      let category = await checkExistThenGet(categoryId, Category, {
        isDeleted: false,
      });
      category.isDeleted = true;
      await category.save();
      let reports = {
        action: "Delete Category",
      };
      // let report = await Report.create({...reports, user: user });
      // res.status(204).send('delete success');
      res.send(new ApiSuccess(true, 200, "Category delete SuccessFully", {}));
    } catch (err) {
      next(err);
    }
  },

  async createSubCategory(req, res, next) {
    try {
      // let user = req.user;
      // if (user.type != 'ADMIN')
      //     return next(new ApiError(403, ('admin.auth')));

      const validatedBody = checkNewValidations(req);
      if (!req.body.categoryID) {
        res.send(new ApiSuccess(false, 200, "categoryid is required!", {}));
      }
      await checkExist(req.body.categoryID, Category, {
        isDeleted: false,
        createdBy: req.body.createdBy,
      });

      let image = await handleImg(req);
      console.log({ validatedBody });
      let createdCategory = await Category.create({
        ...validatedBody,
        logo: image,
      });

      let reports = {
        action: "Create Category",
      };
      // let report = await Report.create({...reports, user: user });
      res.send(
        new ApiSuccess(
          true,
          200,
          "category Create SuccessFully",
          createdCategory
        )
      );
    } catch (err) {
      // next(err);
      res.status(400).send(err);
    }
  },

  async updateSubCategory(req, res, next) {
    try {
      // let user = req.user;
      // if (user.type != 'ADMIN')
      //     return next(new ApiError(403, ('admin.auth')));

      let { categoryId } = req.params;

      if (!req.body.categoryID) {
        res.send(new ApiSuccess(false, 200, "categoryid is required!", {}));
      }
      await checkExist(req.body.categoryID, Category, {
        isDeleted: false,
        createdBy: req.body.createdBy,
      });
      await checkExist(categoryId, Category, {
        isDeleted: false,
        createdBy: req.body.createdBy,
      });

      const validatedBody = checkNewValidations(req);

      if (req.file) {
        let image = await handleImg(req, {
          attributeName: "img",
          isUpdate: true,
        });
        validatedBody.img = image;
      }
      let updatedCategory = await Category.findByIdAndUpdate(
        categoryId,
        {
          ...validatedBody,
        },
        { new: true }
      );
      let reports = {
        action: "Update Category",
      };

      // let report = await Report.create({...reports, user: user });
      res.send(
        new ApiSuccess(
          true,
          200,
          "Category update SuccessFully",
          updatedCategory
        )
      );
    } catch (err) {
      res.status(400).send(err);
    }
  },

  async getCategory(req, res, next) {
    let query = { isDeleted: false, categoryID: null };
    let page = +req.query.page || 1,
      limit = +req.query.limit || 20,
      { type, services, createdBy, lat, long } = req.query;

    if (createdBy) {
      query.createdBy = createdBy;
    }
    if (type) {
      query.type = type;
    }
    if (services) {
      query.services = services;
    }
    let categories = await Category.find(query).sort({ createdAt: -1 });
    // .limit(limit)
    // .skip((page - 1) * limit);

    let findSubCategoryQuery = { isDeleted: false, categoryID: { $ne: null } };
    if (createdBy) {
      findSubCategoryQuery.createdBy = createdBy;
    }
    let subCategories = await Category.find(findSubCategoryQuery).sort({
      createdAt: -1,
    });
    // .limit(limit)
    // .skip((page - 1) * limit);
    let newCategory = [];
    for (let i = 0; i < categories.length; i++) {
      newCategory.push({ ...categories[i] });
    }
    let newCategoryData = [];
    for (let i = 0; i < newCategory.length; i++) {
      newCategory[i]._doc.subcategory = [];
      newCategory[i]._doc["isStore"] = false;
      newCategory[i]._doc.id = newCategory[i]._doc._id;

      for (let j = 0; j < subCategories.length; j++) {
        if (subCategories[j].categoryID === newCategory[i]._doc._id) {
          newCategory[i]._doc.subcategory.push(subCategories[j]);
        }
      }
      delete newCategory[i]._doc._id;
      newCategoryData.push(newCategory[i]._doc);
    }

    res.send(
      new ApiSuccess(true, 200, "category find SuccessFully", {
        categories: [...newCategoryData],
      })
    );
  },

  async updateCategoryOrder(req,res,next){
    let {categoryIndex} = req.body;
    console.log({categoryIndex})
    for(let i=0;i<categoryIndex.length;i++){
        await Category.findByIdAndUpdate(categoryIndex[i].id, {
            displayOrder: i
        }, { new: true });
    }

    res.status(200).send('');
  }
};

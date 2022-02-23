import ApiResponse from "../../helpers/ApiResponse";
import vat from "../../models/vat/vat.model";
import ApiError from "../../helpers/ApiError";
import Report from "../../models/reports/report.model";

import { checkExist, checkExistThenGet } from "../../helpers/CheckMethods";
import { checkValidations } from "../shared/shared.controller";
import { body } from "express-validator/check";

export default {
  async findAll(req, res, next) {
    try {
      let page = +req.query.page || 1,
        limit = +req.query.limit || 20;
      let query = { isDeleted: false };
      let vats = await vat
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

      const pageCount = Math.ceil(1 / limit);

      res.send(new ApiResponse(vats, page, pageCount, limit, 1, req));
    } catch (err) {
      next(err);
    }
  },

  validateBody(isUpdate = false) {
    let validations = [
      body("value").not().isEmpty().withMessage("value is required"),
    ];
    return validations;
  },

  async create(req, res, next) {
    try {
      let user = req.user;
      if (user.type != "ADMIN") return next(new ApiError(403, "admin.auth"));

      const validatedBody = checkValidations(req);
      let createdTax = await vat.create({ ...validatedBody });
      let reports = {
        action: "Create VAT",
      };
      let report = await Report.create({ ...reports, user: user });
      res.status(201).send(createdTax);
    } catch (err) {
      next(err);
    }
  },

  async findById(req, res, next) {
    try {
      let { id } = req.params;
      //   await checkExist(id, vat, { isDeleted: false });
      let currentVat = await vat.findById(id);
      res.send(currentVat);
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      let user = req.user;
      if (user.type != "ADMIN") return next(new ApiError(403, "admin.auth"));
      let { id } = req.params;
      const validatedBody = checkValidations(req);
      let updatedVat = await vat.findByIdAndUpdate(
        id,
        {
          ...validatedBody,
        },
        { upsert: true, new: true }
      );
      let reports = {
        action: "Update VAT",
      };
      let report = await Report.create({ ...reports, user: user });
      res.status(200).send(updatedVat);
    } catch (err) {
      console.log(err);
      next(err);
    }
  },
};

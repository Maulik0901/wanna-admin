import ApiResponse from "../../helpers/ApiResponse";
import Year from "../../models/year/year.model";
import Report from "../../models/reports/report.model";
import ApiError from '../../helpers/ApiError';

import { checkExist, checkExistThenGet, isImgUrl } from "../../helpers/CheckMethods";
import { handleImg, checkValidations } from "../shared/shared.controller";
import { body } from "express-validator/check";

export default {

    async findAll(req, res, next) {

        try {
            let page = +req.query.page || 1, limit = +req.query.limit || 20;
            let query = {isDeleted: false };
            let Years = await Year.find(query)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip((page - 1) * limit);


            const YearsCount = await Year.count(query);
            const pageCount = Math.ceil(YearsCount / limit);

            res.send(new ApiResponse(Years, page, pageCount, limit, YearsCount, req));
        } catch (err) {
            next(err);
        }
    },

    validateBody(isUpdate = false) {
        let validations = [
            body('Year').not().isEmpty().withMessage('Year is required'),
            body('arabicYear'),

        ];
        return validations;
    },

    async create(req, res, next) {

        try {
            let user = req.user;
            if (user.type != 'ADMIN')
                return next(new ApiError(403, ('admin.auth')));
    
            const validatedBody = checkValidations(req);
            let createdTax = await Year.create({ ...validatedBody});
            let reports = {
                "action":"Create Year",
            };
            let report = await Report.create({...reports, user: user });
            res.status(201).send(createdTax);
        } catch (err) {
            next(err);
        }
    },


    async findById(req, res, next) {
        try {
            let { YearId } = req.params;
            await checkExist(YearId, Year, { isDeleted: false });
            let year = await Year.findById(YearId);
            res.send(year);
        } catch (err) {
            next(err);
        }
    },
    async update(req, res, next) {

        try {
            let user = req.user;
            if (user.type != 'ADMIN')
                return next(new ApiError(403, ('admin.auth')));

            let { YearId } = req.params;
            await checkExist(YearId, Year, { isDeleted: false });

            const validatedBody = checkValidations(req);
            let updatedYear = await Year.findByIdAndUpdate(YearId, {
                ...validatedBody,
            }, { new: true });
            let reports = {
                "action":"Update Year",
            };
            let report = await Report.create({...reports, user: user });
            res.status(200).send(updatedYear);
        }
        catch (err) {
            next(err);
        }
    },

    async delete(req, res, next) { 
        try {
            let user = req.user;
            if (user.type != 'ADMIN')
                return next(new ApiError(403, ('admin.auth')));
                
            let { YearId } = req.params;
            let year = await checkExistThenGet(YearId, Year, { isDeleted: false });
            year.isDeleted = true;
            await year.save();
            let reports = {
                "action":"Delete Year",
            };
            let report = await Report.create({...reports, user: user });
            res.status(204).send('delete success');

        }
        catch (err) {
            next(err);
        }
    },
  
};
import ApiResponse from "../../helpers/ApiResponse";
import Time from "../../models/time/time.model";
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
            let Times = await Time.find(query)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip((page - 1) * limit);


            const TimesCount = await Time.count(query);
            const pageCount = Math.ceil(TimesCount / limit);

            res.send(new ApiResponse(Times, page, pageCount, limit, TimesCount, req));
        } catch (err) {
            next(err);
        }
    },

    validateBody(isUpdate = false) {
        let validations = [
            body('time').not().isEmpty().withMessage('time is required'),
            body('arabicTime'),

        ];
        return validations;
    },

    async create(req, res, next) {

        try {
            let user = req.user;
            if (user.type != 'ADMIN')
                return next(new ApiError(403, ('admin.auth')));
    
            const validatedBody = checkValidations(req);
            let createdTax = await Time.create({ ...validatedBody});
            let reports = {
                "action":"Create Time",
            };
            let report = await Report.create({...reports, user: user });
            res.status(201).send(createdTax);
        } catch (err) {
            next(err);
        }
    },


    async findById(req, res, next) {
        try {
            let { TimeId } = req.params;
            await checkExist(TimeId, Time, { isDeleted: false });
            let time = await Time.findById(TimeId);
            res.send(time);
        } catch (err) {
            next(err);
        }
    },
    async update(req, res, next) {

        try {
            let user = req.user;
            if (user.type != 'ADMIN')
                return next(new ApiError(403, ('admin.auth')));

            let { TimeId } = req.params;
            await checkExist(TimeId, Time, { isDeleted: false });

            const validatedBody = checkValidations(req);
            let updatedTime = await Time.findByIdAndUpdate(TimeId, {
                ...validatedBody,
            }, { new: true });
            let reports = {
                "action":"Update time",
            };
            let report = await Report.create({...reports, user: user });
            res.status(200).send(updatedTime);
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
                
            let { TimeId } = req.params;
            let time = await checkExistThenGet(TimeId, Time, { isDeleted: false });
            time.isDeleted = true;
            await time.save();
            let reports = {
                "action":"Delete Time",
            };
            let report = await Report.create({...reports, user: user });
            res.status(204).send('delete success');

        }
        catch (err) {
            next(err);
        }
    },
  
};
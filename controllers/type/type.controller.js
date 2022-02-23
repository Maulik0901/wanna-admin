import ApiResponse from "../../helpers/ApiResponse";
import Type from "../../models/type/type.model";
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
            let Types = await Type.find(query)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip((page - 1) * limit);


            const TypesCount = await Type.count(query);
            const pageCount = Math.ceil(TypesCount / limit);

            res.send(new ApiResponse(Types, page, pageCount, limit, TypesCount, req));
        } catch (err) {
            next(err);
        }
    },

    validateBody(isUpdate = false) {
        let validations = [
            body('Type').not().isEmpty().withMessage('Type is required'),
            body('arabicType').not().isEmpty().withMessage('arabic Type is required'),

        ];
        return validations;
    },

    async create(req, res, next) {

        try {
            let user = req.user;
            if (user.type != 'ADMIN')
                return next(new ApiError(403, ('admin.auth')));
    
            const validatedBody = checkValidations(req);
            let createdTax = await Type.create({ ...validatedBody});
            let reports = {
                "action":"Create Type",
            };
            let report = await Report.create({...reports, user: user });
            res.status(201).send(createdTax);
        } catch (err) {
            next(err);
        }
    },


    async findById(req, res, next) {
        try {
            let { TypeId } = req.params;
            await checkExist(TypeId, Type, { isDeleted: false });
            let type = await Type.findById(TypeId);
            res.send(type);
        } catch (err) {
            next(err);
        }
    },
    async update(req, res, next) {

        try {
            let user = req.user;
            if (user.type != 'ADMIN')
                return next(new ApiError(403, ('admin.auth')));

            let { TypeId } = req.params;
            await checkExist(TypeId, Type, { isDeleted: false });

            const validatedBody = checkValidations(req);
            let updatedType = await Type.findByIdAndUpdate(TypeId, {
                ...validatedBody,
            }, { new: true });
            let reports = {
                "action":"Update Type",
            };
            let report = await Report.create({...reports, user: user });
            res.status(200).send(updatedType);
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
                
            let { TypeId } = req.params;
            let type = await checkExistThenGet(TypeId, Type, { isDeleted: false });
            type.isDeleted = true;
            await type.save();
            let reports = {
                "action":"Delete Type",
            };
            let report = await Report.create({...reports, user: user });
            res.status(204).send('delete success');

        }
        catch (err) {
            next(err);
        }
    },
  
};
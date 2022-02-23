import ApiResponse from "../../helpers/ApiResponse";
import Option from "../../models/option/option.model";
import Report from "../../models/reports/report.model";
import ApiError from '../../helpers/ApiError';

import { checkExist, checkExistThenGet, isImgUrl } from "../../helpers/CheckMethods";
import { handleImg, checkValidations } from "../shared/shared.controller";
import { body } from "express-validator/check";

export default {

    async findAll(req, res, next) {

        try {
            let query = {isDeleted: false };
            let option = await Option.find(query)

            res.send(option);
        } catch (err) {
            next(err);
        }
    },

    validateBody(isUpdate = false) {
        let validations = [
            body('name').not().isEmpty().withMessage('name is required'),

        ];

        return validations;
    },

    async create(req, res, next) {

        try {
            let user = req.user;
            if (user.type != 'ADMIN')
                return next(new ApiError(403, ('admin.auth')));

            const validatedBody = checkValidations(req);

            let createdOption = await Option.create({ ...validatedBody});

            let reports = {
                "action":"Create Option ",
            };
            let report = await Report.create({...reports, user: user });
            res.status(201).send(createdOption);
        } catch (err) {
            next(err);
        }
    },


    async delete(req, res, next) {
        try {
            let user = req.user;
            if (user.type != 'ADMIN')
                return next(new ApiError(403, ('admin.auth')));

            let { OptionId } = req.params;
            let option = await checkExistThenGet(OptionId, Option, { isDeleted: false });
            option.isDeleted = true;
            await option.save();

            res.status(204).send('delete success');

        }
        catch (err) {
            next(err);
        }
    },
    async enable(req, res, next) {
        try {
            let user = req.user;
            if (user.type != 'ADMIN')
                return next(new ApiError(403, ('admin.auth')));

            let { OptionId } = req.params;
            let option = await checkExistThenGet(OptionId, Option, { isDeleted: false });
            option.enable = true;
            await option.save();

            res.status(204).send('enable success');

        }
        catch (err) {
            next(err);
        }
    },
    async disable(req, res, next) {
        try {
            let user = req.user;
            if (user.type != 'ADMIN')
                return next(new ApiError(403, ('admin.auth')));

            let { OptionId } = req.params;
            let option = await checkExistThenGet(OptionId, Option, { isDeleted: false });
            option.enable = false;
            await option.save();

            res.status(204).send('disable success');

        }
        catch (err) {
            next(err);
        }
    },

    async enableApp(req, res, next) {
        try {
            let user = req.user;
            if (user.type != 'ADMIN')
                return next(new ApiError(403, ('admin.auth')));

            let { OptionId } = req.params;
            let option = await checkExistThenGet(OptionId, Option, { isDeleted: false });
            option.enableApp = true;
            await option.save();

            res.status(204).send('enable success');

        }
        catch (err) {
            next(err);
        }
    },
    async disableApp(req, res, next) {
        try {
            let user = req.user;
            if (user.type != 'ADMIN')
                return next(new ApiError(403, ('admin.auth')));

            let { OptionId } = req.params;
            let option = await checkExistThenGet(OptionId, Option, { isDeleted: false });
            option.enableApp = false;
            await option.save();

            res.status(204).send('disable success');

        }
        catch (err) {
            next(err);
        }
    },
};

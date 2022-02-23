import ApiResponse from "../../helpers/ApiResponse";
import Debt from "../../models/debt/debt.model";
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
            let Debts = await Debt.find(query)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip((page - 1) * limit);


            const DebtsCount = await Debt.count(query);
            const pageCount = Math.ceil(DebtsCount / limit);

            res.send(new ApiResponse(Debts, page, pageCount, limit, DebtsCount, req));
        } catch (err) {
            next(err);
        }
    },

    validateBody(isUpdate = false) {
        let validations = [
            body('value').not().isEmpty().withMessage('value is required'),
        ];
        return validations;
    },

    async create(req, res, next) {

        try {
            let user = req.user;
            if (user.type != 'ADMIN')
                return next(new ApiError(403, ('admin.auth')));
    
            const validatedBody = checkValidations(req);
            let createdDebt = await Debt.create({ ...validatedBody});
            let reports = {
                "action":"Create Debt",
            };
            let report = await Report.create({...reports, user: user });
            res.status(201).send(createdDebt);
        } catch (err) {
            next(err);
        }
    },


    async findById(req, res, next) {
        try {
            let { DebtId } = req.params;
            await checkExist(DebtId, Debt, { isDeleted: false });
            let debt = await Debt.findById(DebtId);
            res.send(debt);
        } catch (err) {
            next(err);
        }
    },
    async update(req, res, next) {

        try {
            let user = req.user;
            if (user.type != 'ADMIN')
                return next(new ApiError(403, ('admin.auth')));

            let { DebtId } = req.params;
            await checkExist(DebtId, Debt, { isDeleted: false });

            const validatedBody = checkValidations(req);
            let updatedDebt = await Debt.findByIdAndUpdate(DebtId, {
                ...validatedBody,
            }, { new: true });
            let reports = {
                "action":"Update Debt value",
            };
            let report = await Report.create({...reports, user: user });
            res.status(200).send(updatedDebt);
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
                
            let { DebtId } = req.params;
            let debt = await checkExistThenGet(DebtId, Debt, { isDeleted: false });
            debt.isDeleted = true;
            await debt.save();
            let reports = {
                "action":"Delete Debt",
            };
            let report = await Report.create({...reports, user: user });
            res.status(204).send('delete success');

        }
        catch (err) {
            next(err);
        }
    },
  
};
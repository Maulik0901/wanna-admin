import ApiResponse from "../../helpers/ApiResponse";
import Bank from "../../models/bank/bank.model";
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
            let Banks = await Bank.find(query)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip((page - 1) * limit);


            const BanksCount = await Bank.count(query);
            const pageCount = Math.ceil(BanksCount / limit);

            res.send(new ApiResponse(Banks, page, pageCount, limit, BanksCount, req));
        } catch (err) {
            next(err);
        }
    },

    validateBody(isUpdate = false) {
        let validations = [
            body('Bank').not().isEmpty().withMessage('Bank is required'),
            body('arabicBank').not().isEmpty().withMessage('arabic Bank is required'),

        ];
        return validations;
    },

    async create(req, res, next) {

        try {
            let user = req.user;
            if (user.type != 'ADMIN')
                return next(new ApiError(403, ('admin.auth')));
    
            const validatedBody = checkValidations(req);
            let createdTax = await Bank.create({ ...validatedBody});
            let reports = {
                "action":"Create Bank",
            };
            let report = await Report.create({...reports, user: user });
            res.status(201).send(createdTax);
        } catch (err) {
            next(err);
        }
    },


    async findById(req, res, next) {
        try {
            let { BankId } = req.params;
            await checkExist(BankId, Bank, { isDeleted: false });
            let bank = await Bank.findById(BankId);
            res.send(bank);
        } catch (err) {
            next(err);
        }
    },
    async update(req, res, next) {

        try {
            let user = req.user;
            if (user.type != 'ADMIN')
                return next(new ApiError(403, ('admin.auth')));

            let { BankId } = req.params;
            await checkExist(BankId, Bank, { isDeleted: false });

            const validatedBody = checkValidations(req);
            let updatedBank = await Bank.findByIdAndUpdate(BankId, {
                ...validatedBody,
            }, { new: true });
            let reports = {
                "action":"Update Bank",
            };
            let report = await Report.create({...reports, user: user });
            res.status(200).send(updatedBank);
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
                
            let { BankId } = req.params;
            let bank = await checkExistThenGet(BankId, Bank, { isDeleted: false });
            bank.isDeleted = true;
            await bank.save();
            let reports = {
                "action":"Delete Bank",
            };
            let report = await Report.create({...reports, user: user });
            res.status(204).send('delete success');

        }
        catch (err) {
            next(err);
        }
    },
  
};
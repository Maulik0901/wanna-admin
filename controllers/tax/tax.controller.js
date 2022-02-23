import ApiResponse from "../../helpers/ApiResponse";
import Tax from "../../models/tax/tax.model";
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
            let Taxs = await Tax.find(query)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip((page - 1) * limit);


            const TaxsCount = await Tax.count(query);
            const pageCount = Math.ceil(TaxsCount / limit);

            res.send(new ApiResponse(Taxs, page, pageCount, limit, TaxsCount, req));
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
            // if (user.type != 'ADMIN')
            //     return next(new ApiError(403, ('admin.auth')));
    
            const validatedBody = checkValidations(req);
            let createdTax = await Tax.create({ ...validatedBody});
            let reports = {
                "action":"Create Tax",
            };
            let report = await Report.create({...reports, user: user });
            res.status(201).send(createdTax);
        } catch (err) {
            next(err);
        }
    },


    async findById(req, res, next) {
        try {
            let { TaxId } = req.params;
            await checkExist(TaxId, Tax, { isDeleted: false });
            let tax = await Tax.findById(TaxId);
            res.send(tax);
        } catch (err) {
            next(err);
        }
    },
    async update(req, res, next) {

        try {
            let user = req.user;
            if (user.type != 'ADMIN')
                return next(new ApiError(403, ('admin.auth')));

            let { TaxId } = req.params;
            await checkExist(TaxId, Tax, { isDeleted: false });

            const validatedBody = checkValidations(req);
            let updatedTax = await Tax.findByIdAndUpdate(TaxId, {
                ...validatedBody,
            }, { new: true });
            let reports = {
                "action":"Update Tax value",
            };
            let report = await Report.create({...reports, user: user });
            res.status(200).send(updatedTax);
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
                
            let { TaxId } = req.params;
            let tax = await checkExistThenGet(TaxId, Tax, { isDeleted: false });
            tax.isDeleted = true;
            await tax.save();
            let reports = {
                "action":"Delete Tax",
            };
            let report = await Report.create({...reports, user: user });
            res.status(204).send('delete success');

        }
        catch (err) {
            next(err);
        }
    },
    async active(req, res, next) {
        try {
            let user = req.user;
            let { TaxId } = req.params;
            let tax = await checkExistThenGet(TaxId, Tax, { isDeleted: false });
            tax.active = true;
            await tax.save();
            let reports = {
                "action":"Active Tax",
            };
            let report = await Report.create({...reports, user: user });
            res.status(204).send('active success');

        }
        catch (err) {
            next(err);
        }
    },
    async disactive(req, res, next) {
        try {
            let user = req.user;
            let { TaxId } = req.params;
            let tax = await checkExistThenGet(TaxId, Tax, { isDeleted: false });
            tax.active = false;
            await tax.save();
            let reports = {
                "action":"dis-Active Tax",
            };
            let report = await Report.create({...reports, user: user });
            res.status(204).send('dis-active success');

        }
        catch (err) {
            next(err);
        }
    },
  
};
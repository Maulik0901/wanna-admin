import ApiResponse from "../../helpers/ApiResponse";
import Deliverycharge from "../../models/deliverycharge/deliverycharge.model";
import DeliveryChargeTax from '../../models/deliverychargetax/deliverychargetax.model';

import ApiError from '../../helpers/ApiError';

import { checkExist, checkExistThenGet, isImgUrl } from "../../helpers/CheckMethods";
import { handleImg, checkValidations } from "../shared/shared.controller";
import { body } from "express-validator/check";

export default {

    async findAll(req, res, next) {

        try {
            let page = +req.query.page || 1, limit = +req.query.limit || 20;
            let query = {isDeleted: false };
            let deliveryCharge = await Deliverycharge.find(query)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip((page - 1) * limit);


            const DeliveryChargeCount = await Deliverycharge.count(query);
            const pageCount = Math.ceil(DeliveryChargeCount / limit);

            res.send(new ApiResponse(deliveryCharge, page, pageCount, limit, DeliveryChargeCount, req));
        } catch (err) {
            next(err);
        }
    },

    validateBody(isUpdate = false) {
        let validations = [
            body('start').not().isEmpty().withMessage('start is required'),
            body('end').not().isEmpty().withMessage('end is required'),
            body('price').not().isEmpty().withMessage('price is required'),
        ];
        return validations;
    },

    async create(req, res, next) {

        try {
            // let user = req.user;
            // if (user.type != 'ADMIN')
            //     return next(new ApiError(403, ('admin.auth')));
    
            const validatedBody = checkValidations(req);
            let createdDeliverycharge = await Deliverycharge.create({ ...validatedBody});
            let reports = {
                "action":"Create Debt",
            };
            // let report = await Report.create({...reports, user: user });
            res.status(201).send(createdDeliverycharge);
        } catch (err) {
            next(err);
        }
    },


    async findById(req, res, next) {
        try {
            let { deleveryChargeId } = req.params;
            await checkExist(deleveryChargeId, Deliverycharge, { isDeleted: false });
            let delevery = await Deliverycharge.findById(deleveryChargeId);
            res.send(delevery);
        } catch (err) {
            next(err);
        }
    },
    async update(req, res, next) {

        try {
            // let user = req.user;
            // if (user.type != 'ADMIN')
            //     return next(new ApiError(403, ('admin.auth')));

            let { deleveryChargeId } = req.params;
            await checkExist(deleveryChargeId, Deliverycharge, { isDeleted: false });

            const validatedBody = checkValidations(req);
            let updatedDeleveryCharge = await Deliverycharge.findByIdAndUpdate(deleveryChargeId, {
                ...validatedBody,
            }, { new: true });
            let reports = {
                "action":"Update delevery charge value",
            };
            // let report = await Report.create({...reports, user: user });
            res.status(200).send(updatedDeleveryCharge);
        }
        catch (err) {
            next(err);
        }
    },

    async delete(req, res, next) {
        try {
            // let user = req.user;
            // if (user.type != 'ADMIN')
            //     return next(new ApiError(403, ('admin.auth')));
                
            let { deleveryChargeId } = req.params;
            let deleverycharge = await checkExistThenGet(deleveryChargeId, Deliverycharge, { isDeleted: false });
            deleverycharge.isDeleted = true;
            await deleverycharge.save();
            let reports = {
                "action":"Delete deleverycharge",
            };
            // let report = await Report.create({...reports, user: user });
            res.status(204).send('delete success');

        }
        catch (err) {
            next(err);
        }
    },

    async addDeliveryTax(req, res, next) {
        try {
            // let user = req.user;
            // if (user.type != 'ADMIN')
            //     return next(new ApiError(403, ('admin.auth')));
    
            const validatedBody = checkValidations(req);
            let createdDeliverytax = await DeliveryChargeTax.create({ ...validatedBody});
            let reports = {
                "action":"Create Debt",
            };
            // let report = await Report.create({...reports, user: user });
            res.status(201).send(createdDeliverytax);
        } catch (err) {
            next(err);
        }
    },

    async updateDeliveryTax(req, res, next) {

        try {
            // let user = req.user;
            // if (user.type != 'ADMIN')
            //     return next(new ApiError(403, ('admin.auth')));

            let { deleveryTaxId } = req.params;
            await checkExist(deleveryTaxId, DeliveryChargeTax, { isDeleted: false });

            const validatedBody = checkValidations(req);
            let updatedDeleveryTax = await DeliveryChargeTax.findByIdAndUpdate(deleveryTaxId, {
                ...validatedBody,
            }, { new: true });
            let reports = {
                "action":"Update delevery charge value",
            };
            // let report = await Report.create({...reports, user: user });
            res.status(200).send(updatedDeleveryTax);
        }
        catch (err) {
            next(err);
        }
    },
  
    async findAllDeliveryTax(req, res, next) {

        try {
            let page = +req.query.page || 1, limit = +req.query.limit || 20;
            let query = {isDeleted: false };
            let deliveryCharge = await DeliveryChargeTax.find(query)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip((page - 1) * limit);


            const DeliveryChargeCount = await DeliveryChargeTax.count(query);
            const pageCount = Math.ceil(DeliveryChargeCount / limit);

            res.send(new ApiResponse(deliveryCharge, page, pageCount, limit, DeliveryChargeCount, req));
        } catch (err) {
            next(err);
        }
    },
};
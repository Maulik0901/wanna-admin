import ApiResponse from "../../helpers/ApiResponse";
import Shop from "../../models/shop/shop.model";
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
            let shops = await Shop.find(query)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip((page - 1) * limit);


            const shopsCount = await Shop.count(query);
            const pageCount = Math.ceil(shopsCount / limit);

            res.send(new ApiResponse(shops, page, pageCount, limit, shopsCount, req));
        } catch (err) {
            next(err);
        }
    },

    validateBody(isUpdate = false) {
        let validations = [
            body('number').not().isEmpty().withMessage('number is required'),
            body('name').not().isEmpty().withMessage('name is required')
        ];
        if (isUpdate)
        validations.push([
            body('img').optional().custom(val => isImgUrl(val)).withMessage('img should be a valid img')
        ]);

        return validations;
    },

    async create(req, res, next) {

        try {
            let user = req.user;
            if (user.type != 'ADMIN')
                return next(new ApiError(403, ('admin.auth')));
    
            const validatedBody = checkValidations(req);
            let image = await handleImg(req);
            let createdShop = await Shop.create({ ...validatedBody,img:image});
            let reports = {
                "action":"Create Shop",
            };
            let report = await Report.create({...reports, user: user });
            res.status(201).send(createdShop);
        } catch (err) {
            next(err);
        }
    },


    async findById(req, res, next) {
        try {
            let { ShopId } = req.params;
            await checkExist(ShopId, Shop, { isDeleted: false });
            let shop = await Shop.findById(ShopId);
            res.send(shop);
        } catch (err) {
            next(err);
        }
    },
    async update(req, res, next) {

        try {
            let user = req.user;
            if (user.type != 'ADMIN')
                return next(new ApiError(403, ('admin.auth')));

            let { ShopId } = req.params;
            await checkExist(ShopId, Shop, { isDeleted: false });

            const validatedBody = checkValidations(req);
            if (req.file) {
                let image = await handleImg(req, { attributeName: 'img', isUpdate: true });
                validatedBody.img = image;
            }
            let updatedShop = await Shop.findByIdAndUpdate(ShopId, {
                ...validatedBody,
            }, { new: true });
            let reports = {
                "action":"Update Shop",
            };
            let report = await Report.create({...reports, user: user });
            res.status(200).send(updatedShop);
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
                
            let { ShopId } = req.params;
            let shop = await checkExistThenGet(ShopId, Shop, { isDeleted: false });
            shop.isDeleted = true;
            await shop.save();
            let reports = {
                "action":"Delete Shop",
            };
            let report = await Report.create({...reports, user: user });
            res.status(204).send('delete success');

        }
        catch (err) {
            next(err);
        }
    },
};
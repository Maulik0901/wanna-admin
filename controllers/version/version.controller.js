import ApiResponse from "../../helpers/ApiResponse";
import Version from "../../models/version/version.model";
import Report from "../../models/reports/report.model";
// import ApiError from '../../helpers/ApiError';
import { checkValidations } from "../shared/shared.controller";
import { checkExist, checkExistThenGet, isImgUrl } from "../../helpers/CheckMethods";
import { body } from "express-validator/check";

export default {

    async findAll(req, res, next) {

        try {
            let page = +req.query.page || 1, limit = +req.query.limit || 20;
            let query = {isDeleted: false };
            let Types = await Version.find(query)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip((page - 1) * limit);


            const VersionCount = await Version.count(query);
            const pageCount = Math.ceil(VersionCount / limit);

            res.send(new ApiResponse(Types, page, pageCount, limit, VersionCount, req));
        } catch (err) {
            next(err);
        }
    },

    async create(req, res, next) {

        try {
            const validatedBody = checkValidations(req);
            console.log({validatedBody})
            let createVersion = await Version.create({ ...validatedBody});
            // let reports = {
            //     "action":"Report create",
            // };
            // let report = await Report.create({...reports, user: user });
            res.status(201).send(createVersion);
        } catch (err) {
            next(err);
        }
    },


    async update(req, res, next) {

        try {            
            let { VersionId } = req.params;
            console.log({VersionId})
            await checkExist(VersionId, Version, { isDeleted: false });

            const validatedBody = checkValidations(req);
            console.log({validatedBody})
            let updatedType = await Version.findByIdAndUpdate(VersionId, {
                ...validatedBody,
            }, { new: true });
            
            res.status(200).send(updatedType);
        }
        catch (err) {
            next(err);
        }
    },

    // async delete(req, res, next) { 
    //     try {
    //         let user = req.user;
    //         if (user.type != 'ADMIN')
    //             return next(new ApiError(403, ('admin.auth')));
                
    //         let { TypeId } = req.params;
    //         let type = await checkExistThenGet(TypeId, Type, { isDeleted: false });
    //         type.isDeleted = true;
    //         await type.save();
    //         let reports = {
    //             "action":"Delete Type",
    //         };
    //         let report = await Report.create({...reports, user: user });
    //         res.status(204).send('delete success');

    //     }
    //     catch (err) {
    //         next(err);
    //     }
    // },

    validateBody(isUpdate = false) {
        let validations = [
            body('ios').not().isEmpty().withMessage('Ios is required'),
            body('android').not().isEmpty().withMessage('Android is required'),
        ];
        return validations;
    },
  
};
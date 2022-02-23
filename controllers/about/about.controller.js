import ApiResponse from "../../helpers/ApiResponse";
import About from "../../models/about/about.model";
import Report from "../../models/reports/report.model";
import ApiError from '../../helpers/ApiError';

import { checkExist, checkExistThenGet, isImgUrl } from "../../helpers/CheckMethods";
import { handleImg, checkValidations } from "../shared/shared.controller";
import { body } from "express-validator/check";

export default {

    async findAll(req, res, next) {

        try {
            let query = {isDeleted: false };
            let about = await About.find(query)

            res.send(about);
        } catch (err) {
            next(err);
        }
    },

    validateBody(isUpdate = false) {
        let validations = [
            body('about').not().isEmpty().withMessage('about is required'),
            body('usage'),

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
            if(req.file){
                let image = await handleImg(req);
                validatedBody.img = image
            }
  
            let createdAbout = await About.create({ ...validatedBody});

            let reports = {
                "action":"Create About Us",
            };
            let report = await Report.create({...reports, user: user });
            res.status(201).send(createdAbout);
        } catch (err) {
            next(err);
        }
    },

    async update(req, res, next) {

        try {
            let user = req.user;
            if (user.type != 'ADMIN')
                return next(new ApiError(403, ('admin.auth')));

            let { aboutId } = req.params;
            await checkExist(aboutId, About, { isDeleted: false });

            const validatedBody = checkValidations(req);
            if (req.file) {
                let image = await handleImg(req, { attributeName: 'img', isUpdate: true });
                validatedBody.img = image;
            }
            let updatedAbout = await About.findByIdAndUpdate(aboutId, {
                ...validatedBody,
            }, { new: true });
            let reports = {
                "action":"Update About Us",
            };
            let report = await Report.create({...reports, user: user });
            res.status(200).send(updatedAbout);
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
                
            let { aboutId } = req.params;
            let about = await checkExistThenGet(aboutId, About, { isDeleted: false });
            about.isDeleted = true;
            await about.save();
            
            res.status(204).send('delete success');

        }
        catch (err) {
            next(err);
        }
    },
};
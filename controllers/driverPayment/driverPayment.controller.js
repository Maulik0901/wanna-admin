import { checkExist,checkCouponExist, checkExistThenGet, isLng, isLat} from "../../helpers/CheckMethods";
import ApiResponse from "../../helpers/ApiResponse";
import { body } from "express-validator/check";
import { handleImg, checkValidations, checkNewValidations } from "../shared/shared.controller";
import { ValidationError } from "mongoose";
import ApiError from "../../helpers/ApiError";
import ApiSuccess from '../../helpers/ApiSuccess';
import DriverPayment from '../../models/driverPayment/driverPayment.model';


var DriverPaymentController = { 
    validateCreated() {
        let validations = [
            body('driverId').not().isEmpty().withMessage('driverId is required'),
            body('amount').not().isEmpty().withMessage('amount is required'),
            body('paymentDate').not().isEmpty().withMessage('paymentDate is required'),
            body('paymentBy').not().isEmpty().withMessage('paymentBy is required'),
            body('img').optional().custom(val => isImgUrl(val)).withMessage('img should be a valid img'),
            body('paymentType').optional(),
            body('notes').optional()                   
        ];
        return validations;
    },
    async create(req, res, next) {
        try {
            const validatedBody = checkNewValidations(req);
            let image;
            if(req.file){
                image = await handleImg(req);                   
            }
            
            let createPayment = await DriverPayment.create({ ...validatedBody,img:image});
            
            res.send(new ApiSuccess(true,200,'store item create successFully',createPayment));
        } catch (err) {
            // next(err); 
            return  res.status(400).send(err)
        }
    }, 
    async update(req, res, next) {

        try {
            
            // if (user.type != 'ADMIN')
            //     return next(new ApiError(403, ('admin.auth')));

            let { id } = req.params;
            
            await checkExist(id, DriverPayment, { isDeleted: false });

            const validatedBody = checkNewValidations(req);
            
            if (req.file) {
                let image = await handleImg(req, { attributeName: 'img', isUpdate: true });
                validatedBody.img = image;
            }
            let updatePayment = await DriverPayment.findByIdAndUpdate(id, {
                ...validatedBody,
            }, { new: true });
            
            res.send(new ApiSuccess(true,200,'store item update successFully',updatePayment));
        }
        catch (err) {
            console.log({err})
            res.status(400).send(err)
        }
    },

    async get(req,res,next){
        let page = +req.query.page || 1, limit = +req.query.limit || 20
        ,{ driverId } = req.query
        , query = {isDeleted: false };
        
        if(driverId){
            query.driverId = driverId;
        }

        let payment = await DriverPayment.find(query)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip((page - 1) * limit);

        const driverPaymentCount = await DriverPayment.count(query);
        const pageCount = Math.ceil(driverPaymentCount / limit);
        
        res.send(new ApiSuccess(true,200,'Order list',{payment: payment, page, pageCount, limit, driverPaymentCount}));    
    }
}

module.exports = DriverPaymentController;
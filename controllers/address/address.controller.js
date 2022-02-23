import { checkExistThenGet, checkExist } from '../../helpers/CheckMethods';
import { body } from 'express-validator/check';
import { checkNewValidations,checkValidations, handleImg } from '../shared/shared.controller';
import { generateToken } from '../../utils/token';
import User from "../../models/user/user.model";
import Report from "../../models/reports/report.model";
import ApiError from '../../helpers/ApiError';
import ApiSuccess from '../../helpers/ApiSuccess';
import Notif from "../../models/notif/notif.model";
import NotifiImage from "../../models/notifiImage/notifiImage.modal";
import ApiResponse from "../../helpers/ApiResponse";
import Version from "../../models/version/version.model";
import Vat from "../../models/vat/vat.model";
import Address from "../../models/address/address.model";
import { sendNotifiAndPushNotifi } from "../../services/notification-service";
import { AddressList } from 'twilio/lib/rest/api/v2010/account/address';

export default { 
    validactionAddress(isUpdate = false) {
        let validations = [
            // body('username').not().isEmpty().withMessage('username is required'),        
            body('destination').optional(),
            body('houseName').optional(),
            body('flatName').optional(),
            body('landmark').optional(),
            body('pinCode').optional(),
            body('type').optional(),
            body('address').optional(),
            body('fullAddress').optional(),
            body('isPrimary').optional()           
        ];
        return validations;
    },
    async addAddress(req,res,next){
        try{
            // let user = req.user;
            const validatedBody = checkNewValidations(req);
            let user = await checkExistThenGet(req.user._id, User);
            if(!user){
                res.send(new ApiSuccess(false,200,'User not found!',{}))
            }
            
            let addressUser = {
                user: req.user._id,
                destination: validatedBody.destination,
                houseName: validatedBody.houseName,
                flatName: validatedBody.flatName,
                landmark: validatedBody.landmark,
                pinCode: validatedBody.pinCode,
                type: validatedBody.type,
                address: validatedBody.address,
                fullAddress: validatedBody.fullAddress,
                isPrimary : validatedBody.isPrimary
            }
            
            let findAddress = await Address.find({isDeleted: false, user: req.user._id });
            if(findAddress.length >0){
                addressUser.isPrimary = false;
            } else {
                addressUser.isPrimary = true;
            }

            let createAddress = await Address.create(addressUser);
             res.send(new ApiSuccess(true,200,'address Create SuccessFully',createAddress))
            
        } catch(err){
            console.log({err})
            res.status(200).send(err)
        }
    },

    async addressList(req,res,next) {
        let user = await checkExistThenGet(req.user._id, User);
        if(!user){
            res.send(new ApiSuccess(false,200,'User not found!',{}))
        }

        let findAddress = await Address.find({isDeleted: false, user: req.user._id });
        res.send(new ApiSuccess(true,200,'address find SuccessFully',findAddress))
    },

    async updateAddress(req,res,next){
        try{
            // let user = req.user;
            const validatedBody = checkNewValidations(req);
            let user = await checkExistThenGet(req.user._id, User);

            let {addressId} = req.params;
          
            if(!user){
                res.send(new ApiSuccess(false,200,'User not found!',{}))
            }
            let addressUser = {
                // user: req.user._id,
                destination: validatedBody.destination,
                houseName: validatedBody.houseName,
                flatName: validatedBody.flatName,
                landmark: validatedBody.landmark,
                pinCode: validatedBody.pinCode,
                type: validatedBody.type,
                address: validatedBody.address,
                fullAddress: validatedBody.fullAddress,
                isPrimary : validatedBody.isPrimary
            }
            console.log({addressId})
            let updateAddress = await Address.updateOne({_id: addressId},addressUser);
           
             res.send(new ApiSuccess(true,200,'Address update SuccessFully', await Address.findOne({_id: addressId})))
            
        } catch(err){
            console.log({err})
            res.status(200).send(err)
        }
    },
    
    async deleteAddress(req,res,next) {
        const validatedBody = checkNewValidations(req);
        let user = await checkExistThenGet(req.user._id, User);
        if(!user){
            res.send(new ApiSuccess(false,200,'User not found!',{}))
        }
        let {addressId} = req.params;

        let updateAddress = await Address.updateOne({_id: addressId},{isDeleted: true});
        res.send(new ApiSuccess(true,200,'Address update SuccessFully', await Address.findOne({_id: addressId}) ))
    },

    async setPrimeryAddress(req,res,next) {
        const validatedBody = checkNewValidations(req);
        let user = await checkExistThenGet(req.user._id, User);
        if(!user){
            res.send(new ApiSuccess(false,200,'User not found!',{}))
        }
        let {addressId} = req.params;
        console.log(req.user._id)
        let updateAddress = await Address.updateMany({user: req.user._id},{isPrimary: false});

        let updatePrimryAddress = await Address.update({_id: addressId},{isPrimary: true});

        res.send(new ApiSuccess(true,200,'Update Primry Address SuccessFully', await Address.findOne({_id: addressId }) ))
    }
}

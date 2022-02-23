import { checkExist,checkCouponExist, checkExistThenGet, isLng, isLat} from "../../helpers/CheckMethods";
import ApiResponse from "../../helpers/ApiResponse";
import Order from "../../models/order/order.model";
import { sendNotifiAndPushNotifi } from "../../services/notification-service";
import { body } from "express-validator/check";
import { ValidationError } from "mongoose";
import { handleImg, checkValidations, checkNewValidations } from "../shared/shared.controller";
import ApiError from "../../helpers/ApiError";
import User from "../../models/user/user.model";
import Report from "../../models/reports/report.model";
import Notif from "../../models/notif/notif.model"
import { toImgUrl } from "../../utils";

import ApiSuccess from '../../helpers/ApiSuccess';
import config from '../../config';

const https = require('https');
const querystring = require('querystring');

let paymentContoller = {

    async checkoutPayment(req,res,next) {
        
        console.log(config.HyperPayConfig);

        if(!req.body.amount){
            return res.send(new ApiSuccess(false,400,'Amount is required',{}));
        }
        if(!req.body.currency){
            return res.send(new ApiSuccess(false,400,'Currency is required',{}));
        }
        if(!req.body.paymentType){
            return res.send(new ApiSuccess(false,400,'PaymentType is required',{}));
        }

        if(!req.body.orderId){
            return res.send(new ApiSuccess(false,400,'OrderId is required',{}));
        }

        const apiCall = async () => {
            const path='/v1/checkouts';
            const data = querystring.stringify({
                // 'entityId': config.HyperPayConfig.EntityIDVISA,
                'entityId': config.HyperPayConfig.EntityAPPLEPAY,               
                'amount': req.body.amount,
                'currency': req.body.currency,
                'paymentType': req.body.paymentType,
                'testMode': req.body.testMode,
                'merchantTransactionId': req.body.orderId,
                'customer.email': req.body.customerEmail,
                'customer.givenName': req.body.customerGivenName,
                'customer.surname': req.body.customerSurname,
                'customer.phone': req.body.customerPhone,
                'billing.street1': req.body.billingStreet,
                'billing.city': req.body.billingCity,
                'billing.state': req.body.billingState,
                'billing.country': req.body.billingCountry,
                'billing.postcode': req.body.billingPostcode               
            });
            const options = {
                port: 443,
                host: 'test.oppwa.com',
                path: path,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': data.length,                    
                    'Authorization':`Bearer ${config.HyperPayConfig.AccessToken}`
                }
            };
            return new Promise((resolve, reject) => {
                const postRequest = https.request(options, function(res) {
                    const buf = [];
                    res.on('data', chunk => {
                        buf.push(Buffer.from(chunk));
                    });
                    res.on('end', () => {
                        const jsonString = Buffer.concat(buf).toString('utf8');
                        try {
                            resolve(JSON.parse(jsonString));
                        } catch (error) {
                            reject(error);
                        }
                    });
                });
                postRequest.on('error', reject);
                postRequest.write(data);
                postRequest.end();
            });
        }

        await apiCall().then((data)=>{
            console.log(data)
            
            return res.send(new ApiSuccess(true,200,'payment',data));
        }).catch((err)=> {
            return res.send(new ApiSuccess(false,400,'payment',err));
        })
        
        
    },
    async checkPaymentStatus(req,res,next) {
        
        console.log(config.HyperPayConfig);

        if(!req.body.id){
            return res.send(new ApiSuccess(false,400,'id is required',{}));
        }
        

        const apiCall = async () => {
            
            var path=`/v1/checkouts/${req.body.id}/payment`;
            path += `?entityId=${config.HyperPayConfig.EntityAPPLEPAY}`;
            const options = {
                port: 443,
                host: 'test.oppwa.com',
                path: path,
                method: 'GET',
                headers: {
                    'Authorization':`Bearer ${config.HyperPayConfig.AccessToken}`
                }
            };
            return new Promise((resolve, reject) => {
                const postRequest = https.request(options, function(res) {
                    const buf = [];
                    res.on('data', chunk => {
                        buf.push(Buffer.from(chunk));
                    });
                    res.on('end', () => {
                        const jsonString = Buffer.concat(buf).toString('utf8');
                        try {
                            resolve(JSON.parse(jsonString));
                        } catch (error) {
                            reject(error);
                        }
                    });
                });
                postRequest.on('error', reject);
                postRequest.end();
            });
        }

        await apiCall().then((data)=>{
            console.log(data)
            
            return res.send(new ApiSuccess(true,200,'payment',data));
        }).catch((err)=> {
            return res.send(new ApiSuccess(false,400,'payment',err));
        })
        
        
    },

    async refundPayment(req,res,next) {
        
        console.log(config.HyperPayConfig);

        if(!req.body.amount){
            return res.send(new ApiSuccess(false,400,'Amount is required',{}));
        }
        if(!req.body.currency){
            return res.send(new ApiSuccess(false,400,'Currency is required',{}));
        }
        // if(!req.body.paymentType){
        //     return res.send(new ApiSuccess(false,400,'PaymentType is required',{}));
        // }

        if(!req.body.paymentId){
            return res.send(new ApiSuccess(false,400,'paymentId is required',{}));
        }

        const apiCall = async () => {
            const path= `/v1/payments/${req.body.paymentId}`;
            const data = querystring.stringify({
                // 'entityId': config.HyperPayConfig.EntityIDVISA,
                'entityId': config.HyperPayConfig.EntityAPPLEPAY,               
                'amount': req.body.amount,
                'currency': req.body.currency,
                'paymentType': 'RF'                              
            });
            const options = {
                port: 443,
                host: 'test.oppwa.com',
                path: path,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': data.length,                    
                    'Authorization':`Bearer ${config.HyperPayConfig.AccessToken}`
                }
            };
            return new Promise((resolve, reject) => {
                const postRequest = https.request(options, function(res) {
                    const buf = [];
                    res.on('data', chunk => {
                        buf.push(Buffer.from(chunk));
                    });
                    res.on('end', () => {
                        const jsonString = Buffer.concat(buf).toString('utf8');
                        try {
                            resolve(JSON.parse(jsonString));
                        } catch (error) {
                            reject(error);
                        }
                    });
                });
                postRequest.on('error', reject);
                postRequest.write(data);
                postRequest.end();
            });
        }

        await apiCall().then((data)=>{
            console.log(data)
            
            return res.send(new ApiSuccess(true,200,'payment',data));
        }).catch((err)=> {
            return res.send(new ApiSuccess(false,400,'payment',err));
        })
        
        
    },

    async sendInitPayment(req,res,next) {

        const apiCall = async () => {
            const path='/v1/payments';
            const data = querystring.stringify({
                'entityId': config.HyperPayConfig.EntityIDVISA,
                'amount':'92.00',
                'currency':'EUR',
                'paymentBrand':'VISA',
                'paymentType':'DB',
                'card.number':'4111111111111111',
                'card.holder':'Jane Jones',
                'card.expiryMonth':'05',
                'card.expiryYear':'2021',
                'card.cvv':'123'                
            });
            
            const options = {
                port: 443,
                host: 'test.oppwa.com',
                path: path,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': data.length,
                    'Authorization': `Bearer ${config.HyperPayConfig.AccessToken}`
                }
            };

            
            return new Promise((resolve, reject) => {
                const postRequest = https.request(options, function(res) {
                    const buf = [];
                    res.on('data', chunk => {
                        buf.push(Buffer.from(chunk));
                    });
                    res.on('end', () => {
                        console.log("Sadf,nsjdfhj")
                        const jsonString = Buffer.concat(buf).toString('utf8');
                        try {
                            resolve(JSON.parse(jsonString));
                        } catch (error) {
                            reject(error);
                        }
                    });
                });
                postRequest.on('error', reject);
                postRequest.end();
            });
        }


        console.log("Asdfjashdfjk")
        await apiCall().then((data)=>{
            console.log(data)
            
            return res.send(new ApiSuccess(true,200,'payment',data));
        }).catch((err)=> {
            console.log({err})
            return res.send(new ApiSuccess(false,400,'payment',err));
        })
    }


}

module.exports = paymentContoller;
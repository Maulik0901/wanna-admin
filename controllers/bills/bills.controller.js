import ApiResponse from "../../helpers/ApiResponse";
import Report from "../../models/reports/report.model";
import ApiError from '../../helpers/ApiError';
import { checkExist, checkExistThenGet, isImgUrl } from "../../helpers/CheckMethods";
import { handleImg, checkValidations } from "../shared/shared.controller";
import { body } from "express-validator/check";
import Bill from "../../models/bills/bill.model";
import Offer from "../../models/offer/offer.model";
import Order from "../../models/order/order.model";
import Notif from "../../models/notif/notif.model";
import User from "../../models/user/user.model";
import Coupon from "../../models/coupon/coupon.model";
import Tax from "../../models/tax/tax.model";
import Option from "../../models/option/option.model";
import Store from '../../models/store/store.model';
import { sendNotifiAndPushNotifi } from "../../services/notification-service";

import Vat from "../../models/vat/vat.model";

export default {

    async findAll(req, res, next) {

        try {
            let page = +req.query.page || 1, limit = +req.query.limit || 20;
            let query = {isDeleted: false };
            let bills = await Bill.find(query)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip((page - 1) * limit);


            const billCount = await Bill.count(query);
            const pageCount = Math.ceil(billCount / limit);

            res.send(new ApiResponse(bills, page, pageCount, limit, billCount, req));
        } catch (err) {
            next(err);
        }
    },
    
    validateBody(isUpdate = false) {
        let validations = [
            body('cost').not().isEmpty().withMessage('cost is required'),
        ];
        if (isUpdate)
        validations.push([
            body('img').not().isEmpty().withMessage('img is required').optional().custom(val => isImgUrl(val)).withMessage('img should be a valid img')
        ]);

        return validations;
    },

    async create12(req, res, next) {

        try {
            let {orderId,offerId} = req.params;
            if (req.user.type != 'SALES-MAN')
                return next(new ApiError(403, ('sales man auth')));
            let order = await checkExistThenGet(orderId, Order);
            if(order.bill)
                return next(new ApiError(403, ('this order has bill')));
            let offer = await checkExistThenGet(offerId, Offer);
            const validatedBody = checkValidations(req);
            let user = await checkExistThenGet(order.client, User);
            //الضريبه 
            let tax = await Tax.find({ isDeleted: false }).select("value");
            console.log(tax)
            let taxValue = tax[0].value;
            console.log(taxValue);
            let taxValueNumber = offer.deliveryCost * taxValue
            let taxFromTotal = taxValueNumber / 100;

            let option = await Option.find({ isDeleted: false });
            console.log(option)
			 const vats = await vat.findById(1);
			 let currentVat = vats.value;
            let vatNumber =0
            let applyVat = 0;
            if(option[0].enable == true){
                vatNumber =  offer.deliveryCost * currentVat ;
                applyVat = vatNumber / 100;
                validatedBody.tax = true
            }
            console.log(applyVat)
            
            //المبلغ الأصلي × نسبة الخصم ÷ 100
            let delivary;
            if(order.discountPrice > 0){
                // let coupon = await checkExistThenGet(user.coupon, Coupon);
                //let deliveryDiscount = (offer.deliveryCost * order.discountPrice);
                delivary = (offer.deliveryCost - order.discountPrice);
                validatedBody.delivaryCost = delivary;

                user.hasCoupon = false
                user.coupon = 0
            } else {
                delivary = offer.deliveryCost;
                validatedBody.delivaryCost = delivary;
            }
            // if(user.hasCoupon == true){
            //     let coupon = await checkExistThenGet(user.coupon, Coupon);
            //     let deliveryDiscount = (offer.deliveryCost * coupon.discount) / 100;
            //     delivary = (offer.deliveryCost - deliveryDiscount);
            //     validatedBody.delivaryCost = delivary;

            //     user.hasCoupon = false
            //     user.coupon = 0
            // } else {
            //     delivary = offer.deliveryCost;
            //     validatedBody.delivaryCost = delivary;
            // }
            let total = parseInt(validatedBody.cost) + delivary
            console.log(total)
            validatedBody.totalCost = total; //money in bill
            validatedBody.paidCost = Math.ceil(total);//money to paid it 
            console.log(validatedBody.totalCost)
            if (req.file) {
                let image = await handleImg(req)
                validatedBody.img = image;
             }
            let createdbill = await Bill.create({ ...validatedBody});
            order.bill = createdbill.id;
            await order.save();

           
            let addBalance = validatedBody.paidCost - total;
            console.log(addBalance.toPrecision(2))
            let newBalance = user.balance + addBalance.toPrecision(2);
            user.balance = parseFloat(newBalance);
            user.addBalance = addBalance.toPrecision(2);
           
            await user.save();
            sendNotifiAndPushNotifi({
                targetUser: order.client, 
                fromUser: req.user, 
                text: 'وانا',
                subject: createdbill.id,
                subjectType: ' تم ارسال الفاتوره اليك'
            });
            let notif = {
                "description":' your order`s bill has been sent',
                "arabicDescription":'تم ارسال فاتوره الطلب اليك'
            }
            await Notif.create({...notif,resource:req.user,target:order.client,bill:createdbill.id});
            
            let salesMan = await checkExistThenGet(req.user._id, User);
            salesMan.debt = salesMan.debt + taxFromTotal + applyVat;
            salesMan.balance = salesMan.balance + delivary;
            let plusBalance = delivary - taxFromTotal;
            console.log(plusBalance)
            salesMan.delivaryBalance = salesMan.delivaryBalance + plusBalance ;
            await salesMan.save();
            let reports = {
                "action":"Create bill",
            };
            let report = await Report.create({...reports, user: req.user});
            res.status(201).send(createdbill);
        } catch (err) {
            next(err);
        }
    },
    async create13(req, res, next) {

        try {
            let {orderId,offerId} = req.params;
            if (req.user.type != 'SALES-MAN')
                return next(new ApiError(403, ('sales man auth')));
            let order = await checkExistThenGet(orderId, Order);
            if(order.bill)
                return next(new ApiError(403, ('this order has bill')));
            let offer = await checkExistThenGet(offerId, Offer);
            const validatedBody = checkValidations(req);
            let user = await checkExistThenGet(order.client, User);
            //الضريبه 
            let tax = await Tax.find({ isDeleted: false }).select("value");
            console.log(tax)
            let taxValue = tax[0].value;
            console.log(taxValue);
            let taxValueNumber = offer.deliveryCost * taxValue
            let taxFromTotal = taxValueNumber / 100;
            console.log({taxFromTotal})
            // let option = await Option.find({ isDeleted: false });
            // console.log(option)
			//  const vats = await vat.findById(1);
			//  let currentVat = vats.value;
            // let vatNumber =0
            // let applyVat = 0;
            // if(option[0].enable == true){
            //     vatNumber =  offer.deliveryCost * currentVat ;
            //     applyVat = vatNumber / 100;
            //     validatedBody.tax = true
            // }
            // console.log(applyVat)
            
            //المبلغ الأصلي × نسبة الخصم ÷ 100
            let delivary;
            if(order.discountPrice > 0){
                delivary = offer.deliveryCost;
                validatedBody.delivaryCost = delivary;
                // delivary = (offer.deliveryCost - order.discountPrice);
                console.log("discount price ===> ", order.discountPrice);

                taxFromTotal = taxFromTotal - order.discountPrice;

                validatedBody.delivaryCost = delivary;
                user.hasCoupon = false
                user.coupon = 0
            } else {
                delivary = offer.deliveryCost;
                validatedBody.delivaryCost = delivary;
            }
            
            let total = parseInt(validatedBody.cost) + delivary
            
            validatedBody.totalCost = total; //money in bill
            validatedBody.paidCost = Math.ceil(total);//money to paid it 
            console.log(validatedBody.totalCost)
            if (req.file) {
                let image = await handleImg(req)
                validatedBody.img = image;
            }
            let createdbill = await Bill.create({ ...validatedBody});
            order.bill = createdbill.id;
            await order.save();

           
            let addBalance = validatedBody.paidCost - total;
            
            let newBalance = user.balance + addBalance;
            user.balance = parseFloat(newBalance);
            user.addBalance = addBalance;
           
            await user.save();
            sendNotifiAndPushNotifi({
                targetUser: order.client, 
                fromUser: req.user, 
                text: 'وانا',
                subject: createdbill.id,
                subjectType: ' تم ارسال الفاتوره اليك'
            });
            let notif = {
                "description":' your order`s bill has been sent',
                "arabicDescription":'تم ارسال فاتوره الطلب اليك'
            }
            await Notif.create({...notif,resource:req.user,target:order.client,bill:createdbill.id});
            
            let salesMan = await checkExistThenGet(req.user._id, User);
            console.log("debt ==>",salesMan.debt);
            console.log({taxFromTotal})
            salesMan.debt = salesMan.debt + taxFromTotal;
            salesMan.balance = salesMan.balance + delivary;
            let acutlueTax = taxValueNumber / 100;
            let plusBalance = delivary - acutlueTax;

            console.log(plusBalance)
            salesMan.delivaryBalance = salesMan.delivaryBalance + plusBalance ;
            await salesMan.save();
            let reports = {
                "action":"Create bill",
            };
            let report = await Report.create({...reports, user: req.user});
            res.status(201).send(createdbill);
        } catch (err) {
            next(err);
        }
    },
    async create(req, res, next) {

        try {
            let {orderId} = req.params;
            // if (req.user.type != 'SALES-MAN')
            //     return next(new ApiError(403, ('sales man auth')));
            let order = await checkExistThenGet(orderId, Order);
            if(order.bill)
                return next(new ApiError(403, ('this order has bill')));
            // let offer = await checkExistThenGet(offerId, Offer);
            const validatedBody = checkValidations(req);
            let user = await checkExistThenGet(order.client, User);
            //الضريبه 
            let tax = await Tax.find({ isDeleted: false }).select("value");
            console.log(tax)
            let taxValue = tax[0].value;
            console.log(taxValue);
            let taxValueNumber = parseFloat(order.deliveryCharge) * taxValue
            let taxFromTotal = taxValueNumber / 100;
            let findVat = await Vat.findById(1);
            let vatValueNumber = parseFloat(order.deliveryCharge) * parseFloat(findVat.value)
            let vatFromTotal = vatValueNumber / 100;
            // let option = await Option.find({ isDeleted: false });
            // console.log(option)
			//  const vats = await vat.findById(1);
			//  let currentVat = vats.value;
            // let vatNumber =0
            // let applyVat = 0;
            // if(option[0].enable == true){
            //     vatNumber =  offer.deliveryCost * currentVat ;
            //     applyVat = vatNumber / 100;
            //     validatedBody.tax = true
            // }
            // console.log(applyVat)
            
            //المبلغ الأصلي × نسبة الخصم ÷ 100
            let delivary;
            if(order.discountPrice > 0){
                delivary = parseFloat(order.deliveryCharge);
                validatedBody.delivaryCost = delivary;
                // delivary = (offer.deliveryCost - order.discountPrice);
                console.log("discount price ===> ", order.discountPrice);

                taxFromTotal = taxFromTotal - order.discountPrice;

                validatedBody.delivaryCost = delivary;
                user.hasCoupon = false
                user.coupon = 0
            } else {
                delivary = parseFloat(order.deliveryCharge);
                validatedBody.delivaryCost = delivary;
            }
            
            let total = parseInt(validatedBody.cost) + delivary
            
            validatedBody.totalCost = total; //money in bill
            validatedBody.paidCost = Math.ceil(total);//money to paid it 
            
            if (req.file) {
                let image = await handleImg(req)
                validatedBody.img = image;
            }
            let createdbill = await Bill.create({ ...validatedBody});
            order.bill = createdbill.id;
            await order.save();

           
            let addBalance = validatedBody.paidCost - total;
            
            let newBalance = user.balance + addBalance;
            user.balance = parseFloat(newBalance);
            user.addBalance = addBalance;
           
            await user.save();
            sendNotifiAndPushNotifi({
                targetUser: order.client, 
                fromUser: req.user, 
                text: 'وانا',
                subject: createdbill.id,
                subjectType: ' تم ارسال الفاتوره اليك'
            });
            let notif = {
                "description":' your order`s bill has been sent',
                "arabicDescription":'تم ارسال فاتوره الطلب اليك'
            }
            await Notif.create({...notif,resource:req.user,target:order.client,bill:createdbill.id});
            
            let salesMan = await checkExistThenGet(req.user._id, User);
            console.log("debt ==>",salesMan.debt);
            console.log({taxFromTotal})
            salesMan.debt = salesMan.debt + taxFromTotal + parseFloat(vatFromTotal);
            salesMan.balance = salesMan.balance + delivary;
            let acutlueTax = taxValueNumber / 100;
            let plusBalance = delivary - acutlueTax;

            console.log(plusBalance)
            salesMan.delivaryBalance = salesMan.delivaryBalance + plusBalance ;
            await salesMan.save();
            let reports = {
                "action":"Create bill",
            };
            let report = await Report.create({...reports, user: req.user});
            res.status(201).send(createdbill);
        } catch (err) {
            next(err);
        }
    },
    async createStore(req, res, next) {

        try {
            let {orderId,storeId} = req.params;
            // if (req.user.type != 'SALES-MAN')
            //     return next(new ApiError(403, ('sales man auth')));
            let order = await checkExistThenGet(orderId, Order);
            if(order.bill)
                return next(new ApiError(403, ('this order has bill')));
            let store = await checkExistThenGet(storeId, Store);
            const validatedBody = checkValidations(req);
            let user = await checkExistThenGet(order.client, User);
            //الضريبه 
            let tax = await Tax.find({ isDeleted: false }).select("value");
            
            let taxValue = tax[0].value;
            console.log(taxValue);
            let taxValueNumber = store.deliveryCharge * taxValue
            let taxFromTotal = taxValueNumber / 100;
            console.log({taxFromTotal})
            // let option = await Option.find({ isDeleted: false });
            // console.log(option)
			//  const vats = await vat.findById(1);
			//  let currentVat = vats.value;
            // let vatNumber =0
            // let applyVat = 0;
            // if(option[0].enable == true){
            //     vatNumber =  store.deliveryCharge * currentVat ;
            //     applyVat = vatNumber / 100;
            //     validatedBody.tax = true
            // }
            // console.log(applyVat)
            
            //المبلغ الأصلي × نسبة الخصم ÷ 100
            let delivary;
            if(order.discountPrice > 0){
                delivary = store.deliveryCharge;
                validatedBody.delivaryCost = delivary;
                // delivary = (store.deliveryCharge - order.discountPrice);
                console.log("discount price ===> ", order.discountPrice);

                taxFromTotal = taxFromTotal - order.discountPrice;

                validatedBody.delivaryCost = delivary;
                user.hasCoupon = false
                user.coupon = 0
            } else {
                delivary = store.deliveryCharge;
                validatedBody.delivaryCost = delivary;
            }
            
            let total = parseInt(validatedBody.cost) + delivary
            
            validatedBody.totalCost = total; //money in bill
            validatedBody.paidCost = Math.ceil(total);//money to paid it 
            console.log(validatedBody.totalCost)
            if (req.file) {
                let image = await handleImg(req)
                validatedBody.img = image;
            }
            let createdbill = await Bill.create({ ...validatedBody});
            order.bill = createdbill.id;
            await order.save();

           
            let addBalance = validatedBody.paidCost - total;
            
            let newBalance = user.balance + addBalance;
            user.balance = parseFloat(newBalance);
            user.addBalance = addBalance;
           
            await user.save();
            sendNotifiAndPushNotifi({
                targetUser: order.client, 
                fromUser: req.user, 
                text: 'وانا',
                subject: createdbill.id,
                subjectType: ' تم ارسال الفاتوره اليك'
            });
            let notif = {
                "description":' your order`s bill has been sent',
                "arabicDescription":'تم ارسال فاتوره الطلب اليك'
            }
            await Notif.create({...notif,resource:req.user,target:order.client,bill:createdbill.id});
            
            let salesMan = await checkExistThenGet(req.user._id, User);
            console.log("debt ==>",salesMan.debt);
            console.log({taxFromTotal})
            salesMan.debt = salesMan.debt + taxFromTotal;
            salesMan.balance = salesMan.balance + delivary;
            let acutlueTax = taxValueNumber / 100;
            let plusBalance = delivary - acutlueTax;

            console.log(plusBalance)
            salesMan.delivaryBalance = salesMan.delivaryBalance + plusBalance ;
            await salesMan.save();
            let reports = {
                "action":"Create bill",
            };
            let report = await Report.create({...reports, user: req.user});
            res.status(201).send(createdbill);
        } catch (err) {
            next(err);
        }
    },

    async findById(req, res, next) {
        try {
            let { billId } = req.params;
            await checkExist(billId, Bill, { isDeleted: false });
            let bill = await Bill.findById(billId);
            res.send(bill);
        } catch (err) {
            next(err);
        }
    },
    async update(req, res, next) {

        try {
            let user = req.user;
            if (user.type != 'SALES_MAN')
                return next(new ApiError(403, ('sales man auth')));

            let { billId } = req.params;
            await checkExist(billId, Bill, { isDeleted: false });

            const validatedBody = checkValidations(req);
            if (req.file) {
                let image = await handleImg(req, { attributeName: 'img', isUpdate: true });
                validatedBody.img = image;
            }
            let updatedbill = await Bill.findByIdAndUpdate(billId, {
                ...validatedBody,
            }, { new: true });
            let reports = {
                "action":"Update bill",
            };
            let report = await Report.create({...reports, user: user });
            res.status(200).send(updatedbill);
        }
        catch (err) {
            next(err);
        }
    },
    
    async delete(req, res, next) {
        try {
            let user = req.user;
            let { billId } = req.params;
            let bill = await checkExistThenGet(billId, Bill, { isDeleted: false });
            
            bill.isDeleted = true;
            await bill.save();
            let reports = {
                "action":"Delete bill",
            };
            let report = await Report.create({...reports, user: user });
            res.status(204).send('delete success');

        }
        catch (err) {
            next(err);
        }
    },
};
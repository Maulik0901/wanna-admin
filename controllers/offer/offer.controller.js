import { checkExist, checkExistThenGet, isLng, isLat, isArray, isNumeric } from "../../helpers/CheckMethods";
import ApiResponse from "../../helpers/ApiResponse";
import Offer from "../../models/offer/offer.model";
import Order from "../../models/order/order.model";

import { sendNotifiAndPushNotifi } from "../../services/notification-service";
import { body } from "express-validator/check";
import { ValidationError } from "mongoose";
import { checkValidations } from "../shared/shared.controller";
import ApiError from "../../helpers/ApiError";
import User from "../../models/user/user.model";
import Report from "../../models/reports/report.model";
import Notif from "../../models/notif/notif.model"
import Coupon from "../../models/coupon/coupon.model";
const populateQuery = [
    { path: 'order', model: 'order' },
    { path: 'salesMan', model: 'user' }
    
];
function validatedestination(location) {
    if (!isLng(location[0]))
        throw new ValidationError.UnprocessableEntity({ keyword: 'location', message: 'location[0] is invalid lng' });
    if (!isLat(location[1]))
        throw new ValidationError.UnprocessableEntity({ keyword: 'location', message: 'location[1] is invalid lat' });
}

var OfferController = {
    async findAll(req, res, next) {
        try {
            let page = +req.query.page || 1, limit = +req.query.limit || 20
                ,{ accept,order,slaesMan,rejected,isDeleted,isAdmin } = req.query
                , query = {isDeleted: false,rejected: false};
            if(isAdmin){
                query = {};
            }
            if (accept)
                query.accept = accept;
            if (order){
                query.order = order;
            } 
            if (slaesMan){
                query.slaesMan = slaesMan;
            } 
            if (rejected)
                query.rejected = rejected;
            
                        

            let offers = await Offer.find(query).populate(populateQuery)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip((page - 1) * limit);


            const offersCount = await Offer.count(query);
            const pageCount = Math.ceil(offersCount / limit);

            res.send(new ApiResponse(offers, page, pageCount, limit, offersCount, req));
        } catch (err) {
            next(err);
        }
    },
    
    validateCreatedOffers() {
        let validations = [
            body('deliveryCost').not().isEmpty().withMessage('delivery Cost is required'),
            body('destination').not().isEmpty().withMessage('destination is required'),
            body('deliveryTime'),

        ];
        return validations;
    },
            
    async create(req, res, next) {
        try {
            let {orderId} = req.params;
            await checkExist(req.user._id, User);
            const validatedBody = checkValidations(req);
            if (req.user.type != 'SALES-MAN')
            return next(new ApiError(403, ('sales man auth')));
            validatedestination(validatedBody.destination);
            validatedBody.destination = { type: 'Point', coordinates: [+req.body.destination[0], +req.body.destination[1]] };
            
            // let salesManOffers_ = await Offer.find({accept:true,salesMan:data.salesManId,delivered:false});
            // console.log(salesManOffers_)
            // if (salesManOffers_ != null) {
            //     return next(new ApiError(403, ('this sales man have order accepted')));
            // }

            let order = await checkExistThenGet(orderId, Order);
            validatedBody.order = orderId;
            validatedBody.salesMan = req.user;
            validatedBody.createTime = Date.now();
            let createdOffer = await Offer.create({ ...validatedBody});
            let offer = await Offer.populate(createdOffer, populateQuery);
            
            let reports = {
                "action":"Sales Man Create New Offer",
            };
            let report = await Report.create({...reports, user: req.user });
            sendNotifiAndPushNotifi({
                targetUser: order.client, 
                fromUser: req.user._id, 
                text: 'ونا ديليفري',
                subject: offer.id,
                subjectType: 'لديك عرض جديد على طلبك'
            });
            let notif = {
                "description":'You have a You have a new offer on your order',
                "arabicDescription":' لديك عرض جديد على طلبك '

            }
            Notif.create({...notif,resource:req.user._id,target:order.client,offer:offer.id});
        
            
            res.status(201).send(offer);
        } catch (err) {
            next(err);
            
        }
    },
    async addOffer(io, nsp, data) {
        //orderId salesManId  destination  deliveryCost  deliveryTime
       
        let order = await checkExistThenGet(data.orderId, Order);
        var toRoom = 'room-' + data.client; 
        var fromRoom = 'room-' + data.salesManId;
        
        
        // let salesManOffers_ = await Offer.find({accept:true,salesMan:data.salesManId,delivered:false});
        // console.log(salesManOffers_)
        // if (salesManOffers_ != null) {
        //     return next(new ApiError(403, ('this sales man have order accepted')));
        // }
        let validatedBody = {};
        validatedBody.deliveryCost = data.deliveryCost;
        //validatedBody.deliveryTime = data.deliveryTime;
        await checkExist(data.salesManId, User);
        let user = await checkExistThenGet(data.salesManId, User);
        validatedestination(data.destination);
        validatedBody.destination = { type: 'Point', coordinates: [+data.destination[0], +data.destination[1]] };
        validatedBody.order = data.orderId;
        validatedBody.salesMan = data.salesManId;
        //let createdOffer = await Offer.create({ ...validatedBody});
        var query = {
            order: data.orderId,
            isDeleted: false,
            lastOffer: true,
        }

        Offer.updateMany({query}, { lastOffer: false })
            .then(async (result1) => {
                if (io.nsps['/chat'].adapter.rooms[toRoom]) { //لو هو فاتح الروم 
                    validatedBody.delivered = true;//خلى الماسدج وصولها بقى ترو
                }
                let user = await User.findById(data.salesManId);
                validatedBody.createTime = Date.now();
                var offer = new Offer(validatedBody);

                let findOffer = await Offer.findOne({order:data.orderId ,salesMan: data.salesManId,rejected:false,isDeleted:false}); 
                // console.log({findOffer});
                let query = {isDeleted: false,lastOffer: true };
                let myOffer = await Offer.find(query).populate(populateQuery);
                // console.log("=============== order ===========");
                // console.log({order})
                if(!findOffer) {
                    // console.log("========offer not available ========");
                    offer.save()
                        .then(result2 => {
                            // console.log(result2);
                            //دى فانكشن الايمت بتاعه اضافه رساله
                            
                            nsp.to(toRoom).emit('newOffer', myOffer);
                            nsp.to(toRoom).emit('newOffer',{data:result2,salesMan:user,order:order});
                            nsp.to(toRoom).emit('newOffer',{data:myOffer,order:order});
    
                            nsp.to(fromRoom).emit('done', { clientId: data.client });
                            if (io.nsps['/chat'].adapter.rooms[toRoom]){
                                //لو فاتح خلى الماسدج تحصلها ديليفر ويكون اليوزر اون لاين
                                // console.log("client is online ");
                                nsp.to(fromRoom).emit('delivered', { clientId: data.client });
                            }
                            sendNotifiAndPushNotifi({
                                targetUser: data.client, 
                                fromUser: offer.salesMan, 
                                text: 'ونا ديليفري',
                                subject: offer.id,
                                subjectType: 'لديك عرض جديد على طلبك',
                                type: "new offer"
                            });
                            let notif = {
                                "description": 'You have a new offer on your order  ',
                                "arabicDescription":' لديك عرض جديد على طلبك '
                            }
                            Notif.create({...notif,resource:offer.salesMan,target:data.client,offer:offer.id});
                        })
                        .catch(err => {
                            console.log('can not save offer .')
                            console.log(err);
                        });
                } else {
                    
                    Offer.updateOne({_id:findOffer._id},validatedBody)
                        .then(async result2 => {
                            // console.log({result2});
                            //دى فانكشن الايمت بتاعه اضافه رساله                            
                            nsp.to(toRoom).emit('newOffer', myOffer);
                            nsp.to(toRoom).emit('newOffer',{data:result2,salesMan:user,order:order});
                            nsp.to(toRoom).emit('newOffer',{data:myOffer,order:order});
    
                            nsp.to(fromRoom).emit('done', { clientId: data.client });
                            if (io.nsps['/chat'].adapter.rooms[toRoom]){
                                //لو فاتح خلى الماسدج تحصلها ديليفر ويكون اليوزر اون لاين
                                // console.log("client is online ");
                                nsp.to(fromRoom).emit('delivered', { clientId: data.client });
                            }
                            sendNotifiAndPushNotifi({
                                targetUser: data.client, 
                                fromUser: validatedBody.salesMan, 
                                text: 'ونا ديليفري',
                                subject: findOffer._id,
                                subjectType: 'لديك عرض جديد على طلبك',
                                type: "new offer"
                            });
                            let notif = {
                                "description": 'You have a new offer on your order  ',
                                "arabicDescription":' لديك عرض جديد على طلبك '
                            }
                            let findNotification = await Notif.findOne({resource:validatedBody.salesMan,target:data.client,offer:findOffer._id,isDeleted: false});
                            // console.log("====== find Ntification ====================");
                            
                            if(findNotification) {
                                
                                Notif.update({resource:validatedBody.salesMan,target:data.client,offer:findOffer._id},{...notif});
                            }else {
                                
                                Notif.create({...notif,resource:validatedBody.salesMan,target:data.client,offer:findOffer._id});
                            }
                            
                        })
                        .catch(err => {
                            console.log('can not save offer .')
                            console.log(err);
                        });
                }
                
            
            
            }).catch((err) => {
                console.log(err);
            });
    },
    updateLocationSocket(nsp, data) { 
        var offerId = data.offerId || 0;
        var friendId = data.toId || 0;
        var toRoom = 'room-' + friendId;
        // console.log(toRoom)
        let validatedBody = {};
       
        var query1 = {
            _id: offerId
        };
        //let offer = await Offer.find({query1})
        //console.log(offer)
        Offer.updateMany(query1, { currentLocation: data.currentLocation})
            .exec()
            .then(async(result) => {
                nsp.to(toRoom).emit('currentLocation', { offer: result,location:data.currentLocation});
                // console.log("updated");
            })
            .catch((err) => {
                console.log(err);
            });
    },
    async findById(req, res, next) {
        try {
            let {offerId } = req.params;
            let offer = await  Offer.find({_id:offerId});
            res.send(
                offer
            );
        } catch (err) {
            next(err);
        }
    },
    async refuse(req, res, next) {
        try {
            let { offerId } = req.params;
            let offer = await checkExistThenGet(offerId, Offer);
            offer.accept = false;
            offer.rejected = true;
            await offer.save();
            
            sendNotifiAndPushNotifi({
                targetUser: offer.salesMan, 
                fromUser: req.user, 
                text: 'ونا ديليفري',
                subject: offer.id,
                subjectType: 'تم رفض العرض',
                type: 'rejectOffer'
            });
            let notif = {
                "description":'Your offer has been rejected, you can submit an offer at a lower price',
                "arabicDescription":'تم رفض عرضك، يمكنك إرسال عرض بسعر أقل'
            }
            await Notif.create({...notif,resource:req.user,target:offer.salesMan,offer:offer.id});
            res.send(offer);
            
        } catch (error) {
            next(error);
        }
    },
    async accept(req, res, next) {
        try {
            let { offerId } = req.params;
            let offer = await checkExistThenGet(offerId, Offer);
            let order = await checkExistThenGet(offer.order, Order);
            let salesManActiveOrder = await Order.find({salesMan:offer.salesMan,isDeleted:false,systemDeleted:false,systemDeletedWithoutOffer:false,status:{$in:['ON_PROGRESS','RECEIVED','ON_THE_WAY','ARRIVED']}});
            
            if(salesManActiveOrder.length > 0){
                return next(new ApiError(403, ('this salesman already book')));
            }
            if (order.offer)
            return next(new ApiError(403, ('this order have offer')));

            if (offer.isDeleted) {
                return next(new ApiError(403, ('this sales man have order accepted')));
            }

            let salesManOffers_ = await Offer.find({accept:true,salesMan:offer.salesMan,delivered:false});
            // console.log("SalesMan Has Active Offers "+ salesManOffers_)
            // console.log("SalesMan Has Active Offers "+ salesManOffers_ != null)
            // console.log("SalesMan Has Active Offers "+ salesManOffers_.length)
            if (salesManOffers_.length > 0 ){
                return next(new ApiError(403, ('this sales man have order accepted')));
            }
            
            if(order.coupon){
                let findCoupone = await Coupon.findOne({_id:order.coupon});
                console.log({findCoupone});
                if(findCoupone.discountType == "Percentage"){
                    let percentagePrice = (offer.deliveryCost * findCoupone.discount)/100;
                    order.discountPrice = percentagePrice;
                }else {
                    if(offer.deliveryCost <= findCoupone.discount){
                        order.discountPrice = offer.deliveryCost;
                    }else {
                        order.discountPrice = findCoupone.discount;
                    }
                }
                // offer.deliveryCost
                // discountPrice
            }
            order.status = "ON_PROGRESS";
            order.salesMan = offer.salesMan;
            order.accept = true;
            
            order.offer = offerId;
            await order.save();
            
            offer.accept = true;
            offer.delivered = false;
            await offer.save();

            let salesManOffers = await Offer.find({isDeleted:false,salesMan:order.salesMan});
            for (let salesManOffer of salesManOffers ) {
                salesManOffer.isDeleted = true;
                salesManOffer.rejected = true;
                salesManOffer.accept = false;
                salesManOffer.currentLocation = salesManOffer.currentLocation
                await salesManOffer.save();
            }
           
            let user = await checkExistThenGet(order.salesMan, User);
            let newCount = user.tasksCount + 1;
            user.tasksCount = newCount;
            await user.save();
            
            // let salesMans = await Offer.find({isDeleted:false,order:order._id});
            // salesMans.forEach(salesMan => {
            //     console.log(salesMan.salesMan)
            //     if (salesMan.id == order.salesMan.id) {

            //     } else {
            //         sendNotifiAndPushNotifi({////////
            //             targetUser: salesMan.salesMan, 
            //             fromUser: "ونا", 
            //             text: 'ونا ديليفري',
            //             subject: order.id,
            //             subjectType: 'احد مندوبينا حصل على الطلب '
            //         });
            //         let notif = {
            //             "description":'This order will be delivered by another runner',
            //             "arabicDescription":"هذا الطلب سيتم توصيله بواسطة مندوب آخر"
            //         }
            //         Notif.create({...notif,resource:req.user._id,target:salesMan.salesMan,order:order.id});
            //     } 
            // });

            sendNotifiAndPushNotifi({
                targetUser: offer.salesMan, 
                fromUser: req.user, 
                text: 'ونا ديليفري',
                subject: offer.id,
                subjectType: ' تم قبول عرضك',
                type: 'acceptOffer'
            });
            let notif = {
                "description":' Your offer has been accepted',
                "arabicDescription":' تم قبول عرضك'
            }
            await Notif.create({...notif,resource:req.user,target:offer.salesMan,offer:offer.id});
            res.send(offer);
            
        } catch (error) {
            next(error);
        }
    },
    
    async delete(req, res, next) {
        try {
            let { offerId } = req.params;
            let offer = await checkExistThenGet(offerId, Offer);

            offer.isDeleted = true;
            await offer.save();
            let reports = {
                "action":"Delete offer",
            };
            let report = await Report.create({...reports, user: req.user });
            res.status(204).send();
        } catch (error) {
            next(error)
        }
    },
};
module.exports = OfferController;

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
                ,{ accept,order,slaesMan,rejected } = req.query
                , query = {isDeleted: false };

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
            
            let order = await checkExistThenGet(orderId, Order);
            validatedBody.order = orderId;
            validatedBody.salesMan = req.user;
            
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
                "description":'  You have a You have a new offer on your order',
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
        console.log(order.client)
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
            
                var offer = new Offer(validatedBody);

                console.log(offer);
                let query = {isDeleted: false,lastOffer: true };
                let myOffer = await Offer.find(query).populate(populateQuery);
                

                console.log(user)

                offer.save()
                    .then(result2 => {
                        console.log(result2);
                        //دى فانكشن الايمت بتاعه اضافه رساله
                        
                        nsp.to(toRoom).emit('newOffer', myOffer);
                        nsp.to(toRoom).emit('newOffer',{data:result2,salesMan:user,order:order});
                        nsp.to(toRoom).emit('newOffer',{data:myOffer,order:order});

                        nsp.to(fromRoom).emit('done', { clientId: data.client });
                        if (io.nsps['/chat'].adapter.rooms[toRoom]){
                            //لو فاتح خلى الماسدج تحصلها ديليفر ويكون اليوزر اون لاين
                            console.log("client is online ");
                            nsp.to(fromRoom).emit('delivered', { clientId: data.client });
                        }
                        sendNotifiAndPushNotifi({
                            targetUser: data.client, 
                            fromUser: offer.salesMan, 
                            text: 'ونا ديليفري',
                            subject: offer.id,
                            subjectType: 'لديك عرض جديد على طلبك'
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
            
            
            }).catch((err) => {
                console.log(err);
            });
    },
    updateLocationSocket(nsp, data) { 

        var offerId = data.offerId || 0;
        var friendId = data.toId || 0;
        var toRoom = 'room-' + friendId;
        console.log(toRoom)
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
                console.log("updated");
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
                subjectType: 'تم رفض العرض'
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
            if (order.offer)
            return next(new ApiError(403, ('this order have offer')));

            order.status = "ON_PROGRESS";
            order.salesMan = offer.salesMan;
            order.accept = true;
            order.offer = offerId;
            //first message
            await Message.create({to:order.salesMan,from:order.client,content:order.description});
            //second
            let msg2 = {
                to:order.salesMan,
                from:order.client,
                content:'pickup location',
                image:`https://maps.googleapis.com/maps/api/staticmap?size=600x400&language=$lang&markers=color:blue|${order.shopDestination[0]},${order.shopDestination[1]}&key=mapKey`

            }
            await Message.create({...msg2});
             //third
             let msg3 = {
                to:order.salesMan,
                from:order.client,
                content:'delivery location',
                image:`https://maps.googleapis.com/maps/api/staticmap?size=600x400&language=$lang&markers=color:blue|${order.clientDestination[0]},${order.clientDestination[1]}&key=mapKey`

            }
            await Message.create({...msg3});
              //four
              let msg4 = {
                to:order.salesMan,
                from:order.client,
                content:`Welcome! This is ${order.client} from Wanna. I am happy to serve you today, please confirm this order`

            }
            await Message.create({...msg4});
            await order.save();
            
            offer.accept = true;
            await offer.save();
           
            let user = await checkExistThenGet(order.salesMan, User);
            let newCount = user.tasksCount + 1;
            user.tasksCount = newCount;
            await user.save();
            let salesMans = await Offer.find({isDeleted:false,order:order._id});
            console.log(salesMans);
            salesMans.forEach(salesMan => {
                console.log(salesMan.salesMan)
                sendNotifiAndPushNotifi({////////
                    targetUser: salesMan.salesMan, 
                    fromUser: "ونا", 
                    text: 'ونا ديليفري',
                    subject: order.id,
                    subjectType: 'احد مندوبينا حصل على الطلب '
                });
                let notif = {
                    "description":'This order will be delivered by another runner',
                    "arabicDescription":"هذا الطلب سيتم توصيله بواسطة مندوب آخر"
                }
                Notif.create({...notif,resource:req.user._id,target:salesMan.salesMan,order:order.id});
            });

            sendNotifiAndPushNotifi({
                targetUser: offer.salesMan, 
                fromUser: req.user, 
                text: 'ونا ديليفري',
                subject: offer.id,
                subjectType: ' تم قبول عرضك'
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

import { checkExist,checkCouponExist, checkExistThenGet, isLng, isLat} from "../../helpers/CheckMethods";
import ApiResponse from "../../helpers/ApiResponse";
import Order from "../../models/order/order.model";
import { sendNotifiAndPushNotifi } from "../../services/notification-service";
import { body } from "express-validator/check";
import { ValidationError } from "mongoose";
import { handleImg, checkValidations } from "../shared/shared.controller";
import ApiError from "../../helpers/ApiError";
import User from "../../models/user/user.model";
import Report from "../../models/reports/report.model";
import Notif from "../../models/notif/notif.model"
import Coupon from "../../models/coupon/coupon.model"
import Bill from "../../models/bills/bill.model"
import Debt from "../../models/debt/debt.model"

const populateQuery = [
    { path: 'client', model: 'user' },
    { path: 'salesMan', model: 'user' },
    { path: 'bill', model: 'bill' },
    { path: 'offer', model: 'offer' },

    
];
function validatedestination(location) {
    if (!isLng(location[0]))
        throw new ValidationError.UnprocessableEntity({ keyword: 'location', message: 'location[0] is invalid lng' });
    if (!isLat(location[1]))
        throw new ValidationError.UnprocessableEntity({ keyword: 'location', message: 'location[1] is invalid lat' });
}

var OrderController = {
    async findOrders(req, res, next) {
        try {
            let page = +req.query.page || 1, limit = +req.query.limit || 20
                ,{ status,client,salesMan,accept } = req.query
                , query = {isDeleted: false };

            if (status)
                query.status = status;
            if (client){
                query.client = client;
            } 
            if (salesMan){
                query.salesMan = salesMan;
            } 
            if (accept){
                query.accept = accept;
            } 
            let orders = await Order.find(query).populate(populateQuery)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip((page - 1) * limit);


            const ordersCount = await Order.count(query);
            const pageCount = Math.ceil(ordersCount / limit);

            res.send(new ApiResponse(orders, page, pageCount, limit, ordersCount, req));
        } catch (err) {
            next(err);
        }
    },
    validateCreated() {
        let validations = [
           body('clientDestination').not().isEmpty().withMessage('client Destination is required'),
           body('shopDestination').not().isEmpty().withMessage('shop Destination is required'),
            body('description').not().isEmpty().withMessage('description is required'),
            body('time').not().isEmpty().withMessage('delivery time is required'),
            body('img').optional().custom(val => isImgUrl(val)).withMessage('img should be a valid img'),
            body('shopName'),
            body('couponNumber')

        ];
        return validations;
    },
            
    async create(req, res, next) {
        try {
            await checkExist(req.user._id, User);
            const validatedBody = checkValidations(req);
             
            validatedBody.client = req.user._id
            validatedestination(validatedBody.clientDestination);
            validatedBody.clientDestination = [+req.body.clientDestination[0], +req.body.clientDestination[1]] 
            
            validatedestination(validatedBody.shopDestination);
            validatedBody.shopDestination = [+req.body.shopDestination[0], +req.body.shopDestination[1]];
            if(req.file){
                let image = await handleImg(req);
                validatedBody.img = image
            }
            console.log(req.file)
            console.log(validatedBody)
            let createdOrder = await Order.create({ ...validatedBody});
            let user = await checkExistThenGet(req.user._id, User);

            if(validatedBody.couponNumber){
                await checkCouponExist(validatedBody.couponNumber, Coupon, { isDeleted: false,end:false });
                let coupon = await Coupon.find({isDeleted:false,end:false,couponNumber:validatedBody.couponNumber});
                if(coupon ){
                    user.hasCoupon = true;
                    user.coupon = coupon[0]._id;
                    await user.save();
                }
                if(coupon === "undefined"){
                    return next(new ApiError(403, ('invalid coupon')))
                }
            }
            let order = await Order.populate(createdOrder, populateQuery);
            let reports = {
                "action":"Create New Order",
            };
            let report = await Report.create({...reports, user: req.user });
            let users = await User.find({'type':'SALES-MAN'});
            users.forEach(user => {
                sendNotifiAndPushNotifi({////////
                    targetUser: user.id, 
                    fromUser: req.user._id, 
                    text: 'ونا ديليفري',
                    subject: createdOrder.id,
                    subjectType: 'هناك طلب جديد'
                });
                let notif = {
                    "description": req.user.username + ' You have a New order',
                    "arabicDescription": req.user.username + " "
                }
                Notif.create({...notif,resource:req.user._id,target:user.id,order:createdOrder.id});
            });
            
            res.status(201).send(order);
        } catch (err) {
            next(err); 
        }
    }, 
    async addOrder(socket,data,nsp){
        var userId = data.userId
        var orderData = { //شكل الداتا 
            clientDestination: data.clientDestination,
            shopDestination: data.shopDestination,
            description: data.description,
            time: data.time ,
            client:data.userId 
        }
        console.log(userId)
       console.log(orderData);
        if (data.img != null) {
            orderData.img = data.img;
        }
        if (data.shopName != null) {
            orderData.shopName = data.shopName;
        }
        if (data.coupon != null) {
            orderData.coupon = data.coupon;
        }
        if (data.modal != null) {
            orderData.modal = data.modal;
        }
        var order = new Order(orderData);    
        let reports = {
            "action":"Create New Order",
        };
        let report = Report.create({...reports, user: data.userId  });
        let dept = await Debt.find({ isDeleted: false }).select("value");
        console.log(dept)
        let debtValue = dept[0].value;
        order.save()
        .then(async (data1) => {
            
            if(data.modal != null){
                let value =parseInt(data.modal);
                let salesMans = await User.find({type:"SALES-MAN",notif:true,manufacturingYear: { $gte: value},debt: { $lte: debtValue}});
                console.log(salesMans)
                salesMans.forEach(user => {
                    var toRoom = 'room-' + user.id; 
                    nsp.to(toRoom).emit('newOrder', {data:data1});
                })
                User.find({'type':'SALES-MAN',notif:true,manufacturingYear: { $gte: value},debt: { $lte: debtValue}})
                .then((data) => {
                    data.map(function (element) {
                        console.log(element)
                        sendNotifiAndPushNotifi({////////
                            targetUser: element.id, 
                            fromUser: data.userId, 
                            text: 'ونا ديليفري',
                            subject: data1._id,
                            subjectType: 'طلب جديد'
                        });
                        let notif = {
                            "description":'New order',
                            "arabicDescription":"طلب جديد"
                        }
                        Notif.create({...notif,resource:data.userId,target:element.id,order:data1._id});
                    })
                
                })
                .catch(err => {
                    next(err);
                })
            } else{
                //socket.emit('newOrder', {data:data1});
                let salesMans = await User.find({type:"SALES-MAN",notif:true,debt: { $lte: debtValue}});
                console.log(salesMans)
                salesMans.forEach(user => {
                    var toRoom = 'room-' + user.id; 
                    nsp.to(toRoom).emit('newOrder', {data:data1});
                })
                User.find({'type':'SALES-MAN',notif:true,debt: { $lte: debtValue}})
                .then((data) => {
                    data.map(function (element) {
                        console.log(element)
                        sendNotifiAndPushNotifi({////////
                            targetUser: element.id, 
                            fromUser: data.userId, 
                            text: 'ونا ديليفري',
                            subject: data1._id,
                            subjectType: 'طلب جديد'
                        });
                        let notif = {
                            "description":'New order',
                            "arabicDescription":"طلب جديد"
                        }
                        Notif.create({...notif,resource:data.userId,target:element.id,order:data1._id});
                    })
                
                })
                .catch(err => {
                    next(err);
                })
            }
            //socket.emit('newOrder', {data:data1});
          
        })
        .catch((err)=>{
            console.log(err)
        });
    },

    async findById(req, res, next) {
        try {
            let {orderId } = req.params;
            res.send(
                await checkExistThenGet(orderId, Order, { isDeleted: false, populate: populateQuery })
            );
        } catch (err) {
            next(err);
        }
    },
    async cancel(req, res, next) {
        try {
            let { orderId } = req.params;
            let order = await checkExistThenGet(orderId, Order);
           /* if (['RECEIVED','ON_THE_WAY','ARRIVED', 'DELIVERED'].includes(order.status))
                next(ApiError(400, 'status should be "PENDING" to delete this order'));*/
            order.status = 'CANCEL';
            let reports = {
                "action":"User cancel order",
            };
            let report = await Report.create({...reports, user: req.user });
            if(req.user.type =='CLIENT'){
                sendNotifiAndPushNotifi({
                    targetUser: order.salesMan, 
                    fromUser: req.user._id, 
                    text: 'ونا ديليفري',
                    subject: order.id,
                    subjectType: 'تم إلغاء الطلب'
                });
                let notif = {
                    "description":'The order has been canceled',
                    "arabicDescription":"تم إلغاء الطلب"
                }
                await Notif.create({...notif,resource:req.user,target:order.salesMan,order:order.id});
            } else{
                sendNotifiAndPushNotifi({
                    targetUser: order.client, 
                    fromUser: req.user, 
                    text: 'ونا ديليفري',
                    subject: order.id,
                    subjectType: 'تم الغاء العرض المقدم من المندوب، سيتم إرسال عروض جديدة على طلبك'
                });
                let notif = {
                    "description": ' The offer has been canceled by the runner, new offers will be sent on your order',
                    "arabicDescription":"تم الغاء العرض المقدم من المندوب، سيتم إرسال عروض جديدة على طلبك"
                }
                await Notif.create({...notif,resource:req.user,target:order.client,order:order.id});
                order.status = 'PENDING';
               
            }
		    if(req.user._id == order.client){
                order.status = 'CANCEL';
                sendNotifiAndPushNotifi({
                    targetUser: order.salesMan, 
                    fromUser: req.user._id, 
                    text: 'ونا ديليفري',
                    subject: order.id,
                    subjectType: 'تم إلغاء الطلب'
                });
                let notif = {
                    "description":'The order has been canceled',
                    "arabicDescription":"تم إلغاء الطلب"
                }
                await Notif.create({...notif,resource:req.user,target:order.salesMan,order:order.id});
            }
            await order.save();
            res.send('User cancel order');
            
        } catch (error) {
            next(error);
        }
    },
    async receive(req, res, next) {
        try {
            let { orderId } = req.params;
            let order = await checkExistThenGet(orderId, Order);
            if (['PENDING','CANCEL','ON_THE_WAY','ARRIVED', 'DELIVERED'].includes(order.status))
                next(ApiError(400, 'status should be "ON_PROGRESS" to delete this order'));
            order.status = 'RECEIVED';
            await order.save();
//            sendNotifiAndPushNotifi({
//                targetUser: order.client, 
//                fromUser: req.user, 
//                text: 'ونا ديليفري',
//                subject: order.id,
//                subjectType: ' order has been received'
//            });
//            let notif = {
//                "description": ' received your order',
//                "arabicDescription": + "تم استلام طلبك  "
//" تم استلام طلبك بواسطة " + req.user.username 
//            }
//            await Notif.create({...notif,resource:req.user,target:order.client,order:order.id});
            res.send(order);
            
        } catch (error) {
            next(error);
        }
    },
    async onTheWay(req, res, next) {
        try {
            let { orderId } = req.params;
            let order = await checkExistThenGet(orderId, Order);
            if (['PENDING','CANCEL','ON_PROGRESS','ARRIVED', 'DELIVERED'].includes(order.status))
                next(ApiError(400, 'status should be "RECEIVED" to delete this order'));
            order.status = 'ON_THE_WAY';
            await order.save();
            sendNotifiAndPushNotifi({
                targetUser: order.client, 
                fromUser: req.user, 
                text: 'ونا ديليفري',
                subject: order.id,
                subjectType: 'المندوب في الطريق إليك'
            });
            let notif = {
                "description": 'Runner on the way',
                "arabicDescription": "المندوب في الطريق إليك"
            }
            await Notif.create({...notif,resource:req.user,target:order.client,order:order.id});
            res.send(order);
            
        } catch (error) {
            next(error);
        }
    },
    async arrived(req, res, next) {
        try {
            let { orderId } = req.params;
            let order = await checkExistThenGet(orderId, Order);
            if (['PENDING','CANCEL','ON_PROGRESS','RECEIVED','DELIVERED'].includes(order.status))
                next(ApiError(400, 'status should be "ON_THE_WAY" to delete this order'));
            order.status = 'ARRIVED';
            await order.save();
            sendNotifiAndPushNotifi({
                targetUser: order.client, 
                fromUser: req.user, 
                text: 'ونا ديليفري',
                subject: order.id,
                subjectType: 'مندوبنا وصل اليك'
            });
            let notif = {
                "description":'Runner arrived',
                "arabicDescription": "المندوب وصل إلى الموقع"
                //"المندوب وصل إلى الموقع " + req.user.username 
            }

            await Notif.create({...notif,resource:req.user,target:order.client,order:order.id});
            let user = await checkExistThenGet(order.client, User);

            sendNotifiAndPushNotifi({
                targetUser: order.client, 
                fromUser: "ونا", 
                text: 'ونا ديليفري',
                subject: order.id,
                subjectType: user.addBalance +' اضيف الى حسابك'
            });
            let notiff = {
                "description": user.addBalance +' ',
                "arabicDescription": user.balance + " إلى حسابك رصيدك الحالي هو "+ user.addBalance +" تم إضافة "
            }
            await Notif.create({...notiff,resource:req.user,target:order.client,order:order.id});
            res.send(order);
            
        } catch (error) {
            next(error);
        }
    },
    async delivered(req, res, next) {
        try {
            let { orderId } = req.params;
            let order = await checkExistThenGet(orderId, Order);
            if (['PENDING','CANCEL','ON_PROGRESS','RECEIVED','ON_THE_WAY'].includes(order.status))
                next(ApiError(400, 'status should be "ARRIVED" to delete this order'));
            order.status = 'DELIVERED';
            await order.save();
            let user = await checkExistThenGet(req.user._id, User);
            user.hasCoupon = false;
            await user.save();
            sendNotifiAndPushNotifi({
                targetUser: order.client, 
                fromUser: req.user, 
                text: 'ونا ديليفري',
                subject: order.id,
                subjectType: 'تم توصيل طلبك'
            });
            let notif = {
                "description": 'Your order has been delivered ',
                "arabicDescription": " تم توصيل طلبك "
            }
            await Notif.create({...notif,resource:req.user,target:order.client,order:order.id});
            let reports = {
                "action":"Order Deliverd",
            };
            let report = await Report.create({...reports, user: req.user });
            res.send(order);
            
        } catch (error) {
            next(error);
        }
    },
    async rate(req, res, next) {
        try {
            let { orderId } = req.params;
            let order = await checkExistThenGet(orderId, Order);
            order.rate = req.body.rate;
            order.rateText = req.body.rateText;
            await order.save();
            let user = await checkExistThenGet(order.salesMan, User);
            let newRate = user.rate + req.body.rate;
            user.rate = newRate;
            let totalDegree = user.tasksCount * 5; //عدد التاسكات فى الدرجه النهائيه
            console.log(totalDegree)
            let degree = newRate * 100
            console.log(degree)
            user.ratePercent = degree / totalDegree;
            await user.save();
            sendNotifiAndPushNotifi({
                targetUser: order.salesMan, 
                fromUser: req.user, 
                text: 'ونا ديليفري',
                subject: order.id,
                subjectType: 'تم تقييم خدمتك'
            });
            let notif = {
                "description":'User rate your service',
                "arabicDescription":"تم تقييم خدمتك"
            }
            await Notif.create({...notif,resource:req.user,target:order.salesMan,order:order.id});
            res.send(order);
            
        } catch (error) {
            next(error);
        }
    },
    async payFromBalance(req,res,next){
        try{
            let {orderId} = req.params;
            let order = await checkExistThenGet(orderId, Order);
                order.paidFromBalance = true
                await order.save();
            let client = await checkExistThenGet(order.client, User);
            let bill = await checkExistThenGet(order.bill, Bill);
            let newBalance =  client.balance - Math.floor(client.balance)
            
            let reduceBalance = Math.floor(client.balance);
            let paidFromBill = bill.paidCost - Math.floor(client.balance)

            client.balance = newBalance
                await client.save();

            sendNotifiAndPushNotifi({
                targetUser: order.client, 
                fromUser: "ونا", 
                text: 'ونا ديليفري',
                subject: order.id,
                subjectType: reduceBalance +' خصم من رصيدك'
            });
            let notif = {
                "description": reduceBalance +' take from your balance',
                "arabicDescription": newBalance + " من رصيدك، رصيدك الحالي هو"+ reduceBalance +"  "
            }
            await Notif.create({...notif,resource:req.user,target:order.client,order:order.id});
            let user = await checkExistThenGet(req.user._id, User);
            let newSBalance = user.balance + Math.floor(client.balance)
                user.balance = newSBalance
                await user.save();

            sendNotifiAndPushNotifi({
                targetUser: req.user, 
                fromUser: "ونا", 
                text: 'new notification',
                subject: order.id,
                subjectType: reduceBalance +' اضيف الى رصيدك'
            });
            let notiff = {
                "description": reduceBalance +' ',
                "arabicDescription": newSBalance + " إلى حسابك رصيدك الحالي هو "+ reduceBalance +" تم إضافة "
            }
            await Notif.create({...notiff,resource:order.client,target:req.user,order:order.id});

            res.status(200).send({
                paidFromBill:paidFromBill,
            });
        } catch(err){
            next(err)
        }
    },
    async delete(req, res, next) {
        try {
            let { orderId } = req.params;
            let order = await checkExistThenGet(orderId, Order);
            
            order.isDeleted = true;
            await order.save();
            let reports = {
                "action":"Delete Order",
            };
            let report = await Report.create({...reports, user: req.user });
            res.status(204).send();
        } catch (error) {
            next(error)
        }
    },
    async uploadImage(req, res, next) {
        try {
            let image = await handleImg(req);
            console.log(req.file)
            console.log(image)
            
            res.send(image);
            } catch (error) {
            next(error)
        }
    },
    async checkCoupon(req, res, next) {
        try {
            let user = await checkExistThenGet(req.user._id, User);
            await checkCouponExist(req.body.couponNumber, Coupon, { isDeleted: false,end:false });

            let coupon = await Coupon.find({isDeleted:false,end:false,couponNumber:req.body.couponNumber})
            console.log(coupon)
            if(coupon ){
                user.hasCoupon = true;
                user.coupon = coupon[0]._id;
                await user.save();
            }

            res.send(coupon);
            } catch (error) {
            next(error)
        }
    },
    async checkDistance(req, res, next) {
        try {
            let distance = await Distance.find({isDeleted:false})
            console.log(distance)
            if(distance ){
                
            }

            res.send(distance);
            } catch (error) {
            next(error)
        }
    },
    async checkActive(nsp, data) { 

        var userId = data.userId;
        var toRoom = 'room-' + userId;
        console.log(toRoom)
        let dept = await Debt.find({ isDeleted: false }).select("value");
        console.log(dept)
        let debtValue = dept[0].value;
        let user = await checkExistThenGet(data.userId, User);
        if(user.debt < debtValue){
            nsp.to(toRoom).emit('active', { myuser: user,message:'you are active'});
        } else{
            nsp.to(toRoom).emit('active', { myuser: user,message:'you are dis-active please pay your dept '});
        }
        if(user.block == true){
            nsp.to(toRoom).emit('active', { myuser: user,message:'you are blocked'});
        }
        if(user.isDeleted == true){
            nsp.to(toRoom).emit('active', { myuser: user,message:'you are  isDeleted'});
        }
        if(user.block == false){
            nsp.to(toRoom).emit('active', { myuser: user,message:'you are not blocked'});
        }
       
        
    },
};
module.exports = OrderController;

import ApiError from "../../helpers/ApiError";
import User from "../../models/user/user.model";
import Report from "../../models/reports/report.model";
import Notif from "../../models/notif/notif.model"
import Order from "../../models/order/order.model";
import { sendNotifiAndPushNotifi } from "../notification-service";
import Offer from "../../models/offer/offer.model";
let moment = require("moment");

const populateQuery = [
    { path: 'order', model: 'order' },
    { path: 'salesMan', model: 'user' }
];

let CronJob = require('cron').CronJob;

let job = new CronJob('0 */1 * * * *',cancelOrder);

async function cancelOrder(){
    console.log('My First Cron Job task run at: '+new Date());
    let order = await Order.find({status:"PENDING",isDeleted:false,accept:false,systemDeleted:false,storeID: null}).populate([{ path: 'client', model: 'user' }]);
    let orderArray = [];
    // console.log({order})
    for(let i=0;i<order.length;i++){
        orderArray.push(order[i]._id);
    }
    let time = 5;
    // let time = 60;
    let findOfferParams = { 
        order:{$in:orderArray},
        accept: false,rejected: false,isDeleted: false,
        createTime:{$lte: moment().subtract(time, 'minutes')}
        
    }
    let findOffer = await Offer.find(findOfferParams).populate(populateQuery);

    let uniqOffer = [];
    let deleteOrderId = [];
    findOffer.filter(function(item){
        var i = uniqOffer.findIndex(x => (x.order._id == item.order._id));
        if(i <= -1){
            uniqOffer.push(item);
            deleteOrderId.push(item.order._id)
        }
        return null;
    });
    
    let orderDeleted = await Order.update({_id:{$in:deleteOrderId}},{systemDeleted:true,isDeleted:true})
    // console.log({orderDeleted})

    // sendNotification 

    // findOffer.forEach((offer)=>{        
    //     if(offer.order.client && offer.salesMan){
    //         sendNotifiAndPushNotifi({////////
    //             targetUser: offer.salesMan._id, 
    //             fromUser: offer.order.client, 
    //             text: 'ونا ديليفري',
    //             subject: "",
    //             subjectType: 'نعتذر، لايمكن خدمتك الان، يمكنك إعادة ارسال الطلب مرة أخرى لاحقاً.',
    //             type: "orderCancelBySystem"
    //         });
    //         let notif = {
    //             "description":'We apologize, we cannot serve you now, you can resend the request again later.',
    //             "arabicDescription":"نعتذر، لايمكن خدمتك الان، يمكنك إعادة ارسال الطلب مرة أخرى لاحقاً."
    //         }
    //         Notif.create({...notif,resource:offer.order.client,target:offer.salesMan._id,order:offer.order._id});
    //     }else{
    //         console.log({offer})
    //     }        
    // })

    // deleteOrderId    
    let deletedOrderData = []
    await order.forEach(async orderMainData =>{
        deleteOrderId.forEach(x => {
            if(x == orderMainData._id){
                // console.log(orderMainData._id)
                deletedOrderData.push(orderMainData);
            }
        });        
    });

    // console.log({deletedOrderData})
    deletedOrderData.forEach((order)=>{
        // console.log({offer})
        if(order.client){
            sendNotifiAndPushNotifi({////////
                targetUser: order.client._id, 
                fromUser: order.client._id, 
                text: 'ونا ديليفري',
                subject: "",
                subjectType: 'تم الغاء طلبك لعدم قبولك لعروض المناديب، يمكنك الطلب مره اخرى',
                type: "orderCancelBySystem"
            });
            let notif = {
                "description":'Your order has been canceled because you didn’t accept any offer, you can send new order anytime.',
                "arabicDescription":"تم الغاء طلبك لعدم قبولك لعروض المناديب، يمكنك الطلب مره اخرى"
            }
            Notif.create({...notif,resource:order.client._id,target:order.client._id,order:order._id});
        }        
    })
}


export default job.start();
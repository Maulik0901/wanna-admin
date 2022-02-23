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

let job = new CronJob('0 */1 * * * *',orderExpire);

async function orderExpire(){
    console.log('order expire Job task run at: '+new Date());
    let time = 10;
    // let time = 60;
    let findOrderQuery = {
        status:"PENDING",
        isDeleted:false,accept:false,systemDeleted:false,
        createTime:{$lte: moment().subtract(time, 'minutes')},
        storeID: null
    }
    let order = await Order.find(findOrderQuery).populate([{ path: 'client', model: 'user' }]);
    let orderArray = [];
    // console.log({order})
    for(let i=0;i<order.length;i++){
        orderArray.push(order[i]._id);
    }

    console.log({orderArray});
        
    let findOfferParams = { 
        order:{$in:orderArray},
        // accept: false,
        rejected: false,isDeleted: false,
        // createdAt:{$lte: moment().subtract(10, 'minutes')}
    }

    let findOffer = await Offer.find(findOfferParams).populate(populateQuery);

    let uniqOffer = [];
    let offerAvaileOrder = [];
    findOffer.filter(function(item){
        var i = uniqOffer.findIndex(x => (x.order._id == item.order._id));
        if(i <= -1){
            uniqOffer.push(item);
            offerAvaileOrder.push(item.order._id)
        }
        return null;
    });
   
    console.log({offerAvaileOrder})
    // offerAvaileOrder        
    await order.forEach(async (orderMainData,j) =>{          
        for(let i=0;i<offerAvaileOrder.length;i++){
            if(offerAvaileOrder[i] == orderMainData._id){
                order.splice(j,1);
            }
        }      
    });

    let deleteOrder = [];
    await order.forEach(async order => {
        deleteOrder.push(order._id)
    })
    
    await Order.update({_id:{$in:deleteOrder}},{isDeleted:true,systemDeletedWithoutOffer:true})
    order.forEach((order)=>{
        // console.log({offer})
        if(order.client){
            // console.log(order.client)
            sendNotifiAndPushNotifi({
                targetUser: order.client._id, 
                fromUser: order.client._id, 
                text: 'ونا ديليفري',
                subject: "",
                subjectType: 'نعتذر، لايمكن خدمتك الان، يمكنك إعادة ارسال الطلب مرة أخرى لاحقاً.',
                type: "orderCancelBySystem"
            });
            let notif = {
                "description":'We apologize, we cannot serve you now, you can resend the request again later.',
                "arabicDescription":"نعتذر، لايمكن خدمتك الان، يمكنك إعادة ارسال الطلب مرة أخرى لاحقاً."
            }
            Notif.create({...notif,resource:order.client._id,target:order.client._id,order:order._id});
        }        
    })
}


export default job.start();
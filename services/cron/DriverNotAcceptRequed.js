import ApiError from "../../helpers/ApiError";
import User from "../../models/user/user.model";
import Notif from "../../models/notif/notif.model"
import Order from "../../models/order/order.model";
import OrdersSettings from "../../models/settings/ordersSettings.modal";
import { sendNotifiAndPushNotifi } from "../notification-service";
import NotificationMessage from '../../models/notifyMessage/notifyMessage';
import config from "../../config";
let moment = require("moment");

const populateQuery = [
    { path: 'order', model: 'order' },
    { path: 'salesMan', model: 'user' }
];

let CronJob = require('cron').CronJob;

let job = new CronJob('0 */1 * * * *',orderExpire);

async function orderExpire(){
    console.log('DriverNotAcceptRequed: '+new Date());
    let time = 1;
    
    // let time = 60;
    let findOrderQuery = {
        status:"READY_FOR_DELIVER",
        isDeleted:false,
        updateTime:{$lte: moment().subtract(time, 'minutes')},
        isAllDriverSendNotification: false        
    }
    let order = await Order.find(findOrderQuery);
    
    
    console.log({order})
    if(order.length >0){

        let orderArray = [];
    
        for(let i=0;i<order.length;i++) {
            orderArray.push(order[i].id);
        }

        console.log({orderArray})
        await Order.updateMany({_id: {$in: orderArray}},{isAllDriverSendNotification: true}); 

        String.prototype.interpolate = function(params) {
            let template = this
            for (let key in params) {
                template = template.replace(new RegExp('\\$\\{' + key + '\\}', 'g'), params[key])
            }
            return template
        }

       

        let getNewMessage = await NotificationMessage.findOne({type: 'Store-driver',createdBy: order.createdBy,isDeleted: false});
        let sendMessageNewER = `New Order Request`;
        let sendMessageNewAR = `New Order Request`;
        let ifSendMessaeNew = true;
        if(getNewMessage){       
            ifSendMessaeNew = getNewMessage.isNotify
        }

        if(ifSendMessaeNew){

            order.forEach(async (order) => {
                let orederSetting = await OrdersSettings.findOne({
                    createdBy: order.createdBy,
                });
        
                let findUsers = await User.aggregate([        
                    {
                        $match: {
                            type: "SALES-MAN",
                            isDeleted: false,
                            createdBy: order.createdBy,
                            orderMoney: { $lte: orederSetting.maxCaseBalance ? orederSetting.maxCaseBalance : 1000 },
                        },
                    },
                ]);

                if(getNewMessage){                
                    sendMessageNewAR = getNewMessage.arText.interpolate({id: order._id})                
                    sendMessageNewER = getNewMessage.text.interpolate({id: order._id})                
                }

                findUsers.forEach((user) => {
                    
                    sendNotifiAndPushNotifi({
                        ////////
                        targetUser: user._id,
                        fromUser: order.client,
                        text: user.language && user.language == 'ar' ? sendMessageNewAR :sendMessageNewER,
                        subject: order._id,
                        subjectType: user.language && user.language == 'ar' ? sendMessageNewAR :sendMessageNewER,
                        type: "Store-driver",
                        bundelID: config.iosBundelID.driverApp,
                        orderID: order._id,
                        orderStatus: "READY_FOR_DELIVER",
                    });            
                });
            })

            
        }
    }
    
    
}


export default job.start();
import { sendPushNotification } from './push-notification-service';
import { sendIosPushNotifi } from './apn-notification-service';
import NotificationTokens from '../models/notification/notification-token.modal'

/**
 * @param {Object} notifi
 * @param {number} notifi.targetUser
 * @param {number} notifi.fromUser
 * @param {string} notifi.text
 * @param {number} notifi.subject
 * @param {string} notifi.subjectType
 * @param {string} title
 */
export async function sendNotifiAndPushNotifi(notifi, title = 'اشعار جديد') {
    try {
        let findUserToken = null;
        console.log("=================")
        console.log("Call notification")
        console.log("=================")
        findUserToken = await NotificationTokens.findOne({userID : notifi.targetUser})
        if(findUserToken){
            console.log("=================")
            console.log({notifi})
            console.log("Token ===>",findUserToken.deviceToken)
            if(findUserToken.deviceType == "I"){
                await sendIosPushNotifi(findUserToken.deviceToken,notifi,title)
            }else{
                await sendPushNotification(notifi, title,findUserToken.deviceToken);
            }
        }       
             
    }
    catch (err) {
        console.log('Notifi Err: ', err);
    }
}

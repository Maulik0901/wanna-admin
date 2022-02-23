import ApiSuccess from '../../helpers/ApiSuccess';
import NotificationTokens from '../../models/notification/notification-token.modal'
const apn = require('apn');
export default {    

    async createOrUpdate({userID,deviceToken,deviceType,isToclearToken=false}){

        console.log('Inside here ');

            let response = {
                status : true,
                message : '',
                data : {}
            }

            if(!isToclearToken && !['A','I'].includes(deviceType)){
                response.status = false;
                response.message = 'Invalid deviceType'
                return response;
            }

        try{            
    
            let data = {
                userID : userID,
                deviceToken : isToclearToken ? '' :  deviceToken,
            }

            if(!isToclearToken){
                data.deviceType = deviceType
            }
            
            let record = await NotificationTokens.updateOne(
                {userID: userID},
                data
            );
    
            if((!record || record.n <=0 ) && !isToclearToken){
                record = await NotificationTokens.create(data);
            } 

            response.status = true;
            response.message = 'Success'
            response.data = record;
            return response;

        }catch(err){
            response.status = false;
            response.message = 'In Catch'
            response.data = err;
            return response;
        }

    }


};
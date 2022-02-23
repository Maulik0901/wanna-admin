import * as admin from 'firebase-admin';
import User from '../models/user/user.model';

const serviceAccount = require('../service-account.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://wanna-2924c.firebaseio.com"
});

export async function sendPushNotification(notifi, title,deviceToken) {
   // console.log('======================send push notification function calll ============');
    //console.log({notifi});
    let tokens = deviceToken;   
    
    
    // if (user.token.length >= 1) {
       
        // let tokens = user.token;
    
        
        let payload = {
            data: {
                title: '',
                // title: notifi.text,
                sound: 'wannaapp',
                //icon: notifi.subject.toString(),
                //icon: 'https://www.appwanna.com:8080/uploads/Icon.png',
                body: notifi.subjectType
            },
        }

        if (notifi.subjectType === '') {
            payload.data.sound = '';
        }

        if (notifi.type) {
            payload.data['type'] = notifi.type;
        }
        if(notifi.image){
            payload.data['image'] = notifi.image;
        }
        if(notifi.orderID){
            payload.data['orderID'] = notifi.orderID;
        }
        if(notifi.orderStatus){
            payload.data['orderStatus'] = notifi.orderStatus;
        }
        
        if (tokens && tokens.length >= 1) {
            console.log('TOKENS : ', tokens);
            
            let options = {
              priority: 'high',        
            };
	
            admin.messaging().sendToDevice(tokens, payload,options)
                .then(response => {
                    console.log('Successfully sent a message')//, response);
                })
                .catch(error => {
                    console.log('Error sending a message:', error);
                });
        }
    // }

}

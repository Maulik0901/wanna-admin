const apn = require('apn');
var fs = require('fs');
import config from '../config';
/**
 * @param {Object} notifi
 * @param {number} notifi.targetUser
 * @param {number} notifi.fromUser
 * @param {string} notifi.text
 * @param {number} notifi.subject
 * @param {string} notifi.subjectType
 * @param {string} title
 */
export async function sendIosPushNotifi(deviceToken,notifi,targetUser) {
    try {
        
        let options = {
            token: {
              key: fs.readFileSync(__dirname+`/AuthKey_QCGFYKXKFW.p8`),
              keyId: "QCGFYKXKFW",
              teamId: "4QXS423467"
            },
            production: true
        };
        
        let apnProvider = new apn.Provider(options);

        let note = new apn.Notification();
    
        note.alert = notifi.subjectType;//\uD83D\uDCE7 \u2709
        let payload = {};

        note.topic = notifi.bundelID;

        note.sound = 'default';
        
        note.aps["mutable-content"]  = 1;
        if(notifi.bundelID == config.iosBundelID.storeApp){
            note.sound = 'storesound.mp3';
        }

        if(notifi.bundelID == config.iosBundelID.customerApp){
            note.sound = 'usersound.mp3';
        }

        if(notifi.title){
            // note.alert = notifi.subjectType;
            note.aps.alert = {
                title: notifi.title,
                subtitle: notifi.subjectType
            }
        }

        if(notifi.bundelID == config.iosBundelID.driverApp){
            note.sound = 'driversound.mp3';
        }
        
        if (notifi.type) {
            payload.type = notifi.type;
        }

        if(notifi.image){
            payload.image = notifi.image;
            
        }

        if(notifi.orderID){
            payload['orderID'] = notifi.orderID;
        }

        if(notifi.orderStatus){
            payload['orderStatus'] = notifi.orderStatus;
        }

        note.payload = payload;
        console.log({note})
        apnProvider.send(note, deviceToken).then( (result) => {
            console.log(result)
            console.log(result.sent)
            console.log(result.failed)
        });

    }
    catch (err) {
        console.log('Notifi Err: ', err);
    }
}


export async function sendDemoNotificationForIos(deviceToken,notifi,targetUser) {
    try {
        console.log("apn notificatio call=========")
        // console.log(__dirname+`/AuthKey_QCGFYKXKFW.p8`)
        let options = {
            token: {
              key: fs.readFileSync(__dirname+`/AuthKey_QCGFYKXKFW.p8`),
              keyId: "QCGFYKXKFW",
              teamId: "4QXS423467"
            },
            production: false
        };
          
        let apnProvider = new apn.Provider(options);

        let note = new apn.Notification();

        note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
        note.badge = 3;
        note.sound = "ping.aiff";
        note.alert = "\uD83D\uDCE7 \u2709 You have a new message";
        note.payload = {'messageFrom': 'John Appleseed'};
        note.topic = "com.wannaCustomer.cpp";

       
        
        // console.log({payload})
        // note.payload = payload;

        apnProvider.send(note, deviceToken).then( (result) => {
            console.log(result)
            console.log(result.sent)
            console.log(result.failed)
        });

    }
    catch (err) {
        console.log('Notifi Err: ', err);
    }
}
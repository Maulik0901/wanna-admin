import twilio from 'twilio';
import config from '../config';
import { generateVerifyCode } from './generator-code-service';

export function sendConfirmCode(phone) {
    let client = new twilio(config.twilio.accountSid, config.twilio.authToken);
    let generatedVerifyCode = generateVerifyCode();

    client.messages.create({
        body: config.confirmMessage + generatedVerifyCode,
        to: '+201157954393' /*phone*/,
        from: '+17207073481'
    }).then((message) => {
        console.log(message);
    }).catch(err => console.log('Twilio Error: ', err))
    
    return generatedVerifyCode;
} 

export function sendForgetPassword(password, phone) {
    let client = new twilio(config.twilio.accountSid, config.twilio.authToken);
    client.messages.create({
        body: ' Hi boody car Code : '+ password,
        to: phone /*phone*/,
        from: '+17207073481'
    }).then((message) => {
        console.log(message);
    }).catch(err => console.log('Twilio Error: ', err))
}
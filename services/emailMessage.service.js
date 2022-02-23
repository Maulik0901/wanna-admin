import nodemailer from 'nodemailer';
import config  from '../config'
let transporter = nodemailer.createTransport({
    secure: false, 
    service:'gmail',
    //host: 'smtp.ethereal.email',
    //port: 587,
    auth: {
        user: 'mahmoudsayed1008@gmail.com',
        pass: '01955200110092',
    },
    /*tls:{
        rejectUnauthorized:false
      }
*/
});

export function sendEmail(targetMail, text) {

    let mailOptions = {
        from: `${config.App.Name}`,
        to: targetMail,
        subject: `${config.App.Name} send verfication code`,
        text: text,

    };

    console.log('targetMail', targetMail, 'options', mailOptions);

   
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
             console.log(error);
        }
        //console.log('Message sent: %s', info.messageId);
        // Preview only available when sending through an Ethereal account
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    });


    return true;
}
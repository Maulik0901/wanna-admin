import mongoose,{ Schema} from "mongoose";
import autoIncrement from 'mongoose-auto-increment';

const NotificationTokens = new Schema({
    _id: {
        type: Number,
        required: true
    },
    userID : {
        type : Number,
        ref: 'user',
        required:true 
    },
    deviceToken : {
        type : String
    },    
    deviceType : {
        type : String,
        enum: ["A", "I"],  //store Driver // A Android I for Ios
        required: true,
    },   
    isDeleted:{
        type:Boolean,
        default:false
    } 
}, { timestamps: true });

NotificationTokens.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});

autoIncrement.initialize(mongoose.connection);
NotificationTokens.plugin(autoIncrement.plugin, { model: 'notificationtokens', startAt: 1 });

export default mongoose.model('notificationtokens', NotificationTokens);
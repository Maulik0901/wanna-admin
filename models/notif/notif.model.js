import mongoose, { Schema } from "mongoose";
import autoIncrement from 'mongoose-auto-increment';
import { isImgUrl } from "../../helpers/CheckMethods";
const NotifSchema = new Schema({
    _id: {
        type: Number,
        required: true
    },
    from: {
        type: Number,
        ref: 'user'
    },
    to: {
        type: Number,
        ref: 'user'
    },
    title: {
        type:String
    },
    description:{
        type:String
    },
    // arabicDescription:{
    //     type:String
    // },
    order:{
        type:Number,
        ref:'order'
    },
    createTime: {
        type:Number
    },
    read:{
        type:Boolean,
        default:false
    },
    image: {
        type: String, 
        validate: {
            validator: imgUrl => isImgUrl(imgUrl),
            message: 'img is invalid url'
        }
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    type: {
        type: String
    }
}, { timestamps: true });

NotifSchema.index({ location: '2dsphere' });
NotifSchema.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        if (ret.destination) {
            ret.destination = ret.destination.coordinates;
        }
    }
});
autoIncrement.initialize(mongoose.connection);
NotifSchema.plugin(autoIncrement.plugin, { model: 'notif', startAt: 1 });

export default mongoose.model('notif', NotifSchema);
import mongoose,{ Schema} from "mongoose";
import autoIncrement from 'mongoose-auto-increment';
import { isImgUrl } from "../../helpers/CheckMethods";
const NotifiImageSchema = new Schema({
    _id: {
        type: Number,
        required: true
    },    
    descriiption: {
        type: String,
    },
    img: {
        type: String, 
        validate: {
            validator: imgUrl => isImgUrl(imgUrl),
            message: 'img is invalid url'
        }
    },
    createdBy: {
        type: Number,
        ref: 'admin'
    },
    isDeleted:{
        type:Boolean,
        default:false
    }
}, { timestamps: true });

NotifiImageSchema.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});
autoIncrement.initialize(mongoose.connection);
NotifiImageSchema.plugin(autoIncrement.plugin, { model: 'notifiImage', startAt: 1 });

export default mongoose.model('notifiImage', NotifiImageSchema);
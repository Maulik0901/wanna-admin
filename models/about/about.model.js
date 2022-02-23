import mongoose,{ Schema} from "mongoose";
import autoIncrement from 'mongoose-auto-increment';
import { isImgUrl } from "../../helpers/CheckMethods";
const AboutSchema = new Schema({
    _id: {
        type: Number,
        required: true
    },
    about: {
        type: String,
        trim: true,
        required: true,
    },
    
    usage: {
        type: String,
    },
    img: {
        type: String, 
        validate: {
            validator: imgUrl => isImgUrl(imgUrl),
            message: 'img is invalid url'
        }
    },
  
    isDeleted:{
        type:Boolean,
        default:false
    }
}, { timestamps: true });

AboutSchema.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});
autoIncrement.initialize(mongoose.connection);
AboutSchema.plugin(autoIncrement.plugin, { model: 'about', startAt: 1 });

export default mongoose.model('about', AboutSchema);
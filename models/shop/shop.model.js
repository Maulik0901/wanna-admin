import mongoose,{ Schema} from "mongoose";
import autoIncrement from 'mongoose-auto-increment';
import { isImgUrl } from "../../helpers/CheckMethods";
const ShopSchema = new Schema({
    _id: {
        type: Number,
        required: true
    },
    number: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    img: {
        type: String, 
        required: true,
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

ShopSchema.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});
autoIncrement.initialize(mongoose.connection);
ShopSchema.plugin(autoIncrement.plugin, { model: 'shop', startAt: 1 });

export default mongoose.model('shop', ShopSchema);
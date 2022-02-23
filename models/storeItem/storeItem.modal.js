import mongoose,{ Schema} from "mongoose";
import autoIncrement from 'mongoose-auto-increment';
import { isImgUrl } from "../../helpers/CheckMethods";

const StoreItemSchema = new Schema({
    _id: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true,
    },
    arName: {
        type: String,
    },
    description: {
        type: String,
        required: true,
    },
    arDescription:{
        type: String,
    },   
    storeID: {
        type: Number,
        ref: 'store',
    },
    itemNO: {
        type: String,
    },
    price: {
        type: Number,
    },
    isActive: {
        type:Boolean,
        default:true 
    },
    isNonVeg: {
        type: Boolean,
        default: false 
    },
    img: {
        type: String, 
        // required: true,
        // validate: {
        //     validator: imgUrl => isImgUrl(imgUrl),
        //     message: 'img is invalid url'
        // }
    },
    displayOrder: {
        type: Number,
        default: 0
    },
    quantity: {
        type: Number,
        default: 1
    },
    isDeleted:{
        type:Boolean,
        default: false
    },
    itemIndex: {
        type: Number,
        ref: 'indexItem'
    }
}, { timestamps: true });

StoreItemSchema.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});
autoIncrement.initialize(mongoose.connection);
StoreItemSchema.plugin(autoIncrement.plugin, { model: 'storeItem', startAt: 1 });

export default mongoose.model('storeItem', StoreItemSchema);
import mongoose,{ Schema} from "mongoose";
import autoIncrement from 'mongoose-auto-increment';
import { isImgUrl } from "../../helpers/CheckMethods";

const RejectStoreOrder = new Schema({
    _id: {
        type: Number,
        required: true
    },    
    storeUser: {
        type: Number,
        ref: 'user',        
    },
    orderID:{
        type: Number,
        ref: 'order'
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
}, { timestamps: true });

RejectStoreOrder.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});
autoIncrement.initialize(mongoose.connection);
RejectStoreOrder.plugin(autoIncrement.plugin, { model: 'rejectStoreOrder', startAt: 1 });

export default mongoose.model('rejectStoreOrder', RejectStoreOrder);
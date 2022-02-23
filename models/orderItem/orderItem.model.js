import mongoose, { Schema } from "mongoose";
import autoIncrement from 'mongoose-auto-increment';
import { isImgUrl } from "../../helpers/CheckMethods";

const OrderItemSchema = new Schema({
    _id: {
        type: Number,
        required: true
    },
    orderID: {
        type: Number,
        ref: 'order'
    },
    storeID:{
        type: Number,
        ref: 'store',
    },
    itemID: {
        type: Number,
        ref: 'storeItem',
    },
    itemQuantity: {
        type: Number
    },
    itemTotalPrice: {
        type: String
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    
}, { timestamps: true });


OrderItemSchema.set('toJSON', {
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
OrderItemSchema.plugin(autoIncrement.plugin, { model: 'orderItem', startAt: 1 });

export default mongoose.model('orderItem', OrderItemSchema);
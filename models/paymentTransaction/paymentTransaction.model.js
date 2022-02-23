import mongoose, { Schema } from "mongoose";
import autoIncrement from 'mongoose-auto-increment';
import { isImgUrl } from "../../helpers/CheckMethods";

const PaymentTransaction = new Schema({
    _id: {
        type: Number,
        required: true
    },
    orderID: {
        type: Number,
        ref: 'order'
    },
    transactionId:{
        type: String,        
    },
    amount: {
        type: Number
    },
    currency: {
        type: String,
    },
    status: {
        type: String
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    
}, { timestamps: true });


PaymentTransaction.set('toJSON', {
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
PaymentTransaction.plugin(autoIncrement.plugin, { model: 'PaymentTransaction', startAt: 1 });

export default mongoose.model('PaymentTransaction', PaymentTransaction);
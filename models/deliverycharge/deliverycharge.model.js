import mongoose,{ Schema} from "mongoose";
import autoIncrement from 'mongoose-auto-increment';
const DeliveryChargeSchema = new Schema({
    _id: {
        type: Number,
        required: true
    },
    start: {
        type: String
    },
    end: {
        type: String
    },
    price: {
        type: String
    },
    isDeleted: {
        type:Boolean,
        default:false
    }
}, { Yearstamps: true });

DeliveryChargeSchema.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});
autoIncrement.initialize(mongoose.connection);
DeliveryChargeSchema.plugin(autoIncrement.plugin, { model: 'deliverycharge', startAt: 1 });

export default mongoose.model('deliverycharge', DeliveryChargeSchema);
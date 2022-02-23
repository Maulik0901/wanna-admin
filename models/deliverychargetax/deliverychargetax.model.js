import mongoose,{ Schema} from "mongoose";
import autoIncrement from 'mongoose-auto-increment';
const DeliveryChargeTaxSchema = new Schema({
    _id: {
        type: Number,
        required: true
    },
    tax: {
        type: String
    },
    isDeleted: {
        type:Boolean,
        default:false
    }
}, { Yearstamps: true });

DeliveryChargeTaxSchema.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});
autoIncrement.initialize(mongoose.connection);
DeliveryChargeTaxSchema.plugin(autoIncrement.plugin, { model: 'deliverychargetax', startAt: 1 });

export default mongoose.model('deliverychargetax', DeliveryChargeTaxSchema);
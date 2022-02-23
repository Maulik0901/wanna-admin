import mongoose,{ Schema} from "mongoose";
import autoIncrement from 'mongoose-auto-increment';
const BankSchema = new Schema({
    _id: {
        type: Number,
        required: true
    },
    Bank: {
        type: String,
        required: true,
    },
    arabicBank: {
        type: String,
    },
    isDeleted:{
        type:Boolean,
        default:false
    }
}, { Bankstamps: true });

BankSchema.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});
autoIncrement.initialize(mongoose.connection);
BankSchema.plugin(autoIncrement.plugin, { model: 'bank', startAt: 1 });

export default mongoose.model('bank', BankSchema);
import mongoose,{ Schema} from "mongoose";
import autoIncrement from 'mongoose-auto-increment';
const DebtSchema = new Schema({
    _id: {
        type: Number,
        required: true
    },
    value: {
        type: Number,
        required: true,
    },
    isDeleted:{
        type:Boolean,
        default:false
    }
}, { timestamps: true });

DebtSchema.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});
autoIncrement.initialize(mongoose.connection);
DebtSchema.plugin(autoIncrement.plugin, { model: 'debt', startAt: 1 });

export default mongoose.model('debt', DebtSchema);
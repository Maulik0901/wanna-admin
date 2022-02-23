import mongoose,{ Schema} from "mongoose";
import autoIncrement from 'mongoose-auto-increment';

const StoreUserSchema = new Schema({
    _id: {
        type: Number,
        required: true
    },   
    user: {
        type: Number,
        ref: 'user',
    },
    store: {
        type: Number,
        ref: 'store',
    },
    isDeleted:{
        type:Boolean,
        default:false
    }
}, { timestamps: true });

StoreUserSchema.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});
autoIncrement.initialize(mongoose.connection);
StoreUserSchema.plugin(autoIncrement.plugin, { model: 'storeUser', startAt: 1 });

export default mongoose.model('storeUser', StoreUserSchema);
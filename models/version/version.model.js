import mongoose,{ Schema} from "mongoose";
import autoIncrement from 'mongoose-auto-increment';
const VersionSchema = new Schema({
    _id: {
        type: Number,
        required: true
    },
    ios: {
        type: String,
        required: true,
    },
    android: {
        type: String,
    },
    isDeleted:{
        type:Boolean,
        default:false
    }
}, { Typestamps: true });

VersionSchema.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});
autoIncrement.initialize(mongoose.connection);
VersionSchema.plugin(autoIncrement.plugin, { model: 'version', startAt: 1 });

export default mongoose.model('version', VersionSchema);
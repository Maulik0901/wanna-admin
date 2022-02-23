import mongoose,{ Schema} from "mongoose";
import autoIncrement from 'mongoose-auto-increment';
const DistanceSchema = new Schema({
    _id: {
        type: Number,
        required: true
    },
    Year: {
        type: String,
        required: true,
    },
    arabicYear: {
        type: String,
    },
    isDeleted:{
        type:Boolean,
        default:false
    }
}, { Yearstamps: true });

DistanceSchema.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});
autoIncrement.initialize(mongoose.connection);
DistanceSchema.plugin(autoIncrement.plugin, { model: 'appdistance', startAt: 1 });

export default mongoose.model('appdistance', DistanceSchema);
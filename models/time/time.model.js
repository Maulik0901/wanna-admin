import mongoose,{ Schema} from "mongoose";
import autoIncrement from 'mongoose-auto-increment';
const TimeSchema = new Schema({
    _id: {
        type: Number,
        required: true
    },
    time: {
        type: String,
        required: true,
    },
    arabicTime: {
        type: String,
    },
    isDeleted:{
        type:Boolean,
        default:false
    }
}, { timestamps: true });

TimeSchema.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});
autoIncrement.initialize(mongoose.connection);
TimeSchema.plugin(autoIncrement.plugin, { model: 'time', startAt: 1 });

export default mongoose.model('time', TimeSchema);
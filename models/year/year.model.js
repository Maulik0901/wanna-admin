import mongoose,{ Schema} from "mongoose";
import autoIncrement from 'mongoose-auto-increment';
const YearSchema = new Schema({
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

YearSchema.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});
autoIncrement.initialize(mongoose.connection);
YearSchema.plugin(autoIncrement.plugin, { model: 'year', startAt: 1 });

export default mongoose.model('year', YearSchema);
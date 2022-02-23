import mongoose,{ Schema} from "mongoose";
import autoIncrement from 'mongoose-auto-increment';
const TypeSchema = new Schema({
    _id: {
        type: Number,
        required: true
    },
    Type: {
        type: String,
        required: true,
    },
    arabicType: {
        type: String,
    },
    isDeleted:{
        type:Boolean,
        default:false
    }
}, { Typestamps: true });

TypeSchema.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});
autoIncrement.initialize(mongoose.connection);
TypeSchema.plugin(autoIncrement.plugin, { model: 'type', startAt: 1 });

export default mongoose.model('type', TypeSchema);
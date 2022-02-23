import mongoose,{ Schema} from "mongoose";
import autoIncrement from 'mongoose-auto-increment';
import { isImgUrl } from "../../helpers/CheckMethods";
const OptionSchema = new Schema({
    _id: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        trim: true,
    },
    enable:{
        type:Boolean,
        default:false
    },
    enableApp:{
        type:Boolean,
        default:true
    },
    isDeleted:{
        type:Boolean,
        default:false
    }
}, { timestamps: true });

OptionSchema.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});
autoIncrement.initialize(mongoose.connection);
OptionSchema.plugin(autoIncrement.plugin, { model: 'option', startAt: 1 });

export default mongoose.model('option', OptionSchema);

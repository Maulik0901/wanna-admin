import mongoose,{ Schema} from "mongoose";
import autoIncrement from 'mongoose-auto-increment';
import { isImgUrl } from "../../helpers/CheckMethods";

const ProblemSchema = new Schema({
    _id: {
        type: Number,
        required: true
    },
    problemType: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    img: [{
        type: String,
        required: true,
        
    }],
    order: {
        type: Number,
        ref:'order',
        required: true,
    },
    user: {
        type: Number,
        ref:'user',
        required: true,
    },
    replyText: {
        type: String,
    },
    reply:{
        type:Boolean,
        default:false
    },
    isDeleted:{
        type:Boolean,
        default:false
    }
}, { Problemstamps: true });

ProblemSchema.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});
autoIncrement.initialize(mongoose.connection);
ProblemSchema.plugin(autoIncrement.plugin, { model: 'problem', startAt: 1 });

export default mongoose.model('problem', ProblemSchema);
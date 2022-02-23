import mongoose,{ Schema} from "mongoose";
import autoIncrement from 'mongoose-auto-increment';
const IndexItem = new Schema({
    _id: {
        type: Number,
        required: true
    },
    storeID: {
        type: Number,
        ref: 'store',
    },
    name: {
        type: String,
    },
    arName: {
        type: String,
    },
    image: {
        type: String,
    },
    createdBy: {
        type: Number,
        ref: 'admin'
    },
    displayOrder: {
        type: Number,
        default: 0
    },
    isDeleted: {
        type:Boolean,
        default:false
    }
}, { Yearstamps: true });

IndexItem.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});
autoIncrement.initialize(mongoose.connection);
IndexItem.plugin(autoIncrement.plugin, { model: 'indexItem', startAt: 1 });

export default mongoose.model('indexItem', IndexItem);
import mongoose,{ Schema} from "mongoose";
import autoIncrement from 'mongoose-auto-increment';
import { isImgUrl } from "../../helpers/CheckMethods";

const StoreCategorySchema = new Schema({
    _id: {
        type: Number,
        required: true
    },      
    storeID: {
        type: Number,
        ref: 'store',
    },
    categoryID: {
        type: Number,
        ref: 'category'
    },
    isDeleted:{
        type:Boolean,
        default: false
    }
}, { timestamps: true });

StoreCategorySchema.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});
autoIncrement.initialize(mongoose.connection);
StoreCategorySchema.plugin(autoIncrement.plugin, { model: 'storeCategory', startAt: 1 });

export default mongoose.model('storeCategory', StoreCategorySchema);
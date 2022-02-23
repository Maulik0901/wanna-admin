import mongoose, { Schema } from "mongoose";
import { isImgUrl } from "../../helpers/CheckMethods";
import autoIncrement from 'mongoose-auto-increment';
const BillSchema=new Schema({
    _id: {
        type: Number,
        required: true
    },
    img: [{
        type: String,
        //required: true,
        
    }],
    cost:{
        type:Number,
        required:true
    },
    delivaryCost:{
        type:Number,
        required:true
    },
    totalCost:{
        type:Number,
        required:true
    },
    paidCost:{
        type:Number,
        required:true
    },
    tax:{
        type:Boolean,
        default:false
    },
    isDeleted:{
        type:Boolean,
        default:false
    },

},{ timestamps: true });
BillSchema.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});
autoIncrement.initialize(mongoose.connection);
BillSchema.plugin(autoIncrement.plugin, { model: 'bill', startAt: 1 });

export default mongoose.model('bill', BillSchema);
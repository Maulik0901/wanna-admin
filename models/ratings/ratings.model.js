import mongoose,{ Schema} from "mongoose";
import autoIncrement from 'mongoose-auto-increment';

const RatingsSchema = new Schema({
    _id: {
        type: Number,
        required: true
    },
    ratingToWhom: {
        type: String,
        enum: ["S", "D"],  //store Driver
        required: true,
    },
    fromUser: {
        type: Number,
        ref: 'user',
        required:true
    },
    storeID : {
        type : Number,
        ref: 'store'
    },
    storeAddressID : {
        type : Number,
        ref : 'storeaddress'
    },
    orderID: {
        type: Number,
        ref: 'order'
    },
    driverID : {
        type: Number,
        ref: 'user',
    },
    ratings : {
        type : Number,
        required : true
    },
    review : {
        type : String
    },    
    isDeleted:{
        type:Boolean,
        default:false
    } 
}, { timestamps: true });

RatingsSchema.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});
autoIncrement.initialize(mongoose.connection);
RatingsSchema.plugin(autoIncrement.plugin, { model: 'ratings', startAt: 1 });

export default mongoose.model('ratings', RatingsSchema);
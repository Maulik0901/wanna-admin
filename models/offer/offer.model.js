import mongoose, { Schema } from "mongoose";
import autoIncrement from 'mongoose-auto-increment';

const OfferSchema = new Schema({
    _id: {
        type: Number,
        required: true
    },
    salesMan: {
        type: Number,
        ref: 'user',
        required:true
    },
    order:{
        type: Number,
        ref: 'order',
        required:true
    },
    deliveryCost:{
        type: Number,
        required:true
    },
    destination: {
        type: { type: String, enum: 'Point' },
        coordinates: { type: [Number] }
    },
    currentLocation:{
        type: { type: String, enum: 'Point' },
        coordinates: { type: [Number] }
    },
    deliveryTime:{
        type:String,
    },
    accept:{
        type:Boolean,
        default:false
    },
    lastOffer : {
        type : Boolean ,
        default : true
    },
    delivered:{
        type : Boolean,
        default : false
    },
    rejected: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    createTime:{
        type: Number
    }
}, { timestamps: true });

OfferSchema.index({ location: '2dsphere' });
OfferSchema.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        if (ret.destination) {
            ret.destination = ret.destination.coordinates;
        }
    }
});
autoIncrement.initialize(mongoose.connection);
OfferSchema.plugin(autoIncrement.plugin, { model: 'offer', startAt: 1 });

export default mongoose.model('offer', OfferSchema);
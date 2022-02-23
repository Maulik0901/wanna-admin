import mongoose,{ Schema} from "mongoose";
import autoIncrement from 'mongoose-auto-increment';
import { isImgUrl } from "../../helpers/CheckMethods";
const StoreSchema = new Schema({
    _id: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true,
    }, 
    arName: {
        type: String        
    },
    lat: {
        type: Number
    },
    long: {
        type: Number
    },
    address: {
        type: String
    },
    img: {
        type: String, 
        // required: true,
        // validate: {
        //     validator: imgUrl => isImgUrl(imgUrl),
        //     message: 'img is invalid url'
        // }
    },
    displayOrder: {
        type: Number,
        default: 0
    },
    isActive: {
        type:Boolean,
        default:true 
    },
    isDeleted:{
        type:Boolean,
        default:false
    },
    deliveryCharge:{
        type: String,
    },   
    adminCommisionType:{
        type: String  // flat, percentage
    },
    adminCommission: {
        type: Number,
        default: 0
    },
    adminEarn: {
        type: Number,
        default: 0 
    },
    storeAddress: [{
        type: Number,
        ref: 'storeaddress'
    }],
    tax: {
        type: Number,
        default: 0
    },    
    vat: {
        type: Number,
        default: 0
    },
    categoryID:{
        type: Number,
        ref: 'category'
    },
    createdBy: {
        type: Number,
        ref: 'admin'
    },
    isDeliveryAfterHour: {
        type:Boolean,
        default:false
    },
    isShowInHomePage:{
        type:Boolean,
        default:false
    },
    storeType: {
        type: String,   // store,restaurant
    },
    mimOrderPrice: {
        type: Number,
    },
    preperingTime: {       
        // type: Number,
        days: {
            type: Number,
        },
        hours: {
            type: Number,
        },
        min: {
            type: Number,
        }
    },
    paymentOption:{
        type: String,   // all,cod,online
    },
    restaurantType: {
        type: String,   // all,veg,none vage
    },
    isPopular:{
        type:Boolean,
        default:false
    },
    deliveryFees: {
        type: String,   // paid , free
    },
    isHide:{
        type:Boolean,
        default: false
    },
    
}, { timestamps: true });

StoreSchema.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});
autoIncrement.initialize(mongoose.connection);
StoreSchema.plugin(autoIncrement.plugin, { model: 'store', startAt: 1 });

export default mongoose.model('store', StoreSchema);
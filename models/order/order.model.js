import mongoose, { Schema } from "mongoose";
import autoIncrement from 'mongoose-auto-increment';
import { isImgUrl } from "../../helpers/CheckMethods";

const OrderSchema = new Schema({
    _id: {
        type: Number,
        required: true
    },
    client: {
        type: Number,
        ref: 'user',
        required:true
    },
    salesMan: {
        type: Number,
        ref: 'user',
    },
    offer: {
        type: Number,
        ref: 'offer',
    },
    bill: {
        type: Number,
        ref: 'bill',
    },
    coupon: {
        type: Number,
        ref: 'coupon',
    },
    couponePrice: {
        type: Number,
    },
    shopName: {
        type: String,
    },
    modal: {
        type: String,
    },
    description: {
        type: String,
        // required:true,
    },
    img: {
        type: String,
        validate: {
            validator: imgUrl => isImgUrl(imgUrl),
            message: 'img is invalid url'
        }
    },
    total: {
        type: Number,
    },
    clientDestination: {
        type: [Number]         
    },
    clientLocation: {
        type: {
          type: String, // Don't do `{ location: { type: String } }`
          enum: ['Point'], // 'location.type' must be 'Point'
          // required: true
        },
        coordinates: {
          type: [Number],
          // required: true
        }
    },
    shopDestination: {
        type: [Number] 
    },
    shopLocation: {
        type: {
          type: String, // Don't do `{ location: { type: String } }`
          enum: ['Point'], // 'location.type' must be 'Point'
          // required: true
        },
        coordinates: {
          type: [Number],
          // required: true
        }
    },
    time: {
        type:String,
        // required:true
    },
    status: {
        type: String,
        enum: ['PENDING','PAYMENT_PENDING','CANCEL','ON_PROGRESS','RECEIVED','ON_THE_WAY','ARRIVED', 'DELIVERED', 'ACCEPT', 'READY_FOR_DELIVER','REJECT'],
        default: 'PENDING'
    },
    deliveryFees: {
        type: Number,
    },
    itemTotal: {
        type: Number
    },   
    total: {
        type: Number
    },
    discountPrice: {
        type: Number,
        default: 0
    },
    rate: {
        type: Number,
    },
    rateText: {
        type: String,
    },
    paidFromBalance: {
        type:Boolean,
        default:false
    },
    accept: {
        type:Boolean,
        default:false
    },
    storeItemID: {
        type: Number,
        ref: 'storeItem',
    },
    storeUser: {
        type: Number,
        ref: 'user',        
    },
    storeID: {
        type: Number,
        ref: 'store',
    },
    storeAddress: {
        type: Number,
        ref: 'storeAddress'
    },
    itemQuantity: {
        type: Number
    }, 
    clientAddress: {
        type: Number,
        ref: 'address'
    },
    updateTime: {
        type: Number
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    isStoreDelivery:{
        type: Boolean,
        default: false
    },
    systemDeleted: {
        type: Boolean,
        default: false
    },
    systemDeletedWithoutOffer: {
        type: Boolean,
        default: false
    },
    createTime:{
        type: Number
    },
    createdBy: {
        type: Number,
        ref: 'admin'
    },
    isRatingShow:{
        type: Boolean,
        default: true
    },
    billImages: {
        type: [String],        
    },
    adminCommisionTypeStore:{
        type: String  // flat, percentage
    },
    adminCommissionStore: {
        type: Number,
        default: 0
    },   
    vatPercentage: {
        type: Number,
        default: 0
    },
    vatPrice: {
        type: Number,
        default: 0
    },
    adminCommisionDriver: {
        type: Number,
        default: 0
    },
    driverEarn:{
        type: Number,
        default: 0  
    },
    storeEarn:{
        type: Number,
        default: 0  
    },
    adminCommisionEarnByDrive:{
        type: Number,
        default: 0  
    },
    adminCommisionEarnByStore:{
        type: Number,
        default: 0  
    },
    deviceType : {
        type : String,
        enum: ["A", "I"],  //store Driver // A Android I for Ios        
    },
    deviceVersion: {
        type : String,
    },
    cancelNote: {
        type: String
    },
    cancelByUser:{
        type: Number,
        ref: 'user',  
    },
    paymentType: {
        type: String
    },
    driverType: {
        type: String
    },
    storeDeliveryType: {
        type: String,   // paid , free
    },
    storeDeliveryPrice: {
        type: Number,
    },
    store_note: {
        type: String
    },
    isAllDriverSendNotification: {
        type: Boolean,
        default: false
    }
    
}, { timestamps: true });

OrderSchema.index({ shopLocation: '2dsphere' },{clientLocation: '2dsphere'});
OrderSchema.set('toJSON', {
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
OrderSchema.plugin(autoIncrement.plugin, { model: 'order', startAt: 1 });

export default mongoose.model('order', OrderSchema);
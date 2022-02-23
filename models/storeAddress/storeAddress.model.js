import mongoose,{ Schema} from "mongoose";
import autoIncrement from 'mongoose-auto-increment';
import { isImgUrl } from "../../helpers/CheckMethods";
const StoreAddressSchema = new Schema({
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
    storeLocation: {
        type: {
            type: String, // Don't do `{ location: { type: String } }`
            enum: ['Point'], // 'location.type' must be 'Point'
            default : "Point"
        },
        coordinates: {
            type: [Number],
            default : [0,0]
            // required: true
        }
    },
    storeID: {
        type: Number,
        ref: 'store',
    },
    address: {
        type: String
    },
    arAddress: {
        type: String
    },
    landmark: {
        type: String
    }, 
    arLandmark: {
        type: String
    },    
    isActive: {
        type:Boolean,
        default:true 
    },
    isDeleted:{
        type:Boolean,
        default:false
    }    
}, { timestamps: true });

StoreAddressSchema.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});
autoIncrement.initialize(mongoose.connection);
StoreAddressSchema.plugin(autoIncrement.plugin, { model: 'storeAddress', startAt: 1 });
StoreAddressSchema.index({storeLocation: '2dsphere'});

export default mongoose.model('storeAddress', StoreAddressSchema);
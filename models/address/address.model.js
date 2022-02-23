import mongoose, { Schema } from "mongoose";
import autoIncrement from 'mongoose-auto-increment';
import { isImgUrl } from "../../helpers/CheckMethods";

const AddressSchema = new Schema({
    _id: {
        type: Number,
        required: true
    },
    user: {
        type: Number,
        ref: 'user',
        required:true
    },
    destination: {
        type: [Number] 
    },
    houseName: {
        type: String
    },
    flatName: {
        type: String
    },
    landmark: {
        type: String
    },
    pinCode: {
        type: String
    },
    type: {
        type: String
    },
    address: {
        type: String
    }, 
    fullAddress: {
        type: String
    },
    isPrimary : {
        type:Boolean,
        default:false
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
   
    createTime: {
        type: Number
    }
}, { timestamps: true });

AddressSchema.index({ location: '2dsphere' });
AddressSchema.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        // if (ret.destination) {
        //     ret.destination = ret.destination.coordinates;
        // }
      
    }
});
autoIncrement.initialize(mongoose.connection);
AddressSchema.plugin(autoIncrement.plugin, { model: 'address', startAt: 1 });

export default mongoose.model('address', AddressSchema);
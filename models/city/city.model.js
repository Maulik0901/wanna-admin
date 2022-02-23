import mongoose, { Schema } from 'mongoose';
import autoIncrement from 'mongoose-auto-increment';

const CitySchema = new Schema({
    _id: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        // trim: true,
        required: true,
    },
    arName: {
        type: String,
        // trim: true,
        // required: true,
    },
    isActive: {
        type:Boolean,
        default: true
    },
    isDeleted:{
        type:Boolean,
        default:false
    },
    createdBy: {
        type: Number,
        ref: 'admin'
    },
})

CitySchema.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret._v;
    }
})
autoIncrement.initialize(mongoose.connection);
CitySchema.plugin(autoIncrement.plugin,{model :'city',startAt : 1});

export default mongoose.model('city', CitySchema);
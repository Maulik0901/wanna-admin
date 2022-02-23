import mongoose,{ Schema } from "mongoose";
import autoIncrement from 'mongoose-auto-increment';
const ContactSchema=new Schema({
    _id: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        trim:true,
        required: true
    },
    email: {
        type: String,
        trim:true,
        required: true
    },
    number: {
        type: String,
        trim:true,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    isDeleted:{
        type:Boolean,
        default:false
    }
},{timestamps:true});
ContactSchema.set('toJSON', {
    transform: function (doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
    }
});
autoIncrement.initialize(mongoose.connection);
ContactSchema.plugin(autoIncrement.plugin, { model: 'contact', startAt: 1 });

export default mongoose.model('contact', ContactSchema);
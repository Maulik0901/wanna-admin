import mongoose, { Schema } from "mongoose";
import autoIncrement from 'mongoose-auto-increment';

const NotifMessageSchema = new Schema({
    _id: {
        type: Number,
        required: true
    },
    type: {
        type: String
    },
    text: {
        type: String
    },
    arText: {
        type: String
    },
    inputLabel: {
        type: String
    },
    arInputLabel: {
        type: String
    },
    createdBy: {
        type: Number,
        ref: 'admin'
    },
    notifyTag: {
        type: String,
    },
    isNotify: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    
}, { timestamps: true });

NotifMessageSchema.index({ location: '2dsphere' });
NotifMessageSchema.set('toJSON', {
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
NotifMessageSchema.plugin(autoIncrement.plugin, { model: 'notificationMessage', startAt: 1 });

export default mongoose.model('notificationMessage', NotifMessageSchema);
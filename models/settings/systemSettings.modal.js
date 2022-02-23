import mongoose, { Schema } from 'mongoose';
import autoIncrement from 'mongoose-auto-increment';

const SystemSettingsSchema = new Schema({

    _id: {
        type: Number,
        required: true
    },

    createdBy: {
        type: Number,
        ref: 'admin'
    },

    startTime: {
        type: String
    },

    endTime: {
        type: String
    },

    systemMessage: {
        type: String
    },

    contactNumber: {
        type: String
    }

}, { timestamps: true });

SystemSettingsSchema.set('toJSON', {
    transform: function(doc, ret, options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret._v;
    }
})

autoIncrement.initialize(mongoose.connection);
SystemSettingsSchema.plugin(autoIncrement.plugin, { model: 'systemSettings', startAt: 1 });

export default mongoose.model('systemSettings', SystemSettingsSchema);
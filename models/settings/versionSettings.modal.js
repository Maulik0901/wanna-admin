import mongoose,{ Schema} from 'mongoose';
import autoIncrement from 'mongoose-auto-increment';

const VersionSettingsSchema = new Schema({

    _id : {
        type : Number,
        required : true
    },

    iosCustomerAppVersion : {
        type : String
    },

    iosStoreAppVersion : {
        type : String
    },

    iosDriverAppVersion : {
        type : String
    },

    androidCustomerAppVersion : {
        type : String
    },

    androidStoreAppVersion : {
        type : String
    },

    androidDriverAppVersion : {
        type : String
    },

    createdBy: {
        type: Number,
        ref: 'admin'
    }
}, {timestamps : true});

VersionSettingsSchema.set('toJSON',{
    transform : function(doc, ret , options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret._v;
    }
})

autoIncrement.initialize(mongoose.connection);
VersionSettingsSchema.plugin(autoIncrement.plugin, {model: 'versionSettings',startAt : 1});

export default mongoose.model('versionSettings',VersionSettingsSchema);
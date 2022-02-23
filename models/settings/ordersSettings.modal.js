import mongoose,{ Schema} from 'mongoose';
import autoIncrement from 'mongoose-auto-increment';

const OrdersSettingsSchema = new Schema({

    _id : {
        type : Number,
        required : true
    },    

    createdBy: {
        type: Number,
        ref: 'admin'
    },

    maxCaseBalance : {
        type : Number
    },

    driverOrdersCount : {
        type : Number
    },

    driverOrderCommision : {
        type : Number
    },

    deliveryOrderCharges : [{
        valueFrom: {
            type: Number,            
        },
        valueTo : {
            type : Number
        },
        deliveryCharges : {
            type : Number
        }
    }]

}, {timestamps : true});

OrdersSettingsSchema.set('toJSON',{
    transform : function(doc, ret , options) {
        ret.id = ret._id;
        delete ret._id;
        delete ret._v;
    }
})

autoIncrement.initialize(mongoose.connection);
OrdersSettingsSchema.plugin(autoIncrement.plugin, {model: 'ordersSettings',startAt : 1});

export default mongoose.model('ordersSettings',OrdersSettingsSchema);
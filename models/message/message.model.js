var mongoose=require('mongoose');
var mongoose_auto_increment=require('mongoose-auto-increment');
var Schema=mongoose.Schema;

var message={
    _id:{
        type:Number,
        required:true
    },
    to:{
        type:Number,
        ref:'user',
        required:true
    },
    from:{
        type:Number,
        ref:'user',
        required:true
    },
    order:{
        type:Number,
        ref:'order',
    },
    content:{
        type:String,
        default:""
    },
    seen:{
        type:Boolean,
        default:0
    },
    seendate:{
        type:Date 
    },
    incommingDate:{
        type:Date, 
        required:true,
        default: Date.now
    },
    isDeleted:{
        type: Boolean,
        default:0
    },
    lastMessage : {
        type : Boolean ,
        default : true
    },
    sent:{
        type : Boolean,
        default : false
    },
    delivered:{
        type : Boolean,
        default : false
    },
    image:{
        type: String,
        default: ""
    },
    video:{
        type: String,
        default: ""
    },
    latLocation:{
        type: String,
        default: ""
    },
    longLocation:{
        type: String,
        default: ""
    },
    informed:{
       type: Boolean ,
       default : false 
    }
}

var messgaeSchema=new Schema(message);
mongoose_auto_increment.initialize(mongoose.connection);
messgaeSchema.plugin(mongoose_auto_increment.plugin , {model:'message' , startAt:1} );
var messageModel = mongoose.model('message',messgaeSchema);
module.exports = messageModel ;
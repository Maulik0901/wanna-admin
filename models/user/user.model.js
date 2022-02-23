import mongoose, { Schema } from "mongoose";
import autoIncrement from "mongoose-auto-increment";
import bcrypt from "bcryptjs";
import isEmail from "validator/lib/isEmail";
import { isImgUrl } from "../../helpers/CheckMethods";

const userSchema = new Schema(
  {
    _id: {
      type: Number,
      required: true,
    },
    username: {
      type: String,
      //required: true,
    },
    email: {
      type: String,
      trim: true,
      required: true,
      validate: {
        validator: (email) => isEmail(email),
        message: "Invalid Email Syntax",
      },
    },
    password: {
      type: String
    },
    phone: {
      type: String,
      // required: true,
      trim: true,
    },
    countryCode: {
      type: String,
    },
    mobile: {
      type: String,
      // required: true,
    },
    mobile2: {
      type: String,
      // required: true,
    },
    city: {
      type: Number,
      ref: 'cities'      
    },

    gender: {
      type: String,
      //required: true,
      trim: true,
    },
    birthYear: {
      type: String,
      //required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["CLIENT", "ADMIN", "SALES-MAN", "DIRECTOR","STORE","STORE-ADMIN","STORE-SALESMAN"],
      required: true,
    },
    language: {
      type: String,
      default: 'en'
    },
    active: {
      type: Boolean,
      default: false,
    },
    block: {
      type: Boolean,
      default: false,
    },
    img: {
      type: String,
      validate: {
        validator: (imgUrl) => isImgUrl(imgUrl),
        message: "img is invalid url",
      },
    },
    transportType: {
      type: String,
    },
    manufacturingYear: {
      type: String,
    },
    bank: {
      type: String,
    },
    bankNumber: {
      type: String,
    },
    transportImages: {
      type: String,
      validate: {
        validator: (imgUrl) => isImgUrl(imgUrl),
        message: "img is invalid url",
      },
    },
    transportLicense: {
      type: String,
      validate: {
        validator: (imgUrl) => isImgUrl(imgUrl),
        message: "img is invalid url",
      },
    },
    verifycode: {
      type: Number,
    },
    token: {
      type: [String],
    },
   
    tasksCount: {
      type: Number,
      default: 0,
    },
    rate: {
      type: Number,
      default: 0,
    },
    ratePercent: {
      type: Number,
      default: 0,
    },
    rateFrom5: {
      type: Number,
      default: 0,
    },
    balance: {
      type: Number,
      default: 0,
    },
    addBalance: {
      type: Number,
      default: 0,
    },
    delivaryBalance: {
      type: Number,
      default: 0,
    },
    allBalance: {
      type: Number,
      default: 0,
    },
    debt: {
      type: Number,
      default: 0,
    },
    hasCoupon: {
      type: Boolean,
      default: false,
    },
    coupon: {
      type: Number,
      ref: "coupon",
    },
    orderMoney: {
      type: Number,
      default: 0,
    },
    notif: {
      type: Boolean,
      default: true,
    },
    quotationMinPrice: {
      type: Number,
      default: 0,
    },
    quotationMaxPrice: {
      type: Number,
      default: 0,
    },
    commissionType: {
      type: String,
    },
    commissionValue: {
      type: Number,
      default: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    currentLocation: {
      type: [Number],
    },
    location: {
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
    // userCurrentLocation : {
    //   type: {type:String,default : "Point"},
    //   cordinates : [Number]
    // },
    storeName: {
      type: String
    },
    storeLat: {
      type: Number
    },
    storeLng: {
      type: Number
    },    
    storeCity: {
      type: String
    },
    storePhone: {
      type: String
    },
    version: {
      type: String
    },
    os:{
      type: String
    },
    store: {
      type: Number,
      ref: 'store',
    },
    storeAddress: {
      type: Number,
      ref: 'storeAddress'
    },
    createdBy: {
      type: Number,
      ref: 'admin'
    },

    //added by @@
    address : {
      type : String
    },
    vehicalType : {
      type : String
    },
    vehicalImages: {
      type: [String],
      // validate: {
      //   validator: (imgUrl) => isImgUrl(imgUrl),
      //   message: "img is invalid url",
      // },
    },
    idProofImages: {
      type: [String],
      // validate: {
      //   validator: (imgUrl) => isImgUrl(imgUrl),
      //   message: "img is invalid url",
      // },
    },
    isNotification: {
      type: Boolean,
      default: true,
    },
    completedOrder: {
      type: Number,
      default: 0,
    },

  },
  { timestamps: true, discriminatorKey: "kind" }
);
userSchema.index({ location: '2dsphere' });
userSchema.set("toJSON", {
  transform: function (doc, ret, options) {
    ret.id = ret._id;
    // delete ret.password;
    delete ret._id;
    delete ret.__v;
  },
});
autoIncrement.initialize(mongoose.connection);
userSchema.plugin(autoIncrement.plugin, { model: "user", startAt: 1 });
// userSchema.index({userCurrentLocation: '2dsphere'});
export default mongoose.model("user", userSchema);

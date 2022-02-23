import mongoose, { Schema } from "mongoose";
import autoIncrement from "mongoose-auto-increment";
import bcrypt from "bcryptjs";
import isEmail from "validator/lib/isEmail";
import { isImgUrl } from "../../helpers/CheckMethods";

const adminSchema = new Schema(
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
    //   required: true,
    //   validate: {
    //     validator: (email) => isEmail(email),
    //     message: "Invalid Email Syntax",
    //   },
    },
    password: {
        type: String,
    },
    phone: {
      type: String,
      // required: true,
      trim: true,
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
      enum: ["SA", "A","SUB"],  // SA - Super Admin, A- Admin , SUB- Sub Admin
      required: true,
    },
    language: {
      type: String,
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
    
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
   
    createdBy: {
      type: Number      
    },
    permission: {
      type: [Object]
    }

  },
  { timestamps: true, discriminatorKey: "kind" }
);

adminSchema.set("toJSON", {
  transform: function (doc, ret, options) {
    ret.id = ret._id;
    // delete ret.password;
    delete ret._id;
    delete ret.__v;
  },
});
autoIncrement.initialize(mongoose.connection);
adminSchema.plugin(autoIncrement.plugin, { model: "admin", startAt: 1 });
export default mongoose.model("admin", adminSchema);

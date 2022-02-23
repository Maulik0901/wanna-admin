import mongoose, { Schema } from "mongoose";
import autoIncrement from "mongoose-auto-increment";
const CouponSchema = new Schema(
  {
    _id: {
      type: Number,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description:{
      type: String
    },
    arName: {
      type: String,
      required: true,
    },
    arDescription:{
      type: String
    },
    code: {
      type: String,
      required: true,
    },    
    discount: {
      type: String,
      required: true,
    },
    discountType: {
      type: String,
      // required: true,
      enum: ['Flat','Percentage'],
      default: 'Percentage'
    },
    startDate: {
      type: Number,
      required: true,
    },
    endDate: {
      type: Number,
      required: true,
    },
    couponType:{
      type: String,
      // required: true,
      enum: ['NU','FX','UN'],  // NU = New User, FX = First come first serve(FX) , UN = Unlimited
      default: 'UN'
    },
    reedMeCoupone: {
      type: Number,
      default: 1
    },
    firstX:{
      type: Number,
    },
    isShowList:{
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Number,
      ref: 'admin'
    },
  },
  { timestamps: true }
);

CouponSchema.set("toJSON", {
  transform: function (doc, ret, options) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});
autoIncrement.initialize(mongoose.connection);
CouponSchema.plugin(autoIncrement.plugin, { model: "coupon", startAt: 1 });

export default mongoose.model("coupon", CouponSchema);

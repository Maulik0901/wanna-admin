import mongoose, { Schema } from "mongoose";
import autoIncrement from "mongoose-auto-increment";

const DriverPaymentsSchema = new Schema(
  {
    _id: {
      type: Number,
      required: true,
    },
    driverId: {
      type: Number,
      ref: "user",
    },
    amount: {
      type: Number,
    },
    paymentType: {
      type: String,
    },
    img: {
      type: String,
    },
    notes: {
      type: String,
    },
    paymentDate: {
      type: String,
    },
    paymentBy:{
      type: String  // admin , driver
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },

  },
  { timestamps: true }
);

DriverPaymentsSchema.set("toJSON", {
  transform: function (doc, ret, options) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});
autoIncrement.initialize(mongoose.connection);
DriverPaymentsSchema.plugin(autoIncrement.plugin, {
  model: "driverPayment",
  startAt: 1,
});

export default mongoose.model("driverPayment", DriverPaymentsSchema);

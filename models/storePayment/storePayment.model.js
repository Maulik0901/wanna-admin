import mongoose, { Schema } from "mongoose";
import autoIncrement from "mongoose-auto-increment";

const StorePaymentsSchema = new Schema(
  {
    _id: {
      type: Number,
      required: true,
    },
    storeId: {
      type: Number,
      ref: "store",
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
    driverType: {
      type: String,
    },
  },
  { timestamps: true }
);

StorePaymentsSchema.set("toJSON", {
  transform: function (doc, ret, options) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});
autoIncrement.initialize(mongoose.connection);
StorePaymentsSchema.plugin(autoIncrement.plugin, {
  model: "storePayment",
  startAt: 1,
});

export default mongoose.model("storePayment", StorePaymentsSchema);

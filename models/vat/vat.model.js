import mongoose, { Schema } from "mongoose";
import autoIncrement from "mongoose-auto-increment";
const VatSchema = new Schema(
  {
    _id: {
      type: Number,
      required: true,
    },
    value: {
      type: Number,
      default: 0,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

VatSchema.set("toJSON", {
  transform: function (doc, ret, options) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});
autoIncrement.initialize(mongoose.connection);
VatSchema.plugin(autoIncrement.plugin, { model: "vat", startAt: 1 });

export default mongoose.model("vat", VatSchema);

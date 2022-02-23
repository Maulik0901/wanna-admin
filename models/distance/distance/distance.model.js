import mongoose, { Schema } from "mongoose";
import autoIncrement from "mongoose-auto-increment";
const DistanceSchema = new Schema(
  {
    _id: {
      type: Number,
      required: true,
    },
    value: {
      type: Number,
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

DistanceSchema.set("toJSON", {
  transform: function (doc, ret, options) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});
autoIncrement.initialize(mongoose.connection);
DistanceSchema.plugin(autoIncrement.plugin, { model: "distance", startAt: 1 });

export default mongoose.model("distances", DistanceSchema);

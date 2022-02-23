import mongoose, { Schema } from "mongoose";
import autoIncrement from "mongoose-auto-increment";
import { isImgUrl } from "../../helpers/CheckMethods";
const CategorySchema = new Schema(
  {
    _id: {
      type: Number,
      required: true,
    },
    name: {
      type: String,
      // trim: true,
      // required: true,
    },
    arName: {
      type: String,
      // trim: true,
      // required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    logo: {
      type: String,
      // required: true,
      validate: {
        validator: (imgUrl) => isImgUrl(imgUrl),
        message: "img is invalid url",
      },
    },
    categoryID: {
      type: Number,
      ref: "category",
    },
    createdBy: {
      type: Number,
      ref: "admin",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    displayOrder: {
      type: Number,
      default: 0
    },

  },
  { timestamps: true }
);

CategorySchema.set("toJSON", {
  transform: function (doc, ret, options) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});
autoIncrement.initialize(mongoose.connection);
CategorySchema.plugin(autoIncrement.plugin, { model: "category", startAt: 1 });

export default mongoose.model("category", CategorySchema);

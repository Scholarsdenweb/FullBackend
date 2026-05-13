const mongoose = require("mongoose");

const combinedResultSchema = new mongoose.Schema(
  {
    examDate: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    combinedPdfUrl: {
      type: String,
      required: true,
    },
    cloudinaryPublicId: {
      type: String,
    },
    resultCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const CombinedResult = mongoose.model("CombinedResult", combinedResultSchema);
module.exports = CombinedResult;

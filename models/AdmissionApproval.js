const mongoose = require("mongoose");

const AdmissionApprovalSchema = new mongoose.Schema(
  {
    admissionRollNo: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    message: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

AdmissionApprovalSchema.index({ admissionRollNo: 1 }, { unique: true });

// Export the model
const AdmissionApproval = mongoose.model(
  "AdmissionApproval",
  AdmissionApprovalSchema
);

module.exports = AdmissionApproval;

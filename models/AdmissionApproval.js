const mongoose = require("mongoose");

const DetailStatusSchema = new mongoose.Schema(
  {
    status: {
      type: Boolean,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const DocumentsStatusSchema = new mongoose.Schema({
  studentPhoto: DetailStatusSchema,
  cancelledCheque: DetailStatusSchema,
  passbookPhoto: DetailStatusSchema,
  studentAadhar: DetailStatusSchema,
  parentAadhar: DetailStatusSchema,
  status: {
    type: Boolean,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
});

const AdmissionApprovalSchema = new mongoose.Schema(
  {
    acknowledgementNumber: {
      type: String,
      required: true,
      unique: true,
    },


    assignedCounsellor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    studentDetails: DetailStatusSchema,
    parentDetails: DetailStatusSchema,
    documentsDetails: DocumentsStatusSchema,
    signatureDetails: DetailStatusSchema,
    bankDetails: DetailStatusSchema,
  
    // Optional global status
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "amountPaid", "successfully"],
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

// Create a unique index on acknowledgementNumber (redundant if `unique: true` in schema)

const AdmissionApproval = mongoose.model(
  "AdmissionApproval",
  AdmissionApprovalSchema
);

module.exports = AdmissionApproval;

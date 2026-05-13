const mongoose = require("mongoose");

const offlineResultStudentSchema = new mongoose.Schema(
  {
    rollNo: { type: String, required: true, unique: true, index: true },
    candidateName: { type: String, default: "" },
    fatherName: { type: String, default: "" },
    className: { type: String, default: "" },
    examDate: { type: String, default: "" },
    resultUrl: { type: String, default: "" },
    source: { type: String, default: "offline_result_upload" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("OfflineResultStudent", offlineResultStudentSchema);


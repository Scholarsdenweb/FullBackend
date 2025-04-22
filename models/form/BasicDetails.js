const mongoose = require("mongoose");

const basicDetailsSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  dob: { type: Date, required: true },
  gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
  examName: { type: String, required: true, default: "SDAT" },
  examDate: { type: String, required: true },
  // admitCard: {
  //   type: String,
  // },
  created_at: { type: Date, default: Date.now },
});

const BasicDetails = mongoose.model("BasicDetails", basicDetailsSchema);

module.exports = BasicDetails;

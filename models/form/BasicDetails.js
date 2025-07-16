const mongoose = require("mongoose");

const basicDetailsSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  dob: { type: Date },
  gender: { type: String, enum: ["Male", "Female"] },
  examName: { type: String, default: "SDAT" },
  examDate: { type: String},
  // admitCard: {
  //   type: String,
  // },
  created_at: { type: Date, default: Date.now },
});

const BasicDetails = mongoose.model("BasicDetails", basicDetailsSchema);

module.exports = BasicDetails;

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ExamDateSchema = new mongoose.Schema({
  examDate: {
    type: String,
    required: [true, "Exam Date is required"], // Make it required
    unique: true, // Ensure uniqueness
    validate: {
      validator: function (value) {
        return value !== null && value !== ""; // Prevent null or empty values
      },
      message: "Exam Date cannot be null or empty",
    },
  },
  examName: {
    type: String,
    required: [true, "Exam Name is required"], // Make it required
  },
  scholarshipValidation: {
    type: String,
  },
});

const ExamDate = mongoose.model("ExamDate", ExamDateSchema);

module.exports = ExamDate;

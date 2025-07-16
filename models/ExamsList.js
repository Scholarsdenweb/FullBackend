const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ExamListSchema = new mongoose.Schema({
  examName: {
    type: String,
    required: [true, "Exam Name is required"], // Make it required
    unique: true, // Ensure uniqueness
    validate: {
      validator: function (value) {
        return value !== null && value !== ""; // Prevent null or empty values
      },
      message: "Exam Name cannot be null or empty",
    },
  }
  
});

const ExamList = mongoose.model("ExamList", ExamListSchema);

module.exports = ExamList;

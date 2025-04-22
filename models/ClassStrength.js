const mongoose = require('mongoose');


const { Schema, model } = mongoose;

// Class-wise strength schema
const classStrengthSchema = new Schema({
  class_code: { type: String, required: true, unique: true },
  student_count: { type: Number, default: 0 },  // Count of students in this class
});

const ClassStrength = model('ClassStrength', classStrengthSchema);
module.exports = ClassStrength;
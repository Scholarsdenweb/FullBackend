const mongoose = require('mongoose');


const { Schema, model } = mongoose;

// Total student count schema
const totalStudentsSchema = new Schema({
  total_count: { type: Number, default: 0 },  // Total number of students in all classes
});

const TotalStudents = model('TotalStudents', totalStudentsSchema);
module.exports = TotalStudents;

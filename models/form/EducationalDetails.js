const mongoose = require('mongoose');

const educationalDetailsSchema = new mongoose.Schema({
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    SchoolName: { type: String, required: true },
    Percentage: { type: Number, required: true },
    Class: { type: String, required: true },
    YearOfPassing: { type: Number, required: true },
    Board: { type: String, required: true },
});

const EducationalDetails = mongoose.model('EducationalDetails', educationalDetailsSchema);

module.exports = EducationalDetails;
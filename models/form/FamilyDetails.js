const mongoose = require('mongoose');

const familyDetailsSchema = new mongoose.Schema({
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    FatherName: { type: String, required: true },
    FatherContactNumber: { type: String, required: true },
    FatherOccupation: { type: String, required: true },
    MotherName: { type: String, required: true },
    MotherContactNumber: { type: String, required: true },
    MotherOccupation: { type: String, required: true },
    FamilyIncome: { type: String, required: true },

});

const FamilyDetails= mongoose.model('FamilyDetails', familyDetailsSchema);
module.exports =  FamilyDetails;

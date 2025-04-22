const mongoose = require('mongoose');

const batchRelatedDetailsSchema = new mongoose.Schema({
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    classForAdmission: {type: String, required: true},
    // Not required preferredBatch remove after some time 
    preferredBatch: { type: String },
    subjectCombination: { type: String},
});

const BatchRelatedDetails = mongoose.model('BatchRelatedDetails', batchRelatedDetailsSchema);
module.exports = BatchRelatedDetails;

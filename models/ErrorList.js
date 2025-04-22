const mongoose = require('mongoose');
const ExamDate = require('./ExamDate');

const errorListSchema = new mongoose.Schema({
    error:{
        type:String,
        required:true
    },
    rollNumber:{
        type:String,
        required:true,
        unique: true
    },
    name:{
        type:String,
        required:true
    },
    ExamDate: {
        type: String,
        required: true,
    }
})
const ErrorList = mongoose.model('ErrorList', errorListSchema);
module.exports = ErrorList;
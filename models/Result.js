const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema({
    StudentId: {
        type: String,
        required: true,
        unique: true
    },
    resultUrl:{
        type:String,
        required:true
    },
    examDate: {
        type: String,
        required: true,
    },
    whatsappSent: {
        type: Boolean,
        default: false,
    },
    whatsappSentAt: {
        type: Date,
    },
    whatsappError: {
        type: String,
        default: "",
    }
});


const Result = mongoose.model("Result", resultSchema);
module.exports = Result;

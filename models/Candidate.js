const mongoose = require("mongoose");


const CandidateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    address: {
        type: String,
        required: true,
    },
    interviewDate: {
        type: Date,
    },
    interviewerAssigned: {
        type: String,
    },
    phone: {
        type: String,
        required: true,
    },
    status:{
        type:String,
        required: true,
        default: "pending"
    },
    report:{
        type: String
    },
    date: {
        type: Date,
    }
})


const Candidate = mongoose.model("Candidate", CandidateSchema);
module.exports = Candidate;
const mongoose = require("mongoose");
const otpSchema = new mongoose.Schema({
    otp: {
        type: String,
        required: true,
    },
    mobileNumber: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        required: true,
        default: Date.now,
        expires: 300,
    },
});

const OtpStore = mongoose.model("OtpStore", otpSchema);

module.exports = OtpStore;

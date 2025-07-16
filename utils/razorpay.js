const Razorpay = require("razorpay");
require("dotenv").config();

// console.log("process.env.RAZORPAY_KEY_ID", process.env.RAZORPAY_KEY_ID);
 const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});


module.exports = instance;
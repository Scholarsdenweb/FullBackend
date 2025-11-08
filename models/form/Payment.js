
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    razorpay_payment_id: {
      type: String,
      required: [true, "Payment ID is required"],
      unique: true,
    },
    razorpay_order_id: {
      type: String,
      required: [true, "Order ID is required"],
    },
    razorpay_signature: {
      type: String,
      required: [true, "Payment signature is required"],
    },
    studentId: {
      type: String,
      required: [true, "Student ID is required"],
    },
    payment_amount: {
      type: Number,
      required: [true, "Payment amount is required"],
    },
    payment_status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
    payment_date: {
      type: Date,
      default: Date.now,
    },
    admit_card_sent: {
      type: Boolean,
      default: false,
    },
    whatsapp_sent_date: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
paymentSchema.index({ studentId: 1 });
paymentSchema.index({ razorpay_payment_id: 1 });

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
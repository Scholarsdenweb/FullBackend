
// const mongoose = require("mongoose");

// const paymentSchema = new mongoose.Schema(
//   {
//     razorpay_payment_id: {
//       type: String,
//       required: [true, "Payment ID is required"],
//       unique: true,
//     },
//     razorpay_order_id: {
//       type: String,
//       required: [true, "Order ID is required"],
//     },
//     razorpay_signature: {
//       type: String,
//       required: [true, "Payment signature is required"],
//     },
//      studentId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Students", // Reference to Students model
//       required: [true, "Student ID is required"],
//       index: true, // Add index for student queries
//     },
//   StudentsId: {
//       type: String,
//       index: true,
//     },
//     payment_amount: {
//       type: Number,
//       required: [true, "Payment amount is required"],
//     },
//     payment_status: {
//       type: String,
//       enum: ["pending", "success", "failed"],
//       default: "pending",
//     },
//     payment_date: {
//       type: Date,
//       default: Date.now,
//     },
//     admit_card_sent: {
//       type: Boolean,
//       default: false,
//     },
//     whatsapp_sent_date: {
//       type: Date,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// // Index for faster queries
// // paymentSchema.index({ studentId: 1 });
// // paymentSchema.index({ razorpay_payment_id: 1 });

// const Payment = mongoose.model("Payment", paymentSchema);

// module.exports = Payment;







// models/Payment.js
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    razorpay_payment_id: {
      type: String,
      required: [true, "Payment ID is required"],
      unique: true,
      trim: true,
      // ❌ Remove this: index: true (because you have schema.index below)
    },
    razorpay_order_id: {
      type: String,
      required: [true, "Order ID is required"],
      trim: true,
      index: true, // Keep this one
    },
    razorpay_signature: {
      type: String,
      required: [true, "Payment signature is required"],
      trim: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Students",
      required: [true, "Student ID is required"],
      index: true, // Keep this one
    },
    StudentsId: {
      type: String,
      index: true, // Keep this one
    },
    payment_amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [0, "Payment amount cannot be negative"],
    },
    payment_status: {
      type: String,
      enum: {
        values: ["pending", "success", "failed"],
        message: "{VALUE} is not a valid payment status",
      },
      default: "pending",
      index: true, // Keep this one
    },
    payment_date: {
      type: Date,
      default: Date.now,
      index: true, // Keep this one
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



// Compound indexes for common queries
paymentSchema.index({ studentId: 1, payment_status: 1 });
paymentSchema.index({ payment_status: 1, payment_date: -1 });

// Virtual to populate student details
paymentSchema.virtual("student", {
  ref: "Students",
  localField: "studentId",
  foreignField: "_id",
  justOne: true,
});

// Instance method to mark payment as successful
paymentSchema.methods.markAsSuccessful = async function () {
  this.payment_status = "success";
  this.payment_date = new Date();
  return await this.save();
};

// Instance method to mark admit card as sent
paymentSchema.methods.markAdmitCardSent = async function () {
  this.admit_card_sent = true;
  this.whatsapp_sent_date = new Date();
  return await this.save();
};

// Static method to get successful payments
paymentSchema.statics.getSuccessfulPayments = async function (filter = {}) {
  return await this.find({
    payment_status: "success",
    ...filter,
  })
    .populate("studentId", "studentName StudentsId email contactNumber")
    .sort({ payment_date: -1 });
};

// Static method to get student's payment
paymentSchema.statics.getStudentPayment = async function (studentId) {
  return await this.findOne({ studentId, payment_status: "success" })
    .populate("studentId", "studentName StudentsId email contactNumber");
};

// Static method to check if payment exists
paymentSchema.statics.paymentExists = async function (razorpay_payment_id) {
  const payment = await this.findOne({ razorpay_payment_id });
  return !!payment;
};

// Enable virtuals in JSON
paymentSchema.set("toJSON", { virtuals: true });
paymentSchema.set("toObject", { virtuals: true });

const Payment = mongoose.model("Payment", paymentSchema);
module.exports = Payment;
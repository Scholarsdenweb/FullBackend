const instance = require("../utils/razorpay");
const crypto = require("crypto");
const Payment = require("../models/form/Payment");
const processHTMLAndGenerateAdmitCards = require("../utils/AdmitCardGenerator");
const Students = require("../models/Student");
const BatchRelatedDetails = require("../models/form/BatchRelatedDetails");
const BasicDetails = require("../models/form/BasicDetails");
const FamilyDetails = require("../models/form/FamilyDetails");
const RegistrationCounter = require("../models/RegistrationCounter"); // Updated import

const {
  sendAdmitCardNotification,
} = require("../utils/services/whatsappService");

const { SMSForRegisteredStudent } = require("../utils/smsTemplates");
const Amount = require("../models/Amount");
const { default: mongoose } = require("mongoose");

require("dotenv").config();

const checkout = async (req, res) => {
  console.log("checkout");
  try {
    const amount = await Amount.findOne();

    console.log("amount from create-invoice", amount);

    const options = {
      amount: amount.amount * 100, // amount in the smallest currency unit
      currency: "INR",
      // receipt: "order_rcptid_11"
    };
    console.log("options", options);
    const order = await instance.orders.create(options);

    console.log("order", order);

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.log("checkout error");
    console.log(error);
  }
};

// const paymentVerification = async (req, res) => {
//   try {
//     const {
//       razorpay_payment_id,
//       razorpay_order_id,
//       razorpay_signature,
//       studentId,
//       payment_amount, // Now receiving payment_amount from frontend
//     } = req.body;

//     console.log("Payment verification request:", {
//       razorpay_payment_id,
//       razorpay_order_id,
//       razorpay_signature,
//       studentId,
//       payment_amount,
//     });

//     // Validate required fields
//     if (
//       !razorpay_payment_id ||
//       !razorpay_order_id ||
//       !razorpay_signature ||
//       !studentId ||
//       !payment_amount
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing required payment verification fields",
//       });
//     }

//     // Verify signature
//     const body = razorpay_order_id + "|" + razorpay_payment_id;
//     const expectedSign = crypto
//       .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
//       .update(body.toString())
//       .digest("hex");

//     console.log("Expected signature:", expectedSign);
//     console.log("Received signature:", razorpay_signature);

//     const isAuthentic = expectedSign === razorpay_signature;

//     if (isAuthentic) {
//       // Save payment details to database
//       const payment = await Payment.create({
//         razorpay_payment_id,
//         razorpay_order_id,
//         razorpay_signature,
//         studentId,
//         payment_amount, // Save the amount
//         payment_status: "success",
//         payment_date: new Date(),
//       });

//       console.log("Payment saved successfully:", payment);

//       // Get student details for WhatsApp notification
//       const student = await Students.findOne({ StudentsId: studentId });

//       console.log("Student details for WhatsApp notification:", student);

//       if (student) {
//         // // Send WhatsApp notification
//         // const whatsappResult = await sendAdmitCardNotification({
//         //   studentId: student._id,
//         //   studentName: student.studentName || student.name,
//         //   contactNumber: student.contactNumber || student.phone,
//         //   paymentId: razorpay_payment_id,
//         //   amount: payment_amount,
//         //   admitCardUrl: student.admitCard, // If you have PDF URL
//         // });
//         // if (whatsappResult.success) {
//         //   console.log("Admit card notification sent via WhatsApp");
//         // } else {
//         //   console.error("Failed to send WhatsApp notification:", whatsappResult.error);
//         //   // Don't fail the payment if WhatsApp fails
//         // }
//       }

//       return res.status(200).json({
//         success: true,
//         message: "Payment verified successfully",
//         paymentId: razorpay_payment_id,
//       });
//     } else {
//       console.error("Payment signature verification failed");
//       return res.status(400).json({
//         success: false,
//         message: "Payment verification failed - Invalid signature",
//       });
//     }
//   } catch (error) {
//     console.error("Error in payment verification:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error during payment verification",
//       error: error.message,
//     });
//   }
// };

// ===== HELPER FUNCTION: Verify Payment Signature =====
const verifyPaymentSignature = (orderId, paymentId, signature) => {
  try {
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    return generatedSignature === signature;
  } catch (error) {
    console.error("Error verifying signature:", error);
    return false;
  }
};

// routes/payment.js

const paymentVerification = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      studentId,
      payment_amount,
    } = req.body;

    console.log("Payment verification request:", req.body);
    // Verify payment
    const isValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    // Get student
    const student = await Students.findById(studentId).session(session);

    console.log("student found in payment verification", student);

    if (!student) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Check duplicate payment
    if (student.paymentId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Payment already completed",
        studentsId: student.StudentsId,
      });
    }

    // Get batch details
    const BatchRelatedDetails = mongoose.model("BatchRelatedDetails");
    const batchDetails = await BatchRelatedDetails.findOne({
      student_id: studentId,
    }).session(session);

    if (!batchDetails || !batchDetails.classForAdmission) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Batch details not found",
      });
    }

    // Generate StudentsId using RegistrationCounter (much faster!)
    const studentsId = await Students.allocateStudentsId(
      batchDetails.classForAdmission,
      session
    );

    console.log("Generated StudentsId:", studentsId);

    // Update student
    await Students.findByIdAndUpdate(
      studentId,
      {
        paymentId: razorpay_payment_id,
        StudentsId: studentsId,
      },
      { session, new: true }
    );

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Payment verified and Student ID allocated",
      studentsId: studentsId,
      paymentId: razorpay_payment_id,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Payment verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Payment verification failed",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

const generateAdmitCard = async (req, res) => {
  console.log("GenerateAdmit card function working");

  try {
    console.log("Generate Admit Card");
    const student = await Students.findById(req.user._id);
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }
    if (student.admitCard) {
      console.log("Admit Card Already generated");
      return res.status(200).json({
        success: true,
        message: "Admit Card Generated Successfully",
      });
    }
    console.log("student from generateAdmitCard", student);

    // const studentDetails = await Student.findById({_id: req.user._id});
    const basicDetails = await BasicDetails.findOne({
      student_id: req.user._id,
    });
    if (!basicDetails) {
      return res
        .status(404)
        .json({ success: false, message: "Basic Details not found" });
    }
    const batchDetails = await BatchRelatedDetails.findOne({
      student_id: req.user._id,
    });
    if (!batchDetails) {
      return res
        .status(404)
        .json({ success: false, message: "Batch Details not found" });
    }
    const familyDetails = await FamilyDetails.findOne({
      student_id: req.user._id,
    });

    console.log("studentDetails", student);
    console.log("familyDetails", familyDetails);
    console.log("basicDetails", basicDetails);
    console.log("batchDetails", batchDetails);
    // Allocate a new StudentsId

    const data = {
      name: student.studentName,
      class: batchDetails.classForAdmission,
      stream: batchDetails.program,
      examDate: basicDetails.examDate,
      examTime: "12:00 PM",
      profilePicture: student.profilePicture,

      paymentId: student.paymentId,
      studentId: student.StudentsId,
      FatherName: familyDetails.FatherName,
      CenterName: "Bulding 1",
      CenterAddress: "Near Qila, Kanth Road Moradabad, Uttar Pradesh",
    };
    // Generate admit card
    const admitCard = await processHTMLAndGenerateAdmitCards(data);
    console.log("Admit card generated:", admitCard);
    student.admitCard = admitCard;
    const updatedStudent = await student.save();
    console.log("Updated student:", updatedStudent);

    // Send success response

    // return res.redirect(`${process.env.FRONTEND_URL}/registration/payment`);

    return res.status(200).json({
      success: true,
      message: "Admit Card Generated Successfully",
      updatedStudent,
    });
  } catch (error) {
    console.log("Error in payment verification:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      errorData: error,
    });
  }
};

// router.post("/sendVerification", async (req, res) => {
//   try {
//     const { mobileNumber } = req.body;
//     console.log("req.body from sendVerification", req.body);

//     if (!mobileNumber) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Mobile number is required." });
//     }

//     console.log(mobileNumber);
//     console.log(process.env.FAST2SMS_API_KEY);

//     // Generate a random 4-digit OTP
//     const otp = Math.floor(1000 + Math.random() * 9000);

//     console.log("otp code ", otp);

//     const options = {
//       method: "POST",
//       url: "https://www.fast2sms.com/dev/bulkV2",
//       headers: {
//         authorization: `${process.env.FAST2SMS_API_KEY}`,
//         "Content-Type": "application/x-www-form-urlencoded",
//       },
//       data: {
//         route: "dlt",
//         sender_id: "SCHDEN",
//         message: "182187",
//         variables_values: `${otp}|`,
//         flash: 0,
//         numbers: `${mobileNumber}`,
//       },
//     };
//     let otpStoreData;
//     // Make the API request to Fast2SMS
//     const response = await axios.post(options.url, options.data, {
//       headers: options.headers,
//     });

//     console.log(response.data);

//     // Store the OTP in the database
//     const existingOtp = await OtpStore.findOne({ mobileNumber });

//     if (existingOtp) {
//       // Update the existing document if an OTP is already stored for this number
//       existingOtp.otp = otp;
//       existingOtp.createdAt = new Date();
//       await existingOtp.save();
//     } else {
//       // Create a new document if no OTP exists for this number
//       otpStoreData = await OtpStore.create({ otp, mobileNumber });
//     }

//     // Construct and send a custom response
//     return res.status(200).json({
//       success: true,
//       message: "OTP sent successfully",
//       smsResponse: response.data, // Include the response from Fast2SMS
//       otpStoreData,
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({
//       success: false,
//       message: "Failed to send OTP.",
//       error: error.message, // Include the error message for easier debugging
//     });
//   }
// });

const getKey = async (req, res) => {
  try {
    console.log("process.env.RAZORPAY_KEY", process.env.RAZORPAY_KEY_ID);
    res.status(200).json({
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.log(error);
  }
};

const getAllPaymentDetails = async (req, res) => {
  try {
    const addDetails = await Payment.find({});
    console.log("addDetails", addDetails);
    res.status(200).json({ addDetails });
  } catch (error) {
    res.status(400).json({ error: error });
  }
};

module.exports = {
  checkout,
  paymentVerification,
  getKey,
  getAllPaymentDetails,
  generateAdmitCard,
};

const getRazorpay = require("../utils/razorpay");
const crypto = require("crypto");
const Payment = require("../models/form/Payment");
const processHTMLAndGenerateAdmitCards = require("../utils/AdmitCardGenerator");
const Students = require("../models/Student");
const BatchRelatedDetails = require("../models/form/BatchRelatedDetails");
const BasicDetails = require("../models/form/BasicDetails");
const FamilyDetails = require("../models/form/FamilyDetails");
const EducationalDetails = require("../models/form/EducationalDetails");
const RegistrationCounter = require("../models/RegistrationCounter"); // Updated import
const { syncRegistrationToCims } = require("../utils/cimsSyncService");

const {
  sendAdmitCardNotification,
} = require("../utils/services/whatsappService");

const { SMSForRegisteredStudent } = require("../utils/smsTemplates");
const Amount = require("../models/Amount");
const { default: mongoose } = require("mongoose");

require("dotenv").config();

const checkout = async (req, res) => {
  try {
    const instance = getRazorpay();
    if (!instance) {
      return res.status(500).json({
        success: false,
        message: "Razorpay is not configured on server",
      });
    }

    const studentId =
      req.body?.studentId ||
      req.body?.studentID ||
      req.body?.student_id ||
      req.body?.registrationId ||
      req.body?.registration_id;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "studentId (or studentID/registrationId) is required",
      });
    }

    const amount = await Amount.findOne();
    const student = await Students.findById(studentId).lean();
    const basicDetails = await BasicDetails.findOne({ student_id: studentId }).lean();
    const batchDetails = await BatchRelatedDetails.findOne({ student_id: studentId }).lean();
    const familyDetails = await FamilyDetails.findOne({ student_id: studentId }).lean();
    const educationalDetails = await EducationalDetails.findOne({ student_id: studentId }).lean();

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }


    const options = {
      amount: amount.amount * 100,
      currency: "INR",
      notes: {
        // Keep multiple aliases so webhook parsing is resilient
        studentId: String(studentId),
        studentID: String(studentId),
        student_id: String(studentId),
        registrationId: String(studentId),
      },
      // add agiain when this feature allow on my account
      // fee_bearer: "customer",
    };
    const order = await instance.orders.create(options);

    const prePaymentPayload = {
      registrationId: String(studentId),
      student_name: student.studentName || "",
      student_phone: student.contactNumber || "",
      student_email: student.email || "",
      current_class: batchDetails?.classForAdmission || "",
      school_name: educationalDetails?.SchoolName || "",
      board: educationalDetails?.Board || "",
      medium: "",
      last_percentage:
        educationalDetails?.Percentage != null ? String(educationalDetails.Percentage) : "",
      father_name: familyDetails?.FatherName || "",
      father_phone: familyDetails?.FatherContactNumber || "",
      mother_name: familyDetails?.MotherName || "",
      annual_income: familyDetails?.FamilyIncome || "",
      exam_date: basicDetails?.examDate || "",
      payment_mode: "online",
      payment_status: "pending",
      registration_fee: amount?.amount || 0,
      razorpay_order_id: order?.id || "",
    };
    const preSyncResult = await syncRegistrationToCims(prePaymentPayload, "pre_payment");


    res.status(200).json({
      success: true,
      order,
      cimsSync: preSyncResult,
    });
  } catch (error) {
    console.log("Error form the catch", error)
     res.status(500).json({ success: false });
  }
};

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

// const paymentVerification = async (req, res) => {
//   const session = await mongoose.startSession();

//   // I want to create a webhook on the

//   try {
//     await session.startTransaction();

//     console.log("Session started for payment verification:", session.id);

//     console.log("req.body in paymentVerification", req.body);

//     const {
//       razorpay_payment_id,
//       razorpay_order_id,
//       razorpay_signature,
//       studentId,
//       payment_amount,
//     } = req.body;

//     console.log("Payment verification request:", req.body);
//     // Verify payment
//     const isValid = verifyPaymentSignature(
//       razorpay_order_id,
//       razorpay_payment_id,
//       razorpay_signature,
//     );

//     if (!isValid) {
//       await session.abortTransaction();
//       return res.status(400).json({
//         success: false,
//         message: "Invalid payment signature",
//       });
//     }

//     // Get student
//     const student = await Students.findById(studentId).session(session);

//     console.log("student found in payment verification", student);

//     if (!student) {
//       await session.abortTransaction();
//       return res.status(404).json({
//         success: false,
//         message: "Student not found",
//       });
//     }

//     // Check duplicate payment
//     if (student.paymentId) {
//       await session.abortTransaction();
//       return res.status(400).json({
//         success: false,
//         message: "Payment already completed",
//         studentsId: student.StudentsId,
//       });
//     }

//     // Get batch details
//     const BatchRelatedDetails = mongoose.model("BatchRelatedDetails");
//     const batchDetails = await BatchRelatedDetails.findOne({
//       student_id: studentId,
//     }).session(session);

//     if (!batchDetails || !batchDetails.classForAdmission) {
//       await session.abortTransaction();
//       return res.status(400).json({
//         success: false,
//         message: "Batch details not found",
//       });
//     }

//     // Generate StudentsId using RegistrationCounter (much faster!)
//     const studentsId = await Students.allocateStudentsId(
//       batchDetails.classForAdmission,
//       session,
//     );

//     console.log("Generated StudentsId:", studentsId);

//     // Update student
//     await Students.findByIdAndUpdate(
//       studentId,
//       {
//         paymentId: razorpay_payment_id,
//         StudentsId: studentsId,
//       },
//       { session, new: true },
//     );

//     const paymentRecord = new Payment({
//       razorpay_payment_id,
//       razorpay_order_id,
//       razorpay_signature,
//       studentId,
//       StudentsId: studentsId,
//       payment_amount,
//       payment_status: "success",
//       payment_date: new Date(),
//     });

//     await paymentRecord.save({ session });

//     console.log("Payment record created:", paymentRecord._id);

//     await session.commitTransaction();

//     return res.status(200).json({
//       success: true,
//       message: "Payment verified and Student ID allocated",
//       studentsId: studentsId,
//       paymentId: razorpay_payment_id,
//     });
//   } catch (error) {
//     await session.abortTransaction();
//     console.error("Payment verification error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Payment verification failed",
//       error: error.message,
//     });
//   } finally {
//     session.endSession();
//   }
// };



const paymentVerification = async (req, res) => {
  try {
    const { razorpay_payment_id } = req.body;

    // Poll until webhook has processed (max ~10 seconds)
    let payment = null;
    for (let i = 0; i < 5; i++) {
      payment = await Payment.findOne({ razorpay_payment_id });
      if (payment) break;
      await new Promise((r) => setTimeout(r, 2000)); // wait 2s between retries
    }

    if (!payment) {
      return res.status(202).json({
        success: false,
        message: "Payment processing, please wait...",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified",
      studentsId: payment.StudentsId,
      paymentId: razorpay_payment_id,
    });

  } catch (error) {
    console.error("paymentVerification error:", error);
    res.status(500).json({ success: false, message: error.message });
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
      examTime: "10:00 AM",
      profilePicture: student.profilePicture,

      paymentId: student.paymentId,
      studentId: student.StudentsId,
      FatherName: familyDetails.FatherName,
      CenterName: "SD Campus",
      CenterAddress:
        "Near Tehsil, Sonakpur Overbridge Road, Moradabad, Uttar Pradesh",
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

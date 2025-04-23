const instance = require("../utils/razorpay");
const crypto = require("crypto");
const Payment = require("../models/form/Payment");
const processHTMLAndGenerateAdmitCards = require("../utils/AdmitCardGenerator");
const Students = require("../models/Student");
const BatchRelatedDetails = require("../models/form/BatchRelatedDetails");
const BasicDetails = require("../models/form/BasicDetails");
const FamilyDetails = require("../models/form/FamilyDetails");

require("dotenv").config();

const checkout = async (req, res) => {
  console.log("checkout");
  try {
    const options = {
      amount: 50000, // amount in the smallest currency unit
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

const paymentVerification = async (req, res) => {
  try {
    // console.log("req.body of paymentVerification", req);
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    console.log("req.body", req.body);

    console.log("rezorpay_signature", razorpay_signature);
    console.log("razorpay_payment_id", razorpay_payment_id);
    console.log("razorpay_order_id", razorpay_order_id);
    console.log("sign", sign);

    // Uncomment if Razorpay signature verification is required
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");
    console.log("ExpectedSign", expectedSign);
    if (razorpay_signature === expectedSign) {
      const payment = await Payment.create({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        payment_date: new Date(),
      });

      console.log("Payment created:", payment);
      return res
        .status(200)
        .json({ success: true, paymentId: razorpay_payment_id });

      // return res.redirect(`http://localhost:5173/payment/success/${payment._id}`);
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid signature",
      });
    }
  } catch (error) {
    console.error("Error in payment verification:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

const generateAdmitCard = async (req, res) => {
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
      stream: batchDetails.subjectCombination,
      examDate: basicDetails.examDate,
      examTime: "12:00 PM",
      profilePicture : student.profilePicture,

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
        updatedStudent
    });
  } catch (error) {
    console.error("Error in payment verification:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
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

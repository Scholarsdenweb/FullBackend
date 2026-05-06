// controllers/webhookHandler.js

const crypto = require("crypto");
const mongoose = require("mongoose");
const Payment = require("../models/form/Payment");
const Students = require("../models/Student");
const BasicDetails = require("../models/form/BasicDetails");
const BatchRelatedDetails = require("../models/form/BatchRelatedDetails");
const FamilyDetails = require("../models/form/FamilyDetails");
const EducationalDetails = require("../models/form/EducationalDetails");
const processHTMLAndGenerateAdmitCards = require("../utils/AdmitCardGenerator");
const { sendAdmitCardNotification } = require("../utils/services/whatsappService");
const { syncRegistrationToCims } = require("../utils/cimsSyncService");

// ─── 1. Verify Razorpay webhook signature ────────────────────────────────────
const verifyWebhookSignature = (rawBody, signature) => {
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody) // must be raw Buffer, not parsed JSON
    .digest("hex");

  return expectedSignature === signature;
};

// ─── 2. Main webhook handler ─────────────────────────────────────────────────
const razorpayWebhook = async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];

  // Verify signature first — reject anything fake
  const isValid = verifyWebhookSignature(req.rawBody, signature);
  if (!isValid) {
    console.error("Webhook: Invalid signature");
    return res.status(400).json({ message: "Invalid webhook signature" });
  }

  const event = req.body.event;
  console.log("Webhook event received:", event);

  // Only process successful payments
  if (event !== "payment.captured") {
    return res.status(200).json({ message: "Event ignored" });
  }


  const paymentEntity = req.body.payload.payment.entity;
  console.log("paymentEntity from the paymentEntity", paymentEntity)

  const {
    id: razorpay_payment_id,
    order_id: razorpay_order_id,
    amount,
    notes, // studentId must be passed in notes from frontend
  } = paymentEntity;


  console.log("notes from the razorpayWebhook", notes)
  const studentId =
    notes?.studentId ||
    notes?.studentID ||
    notes?.student_id ||
    notes?.registrationId ||
    notes?.registration_id;

  if (!studentId) {

    console.error("Webhook: studentId missing in payment notes. Notes received:", notes);
    return res.status(400).json({ message: "studentId missing in notes", notes });
  }

  // ── Idempotency check: skip if already processed ──────────────────────────
  const existingPayment = await Payment.findOne({ razorpay_payment_id });
  if (existingPayment) {
    console.log("Webhook: Payment already processed, skipping:", razorpay_payment_id);
    return res.status(200).json({ message: "Already processed" });
  }

  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    // ── Fetch student ─────────────────────────────────────────────────────────
    const student = await Students.findById(studentId).session(session);
    if (!student) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Student not found" });
    }

    // ── Fetch batch details to generate StudentsId ────────────────────────────
    const batchDetails = await BatchRelatedDetails.findOne({
      student_id: studentId,
    }).session(session);

    console.log("batchDetailes", batchDetails)

    if (!batchDetails?.classForAdmission) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Batch details not found" });
    }

    // ── Allocate StudentsId ───────────────────────────────────────────────────
    const studentsId = await Students.allocateStudentsId(
      batchDetails.classForAdmission,
      session
    );

    // ── Update student record ─────────────────────────────────────────────────
    await Students.findByIdAndUpdate(
      studentId,
      {
        paymentId: razorpay_payment_id,
        StudentsId: studentsId,
      },
      { session, new: true }
    );

    // ── Save payment record ───────────────────────────────────────────────────
    const paymentRecord = new Payment({
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature: "webhook-verified", // signature is webhook-level, not order-level
      studentId,
      StudentsId: studentsId,
      payment_amount: amount / 100, // Razorpay sends amount in paise
      payment_status: "success",
      payment_date: new Date(),
    });

    await paymentRecord.save({ session });
    await session.commitTransaction();


    

    console.log("Webhook: Payment saved, StudentsId:", studentsId);

    // ── Generate Admit Card (outside transaction — heavy async task) ──────────
    postPaymentFlow({
      registrationId: studentId,
      studentsId,
      razorpay_payment_id,
      razorpay_order_id,
      payment_amount: amount / 100,
    }).catch((err) => console.error("Webhook: Background task failed:", err.message));

    // Respond to Razorpay immediately (must be fast — Razorpay expects <5s)
    return res.status(200).json({ message: "Webhook processed successfully" });

  } catch (error) {
    await session.abortTransaction();
    console.error("Webhook processing error:", error.message);
    return res.status(500).json({ message: "Webhook processing failed" });
  } finally {
    session.endSession();
  }
};

// ─── 3. Background: Generate admit card + send WhatsApp ──────────────────────
const generateAndNotify = async (studentId, studentsId) => {
  try {
    console.log("Background: Generating admit card for", studentsId);

    const student = await Students.findById(studentId);
    const basicDetails = await BasicDetails.findOne({ student_id: studentId });
    const batchDetails = await BatchRelatedDetails.findOne({ student_id: studentId });
    const familyDetails = await FamilyDetails.findOne({ student_id: studentId });

    if (!student || !basicDetails || !batchDetails || !familyDetails) {
      console.error("Background: Missing student data, skipping admit card");
      return { admitCardUrl: "", student, basicDetails, batchDetails, familyDetails, educationalDetails: null };
    }

    const educationalDetails = await EducationalDetails.findOne({ student_id: studentId });

    // Skip if admit card already generated
    let admitCardUrl = student.admitCard || "";
    if (student.admitCard) {
      console.log("Background: Admit card already exists, skipping generation");
    } else {
      const data = {
        name: student.studentName,
        class: batchDetails.classForAdmission,
        stream: batchDetails.program,
        examDate: basicDetails.examDate,
        examTime: "10:00 AM",
        profilePicture: student.profilePicture,
        paymentId: student.paymentId,
        studentId: studentsId,
        FatherName: familyDetails.FatherName,
        CenterName: "SD Campus",
        CenterAddress: "Near Tehsil, Sonakpur Overbridge Road, Moradabad, Uttar Pradesh",
      };

      console.log("Data from the generateAndNotify", data );

      admitCardUrl = await processHTMLAndGenerateAdmitCards(data);
      student.admitCard = admitCardUrl;
      await student.save();
      console.log("Background: Admit card generated:", admitCardUrl);
    }

    // Send WhatsApp notification
    const notifyResult = await sendAdmitCardNotification(studentsId);
    console.log("Background: WhatsApp notification result:", notifyResult);
    return { admitCardUrl, student, basicDetails, batchDetails, familyDetails, educationalDetails };

  } catch (error) {
    console.error("Background: generateAndNotify error:", error.message);
    throw error;
  }
};

const postPaymentFlow = async ({
  registrationId,
  studentsId,
  razorpay_payment_id,
  razorpay_order_id,
  payment_amount,
  payment_mode = "online",
}) => {
  console.log(`[CIMS_SYNC][post_payment][STEP 1] start registrationId=${registrationId}`);
  const details = await generateAndNotify(registrationId, studentsId);
  console.log(`[CIMS_SYNC][post_payment][STEP 2] admit card stage done registrationId=${registrationId}`);

  const payload = {
    registrationId: String(registrationId),
    student_id: studentsId,
    student_name: details?.student?.studentName || "",
    student_phone: details?.student?.contactNumber || "",
    student_email: details?.student?.email || "",
    current_class: details?.batchDetails?.classForAdmission || "",
    school_name: details?.educationalDetails?.SchoolName || "",
    board: details?.educationalDetails?.Board || "",
    medium: "",
    last_percentage:
      details?.educationalDetails?.Percentage != null
        ? String(details.educationalDetails.Percentage)
        : "",
    father_name: details?.familyDetails?.FatherName || "",
    father_phone: details?.familyDetails?.FatherContactNumber || "",
    mother_name: details?.familyDetails?.MotherName || "",
    annual_income: details?.familyDetails?.FamilyIncome || "",
    exam_date: details?.basicDetails?.examDate || "",
    payment_mode,
    payment_status: "paid",
    payment_amount,
    registration_fee: payment_amount,
    payment_date: new Date().toISOString(),
    razorpay_payment_id,
    razorpay_order_id,
    admit_card_url: details?.admitCardUrl || "",
  };

  await syncRegistrationToCims(payload, "post_payment_webhook");
  console.log(`[CIMS_SYNC][post_payment][STEP 3] cims upsert done registrationId=${registrationId}`);
};

module.exports = { razorpayWebhook, postPaymentFlow };

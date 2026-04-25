const express = require("express");
const mongoose = require("mongoose");

const Students = require("../models/Student");
const Result = require("../models/Result");
const Payment = require("../models/form/Payment");
const BasicDetails = require("../models/form/BasicDetails");
const BatchRelatedDetails = require("../models/form/BatchRelatedDetails");
const EducationalDetails = require("../models/form/EducationalDetails");
const FamilyDetails = require("../models/form/FamilyDetails");
const internalApiKeyMiddleware = require("../middleware/internalApiKey");
const { postPaymentFlow } = require("../controllers/webhookHandler");

const router = express.Router();

const CLASS_MAP = {
  "06": "VI",
  "07": "VII",
  "08": "VIII",
  "09": "IX",
  "10": "X",
  "11": "XI Engineering",
  "12": "XII Engineering",
  "13": "XII Passed Engineering",
  "14": "XI Medical",
  "15": "XII Medical",
  "16": "XII Passed Medical",
};

const pickDefined = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );

router.post("/generate-id", internalApiKeyMiddleware, async (req, res) => {
  console.log("integration from the generate_id is working", req.body )
  const classKey = String(req.body.classKey || "").trim();
  const classForAdmission = CLASS_MAP[classKey];
  const studentName = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const phone = String(req.body.phone || "").trim();
  const profilePicture = String(
    req.body.student_photo_url ||
      req.body.studentPhotoUrl ||
      req.body.profilePicture ||
      ""
  ).trim();
  const dob = req.body.dob || undefined;
  const gender = req.body.gender || undefined;
  const examDate = req.body.examDate || req.body.exam_date || undefined;
  const program = req.body.program || req.body.stream || undefined;
  const schoolName = req.body.schoolName || req.body.school_name || undefined;
  const board = req.body.board || undefined;
  const percentage = req.body.percentage  || undefined;
  const className = req.body.className || req.body.current_class || classForAdmission;
  const yearOfPassing = req.body.yearOfPassing || req.body.year_of_passing || undefined;
  const fatherName = req.body.fatherName || req.body.father_name || undefined;
  const fatherContact = req.body.fatherPhone || req.body.father_phone || undefined;
  const fatherOccupation = req.body.fatherOccupation || req.body.father_occupation || undefined;
  const motherName = req.body.motherName || req.body.mother_name || undefined;
  const motherContact = req.body.motherPhone || req.body.mother_phone || undefined;
  const motherOccupation = req.body.motherOccupation || req.body.mother_occupation || undefined;
  const familyIncome = req.body.familyIncome || req.body.annual_income || undefined;

  if (!classForAdmission) {
    return res.status(400).json({ error: "Invalid classKey" });
  }
  if (!studentName) {
    return res.status(400).json({ error: "name is required" });
  }
  if (!phone) {
    return res.status(400).json({ error: "phone is required" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const lookup = [{ contactNumber: phone }];
    if (email) lookup.push({ email });

    let student = await Students.findOne({ $or: lookup }).session(session);
    if (!student || student.admitCard) {
      student = new Students({
        studentName,
        email: email || undefined,
        contactNumber: phone,
        profilePicture: profilePicture || undefined,
        role: "student",
      });
      console.log("Student from the generate_id", student)
    } else {
      if (!student.studentName) student.studentName = studentName;
      if (!student.email && email) student.email = email;
      if (profilePicture) student.profilePicture = profilePicture;
    }

    // if (!student.StudentsId) {
    //   student.StudentsId = await Students.allocateStudentsId(classForAdmission, session);
    // }

    await student.save({ session });

    await BasicDetails.findOneAndUpdate(
      { student_id: student._id },
      {
        $set: pickDefined({
          dob,
          gender,
          examDate,
          examName: req.body.examName || req.body.exam_name || "SDAT",
        }),
      },
      { upsert: true, new: true, session }
    );

    await BatchRelatedDetails.findOneAndUpdate(
      { student_id: student._id },
      {
        $set: pickDefined({
          classForAdmission,
          program,
        }),
      },
      { upsert: true, new: true, session }
    );

    await EducationalDetails.findOneAndUpdate(
      { student_id: student._id },
      {
        $set: pickDefined({
          SchoolName: schoolName,
          Percentage: percentage,
          Class: className,
          YearOfPassing: yearOfPassing,
          Board: board,
        }),
      },
      { upsert: true, new: true, session }
    );

    await FamilyDetails.findOneAndUpdate(
      { student_id: student._id },
      {
        $set: pickDefined({
          FatherName: fatherName,
          FatherContactNumber: fatherContact,
          FatherOccupation: fatherOccupation,
          MotherName: motherName,
          MotherContactNumber: motherContact,
          MotherOccupation: motherOccupation,
          FamilyIncome: familyIncome,
        }),
      },
      { upsert: true, new: true, session }
    );

    await session.commitTransaction();
    session.endSession();

    console.log("stduent from the generate_id", student)

    return res.status(200).json({ student_ObjectId: student.id });
  } catch (error) {
    console.log("error from the catch", error)
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ error: "Failed to generate studentId", details: error.message });
  }
});

router.get("/students/:studentId", internalApiKeyMiddleware, async (req, res) => {
  const studentId = String(req.params.studentId || "").trim();
  if (!studentId) {
    return res.status(400).json({ error: "studentId is required" });
  }

  try {
    const student = await Students.findOne({ StudentsId: studentId }).lean();
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const result = await Result.findOne({ StudentId: studentId }).lean();
    return res.status(200).json({
      studentId,
      studentName: student.studentName || "",
      email: student.email || "",
      phone: student.contactNumber || "",
      resultUrl: result?.resultUrl || "",
      examDate: result?.examDate || "",
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch student", details: error.message });
  }
});

router.post("/payments/cash/confirm", internalApiKeyMiddleware, async (req, res) => {
  const registrationId = String(
    req.body.registrationId ||
      req.body.registration_id ||
      req.body.studentId ||
      req.body.student_id ||
      ""
  ).trim();
  const paymentAmount = Number(req.body.payment_amount || req.body.amount || 0);
  const paymentDateRaw = req.body.payment_date || req.body.paymentDate || null;

  if (!registrationId) {
    return res.status(400).json({ error: "registrationId is required" });
  }
  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    return res.status(400).json({ error: "payment_amount must be a positive number" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const student = await Students.findById(registrationId).session(session);
    if (!student) {
      await session.abortTransaction();
      return res.status(404).json({ error: "Student not found" });
    }

    let studentsId = student.StudentsId;
    if (!studentsId) {
      const batchDetails = await BatchRelatedDetails.findOne({ student_id: registrationId }).session(session);
      if (!batchDetails?.classForAdmission) {
        await session.abortTransaction();
        return res.status(400).json({ error: "Batch details not found" });
      }
      studentsId = await Students.allocateStudentsId(batchDetails.classForAdmission, session);
      student.StudentsId = studentsId;
    }

    const existingSuccessPayment = await Payment.findOne({
      studentId: registrationId,
      payment_status: "success",
    })
      .sort({ payment_date: -1 })
      .session(session);

    const cashPaymentId =
      existingSuccessPayment?.razorpay_payment_id ||
      `cash_${registrationId}_${Date.now()}`;
    const cashOrderId = existingSuccessPayment?.razorpay_order_id || `cash_order_${registrationId}`;

    if (!existingSuccessPayment) {
      student.paymentId = cashPaymentId;
      await student.save({ session });

      const paymentRecord = new Payment({
        razorpay_payment_id: cashPaymentId,
        razorpay_order_id: cashOrderId,
        razorpay_signature: "cash-verified",
        studentId: registrationId,
        StudentsId: studentsId,
        payment_amount: paymentAmount,
        payment_status: "success",
        payment_date: paymentDateRaw ? new Date(paymentDateRaw) : new Date(),
      });
      await paymentRecord.save({ session });
    } else {
      if (!student.paymentId) {
        student.paymentId = cashPaymentId;
        await student.save({ session });
      }
    }

    await session.commitTransaction();
    session.endSession();

    postPaymentFlow({
      registrationId,
      studentsId,
      razorpay_payment_id: cashPaymentId,
      razorpay_order_id: cashOrderId,
      payment_amount: paymentAmount,
      payment_mode: "cash",
    }).catch((err) =>
      console.error("Cash confirm: postPaymentFlow failed:", err?.message || err)
    );

    return res.status(200).json({
      message: "Cash payment confirmed successfully",
      registrationId,
      student_id: studentsId,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      error: "Failed to confirm cash payment",
      details: error?.message || String(error),
    });
  }
});

module.exports = router;

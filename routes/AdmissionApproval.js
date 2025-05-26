const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const { verifyTokenForAdmission } = require("../middleware/authentication");
const axios = require("axios");
const AdmissionApproval = require("../models/AdmissionApproval");
const Admission = require("../models/Admission");
const { admissionApprovalTemplate } = require("../utils/smsTemplates");

const router = express.Router();

router.post("/addAdmissionApproval", async (req, res) => {
  const { acknowledgementNumber } = req.body;

  console.log("req.body from add AdmissionApproval", req.body);
  try {
    let addAdmissionApproval = await AdmissionApproval.findOne({
      acknowledgementNumber,
    });
    if (addAdmissionApproval)
      return res
        .status(400)
        .json({ message: "AdmissionApproval request already exists" });

    console.log(
      "AdmissionApproval from addAdmissionApproval",
      addAdmissionApproval
    );

    addAdmissionApproval = new AdmissionApproval({
      acknowledgementNumber,
      status: "pending",
      message: "Admission Approval is pending",
    });

    await addAdmissionApproval.save();

    res
      .status(201)
      .json({ message: "Admission approval request submitted successfully." });
  } catch (err) {
    console.log("Eror form add approval", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post(
  "/getAdmissionApprovalByAcknowledgementNumber",
  async (req, res) => {
    console.log(
      "acknowledgementNumber from getAdmissionApprovalByAcknowledgementNumber",
      req.body
    );

    const { acknowledgementNumber } = req.body;

    const findAdmissionApproval = await AdmissionApproval.findOne({
      acknowledgementNumber,
    });
    if (!findAdmissionApproval) {
      return res.status(400).json({ message: "Admission Approval not found" });
    }

    return res
      .status(200)
      .json({ message: "Admission Approval", data: findAdmissionApproval });
  }
);

router.post("/filterAdmissionApproval", async (req, res) => {
  try {
    const { status, acknowledgementNumber } = req.body;
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = 3;
    const skip = (page - 1) * limit;

    let filter = {};

    if (status) {
      filter.status = status.toLowerCase(); // match enum correctly
    }

    if (acknowledgementNumber?.trim()) {
      filter.acknowledgementNumber = {
        $regex: `.*${acknowledgementNumber}.*`,
        $options: "i",
      };
    }
    const total = await AdmissionApproval.countDocuments(filter);
    const approvals = await AdmissionApproval.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    console.log("approvals from filetre", approvals);

    res.status(200).json({
      data: approvals,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalResults: total,
      message: "Filtered Approved admissions retrieved",
    });
  } catch (err) {
    console.error("Error during filter:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/editAdmissionApproval", async (req, res) => {
  console.log("EditAdmissionApproval req.body", req.body);
  const {
    acknowledgementNumber,
    status,
    message,
    studentDetails,
    parentDetails,
    documentsDetails,
    signatureDetails,
    bankDetails,
  } = req.body;

  console.log(
    "acknowledgementNumber, status, message, studentDetails,parentDetails,documentsDetails,signatureDetails,bankDetails",
    acknowledgementNumber,
    status,
    message,
    studentDetails,
    parentDetails,
    documentsDetails,
    signatureDetails,
    bankDetails
  );
  try {
    // Check if AdmissionApproval already exists
    let findAdmissionApproval = await AdmissionApproval.findOne({
      acknowledgementNumber,
    });
    if (!findAdmissionApproval)
      return res.status(400).json({ message: "AdmissionApproval not exists" });

    const updateAdmissionApproval = await AdmissionApproval.findOneAndUpdate(
      { acknowledgementNumber },

      {
        status,
        message,
        studentDetails,
        parentDetails,
        documentsDetails,
        signatureDetails,
        bankDetails,
      },
      { new: true }
    );
    await updateAdmissionApproval.save();

    // Send SMS
    console.log("Check message is added or not", updateAdmissionApproval);
    console.log("Check message is added or not", status);
    if (status === "approved") {
      const findAdmission = await Admission.findOne({ acknowledgementNumber });

      const studentClass = findAdmission.studentClass;
      const program = findAdmission.program;

      const { admissionRollNumber } = await Admission.allocateStudentsId(
        studentClass,
        program
      );

      console.log("admissionRollNumber ", admissionRollNumber);
      console.log("findAdmission ", findAdmission);
      console.log("findAdmission ", findAdmission.admissionRollNo);

      findAdmission.admissionRollNo = admissionRollNumber;
      await findAdmission.save();

      console.log(
        "admissionRollNumber on admission approval",
        admissionRollNumber
      );

      console.log("findAdmission for approval", findAdmission);

      admissionApprovalTemplate(findAdmission, acknowledgementNumber);

      // const options = {
      //   method: "POST",
      //   url: "https://www.fast2sms.com/dev/bulkV2",
      //   headers: {
      //     authorization: `${process.env.FAST2SMS_API_KEY}`,
      //     "Content-Type": "application/x-www-form-urlencoded",
      //   },
      //   data: {
      //     route: "dlt",
      //     sender_id: "SCHDEN",
      //     message: "182187",
      //     variables_values: `${acknowledgementNumber}|`,
      //     flash: 0,
      //     numbers: `${findAdmission?.parentsContactNumber}`,
      //   },
      // };
      // let otpStoreData;
      // // Make the API request to Fast2SMS
      // const response = await axios.post(options.url, options.data, {
      //   headers: options.headers,
      // });

      // console.log("response of sms ", response.data);
    }

    return res.status(201).json({
      updateAdmissionApproval,
      message: "Update Admission Approval registered successfully",
    });
  } catch (err) {
    console.log("ERROR FRO EDITaDMISSIONaPPROVAL", err);
    res.status(500).json({ message: "Server error" });
  }
});

// router.get("/completedApproval", async (req, res) => {
//   try {
//     const { page, limit } = req.body;

//     const allCompletedApproval = await AdmissionApproval.find({
//       status: "approved",
//     });

//     res.status(200).json({
//       data: allCompletedApproval,
//       message: "Approved admissions retrieved",
//     });
//   } catch (e) {
//     res.status(500).json({ message: "Server error" });
//   }
// });

router.get("/completedApproval", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = 3;
    const skip = (page - 1) * limit;

    const total = await AdmissionApproval.countDocuments({
      status: "approved",
    });
    const approvals = await AdmissionApproval.find({ status: "approved" })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Optional: newest first

    res.status(200).json({
      data: approvals,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalResults: total,
      message: "Approved admissions retrieved",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/pendingApproval", async (req, res) => {
  console.log("pending Approval function is working");
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = 3;
    const skip = (page - 1) * limit;

    const total = await AdmissionApproval.countDocuments({
      status: "pending",
    });
    const allPendingApproval = await AdmissionApproval.find({
      status: "pending",
    })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    if (!allPendingApproval) {
      return res
        .status(400)
        .json({ message: "Pending Approval not available" });
    }

    res.status(200).json({
      data: allPendingApproval,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalResults: total,
      message: "Approved admissions retrieved",
    });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});
router.get("/rejectedApproval", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = 3;
    const skip = (page - 1) * limit;

    const total = await AdmissionApproval.countDocuments({
      status: "rejected",
    });

    const allRejectedApproval = await AdmissionApproval.find({
      status: "rejected",
    })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    res.status(200).json({
      data: allRejectedApproval,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalResults: total,
      message: "Rejected admissions retrieved",
    });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/details/:ackNumber", async (req, res) => {
  const { ackNumber } = req.params;

  console.log("ackNUmber from backend", ackNumber);
  const findAdmissionDetail = await Admission.find({
    acknowledgementNumber: ackNumber,
  });

  console.log("findAdmissionDetail from backend", findAdmissionDetail);

  res.status(200).json({ data: findAdmissionDetail });
});

module.exports = router;

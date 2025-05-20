const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const { verifyTokenForAdmission } = require("../middleware/authentication");
const axios = require("axios");
const AdmissionApproval = require("../models/AdmissionApproval");
const Admission = require("../models/Admission");

const router = express.Router();

router.post("/addAdmissionApproval", async (req, res) => {
  const { acknowledgementNumber } = req.body;

  console.log("req.body from add AdmissionApproval", req.body);
  try {
    let addAdmissionApproval = await AdmissionApproval.findOne({
      acknowledgementNumber,
    });
    if (addAdmissionApproval)
      return res.status(400).json({ message: "AdmissionApproval request already exists" });

    console.log(
      "AdmissionApproval from addAdmissionApproval",
      addAdmissionApproval
    );

    addAdmissionApproval = new AdmissionApproval({
      acknowledgementNumber,
      status: "pending",
      message : "Admission Approval is pending",
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

    const findAdmissionApproval = await AdmissionApproval.find({
      acknowledgementNumber,
    });
    if (!findAdmissionApproval) {
      return res.status(402).json({ message: "Admission Approval not found" });
    }

    return res
      .status(200)
      .json({ message: "Admission Approval", data: findAdmissionApproval });
  }
);

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

    console.log("Check message is added or not", updateAdmissionApproval);

    return res.status(201).json({
      updateAdmissionApproval,
      message: "Update Admission Approval registered successfully",
    });
  } catch (err) {
    console.log("ERROR FRO EDITaDMISSIONaPPROVAL", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/completedApproval", async (req, res) => {
  try {
    const allCompletedApproval = await AdmissionApproval.find({
      status: "approved",
    });

    res.status(200).json({
      data: allCompletedApproval,
      message: "Approved admissions retrieved",
    });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});
router.get("/pendingApproval", async (req, res) => {
  console.log("pending Approval function is working");
  try {
    const allCompletedApproval = await AdmissionApproval.find({
      status: "pending",
    });

    if (!allCompletedApproval) {
      return res
        .status(400)
        .json({ message: "Pending Approval not available" });
    }

    res.status(200).json({
      data: allCompletedApproval,
      message: "Pending admissions retrieved",
    });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});
router.get("/rejectedApproval", async (req, res) => {
  try {
    const allCompletedApproval = await AdmissionApproval.find({
      status: "rejected",
    });

    res.status(200).json({
      data: allCompletedApproval,
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

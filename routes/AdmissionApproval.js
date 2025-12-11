const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const mongoose = require("mongoose");
const {
  verifyTokenForAdmission,
  admissionAdmin,
} = require("../middleware/authentication");
const axios = require("axios");
const AdmissionApproval = require("../models/AdmissionApproval");
const Admission = require("../models/Admission");
const { admissionApprovalTemplate } = require("../utils/smsTemplates");

const router = express.Router();

router.post("/addAdmissionApproval", admissionAdmin, async (req, res) => {
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
      return res.status(404).json({ message: "Admission Approval not found" });
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
    const limit = 10;
    const skip = (page - 1) * limit;
    console.log("req.body", req.body);
    console.log("req.query", req.query);
    let filter = {};

    if (status) {
      filter.status = status; // match enum correctly
    }

    if (acknowledgementNumber?.trim()) {
      filter.acknowledgementNumber = {
        $regex: `.*${acknowledgementNumber}.*`,
        $options: "i",
      };
    }
    const total = await AdmissionApproval.countDocuments(filter);
    console.log("total", total);
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
  const session = await mongoose.startSession();

  try {
    const {
      acknowledgementNumber,
      status,
      message,
      studentDetails,
      parentDetails,
      documentsDetails,
      signatureDetails,
      addressDetails,
    } = req.body;

    if (!acknowledgementNumber || !status) {
      return res.status(400).json({
        message: "acknowledgementNumber and status are required",
      });
    }

    console.log("EditAdmissionApproval req.body", req.body);

    await session.withTransaction(async () => {
      const existingApproval = await AdmissionApproval.findOne(
        { acknowledgementNumber },
        null,
        { session }
      );

      if (!existingApproval) {
        throw new Error("AdmissionApproval does not exist");
      }

      existingApproval.status = status;
      existingApproval.message = message;
      existingApproval.studentDetails = studentDetails;
      existingApproval.parentDetails = parentDetails;
      existingApproval.documentsDetails = documentsDetails;
      existingApproval.signatureDetails = signatureDetails;
      existingApproval.addressDetails = addressDetails;

      await existingApproval.save({ session });

      res.status(201).json({
        message: "Admission Approval updated successfully",
        updateAdmissionApproval: existingApproval,
      });
    });
  } catch (err) {
    console.error("ERROR FROM /editAdmissionApproval:", {
      message: err.message,
      stack: err.stack,
      errorLabels: err.errorLabels,
      code: err.code,
    });

    res.status(500).json({ message: err.message || "Server error" });
  } finally {
    session.endSession();
  }
});


router.get("/completedApproval", admissionAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = 10;
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
    const limit = 10;
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
router.get("/rejectedApproval", admissionAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = 10;
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
router.get("/notApproved", admissionAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = 10;
    const skip = (page - 1) * limit;

    const total = await AdmissionApproval.countDocuments({
      status: "not approved",
    });

    const allNotApproved = await AdmissionApproval.find({
      status: "not approved",
    })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    res.status(200).json({
      data: allNotApproved,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalResults: total,
      message: "All Not Approved admissions retrieved",
    });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});
router.get("/paid", admissionAdmin, async (req, res) => {
  try {
    console.log("page in paid ", req.query);
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const total = await AdmissionApproval.countDocuments({
      status: "successful",
    });

    const admissionFeePaid = await AdmissionApproval.find({
      status: "successful",
    })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    console.log("admissionFeePaid from paid", admissionFeePaid);
    res.status(200).json({
      data: admissionFeePaid,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalResults: total,
      message: "admissionFeePaid admissions retrieved",
    });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});
router.post("/consellor-assign", admissionAdmin, async (req, res) => {
  try {
    console.log("page in paid ", req.query);
    console.log("req.admin", req.admin);
    const { consellorAssign, acknowledgementNumber } = req.body;

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const assignedCounsellor = await AdmissionApproval.findOneAndUpdate(
      { acknowledgementNumber },
      {
        $set: { assignedCounsellor: consellorAssign },
      },
      { new: true }
    );

    console.log("admissionFeePaid from paid", assignedCounsellor);

    console.log("assignedCounsellor", assignedCounsellor);

    res.status(200).json({
      data: assignedCounsellor,
      message: "Assigned Consellor ",
    });
  } catch (error) {
    console.log("error from consellor-assign ", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/approvalByAssignedConsellor", admissionAdmin, async (req, res) => {
  try {
    console.log("req.admin", req.admin);
    const { _id } = req.admin;
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = 10;
    const skip = (page - 1) * limit;

    const total = await AdmissionApproval.countDocuments({
      assignedCounsellor: _id,
    });

    const allApprovals = await AdmissionApproval.find({
      assignedCounsellor: _id,
    })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    console.log("allApprovals", allApprovals);
    res.status(200).json({
      data: allApprovals,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalResults: total,
      message: "Assign Admission Approvals",
    });
  } catch (error) {
    console.log("error for approvalByAssignedConsellor ", error);
    return res.status(500).json({ message: "Server Error" });
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

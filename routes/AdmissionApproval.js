const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const { verifyTokenForAdmission } = require("../middleware/authentication");
const axios = require("axios");
const AdmissionApproval = require("../models/AdmissionApproval");

const router = express.Router();

router.post("/addAdmissionApproval", async (req, res) => {
  const { admissionRollNo } = req.body;
  try {
    let AdmissionApproval = await AdmissionApproval.findOne({
      admissionRollNo,
    });
    if (AdmissionApproval)
      return res.status(400).json({ message: "Admin already exists" });

    console.log(
      "AdmissionApproval from addAdmissionApproval",
      AdmissionApproval,
      status,
      message
    );

    AdmissionApproval = new AdmissionApproval({
      admissionRollNo,
      status,
      message,
    });

    await AdmissionApproval.save();

    res
      .status(201)
      .json({ message: "Admission approval request submitted successfully." });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});





router.post("/editAdmissionApproval", async (req, res) => {
  const { email, password } = req.body;
  try {
    // Check if admin already exists
    let admin = await Admin.findOne({ email });
    if (admin) return res.status(400).json({ message: "Admin already exists" });

    console.log("admin", email, password);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new admin
    admin = new Admin({
      email,
      password: hashedPassword,
    });

    await admin.save();

    // Generate JWT Token
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(201).json({ token, message: "Admin registered successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});



router.get("/completedApproval", async (req, res) => {
    try{
        const allCompletedApproval = await AdmissionApproval.find({
            status: "approved"
        })


        res.status(200).json({ data: allCompletedApproval, message: "Approved admissions retrieved" });


    }catch(e){
        res.status(500).json({message : "Server error"});
    }
} );
router.get("/pendingApproval", async (req, res) => {
    try{
        const allCompletedApproval = await AdmissionApproval.find({
            status: "pending"
        })


        res.status(200).json({ data: allCompletedApproval, message: "Pending admissions retrieved" });


    }catch(e){
        res.status(500).json({message : "Server error"});
    }
} );
router.get("/rejectedApproval", async (req, res) => {
    try{
        const allCompletedApproval = await AdmissionApproval.find({
            status: "rejected"
        })


        res.status(200).json({ data: allCompletedApproval, message: "Rejected admissions retrieved" });


    }catch(e){
        res.status(500).json({message : "Server error"});
    }
} );

module.exports = router;

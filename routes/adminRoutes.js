const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const { verifyTokenForAdmission } = require("../middleware/authentication");
const axios = require("axios");

const router = express.Router();

// Admin Signup
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    // Check if admin already exists
    let admin = await Admin.findOne({ email });
    if (admin) return res.status(400).json({ message: "Admin already exists" });

    console.log("admin", name, email, password);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new admin
    admin = new Admin({
      name,
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

// Admin Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    console.log("admin", admin);
    console.log("password", password);

    console.log("admin password (hashed):", admin.password); // Logs the hashed password from DB
    console.log("password (input):", password); // Logs the input password
    const isMatch = await bcrypt.compare(password, admin.password);
    console.log("isMatch:", isMatch); //

    // const isMatch = await bcrypt.compare(password, admin.password);
    console.log("isMatch", isMatch);
    // if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get Admin Details (Protected Route)
router.get("/me", verifyTokenForAdmission() , async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select("-password");
    res.json(admin);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

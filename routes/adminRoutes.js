const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const { verifyTokenForAdmission } = require("../middleware/authentication");
const axios = require("axios");


// routes/admin.js
const RegistrationCounter = require("../models/RegistrationCounter"); // Updated import


const router = express.Router();

// Admin Signup
router.post("/signup", async (req, res) => {
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

// Admin Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("req.body", req.body);
  try {
    console.log("email password", email, password);

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
router.get("/me", verifyTokenForAdmission(), async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select("-password");
    res.json(admin);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/allConsoller", async (req, res) => {
  try {
    const allCounsoller = await Admin.find({ role: "counsellor" });
    console.log("allConsoller", allCounsoller);
    return res.status(200).json({ data: allCounsoller });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

// Get all counters with detailed breakdown
router.get("/admin/registration-counters/stats", async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();
    
    const counters = await RegistrationCounter.find({ year: currentYear })
      .sort({ classForAdmission: 1 });

    const stats = counters.map(c => {
      const classCode = romanToInt(c.classForAdmission);
      return {
        year: c.year,
        class: c.classForAdmission,
        classCode: classCode,
        totalStudents: c.count,
        lastStudentsId: c.lastStudentsId,
        nextStudentsId: `${c.year}${classCode}${String(c.count + 101).padStart(3, "0")}`,
        updatedAt: c.updatedAt,
      };
    });

    // Group by base class
    const grouped = {
      regular: stats.filter(s => !s.class.includes("Engineering") && !s.class.includes("Medical")),
      engineering: stats.filter(s => s.class.includes("Engineering")),
      medical: stats.filter(s => s.class.includes("Medical")),
    };

    return res.status(200).json({
      success: true,
      year: currentYear,
      data: stats,
      grouped: grouped,
      summary: {
        totalClasses: stats.length,
        totalStudents: stats.reduce((sum, s) => sum + s.totalStudents, 0),
      }
    });
  } catch (error) {
    console.error("Error fetching counter stats:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
    });
  }
});

// Get specific class counter
router.get("/admin/registration-counters/:year/:class", async (req, res) => {
  try {
    const { year, class: className } = req.params;

    const counter = await RegistrationCounter.findOne({
      year: parseInt(year),
      classForAdmission: className,
    });

    if (!counter) {
      return res.status(404).json({
        success: false,
        message: "Counter not found",
      });
    }

    const classCode = romanToInt(counter.classForAdmission);

    return res.status(200).json({
      success: true,
      data: {
        year: counter.year,
        class: counter.classForAdmission,
        classCode: classCode,
        currentCount: counter.count,
        lastStudentsId: counter.lastStudentsId,
        nextStudentsId: `${counter.year}${classCode}${String(counter.count + 101).padStart(3, "0")}`,
      },
    });
  } catch (error) {
    console.error("Error fetching counter:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch counter",
    });
  }
});

// Reset counter
router.post("/admin/registration-counters/reset", async (req, res) => {
  try {
    const { year, classForAdmission } = req.body;

    if (!year || !classForAdmission) {
      return res.status(400).json({
        success: false,
        message: "Year and class are required",
      });
    }

    const counter = await RegistrationCounter.resetCounter(year, classForAdmission);

    return res.status(200).json({
      success: true,
      message: "Counter reset successfully",
      data: counter,
    });
  } catch (error) {
    console.error("Error resetting counter:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reset counter",
    });
  }
});

// Compare programs (Engineering vs Medical)
router.get("/admin/registration-counters/compare/:year", async (req, res) => {
  try {
    const { year } = req.params;

    const counters = await RegistrationCounter.find({ 
      year: parseInt(year) 
    });

    const comparison = {
      engineering: {
        XI: counters.find(c => c.classForAdmission === "XI Engineering")?.count || 0,
        XII: counters.find(c => c.classForAdmission === "XII Engineering")?.count || 0,
        "XII Passed": counters.find(c => c.classForAdmission === "XII Passed Engineering")?.count || 0,
      },
      medical: {
        XI: counters.find(c => c.classForAdmission === "XI Medical")?.count || 0,
        XII: counters.find(c => c.classForAdmission === "XII Medical")?.count || 0,
        "XII Passed": counters.find(c => c.classForAdmission === "XII Passed Medical")?.count || 0,
      }
    };

    comparison.engineering.total = 
      comparison.engineering.XI + 
      comparison.engineering.XII + 
      comparison.engineering["XII Passed"];

    comparison.medical.total = 
      comparison.medical.XI + 
      comparison.medical.XII + 
      comparison.medical["XII Passed"];

    return res.status(200).json({
      success: true,
      year: parseInt(year),
      comparison: comparison,
      grandTotal: comparison.engineering.total + comparison.medical.total,
    });
  } catch (error) {
    console.error("Error comparing programs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to compare programs",
    });
  }
});

// Initialize counters from existing data (migration)
router.post("/admin/registration-counters/initialize", async (req, res) => {
  try {
    const BatchRelatedDetails = mongoose.model("BatchRelatedDetails");
    
    const classYearGroups = await BatchRelatedDetails.aggregate([
      {
        $lookup: {
          from: "students",
          localField: "student_id",
          foreignField: "_id",
          as: "studentDetails",
        },
      },
      {
        $unwind: "$studentDetails",
      },
      {
        $match: {
          "studentDetails.StudentsId": { $exists: true, $ne: null },
        },
      },
      {
        $addFields: {
          year: {
            $toInt: { $substr: ["$studentDetails.StudentsId", 0, 4] },
          },
        },
      },
      {
        $group: {
          _id: {
            year: "$year",
            class: "$classForAdmission",
          },
          count: { $sum: 1 },
          lastStudentsId: { $last: "$studentDetails.StudentsId" },
        },
      },
    ]);

    const operations = classYearGroups.map((group) => ({
      updateOne: {
        filter: {
          year: group._id.year,
          classForAdmission: group._id.class,
        },
        update: {
          $set: {
            count: group.count,
            lastStudentsId: group.lastStudentsId,
          },
        },
        upsert: true,
      },
    }));

    await RegistrationCounter.bulkWrite(operations);

    return res.status(200).json({
      success: true,
      message: "Registration counters initialized successfully",
      initialized: operations.length,
    });
  } catch (error) {
    console.error("Error initializing counters:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to initialize counters",
    });
  }
});






module.exports = router;

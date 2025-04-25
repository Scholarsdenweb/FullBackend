// routes/admissionRoutes.js
const express = require("express");
const Admission = require("../models/Admission");
const ClassStrength = require("../models/ClassStrength.js");
const TotalStudents = require("../models/TotalStudents.js");

const { verifyTokenForAdmission } = require("../middleware/authentication.js");

const axios = require("axios");

const multer = require("multer");
const path = require("path");
const router = express.Router();
const jwt = require("jsonwebtoken");
const OtpStore = require("../models/OtpStore.js");
const User = require("../models/UserModel.js");
const Students = require("../models/Student.js");

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png/;
    const extname = fileTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    if (extname) {
      return cb(null, true);
    } else {
      return cb(new Error("Only images are allowed"));
    }
  },
});

// Create Admission (Student fills form)
router.post("/createAdmission", async (req, res) => {
  try {
    const { fatherContactNumber } = req.body;

    console.log("CHECK CREATE ADMISSION ", req.body);

    console.log("Request Body:", req.body); // Log request data

    // const studentAvailableInEnquiry = await User.find({
    //   fatherContactNumber,
    // });

    // const studentAvailableInSDAT = await Students.find({
    //   contactNumber: fatherContactNumber,
    // });

    // const tokenForExistingStudent = jwt.sign(
    //   { parentsContactNumber: fatherContactNumber },
    //   process.env.JWT_SECRET
    // );

    // if (studentAvailableInEnquiry || studentAvailableInSDAT) {
    //   return res.status(200).json({
    //     studentAvailableInEnquiry,
    //     studentAvailableInSDAT,
    //     token: tokenForExistingStudent,
    //     message: "studentExist",
    //   });
    // }

    const newAdmission = new Admission({
      parentsContactNumber: fatherContactNumber,
    });
    console.log("jwt_seCRET", process.env.JWT_SECRET);
    const token = jwt.sign({ _id: newAdmission._id }, process.env.JWT_SECRET);

    await newAdmission.save();
    res.status(201).json({ token, newAdmission });
  } catch (err) {
    console.error("Admission Error:", err); // Log actual error
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.patch("/putFormData", verifyTokenForAdmission(), async (req, res) => {
  console.log("req.body from putFormData", req.body);

  try {
    const {
      fatherName,
      fatherAadharId,
      fatherDob,
      fatherBloodGroup,
      fatherOccupations,
      motherName,
      motherAadharId,
      motherDob,
      motherBloodGroup,
      motherOccupations,
      studentName,
      aadharID,
      gender,
      studentClass,
      program,
      category,
      studentPhoto,
      cancelledCheque,
      studentAadhar,
      parentAadhar,
      passportPhotos,
    } = req.body;
    const { _id } = req.user;

    console.log("req.body", req.body);

    console.log("req.user", req.user);

    const document = {
      cancelledCheque,
      studentPhoto,
      studentAadhar,
      parentAadhar,
      passportPhotos,
    };

    const user = await Admission.findOneAndUpdate(
      { _id },
      {
        fatherName,
        fatherAadharId,
        fatherDob,
        fatherBloodGroup,
        fatherOccupations,
        motherName,
        motherAadharId,
        motherDob,
        motherBloodGroup,
        motherOccupations,
        studentName,
        aadharID,
        gender,
        studentClass,
        program,
        category,
        studentPhoto,
        documents: document,
      },
      { new: true }
    );
    console.log("user", user);
    console.log("user", user.documents);

    res.status(200).send({ user });
  } catch (error) {
    console.error("Error in signup:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

router.patch(
  "/submitSiblingsDetails",
  verifyTokenForAdmission(),
  async (req, res) => {
    console.log("req.body from submitSiblingsDetails", req.body);

    try {
      const {
        noOfBrother,
        noOfSister,
        siblingsPosition,
        siblings,
        signatures,
      } = req.body;
      const { _id } = req.user;

      console.log("req.body", signatures);

      // Validation
      if (!signatures.student || !signatures.parent) {
        return res.status(400).json({ message: "All signatures are required" });
      }

      const user = await Admission.findOneAndUpdate(
        { _id },
        {
          noOfBrother,
          noOfSister,
          siblingsPosition,
          siblings,
          signatures,
        },
        { new: true }
      );
      console.log("user from submitSiblingsDetails", user);

      res.status(200).send({ user });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error!" });
    }
  }
);

router.patch("/submitBankRefundForm", verifyTokenForAdmission(), async (req, res) => {
  try {
    const {
      accountHolder,
      bankName,
      studentClass,
      program,
      accountNumber,
      ifscCode,
      relationWithStudent,
      documents,
      signatures,
    } = req.body;
    const { _id } = req.user;

    console.log("data form submitBackend", req.user);

    const { acknowledgementNumber } =
      await Admission.allocatedAcknowledgement();


      console.log("acknowledgement Number", acknowledgementNumber);

    // const { admissionRollNumber, enrollmentNumber } =
    //   await Admission.allocateStudentsId(studentClass, program);
    // console.log(
    //   "newStudentsId",
    //   admissionRollNumber,
    //   "enrollmentNumberGenerator",
    //   enrollmentNumber
    // );

    // Validation
    // if (!signatures.student || !signatures.parent || !signatures.admissionOfficer) {
    //     return res.status(400).json({ message: "All signatures are required" });
    // }

    const user = await Admission.findOneAndUpdate(
      { _id },
      {
        accountHolder,
        bankName,
        accountNumber,
        ifscCode,
        relationWithStudent,
        documents,
        signatures,
        acknowledgementNumber: acknowledgementNumber,
        // admissionRollNo: admissionRollNumber,
        // enrollmentNumber: enrollmentNumber,
      },
      { new: true }
    );

    console.log("User form submit bank details", user);

    res.status(200).send({ user });
  } catch (error) {
    console.log("error from submitBackRefundForm", error);
    res.status(500).json({ message: "Server error!" });
  }
});


// Upload Student Photo
router.post("/upload-photo", upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    res.json({
      filePath: req.file.path,
      message: "Photo uploaded successfully",
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// // Get all Admissions (Admin only)
router.get("/", verifyTokenForAdmission(), async (req, res) => {
  try {
    const admissions = await Admission.find();
    res.json(admissions);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get a specific Admission
router.get("/getUserbyToken", verifyTokenForAdmission(), async (req, res) => {
  try {
    const admission = await Admission.findById(req.user.id);
    if (!admission)
      return res.status(404).json({ message: "Admission not found" });
    res.json(admission);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Update Admission
router.put("/:id", verifyTokenForAdmission(), async (req, res) => {
  try {
    const {
      fatherName,
      fatherAadharId,
      fatherDob,
      fatherBloodGroup,
      fatherOccupations,
      motherName,
      motherAadharId,
      motherDob,
      motherBloodGroup,
      motherOccupations,
    } = req.body;
    const { _id } = req.user;

    console.log("req.body", req.body);

    console.log("req.user", req.user);

    const user = await Admission.findOneAndUpdate(
      { _id },
      {
        fatherName,
        fatherAadharId,
        fatherDob,
        fatherBloodGroup,
        fatherOccupations,
        motherName,
        motherAadharId,
        motherDob,
        motherBloodGroup,
        motherOccupations,
      },
      { new: true }
    );
    console.log("user", user);

    res.status(200).send({ user });
  } catch (error) {
    console.error("Error in signup:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

// Delete Admission
router.delete("/:id", verifyTokenForAdmission(), async (req, res) => {
  try {
    await Admission.findByIdAndDelete(req.params.id);
    res.json({ message: "Admission deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Search Admissions
router.get("/search/:query", verifyTokenForAdmission(), async (req, res) => {
  try {
    const query = req.params.query;
    const admissions = await Admission.find({
      $or: [
        { studentName: { $regex: query, $options: "i" } },
        { fatherName: { $regex: query, $options: "i" } },
      ],
    });
    res.json(admissions);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/classStrength", async (req, res) => {
  try {
    const { class_code } = req.body;

    if (!class_code) {
      return res.status(400).json({ message: "class_code is required" });
    }

    const classStrength = await ClassStrength.findOneAndUpdate(
      { class_code },
      { total_students: 0 }, // Initialize with zero students
      { new: true, upsert: true }
    );

    res
      .status(201)
      .json({ message: "Class Strength Initialized to Zero", classStrength });
  } catch (error) {
    console.error("Error initializing class strength:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/totalStudents", async (req, res) => {
  try {
    const totalStudents = await TotalStudents.findOneAndUpdate(
      {},
      { total_students: 0 }, // Initialize with zero students
      { new: true, upsert: true }
    );

    res
      .status(201)
      .json({ message: "Total Students Initialized to Zero", totalStudents });
  } catch (error) {
    console.error("Error initializing total students:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/sendVerification", async (req, res) => {
  try {
    const { mobileNumber } = req.body;
    console.log("req.body from sendVerification", req.body);

    if (!mobileNumber) {
      return res
        .status(400)
        .json({ success: false, message: "Mobile number is required." });
    }

    console.log(mobileNumber);
    console.log(process.env.FAST2SMS_API_KEY);

    // Generate a random 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000);

    console.log("otp code ", otp);

    const options = {
      method: "POST",
      url: "https://www.fast2sms.com/dev/bulkV2",
      headers: {
        authorization: `${process.env.FAST2SMS_API_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: {
        route: "dlt",
        sender_id: "SCHDEN",
        message: "182187",
        variables_values: `${otp}|`,
        flash: 0,
        numbers: `${mobileNumber}`,
      },
    };
    let otpStoreData;
    // Make the API request to Fast2SMS
    const response = await axios.post(options.url, options.data, {
      headers: options.headers,
    });

    console.log(response.data);

    // Store the OTP in the database
    const existingOtp = await OtpStore.findOne({ mobileNumber });

    if (existingOtp) {
      // Update the existing document if an OTP is already stored for this number
      existingOtp.otp = otp;
      existingOtp.createdAt = new Date();
      await existingOtp.save();
    } else {
      // Create a new document if no OTP exists for this number
      otpStoreData = await OtpStore.create({ otp, mobileNumber });
    }

    // Construct and send a custom response
    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      smsResponse: response.data, // Include the response from Fast2SMS
      otpStoreData,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP.",
      error: error.message, // Include the error message for easier debugging
    });
  }
});

router.post("/verifyNumber", async (req, res) => {
  const { mobileNumber, otp } = req.body;
  try {
    const existingOtp = await OtpStore.findOne({ mobileNumber });

    if (!existingOtp) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid mobile number." });
    }

    if (existingOtp.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP." });
    }

    const currentTime = new Date();

    if (currentTime > existingOtp.createdAt + 300) {
      return res
        .status(400)
        .json({ success: false, message: "OTP has expired." });
    }
    const deleteData = await OtpStore.deleteOne({ mobileNumber });
    return res
      .status(200)
      .json({ success: true, message: "OTP verification successful." });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify OTP.",
      error: error.message,
    });
  }
});

module.exports = router;

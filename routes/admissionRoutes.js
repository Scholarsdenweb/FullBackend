// routes/admissionRoutes.js
const express = require("express");
const Admission = require("../models/Admission");

const ClassStrength = require("../models/ClassStrength.js");
const TotalStudents = require("../models/TotalStudents.js");

const {
  verifyTokenForAdmission,
  verifyTokenForExistingAdmission,
} = require("../middleware/authentication.js");

const axios = require("axios");

const multer = require("multer");
const path = require("path");
const router = express.Router();
const jwt = require("jsonwebtoken");
const OtpStore = require("../models/OtpStore.js");
const User = require("../models/UserModel.js");
const Students = require("../models/Student.js");
const AdmissionApproval = require("../models/AdmissionApproval.js");
const {
  otpVerification,
  admissionApprovalTemplate,
} = require("../utils/smsTemplates.js");

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

// router.post(
//   "/getStudentByPhone",
//   verifyTokenForExistingAdmission(),
//   async (req, res) => {
//     const { parentsContactNumber } = req.user;

//     try {
//       const findExistingAdmission = await Admission.find({
//         parentsContactNumber,
//       });

//       console.log(
//         "findEsistingAdmission from getStudentByPhone",
//         findExistingAdmission
//       );

//       return res.status(200).json({
//         data: findExistingAdmission,
//         message: "Student Already Exist",
//       });
//     } catch (error) {
//       console.log("error ", error);
//       return res.status(500).json({ message: "Server Error" });
//     }
//   }
// );

router.post(
  "/getStudentByPhone",
  verifyTokenForExistingAdmission(),
  async (req, res) => {
    const { parentsContactNumber } = req.user;

    try {
      // Step 1: Find students by parent contact
      const admissions = await Admission.find({ parentsContactNumber });

      // Step 2: Get all acknowledgement numbers
      const acknowledgementNumbers = admissions.map(
        (ad) => ad.acknowledgementNumber
      );

      // Step 3: Find related approvals
      const approvals = await AdmissionApproval.find({
        acknowledgementNumber: { $in: acknowledgementNumbers },
      });

      console.log("approvals from getStudentByPhone", approvals);

      // Step 4: Create a map for faster lookup
      const approvalMap = {};
      approvals.forEach((approval) => {
        approvalMap[approval.acknowledgementNumber] = approval;
      });

      // Step 5: Attach approval to each student
      const resultWithApprovals = admissions.map((admission) => ({
        ...admission.toObject(),
        approvalStatus:
          approvalMap[admission.acknowledgementNumber]?.status || "pending",
        approvalMessage:
          approvalMap[admission.acknowledgementNumber]?.message ||
          "Not yet reviewed",
        approvalDetails: approvalMap[admission.acknowledgementNumber] || null,
      }));

      return res.status(200).json({
        data: resultWithApprovals,
        message: "Students fetched with approval status.",
      });
    } catch (error) {
      console.error("Error in getStudentByPhone:", error);
      return res.status(500).json({ message: "Server Error" });
    }
  }
);

// Need to delete aftersome time
router.delete("/deleteAdmissionForContactNumber", async (req, res) => {
  const { parentsContactNumber } = req.body;

  try {
    const deletedAdmission = await Admission.deleteMany({
      parentsContactNumber,
    });
    res.json({ message: "Admission deleted", data: deletedAdmission });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Create Admission (Student fills form)
router.post("/createAdmission", async (req, res) => {
  try {
    const { fatherContactNumber } = req.body;

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

    const findAllAdmisssion = await Admission.find({
      parentsContactNumber: fatherContactNumber,
    });

    if (findAllAdmisssion.length > 0) {
      const token = jwt.sign(
        { parentsContactNumber: fatherContactNumber },
        process.env.JWT_SECRET
      );

      return res.status(201).json({
        token,
        message: "Student Already Exist in Admission",
        data: findAllAdmisssion,
      });
    }

    const { acknowledgementNumber } =
      await Admission.allocatedAcknowledgement();
    const newAdmission = new Admission({
      parentsContactNumber: fatherContactNumber,
      acknowledgementNumber,
    });

    const token = jwt.sign(
      {
        _id: newAdmission._id,
        parentsContactNumber: fatherContactNumber,
        acknowledgementNumber,
      },
      process.env.JWT_SECRET
    );

    await newAdmission.save();
    res.status(201).json({ token, newAdmission });
  } catch (err) {
    console.error("Admission Error:", err); // Log actual error
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post(
  "/createNewAdmission",
  verifyTokenForExistingAdmission(),
  async (req, res) => {
    try {
      const { parentsContactNumber } = req.user;

      console.log("req,user", req.user);
      console.log("parentsContactNumber", parentsContactNumber);
      const { acknowledgementNumber } =
        await Admission.allocatedAcknowledgement();
      const newAdmission = new Admission({
        parentsContactNumber,
        acknowledgementNumber,
      });

      const token = jwt.sign(
        { _id: newAdmission._id, parentsContactNumber, acknowledgementNumber },
        process.env.JWT_SECRET
      );

      await newAdmission.save();
      res.status(201).json({ token, newAdmission });
    } catch (err) {
      console.error("Admission Error:", err); // Log actual error
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

router.post(
  "/editAdmissionDetails",
  verifyTokenForExistingAdmission(),
  async (req, res) => {
    try {
      const { acknowledgementNumber } = req.body;

      const findAdmission = await Admission.findOne({ acknowledgementNumber });
      console.log(
        "acknowledgementNumber from editAdmissionDetails",
        acknowledgementNumber
      );
      if (findAdmission) {
        const token = jwt.sign(
          {
            _id: findAdmission._id,
            parentsContactNumber: findAdmission.fatherContactNumber,
            acknowledgementNumber,
          },
          process.env.JWT_SECRET
        );

        return res.status(201).json({
          token,
        });
      } else {
        return res.status(200).json({ message: "Admission Form not found" });
      }
    } catch (error) {
      console.log("error from createAdmission", error);
      return res.status(500).json({ error });
    }
  }
);

router.patch("/putFormData", verifyTokenForAdmission(), async (req, res) => {
  try {
    const {
      fatherName,
      fatherAadhaarID,
      fatherDob,
      fatherBloodGroup,
      fatherOccupations,
      motherName,
      motherAadhaarID,
      motherDob,
      motherBloodGroup,
      motherOccupations,
      studentName,
      aadhaarID,
      gender,
      studentClass,
      program,
      category,
      studentPhoto,
      cancelledCheque,
      studentAadhaar,
      parentAadhaar,
      passbookPhoto,
    } = req.body;

    console.log("req.body from putFormData", req.body);
    const { _id, parentsContactNumber } = req.user;

    const document = {
      cancelledCheque,
      studentPhoto,
      studentAadhaar,
      parentAadhaar,
      passbookPhoto,
    };

    const findUser = await Admission.find({ parentsContactNumber });

    const user = await Admission.findOneAndUpdate(
      { _id: _id },
      {
        fatherName,
        fatherAadhaarID,
        fatherDob,
        fatherBloodGroup,
        fatherOccupations,
        motherName,
        motherAadhaarID,
        motherDob,
        motherBloodGroup,
        motherOccupations,
        studentName,
        aadhaarID,
        gender,
        studentClass,
        program,
        category,
        studentPhoto,
        cancelledCheque,
        studentPhoto,
        studentAadhaar,
        parentAadhaar,
        passbookPhoto,
      },
      { new: true }
    );
    console.log("user from putFormData", user);
    return res.status(200).json({ user });
  } catch (error) {
    console.error("Error in signup:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.patch(
  "/submitSiblingsDetails",
  verifyTokenForAdmission(),
  async (req, res) => {
    try {
      const {
        noOfBrother,
        noOfSister,
        siblingsPosition,
        siblings,
        signatures,
      } = req.body;
      const { _id } = req.user;

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

      res.status(200).send({ user });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error!" });
    }
  }
);

router.patch(
  "/submitBankRefundForm",
  verifyTokenForAdmission(),
  async (req, res) => {
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

      const findAdmission = await Admission.findById({ _id });

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
          acknowledgementNumber: findAdmission.acknowledgementNumber,
          // admissionRollNo: admissionRollNumber,
          // enrollmentNumber: enrollmentNumber,
        },
        { new: true }
      );

      console.log("uSERdATA FORM SUBMIT findAdmissionApproval", user);

      const findAdmissionApproval = await AdmissionApproval.findOne({
        acknowledgementNumber: findAdmission.acknowledgementNumber,
      });

      console.log("findAdmissionApproval", findAdmissionApproval);

      if (findAdmissionApproval) {
        if (findAdmissionApproval.status === "rejected") {
          findAdmissionApproval.status = "pending";
          await findAdmissionApproval.save();
          return res.status(200).json({
            message:
              "Admission approval request has been successfully initiated",
          });
        }
      } else {
        const addAdmissionApproval = new AdmissionApproval({
          acknowledgementNumber: findAdmission.acknowledgementNumber,
          studentDetails: {
            status: false,
            message: "Student info not verified",
          },
          documentsDetails: {
            studentPhoto: {
              status: false,
              message: "Student Photo info not verified",
            },
            cancelledCheque: {
              status: false,
              message: "Cancelled Cheque info not verified",
            },
            passbookPhoto: {
              status: false,
              message: "Passbook Photo info not verified",
            },
            studentAadhaar: {
              status: false,
              message: "Student Aadhaar info not verified",
            },
            parentAadhaar: {
              status: false,
              message: "Parent Aadhaar info not verified",
            },
            status: false,
            message: "Document info not verified",
          },
          signatureDetails: {
            status: false,
            message: "Signature info not verified",
          },
          bankDetails: {
            status: false,
            message: "Bank account info not verified",
          },
          parentDetails: {
            status: false,
            message: "Parent ID info not verified",
          },
          status: "pending",
          message: "Approval Pending",
        });

        await addAdmissionApproval.save();

        console.log("admissionApproval from the backend", addAdmissionApproval);

        // Sms for after admission form submission
        // const smsResponse = await admissionApprovalTemplate(
        //   findAdmission,
        //   findAdmission.acknowledgementNumber
        // );

        // console.log("smsResponse", smsResponse);

        return res.status(200).json({ user, addAdmissionApproval });
      }

      return res.status(200).json({ Message: "Data" });

      // Save to database
    } catch (error) {
      console.log("error from submitBackRefundForm", error);
      res.status(500).json({ message: "Server error!" });
    }
  }
);

router.post("/filter-ackNumber", async () => {
  try {
    const { filterByAckNumber } = req.body;
    const findByAckNumber = await AdmissionApproval.find({
      acknowledgementNumber: filterByAckNumber,
    });

    res.status(200).json({ findByAckNumber });
  } catch (error) {
    console.log("error ", error);
    res.status(500).json({ message: "Server Error" });
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
    console.log("req.user form getUserbyToken", req.user);
    const { _id, parentsContactNumber, acknowledgementNumber } = req.user;
    const admission = await Admission.find({ acknowledgementNumber });

    if (!admission)
      return res.status(404).json({ message: "Admission not found" });

    res.json(admission);
  } catch (err) {
    console.log("error from backend", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update Admission
router.put("/:id", verifyTokenForAdmission(), async (req, res) => {
  try {
    const {
      fatherName,
      fatherAadhaarID,
      fatherDob,
      fatherBloodGroup,
      fatherOccupations,
      motherName,
      motherAadhaarID,
      motherDob,
      motherBloodGroup,
      motherOccupations,
    } = req.body;
    const { _id } = req.user;

    const user = await Admission.findOneAndUpdate(
      { _id },
      {
        fatherName,
        fatherAadhaarID,
        fatherDob,
        fatherBloodGroup,
        fatherOccupations,
        motherName,
        motherAadhaarID,
        motherDob,
        motherBloodGroup,
        motherOccupations,
      },
      { new: true }
    );

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

    if (!mobileNumber) {
      return res
        .status(400)
        .json({ success: false, message: "Mobile number is required." });
    }

    // Generate a random 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000);

    const response = await otpVerification(otp, mobileNumber);

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
    //     variables_values: `${otp}|`,
    //     flash: 0,
    //     numbers: `${mobileNumber}`,
    //   },
    // };
    // let otpStoreData;
    // // Make the API request to Fast2SMS
    // const response = await axios.post(options.url, options.data, {
    //   headers: options.headers,
    // });

    let otpStoreData;

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

// Need to delete aftersome time
router.delete("/deleteAdmissionForContactNumber", async (req, res) => {
  const { parentsContactNumber } = req.body;

  try {
    await Admission.findAndDelete({ parentsContactNumber });
    res.json({ message: "Admission deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

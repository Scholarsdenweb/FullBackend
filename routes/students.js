const express = require("express");
const router = express.Router();
const axios = require("axios");

const {
  getStudents,
  addStudents,
  editStudent,
  deleteStudent,
  getStudentsById,
  getAdmitCard,
  resultDetails,
  uploadStudentResult,
  getAllStudentByPhone,
  enquiryWithPhoneNumber,
  continueWithExistingStudent,
  createNewStudent,
} = require("../controllers/Students");

const {
  verifyTokenForRegistration,
  checkRole,
  takenPhoneByToken,
} = require("../middleware/authentication");
const OtpStore = require("../models/OtpStore");
const Students = require("../models/Student");
const BatchRelatedDetails = require("../models/form/BatchRelatedDetails");

router.get(
  "/",
  verifyTokenForRegistration("hr"),
  checkRole(["hr"]),
  getStudents
);

router.post(
  "/addStudent",
  verifyTokenForRegistration("hr", "Student"),
  checkRole(["hr"]),
  addStudents
);

router.get(
  "/getStudentsById",
  verifyTokenForRegistration("Student"),
  checkRole(["Student"]),
  getStudentsById
);

router.patch(
  "/editStudent",
  verifyTokenForRegistration(["Student"]),
  checkRole(["Student"]),
  editStudent
);
router.patch(
  "/editStudent/:student_id",
  verifyTokenForRegistration(["hr", "Student"]),
  checkRole(["hr"]),
  editStudent
);
router.delete(
  "/deleteStudent/:student_id",
  verifyTokenForRegistration("hr"),
  checkRole(["hr"]),
  deleteStudent
);

router.get(
  "/getAdmitCard",
  verifyTokenForRegistration("Student"),
  checkRole(["Student"]),
  getAdmitCard
);

router.get(
  "/getResultDetails",
  verifyTokenForRegistration("Student"),
  checkRole("Student"),
  resultDetails
);

router.get("/getAllStudentByPhone", takenPhoneByToken(), getAllStudentByPhone);

router.post(
  "/fetchExistingUserFormEnquiryDetails",
  takenPhoneByToken(),
  enquiryWithPhoneNumber
);
router.post(
  "/continueWithExistingStudent",
  takenPhoneByToken(),
  continueWithExistingStudent
);
router.post("/createNewStudent", takenPhoneByToken(), createNewStudent);

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

    console.log("mobileNumber", mobileNumber);

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

// router.post("/filter/Student", async (req, res) => {
//   try {
//     const { data } = req.body;

//     const allStudents = await Students.find({
//       name: { $regex: data, $options: "i" },
//     });

//     const studentIds = allStudents.map((student) => student._id);

//     const batchDetails = await BatchRelatedDetails.find({
//       student_id: { $in: studentIds },
//     });

//     console.log("batchDetails", batchDetails);

//     const totalData = {...allStudents, ...batchDetails};

//     console.log("TotalData", totalData);

//    return  res.status(200).json(totalData);

//     // const result = allStudents.map((student) => {
//     //   const studentBatch = batchDetails.find(
//     //     (b) => b.student_id.toString() === student._id.toString()
//     //   );
//     //   const batch = batchInfo.find(
//     //     (b) => b._id.toString() === studentBatch?.batch_id.toString()
//     //   );

//     //   return {
//     //     ...student.toObject(),
//     //     batch: batch ? batch.toObject() : null,
//     //   };
//     // });

//     console.log(result);

//     console.log("batchRelatedDetails", batchDetails);
//     console.log("batchRelatedDetails", StudentsId);

//     console.log("allFilterData", allFilterData);

//     res.status(200).json(allFilterData);
//   } catch (error) {
//     console.error("Error filtering students:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

router.post("/filter/Student", async (req, res) => {
  try {
    const { data } = req.body;

    console.log("Data", data);

    // 1. Find students by name
    const allStudents = await Students.find({
      studentName: { $regex: data, $options: "i" },
    });
    console.log("allStudents data", allStudents);
    // 2. Get list of student IDs
    const studentIds = allStudents.map((student) => student._id);

    // 3. Get batch details for those students
    const batchDetails = await BatchRelatedDetails.find({
      student_id: { $in: studentIds },
    });

    console.log("batchDetails", batchDetails);
    // 4. Merge student with their batch details
    const totalData = allStudents.map((student) => {
      const studentBatch = batchDetails.find(
        (detail) => detail.student_id.toString() === student._id.toString()
      );

      return {
        ...student.toObject(),
        batchDetail: studentBatch ? studentBatch.toObject() : null,
      };
    });

    // 5. Return the final merged array
    return res.status(200).json(totalData);
  } catch (error) {
    console.error("Error filtering students:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// router.post("/filterByClass", async (req, res) => {
//   try {
//     const { filterByClassName } = req.body;

//     const batchDetails = await BatchRelatedDetails.find({
//       classForAdmission: filterByClassName,
//     });

//     console.log("batchDetails", batchDetails);
//     const StudentsId = batchDetails.map((detail) => detail.student_id);

//     console.log("StudentsID", StudentsId);

//     const students = await Students.find({
//       _id: { $in: StudentsId },
//     });

//     console.log("students", students);

//     res.status(200).json({ data: students });
//   } catch (error) {
//     console.error("Error filtering students:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });







router.post("/filterByClass", async (req, res) => {
  try {
    const { filterByClassName } = req.body;

    // Get batch details matching the class
    const batchDetails = await BatchRelatedDetails.find({
      classForAdmission: filterByClassName,
    });

    console.log("batchDetails", batchDetails);

    // Extract student IDs
    const StudentsId = batchDetails.map((detail) => detail.student_id);

    console.log("StudentsID", StudentsId);

    // Fetch students based on IDs
    const students = await Students.find({
      _id: { $in: StudentsId },
    });

    console.log("students", students);

    // Create a map for quick access to batch details by student_id
    const batchMap = {};
    batchDetails.forEach((detail) => {
      batchMap[detail.student_id.toString()] = detail;
    });

    // Merge student info with corresponding batch info
    const mergedData = students.map((student) => {
      const batchInfo = batchMap[student._id.toString()];
      return {
        ...student.toObject(),
        batchDetails: batchInfo || {},
      };
    });

    res.status(200).json({ data: mergedData });
  } catch (error) {
    console.error("Error filtering students:", error);
    res.status(500).json({ message: "Server error" });
  }
});








router.post(
  "/uploadStudentResult",
  verifyTokenForRegistration("Hr"),
  checkRole(["Hr"]),
  uploadStudentResult
);

router.post("/");

module.exports = router;

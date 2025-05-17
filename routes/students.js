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
  continueRegistration,
} = require("../controllers/Students");

const {
  verifyTokenForRegistration,
  checkRole,
  takenPhoneByToken,
  adminCheck,
} = require("../middleware/authentication");
const OtpStore = require("../models/OtpStore");
const Students = require("../models/Student");

const BasicDetails = require("../models/form/BasicDetails");
const BatchRelatedDetails = require("../models/form/BatchRelatedDetails");
const EducationalDetails = require("../models/form/EducationalDetails");
const FamilyDetails = require("../models/form/FamilyDetails");

const allowedAdmins = ["9719706242", "9068833360"];

router.get(
  "/",
  verifyTokenForRegistration("hr"),
  checkRole(["hr"]),
  getStudents
);

// GET /students/:id - Get complete student details
router.get("/:id", async (req, res) => {
  try {
    const studentId = req.params.id;

    // First, find the main student record
    const student = await Students.findById(studentId).lean();
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Fetch all related data in parallel
    const [basicDetails, batchDetails, familyDetails, educationalDetails] =
      await Promise.all([
        BasicDetails.findOne({ student_id: studentId }).lean(),
        BatchRelatedDetails.findOne({ student_id: studentId }).lean(),
        FamilyDetails.findOne({ student_id: studentId }).lean(),
        EducationalDetails.findOne({ student_id: studentId }).lean(),
      ]);

    // Combine all data into a single response object
    const response = {
      ...student,
      basicDetails: basicDetails || {},
      batchDetails: batchDetails || {},
      familyDetails: familyDetails || {},
      educationalDetails: educationalDetails || {},
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching student details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

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
router.post("/continueRegistration", takenPhoneByToken(), continueRegistration);
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

router.post("/filter",  async (req, res) => {
  const { filterBy, sortOrder, ...params } = req.body;
  const sortDirection = sortOrder === "asc" ? 1 : -1;

  console.log("Check filter is working or not ", filterBy, params, sortOrder);

  try {
    let students;

    switch (filterBy) {
      case "class":
        // Find students by class with proper population
        const allStudentsByClass = await BatchRelatedDetails.find({
          classForAdmission: params.class,
        }).sort({ createdAt: sortDirection });

        students = await Promise.all(
          allStudentsByClass.map(async (studentByClass) => {
            const student = await Students.findOne({
              _id: studentByClass.student_id,
            }).sort({ createdAt: sortDirection });

            if (!student) return null;

            return {
              StudentsId: student.StudentsId,
              studentName: student.studentName,
              classForAdmission: studentByClass?.classForAdmission,
              program: studentByClass?.program,
              createdAt: student.createdAt,
              student_id: student._id,
              paymentId: student.paymentId,
            };
          })
        );
        break;

      case "id":
        // Find student by ID and join with batch details
        students = await Students.find({
          StudentsId: params.studentId,
        }).sort({ createdAt: sortDirection });

        students = await Promise.all(
          students.map(async (student) => {
            const batchDetails = await BatchRelatedDetails.findOne({
              student_id: student._id,
            });

            return {
              StudentsId: student.StudentsId,
              studentName: student.studentName,
              classForAdmission: batchDetails?.classForAdmission,
              program: batchDetails?.program,
              createdAt: student.createdAt,
              student_id: student._id,
              paymentId: student.paymentId,
            };
          })
        );
        break;

      case "name":
        // Find students by name and join with batch details
        students = await Students.find({
          studentName: { $regex: params.name, $options: "i" },
        }).sort({ createdAt: sortDirection });

        students = await Promise.all(
          students.map(async (student) => {
            const batchDetails = await BatchRelatedDetails.findOne({
              student_id: student._id,
            });

            return {
              StudentsId: student.StudentsId,
              studentName: student.studentName,
              classForAdmission: batchDetails?.classForAdmission,
              program: batchDetails?.program,
              createdAt: student.createdAt,
              student_id: student._id,
              paymentId: student.paymentId,
            };
          })
        );
        break;

      case "all":
      default:
        // Get all students with their batch details
        students = await Students.find({})
          .sort({ createdAt: sortDirection })
          .lean();

        students = await Promise.all(
          students.map(async (student) => {
            const batchDetails = await BatchRelatedDetails.findOne({
              student_id: student._id,
            });

            return {
              StudentsId: student.StudentsId,
              studentName: student.studentName,
              classForAdmission: batchDetails?.classForAdmission,
              program: batchDetails?.program,
              createdAt: student.createdAt,
              student_id: student._id,
              paymentId: student.paymentId,
            };
          })
        );
        break;
    }

    // Filter out any null entries and sort the final array
    students = students
      .filter((student) => student)
      .sort((a, b) => {
        return sortDirection * (new Date(b.createdAt) - new Date(a.createdAt));
      });

    res.json(students);
  } catch (error) {
    console.error("Error in filter route:", error);
    res.status(500).json({ error: error.message });
  }
});

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

router.post("/filter/filterById", async (req, res) => {
  try {
    const { studentId } = req.body;

    console.log("Data", studentId);

    // 1. Find students by name
    const allStudents = await Students.find({
      StudentsId: { $regex: studentId, $options: "i" },
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

    console.log("TotalData", totalData);

    // 5. Return the final merged array
    return res.status(200).json(totalData);
  } catch (error) {
    console.error("Error filtering students:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/filterByClass", async (req, res) => {
  try {
    const { filterByClassName } = req.body;

    console.log("FilterByClassName Api is runnig");

    // Get batch details matching the class

    let batchDetail;

    console.log("Check Data ", filterByClassName);

    if (filterByClassName) {
      batchDetail = await BatchRelatedDetails.find({
        classForAdmission: filterByClassName,
      });
    } else {
      batchDetail = await BatchRelatedDetails.find();

      console.log("BatchDetails from filterByClass", batchDetail);
    }

    console.log("batchDetail", batchDetail);

    // Extract student IDs
    const StudentsId = batchDetail.map((detail) => detail.student_id);

    console.log("StudentsID", StudentsId);

    // Fetch students based on IDs
    const students = await Students.find({
      _id: { $in: StudentsId },
    });

    console.log("students", students);

    // Create a map for quick access to batch details by student_id
    const batchMap = {};
    batchDetail.forEach((detail) => {
      batchMap[detail.student_id.toString()] = detail;
    });

    // Merge student info with corresponding batch info
    const mergedData = students.map((student) => {
      const batchInfo = batchMap[student._id.toString()];
      return {
        ...student.toObject(),
        batchDetail: batchInfo || {},
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

// router.post("/fetchAllData", async (req, res) => {
//   try {
//     const { date } = req.body;
//     const start = new Date(`${date}T00:00:00.000Z`);
//     const end = new Date(`${date}T00:00:00.000Z`);
//       end.setDate(end.getDate() + 1);

//     const alldata = await Students.find({
//       createdAt: { $gte: start, $lt: end },
//     });

//     console.log("allData ", alldata);

//     res.status(200).json({ data: alldata });
//   } catch (error) {
//     console.log("error", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

router.post("/fetchAllData", async (req, res) => {
  const allUserData = await Students.find();

  const userWiseData = {};

  let basicDetails = {};
  allData.map(async (user) => {
    let userBatchDetails = await BatchRelatedDetails.find({
      student_id: user._id,
    });

    user;
  });

  res.status(200).json(allData);
});

const ExcelJS = require("exceljs");

// router.get("/exportUserData", async (req, res) => {
//   try {
//     const allUsers = await Students.find();

//     const userWiseData = await Promise.all(
//       allUsers.map(async (user) => {
//         const batchDetails = await BatchRelatedDetails.find({
//           student_id: user._id,
//         });

//         return {
//           name: user.name,
//           email: user.email,
//           phone: user.phone,
//           // Add other fields as needed
//           batchInfo: batchDetails.map(batch => ({
//             batchName: batch.batchName,
//             course: batch.course,
//             // Add other batch fields as needed
//           }))
//         };
//       })
//     );

//     // Create workbook and worksheet
//     const workbook = new ExcelJS.Workbook();
//     const worksheet = workbook.addWorksheet("User Data");

//     // Define columns (flatten structure as needed)
//     worksheet.columns = [
//       { header: "Name", key: "name", width: 20 },
//       { header: "Email", key: "email", width: 25 },
//       { header: "Phone", key: "phone", width: 15 },
//       { header: "Batch Name(s)", key: "batchNames", width: 30 },
//       { header: "Course(s)", key: "courses", width: 30 },
//     ];

//     // Add rows
//     userWiseData.forEach(user => {
//       worksheet.addRow({
//         name: user.name,
//         email: user.email,
//         phone: user.phone,
//         batchNames: user.batchInfo.map(b => b.batchName).join(", "),
//         courses: user.batchInfo.map(b => b.course).join(", "),
//       });
//     });

//     // Send Excel file as response
//     res.setHeader(
//       "Content-Type",
//       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//     );
//     res.setHeader(
//       "Content-Disposition",
//       "attachment; filename=" + "UserData.xlsx"
//     );

//     await workbook.xlsx.write(res);
//     res.end();
//   } catch (error) {
//     console.error("Error generating Excel:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

router.get("/exportFullStudentData", async (req, res) => {
  try {
    const allStudents = await Students.find();

    const studentFullData = await Promise.all(
      allStudents.map(async (student) => {
        const [basic, batch, education, family] = await Promise.all([
          BasicDetails.findOne({ student_id: student._id }),
          BatchRelatedDetails.findOne({ student_id: student._id }),
          EducationalDetails.findOne({ student_id: student._id }),
          FamilyDetails.findOne({ student_id: student._id }),
        ]);

        return {
          studentName: student.studentName,
          email: student.email,
          contactNumber: student.contactNumber,
          StudentsId: student.StudentsId,
          // Basic Details
          dob: basic?.dob || "",
          gender: basic?.gender || "",
          examName: basic?.examName || "",
          examDate: basic?.examDate || "",
          // Batch Details
          classForAdmission: batch?.classForAdmission || "",
          program: batch?.program || "",
          // Educational Details
          schoolName: education?.SchoolName || "",
          percentage: education?.Percentage || "",
          class: education?.Class || "",
          yearOfPassing: education?.YearOfPassing || "",
          board: education?.Board || "",
          // Family Details
          fatherName: family?.FatherName || "",
          fatherContact: family?.FatherContactNumber || "",
          fatherOccupation: family?.FatherOccupation || "",
          motherName: family?.MotherName || "",
          motherContact: family?.MotherContactNumber || "",
          motherOccupation: family?.MotherOccupation || "",
          familyIncome: family?.FamilyIncome || "",
        };
      })
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Students Full Data");

    worksheet.columns = [
      { header: "Student Name", key: "studentName", width: 20 },
      { header: "Email", key: "email", width: 25 },
      { header: "Contact", key: "contactNumber", width: 15 },
      { header: "StudentsId", key: "StudentsId", width: 20 },
      // Basic
      { header: "DOB", key: "dob", width: 15 },
      { header: "Gender", key: "gender", width: 10 },
      { header: "Exam Name", key: "examName", width: 15 },
      { header: "Exam Date", key: "examDate", width: 15 },
      // Batch
      { header: "Class For Admission", key: "classForAdmission", width: 20 },
      { header: "Program", key: "program", width: 20 },
      // Education
      { header: "School", key: "schoolName", width: 25 },
      { header: "Percentage", key: "percentage", width: 15 },
      { header: "Class", key: "class", width: 10 },
      { header: "Passing Year", key: "yearOfPassing", width: 15 },
      { header: "Board", key: "board", width: 15 },
      // Family
      { header: "Father Name", key: "fatherName", width: 20 },
      { header: "Father Contact", key: "fatherContact", width: 20 },
      { header: "Father Occupation", key: "fatherOccupation", width: 20 },
      { header: "Mother Name", key: "motherName", width: 20 },
      { header: "Mother Contact", key: "motherContact", width: 20 },
      { header: "Mother Occupation", key: "motherOccupation", width: 20 },
      { header: "Family Income", key: "familyIncome", width: 15 },
    ];

    studentFullData.forEach((data) => {
      worksheet.addRow(data);
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=StudentFullData.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Error exporting data:", err);
    res.status(500).json({ error: "Failed to export student data" });
  }
});

router.get("/fetchFullStudentData", async (req, res) => {
  try {
    const allStudents = await Students.find();

    const fullData = await Promise.all(
      allStudents.map(async (student) => {
        const [basicDetails, batchDetails, educationalDetails, familyDetails] =
          await Promise.all([
            BasicDetails.findOne({ student_id: student._id }).select(
              "-__v -_id -student_id -created_at"
            ),
            BatchRelatedDetails.findOne({ student_id: student._id }).select(
              "-__v -_id -student_id"
            ),
            EducationalDetails.findOne({ student_id: student._id }).select(
              "-__v -_id -student_id"
            ),
            FamilyDetails.findOne({ student_id: student._id }).select(
              "-__v -_id -student_id"
            ),
          ]);

        return {
          student,
          basicDetails,
          batchDetails,
          educationalDetails,
          familyDetails,
        };
      })
    );

    res.status(200).json(fullData);
  } catch (err) {
    console.error("Error fetching student full data:", err);
    res.status(500).json({ error: "Failed to fetch student data" });
  }
});

const jsonData = [
  { name: "John", age: 30, city: "New York" },
  { name: "Alice", age: 25, city: "Los Angeles" },
];

router.get("/download-excel", async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data");

    // Add header row from keys of the first object
    const columns = Object.keys(jsonData[0]).map((key) => ({
      header: key,
      key,
    }));
    worksheet.columns = columns;

    // Add rows
    jsonData.forEach((row) => worksheet.addRow(row));

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=my_excel_file.xlsx"
    );

    // Write Excel to response stream
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Error generating Excel file:", err);
    res.status(500).send("Failed to generate Excel file");
  }
});


router.post("/fetchDataByDateRange", async (req, res) => {
  try {
    const { startingDate, lastDate } = req.body;

    console.log("startingDate, lastDate", startingDate, lastDate);

    if (!startingDate || !lastDate) {
      return res
        .status(400)
        .json({ error: "Both startingDate and lastDate are required." });
    }

    const fromDate = new Date(startingDate).toISOString();
    console.log("FromDate", fromDate);
    const toDate = new Date(lastDate);
    console.log("toDate", toDate);
    toDate.setHours(23, 59, 59, 999);
    const toDateISO = toDate.toISOString();
    console.log("toDateISO", toDateISO);

    const allStudents = await Students.find({
      createdAt: {
        $gte: fromDate,
        $lte: toDateISO,
      },
    });


    //   const fullData = await Promise.all(
    //   allStudents.map(async (student) => {
    //     const [basicDetails, batchDetails, educationalDetails, familyDetails] =
    //       await Promise.all([
    //         BasicDetails.findOne({ student_id: student._id }).select(
    //           "-__v -_id -student_id -created_at"
    //         ),
    //         BatchRelatedDetails.findOne({ student_id: student._id }).select(
    //           "-__v -_id -student_id"
    //         ),
    //         EducationalDetails.findOne({ student_id: student._id }).select(
    //           "-__v -_id -student_id"
    //         ),
    //         FamilyDetails.findOne({ student_id: student._id }).select(
    //           "-__v -_id -student_id"
    //         ),
    //       ]);

    //     return {
    //       student,
    //       basicDetails,
    //       batchDetails,
    //       educationalDetails,
    //       familyDetails,
    //     };
    //   })
    // );

    

    console.log("allData", allStudents);
    return res.status(200).json({ data: allStudents });
  } catch (error) {
    console.error("Error fetching data by date range:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

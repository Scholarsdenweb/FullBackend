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
} = require("../controllers/Students");

const {
  verifyToken,
  checkRole,
  adminCheck,
} = require("../middleware/authentication");
const Students = require("../models/Student");
const BasicDetails = require("../models/form/BasicDetails");
const BatchRelatedDetails = require("../models/form/BatchRelatedDetails");
const FamilyDetails = require("../models/form/FamilyDetails");
const EducationalDetails = require("../models/form/EducationalDetails");

const allowedAdmins = ["9719706242", "7037550621", "9068833360"];

// POST /students/filter
// router.post("/filter", async (req, res) => {
//   const { filterType, value } = req.body;

//   try {
//     let result;

//     switch (filterType) {
//       case "byId":
//         result = await Student.findById(value);
//         break;

//       case "byInput":
//         result = await Student.find({
//           $or: [
//             { name: { $regex: value, $options: "i" } },
//             { phone: { $regex: value, $options: "i" } },
//             // Add other searchable fields here
//           ],
//         });
//         break;

//       case "byClass":
//         result = await Student.find({ class: value });
//         break;

//       default:
//         return res.status(400).json({ message: "Invalid filter type" });
//     }

//     res.status(200).json(result);
//   } catch (error) {
//     console.error("Filter Error:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// });

// Example backend route
router.post("/filter", async (req, res) => {
  const { filterBy, sortOrder = 'asc', ...params } = req.body;
  const sortDirection = sortOrder === 'asc' ? 1 : -1;

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
            };
          })
        );
        break;
    }

    // Filter out any null entries and sort the final array
    students = students
      .filter((student) => student )
      .sort((a, b) => {
        return sortDirection * (new Date(b.createdAt) - new Date(a.createdAt));
      });

    res.json(students);
  } catch (error) {
    console.error("Error in filter route:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/getData", adminCheck(allowedAdmins), async (req, res) => {
  try {
    const { page = 1 } = req.body;

    console.log("req.data", req.body);
    const limit = 1; // Always fetch 1 user per page
    const skip = (page - 1) * limit;

    const data = await Students.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log("DAta", data);
    const totalStudents = await Students.countDocuments();
    const totalPages = Math.ceil(totalStudents / limit);

    console.log("totalStudent", totalStudents);

    const basicDetails = await BasicDetails.findOne({
      student_id: data[0]._id,
    });
    console.log("basicDetails", basicDetails);
    // if (!basicDetails) {
    //   return res
    //     .status(404)
    //     .json({ success: false, message: "Basic Details not found" });
    // }
    const batchDetails = await BatchRelatedDetails.findOne({
      student_id: data[0]._id,
    });

    console.log("basicDetails", basicDetails);

    // if (!batchDetails) {
    //   return res
    //     .status(404)
    //     .json({ success: false, message: "Batch Details not found" });
    // }

    const educationalDetails = await EducationalDetails.findOne({
      student_id: data[0]._id,
    });

    console.log("educationalDetails", educationalDetails);
    const familyDetails = await FamilyDetails.findOne({
      student_id: data[0]._id,
    });

    console.log("studentDetails", data);
    console.log("familyDetails", familyDetails);
    console.log("basicDetails", basicDetails);
    console.log("educationalDetails", educationalDetails);
    console.log("batchDetails", batchDetails);

    console.log("data from getEnquiryData", data);

    // Check if there is no data or if this is the last page
    if (data.length === 0) {
      return res.status(401).json({ message: "No data found" });
    }
    const nextPageData = await Students.find()
      .skip(skip + limit)
      .limit(limit);

    const isLastPage = nextPageData.length === 0; // If nextPageData is empty, it's the last page

    const fullData = [
      {
        ...data[0]._doc, // spread student main data
        basicDetails,
        batchDetails,
        educationalDetails,
        familyDetails,
      },
    ];

    res.status(200).json({
      data: fullData,
      currentPage: page,
      isLastPage: isLastPage, // Send information whether it's the last page or not
      totalPages,
    });
  } catch (e) {
    console.log("error in getEnquiryData", e);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("");

router.post("/getAllData", adminCheck(allowedAdmins), async (req, res) => {
  const data = await Students.find();

  console.log("DAta", data);

  const basicDetails = await BasicDetails.findOne({
    student_id: data[0]._id,
  });
  // if (!basicDetails) {
  //   return res
  //     .status(404)
  //     .json({ success: false, message: "Basic Details not found" });
  // }
  const batchDetails = await BatchRelatedDetails.findOne({
    student_id: data[0]._id,
  });
  // if (!batchDetails) {
  //   return res
  //     .status(404)
  //     .json({ success: false, message: "Batch Details not found" });
  // }

  const educationalDetails = await EducationalDetails.findOne({
    student_id: data[0]._id,
  });
  const familyDetails = await FamilyDetails.findOne({
    student_id: data[0]._id,
  });

  console.log("studentDetails", data);
  console.log("familyDetails", familyDetails);
  console.log("basicDetails", basicDetails);
  console.log("educationalDetails", educationalDetails);
  console.log("batchDetails", batchDetails);

  console.log("data from getEnquiryData", data);

  // Check if there is no data or if this is the last page
  if (data.length === 0) {
    return res.status(401).json({ message: "No data found" });
  }
  const nextPageData = await Students.find()
    .skip(skip + limit)
    .limit(limit);

  const isLastPage = nextPageData.length === 0; // If nextPageData is empty, it's the last page

  const fullData = [
    {
      ...data[0]._doc, // spread student main data
      basicDetails,
      batchDetails,
      educationalDetails,
      familyDetails,
    },
  ];

  res.status(200).json({
    data: fullData,
    currentPage: page,
    isLastPage: isLastPage, // Send information whether it's the last page or not
  });
});

module.exports = router;

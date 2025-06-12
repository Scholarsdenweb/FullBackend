const express = require("express");
const User = require("../models/UserModel");
// const Student = require('./models/Student')(secondaryConnection);

const router = express.Router();

const url = "https://obd-api.myoperator.co/obd-api-v1";
const apiKey = "oomfKA3I2K6TCJYistHyb7sDf0l0F6c8AZro5DJh"; // Replace with actual key

// myoperator call feature
router.post("/trigger-obd", async (req, res) => {
  const { phone } = req.body;
  try {
    const payload = {
      company_id: "5df87cba87461833",
      secret_token:
        "0ee2949396336195eeb7d93ae59c6c91f55336242df878f02464af03f0df6eb0",
      type: "1",
      user_id: "67a1cf3bba37c164",
      number: `+91${phone}`,
      public_ivr_id: "6800f7fdc5351261",
      reference_id: "",
      region: "<region of a call>",
      caller_id: "<caller id number of a call>",
      group: "<group of a dedicated number>",
    };

    const response = await fetch("https://obd-api.myoperator.co/obd-api-v1", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload), // ✅ FIXED HERE
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error from MyOperator API:", data);
      return res.status(400).json(data);
    }

    res.json(data);
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/getEnquiryData", async (req, res) => {
  try {
    const { email, page = 1 } = req.body;

    const limit = 1; // Always fetch 1 user per page
    const skip = (page - 1) * limit;

    let data;

    if (email === "jatin@scholarsden.in") {
      data = await User.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
    } else {
      data = await User.find({ enquiryTakenBy: email })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    }

    // Check if there is no data or if this is the last page
    if (data.length === 0) {
      return res.status(401).json({ message: "No data found" });
    }

    let nextPageData;
    let totalStudents;
    if (email === "jatin@scholarsden.in") {
      nextPageData = await User.find()
        .skip(skip + limit)
        .limit(limit);
      totalStudents = await User.countDocuments();
    } else {
      nextPageData = await User.find({ enquiryTakenBy: email })
        .skip(skip + limit)
        .limit(limit);

      totalStudents = await User.countDocuments({ enquiryTakenBy: email });
    }

    const isLastPage = nextPageData.length === 0; // If nextPageData is empty, it's the last page

    const totalPages = Math.ceil(totalStudents / limit);
    res.status(200).json({
      data,
      currentPage: page,
      isLastPage: isLastPage, // Send information whether it's the last page or not
      totalPages,
    });
  } catch (e) {
    console.log("error in getEnquiryData", e);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// router.post("/filter", async (req, res) => {
//   const { filterBy, sortOrder, ...params } = req.body;
//   const sortDirection = sortOrder === "asc" ? 1 : -1;

//   console.log("Check filter is working or not ", filterBy, params, sortOrder);

//   try {
//     let enquiryDetails;

//     switch (filterBy) {
//       case "class":
//         // Find students by class with proper population
//         const allStudentsByClass = await User.find({
//           courseOfIntrested: params.class,
//         }).sort({ createdAt: sortDirection });

//         enquiryDetails = await Promise.all(
//           allStudentsByClass.map(async (enquiryByClass) => {
//             if (!student) return null;

//             return {
//               enquiryNumber: enquiryByClass.enquiryNumber,
//               studentName: enquiryByClass.studentName,
//               fatherName: enquiryByClass.fatherName,
//               fatherContactNumber: enquiryByClass?.fatherContactNumber,
//               program: enquiryByClass?.program,
//               courseOfIntrested: enquiryByClass?.courseOfIntrested,
//               createdAt: enquiryByClass.createdAt,
//             };
//           })
//         );
//         break;

//       case "id":
//         // Find student by ID and join with batch details
//         enquiryDetails = await Students.find({
//           enquiryNumber: params.enquiryNumber,
//           admissionForClass : params.admissionForClass
//         }).sort({ createdAt: sortDirection });

//         enquiryDetails = await Promise.all(
//           enquiryDetails.map(async (enquiryById) => {
//             return {
//               enquiryNumber: enquiryById?.enquiryNumber,
//               studentName: enquiryById?.studentName,
//               fatherName: enquiryById?.fatherName,
//               fatherContactNumber: enquiryById?.fatherContactNumber,
//               program: enquiryById?.program,
//               courseOfIntrested: enquiryById?.courseOfIntrested,
//               createdAt: enquiryById?.createdAt,
//             };
//           })
//         );
//         break;

//       case "name":
//         // Find students by name and join with batch details
//         enquiryDetails = await User.find({
//           studentName: { $regex: params.name, $options: "i" },
//         }).sort({ createdAt: sortDirection });

//         enquiryDetails = await Promise.all(
//           enquiryDetails.map(async (enquiryByName) => {
//             return {
//               enquiryNumber: enquiryByName.enquiryNumber,
//               studentName: enquiryByName.studentName,
//               fatherName: enquiryByName.fatherName,
//               fatherContactNumber: enquiryByName?.fatherContactNumber,
//               program: enquiryByName?.program,
//               courseOfIntrested: enquiryByName?.courseOfIntrested,
//               createdAt: enquiryByName.createdAt,
//             };
//           })
//         );
//         break;

//       case "all":
//       default:
//         // Get all students with their batch details
//         enquiryDetails = await User.find({})
//           .sort({ createdAt: sortDirection })
//           .lean();

//         enquiryDetails = await Promise.all(
//           enquiryDetails.map(async (allEnquiry) => {
//             return {
//               enquiryNumber: allEnquiry.enquiryNumber,
//               studentName: allEnquiry.studentName,
//               fatherName: allEnquiry.fatherName,
//               fatherContactNumber: allEnquiry?.fatherContactNumber,
//               program: allEnquiry?.program,
//               courseOfIntrested: allEnquiry?.courseOfIntrested,
//               createdAt: allEnquiry.createdAt,
//             };
//           })
//         );
//         break;
//     }

//     // Filter out any null entries and sort the final array
//     enquiryDetails = enquiryDetails
//       .filter((enquiryDetail) => enquiryDetail)
//       .sort((a, b) => {
//         return sortDirection * (new Date(b.createdAt) - new Date(a.createdAt));
//       });

//     res.json(enquiryDetails);
//   } catch (error) {
//     console.error("Error in filter route:", error);
//     res.status(500).json({ error: error.message });
//   }
// });

router.post("/filter", async (req, res) => {
  const { sortOrder = "desc", ...params } = req.body;
  const sortDirection = sortOrder === "asc" ? 1 : -1;

  try {
    let query = {};

    // 🔍 Handle class filter
    if (params.class) {
      query.courseOfIntrested = params.class;
    }

    // 🔍 Handle name filter (case-insensitive partial match)
    if (params.name) {
      query.studentName = { $regex: params.name, $options: "i" };
    }

    // 🔍 Handle ID/enquiryNumber filter
    if (params.enquiryNumber) {
      query.enquiryNumber = { $regex: params.enquiryNumber, $options: "i" };
    }

    // 🔍 Handle date range filter
    if (params.startingDate && params.lastDate) {
      const fromDate = new Date(params.startingDate).toISOString();
      const toDate = new Date(params.lastDate);

      toDate.setHours(23, 59, 59, 999);
      const toDateISO = toDate.toISOString();

      query.createdAt = {
        $gte: fromDate,
        $lte: toDateISO,
      };
    }

    // 👇 Decide which collection to use (you can improve this logic further)
    // const useStudentsCollection = !!params.enquiryNumber;
    // const Model = useStudentsCollection ? Students : User;

    const results = await User.find(query).sort({ createdAt: sortDirection });
    const formatted = results.map(formatStudent);

    res.json(formatted);
  } catch (error) {
    console.error("Error in filter route:", error);
    res.status(500).json({ error: error.message });
  }
});

// Format student
function formatStudent(student) {
  console.log("student data from formatStudent", student);

  return {
    enquiryNumber: student.enquiryNumber,
    studentName: student.studentName,
    fatherName: student.fatherName,
    fatherContactNumber: student.fatherContactNumber,
    program: student.program,
    courseOfIntrested: student.courseOfIntrested,
    createdAt: student.createdAt,
    updatedAt: student.updatedAt,
    enquiryTakenBy: student.enquiryTakenBy,
    fatherOccupations: student.fatherOccupations,
    remarks: student.remarks,
    city: student.city,
    state: student.state,
    schoolName: student.schoolName,
    studentContactNumber: student.studentContactNumber,
    howToKnow: student.howToKnow,
  };
}

module.exports = router;

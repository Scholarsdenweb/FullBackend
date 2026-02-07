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

    // if (email === "jatin@scholarsden.in") {
      data = await User.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
    // } else {
      // data = await User.find({ enquiryTakenBy: email })
      //   .sort({ createdAt: -1 })
      //   .skip(skip)
      //   .limit(limit);
    // }

    // Check if there is no data or if this is the last page
    if (data.length === 0) {
      return res.status(401).json({ message: "No data found" });
    }

    let nextPageData;
    let totalStudents;
    // if (email === "jatin@scholarsden.in") {
      nextPageData = await User.find()
        .sort({ createdAt: -1 })
        .skip(skip + limit)
        .limit(limit);
      totalStudents = await User.countDocuments();
    // } else {
    //   nextPageData = await User.find({ enquiryTakenBy: email })
    //     .sort({ createdAt: -1 })
    //     .skip(skip + limit)
    //     .limit(limit);

    //   totalStudents = await User.countDocuments({ enquiryTakenBy: email });
    // }

    const isLastPage = nextPageData.length === 0; // If nextPageData is empty, it's the last page

    const totalPages = Math.ceil(totalStudents / limit);

    console.log("data from getEnquiryData", data);

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






router.post("/filter", async (req, res) => {
  const { sortOrder = "desc", ...params } = req.body;
  const sortDirection = sortOrder === "asc" ? 1 : -1;
  console.log("filter adminDashboard", params);
  
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
    
    // 🔍 Handle date range filter - Works with Z format (2026-01-21T12:47:37.526Z)
    if (params.startingDate && params.lastDate) {
      const fromDate = new Date(params.startingDate);
      fromDate.setUTCHours(0, 0, 0, 0); // Start of day in UTC
      
      const toDate = new Date(params.lastDate);
      toDate.setUTCHours(23, 59, 59, 999); // End of day in UTC
      
      query.updatedAt = {
        $gte: fromDate,
        $lte: toDate,
      };
      
      console.log("Date filter applied:", {
        from: fromDate.toISOString(),
        to: toDate.toISOString()
      });
    }
    
    console.log("query from the filter", JSON.stringify(query, null, 2));
    
    const results = await User.find(query).sort({ createdAt: sortDirection });
    const formatted = results.map(formatStudent);
    
    console.log(`Found ${results.length} results`);
    
    res.json(formatted);
  } catch (error) {
    console.error("Error in filter route:", error);
    res.status(500).json({ error: error.message });
  }
});





// router.post("/migrate-dates-to-date-type", async (req, res) => {
//   try {
//     const users = await User.find({fatherContactNumber : "9389689936"});
//     let migrated = 0;
//     let alreadyDate = 0;
//     let errors = 0;
    
//     for (const user of users) {
//       let needsSave = false;
      
//       // Fix createdAt
//       if (user.createdAt && typeof user.createdAt === 'string') {
//         user.createdAt = new Date(user.createdAt);
//         needsSave = true;
//         migrated++;
//       } else if (user.createdAt instanceof Date) {
//         alreadyDate++;
//       }
      
//       // Fix updatedAt
//       if (user.updatedAt && typeof user.updatedAt === 'string') {
//         user.updatedAt = new Date(user.updatedAt);
//         needsSave = true;
//         migrated++;
//       } else if (user.updatedAt instanceof Date) {
//         alreadyDate++;
//       }
      
//       if (needsSave) {
//         try {
//           await user.save();
//         } catch (err) {
//           console.error(`Error saving user ${user._id}:`, err);
//           errors++;
//         }
//       }
//     }
    
//     res.json({
//       success: true,
//       message: "Migration completed",
//       stats: {
//         totalDocuments: users.length,
//         migrated: migrated,
//         alreadyDate: alreadyDate,
//         errors: errors
//       }
//     });
//   } catch (error) {
//     console.error("Migration error:", error);
//     res.status(500).json({ error: error.message });
//   }
// });




// router.post("/migrate-dates-to-date-type", async (req, res) => {
//   try {
//     const users = await User.find({ fatherContactNumber: "9389689936" });
//     let migrated = 0;
//     let alreadyDate = 0;
//     let errors = 0;
    
//     for (const user of users) {
//       const updateFields = {};
      
//       // Check createdAt
//       if (user.createdAt && typeof user.createdAt === 'string') {
//         updateFields.createdAt = new Date(user.createdAt);
//         console.log(`Converting createdAt: ${user.createdAt} -> ${updateFields.createdAt}`);
//         migrated++;
//       }
      
//       // Check updatedAt
//       if (user.updatedAt && typeof user.updatedAt === 'string') {
//         updateFields.updatedAt = new Date(user.updatedAt);
//         console.log(`Converting updatedAt: ${user.updatedAt} -> ${updateFields.updatedAt}`);
//         migrated++;
//       }
      
//       // Use native MongoDB driver to bypass Mongoose restrictions
//       if (Object.keys(updateFields).length > 0) {
//         try {
//           const result = await User.collection.updateOne(
//             { _id: user._id },
//             { $set: updateFields }
//           );
//           console.log(`✅ Updated user ${user._id}:`, result.modifiedCount);
//         } catch (err) {
//           console.error(`❌ Error updating user ${user._id}:`, err);
//           errors++;
//         }
//       } else {
//         alreadyDate++;
//       }
//     }
    
//     // Verify the changes
//     const verifyUser = await User.findOne({ fatherContactNumber: "9389689936" }).lean();
    
//     res.json({
//       success: true,
//       message: "Migration completed",
//       stats: {
//         totalDocuments: users.length,
//         migrated: migrated,
//         alreadyDate: alreadyDate,
//         errors: errors
//       },
//       verification: {
//         createdAt: verifyUser.createdAt,
//         createdAtType: typeof verifyUser.createdAt,
//         updatedAt: verifyUser.updatedAt,
//         updatedAtType: typeof verifyUser.updatedAt
//       }
//     });
//   } catch (error) {
//     console.error("Migration error:", error);
//     res.status(500).json({ error: error.message });
//   }
// });







router.post("/export", async (req, res) => {
  const { sortOrder = "desc", format = "csv", ...params } = req.body;
  const sortDirection = sortOrder === "asc" ? 1 : -1;

  try {
    let query = {};

    // 🔍 Handle class filter
    if (params.class) {
      query.courseOfIntrested = params.class;
    }

    // 🔍 Handle name filter
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

    const results = await User.find(query).sort({ createdAt: sortDirection });
    const formatted = results.map(formatStudent);

    if (format === "csv") {
      // Convert to CSV
      const fields = Object.keys(formatted[0] || {});
      const csv = [
        fields.join(","), // Header
        ...formatted.map((row) =>
          fields.map((field) => `"${row[field] || ""}"`).join(","),
        ),
      ].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=students-${Date.now()}.csv`,
      );
      res.send(csv);
    } else {
      // Return JSON for download
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=students-${Date.now()}.json`,
      );
      res.json(formatted);
    }
  } catch (error) {
    console.error("Error in export route:", error);
    res.status(500).json({ error: error.message });
  }
});

// Format student
function formatStudent(student) {

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

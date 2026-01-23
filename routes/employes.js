const Employee = require("../models/Employee");
const {
  verifyTokenForRegistration,
  checkRole,
} = require("../middleware/authentication");
const multer = require("multer");
const storage = multer.memoryStorage(); // Storing file in memory, you can use diskStorage if needed
const express = require("express");
const processCSVAndGenerateReportCards = require("../utils/ResultGenerator");
const router = express.Router();
const path = require("path");

const fs = require("fs");
const axios = require("axios");
const archiver = require("archiver");
const Students = require("../models/Student");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

// Initialize express app

const cloudinary = require("cloudinary").v2;
require("dotenv").config();

router.get(
  "/",
  verifyTokenForRegistration("hr"),
  checkRole(["hr"]),
  async (req, res) => {
    const employees = await Employee.find().select("-password");
    res.send(employees);
  },
);
router.post(
  "/addEmployee",
  // verifyTokenForRegistration,
  // checkRole(["hr"]),
  async (req, res) => {
    const { name, email, role, password } = req.body;
    console.log("req.body", req.body);
    const employee = await Employee.findOne({ email: email });

    if (employee) {
      return res.status(400).send("Employee already exists");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newEmployee = new Employee({
      name,
      email,
      role,
      password: hashedPassword,
    });

    await newEmployee.save();

    const token = jwt.sign(
      { _id: newEmployee._id, role: newEmployee.role },
      JWT_SECRET,
    );

    console.log("New Employee:", newEmployee);
    console.log("New Employee:", token);

    return res.status(200).send({
      token,
      employee: {
        name: newEmployee.name,
        email: newEmployee.email,
        role: newEmployee.role,
        task: newEmployee.task,
        profile: newEmployee.profile,
      },
    });
  },
);

router.patch("/update/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, role, password } = req.body;
  console.log("ID", id);
  const employee = await Employee.findById(id);

  if (!employee) {
    return res.status(400).send("Employee not found");
  }

  employee.name = name ? name : employee.name;
  employee.email = email ? email : employee.email;
  employee.role = role ? role : employee.role;
  employee.password = password ? password : employee.password;

  const updatedEmployee = await employee.save();

  res.send(updatedEmployee);
});

router.delete("/delete/:id", async (req, res) => {
  const { id } = req.params;
  const employee = await Employee.findByIdAndDelete(id);

  if (!employee) {
    return res.status(400).send("Employee not found");
  }

  res.send({ name: employee.name, email: employee.email });
});

// Configure Cloudinary

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname)); // Renaming file
    },
  }),
  fileFilter: (req, file, cb) => {
    const filetypes = /csv/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase(),
    );

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only CSV files are allowed!"));
  },
});

// Helper function to validate file
const isFileValid = (file) => {
  return file && file.mimetype === "text/csv";
};

// Helper function to upload file to Cloudinary

// Helper function to generate PDFs

// Route: Generate result cards

// app.post("/api/employees/generateResult", upload.single("csvFile"), (req, res) => {
//   console.log("Uploaded File:", req.file);
//   if (!req.file) {
//     return res.status(400).json({ message: "No file uploaded!" });
//   }
//   res.json({ message: "File uploaded successfully!", file: req.file.filename });
// });

router.post("/generateResult", upload.single("csvFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log("Uploaded File:", req.file);

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // ✅ Pass the correct file path to the processing function
    const filePath = req.file.path;

    await processCSVAndGenerateReportCards(filePath, res);

    // res.end();
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const inquirer = require("inquirer");
const BasicDetails = require("../models/form/BasicDetails");
const ExamDate = require("../models/ExamDate");
const Result = require("../models/Result");

const PUBLIC_DIR = path.join(__dirname, "public");
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR);
}

// router.post("/generate-zip", async (req, res) => {
//   try {
//     // const { date  } = req.body;

//     const { date: examDate } = req.body;

//     console.log("examDate", examDate);
//     const formattedDate = examDate.replace(/[\/.-]/g, ".");
//     console.log(formattedDate); // Output: 14/12/2025

//     console.log("formattedDate", formattedDate);
    

//     // const examDate = "04.01.2026";
//     if (!formattedDate)
//       return res.status(400).json({ message: "Exam date is required." });

    

//     // Fetch student IDs in bulk
//     // const studentIds = await BasicDetails.find({ examDate }).distinct("student_id");
//     // if (studentIds.length === 0) {
//     //   return res.status(404).json({ message: "No students found for the given exam date." });
//     // }

//     // Fetch students who have results using bulk query
//     const allResults = await Result.find({
//       examDate : formattedDate,
//       resultUrl: { $exists: true, $ne: null, $ne: "" },
//     }).select("resultUrl");

//     // const allResults = await Result.find({ examDate }).select("resultUrl");
//     console.log("allResults", allResults);
//     console.log("allResults", allResults.length);

//     if (allResults.length === 0) {
//       return res
//         .status(401)
//         .json({ message: "No results found for the given exam date." });
//     }

//     const downloadFolder = path.join(__dirname, "downloads");
//     if (!fs.existsSync(downloadFolder)) {
//       fs.mkdirSync(downloadFolder);
//     }

//     // Parallel downloads
//     await Promise.all(
//       allResults.map(async (result) => {
//         try {
//           const fileUrl = result.resultUrl;
//           const fileName = path.basename(fileUrl);
//           const filePath = path.join(downloadFolder, fileName);

//           const response = await axios({
//             method: "GET",
//             url: fileUrl,
//             responseType: "stream",
//           });

//           const writer = fs.createWriteStream(filePath);
//           response.data.pipe(writer);

//           return new Promise((resolve, reject) => {
//             writer.on("finish", resolve);
//             writer.on("error", reject);
//           });
//         } catch (error) {
//           console.error(
//             `Failed to download file for result: ${result.resultUrl}`,
//             error,
//           );
//         }
//       }),
//     );

//     // Create ZIP archive
//     const zipFilePath = path.join(__dirname, "public", "student_results.zip");
//     const output = fs.createWriteStream(zipFilePath);
//     const archive = archiver("zip", { zlib: { level: 9 } });

//     archive.on("error", (err) => console.error("Archive error:", err));
//     output.on("close", () => console.log(`ZIP file created: ${zipFilePath}`));

//     archive.pipe(output);
//     archive.directory(downloadFolder, false);
//     await archive.finalize();

//     if (!fs.existsSync(zipFilePath)) {
//       return res
//         .status(404)
//         .json({ message: "ZIP file not found. Generate it first." });
//     }

//     res.setHeader("Content-Type", "application/zip");
//     const fileStream = fs.createReadStream(zipFilePath);
//     fileStream.pipe(res);
//   } catch (error) {
//     console.error("Error:", error);
//     res.status(500).json({ message: "Error generating ZIP file." });
//   }
// });

router.post("/generate-zip", async (req, res) => {
  try {
    const { date: examDate } = req.body;
    console.log("examDate", examDate);
    const formattedDate = examDate.replace(/[\/.-]/g, ".");
    console.log("formattedDate", formattedDate);
    
    if (!formattedDate)
      return res.status(400).json({ message: "Exam date is required." });
    
    // Fetch students who have results using bulk query
    const allResults = await Result.find({
      examDate: formattedDate,
      resultUrl: { $exists: true, $ne: null, $ne: "" },
    }).select("resultUrl");
    
    console.log("allResults", allResults);
    console.log("allResults", allResults.length);
    
    if (allResults.length === 0) {
      return res
        .status(401)
        .json({ message: "No results found for the given exam date." });
    }
    
    const downloadFolder = path.join(__dirname, "downloads");
    if (!fs.existsSync(downloadFolder)) {
      fs.mkdirSync(downloadFolder);
    }
    
    // Parallel downloads
    await Promise.all(
      allResults.map(async (result) => {
        try {
          const fileUrl = result.resultUrl;
          const fileName = path.basename(fileUrl);
          const filePath = path.join(downloadFolder, fileName);
          const response = await axios({
            method: "GET",
            url: fileUrl,
            responseType: "stream",
          });
          
          const writer = fs.createWriteStream(filePath);
          response.data.pipe(writer);
          
          return new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
          });
        } catch (error) {
          console.error(
            `Failed to download file for result: ${result.resultUrl}`,
            error
          );
        }
      })
    );
    
    // Create ZIP archive
    const zipFilePath = path.join(__dirname, "public", "student_results.zip");
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    
    archive.on("error", (err) => console.error("Archive error:", err));
    output.on("close", () => console.log(`ZIP file created: ${zipFilePath}`));
    
    archive.pipe(output);
    archive.directory(downloadFolder, false);
    await archive.finalize();
    
    if (!fs.existsSync(zipFilePath)) {
      return res
        .status(404)
        .json({ message: "ZIP file not found. Generate it first." });
    }
    
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=student_results.zip");
    
    const fileStream = fs.createReadStream(zipFilePath);
    
    // Clean up after sending the file
    fileStream.on("end", () => {
      // Delete all files in downloads folder
      const files = fs.readdirSync(downloadFolder);
      files.forEach(file => {
        fs.unlinkSync(path.join(downloadFolder, file));
      });
      console.log("Downloads folder cleaned up");
      
      // Delete the ZIP file
      fs.unlinkSync(zipFilePath);
      console.log("ZIP file deleted");
    });
    
    fileStream.on("error", (err) => {
      console.error("Error streaming file:", err);
    });
    
    fileStream.pipe(res);
    
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Error generating ZIP file." });
  }
});


router.get("/download-zip", (req, res) => {
  const zipFilePath = path.join(PUBLIC_DIR, "student_results.zip");

  console.log("zipFilePath", zipFilePath);

  if (!fs.existsSync(zipFilePath)) {
    return res
      .status(404)
      .json({ message: "ZIP file not found. Generate it first." });
  }

  res.setHeader("Content-Type", "application/zip"); // Ensures it's treated as a file
  // res.setHeader('Content-Disposition', 'attachment; filename=student_results.zip');

  const fileStream = fs.createReadStream(zipFilePath);
  fileStream.pipe(res);
});

router.post("/addExamDate", async (req, res) => {
  const { examDate, examName } = req.body;

  console.log("examDate", examDate);

  try {
    const existingExamDate = await ExamDate.findOne({ examDate });
    if (existingExamDate) {
      return res.status(401).json({ message: "exam date already exists" });
    }

    // const newStudent = new Student({
    //   name,
    //   email,
    //   role,
    //   contactNumber,
    //   password: hashedPassword,
    // });
    // await newStudent.save();

    const newExamDate = new ExamDate({ examDate, examName });
    console.log("newExamDate", newExamDate);
    await newExamDate.save();
    res.status(200).json({ message: "exam date added successfully" });
  } catch (error) {
    console.log("error", error);
    console.log("error message", error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get("/getAllDates", async (req, res) => {
  try {
    const allExamDates = await ExamDate.find().sort({ examDate: 1 });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filteredDates = allExamDates
      .filter((item) => {
        const [day, month, year] = item.examDate.split("-");
        const examDateObj = new Date(`${year}-${month}-${day}`);
        examDateObj.setHours(0, 0, 0, 0);
        return examDateObj >= today;
      })
      .map((item) => ({
        ...item._doc,
        examDate: item.examDate.replace(/-/g, "."),
      }));

    res.status(200).json(filteredDates);
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/allDates", async (req, res) => {
  try {
    const allExamDates = await ExamDate.find().sort({ examDate: 1 });

    res.status(200).json(allExamDates);
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/editDate", async (req, res) => {
  const { _id, changedDate, newExamName } = req.body;

  if (!_id || !changedDate) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  try {
    const updatedExam = await ExamDate.findByIdAndUpdate(
      _id,
      { examDate: changedDate, examName: newExamName }, // Update the examDate field
      { new: true }, // Return the updated document
    );

    if (!updatedExam) {
      return res.status(404).json({ error: "Exam date not found." });
    }

    res
      .status(200)
      .json({ message: "Exam date updated successfully!", updatedExam });
  } catch (error) {
    console.error("Error updating exam date:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

router.delete("/deleteDate/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const deletedDate = await ExamDate.findByIdAndDelete(id);
    if (!deletedDate) {
      return res.status(404).json({ message: "Date not found" });
    }
    res.status(200).json({ message: "Date deleted successfully" });
  } catch (error) {
    console.error("Error deleting date:", error);
    res.status(500).json({ message: "Error deleting date" });
  }
});

module.exports = router;

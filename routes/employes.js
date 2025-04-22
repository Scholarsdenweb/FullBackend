const Employee = require("../models/Employee");
const { verifyTokenForRegistration, checkRole } = require("../middleware/authentication");
const multer = require('multer');
const storage = multer.memoryStorage(); // Storing file in memory, you can use diskStorage if needed
const express = require("express");
const processCSVAndGenerateReportCards = require("../utils/ResultGenerator");
const router = express.Router();
const path = require('path');


const fs = require('fs');
const axios = require('axios');
const archiver = require('archiver');
const Students = require("../models/Student");

// Initialize express app


const cloudinary = require('cloudinary').v2;
require('dotenv').config();

router.get("/", verifyTokenForRegistration("hr"), checkRole(["hr"]), async (req, res) => {
  const employees = await Employee.find().select("-password");
  res.send(employees);
});
router.post("/addEmployee", verifyTokenForRegistration, checkRole(["hr"]), async (req, res) => {
  const { name, email, role, password } = req.body;
  const employee = await Employee.findOne({ email: email });

  if (employee) {
    return res.status(400).send("Employee already exists");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newEmployee = await new Employee({
    name,
    email,
    role,
    password: hashedPassword
  });

  const token = jwt.sign({ _id: newEmployee._id, role: newEmployee.role }, JWT_SECRET);

  res.status(200).send({
    token, employee: {
      name: newEmployee.name,
      email: newEmployee.email,
      role: newEmployee.role,
      task: newEmployee.task,
      profile: newEmployee.profile
    }
  });


})


router.patch("/update/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, role, password } = req.body;
  console.log("ID", id)
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
})

router.delete("/delete/:id", async (req, res) => {
  const { id } = req.params;
  const employee = await Employee.findByIdAndDelete(id);

  if (!employee) {
    return res.status(400).send("Employee not found");
  }

  res.send({ name: employee.name, email: employee.email });
})

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
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only CSV files are allowed!"));
  },
});


// Helper function to validate file
const isFileValid = (file) => {
  return file && file.mimetype === 'text/csv';
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

// router.post('/generateResult', upload.single('csvFile'), async (req, res) => {
//     console.log("Uploaded File:", req.file);

//   try {
//     if (!req.file) {
//       return res.status(400).json({ error: 'No file uploaded' });
//     }

//     const filePath = req.file; // Correct way to get the file path

//     console.log('Uploaded File:', req.file);

//     await processCSVAndGenerateReportCards(filePath);

//     res.status(200).json({ message: 'Result cards generated successfully' });

//   } catch (error) {
//     console.error('Error:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });


// router.post('/generateResult', upload.single('file'), async (req, res) => {
//   try {
//     const file = req.body.path;

//     console.log('File: qqq', file);
//     console.log('File qqq :', req.body);

//     // if (!isFileValid(file)) {
//     //   return res.status(400).json({ error: 'Invalid file format. Only CSV files are allowed.' });
//     // }

//     await processCSVAndGenerateReportCards(file);

//   } catch (error) {
//     console.error('Error:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });







// async function downloadFiles() {
//     try {

//       const students = await Students.find({ result: { $exists: true, $ne: null } }); 

//         // const students = await Students.find(); // Fetch all result URLs
//         if (students.length === 0) {
//             console.log("No results found.");
//             return;
//         }

//         const downloadFolder = path.join(__dirname, 'downloads');
//         if (!fs.existsSync(downloadFolder)) {
//             fs.mkdirSync(downloadFolder);
//         }

//         // Download all PDFs
//         for (const student of students) {

//           console.log("student", student);
//             const fileUrl = student.result;
//             const fileName = path.basename(fileUrl);
//             const filePath = path.join(downloadFolder, fileName);

//             const response = await axios({
//                 method: 'GET',
//                 url: fileUrl,
//                 responseType: 'stream',
//             });

//             const writer = fs.createWriteStream(filePath);
//             response.data.pipe(writer);

//             await new Promise((resolve, reject) => {
//                 writer.on('finish', resolve);
//                 writer.on('error', reject);
//             });

//             console.log(`Downloaded: ${fileName}`);
//         }

//         // Create ZIP archive
//         const zipFilePath = path.join(__dirname, 'student_results.zip');
//         const output = fs.createWriteStream(zipFilePath);
//         const archive = archiver('zip', { zlib: { level: 9 } });

//         output.on('close', () => console.log(`ZIP file created: ${zipFilePath}`));
//         archive.on('error', (err) => console.error('Archive error:', err));

//         archive.pipe(output);
//         archive.directory(downloadFolder, false);
//         await archive.finalize();

//     } catch (error) {
//         console.error('Error:', error);
//     } 
// }

// downloadFiles();


const inquirer = require('inquirer');
const BasicDetails = require("../models/form/BasicDetails");
const ExamDate = require("../models/ExamDate");
const Result = require("../models/Result");




// async function getSaveLocation() {
//     const { savePath } = await inquirer.prompt([
//         {
//             type: 'input',
//             name: 'savePath',
//             message: 'Enter the directory where you want to save the ZIP file:',
//             default: path.join(__dirname, 'student_results.zip'), // Default location
//             validate: (input) => fs.existsSync(path.dirname(input)) ? true : 'Invalid directory path!',
//         }
//     ]);
//     return savePath;
// }



// async function downloadFiles() {
//     try {
//         const students = await Students.find({ result: { $exists: true, $ne: null, $ne: "" } });
//         if (students.length === 0) {
//             console.log("No results found.");
//             return;
//         }

//         const downloadFolder = path.join(__dirname, 'downloads');
//         if (!fs.existsSync(downloadFolder)) {
//             fs.mkdirSync(downloadFolder);
//         }

//         for (const student of students) {
//             const fileUrl = student.result;
//             const fileName = path.basename(fileUrl);
//             const filePath = path.join(downloadFolder, fileName);

//             const response = await axios({
//                 method: 'GET',
//                 url: fileUrl,
//                 responseType: 'stream',
//             });

//             const writer = fs.createWriteStream(filePath);
//             response.data.pipe(writer);

//             await new Promise((resolve, reject) => {
//                 writer.on('finish', resolve);
//                 writer.on('error', reject);
//             });

//             console.log(`Downloaded: ${fileName}`);
//         }

//         const zipFilePath = await getSaveLocation();
//         const output = fs.createWriteStream(zipFilePath);
//         const archive = archiver('zip', { zlib: { level: 9 } });

//         output.on('close', () => console.log(`ZIP file created: ${zipFilePath}`));
//         archive.on('error', (err) => console.error('Archive error:', err));

//         archive.pipe(output);
//         archive.directory(downloadFolder, false);
//         await archive.finalize();

//     } catch (error) {
//         console.error('Error:', error);
//     } 
// }

// downloadFiles();










// Create a folder to store downloadable files
const PUBLIC_DIR = path.join(__dirname, 'public');
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR);
}

// API to generate and serve the ZIP file




// router.post('/generate-zip', async (req, res) => {
//   try {
//     const { examDate } = req.body; // Pass examDate in request body
//     if (!examDate) {
//       return res.status(400).json({ message: "Exam date is required." });
//     }

//     // Fetch student IDs who gave the exam on the given date
//     const studentsWithExamDate = await BasicDetails.find({ examDate }).select("student_id");

//     if (!studentsWithExamDate.length) {
//       return res.status(404).json({ message: "No students found for the given exam date." });
//     }

//     // Extract student IDs
//     const studentIds = studentsWithExamDate.map(student => student.student_id);

//     // Fetch students who have results and match the student IDs
//     const students = await Students.find({ 
//       _id: { $in: studentIds }, 
//       result: { $exists: true, $ne: null, $ne: "" } 
//     });

//     if (!students.length) {
//       return res.status(404).json({ message: "No results found for the given exam date." });
//     }

//     const downloadFolder = path.join(__dirname, 'downloads');
//     if (!fs.existsSync(downloadFolder)) {
//       fs.mkdirSync(downloadFolder);
//     }

//     // Download all PDFs
//     for (const student of students) {
//       const fileUrl = student.result;
//       const fileName = path.basename(fileUrl);
//       const filePath = path.join(downloadFolder, fileName);

//       const response = await axios({
//         method: 'GET',
//         url: fileUrl,
//         responseType: 'stream',
//       });

//       const writer = fs.createWriteStream(filePath);
//       response.data.pipe(writer);

//       await new Promise((resolve, reject) => {
//         writer.on('finish', resolve);
//         writer.on('error', reject);
//       });

//       console.log(`Downloaded: ${fileName}`);
//     }

//     // Create ZIP archive
//     const zipFilePath = path.join(__dirname, 'public', 'student_results.zip');
//     const output = fs.createWriteStream(zipFilePath);
//     const archive = archiver('zip', { zlib: { level: 9 } });

//     output.on('close', () => console.log(`ZIP file created: ${zipFilePath}`));
//     archive.on('error', (err) => console.error('Archive error:', err));

//     archive.pipe(output);
//     archive.directory(downloadFolder, false);
//     await archive.finalize();

//     if (!fs.existsSync(zipFilePath)) {
//       return res.status(404).json({ message: "ZIP file not found. Generate it first." });
//     }

//     res.setHeader('Content-Type', 'application/zip');
//     const fileStream = fs.createReadStream(zipFilePath);
//     fileStream.pipe(res);

//   } catch (error) {
//     console.error('Error:', error);
//     res.status(500).json({ message: "Error generating ZIP file." });
//   }
// });






// Adjust import paths

router.post('/generate-zip', async (req, res) => {
  try {
    const { date : examDate } = req.body;


    console.log("examDate", examDate);
    // const examDate  = "15/02/2025";
    if (!examDate) return res.status(400).json({ message: "Exam date is required." });

    // Fetch student IDs in bulk
    // const studentIds = await BasicDetails.find({ examDate }).distinct("student_id");
    // if (studentIds.length === 0) {
    //   return res.status(404).json({ message: "No students found for the given exam date." });
    // }


    // Fetch students who have results using bulk query
    const allResults = await Result.find({
        examDate ,
        resultUrl: { $exists: true, $ne: null, $ne: "" }
    }).select("resultUrl");

console.log("allResults", allResults);

    // const allResults = await Result.find({ examDate }).select("resultUrl");
    console.log("allResults", allResults.length);

    if (allResults.length === 0) {
      return res.status(401).json({ message: "No results found for the given exam date." });
    }

    const downloadFolder = path.join(__dirname, 'downloads');
    if (!fs.existsSync(downloadFolder)) {
      fs.mkdirSync(downloadFolder);
    }

    // Parallel downloads
    await Promise.all(allResults.map(async (result) => {
      try {
        const fileUrl = result.resultUrl;
        const fileName = path.basename(fileUrl);
        const filePath = path.join(downloadFolder, fileName);

        const response = await axios({
          method: 'GET',
          url: fileUrl,
          responseType: 'stream',
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });

      } catch (error) {
        console.error(`Failed to download file for result: ${result.resultUrl}`, error);
      }
    }));

    // Create ZIP archive
    const zipFilePath = path.join(__dirname, 'public', 'student_results.zip');
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => console.error('Archive error:', err));
    output.on('close', () => console.log(`ZIP file created: ${zipFilePath}`));

    archive.pipe(output);
    archive.directory(downloadFolder, false);
    await archive.finalize();

    if (!fs.existsSync(zipFilePath)) {
      return res.status(404).json({ message: "ZIP file not found. Generate it first." });
    }

    res.setHeader('Content-Type', 'application/zip');
    const fileStream = fs.createReadStream(zipFilePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: "Error generating ZIP file." });
  }
});







// router.post('/generate-zip', async (req, res) => {

//   try {
//     const allstudentAccoundingToDate = await BasicDetails.find({ examDate: "02/20/2025" }).select("student_id ");
//     console.log("allstudentAccoundingToDate", allstudentAccoundingToDate);
//     const students = await Students.find({ result: { $exists: true, $ne: null, $ne: "" } });
//     if (students.length === 0) {
//       return res.status(404).json({ message: "No results found." });
//     }

//     const downloadFolder = path.join(__dirname, 'downloads');
//     if (!fs.existsSync(downloadFolder)) {
//       fs.mkdirSync(downloadFolder);
//     }

//     // Download all PDFs
//     for (const student of students) {
//       const fileUrl = student.result;
//       const fileName = path.basename(fileUrl);
//       const filePath = path.join(downloadFolder, fileName);

//       const response = await axios({
//         method: 'GET',
//         url: fileUrl,
//         responseType: 'stream',
//       });

//       const writer = fs.createWriteStream(filePath);
//       response.data.pipe(writer);

//       await new Promise((resolve, reject) => {
//         writer.on('finish', resolve);
//         writer.on('error', reject);
//       });

//       console.log(`Downloaded: ${fileName}`);
//     }

//     // Create ZIP archive
//     const zipFilePath = path.join(PUBLIC_DIR, 'student_results.zip');
//     const output = fs.createWriteStream(zipFilePath);
//     const archive = archiver('zip', { zlib: { level: 9 } });

//     output.on('close', () => console.log(`ZIP file created: ${zipFilePath}`));
//     archive.on('error', (err) => console.error('Archive error:', err));

//     archive.pipe(output);
//     archive.directory(downloadFolder, false);
//     await archive.finalize();

//     if (!fs.existsSync(zipFilePath)) {
//       return res.status(404).json({ message: "ZIP file not found. Generate it first." });
//     }

//     res.setHeader('Content-Type', 'application/zip'); // Ensures it's treated as a file
//     // res.setHeader('Content-Disposition', 'attachment; filename=student_results.zip');

//     const fileStream = fs.createReadStream(zipFilePath);
//     fileStream.pipe(res);

//     // res.json({ message: "ZIP file created successfully.", downloadUrl: `/download-zip` });

//   } catch (error) {
//     console.error('Error:', error);
//     res.status(500).json({ message: "Error generating ZIP file." });
//   }
// });

// API to serve the ZIP file for download
// router.get('/download-zip', (req, res) => {
//     const zipFilePath = path.join(PUBLIC_DIR, 'student_results.zip');
//     if (!fs.existsSync(zipFilePath)) {
//         return res.status(404).json({ message: "ZIP file not found. Generate it first." });
//     }

//     res.download(zipFilePath, 'student_results.zip');
// });



router.get('/download-zip', (req, res) => {
  const zipFilePath = path.join(PUBLIC_DIR, 'student_results.zip');

  console.log("zipFilePath", zipFilePath);

  if (!fs.existsSync(zipFilePath)) {
    return res.status(404).json({ message: "ZIP file not found. Generate it first." });
  }

  res.setHeader('Content-Type', 'application/zip'); // Ensures it's treated as a file
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
    //   phone,
    //   password: hashedPassword,
    // });
    // await newStudent.save();

    const newExamDate = new ExamDate({ examDate, examName });
    await newExamDate.save();
    res.status(200).json({ message: "exam date added successfully" });
  } catch (error) {
    console.log("error", error)
    res.status(500).json({ error: "Internal Server Error" })
  }
})



router.get("/getAllDates", async (req, res) => {
  try {
    const getAllExamDate = await ExamDate.find().sort({ examDate: 1 });
    res.status(200).json(getAllExamDate);


  } catch (error) {
    console.log("error", error)
  }
}

)


router.patch("/editDate", async (req, res) => {
  const { _id, changedDate, newExamName } = req.body;

  if (!_id || !changedDate) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  try {
    const updatedExam = await ExamDate.findByIdAndUpdate(
      _id,
      { examDate: changedDate,
        examName : newExamName
       }, // Update the examDate field
      { new: true } // Return the updated document
    );

    if (!updatedExam) {
      return res.status(404).json({ error: "Exam date not found." });
    }

    res.status(200).json({ message: "Exam date updated successfully!", updatedExam });
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
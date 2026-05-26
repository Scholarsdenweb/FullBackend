const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const ExcelJS = require("exceljs");
const csv = require("csv-parser");
const { Readable } = require("stream");
const Admin = require("../models/Admin");
const Students = require("../models/Student");
const BasicDetails = require("../models/form/BasicDetails");
const FamilyDetails = require("../models/form/FamilyDetails");
const EducationalDetails = require("../models/form/EducationalDetails");
const BatchRelatedDetails = require("../models/form/BatchRelatedDetails");
const {
  verifyTokenForAdmission,
  verifyTokenForRegistration,
} = require("../middleware/authentication");
const { postPaymentFlow } = require("../controllers/webhookHandler");
const { syncLeadToCims } = require("../utils/cimsLeadSyncService");
const axios = require("axios");


// routes/admin.js
const RegistrationCounter = require("../models/RegistrationCounter"); // Updated import

// Create registragtion counter for XI and XII class same for both engineering and medical not required to create seprate like 11 medical and 11 engineering have one counter and 12 medical and 12 engineering have one counter


const router = express.Router();

const romanToInt = (number) => {
  const romanNumerals = {
    I: "01",
    II: "02",
    III: "03",
    IV: "04",
    V: "05",
    VI: "06",
    VII: "07",
    VIII: "08",
    IX: "09",
    X: "10",
    XI: "11",
    XII: "12",
    "XII Passed": "13",
    "XI Engineering": "11",
    "XII Engineering": "12",
    "XII Passed Engineering": "13",
    "XI Medical": "14",
    "XII Medical": "15",
    "XII Passed Medical": "16",
  };
  return romanNumerals[number];
};

const PREVIOUS_CLASS_MAP = {
  II: "I",
  III: "II",
  IV: "III",
  V: "IV",
  VI: "V",
  VII: "VI",
  VIII: "VII",
  IX: "VIII",
  X: "IX",
  "XI Engineering": "X",
  "XII Engineering": "XI Engineering",
  "XII Passed Engineering": "XII Engineering",
  "XI Medical": "X",
  "XII Medical": "XI Medical",
  "XII Passed Medical": "XII Medical",
};

const getScholarshipClassFromAdmissionClass = (admissionClass) => {
  return PREVIOUS_CLASS_MAP[admissionClass] || admissionClass;
};

const getRegistrationCounterClass = (className) => {
  if (className === "XI Engineering" || className === "XI Medical") return "XI";
  if (className === "XII Engineering" || className === "XII Medical") return "XII";
  return className;
};

const getRegistrationCounterClassFromAdmissionClass = (admissionClass) => {
  return getRegistrationCounterClass(getScholarshipClassFromAdmissionClass(admissionClass));
};

const offlineRegistrationRoles = [
  "hr",
  "admin",
  "admissionHead",
  "cashier",
  "accounts",
  "counsellor",
];

const normalizeKey = (key) =>
  String(key || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getValueByAliases = (row, aliases = []) => {
  const normalizedMap = {};
  for (const [key, value] of Object.entries(row || {})) {
    normalizedMap[normalizeKey(key)] = value;
  }

  for (const alias of aliases) {
    const val = normalizedMap[normalizeKey(alias)];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      return val;
    }
  }
  return "";
};

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};

const toDateOrNull = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseCsvBuffer = (buffer) =>
  new Promise((resolve, reject) => {
    const rows = [];
    Readable.from(buffer)
      .pipe(csv())
      .on("data", (data) => rows.push(data))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });

const parseXlsxBuffer = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const headerRow = worksheet.getRow(1);
  const headers = [];
  headerRow.eachCell((cell, col) => {
    headers[col] = String(cell.value || "").trim();
  });

  const rows = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const data = {};
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber] || `col_${colNumber}`;
      data[header] = cell.value && cell.value.text ? cell.value.text : cell.value;
    });
    rows.push(data);
  });
  return rows;
};

const syncOfflineRegistrationToCimsEnquiry = async ({
  student,
  basicDetails,
  batchDetails,
  familyDetails,
  educationalDetails,
  receiptId,
  paymentDone,
  paymentAmount,
}) => {
  return syncLeadToCims(
    {
      leadId: student.enquiryNumber || student.StudentsId || String(student._id),
      enquiryId: String(student._id || ""),
      enquiryNumber: student.enquiryNumber || student.StudentsId || String(student._id),
      registrationId: String(student._id),
      student_id: student.StudentsId || "",
      student_name: student.studentName || "",
      student_phone: student.contactNumber || "",
      student_email: student.email || "",
      current_class: batchDetails?.classForAdmission || "",
      program: batchDetails?.program || "",
      school_name: educationalDetails?.SchoolName || "",
      board: educationalDetails?.Board || "",
      last_percentage:
        educationalDetails?.Percentage != null ? String(educationalDetails.Percentage) : "",
      father_name: familyDetails?.FatherName || "",
      father_phone: familyDetails?.FatherContactNumber || "",
      mother_name: familyDetails?.MotherName || "",
      annual_income: familyDetails?.FamilyIncome || "",
      exam_date: basicDetails?.examDate || "",
      payment_mode: "offline",
      payment_status: paymentDone ? "paid" : "pending",
      payment_amount: paymentAmount || 0,
      registration_fee: paymentAmount || 0,
      payment_id: receiptId || "",
      receipt_id: receiptId || "",
      formFill: "offline",
    },
    "offline_registration_import",
  );
};

// Verify admin token issued by /admin/login (payload: { id: admin._id })
const verifyAdminToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({ success: false, message: "Token is required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id).select("-password");

    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

// Admin API: Upload offline registration payment details.
// receiptId present => paid, receiptId absent => unpaid.
router.post("/offline-registration/payment", verifyTokenForRegistration(offlineRegistrationRoles), async (req, res) => {
  try {
    const { studentId, receiptId } = req.body;

    if (!studentId) {
      return res
        .status(400)
        .json({ success: false, message: "studentId is required" });
    }

    const student = await Students.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const normalizedReceiptId = String(receiptId || "").trim();
    const paymentDone = Boolean(normalizedReceiptId);

    // Store offline receipt number in paymentId as requested.
    student.paymentId = normalizedReceiptId || null;
    student.formFill = "offline";
    await student.save();

    return res.status(200).json({
      success: true,
      message: paymentDone
        ? "Offline payment marked as done"
        : "Offline payment marked as pending",
      data: {
        studentId: student._id,
        receiptId: student.paymentId || null,
        paymentDone,
        paymentStatus: paymentDone ? "done" : "pending",
      },
    });
  } catch (error) {
    console.error("offline-registration/payment error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin API: Check offline payment status by studentId.
router.get(
  "/offline-registration/payment/:studentId/status",
  verifyTokenForRegistration(offlineRegistrationRoles),
  async (req, res) => {
    try {
      const { studentId } = req.params;
      const student = await Students.findById(studentId).select("paymentId");

      if (!student) {
        return res.status(404).json({ success: false, message: "Student not found" });
      }

      const receiptId = String(student.paymentId || "").trim();
      const paymentDone = Boolean(receiptId);

      return res.status(200).json({
        success: true,
        data: {
          studentId: student._id,
          receiptId: receiptId || null,
          paymentDone,
          paymentStatus: paymentDone ? "done" : "pending",
        },
      });
    } catch (error) {
      console.error("offline payment status error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

// Admin API: Bulk upload offline registration records where each row may contain
// full student data. receiptId/reciptId present => paid, else pending.
router.post(
  "/offline-registration/payment/bulk",
  verifyTokenForRegistration(offlineRegistrationRoles),
  async (req, res) => {
    try {
      const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];

      if (!rows.length) {
        return res.status(400).json({
          success: false,
          message: "rows array is required",
        });
      }

      const results = [];
      let updatedCount = 0;
      let notFoundCount = 0;

      for (const row of rows) {
        const studentObjectId =
          row?.studentId || row?.student_id || row?.registrationId || null;
        const studentsId = String(row?.StudentsId || row?.studentsId || "").trim();
        const contactNumber = String(
          row?.contactNumber || row?.student_phone || row?.phone || "",
        ).trim();
        const email = String(row?.email || row?.student_email || "").trim().toLowerCase();
        const receiptRaw = row?.receiptId ?? row?.reciptId ?? row?.payment_id ?? "";
        const receiptId = String(receiptRaw || "").trim();
        const paymentDone = Boolean(receiptId);

        let student = null;

        if (studentObjectId) {
          student = await Students.findById(studentObjectId);
        }
        if (!student && studentsId) {
          student = await Students.findOne({ StudentsId: studentsId });
        }
        if (!student && contactNumber) {
          student = await Students.findOne({ contactNumber });
        }
        if (!student && email) {
          student = await Students.findOne({ email });
        }

        if (!student) {
          notFoundCount += 1;
          results.push({
            success: false,
            paymentDone: false,
            paymentStatus: "pending",
            message: "Student not found",
            lookup: {
              studentId: studentObjectId || null,
              StudentsId: studentsId || null,
              contactNumber: contactNumber || null,
              email: email || null,
            },
          });
          continue;
        }

        student.paymentId = receiptId || null;
        student.formFill = "offline";
        await student.save();
        updatedCount += 1;

        results.push({
          success: true,
          studentId: student._id,
          StudentsId: student.StudentsId || null,
          receiptId: student.paymentId || null,
          paymentDone,
          paymentStatus: paymentDone ? "done" : "pending",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Offline payment bulk upload processed",
        summary: {
          totalRows: rows.length,
          updatedCount,
          notFoundCount,
        },
        results,
      });
    } catch (error) {
      console.error("offline-registration/payment/bulk error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

// Admin API: Create full student offline registrations from uploaded file (.csv/.xlsx).
router.post(
  "/offline-registration/import-file",
  verifyTokenForRegistration(offlineRegistrationRoles),
  async (req, res) => {
    const session = await mongoose.startSession();
    try {
      const uploadedFile = req.files?.file;
      if (!uploadedFile) {
        return res.status(400).json({
          success: false,
          message: "Upload file is required in field name: file",
        });
      }

      const fileName = String(uploadedFile.name || "").toLowerCase();
      let rows = [];

      if (fileName.endsWith(".xlsx")) {
        rows = await parseXlsxBuffer(uploadedFile.data);
      } else if (fileName.endsWith(".csv")) {
        rows = await parseCsvBuffer(uploadedFile.data);
      } else {
        return res.status(400).json({
          success: false,
          message: "Only .csv and .xlsx files are supported",
        });
      }

      if (!rows.length) {
        return res.status(400).json({
          success: false,
          message: "No data rows found in uploaded file",
        });
      }

      await session.startTransaction();

      const results = [];
      const postCommitSyncJobs = [];
      let createdCount = 0;
      let skippedCount = 0;

      for (const row of rows) {
        const studentName = String(
          getValueByAliases(row, ["studentName", "student_name", "name"]),
        ).trim();
        const contactNumber = String(
          getValueByAliases(row, ["contactNumber", "contact_number", "phone", "student_phone"]),
        ).trim();
        const email = String(
          getValueByAliases(row, ["email", "student_email"]),
        ).trim().toLowerCase();
        const classForAdmission = String(
          getValueByAliases(row, ["classForAdmission", "class_for_admission", "admissionClass"]),
        ).trim();

        if (!studentName || !contactNumber || !classForAdmission) {
          skippedCount += 1;
          results.push({
            success: false,
            message: "Missing required fields: studentName, contactNumber, classForAdmission",
            row,
          });
          continue;
        }

        const duplicate = await Students.findOne({
          $or: [{ contactNumber }, ...(email ? [{ email }] : [])],
        }).session(session);

        if (duplicate) {
          skippedCount += 1;
          results.push({
            success: false,
            message: "Student already exists",
            studentId: duplicate._id,
            contactNumber,
            email: email || null,
          });
          continue;
        }

        const receiptId = String(
          getValueByAliases(row, ["receiptId", "reciptId", "receipt_id", "paymentId", "payment_id"]),
        ).trim();
        const paymentDone = Boolean(receiptId);
        const paymentAmount =
          toNumberOrNull(
            getValueByAliases(row, ["payment_amount", "paymentAmount", "registration_fee", "amount"]),
          ) || 0;

        const student = await Students.create(
          [
            {
              studentName,
              contactNumber,
              email: email || undefined,
              role: "Student",
              paymentId: receiptId || null,
              formFill: "offline",
            },
          ],
          { session },
        ).then((docs) => docs[0]);

        const studentsId = await Students.allocateStudentsId(classForAdmission, session);
        student.StudentsId = studentsId;
        await student.save({ session });

        const basicDetails = await BasicDetails.create(
          [
            {
              student_id: student._id,
              dob: toDateOrNull(getValueByAliases(row, ["dob", "dateOfBirth"])),
              gender: String(getValueByAliases(row, ["gender"])).trim() || undefined,
              examName: String(getValueByAliases(row, ["examName", "exam_name"])).trim() || "SDAT",
              examDate: String(getValueByAliases(row, ["examDate", "exam_date"])).trim() || undefined,
            },
          ],
          { session },
        ).then((docs) => docs[0]);

        const familyDetails = await FamilyDetails.create(
          [
            {
              student_id: student._id,
              FatherName: String(getValueByAliases(row, ["FatherName", "father_name"])).trim() || undefined,
              FatherContactNumber:
                String(getValueByAliases(row, ["FatherContactNumber", "father_phone"])).trim() || undefined,
              FatherOccupation:
                String(getValueByAliases(row, ["FatherOccupation", "father_occupation"])).trim() || undefined,
              MotherName: String(getValueByAliases(row, ["MotherName", "mother_name"])).trim() || undefined,
              MotherContactNumber:
                String(getValueByAliases(row, ["MotherContactNumber", "mother_phone"])).trim() || undefined,
              MotherOccupation:
                String(getValueByAliases(row, ["MotherOccupation", "mother_occupation"])).trim() || undefined,
              FamilyIncome: String(getValueByAliases(row, ["FamilyIncome", "family_income"])).trim() || undefined,
            },
          ],
          { session },
        ).then((docs) => docs[0]);

        const educationalDetails = await EducationalDetails.create(
          [
            {
              student_id: student._id,
              SchoolName: String(getValueByAliases(row, ["SchoolName", "school_name"])).trim() || undefined,
              Percentage: toNumberOrNull(getValueByAliases(row, ["Percentage", "percentage"])),
              Class: String(getValueByAliases(row, ["Class", "previous_class"])).trim() || undefined,
              YearOfPassing: toNumberOrNull(getValueByAliases(row, ["YearOfPassing", "year_of_passing"])),
              Board: String(getValueByAliases(row, ["Board", "board"])).trim() || undefined,
            },
          ],
          { session },
        ).then((docs) => docs[0]);

        const batchDetails = await BatchRelatedDetails.create(
          [
            {
              student_id: student._id,
              classForAdmission,
              program: String(getValueByAliases(row, ["program"])).trim() || undefined,
            },
          ],
          { session },
        ).then((docs) => docs[0]);

        postCommitSyncJobs.push(async () => {
          const enquirySync = await syncOfflineRegistrationToCimsEnquiry({
            student,
            basicDetails,
            batchDetails,
            familyDetails,
            educationalDetails,
            receiptId,
            paymentDone,
            paymentAmount,
          });

          let postPaymentSync = null;
          if (paymentDone) {
            postPaymentSync = await postPaymentFlow({
              registrationId: student._id,
              studentsId: student.StudentsId,
              razorpay_payment_id: receiptId,
              razorpay_order_id: `offline_order_${student._id}`,
              payment_amount: paymentAmount,
              payment_mode: "offline",
            });
          }

          return { enquirySync, postPaymentSync };
        });

        createdCount += 1;
        results.push({
          success: true,
          studentId: student._id,
          StudentsId: student.StudentsId,
          receiptId: student.paymentId || null,
          paymentDone,
          paymentStatus: paymentDone ? "done" : "pending",
        });
      }

      await session.commitTransaction();

      Promise.allSettled(postCommitSyncJobs.map((job) => job())).then((syncResults) => {
        const failedCount = syncResults.filter((result) => result.status === "rejected").length;
        if (failedCount) {
          console.error(
            `[OFFLINE_IMPORT] CIMS/webhook sync failed for ${failedCount}/${syncResults.length} records`,
          );
        }
      });

      return res.status(200).json({
        success: true,
        message: "Offline registration file processed",
        summary: {
          totalRows: rows.length,
          createdCount,
          skippedCount,
        },
        results,
      });
    } catch (error) {
      await session.abortTransaction();
      console.error("offline-registration/import-file error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to import offline registrations",
        error: error.message,
      });
    } finally {
      session.endSession();
    }
  },
);

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

    const sharedXI = counters.find(c => c.classForAdmission === "XI")?.count || 0;
    const sharedXII = counters.find(c => c.classForAdmission === "XII")?.count || 0;
    const legacyXI =
      counters.find(c => c.classForAdmission === "XI Engineering")?.count ||
      counters.find(c => c.classForAdmission === "XI Medical")?.count ||
      0;
    const legacyXII =
      counters.find(c => c.classForAdmission === "XII Engineering")?.count ||
      counters.find(c => c.classForAdmission === "XII Medical")?.count ||
      0;

    const comparison = {
      shared: {
        XI: sharedXI || legacyXI,
        XII: sharedXII || legacyXII,
      },
      engineering: {
        XI: sharedXI || counters.find(c => c.classForAdmission === "XI Engineering")?.count || 0,
        XII: sharedXII || counters.find(c => c.classForAdmission === "XII Engineering")?.count || 0,
        "XII Passed": counters.find(c => c.classForAdmission === "XII Passed Engineering")?.count || 0,
      },
      medical: {
        XI: sharedXI || counters.find(c => c.classForAdmission === "XI Medical")?.count || 0,
        XII: sharedXII || counters.find(c => c.classForAdmission === "XII Medical")?.count || 0,
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
      grandTotal:
        comparison.shared.XI +
        comparison.shared.XII +
        comparison.engineering["XII Passed"] +
        comparison.medical["XII Passed"],
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

    const counterMap = new Map();
    classYearGroups.forEach((group) => {
      const counterClass = getRegistrationCounterClassFromAdmissionClass(group._id.class);
      const key = `${group._id.year}:${counterClass}`;
      const current = counterMap.get(key) || {
        year: group._id.year,
        classForAdmission: counterClass,
        count: 0,
        lastStudentsId: group.lastStudentsId,
      };

      current.count += group.count;
      if (String(group.lastStudentsId || "") > String(current.lastStudentsId || "")) {
        current.lastStudentsId = group.lastStudentsId;
      }

      counterMap.set(key, current);
    });

    const operations = Array.from(counterMap.values()).map((counter) => ({
      updateOne: {
        filter: {
          year: counter.year,
          classForAdmission: counter.classForAdmission,
        },
        update: {
          $set: {
            count: counter.count,
            lastStudentsId: counter.lastStudentsId,
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

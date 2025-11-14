// const mongoose = require("mongoose");

// // Define Students Schema
// const studentsSchema = new mongoose.Schema(
//   {
//     studentName: { type: String },
//     StudentsId: { type: String }, // Unique constraint for StudentsId
//     email: {
//       type: String,
//       partialFilterExpression: { email: { $exists: true, $ne: null } },
//     },
//     admitCard: { type: String },
//     profilePicture: { type: String },
//     result: { type: String },
//     paymentId: { type: String },
//     role: { type: String, required: true },
//     contactNumber: { type: String, required: true },
//     enquiryNumber: {
//       type: String,
//     },
//     messageStatus: {
//       admitCardSend: { type: Boolean, default: false },
//       admitCardSentDate: { type: Date },
//       resultSend: { type: Boolean, default: false },
//       resultSentDate: { type: Date },
//     },
//     password: { type: String },
//     resetToken: { type: String },
//     resetTokenExpiry: { type: String },
//   },
//   {
//     timestamps: true,
//   }
// );


// const normalizeValue = (data) => {
//   const parts = data.trim().split(/\s+/);
//   const first = parts[0].replace(/(st|nd|rd|th)$/i, "").toUpperCase();
//   const rest = parts.slice(1).join(" ");

//   // If already a valid Roman numeral, return original input
//   if (validRomans.has(first)) {
//     return data.trim();
//   }

//   // Try converting number to Roman
//   const num = parseInt(first);
//   const roman = isNaN(num) ? first : numberToRoman(num);

//   return `${roman} ${rest}`.trim();
// };

// const numberToRoman = (value) => {
//   const romanMap = {
//     1: "I",
//     2: "II",
//     3: "III",
//     4: "IV",
//     5: "V",
//     6: "VI",
//     7: "VII",
//     8: "VIII",
//     9: "IX",
//     10: "X",
//     11: "XI",
//     12: "XII",
//   };
//   return romanMap[value] || "Invalid";
// };

// const validRomans = new Set([
//   "I",
//   "II",
//   "III",
//   "IV",
//   "V",
//   "VI",
//   "VII",
//   "VIII",
//   "IX",
//   "X",
//   "XI",
//   "XII",
// ]);

// // Static Method to Allocate /StudentsId
// studentsSchema.statics.allocateStudentsId = async function (classForAdmission) {
//   let currentYear = new Date().getFullYear();
//   const currentmonth = new Date().getMonth();

//   console.log("classAdmission.......,,,,,,,,,,", classForAdmission);

//   const admissionClass = normalizeValue(classForAdmission);

//   console.log("admisisionClass,,,,,,,,,,,,,,,,,,,", admissionClass);

//   if (currentmonth > 9 && currentmonth < 12) {
//     currentYear = currentYear + 1;
//   }
//   // Count how many students are in the given class using BatchRelatedDetails
//   const BatchRelatedDetails = mongoose.model("BatchRelatedDetails");
//   const classStudentCount = await BatchRelatedDetails.aggregate([
//     {
//       $match: { classForAdmission: admissionClass }, // Match students of a specific class
//     },
//     {
//       $lookup: {
//         from: "students",
//         localField: "student_id",
//         foreignField: "_id",
//         as: "studentDetails",
//       },
//     },
//     {
//       $match: {
//         "studentDetails.StudentsId": { $exists: true, $ne: null },
//       },
//     },
//     {
//       $count: "totalStudentsWithStudentsId",
//     },
//   ]);

//   function romanToInt(number) {
//     const romanNumerals = {
//       I: "01",
//       II: "02",
//       III: "03",
//       IV: "04",
//       V: "05",
//       VI: "06",
//       VII: "07",
//       VIII: "08",
//       IX: "09",
//       X: "10",
//       "XI Engineering": "11",
//       "XII Engineering": "12",
//       "XII Passed Engineering": "13",
//       "XI Medical": "14",
//       "XII Medical": "15",
//       "XII Passed Medical": "16",
//     };

//     return romanNumerals[number];
//   }

//   const count = classStudentCount[0]?.totalStudentsWithStudentsId + 200 || 200;

//   // Increment the count for the new student
//   const studentNumber = String(count).padStart(3, "0"); // 3-digit padding
//   console.log("studentNumber", studentNumber);

//   console.log("admissionClass./.........", admissionClass);

//   console.log(
//     "romanToInt(admissionClass)..............",
//     romanToInt(admissionClass)
//   );
//   const StudentsId = `${currentYear}${romanToInt(
//     admissionClass
//   )}${studentNumber}`;
//   console.log("StudentsId", StudentsId);

//   // Return the formatted StudentsId
//   return StudentsId;
// };


// studentsSchema.index(
//   { StudentsId: 1 },
//   { unique: true, partialFilterExpression: { StudentsId: { $ne: null } } }
// );

// // Create and Export the Students Model
// const Students = mongoose.model("Students", studentsSchema);
// module.exports = Students;












// models/Student.js
const mongoose = require("mongoose");
const RegistrationCounter = require("./RegistrationCounter"); // Updated import

const studentsSchema = new mongoose.Schema(
  {
    studentName: { type: String },
    StudentsId: { type: String },
    email: { type: String },
    admitCard: { type: String },
    profilePicture: { type: String },
    result: { type: String },
    paymentId: { type: String },
    role: { type: String, required: true },
    contactNumber: { type: String, required: true },
    enquiryNumber: { type: String },
    messageStatus: {
      admitCardSend: { type: Boolean, default: false },
      admitCardSentDate: { type: Date },
      resultSend: { type: Boolean, default: false },
      resultSentDate: { type: Date },
    },
    password: { type: String },
    resetToken: { type: String },
    resetTokenExpiry: { type: String },
  },
  {
    timestamps: true,
  }
);

// Helper functions
const normalizeValue = (data) => {
  const parts = data.trim().split(/\s+/);
  const first = parts[0].replace(/(st|nd|rd|th)$/i, "").toUpperCase();
  const rest = parts.slice(1).join(" ");

  if (validRomans.has(first)) {
    return data.trim();
  }

  const num = parseInt(first);
  const roman = isNaN(num) ? first : numberToRoman(num);
  return `${roman} ${rest}`.trim();
};

const numberToRoman = (value) => {
  const romanMap = {
    1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI",
    7: "VII", 8: "VIII", 9: "IX", 10: "X", 11: "XI", 12: "XII",
  };
  return romanMap[value] || "Invalid";
};

const validRomans = new Set([
  "I", "II", "III", "IV", "V", "VI", "VII", 
  "VIII", "IX", "X", "XI", "XII",
]);

const romanToInt = (number) => {
  const romanNumerals = {
    I: "01", II: "02", III: "03", IV: "04", V: "05", VI: "06",
    VII: "07", VIII: "08", IX: "09", X: "10",
    "XI Engineering": "11", "XII Engineering": "12",
    "XII Passed Engineering": "13", "XI Medical": "14",
    "XII Medical": "15", "XII Passed Medical": "16",
  };
  return romanNumerals[number];
};

// Updated Static Method - Now uses RegistrationCounter
studentsSchema.statics.allocateStudentsId = async function (
  classForAdmission,
  session
) {
  let currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const admissionClass = normalizeValue(classForAdmission);

  // Adjust year if in October-December
  if (currentMonth >= 9 && currentMonth < 12) {
    currentYear = currentYear + 1;
  }

  // Get next count from RegistrationCounter (atomic operation)
  const count = await RegistrationCounter.getNextCount(
    currentYear,
    admissionClass,
    session
  );

  // Generate student number (counter + 100 for starting from 100)
  const studentNumber = String(count + 100).padStart(3, "0");

  // Generate StudentsId
  const classCode = romanToInt(admissionClass);
  if (!classCode) {
    throw new Error(`Invalid class: ${admissionClass}`);
  }

  const StudentsId = `${currentYear}${classCode}${studentNumber}`;

  console.log("Generated StudentsId:", StudentsId);

  // Update counter with last generated ID
  await RegistrationCounter.findOneAndUpdate(
    { year: currentYear, classForAdmission: admissionClass },
    { lastStudentsId: StudentsId },
    { session }
  );

  return StudentsId;
};

studentsSchema.index(
  { StudentsId: 1 },
  { unique: true, partialFilterExpression: { StudentsId: { $ne: null } } }
);

const Students = mongoose.model("Students", studentsSchema);
module.exports = Students;
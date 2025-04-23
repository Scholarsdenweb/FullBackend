const mongoose = require("mongoose");

// Define Students Schema
const studentsSchema = new mongoose.Schema(
  {
    studentName: { type: String },
    StudentsId: { type: String }, // Unique constraint for StudentsId
    email: {
      type: String,
      partialFilterExpression: { email: { $exists: true, $ne: null } },
    },
    admitCard: { type: String },
    profilePicture: { type: String },
    result: { type: String },
    paymentId: { type: String },
    role: { type: String, required: true },
    phone: { type: String, required: true },
    enquiryNumber: {
      type : String
    },
    password: { type: String },
    resetToken: { type: String },
    resetTokenExpiry: { type: String },
  },
  {
    timestamps: true,
  }
);

// Static Method to Allocate /StudentsId
studentsSchema.statics.allocateStudentsId = async function (classForAdmission) {
  let currentYear = new Date().getFullYear();
  const currentmonth = new Date().getMonth();

  console.log("ClassForAdmisssion", classForAdmission);

  if (currentmonth > 9 && currentmonth < 12) {
    currentYear = currentYear + 1;
  }
  // Count how many students are in the given class using BatchRelatedDetails
  const BatchRelatedDetails = mongoose.model("BatchRelatedDetails");
  const classStudentCount = await BatchRelatedDetails.aggregate([
    {
      $match: { classForAdmission }, // Match students of a specific class
    },
    {
      $lookup: {
        from: "students",
        localField: "student_id",
        foreignField: "_id",
        as: "studentDetails",
      },
    },
    {
      $match: {
        "studentDetails.admitCard": { $exists: true, $ne: null },
      },
    },
    {
      $count: "totalStudentsWithAdmitCard",
    },
  ]);

  function romanToInt(number) {
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
      "XI Engineering": "11",
      "XII Engineering": "12",
      "XII Passed Engineering": "13",
      "XI Medical": "14",
      "XII Medical": "15",
      "XII Passed Medical": "16",
    };

    return romanNumerals[number];
  }

  const count = classStudentCount[0]?.totalStudentsWithAdmitCard + 1 || 1;

  // Increment the count for the new student
  const studentNumber = String(count).padStart(3, "0"); // 3-digit padding
  console.log("studentNumber", studentNumber);
  const StudentsId = `${currentYear}${romanToInt(
    classForAdmission
  )}${studentNumber}`;
  console.log("StudentsId", StudentsId);

  // Return the formatted StudentsId
  return StudentsId;
};

// Ensure the unique index for StudentsId
// studentsSchema.index({ StudentsId: 1 });
// studentsSchema.drop('StudentsId_1');
studentsSchema.index(
  { StudentsId: 1 },
  { unique: true, partialFilterExpression: { StudentsId: { $ne: null } } }
);

// Create and Export the Students Model
const Students = mongoose.model("Students", studentsSchema);
module.exports = Students;

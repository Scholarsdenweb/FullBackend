const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const ClassStrength = require("./ClassStrength");
const TotalStudents = require("./TotalStudents");
const {
  admissionRollNo,
  enrollmentNumberGenerator,
} = require("../utils/AdminssionRollNo");

const AdmissionSchema = new mongoose.Schema(
  {
    studentName: { type: String },
    admissionRollNo: {
      type: String,

      partialFilterExpression: {
        admissionRollNo: { $exists: true, $ne: null },
      },
    },
    enrollmentNumber: {
      type: String,

      partialFilterExpression: {
        enrollmentNumber: { $exists: true, $ne: null },
      },
    },
    acknowledgementNumber: {
      type: String,

      partialFilterExpression: {
        acknowledgementNumber: { $exists: true, $ne: null },
      },
    },
    receiptId: {
      type: String,
    },
    amountPaid: {
      type: Number,
    },
      batch: {
      type: String,
    },
    bloodGroup: { type: String },
    // aadharID: { type: String, unique: true },
    aadhaarID: { type: String },
    studentContactNumber: { type: String },
    parentsContactNumber: { type: String },
    studentClass: { type: String },
    program: { type: String },

    dob: { type: Date },
    gender: { type: String },
    category: { type: String },
    termsAndCondition: { type: String },

    fatherName: { type: String },
    fatherAadhaarID: { type: String },
    fatherDob: { type: String },
    fatherBloodGroup: { type: String },
    fatherOccupations: { type: String },
    motherName: { type: String },
    motherAadhaarID: { type: String },
    motherDob: { type: String },
    motherBloodGroup: { type: String },
    motherOccupations: { type: String },
    contactNos: {
      father: { type: String },
      mother: { type: String },
    },
    parentEmail: { type: String },
    address: {
      line1: { type: String },
      line2: { type: String },
      city: { type: String },
      district: { type: String },
    },
    admissionClass: { type: String },
    previousSchool: { type: String },

    noOfBrother: { type: Number },
    noOfSister: { type: Number },
    siblingsPosition: { type: Number },
    siblings: [
      {
        relation: String,
        name: String,
        occupation: String,
        studyingIn: String,
        isStudent: Boolean,
        isWorking: Boolean,
      },
    ],
    signatures: {
      student: { type: String },
      parent: { type: String },
      admissionOfficer: { type: String },
      admissionHead: { type: String },
    },

    accountHolder: { type: String },
    bankName: { type: String },
    accountNumber: { type: String },
    ifscCode: { type: String },
    relationWithStudent: { type: String },

    cancelledCheque: { type: String },
    passbookPhoto: { type: String },
    studentAadhaar: { type: String },
    parentAadhaar: { type: String },

    studentPhoto: {
      type: String,
    },
  },
  { timestamps: true }
);

AdmissionSchema.statics.allocateStudentsId = async function (
  studentClass,
  program
) {
  const admissionRollNumber = await admissionRollNo(studentClass, program);
  // const enrollmentNumber = await enrollmentNumberGenerator();
  return { admissionRollNumber };
};

AdmissionSchema.statics.allocatedAcknowledgement = async () => {
  const acknowledgementNumber = await enrollmentNumberGenerator();

  console.log("log form Schema ", acknowledgementNumber);

  return { acknowledgementNumber };
};


                                                                                                                                                   

module.exports = mongoose.model("Admission", AdmissionSchema);

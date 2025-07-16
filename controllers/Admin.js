const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");
const Admission = require("../models/Admission");
const AdmissionApproval = require("../models/AdmissionApproval");

const JWT_SECRET = process.env.JWT_SECRET;

const addAdmin = async (req, res) => {
  console.log("req.body", req.body);
  const { contactNumber, role, name, email } = req.body;

  const existingAdmin = await Admin.findOne({ contactNumber });
  if (existingAdmin) {
    return res.status(400).json("Admin already exists");
  }
  try {
    const createAdmin = new Admin({
      contactNumber,
      role,
      name,
      email,
    });
    const result = await createAdmin.save();
    return res.status(200).json({ result });
  } catch (error) {
    console.log("error", error);
    res.status(500).json("Error adding admin: " + error);
  }
};
const adminLogin = async (req, res) => {
  const { contactNumber } = req.body;

  const existingAdmin = await Admin.findOne({ contactNumber });

  console.log("EXISTINGaDMIN", existingAdmin);
  if (!existingAdmin) {
    return res.status(400).json("Admin already exists");
  }
  try {
    const token = jwt.sign(
      {
        _id: existingAdmin._id,
        contactNumber: existingAdmin.contactNumber,
        role: existingAdmin.role,
      },
      JWT_SECRET
    );
    console.log("token", token);

    return res.status(200).send({
      token,
      admin: {
        contactNumber: contactNumber,
        role: existingAdmin.role,
      },
    });
  } catch (error) {
    res.status(500).json("Error adding student: " + error);
  }
};

const getAdminDetails = async (req, res) => {
  try {
    console.log("req.admin from getAdminDetails ", req.admin);
    const { contactNumber, role, _id, name, email } = req.admin;
    return res
      .status(200)
      .json({ data: { contactNumber, role, _id, name, email } });
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ error: "Server error" });
  }
};

const getAllAdmin = async (req, res) => {
  try {
    const allAdmin = await Admin.find();
    console.log("All Admin", allAdmin);
    return res.status(200).json(allAdmin);
  } catch (error) {
    console.log("error", error);
  }
};

const mongoose = require("mongoose");
const { admissionApprovalTemplate } = require("../utils/smsTemplates");

const addReceiptId = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    console.log("req.body form addRecipt", req.body);

    const { receiptId, amountPaid, acknowledgementNumber } = req.body;

    const updateAdmission = await Admission.findOneAndUpdate(
      { acknowledgementNumber },
      { $set: { receiptId, amountPaid } },
      { new: true, session }
    );

    if (!updateAdmission) throw new Error("Admission not found");

    const updateAdmissionApproval = await AdmissionApproval.findOneAndUpdate(
      { acknowledgementNumber },
      { $set: { status: "successful" } },
      { new: true, session }
    );

    if (!updateAdmissionApproval)
      throw new Error("AdmissionApproval not found");

    if (updateAdmissionApproval.status === "successful") {
      const findAdmission = await Admission.findOne({
        acknowledgementNumber,
      }).session(session);

      const studentClass = findAdmission.studentClass;
      const program = findAdmission.program;

      const { admissionRollNumber } = await Admission.allocateStudentsId(
        studentClass,
        program
      );

      findAdmission.admissionRollNo = admissionRollNumber;
      await findAdmission.save({ session });
    }

    await session.commitTransaction();

    // const updatedAdmission = await Admission.findOne({ acknowledgementNumber });
    // admissionApprovalTemplate(updatedAdmission);

    return res.status(200).json({
      message: "Admission Updated Successfully",
    });
  } catch (error) {
    console.error("Transaction Error:", {
      message: error.message,
      stack: error.stack,
      errorLabels: error.errorLabels,
      code: error.code,
    });
    await session.abortTransaction();
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  } finally {
    session.endSession();
  }
};

module.exports = {
  addAdmin,
  adminLogin,
  getAdminDetails,
  addReceiptId,
  getAllAdmin,
};

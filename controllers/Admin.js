const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");
const Admission = require("../models/Admission");
const AdmissionApproval = require("../models/AdmissionApproval");

const JWT_SECRET = process.env.JWT_SECRET;

const addAdmin = async (req, res) => {
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

const addReceiptId = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const {
      receiptId,
      amountPaid,
      acknowledgementNumber,
      session: academicSession,
    } = req.body;

    const updateAdmission = await Admission.findOneAndUpdate(
      { acknowledgementNumber },
      { $set: { receiptId, amountPaid, session: academicSession } },
      { new: true, session } // <-- attach session
    );

    if (!updateAdmission) {
      throw new Error("Admission not found");
    }

    const updateAdmissionApproval = await AdmissionApproval.findOneAndUpdate(
      { acknowledgementNumber },
      { $set: { status: "amountPaid" } },
      { new: true, session } // <-- attach session
    );

    if (!updateAdmissionApproval) {
      throw new Error("AdmissionApproval not found");
    }

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      message: "Admission Updated Successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Transaction Error:", error);
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
};

module.exports = {
  addAdmin,
  adminLogin,
  getAdminDetails,
  addReceiptId,
  getAllAdmin,
};

const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

const addAdmin = async (req, res) => {
  const { contactNumber, role } = req.body;

  const existingAdmin = await Admin.findOne({ contactNumber });
  if (existingAdmin) {
    return res.status(400).json("Admin already exists");
  }
  try {
    const createAdmin = new Admin({
      contactNumber,
      role: role,
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
      { _id: existingAdmin._id, contactNumber: existingAdmin.contactNumber, role: existingAdmin.role },
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

module.exports = {
  addAdmin,
  adminLogin,
};

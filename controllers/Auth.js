const Student = require("../models/Student");
const Employee = require("../models/Employee");
const express = require("express");
const app = express();
const crypto = require("crypto");

app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../models/UserModel");

const studentSignup = async (req, res) => {
  try {
    const { role = "Student", contactNumber } = req.body;

    // Check if student already exists
    const student = await Student.find({ contactNumber });

    if (student.length > 0) {
      const tokenForExistingStudent = jwt.sign(
        { role: "Student", contactNumber },
        JWT_SECRET
      );
      console.log("Token", tokenForExistingStudent);

      return res.status(200).json({
        message: "Student Already Exist",
        token: tokenForExistingStudent,
        student,
      });
    }

    const dataExistInEnquiry = await User.find({ fatherContactNumber: contactNumber });

    console.log("dataExistInEnquiry before response", dataExistInEnquiry)

    if (dataExistInEnquiry.length > 0) {
      const tokenForExistingStudentInEnquiry = jwt.sign(
        { role: "Student", contactNumber },
        JWT_SECRET
      );
      
      console.log("dataExistInEnquiry", dataExistInEnquiry);
      return res
        .status(200)
        .json({
          message: "Student Exist in Enquiry Form",
          student : dataExistInEnquiry,
          token: tokenForExistingStudentInEnquiry,
        });
    }

    console.log("student for studentsSignup", student);
    // if (student) {
    //   return res.status(400).send("Student already exists");
    // }

    // Hash password
    // const salt = await bcrypt.genSalt(10);
    // const hashedPassword = await bcrypt.hash(password, salt);

    // Create new student
    const newStudent = new Student({
      role,
      contactNumber,
    });
    await newStudent.save();

    // Generate token
    const token = jwt.sign(
      { _id: newStudent._id, role: newStudent.role, contactNumber },
      JWT_SECRET
    );


    console.log("newStudent created ", newStudent);
    res.status(200).send({ token, newStudent });
  } catch (error) {
    console.error("Error in signup:", error.message);
    res.status(500).send("Internal Server Error");
  }
};




const employeeSignup = async (req, res) => {
  const { name, email, role, password } = req.body;
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
    employeeId: crypto.randomUUID(),
  });

  const token = jwt.sign(
    { _id: newEmployee._id, role: newEmployee.role },
    JWT_SECRET
  );

  const employees = await newEmployee.save();

  res.status(200).send({ token, employees });
};

const studentLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find student
    const student = await Student.findOne({ email: email });
    if (!student) {
      return res.status(400).send("Student not found");
    }

    console.log("student", student);

    // Compare passwords
    const validPassword = await bcrypt.compare(password, student.password);
    console.log("validPassword", validPassword);
    if (!validPassword) {
      return res.status(400).send("Invalid Password");
    }

    // Generate token
    const token = jwt.sign(
      { _id: student._id, role: student.role },
      JWT_SECRET
    );
    console.log("token", token);
    console.log("student", student);
    res.status(200).send({
      token,
      student: {
        name: student.name,
        email: student.email,
        role: student.role,
        task: student.task,
        profile: student.profile,
      },
    });
  } catch (error) {
    console.error("Error in login:", error.message);
    res.status(500).send("Internal Server Error");
  }
};

const employeeLogin = async (req, res) => {
  const { email, password } = req.body;
  const employee = await Employee.findOne({ email: email });
  console.log("Email", employee);
  if (!employee) {
    return res.status(400).send("Employee not found");
  }
  const validPassword = await bcrypt.compare(password, employee.password);
  if (!validPassword) {
    return res.status(400).send("Invalid Password");
  }
  const token = jwt.sign(
    { _id: employee._id, role: employee.role },
    JWT_SECRET
  );
  res.status(200).send({
    token,
    employee: {
      name: employee.name,
      email: employee.email,
      role: employee.role,
      task: employee.task,
      profile: employee.profile,
    },
  });
};

require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Or an App Password
  },
});

// tuxa ctgy mqtj pqsm

const generateResetToken = () => crypto.randomBytes(32).toString("hex");

// Route: Request Password Reset
const requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  console.log("email", req.user);
  const role = req.user;
  let UserModel;
  // if (role === 'Employee') UserModel = Employee;
  //  if (role === 'Student') UserModel = Student;
  //  else UserModel = Employee;

  try {
    const user = await Student.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resetToken = generateResetToken();
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour expiry

    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${frontendUrl}/reset-password/${resetToken}`;
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: user.email,
      subject: "Password Reset Request",
      text: `You requested a password reset. Click the link below to reset your password:\n\n${resetLink}\n\nIf you did not request this, please ignore this email.`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    console.error("Error during password reset:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Route: Reset Password
const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;
  const role = req.body.role;
  let UserModel;
  // if (role === 'Employee') UserModel = Employee;
  if (role === "Student") UserModel = Student;
  else UserModel = Employee;

  try {
    const user = await Student.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }, // Check token is not expired
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }
    const salt = await bcrypt.genSalt(10);
    console.log("newPassword", newPassword);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword; // Hash this in production
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  studentSignup,
  employeeSignup,
  studentLogin,
  employeeLogin,
  requestPasswordReset,
  resetPassword,
};

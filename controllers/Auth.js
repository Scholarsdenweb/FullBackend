const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
// const nodemailer = require("nodemailer");
require("dotenv").config();

// Models
const Student = require("../models/Student");
const Employee = require("../models/Employee");
const Admin = require("../models/Admin");
const User = require("../models/UserModel");

// ====== ENVIRONMENT VARIABLES ======
const JWT_SECRET = process.env.JWT_SECRET || "default-secret-key";
const JWT_EXPIRE = process.env.JWT_EXPIRE || "7d";
const NODE_ENV = process.env.NODE_ENV || "development";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

// ====== VALIDATION HELPERS ======
const validatePhoneNumber = (phone) => {
  const phoneRegex = /^[0-9]{10}$/;
  return phoneRegex.test(phone?.toString());
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// ====== JWT & COOKIE HELPERS ======
// ====== JWT & COOKIE HELPERS ======
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE });
};

// Remove async - res.cookie is synchronous
const setAuthCookie = (res, token) => {
  try {
    res.cookie("authToken", token, {
      httpOnly: true,
      secure: false, // ⬅️ FALSE for localhost (no HTTPS)
      sameSite: "lax", // ⬅️ "lax" for localhost
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });
    console.log("✅ Auth cookie set successfully");
  } catch (error) {
    console.error("❌ Error setting auth cookie:", error);
  }
};

// ====== NODEMAILER TRANSPORTER ======
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: EMAIL_USER,
//     pass: EMAIL_PASS, // Use App Password for Gmail
//   },
// });

// // Verify transporter
// transporter.verify((error, success) => {
//   if (error) {
//     console.error("❌ Email transporter error:", error.message);
//   } else {
//     console.log("✅ Email transporter ready");
//   }
// });

// ====== PASSWORD HELPERS ======
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const comparePassword = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

// ====== RESET TOKEN GENERATOR ======
const generateResetToken = () => crypto.randomBytes(32).toString("hex");

// ====== STUDENT SIGNUP ======
const studentSignup = async (req, res) => {
  try {
    const { contactNumber, role = "Student" } = req.body;

    // ====== VALIDATION ======
    if (!contactNumber) {
      return res.status(400).json({
        success: false,
        message: "Contact number is required",
      });
    }

    if (!validatePhoneNumber(contactNumber)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number. Please enter a 10-digit number.",
      });
    }

    // ====== CHECK IF STUDENT ALREADY EXISTS ======
    const existingStudent = await Student.find({ contactNumber });

    // if (false) {
    if (existingStudent.length > 0) {
      console.log("✅ Student already exists:", contactNumber);
      console.log("✅ Student already exists:", existingStudent);

      const token = generateToken({
        role: "Student",
        contactNumber: contactNumber,
      });

      setAuthCookie(res, token);

      return res.status(200).json({
        success: true,
        message: "Student Already Exist",
        token,
        student: existingStudent,
        isNewStudent: false,
      });
    } else {
      // ====== CHECK IF STUDENT EXISTS IN ENQUIRY FORM ======
      const enquiryStudent = await User.find({
        fatherContactNumber: contactNumber,
      });

      if (enquiryStudent.length > 0) {
        console.log("✅ Student exists in enquiry form:", contactNumber);
        console.log("✅ Student exists in enquiry form:", enquiryStudent);

        const token = generateToken({
          contactNumber: contactNumber,
          role: "Student",
        });

        setAuthCookie(res, token);

        return res.status(200).json({
          success: true,
          message:
            "Student found in enquiry records. Complete your registration!",
          token,
          student: enquiryStudent,
          isNewStudent: false,
        });
      }

      // ====== CREATE NEW STUDENT ======
      const newStudent = new Student({
        role,
        contactNumber,
        status: "pending",
        createdAt: new Date(),
      });

      await newStudent.save();
      console.log("✅ New student created:", newStudent._id);

      const token = generateToken({
        role: "Student",
        contactNumber: contactNumber,
        _id: newStudent._id,
      });

      setAuthCookie(res, token);

      return res.status(201).json({
        success: true,
        message: "Student account created successfully!",
        token,
        student: {
          _id: newStudent._id,
          contactNumber: newStudent.contactNumber,
          role: newStudent.role,
        },
        isNewStudent: true,
      });
    }
  } catch (error) {
    console.error("❌ Error in studentSignudsdp:", error.message);

    const errorMessage =
      NODE_ENV === "production"
        ? "An error occurred during signup. Please try again."
        : error.message;

    res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
};

// ====== ADMIN SIGNUP ======
const adminSignup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // ====== VALIDATION ======
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password, and role are required",
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    // ====== CHECK IF EMPLOYEE EXISTS ======
    const existingEmployee = await Employee.findOne({ email });
    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: "Employee with this email already exists",
      });
    }

    // ====== HASH PASSWORD & CREATE EMPLOYEE ======
    const hashedPassword = await hashPassword(password);

    const newEmployee = new Employee({
      name,
      email,
      password: hashedPassword,
      role,
    });

    await newEmployee.save();
    console.log("✅ New employee created:", newEmployee._id);

    const token = generateToken({
      _id: newEmployee._id,
      role: newEmployee.role,
      email: newEmployee.email,
    });

    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      message: "Employee account created successfully!",
      token,
      employee: {
        _id: newEmployee._id,
        name: newEmployee.name,
        email: newEmployee.email,
        role: newEmployee.role,
      },
    });
  } catch (error) {
    console.error("❌ Error in adminSignup:", error.message);

    res.status(500).json({
      success: false,
      message: "An error occurred during signup",
    });
  }
};

// ====== STUDENT LOGIN ======
const studentLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ====== VALIDATION ======
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // ====== FIND STUDENT ======
    const student = await Student.findOne({ email }).select("+password");
    if (!student) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ====== COMPARE PASSWORD ======
    const validPassword = await comparePassword(password, student.password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    console.log("✅ Student login successful:", student._id);

    // ====== GENERATE TOKEN ======
    const token = generateToken({
      _id: student._id,
      role: student.role,
      email: student.email,
    });

    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        role: student.role,
      },
    });
  } catch (error) {
    console.error("❌ Error in studentLogin:", error.message);

    res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
    });
  }
};

// ====== ADMIN LOGIN ======
const adminLogin = async (req, res) => {
  try {
    const { contactNumber } = req.body;

    // ====== VALIDATION ======
    if (!contactNumber) {
      return res.status(400).json({
        success: false,
        message: "Contact number is required",
      });
    }

    if (!validatePhoneNumber(contactNumber)) {
      return res.status(400).json({
        success: false,
        message: "Invalid contact number",
      });
    }

    // ====== FIND ADMIN ======
    const admin = await Admin.findOne({ contactNumber });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Admin not found",
      });
    }

    console.log("✅ Admin login successful:", admin._id);

    // ====== GENERATE TOKEN ======
    const token = generateToken({
      _id: admin._id,
      contactNumber: admin.contactNumber,
      role: admin.role,
    });

    setAuthCookie(res, token);
     res.cookie("phone", admin.contactNumber, {
      // httpOnly: true,
      secure: false, // ⬅️ FALSE for localhost (no HTTPS)
      sameSite: "lax", // ⬅️ "lax" for localhost
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      admin: {
        _id: admin._id,
        contactNumber: admin.contactNumber,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("❌ Error in adminLogin:", error.message);

    res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
    });
  }
};

// ====== REQUEST PASSWORD RESET ======
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    // ====== VALIDATION ======
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // ====== FIND USER ======
    const user = await Student.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not (security best practice)
      return res.status(200).json({
        success: true,
        message: "If email exists, password reset link will be sent",
      });
    }

    // ====== GENERATE RESET TOKEN ======
    const resetToken = generateResetToken();
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    // ====== SEND EMAIL ======
    const resetLink = `${FRONTEND_URL}/reset-password/${resetToken}`;
    const mailOptions = {
      from: EMAIL_USER,
      to: user.email,
      subject: "Password Reset Request - RISE Registration",
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetLink}" style="background-color: #c61d23; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Reset Password
        </a>
        <p>Or copy this link: ${resetLink}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
      text: `Password reset link: ${resetLink}\n\nThis link expires in 1 hour.`,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Password reset email sent to:", user.email);

    res.status(200).json({
      success: true,
      message: "If email exists, password reset link will be sent",
    });
  } catch (error) {
    console.error("❌ Error in requestPasswordReset:", error.message);

    res.status(500).json({
      success: false,
      message: "An error occurred. Please try again.",
    });
  }
};

// ====== RESET PASSWORD ======
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword, confirmPassword } = req.body;

    // ====== VALIDATION ======
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Reset token is required",
      });
    }

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirmation are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    // ====== FIND USER WITH VALID TOKEN ======
    const user = await Student.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // ====== HASH & UPDATE PASSWORD ======
    user.password = await hashPassword(newPassword);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    console.log("✅ Password reset successfully for user:", user._id);

    res.status(200).json({
      success: true,
      message:
        "Password reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.error("❌ Error in resetPassword:", error.message);

    res.status(500).json({
      success: false,
      message: "An error occurred during password reset",
    });
  }
};

// ====== REFRESH TOKEN ======
const refreshToken = async (req, res) => {
  try {
    const token = req.cookies.authToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token found. Please login.",
      });
    }

    // Verify old token
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });

    console.log("✅ Token verified for refresh:", decoded);

    // Check if user exists
    const user = await Student.findById(decoded._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Generate new token
    const newToken = generateToken({
      _id: user._id,
      role: user.role,
      email: user.email,
    });

    setAuthCookie(res, newToken);

    res.status(200).json({
      success: true,
      message: "Token refreshed",
      token: newToken,
    });
  } catch (error) {
    console.error("❌ Error in refreshToken:", error.message);

    res.status(401).json({
      success: false,
      message: "Token refresh failed. Please login again.",
    });
  }
};

// ====== LOGOUT ======
const logout = async (req, res) => {
  try {
    res.clearCookie("authToken", {
      httpOnly: true,
      secure: NODE_ENV === "production",
      sameSite: NODE_ENV === "production" ? "strict" : "lax",
      path: "/",
    });

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("❌ Error in logout:", error.message);

    res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

// ====== EXPORTS ======
module.exports = {
  studentSignup,
  adminSignup,
  studentLogin,
  adminLogin,
  requestPasswordReset,
  resetPassword,
  refreshToken,
  logout,
};

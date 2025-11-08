const jwt = require("jsonwebtoken");
const Employee = require("../models/Employee");
const Student = require("../models/Student");
const User = require("../models/UserModel");
const AdmissionUser = require("../models/Admission");
const Admin = require("../models/Admin");

require("dotenv").config();

/**
 * Extract and verify JWT token from Authorization header
 * @param {Object} req - Express request object
 * @returns {Object|null} - Decoded token or null if invalid
 */
const extractAndVerifyToken = (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error("Token verification error:", error.message);
    return null;
  }
};

/**
 * Middleware to verify admin authentication
 */
const admissionAdmin = async (req, res, next) => {
  try {
    const decoded = extractAndVerifyToken(req);

    if (!decoded) {
      return res.status(401).json({ 
        message: "Authorization token missing, malformed, or invalid" 
      });
    }

    const admin = await Admin.findById(decoded._id).select("-password");

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error("admissionAdmin error:", error);
    return res.status(500).json({ message: "Server error during authentication" });
  }
};

/**
 * Middleware to verify token for registration (Student or Employee)
 * @param {Array} allowedModels - Array of allowed user roles ['Student', 'Employee']
 */
const verifyTokenForRegistration = (allowedModels = []) => {
  return async (req, res, next) => {
    try {
      const decoded = extractAndVerifyToken(req);

      if (!decoded) {
        return res.status(401).json({ message: "No valid token provided" });
      }

      const { _id, role } = decoded;

      if (!allowedModels.includes(role)) {
        return res.status(403).json({ 
          message: "Access denied. Invalid user type for this operation" 
        });
      }

      // Determine the correct model based on role
      const UserModel = role === "Student" ? Student : Employee;

      const user = await UserModel.findById(_id).select("-password");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      req.user = user;
      req.userRole = role;
      next();
    } catch (error) {
      console.error("verifyTokenForRegistration error:", error);
      return res.status(500).json({ message: "Authentication error" });
    }
  };
};

/**
 * Middleware to extract phone number from token
 */
const takenPhoneByToken = () => {
  return async (req, res, next) => {
    try {
      const decoded = extractAndVerifyToken(req);

      if (!decoded) {
        return res.status(401).json({ message: "No valid token provided" });
      }

      const { contactNumber, role } = decoded;

      if (!contactNumber) {
        return res.status(400).json({ message: "Contact number not found in token" });
      }

      req.user = { role, contactNumber };
      next();
    } catch (error) {
      console.error("takenPhoneByToken error:", error);
      return res.status(500).json({ message: "Authentication error" });
    }
  };
};

/**
 * Generic middleware to verify token and fetch user from User model
 */
const verifyToken = () => {
  return async (req, res, next) => {
    try {
      const decoded = extractAndVerifyToken(req);

      if (!decoded) {
        return res.status(401).json({ message: "No valid token provided" });
      }

      const { _id } = decoded;

      const user = await User.findById(_id).select("-password");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error("verifyToken error:", error);
      return res.status(500).json({ message: "Authentication error" });
    }
  };
};

/**
 * Middleware to verify token for admission process
 */
const verifyTokenForAdmission = () => {
  return async (req, res, next) => {
    try {
      const decoded = extractAndVerifyToken(req);

      if (!decoded) {
        return res.status(401).json({ message: "No valid token provided" });
      }

      const { _id, parentsContactNumber, acknowledgementNumber } = decoded;

      if (!acknowledgementNumber) {
        return res.status(400).json({ 
          message: "Acknowledgement number not found in token" 
        });
      }

      const user = await AdmissionUser.findOne({ acknowledgementNumber });

      if (!user) {
        return res.status(404).json({ 
          message: "Admission record not found" 
        });
      }

      req.user = { _id, parentsContactNumber, acknowledgementNumber };
      req.admissionUser = user;
      next();
    } catch (error) {
      console.error("verifyTokenForAdmission error:", error);
      return res.status(500).json({ message: "Authentication error" });
    }
  };
};

/**
 * Middleware to verify token for existing admission
 */
const verifyTokenForExistingAdmission = () => {
  return async (req, res, next) => {
    try {
      const decoded = extractAndVerifyToken(req);

      if (!decoded) {
        return res.status(401).json({ message: "No valid token provided" });
      }

      const { _id, parentsContactNumber, acknowledgementNumber } = decoded;

      req.user = { 
        parentsContactNumber, 
        _id, 
        acknowledgementNumber 
      };

      next();
    } catch (error) {
      console.error("verifyTokenForExistingAdmission error:", error);
      return res.status(500).json({ message: "Authentication error" });
    }
  };
};

/**
 * Middleware to check if user has required role
 * @param {Array} allowedRoles - Array of allowed roles
 */
const checkRole = (allowedRoles = []) => {
  return (req, res, next) => {
    const userRole = req.user?.role || req.userRole;

    if (!userRole) {
      return res.status(403).json({ 
        message: "Access denied. User role not found" 
      });
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        message: "Access denied. Insufficient permissions" 
      });
    }

    next();
  };
};

/**
 * Middleware to verify admin by contact number
 */
const adminCheck = () => {
  return async (req, res, next) => {
    try {
      const decoded = extractAndVerifyToken(req);

      if (!decoded) {
        return res.status(401).json({ message: "No valid token provided" });
      }

      const { contactNumber } = decoded;

      if (!contactNumber) {
        return res.status(400).json({ 
          message: "Contact number not found in token" 
        });
      }

      const admin = await Admin.findOne({ contactNumber }).select("-password");

      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      req.admin = admin;
      next();
    } catch (error) {
      console.error("adminCheck error:", error);
      return res.status(500).json({ message: "Authentication error" });
    }
  };
};




/**
 * Simple middleware to authenticate token and attach user to request
 * Use this for general authentication without specific model requirements
 */
const authenticateToken = async (req, res, next) => {


  console.log("authenticateToken called");
  console.log("authenticateToken called", req.headers.authorization);
  try {
    const decoded = extractAndVerifyToken(req);

    if (!decoded) {
      return res.status(401).json({ message: "No valid token provided" });
    }

    req.user = decoded; // Attach decoded token data to request
    next();
  } catch (error) {
    console.error("authenticateToken error:", error);
    return res.status(500).json({ message: "Authentication error" });
  }
};

// Add to exports
module.exports = {
  verifyToken,
  checkRole,
  adminCheck,
  verifyTokenForRegistration,
  verifyTokenForAdmission,
  takenPhoneByToken,
  verifyTokenForExistingAdmission,
  admissionAdmin,
  authenticateToken, // Add this
};


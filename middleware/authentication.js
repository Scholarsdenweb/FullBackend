const jwt = require("jsonwebtoken");
const Employee = require("../models/Employee");
const Student = require("../models/Student");
const User = require("../models/UserModel");
const AdmissionUser = require("../models/Admission");

require("dotenv").config();

// const verifyToken = (allowedModels) => {
//   return async (req, res, next) => {
//     const token = req.headers.authorization?.split(" ")[1];
//     if (!token) {
//       return res.status(401).json({ message: "No token provided" });
//     }

//     try {
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
//       console.log("Decoded Token:", decoded);

//       const { _id, role } = decoded;

//       console.log("role", role);
//       console.log("role", allowedModels);

//       if (!allowedModels.includes(role)) {
//         return res.status(403).json({ message: "Invalid user type" });
//       }

//       let UserModel;
//       // if (role === 'Employee') UserModel = Employee;
//       if (role === "Student") UserModel = Student;
//       else UserModel = Employee;
//       // else return res.status(403).json({ message: "User type not supported" });
//       const user = await UserModel.findById(_id);
//       if (!user) {
//         return res.status(404).json({ message: "User not found" });
//       }
//       console.log(`Authenticated ${role}:`, user);
//       req.user = user;
//       next();
//     } catch (error) {
//       console.error(error);
//       return res.status(401).json({ message: "Invalid or expired token" });
//     }
//   };
// };

const verifyTokenForRegistration = (allowedModels) => {
  return async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    console.log("req form verifyToekn ", req.headers);
    console.log("Token form verifyTokenFirRegistration", token);
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded Token:", decoded);

      const { _id, role } = decoded;

      console.log("role", role);
      console.log("role", allowedModels);

      if (!allowedModels.includes(role)) {
        return res.status(403).json({ message: "Invalid user type" });
      }

      let UserModel;
      // if (role === 'Employee') UserModel = Employee;
      if (role === "Student") UserModel = Student;
      else UserModel = Employee;
      // else return res.status(403).json({ message: "User type not supported" });
      const user = await UserModel.findById(_id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      console.log(`Authenticated ${role}:`, user);
      req.user = user;
      next();
    } catch (error) {
      console.log("error fortm verifyTokenForRegistration", error);
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
};
const takenPhoneByToken = () => {
  return async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    console.log("req form verifyToekn ", req.headers);
    console.log("Token form verifyTokenFirRegistration", token);
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded Token:", decoded);

      const { contactNumber, role } = decoded;

      console.log("role", role);
      console.log("contactNumber", contactNumber);

      const user = { role, contactNumber };

      req.user = user;
      next();
    } catch (error) {
      console.log("error fortm verifyTokenForRegistration", error);
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
};

const verifyToken = () => {
  return async (req, res, next) => {
    try {
      console.log("req.headers.authorization:", req.headers.authorization);

      // Extract the token from the Authorization header
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }

      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded Token:", decoded);

      const { _id } = decoded;

      // Use the correct User model to fetch the user
      const user = await User.findById(_id); // Ensure User is your actual model

      console.log("User", user);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log("User from verifyToken:", user);
      req.user = user; // Attach the user to the request object

      // Call the next middleware
      next();
    } catch (error) {
      console.error("Error in verifyToken middleware:", error);
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
};

const verifyTokenForAdmission = () => {
  return async (req, res, next) => {
    try {
      console.log("req.headers.authorization:", req.headers.authorization);

      // Extract the token from the Authorization header
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }

      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded Token:", decoded);

      const { _id, parentsContactNumber, acknowledgementNumber } = decoded;


      console.log("acknowledgementNumber from verifyToken", acknowledgementNumber);
      console.log("acknowledgementNumber from verifyToken parentsContactNumber", parentsContactNumber);

      // Use the correct User model to fetch the user

      const user = await AdmissionUser.findOne({acknowledgementNumber}); // Ensure User is your actual model
      console.log("User from verifyToken form admission:", user);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      req.user = { _id, parentsContactNumber, acknowledgementNumber }; // Attach the user to the request object

      // Call the next middleware
      next();
    } catch (error) {
      console.error("Error in verifyToken middleware:", error);
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
};




const verifyTokenForExistingAdmission = ()=>{

  return async (req, res, next) => {
    try {
      console.log("req.headers.authorization:", req.headers.authorization);

      // Extract the token from the Authorization header
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }

      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded Token:", decoded);

      const { _id, parentsContactNumber, acknowledgementNumber } = decoded;

      // Use the correct User model to fetch the user

      console.log("fatherContactNumber form admission", parentsContactNumber);
      // const user = await AdmissionUser.find({parentsContactNumber: fatherContactNumber}); // Ensure User is your actual model
      // console.log("User from verifyToken form admission:", user);
      // if (!user) {
      //   return res.status(404).json({ message: "User not found" });
      // }

      req.user = { parentsContactNumber, _id, acknowledgementNumber }; // Attach the user to the request object

      // Call the next middleware
      next();
    } catch (error) {
      console.error("Error in verifyToken middleware:", error);
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };






}

// const verifyTokenForAdmission = () => {
//   return async (req, res, next) => {
//     try {
//       console.log("req.headers.authorization:", req.headers.authorization);

//       // Extract the token from the Authorization header
//       const token = req.headers.authorization?.split(" ")[1];
//       if (!token) {
//         return res.status(401).json({ message: "No token provided" });
//       }

//       // Verify the token
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
//       console.log("Decoded Token:", decoded);

//       const { _id } = decoded;

//       // Use the correct User model to fetch the user
//       const user = await AdmissionUser.findById(_id); // Ensure User is your actual model

//       console.log("User", user);
//       if (!user) {
//         return res.status(404).json({ message: "User not found" });
//       }

//       console.log("User from verifyToken:", user);
//       req.user = user; // Attach the user to the request object

//       // Call the next middleware
//       next();
//     } catch (error) {
//       console.error("Error in verifyToken middleware:", error);
//       return res.status(401).json({ message: "Invalid or expired token" });
//     }
//   };
// };

const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    console.log("User Role:", userRole);

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res
        .status(403)
        .json({ message: "Access denied. Insufficient role" });
    }

    next();
  };
};

const adminCheck = (allowedAdmin) => {
  return (req, res, next) => {
    const contactNumber = req.body.contactNumber;

    console.log("contactNumber ", contactNumber);
    const isAllowedAdmin = allowedAdmin.includes(contactNumber);
    if (!isAllowedAdmin) {
      return res.status(403).json({ message: "Access denied." });
    }
    next();
  };
};

module.exports = {
  verifyToken,
  checkRole,
  adminCheck,
  verifyTokenForRegistration,
  verifyTokenForAdmission,
  takenPhoneByToken,
  verifyTokenForExistingAdmission
};

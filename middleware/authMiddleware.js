const jwt = require('jsonwebtoken');
const User = require('../models/Admission');

// const verifyToken = () => {
//   return async (req, res, next) => {
//     console.log("req.headers.authorization", req.headers.authorization);
//     const token = req.headers.authorization?.split(' ')[1];
//     if (!token) {
//       return res.status(401).json({ message: "No token provided" });
//     }

//     try {
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
//       console.log("Decoded Token:", decoded);

//       const { _id, studentContactNumber , email } = decoded;

     

    
      
//       const user = await User.findById(_id);
//       if (!user) {
//         return res.status(404).json({ message: "User not found" });
//       }

//       console.log("User form verifyToken:", user);
//       req.user = user; 
//       next();
//     } catch (error) {
//       console.error(error);
//       return res.status(401).json({ message: "Invalid or expired token" });
//     }
//   };
// };






const verifyToken = () => {
  return async (req, res, next) => {
    try {

      // Extract the token from the Authorization header
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }

      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const { _id } = decoded;

      // Use the correct User model to fetch the user
      const user = await User.findById(_id); // Ensure User is your actual model
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      req.user = user; // Attach the user to the request object

      // Call the next middleware
      next();
    } catch (error) {
      console.error("Error in verifyToken middleware:", error);
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
};







const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: "Access denied. Insufficient role" });
    }

    next();
  };
};

module.exports = { verifyToken, checkRole };

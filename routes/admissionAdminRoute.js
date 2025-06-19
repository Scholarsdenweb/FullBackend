const express = require("express");

const { addAdmin, adminLogin } = require("../controllers/Admin");

const router = express.Router();

router.post("/signup", addAdmin);
router.post("/login", adminLogin);

// router.post(
//   "/addStudent",
//   verifyTokenForRegistration("hr", "Student"),
//   checkRole(["hr"]),
//   addStudents
// );

module.exports = router;

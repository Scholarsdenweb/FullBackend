

const express = require("express");
const router = express.Router();
const { studentSignup, employeeSignup, employeeLogin, studentLogin, requestPasswordReset, resetPassword  } = require("../controllers/Auth");



router.post("/student_signup", studentSignup);
router.post("/employee_signup", employeeSignup);
router.post("/student_login", studentLogin);
router.post("/employee_login", employeeLogin);
router.post("/forget_password", requestPasswordReset);
router.post("/reset-password/:token", resetPassword)
module.exports = router;

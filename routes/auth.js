const express = require("express");
const router = express.Router();
const {
  studentSignup,
  adminLogin,
  adminSignup,
  studentLogin,
  requestPasswordReset,
  resetPassword,
} = require("../controllers/Auth");

router.post("/student_signup", studentSignup);
router.post("/admin_signup", adminSignup);
router.post("/student_login", studentLogin);
router.post("/admin_login", adminLogin);
router.post("/forget_password", requestPasswordReset);
router.post("/reset-password/:token", resetPassword);
module.exports = router;

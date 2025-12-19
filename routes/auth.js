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
const { authenticateToken } = require("../middleware/authentication");

router.post("/student_signup", studentSignup);
router.post("/admin_signup", adminSignup);
router.post("/student_login", studentLogin);
router.get("/verify", authenticateToken, (req, res) => {
  console.log("Verification request received", req.user);
  return res.status(200).json({
    authenticated: true,
    user: req.user,
  });
});

router.post("/logout", (req, res) => {

  console.log("Logout request received");
  res.clearCookie("authToken");
  res.clearCookie("phone");
  res.json({ success: true });
});
router.post("/admin_login", adminLogin);
router.post("/forget_password", requestPasswordReset);
router.post("/reset-password/:token", resetPassword);

router.post("/employee_login", adminLogin);
module.exports = router;

const express = require("express");

const {
  addAdmin,
  adminLogin,
  getAdminDetails,
  addReceiptId,
  getAllAdmin,
} = require("../controllers/Admin");
const { admissionAdmin } = require("../middleware/authentication");

const router = express.Router();

router.get("/", admissionAdmin, getAdminDetails);
router.get("/getadmin", admissionAdmin, getAllAdmin);
router.post("/signup", addAdmin);
router.post("/login", adminLogin);
router.post("/update-student", addReceiptId);

// router.post(
//   "/addStudent",
//   verifyTokenForRegistration("hr", "Student"),
//   checkRole(["hr"]),
//   addStudents
// );

module.exports = router;

const {
  checkout,
  getKey,
  paymentVerification,
  getAllPaymentDetails,
  generateAdmitCard
} = require("../controllers/payment");

const express = require("express");
const { verifyTokenForRegistration, checkRole } = require("../middleware/authentication");
const router = express.Router();

router.post("/checkout", checkout);

router.post("/paymentverification",  paymentVerification);
router.post("/generateAdmitCard", verifyTokenForRegistration("Student"), checkRole(["Student"]), generateAdmitCard);

// router.post("/")
router.get("/getKey", getKey);
router.get("/getAllPaymentDetails", verifyTokenForRegistration("hr"), checkRole(["hr"]), getAllPaymentDetails);
 


module.exports = router;

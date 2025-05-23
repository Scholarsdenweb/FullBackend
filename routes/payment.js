const {
  checkout,
  getKey,
  paymentVerification,
  getAllPaymentDetails,
  generateAdmitCard,
} = require("../controllers/payment");

const Razorpay = require("razorpay");
const crypto = require("crypto");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const express = require("express");
const {
  verifyTokenForRegistration,
  checkRole,
} = require("../middleware/authentication");
const { default: axios } = require("axios");
const router = express.Router();

router.post("/checkout", checkout);

router.post("/paymentverification", paymentVerification);
router.post(
  "/generateAdmitCard",
  verifyTokenForRegistration("Student"),
  checkRole(["Student"]),
  generateAdmitCard
);

// router.post("/")
router.get("/getKey", getKey);
router.get(
  "/getAllPaymentDetails",
  verifyTokenForRegistration("hr"),
  checkRole(["hr"]),
  getAllPaymentDetails
);

router.post("/create-invoice", async (req, res) => {
  const { name, contact, email, amount } = req.body;

  console.log("name contact email amount", name, contact, email, amount);

  try {
    const invoice = await razorpay.invoices.create({
      type: "link",
      description: "Payment for services",
      amount: 50000,
      customer: {
        name,
        contact,
        email,
      },
      line_items: [
        {
          name: "Service Fee",
          amount: 50000,
          currency: "INR",
        },
      ],
      sms_notify: 1, // ✅ Send SMS
      email_notify: 0,
    });

    res.json(invoice);
  } catch (err) {
    console.error("Invoice creation failed:", err);
    res.status(500).json({ error: "Invoice creation failed" });
  }
});

router.post("/send-invoice", async (req, res) => {
  // const payment = req.body;
  // if (payment.event === "payment.captured") {
    const options = {
      method: "POST",
      url: "https://www.fast2sms.com/dev/bulkV2",
      headers: {
        authorization: `${process.env.FAST2SMS_API_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: {
        route: "dlt",
        sender_id: "SCHDEN",
        message: "182187",
        variables_values: `1234`,
        flash: 0,
        numbers: `9719706242`,
        // numbers: `${findAdmission?.parentsContactNumber}`,
      },
    };

    // Make the API request to Fast2SMS
    const response = await axios.post(options.url, options.data, {
      headers: options.headers,
    });
    console.log("response of sms ", response);
  // }

});

module.exports = router;

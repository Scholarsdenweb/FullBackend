const {
  checkout,
  getKey,
  paymentVerification,
  getAllPaymentDetails,
  generateAdmitCard,
} = require("../controllers/payment");

const {
  sendAdmitCardNotification,
} = require("../utils/services/whatsappService");

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
const Amount = require("../models/Amount");
const router = express.Router();

router.post("/checkout", checkout);

router.post("/paymentverification", paymentVerification);
router.post(
  "/generateAdmitCard",
  verifyTokenForRegistration("Student"),
  checkRole(["Student"]),
  generateAdmitCard
);

router.post(
  "/sendAdmitCard",
  verifyTokenForRegistration("Student"),
  async (req, res) => {
    console.log("STep 1 start");
    const { studentId } = req.body;

    console.log("STep 2 before body", req.body);

    console.log("STep 2 after body", studentId);
    const response = await sendAdmitCardNotification(studentId);

    console.log("Response from sendAdmitCardNotification", response);
    if (response?.success) {
      return res
        .status(200)
        .json({ message: "Admit card sent successfully", status: true });
    } else {
      res
        .status(500)
        .json({
          message: "Failed to send admit card",
          error: response.error,
          status: false,
        });
    }
  }
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

  // const amount = await RiseFee.findOne({});

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

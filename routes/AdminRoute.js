const express = require("express");
const User = require("../models/UserModel");
// const Student = require('./models/Student')(secondaryConnection);

const router = express.Router();

const url = "https://obd-api.myoperator.co/obd-api-v1";
const apiKey = "oomfKA3I2K6TCJYistHyb7sDf0l0F6c8AZro5DJh"; // Replace with actual key

router.post("/trigger-obd", async (req, res) => {
  const { phone } = req.body;
  try {
    const payload = {
      company_id: "5df87cba87461833",
      secret_token:
        "0ee2949396336195eeb7d93ae59c6c91f55336242df878f02464af03f0df6eb0",
      type: "1",
      user_id: "67a1cf3bba37c164",
      number: `+91${phone}`,
      public_ivr_id: "6800f7fdc5351261",
      reference_id: "",
      region: "<region of a call>",
      caller_id: "<caller id number of a call>",
      group: "<group of a dedicated number>",
    };

    const response = await fetch("https://obd-api.myoperator.co/obd-api-v1", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload), // ✅ FIXED HERE
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error from MyOperator API:", data);
      return res.status(400).json(data);
    }

    console.log("Data response", data);
    res.json(data);
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/getEnquiryData", async (req, res) => {
  try {
    const { email, page = 1 } = req.body;

    console.log("req.data", req.body);
    const limit = 1; // Always fetch 1 user per page
    const skip = (page - 1) * limit;

    console.log("email form request", email);

    let data;

    if (email === "jatin@scholarsden.in") {
      data = await User.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
    } else {
      data = await User.find({ enquiryTakenBy: email })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    }

    console.log("data from getEnquiryData", data);

    // Check if there is no data or if this is the last page
    if (data.length === 0) {
      return res.status(401).json({ message: "No data found" });
    }

    let nextPageData;
    let totalStudents;
    if (email === "jatin@scholarsden.in") {
      nextPageData = await User.find()
        .skip(skip + limit)
        .limit(limit);
      totalStudents = await User.countDocuments();
    } else {
      nextPageData = await User.find({ enquiryTakenBy: email })
        .skip(skip + limit)
        .limit(limit);

      totalStudents = await User.countDocuments({ enquiryTakenBy: email });
    }

    const isLastPage = nextPageData.length === 0; // If nextPageData is empty, it's the last page

    console.log("totalStudents", totalStudents);
    const totalPages = Math.ceil(totalStudents / limit);
    res.status(200).json({
      data,
      currentPage: page,
      isLastPage: isLastPage, // Send information whether it's the last page or not
      totalPages,
    });
  } catch (e) {
    console.log("error in getEnquiryData", e);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;

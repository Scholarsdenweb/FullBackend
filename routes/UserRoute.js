const express = require("express");
const User = require("../models/UserModel");
const OtpStore = require("../models/OtpStore");

const fetch = require("node-fetch");

const sendSDATReminder = require("../utils/sendSDATReminder");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRE = process.env.JWT_EXPIRE || "7d";
const NODE_ENV = process.env.NODE_ENV || "development";

const axios = require("axios");

const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { verifyToken } = require("../middleware/authentication");
const { enquirySubmitionTemplate } = require("../utils/smsTemplates");

const setAuthCookie = (res, token) => {
  res.cookie("authToken", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  });

  
};

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE });
};

router.post("/", async (req, res) => {
  try {
    const { fatherContactNumber } = req.body;

    // Check if user already exists
    // const user = await User.findOne({ $or: [{ fatherContactNumber }, { email }] });

    // if (user) {
    //   return res.status(400).send("User already exists");
    // }

    // Create new user
    const newUser = new User({
      fatherContactNumber,
    });
    await newUser.save();

    console.log("newUser created", newUser);

    console.log("JWT_SECRET", JWT_SECRET);

    // Generate token
    // const token = jwt.sign(
    //   { _id: newUser._id, fatherContactNumber: newUser.fatherContactNumber },
    //   JWT_SECRET
    // );

    const token = generateToken({
      _id: newUser._id,
      fatherContactNumber: newUser.fatherContactNumber,
    });

    console.log("Generated Token", token);

    setAuthCookie(res, token);

    console.log("Token", token);
    res.status(200).send({ token, newUser });
  } catch (error) {
    console.error("Error in signup:", error.message);
    console.error("Error in signup:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/getStudentByPhone", async (req, res) => {
  try {
    const { fatherContactNumber } = req.body;

    console.log("FathwerContactNumber", fatherContactNumber);
    console.log("FathwerContactNumber", req.body);

    const allStudentWithNumber = await User.find({
      fatherContactNumber: fatherContactNumber,
    });

    console.log("AllStudent", allStudentWithNumber);

    if (allStudentWithNumber.length < 1) {
      return res.status(400).json({ message: "No student Found" });
    }

    res.status(200).json({ data: allStudentWithNumber });
  } catch (error) {
    console.log("Error", error);
    res.status(500).json({ message: "Server Problem" });
  }
});

router.get("/getUserbyToken", verifyToken(), async (req, res) => {
  try {
    console.log("req.user from getUserbyToken", req.user);
    const user = await User.findById(req.user._id);
    console.log("req.user from getUserbyToken", user);
    res.status(200).send(user);
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

router.get("/getTokenNo", async (req, res) => {
  try {
    const tokenNo = await User.find().countDocuments();
    res.status(200).json({ tokenNo });
  } catch (error) {
    res.status(500).json("Internal Server Error");
    console.log("Error in getTokenNo", error);
  }
});

router.post("/filter/Student", async (req, res) => {
  try {
    const { data, email } = req.body;

    console.log("Inputvalue", data);
    let afterFilterStudents;

    if (email === "jatin@scholarsden.in") {
      afterFilterStudents = await User.find({
        studentName: { $regex: data, $options: "i" },
      });
      return res.status(200).json(afterFilterStudents);
    }

    afterFilterStudents = await User.find({
      enquiryTakenBy: email,
      studentName: { $regex: data, $options: "i" },
    });

    res.status(200).json(afterFilterStudents);
  } catch (error) {
    console.error("Error filtering students:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router.post("/filter/enquiryNumber", async (req, res) => {
  try {
    const { data, email } = req.body;

    console.log("enquiry data form filter function", data);

    console.log("Inputvalue", data);
    let afterFilterStudents;

    // if (email === "jatin@scholarsden.in") {
    afterFilterStudents = await User.find({
      enquiryNumber: { $regex: `^${data}`, $options: "i" },
    });

    console.log("enquiryNumber filter data", afterFilterStudents);
    return res.status(200).json(afterFilterStudents);
    // }

    // afterFilterStudents = await User.find({
    //   enquiryNumber: { $regex: "^" + data, $options: "i" },
    // });
  } catch (error) {
    console.error("Error filtering students:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router.post("/filter/filterByClass", async (req, res) => {
  try {
    const { filterByClassName, email } = req.body;

    console.log("Inputvalue", filterByClassName);
    let afterFilterStudents;

    if (email === "jatin@scholarsden.in") {
      afterFilterStudents = await User.find({
        courseOfIntrested: filterByClassName,
      });

      return res.status(200).json(afterFilterStudents);
    }

    afterFilterStudents = await User.find({
      courseOfIntrested: filterByClassName,
      enquiryTakenBy: email,
    });

    res.status(200).json(afterFilterStudents);
  } catch (error) {
    console.error("Error filtering students:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.patch("/putFormData", verifyToken(), async (req, res) => {
  try {
    const {
      studentName,
      email,
      studentContactNumber,
      program,
      courseOfIntrested,
      schoolName,
      fatherName,
      fatherOccupations,
      fatherContactNumber,
      city,
      state,
      howToKnow,
      remarks,
      intime,
      enquiryTakenBy,
      brochureGiven,
    } = req.body;
    const { _id } = req.user;

    console.log("req.body", req.body);

    console.log("req.user", req.user);

    const user = await User.findOneAndUpdate(
      { _id },
      {
        studentName,
        studentContactNumber,
        email,
        program,
        courseOfIntrested,
        schoolName,
        fatherName,
        fatherOccupations,
        fatherContactNumber,
        city,
        state,
        howToKnow,
        remarks,
        intime,
        enquiryTakenBy,
        brochureGiven,
      },
      { new: true }
    );

    console.log("user", user);

    // if(enquiryTakenBy){

    // }

    return res.status(200).send({ user });
  } catch (error) {
    console.error("Error in signup:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/formSubmit", async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    console.log("phoneNumber from formSubmit", phoneNumber);
    const response = await enquirySubmitionTemplate(phoneNumber);

    console.log("response", response);

    return res.status(200).json({ message: "Enquiry Submitted" });
  } catch (error) {
    return res.status(500).json({ message: "Server Error" });
  }
});

// router.post("/sendVerification", async (req, res) => {
//   try {
//     const { mobileNumber } = req.body;
//     console.log("req.body from sendVerification", req.body)

//     if (!mobileNumber) {
//       return res.status(400).json({ success: false, message: 'Mobile number is required.' });
//     }

//     console.log(mobileNumber);
//     console.log(process.env.FAST2SMS_API_KEY);

//     // Store the OTP in the database
//     const existingOtp = await OtpStore.findOne({ mobileNumber });

//     if (existingOtp) {
//       return res.status(400).json({ success: false, message: 'An OTP has already been sent to this number.' });
//     }

//     // Generate a random 4-digit OTP
//     const otp = Math.floor(1000 + Math.random() * 9000);

//     const options = {
//       method: 'POST',
//       url: 'https://www.fast2sms.com/dev/bulkV2',
//       headers: {
//         'authorization': `${process.env.FAST2SMS_API_KEY}`,
//         'Content-Type': 'application/x-www-form-urlencoded',
//       },
//       data: new URLSearchParams({
//         variables_values: otp,
//         route: 'otp',
//         numbers: mobileNumber,
//       }),
//     };
//     let otpStoreData;
//     // Make the API request to Fast2SMS
//     const response = await axios.post(options.url, options.data, { headers: options.headers });

//     console.log(response.data);

//     // Store the OTP in the database
//     // const existingOtp = await OtpStore.findOne({ mobileNumber });

//     // if (existingOtp) {
//     //   // Update the existing document if an OTP is already stored for this number
//     //   existingOtp.otp = otp;
//     //   existingOtp.createdAt = new Date();
//     //   await existingOtp.save();
//     // } else {
//       // Create a new document if no OTP exists for this number
//       otpStoreData = await OtpStore.create({ otp, mobileNumber });
//     // }

//     // Construct and send a custom response
//     return res.status(200).json({
//       success: true,
//       message: 'OTP sent successfully',
//       smsResponse: response.data, // Include the response from Fast2SMS
//       otpStoreData
//     });

//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({
//       success: false,
//       message: 'Failed to send OTP.',
//       error: error.message, // Include the error message for easier debugging
//     });
//   }
// });

router.post("/sendVerification", async (req, res) => {
  try {
    const { mobileNumber } = req.body;
    console.log("req.body from sendVerification", req.body);

    if (!mobileNumber) {
      return res
        .status(400)
        .json({ success: false, message: "Mobile number is required." });
    }

    const existingOtp = await OtpStore.findOne({ mobileNumber });

    // console

    // Check if an OTP was already sent within the last 5 minutes

    // if (existingOtp) {
    //   const currentTime = new Date();
    //   const otpCreatedTime = new Date(existingOtp.createdAt);
    //   const timeDifference = (currentTime - otpCreatedTime) / 1000; // Difference in seconds

    //   // If OTP was sent less than 5 minutes ago
    //   if (timeDifference < 30) {
    //     return res.status(400).json({
    //       success: false,
    //       message: `An OTP has already been sent to this number. Please wait ${Math.ceil(30 - timeDifference)} sec before requesting another.`,

    //     });
    //   }
    // }

    // Generate a random 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000);

    console.log("otp", otp);
    console.log("mobileNumber", mobileNumber);

    // Store the OTP in the database
    const options = {
      method: "POST",
      url: "https://www.fast2sms.com/dev/bulkV2",
      headers: {
        authorization:
          "2MLivU4Q3tyFXr1WJcNB8l5YhzT0pAesdoIxRPGwuCSgObZmkVMbkSmGBYOAgHrNosjUhXy854JL269E",
        "Content-Type": "application/json",
      },
      data: {
        route: "dlt",
        sender_id: "SCHDEN",
        message: "182187",
        variables_values: `${otp}|`,
        flash: 0,
        numbers: `${mobileNumber}`,
      },
    };

    axios(options)
      .then(async (response) => {
        console.log(response.data);
        if (existingOtp) {
          // Update the existing record
          existingOtp.otp = otp;
          existingOtp.createdAt = new Date(); // Update the timestamp
          await existingOtp.save();
        } else {
          // Create a new record
          await OtpStore.create({ otp, mobileNumber, createdAt: new Date() });
        }

        return res.status(200).json({
          success: true,
          message: "OTP sent successfully",
          smsResponse: response.data, // Include the response from Fast2SMS
        });
      })
      .catch((error) => {
        console.error(
          "Error:",
          error.response ? error.response.data : error.message
        );

        res.status(401).json({
          success: false,
          message: error.response ? error.response.data : error.message.message,
        });
      });

    // Save the OTP in the database
  } catch (error) {
    console.error("error", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP.",
      error: error.message, // Include the error message for easier debugging
    });
  }
});

router.post("/verifyNumber", async (req, res) => {
  const { mobileNumber, otp } = req.body;
  try {
    console.log("req.body from verifyNumber", req.body);

    const existingOtp = await OtpStore.findOne({ mobileNumber });
    console.log("existingOtp from verifyNumber", existingOtp);

    if (!existingOtp) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid mobile number." });
    }

    if (existingOtp.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP." });
    }

    console.log("existingOtp from verifyNumber", existingOtp);

    const currentTime = new Date();

    if (currentTime > existingOtp.createdAt + 300) {
      return res
        .status(400)
        .json({ success: false, message: "OTP has expired." });
    }
    const deleteData = await OtpStore.deleteOne({ mobileNumber });
    return res
      .status(200)
      .json({ success: true, message: "OTP verification successful." });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify OTP.",
      error: error.message,
    });
  }
});

router.post("/deleteUserByNumber", async (req, res) => {
  const { fatherContactNumber } = req.body;

  const deleteEnquiryByPhoneNumber = await User.deleteMany({
    fatherContactNumber,
  });

  console.log("deleteEnquiryByPhoneNumber", deleteEnquiryByPhoneNumber);
  return res.status(200).json({ message: "Successfully deleted" });
});

router.post("/changeProgram", async (req, res) => {
  const changeProgram = await User.updateMany(
    { courseOfIntrested: "11th Engineering" },
    // { program: "NEET(UG)"},
    // { program: "Medical (XI -XII)" , courseOfIntrested : "XII Passed" },
    // { $set: { program: "JEE(Main & Adv)" } }
    { $set: { courseOfIntrested: "XI Engineering" } }
  );

  console.log(`${changeProgram.modifiedCount} documents updated.`);

  return res.status(200).json({ data: changeProgram });
});

router.post("/fetchAllData", async (req, res) => {
  const allData = await User.find();

  res.status(200).json({ Data: allData });
});

router.post("/fetchDataByDateRange", async (req, res) => {
  try {
    const { startingDate, lastDate } = req.body;

    console.log("startingDate, lastDate", startingDate, lastDate);

    if (!startingDate || !lastDate) {
      return res
        .status(400)
        .json({ error: "Both startingDate and lastDate are required." });
    }

    const fromDate = new Date(startingDate).toISOString();
    console.log("FromDate", fromDate);
    const toDate = new Date(lastDate);
    console.log("toDate", toDate);
    toDate.setHours(23, 59, 59, 999);
    const toDateISO = toDate.toISOString();
    console.log("toDateISO", toDateISO);

    const allData = await User.find({
      createdAt: {
        $gte: fromDate,
        $lte: toDateISO,
      },
    });

    console.log("allData", allData);
    return res.status(200).json({ data: allData });
  } catch (error) {
    console.error("Error fetching data by date range:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/zoho/leads", async (req, res) => {
  console.log("This is working /zoho/leads ", req.body);
  try {
    const url = "https://www.zohoapis.com/crm/v7/Leads";

    console.log("Request Body:", req.body);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Zoho-oauthtoken 1000.a3822e95e6e775ea8cddb677178f90b5.6eb6080e96571a9fdbda84a35a3065ec",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    console.log("Zoho Response Data:", data);
    res
      .status(200)
      .json({ data: data, message: "Lead created successfully in Zoho CRM" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

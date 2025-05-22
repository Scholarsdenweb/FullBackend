const axios = require("axios");
const User = require("../models/UserModel");
const Admission = require("../models/Admission");

// Replace with your actual Fast2SMS API key

async function sendSDATReminder(userId) {
  const user = await User.findById(userId);

  console.log("users from sendSDATReminder", user);
  if (!user || user.sdatSubmitted) return;

  const now = new Date();
  const daysSinceEnquiry = Math.floor(
    (now - new Date(user.enquiryDate)) / (1000 * 60 * 60 * 24)
  );

  const reminderMessages = [
    "Reminder 1: Please complete your SDAT form.",
    "Reminder 2: Don't forget to fill your SDAT form.",
    "Reminder 3: Still waiting for your SDAT form submission.",
    "Reminder 4: Final reminder – complete your SDAT form now.",
  ];

  // const shouldSend =
  //   (user.reminderCount === 0 && daysSinceEnquiry >= 2) ||
  //   (user.reminderCount === 1 && daysSinceEnquiry >= 4) ||
  //   (user.reminderCount === 2 && daysSinceEnquiry >= 6) ||
  //   (user.reminderCount === 3 && daysSinceEnquiry >= 8);

  // if (shouldSend && user.reminderCount < 4) {
  const message = reminderMessages[user.reminderCount];

  try {
    // Send SMS

    // const findAdmission = await Admission.findOne({ acknowledgementNumber });

    // console.log("findAdmission for approval", findAdmission);

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
        variables_values: `${"1233"}|`,
        flash: 0,
        numbers: `${"9719706242"}`,
      },
    };
    let otpStoreData;
    // Make the API request to Fast2SMS
    const response = await axios.post(options.url, options.data, {
      headers: options.headers,
    });

    console.log("response of sms ", response.data);

    // const response = await axios.post(
    //   "https://www.fast2sms.com/dev/bulkV2",
    //   {
    //     route: "v3",
    //     sender_id: "SCHDEN", // or your approved sender ID
    //     message: message,
    //     language: "english",
    //     flash: 0,
    //     numbers: user.fatherContactNumber,
    //   },
    //   {
    //     headers: {
    //       authorization: FAST2SMS_API_KEY,
    //       "Content-Type": "application/json",
    //     },
    //   }
    // );

    user.reminderCount += 1;
    await user.save();

    console.log("response", response);
  } catch (error) {
    console.error("SMS sending failed:", error);
  }
  // }
}

module.exports = sendSDATReminder;

const cron = require("node-cron");
const User = require("../models/UserModel");
const sendSDATReminder = require("../utils/sendSDATReminder");

// Run every day at 10:00 AM
cron.schedule("*/10 * * * * *", async () => {
  console.log("Running scheduled SDAT reminder job...");

  try {
    const users = await User.find({ fatherContactNumber: "9719706242" });


    console.log("users from cron schedule", users);

    for (const user of users) {
      await sendSDATReminder(user._id);
    }

    console.log("Reminder check completed.");
  } catch (error) {
    console.error("Cron job error:", error.message);
  }
});

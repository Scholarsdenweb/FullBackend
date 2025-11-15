// scripts/migrateToRegistrationCounters.js
const mongoose = require("mongoose");
const RegistrationCounter = require("../../models/RegistrationCounter"); // Updated import
const BatchRelatedDetails = require("../../models/form/BatchRelatedDetails");



require("dotenv").config(); // Load environment variables


async function migrateToRegistrationCounters() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Starting migration to RegistrationCounter...");

    const BatchRelatedDetails = mongoose.model("BatchRelatedDetails");

    const counts = await BatchRelatedDetails.aggregate([
      {
        $lookup: {
          from: "students",
          localField: "student_id",
          foreignField: "_id",
          as: "studentDetails",
        },
      },
      {
        $unwind: "$studentDetails",
      },
      {
        $match: {
          "studentDetails.StudentsId": { $exists: true, $ne: null },
        },
      },
      {
        $addFields: {
          year: {
            $toInt: { $substr: ["$studentDetails.StudentsId", 0, 4] },
          },
        },
      },
      {
        $group: {
          _id: {
            year: "$year",
            class: "$classForAdmission",
          },
          count: { $sum: 1 },
          lastStudentsId: { $max: "$studentDetails.StudentsId" },
        },
      },
      {
        $sort: { "_id.year": -1, "_id.class": 1 }
      }
    ]);

    console.log(`Found ${counts.length} class-year combinations`);

    for (const item of counts) {
      await RegistrationCounter.findOneAndUpdate(
        {
          year: item._id.year,
          classForAdmission: item._id.class,
        },
        {
          count: item.count,
          lastStudentsId: item.lastStudentsId,
        },
        { upsert: true }
      );

      console.log(
        `✓ ${item._id.year} - ${item._id.class}: ${item.count} students (Last ID: ${item.lastStudentsId})`
      );
    }

    console.log("\n✅ Migration completed successfully!");
    
    // Show summary
    const summary = await RegistrationCounter.aggregate([
      {
        $group: {
          _id: "$year",
          totalStudents: { $sum: "$count" },
          classes: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    console.log("\n📊 Summary:");
    summary.forEach(s => {
      console.log(`Year ${s._id}: ${s.totalStudents} students across ${s.classes} classes`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrateToRegistrationCounters();
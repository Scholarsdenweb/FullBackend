// scripts/migrateToRegistrationCounters.js
const mongoose = require("mongoose");
const RegistrationCounter = require("../../models/RegistrationCounter"); // Updated import
const BatchRelatedDetails = require("../../models/form/BatchRelatedDetails");



require("dotenv").config(); // Load environment variables

const PREVIOUS_CLASS_MAP = {
  II: "I",
  III: "II",
  IV: "III",
  V: "IV",
  VI: "V",
  VII: "VI",
  VIII: "VII",
  IX: "VIII",
  X: "IX",
  "XI Engineering": "X",
  "XII Engineering": "XI Engineering",
  "XII Passed Engineering": "XII Engineering",
  "XI Medical": "X",
  "XII Medical": "XI Medical",
  "XII Passed Medical": "XII Medical",
};

const getScholarshipClassFromAdmissionClass = (admissionClass) => {
  return PREVIOUS_CLASS_MAP[admissionClass] || admissionClass;
};

const getRegistrationCounterClass = (className) => {
  if (className === "XI Engineering" || className === "XI Medical") return "XI";
  if (className === "XII Engineering" || className === "XII Medical") return "XII";
  return className;
};

const getRegistrationCounterClassFromAdmissionClass = (admissionClass) => {
  return getRegistrationCounterClass(getScholarshipClassFromAdmissionClass(admissionClass));
};


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

    const counterMap = new Map();
    counts.forEach((item) => {
      const counterClass = getRegistrationCounterClassFromAdmissionClass(item._id.class);
      const key = `${item._id.year}:${counterClass}`;
      const current = counterMap.get(key) || {
        year: item._id.year,
        classForAdmission: counterClass,
        count: 0,
        lastStudentsId: item.lastStudentsId,
      };

      current.count += item.count;
      if (String(item.lastStudentsId || "") > String(current.lastStudentsId || "")) {
        current.lastStudentsId = item.lastStudentsId;
      }

      counterMap.set(key, current);
    });

    for (const item of counterMap.values()) {
      await RegistrationCounter.findOneAndUpdate(
        {
          year: item.year,
          classForAdmission: item.classForAdmission,
        },
        {
          count: item.count,
          lastStudentsId: item.lastStudentsId,
        },
        { upsert: true }
      );

      console.log(
        `✓ ${item.year} - ${item.classForAdmission}: ${item.count} students (Last ID: ${item.lastStudentsId})`
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

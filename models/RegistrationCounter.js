// models/RegistrationCounter.js
const mongoose = require("mongoose");

const registrationCounterSchema = new mongoose.Schema(
  {
    year: { 
      type: Number, 
      required: true,
      index: true 
    },
    classForAdmission: { 
      type: String, 
      required: true,
      index: true 
    },
    count: { 
      type: Number, 
      default: 0,
      min: 0 
    },
    lastStudentsId: { 
      type: String 
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index - year + classForAdmission is unique
registrationCounterSchema.index(
  { year: 1, classForAdmission: 1 }, 
  { unique: true }
);

// Static method to get next count atomically
registrationCounterSchema.statics.getNextCount = async function (
  year,
  classForAdmission,
  session
) {
  const counter = await this.findOneAndUpdate(
    { year, classForAdmission },
    { $inc: { count: 1 } },
    {
      new: true,
      upsert: true,
      session,
      setDefaultsOnInsert: true,
    }
  );

  return counter.count;
};

// Static method to get current count
registrationCounterSchema.statics.getCurrentCount = async function (
  year,
  classForAdmission
) {
  const counter = await this.findOne({ year, classForAdmission });
  return counter ? counter.count : 0;
};

// Static method to get all counters for a year
registrationCounterSchema.statics.getYearCounters = async function (year) {
  return await this.find({ year }).sort({ classForAdmission: 1 });
};

// Static method to reset counter
registrationCounterSchema.statics.resetCounter = async function (
  year,
  classForAdmission
) {
  return await this.findOneAndUpdate(
    { year, classForAdmission },
    { count: 0, lastStudentsId: null },
    { new: true, upsert: true }
  );
};

const RegistrationCounter = mongoose.model("RegistrationCounter", registrationCounterSchema);
module.exports = RegistrationCounter;
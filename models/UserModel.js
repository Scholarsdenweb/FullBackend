const mongoose = require("mongoose");
const Counter = require("./Counter");

const UserSchema = new mongoose.Schema(
  {
    enquiryNumber: {
      type: String,
      unique: true,
    },
    studentName: {
      type: String,
    },
    studentContactNumber: {
      type: String,
    },
    email: {
      type: String,
    },
    program: {
      type: String,
    },
    courseOfIntrested: {
      type: String,
    },
    schoolName: {
      type: String,
    },
    fatherName: {
      type: String,
    },
    fatherOccupations: {
      type: String,
    },
    fatherContactNumber: {
      type: String,
      required: true,
    },
    city: {
      type: String,
    },
    state: {
      type: String,
    },
    howToKnow: {
      type: String,
    },
    remarks: {
      type: String,
    },
    // intime: {
    //     type: String,
    // },
    enquiryTakenBy: {
      type: String,
    },
    // brochureGiven: {
    //     type: String,
    // },
    // createdAt: {
    //   type: "String",
    //   default: () => new Date().toISOString(),
    // },
    // updatedAt: {
    //   type: "String",
    //   default: () => new Date().toISOString(),
    // },
  },
  {
    timestamps: true,
  }
);

// UserSchema.pre("save", function (next) {
//   this.updatedAt = new Date().toISOString();
//   next();
// });


UserSchema.pre("save", async function (next) {
  const user = this;
  // user.updatedAt = new Date().toISOString();

  if (user.isNew) {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const dateKey = `${yy}${mm}${dd}`; // For Counter ID

    try {
      const counter = await Counter.findByIdAndUpdate(
        dateKey,
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      const seqStr = String(counter.seq).padStart(3, "0");
      user.enquiryNumber = `${dateKey}${seqStr}`;
    } catch (err) {
      return next(err);
    }
  }

  next();
});

const User = mongoose.model("User", UserSchema);

module.exports = User;

const mongoose = require("mongoose");
const Schema = mongoose.Schema;
// const Task = require("./task");
const EmployeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  employeeId: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  role: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  leaveStatus: {
    data: {
      type: Date,
    },
    reson:{
      type: String
    },
    status: {
      type: String,
      default: "pending",
    },
  },
  task: [
    {
      type: Schema.Types.ObjectId,
      ref: "Task",
    },
  ],
  profile: {
    type: String,
  },
  resetToken:{
    type: String
  },
resetTokenExpiry:{
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Employee = mongoose.model("Employee", EmployeeSchema);
module.exports = Employee;

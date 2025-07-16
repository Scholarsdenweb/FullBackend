const express = require("express");
const router = express.Router();
const Attendence = require("../models/Attendence");
const Employee = require("../models/Employee");
const { verifyToken, checkRole } = require("../middleware/authentication");

router.get("/:employeeId", async (req, res) => {
  const { employeeId } = req.params;
  try {
    const attendence = await Attendence.find({ employeeId });
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).send("Employee not found");
    }
    res.send(attendence);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.post("/addAttendence/:employeeId",verifyToken, checkRole(["hr"]), async (req, res) => {
  const { employeeId } = req.params;
  const { date, status, checkInTime, employee } = req.body;
  console.log("employeeId", employee)
  try {
    const attendence = await Attendence.findOne({ date, employeeId});

    if (attendence) {
      return res.status(400).send("Attendence already exists");
    }
    const newAttendence = new Attendence({
      employeeId,
      date,
      status,
      checkInTime
    });
    const savedAttendence = await newAttendence.save();
    res.send(savedAttendence);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.post("/editAttendence/:employeeId", async (req, res) => {
  const { employeeId } = req.params;
  const { date, status, checkInTime, checkOutTime, hoursWorked } = req.body;
  try {
    const attendence = await Attendence.findOne({ date, employeeId });
    if (!attendence) {
      return res.status(404).send("Attendence not found");
    }
    attendence.date = date || attendence.date;
    attendence.status = status || attendence.status;
    attendence.checkInTime = checkInTime || attendence.checkInTime;
    attendence.checkOutTime = checkOutTime || attendence.checkOutTime;
    attendence.hoursWorked = hoursWorked || attendence.hoursWorked;
    const updatedAttendence = await attendence.save();
    res.send(updatedAttendence);
  } catch (error) {
    res.status(500).send(error);
  }
});


router.delete("/deleteAttendence/:employeeId", async (req, res) => {
  const { employeeId } = req.params;
  const {date} = req.body;
  try {
    const deletedAttendence = await Attendence.findOneAndDelete({employeeId},{date:date});

    if (!deletedAttendence) {
      return res.status(404).send("Attendence not found");
    }
    res.send({ message: "Attendence deleted successfully" });
  } catch (error) {
    res.status(500).send(error);
  }
});


module.exports = router;

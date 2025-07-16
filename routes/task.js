const express = require("express");
const router = express.Router();

const { verifyToken, checkRole } = require("../middleware/authentication");
const Task = require("../models/Task");

router.post("/bulk", verifyToken, checkRole(["hr"]), async (req, res) => {
  try {
    const {tasksIdList} = req.body;
    const tasks = await Task.find({ _id: { $in: tasksIdList } });
    if (!tasks || tasks.length === 0) {
      return res.status(404).send("No tasks found");
    }
    res.status(200).send(tasks);
  } catch (error) {
    res.status(500).send(error);
  }
});

router.get("/", verifyToken, checkRole(["hr"]), async (req, res) => {
    try {
      const tasks = await Task.find();
      if (!tasks || tasks.length === 0) {
        return res.status(404).send("No tasks found");
      }
      res.status(200).send(tasks);
    } catch (error) {
      res.status(500).send(error);
    }
  });

router.post(
  "/addTask",
  verifyToken,
  checkRole(["hr", "employee"]),
  async (req, res) => {
    const { taskName, taskDescription, taskStatus } = req.body;

    try {
      // const task = await Task.findOne({ _id: id });
      // if (task) {
      //   return res.status(400).send("Task already exists");
      // }

      const newTask = new Task({
        taskName,
        taskDescription,
        taskStatus,
      });

      const savedTask = await newTask.save();
      res.status(200).send(savedTask);
    } catch (error) {
      console.log(error);
    }
  }
);


router.patch("/update/:id", verifyToken, checkRole(["hr"]), async (req, res) => {
  const { id } = req.params;
  const { taskName, taskDescription, taskStatus } = req.body;

  try {
    const updatedTask = await Task.findByIdAndUpdate(
      id,
      { taskName, taskDescription, taskStatus },
    );
    if (!updatedTask) {
      return res.status(404).send("Task not found");
    }
    res.status(200).send(updatedTask);
  } catch (error) {
    res.status(500).send(error);
  }
});


router.delete("/delete/:id", verifyToken, checkRole(["hr"]), async (req, res) => {
  const { id } = req.params;

  try {
    const deletedTask = await Task.findByIdAndDelete(id);
    if (!deletedTask) {
      return res.status(404).send("Task not found");
    }
    res.status(200).send({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).send(error);
  }
});

module.exports = router;

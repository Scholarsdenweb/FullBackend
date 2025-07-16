const express = require("express");

const router = express.Router();

const  ExamList = require("../models/ExamsList");

router.get("/getExamList", async (req, res) => {
  try {
    const allExams = ExamList.find({});
    if (allExams.lenght() === 0) {
      return req.status(400).json({ message: "No Exam Type Found" });
    }

    res.status(200).json({allExams});
  } catch (e) {
    console.log(e);
    res.status(500).send("Server Error");
  }
});
router.post("/addExam", async (req, res) => {

    const { examName } = req.body;

    console.log("EXAMlIST", examName);
    if (!examName) {
      return res.status(400).json({ message: "Exam Type is required" });
    }
  try {
    const allExams = new ExamList({
        examName: examName,
    });
    if (allExams.lenght() === 0) {
      return req.status(400).json({ message: "No Exam Type Found" });
    }

    res.status(200).json({allExams});
  } catch (e) {
    console.log(e);
    res.status(500).send("Server Error");
  }
});


router.delete("/deleteExam", async (req, res) => {
  const { examName } = req.body;
  try {
    const deletedExam = await ExamList.findOneAndDelete(examName);
 
    res.status(200).json({ message: "Exam Type deleted successfully"  });
  } catch (e) {
    console.log(e);
    res.status(500).send("Server Error");
  }
});

router.patch("/updateExam", async (req, res) => {
  const { currentExamName, updateExamDate } = req.body;
  try {
    const updateExamDate = await ExamList.findOneAndUpdate({examName}, {examName: updateExamDate}, {new: true});
    if (!updateExamDate) {
      return res.status(400).json({ message: "No Exam Type Found" });
    }

 
   res.status(200).json({ message: "Exam Type updated successfully", updateExamDate });
  } catch (e) {
    console.log(e);
    res.status(500).send("Server Error");
  }
});

module.exports = router;

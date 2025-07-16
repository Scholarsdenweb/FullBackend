const express = require("express");

const BoardList = require("../models/BoardList");

const router = express.Router();

router.get("/", async (req, res) => {
  console.log("hello");
const boards = await BoardList.find().sort({ _id: 1 });
  if (!boards || boards.length === 0) {
    return res.status(404).send("No boards found");
  }
  res.status(200).send(boards);
});

router.post("/addBoard", async (req, res) => {
  const { boardName } = req.body;
  try {
    const board = await BoardList.findOne({ boardName });
    if (board) {
      return res.status(400).send("Board already exists");
    }
    const newBoard = new Board({
      boardName,
    });

    const savedBoard = await newBoard.save();

    res.status(200).send(savedBoard);
  } catch (error) {
    res.status(500).send(error);
  }
});


// List of all boards
const boardNames = [
  // National-Level Boards
  "Central Board of Secondary Education (CBSE)",
  "Council for the Indian School Certificate Examinations (CISCE) - ICSE",
  "Council for the Indian School Certificate Examinations (CISCE) - ISC",
  "Uttar Pradesh Board of High School and Intermediate Education (UPMSP)",
  "Uttarakhand Board of School Education (UBSE)",
  "Bihar School Examination Board (BSEB)",
  "Delhi Board of School Education (DBSE)",
  "National Institute of Open Schooling (NIOS)",



  // State-Level Boards
  "Andhra Pradesh Board of Secondary Education (BSEAP)",
  "Assam Board of Secondary Education (SEBA)",
  "Chhattisgarh Board of Secondary Education (CGBSE)",
  "Goa Board of Secondary and Higher Secondary Education (GBSHSE)",
  "Gujarat Secondary and Higher Secondary Education Board (GSEB)",
  "Haryana Board of School Education (HBSE)",
  "Himachal Pradesh Board of School Education (HPBOSE)",
  "Jammu and Kashmir Board of School Education (JKBOSE)",
  "Jharkhand Academic Council (JAC)",
  "Karnataka Secondary Education Examination Board (KSEEB)",
  "Kerala Board of Public Examinations (KBPE)",
  "Madhya Pradesh Board of Secondary Education (MPBSE)",
  "Maharashtra State Board of Secondary and Higher Secondary Education (MSBSHSE)",
  "Manipur Board of Secondary Education (BSEM)",
  "Meghalaya Board of School Education (MBOSE)",
  "Mizoram Board of School Education (MBSE)",
  "Nagaland Board of School Education (NBSE)",
  "Odisha Board of Secondary Education (BSE Odisha)",
  "Punjab School Education Board (PSEB)",
  "Rajasthan Board of Secondary Education (RBSE/BSER)",
  "Tamil Nadu Board of Secondary Education (TNBSE)",
  "Telangana State Board of Intermediate Education (TSBIE)",
  "Tripura Board of Secondary Education (TBSE)",
  
  "West Bengal Board of Secondary Education (WBBSE)",
  "West Bengal Council of Higher Secondary Education (WBCHSE)",


];

// API to insert all boards
router.post("/insertBoards", async (req, res) => {
  try {
    // Insert all boards into MongoDB
    await BoardList.insertMany(boardNames.map(name => ({ name })));
    res.status(200).json({ message: "Boards inserted successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error inserting boards", error });
  }
});




module.exports = router;

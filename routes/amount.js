const express = require("express");
const { addAmount, getAmount, updateAmount } = require("../controllers/Amount");
const router = express.Router();


router.get("/", getAmount);
// router.post("/", addAmount);
router.patch("/", updateAmount);



module.exports = router;

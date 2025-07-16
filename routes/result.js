const express = require("express");

const Result = require("../models/Result");
const router = express.Router();




router.get("/", async (req, res) => {
    console.log("hello");
    const { page = 1, limit = 20, date } = req.query;
    const query = date ? { examDate: date } : {}; // Filter by date if provided


    console.log("query", query);

    console.log("page", page);
    console.log("limit", limit);

    try {
        const results = await Result.find(query)
            .sort({ examDate: -1 }) // Sort by date (latest first)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.json(results);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});



module.exports = router;

const express = require("express");
const { verifyToken, checkRole } = require("../middleware/authentication");
const Candidate = require("../models/Candidate");
const router = express.Router();

// Get all candidates
router.get("/", verifyToken, checkRole(["hr"]), async (req, res) => {
    try {
        const candidates = await Candidate.find();
        if (!candidates || candidates.length === 0) {
            return res.status(404).send("No candidates found");
        }
        res.status(200).send(candidates);
    } catch (error) {
        res.status(500).send(error);
    }
});

// Add a new candidate
router.post("/addCandidate", verifyToken, checkRole(["hr"]), async (req, res) => {
    const { name, email, address, phone } = req.body;

    try {
        const candidate = await Candidate.findOne({ email });
        if (candidate) {
            return res.status(400).send("Candidate already exists");
        }

        const newCandidate = new Candidate({
            name,
            email,
            address,
            phone,
        });

        await newCandidate.save();

        res.status(201).send({
            candidate: {
                name,
                email,
                address,
                phone,
            },
        });
    } catch (error) {
        res.status(500).send(error);
    }
});

// Edit a candidate by ID
router.patch("/edit/:id", verifyToken, checkRole(["hr"]), async (req, res) => {
    const { id } = req.params;
    const { name, email, address, phone, interviewDate, interviewerAssigned } = req.body;

    try {
        const candidate = await Candidate.findById(id);
        if (!candidate) {
            return res.status(404).send("Candidate not found");
        }

        // Update fields if provided
        candidate.name = name || candidate.name;
        candidate.email = email || candidate.email;
        candidate.address = address || candidate.address;
        candidate.phone = phone || candidate.phone;
        candidate.interviewDate = interviewDate || candidate.interviewDate;
        candidate.interviewerAssigned = interviewerAssigned || candidate.interviewerAssigned;

        const updatedCandidate = await candidate.save();
        res.status(200).send(updatedCandidate);
    } catch (error) {
        res.status(500).send(error);
    }
});

// Delete a candidate by ID
router.delete("/delete/:id", verifyToken, checkRole(["hr"]), async (req, res) => {
    const { id } = req.params;

    try {
        const candidate = await Candidate.findByIdAndDelete(id);
        if (!candidate) {
            return res.status(404).send("Candidate not found");
        }
        res.status(200).send(candidate);
    } catch (error) {
        res.status(500).send(error);
    }
});





module.exports = router;

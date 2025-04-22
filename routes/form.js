const express = require("express");
const router = express.Router();
const { verifyToken, verifyTokenForRegistration } = require("../middleware/authentication");
const {getForm,
  addForm,
  updateForm,
  deleteForm,
} = require("../controllers/formController");

// Import Models
const BasicDetails = require("../models/form/BasicDetails");
const BatchRelatedDetails = require("../models/form/BatchRelatedDetails");
const EducationalDetails = require("../models/form/EducationalDetails");
const Payment = require("../models/form/Payment");
const FamilyDetails = require("../models/form/FamilyDetails");

// Dynamic Routes
const forms = [
  { path: "basicDetails", model: BasicDetails },
  { path: "batchRelatedDetails", model: BatchRelatedDetails },
  { path: "educationalDetails", model: EducationalDetails },
  { path: "payment", model: Payment },
  { path: "familyDetails", model: FamilyDetails },
];

// Add Routes Dynamically
forms.forEach((form) => {
  // Add Form

  router.get(`/${form.path}/getForm`, verifyTokenForRegistration("Student"), (req, res) =>
    getForm(form.model, req, res)
  )
  


  router.post(`/${form.path}/addForm`, verifyTokenForRegistration("Student"), (req, res) =>
    addForm(form.model, req, res)
  );

  // Update Form
  router.patch(`/${form.path}/updateForm`, verifyTokenForRegistration("Student"), (req, res) =>
    updateForm(form.model, req, res)
  );

  // Delete Form
  router.delete(`/${form.path}/deleteForm`, verifyTokenForRegistration("Student"), (req, res) =>
    deleteForm(form.model, req, res)
  );
});

router.get("/getExamDetails", verifyTokenForRegistration("Student"), async (req, res) => {
  try {
    const form = await BasicDetails.find({ student_id: req.user.id }).select("-gender -dob -created_at -student_id ");
    console.log("form", form);
    if (!form) return res.status(404).json({ message: "Form not found" });
    return res.status(200).json(form);
  } catch (error) {
    return res.status(500).json({ message: "Error getting form", error });
  }
});
router.post("/addAdmitCard", verifyToken("hr"), async (req, res) => {
  const {email, url} = req.body;
  try{
    const studentBasicDetails = await BasicDetails.findOne({email});
    if(!studentBasicDetails){
      res.status(404).json({message: "Student not found"});
    } 
    studentBasicDetails.admitCard = url;
    await studentBasicDetails.save();
    res.status(200).json("Admit card added successfully");
  }catch(error){
    console.log("error", error);
  }
})

module.exports = router;

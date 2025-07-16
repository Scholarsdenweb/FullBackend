const BatchRelatedDetails = require("../models/form/BatchRelatedDetails");
const Students = require("../models/Student");

// const batchDetails = require("..")



const getForm = async (Model, req, res) => {
  try {
    const form = await Model.find({ student_id: req.user.id }).select("-__v -student_id -created_at -updated_at -_id ");
    if (!form) return res.status(404).json({ message: "Form not found" });
    return res.status(200).json(form);
  } catch (error) {
    return res.status(500).json({ message: "Error getting form", error });
  }
}

const addForm = async (Model, req, res) => {
  try {

    console.log("Form", req.user.id);

    let form = await Model.findOne({ student_id: req.user.id });
    console.log("form form backend", form);
    if (form) return res.status(400).json({ message: "Form already exists" });
    form = new Model({ student_id: req.user.id, ...req.body });
    console.log("form added", form);
    const result = await form.save();
    console.log("result added", result);



    console.log("MOdel from addForm", Model.modelName);

    if (Model.modelName === "FamilyDetails") {
      console.log("FamilyDetails is working");
      const batchDetails = await BatchRelatedDetails.findOne({
        student_id: req.user._id,
      });
      if (!batchDetails) {
        return res
          .status(404)
          .json({ success: false, message: "Batch Details not found" });
      }

      const newStudentsId = await Students.allocateStudentsId(
        batchDetails.classForAdmission
      );
      console.log("Allocated StudentsId:", newStudentsId);



      // Update the student document
      await Students.findByIdAndUpdate(
        req.user._id,
        { StudentsId: newStudentsId },
        { new: true }
      );

    }



    return res.status(200).json(result);
  } catch (error) {
    console.log("error in addForm", error);
    return res.status(500).json({ message: "Error adding form", error });
  }
};

const updateForm = async (Model, req, res) => {
  try {
    const form = await Model.findOne({ student_id: req.user.id });
    console.log("form updated form", form);
    if (!form) return res.status(404).json({ message: "Form not found" });

    Object.assign(form, req.body); // Dynamically update fields
    const result = await form.save();



    
    console.log("MOdel from addForm", Model.modelName);

    if (Model.modelName === "FamilyDetails") {
      console.log("FamilyDetails is working");
      const batchDetails = await BatchRelatedDetails.findOne({
        student_id: req.user._id,
      });
      if (!batchDetails) {
        return res
          .status(404)
          .json({ success: false, message: "Batch Details not found" });
      }

      const newStudentsId = await Students.allocateStudentsId(
        batchDetails.classForAdmission
      );
      console.log("Allocated StudentsId:", newStudentsId);



      // Update the student document
      await Students.findByIdAndUpdate(
        req.user._id,
        { StudentsId: newStudentsId },
        { new: true }
      );

    }





    return res.status(200).json(result);
  } catch (error) {
    console.log("error from familyDetails", error);
    return res.status(500).json({ message: "Error updating form", error });
  }
};

const deleteForm = async (Model, req, res) => {
  try {
    const form = await Model.findOneAndDelete({ student_id: req.user.id });
    if (!form) return res.status(404).json({ message: "Form not found" });

    return res.status(200).json({ message: "Form deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Error deleting form", error });
  }
};

module.exports = { getForm, addForm, updateForm, deleteForm };




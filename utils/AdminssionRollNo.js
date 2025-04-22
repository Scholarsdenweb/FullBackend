const ClassStrength = require("../models/ClassStrength");
const TotalStudents = require("../models/TotalStudents");

const admissionRollNo = async (studentClass, program) => {
  console.log("admissionRollNo", studentClass, program);

  try {
    const currentYear = new Date().getFullYear();

    let classCode;
    if (studentClass >= 6 && studentClass <= 10) {
      classCode = studentClass;
    } else {
      const programCodes = {
        "engineering": { XI: 11, XII: 12, "XII Pass": 13 },
        "medical": { XI: 14, XII: 15, "XII Pass": 16 },
      };


      const convertToNumber = (num) => {
        const integerNumerals = {
          VI: "06",
          VII : "07",
          VIII : "08",
          IX : "09",
          X : "10",
      
        };
        return integerNumerals[num] || num;
      };
    

      console.log("PROGRAM cODE", programCodes);

      console.log(
        " programCodes[program.toLowerCase()]?.[studentClass",
        programCodes[program.toLowerCase()]?.[studentClass]
      );
      classCode = programCodes[program.toLowerCase()]?.[studentClass] || convertToNumber(studentClass);
    }

    const classStrength = await ClassStrength.findOneAndUpdate(
      { class_code: classCode },
      { $inc: { student_count: 1 } },
      { new: true, upsert: true }
    );

    const totalStudentsCount = await TotalStudents.findOneAndUpdate(
      {},
      { $inc: { total_count: 1 } },
      { new: true, upsert: true }
    );

    const totalStudentInClass = String(classStrength.student_count).padStart(
      3,
      "0"
    );
    const rollNo = `${currentYear}${classCode}${totalStudentInClass}`;

    console.log("Updated Class Strength:", classStrength);
    console.log("Updated Class Strength Count:", classStrength.student_count);
    console.log("Updated Total Students:", totalStudentsCount);
    console.log("Generated Roll No:", rollNo);

    return rollNo;
  } catch (error) {
    console.error("Error generating admission roll number:", error);
    throw error;
  }
};

const enrollmentNumberGenerator = async () => {
  try {
    const totalStudents = await TotalStudents.findOneAndUpdate(
      {},
      { $inc: { total_students: 1 } },
      { new: true, upsert: true }
    );

    const currentYear = new Date().getFullYear().toString().slice(-2);

    const totalStudent = String(totalStudents.total_count).padStart(5, "0");

    const enrollmentNumber = `SD${currentYear}${totalStudent}`;
    console.log("enrollmentNumber", enrollmentNumber);
    return enrollmentNumber;
  } catch (error) {
    console.error("Error generating enrollment number:", error);
    throw error;
  }
};

module.exports = { admissionRollNo, enrollmentNumberGenerator };

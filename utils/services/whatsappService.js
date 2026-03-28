// services/whatsappService.js
// WhatsApp integration for sending admit cards

const axios = require("axios");
const Students = require("../../models/Student");
const ExamDate = require("../../models/ExamDate");
const BasicDetails = require("../../models/form/BasicDetails");
const Amount = require("../../models/Amount");
const Payment = require("../../models/form/Payment");




const sendAdmitCardViaWATI = async (studentData) => {
  try {
    console.log("Inside sendAdmitCardViaWATI");

    const whatsappApi = process.env.WATI_API_URL;
    // const watiToken = process.env.WATI_API_TOKEN;

    if (!whatsappApi) {
      console.error("WATI_API_URL is missing in environment variables");
      return { success: false, error: "WATI API URL missing" };
    }

    // Fetch required data
    const examDate = await BasicDetails.findOne({
      student_id: studentData._id,
    });
    const paidAmount = await Payment.findOne({ studentId: studentData._id });

    console.log("Exam Data:", examDate);
    console.log("Payment Data:", paidAmount);

    if (!studentData?.contactNumber) {
      return { success: false, error: "Student contact number missing" };
    }

    const formattedNumber = `91${studentData.contactNumber}`;

    // Prepare file url and name
    const fileUrl = studentData?.admitCard;
    const fileName = `Admit_Card_${studentData?.studentName.replace(
      /\s+/g,
      "_"
    )}.pdf`;

    if (!fileUrl) {
      return { success: false, error: "Admit card URL missing" };
    }

    const studentName = studentData?.studentName || "Student";

    console.log("Sending WhatsApp message...");
    console.log("API URL:", whatsappApi);

    let result = {
      status: "failed",
      responseCode: null,
      error: null,
    };

    try {
      const response = await axios.post(
        "https://backend.api-wa.co/campaign/myoperator/api/v2",
        {
          apiKey: whatsappApi,
          campaignName: "Admit_Card_OF_SDAt",
          destination: formattedNumber,
          userName: "Scholars Den",
          templateParams: [
            studentName,
            studentData.StudentsId,
            examDate?.examDate || "Not Specified",
            paidAmount?.payment_amount
              ? `₹${paidAmount.payment_amount}`
              : "Not Specified",
          ],
          source: "new-landing-page-form",
          media: {
            url: fileUrl,
            filename: fileName,
          },
        }
      );

      console.log("WhatsApp message sent:", response.data);

      result.status = "sent";
      result.responseCode = response.status;

      return { success: true, data: response.data };
    } catch (error) {
      console.error(
        "Error sending WhatsApp:",
        error?.response?.data || error.message
      );

      result.error = error?.response?.data || error.message;

      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error("Unexpected error in sendAdmitCardViaWATI:", error);
    return { success: false, error: error.message };
  }
};

// Option 3: Using WhatsApp Business API with Document




const sendAdmitCardNotification = async (StudentsId) => {
  try {
    console.log(
      "Step 2: Entering sendAdmitCardNotification for StudentsId:",
      StudentsId
    );

    // Validate input
    if (!StudentsId || typeof StudentsId !== "string") {
      console.error("Invalid StudentsId provided:", StudentsId);
      return {
        success: false,
        error: "Invalid StudentsId provided",
      };
    }

    // Fetch student data
    const studentData = await Students.findOne({ StudentsId }).lean();

    // Check if student exists
    if (!studentData) {
      console.log("Student not found with StudentsId:", StudentsId);
      return {
        success: false,
        error: "Student not found",
      };
    }

    console.log("Student found:", {
      StudentsId: studentData.StudentsId,
      studentName: studentData.studentName,
      contactNumber: studentData.contactNumber,
    });

    // Check if admit card was already sent
    if (studentData?.messageStatus?.admitCardSend) {
      console.log("Admit card already sent to student:", StudentsId);
      return {
        success: true,
        message: "Admit card was already sent",
        alreadySent: true,
        sentDate: studentData.messageStatus.admitCardSentDate,
      };
    }

    // Validate required fields for sending admit card
    if (!studentData.contactNumber) {
      console.error("Student missing contact number:", StudentsId);
      return {
        success: false,
        error: "Student contact number not found",
      };
    }

    if (!studentData.admitCard) {
      console.error("Student missing admit card:", StudentsId);
      return {
        success: false,
        error: "Admit card not generated for this student",
      };
    }

    // Send admit card via WATI
    console.log("Sending admit card via WATI...");
    const result = await sendAdmitCardViaWATI(studentData);

    console.log("Result from sendAdmitCardViaWATI:", {
      success: result.success,
      message: result.message || result.error,
    });

    // Update student record if notification was successful
    if (result.success) {
      console.log("Updating student record for successful notification");

      const updateResult = await Students.findByIdAndUpdate(
        studentData._id,
        {
          $set: {
            "messageStatus.admitCardSend": true,
            "messageStatus.admitCardSentDate": new Date(),
          },
        },
        {
          new: true, // Return updated document
          runValidators: true, // Run schema validators
        }
      );

      if (!updateResult) {
        console.error("Failed to update student record");
        return {
          success: false,
          error: "Notification sent but failed to update database",
        };
      }

      console.log("Student record updated successfully");

      return {
        success: true,
        message: "Admit card notification sent successfully",
        sentDate: updateResult.messageStatus.admitCardSentDate,
        studentName: updateResult.studentName,
      };
    }

    // Notification failed
    console.error("Failed to send admit card notification:", result.error);
    return result;
  } catch (error) {
    console.error("Error in sendAdmitCardNotification:", {
      StudentsId,
      error: error.message,
      stack: error.stack,
    });

    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
};

module.exports = { sendAdmitCardNotification };

module.exports = {
  sendAdmitCardViaWATI,
  sendAdmitCardNotification,
};

/*
 * ENVIRONMENT VARIABLES NEEDED (.env file):
 *
 * For Twilio:
 * TWILIO_ACCOUNT_SID=your_account_sid
 * TWILIO_AUTH_TOKEN=your_auth_token
 * TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
 *
 * For WATI:
 * WATI_API_URL=https://live-server-xxxxx.wati.io
 * WATI_API_TOKEN=your_wati_token
 *
 * INSTALLATION:
 * npm install twilio
 */

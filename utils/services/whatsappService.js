// services/whatsappService.js
// WhatsApp integration for sending admit cards

const axios = require("axios");
const Students = require("../../models/Student");

/**
 * Send Admit Card via WhatsApp using Twilio API
 * You can also use other services like:
 * - WhatsApp Business API
 * - WATI
 * - Gupshup
 * - Interakt
 */

// Option 1: Using Twilio (Recommended)
const sendAdmitCardViaTwilio = async (studentData) => {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER; // Format: whatsapp:+14155238886

    const client = require("twilio")(accountSid, authToken);

    const message = await client.messages.create({
      from: whatsappNumber,
      to: `whatsapp:+91${studentData.contactNumber}`, // Indian number format
      body: `🎓 *SDAT Registration Successful!*\n\nDear ${studentData.studentName},\n\nYour payment has been confirmed.\n\n✅ Payment ID: ${studentData.paymentId}\n💰 Amount: ₹${studentData.amount}\n\n📄 Your admit card will be sent to you shortly.\n\nFor any queries, contact: support@scholarsden.com\n\nThank you!`,
    });

    console.log("WhatsApp message sent:", message.sid);
    return { success: true, messageSid: message.sid };
  } catch (error) {
    console.error("Error sending WhatsApp via Twilio:", error);
    return { success: false, error: error.message };
  }
};

// Option 2: Using WATI (Indian provider, easier for WhatsApp Business)
const sendAdmitCardViaWATI = async (studentData) => {
  try {
    console.log("Step -3 inside the sendAdmitCardViaWATI function");
    const whatsappApi = process.env.WATI_API_URL; // e.g., https://live-server-12345.wati.io
    // const watiToken = process.env.WATI_API_TOKEN;

    console.log("watiApi", whatsappApi);

    console.log("studentData in whatsapp service", studentData);
    const formattedNumber = `91${studentData?.contactNumber}`;

    console.log("formattedNumber", formattedNumber);

    // Prepare admit card file URL and name
    const fileUrl = studentData?.admitCard; // Ensure this is a publicly accessible URL
    const fileName = `Admit_Card_${studentData?.studentName.replace(
      /\s+/g,
      "_"
    )}.pdf`;

    let result = {
      status: "failed",
      responseCode: null,
      error: null,
    };
    const studentName = studentData?.studentName || "Student";

    console.log(
      "Step 4 before the try of sendAdmitCardViaWATI function, fileUrl, fileName",
      fileUrl,
      fileName
    );
    console.log(
      "Step 5 before the try of sendAdmitCardViaWATI function whatsappApi",
      whatsappApi
    );

    try {
      const response = await axios.post(
        "https://backend.api-wa.co/campaign/myoperator/api/v2",
        {
          apiKey: whatsappApi,
          campaignName: "ReRise_Result",
          destination: formattedNumber,
          userName: "Scholars Den",
          templateParams: [],
          source: "new-landing-page form",
          media: {
            url: fileUrl,
            filename: fileName,
          },
          buttons: [],
          carouselCards: [],
          location: {},
          attributes: {},
        }
      );
      console.log("Step 4 inside the try of sendAdmitCardViaWATI function");

      console.log("response from wati", response);

      result.status = "sent";
      result.responseCode = response.status;
    } catch (error) {
      // console.log("error from sendAdmitCardViaWATI", error);
      console.error(
        "Error sending WhatsApp message:",
        error?.response?.data || error.message
      );
      result.error = error?.response?.data || error.message;
    }

    console.log("WhatsApp sent via WATI:", response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error sending WhatsApp via WATI:", error);
    return { success: false, error: error.message };
  }
};

// Option 3: Using WhatsApp Business API with Document
const sendAdmitCardWithPDF = async (studentData, pdfBuffer) => {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    const client = require("twilio")(accountSid, authToken);

    // First upload the PDF to a accessible URL or use Twilio's media
    const message = await client.messages.create({
      from: whatsappNumber,
      to: `whatsapp:+91${studentData.contactNumber}`,
      body: `🎓 Your SDAT Admit Card is ready!\n\nDear ${studentData.studentName},\n\nPlease find your admit card attached.\n\nAll the best! 🌟`,
      mediaUrl: [studentData.admitCardUrl], // URL of the admit card PDF
    });

    console.log("Admit card sent with PDF:", message.sid);
    return { success: true, messageSid: message.sid };
  } catch (error) {
    console.error("Error sending admit card PDF:", error);
    return { success: false, error: error.message };
  }
};

// Main function to call from payment verification
// const sendAdmitCardNotification = async (StudentsId) => {
//   try {
//     // Choose your preferred method
//     // const result = await sendAdmitCardViaTwilio(studentData);

//     console.log("STep 2 start enter in the sendAdmitCardNotification");

//     const studentData = Students.find({ StudentsId });

//     console.log("Student from whatsapp service", studentData);

//     const result = await sendAdmitCardViaWATI(studentData);

//     console.log("Result from sendAdmitCardViaWATI", result);
//     // const result = await sendAdmitCardWithPDF(studentData, pdfBuffer);

//     if (result.success) {
//       // Update student record that WhatsApp was sent

//       console.log("RESULT in whatsapp service IS SUCCESS ");
//       const Student = require("../models/Student");
//       await Student.findByIdAndUpdate(studentData.studentId, {
//         admit_card_sent: true,
//         whatsapp_sent_date: new Date(),
//       });
//     }

//     return result;
//   } catch (error) {
//     console.error("Error in sendAdmitCardNotification:", error);
//     return { success: false, error: error.message };
//   }
// };

const sendAdmitCardNotification = async (StudentsId) => {
  try {
    console.log("Step 2 start enter in the sendAdmitCardNotification");

    // Fix 1: Use findOne instead of find, and await it
    const studentData = await Students.findOne({ StudentsId });

    // Fix 2: Check if student exists
    if (!studentData) {
      console.log("Student not found with StudentsId:", StudentsId);
      return { success: false, error: "Student not found" };
    }

    console.log("Student from whatsapp service", studentData);

    const result = await sendAdmitCardViaWATI(studentData);
    console.log("Result from sendAdmitCardViaWATI", result);

    if (result.success) {
      console.log("RESULT in whatsapp service IS SUCCESS");

      // Fix 3: Update using _id instead of non-existent studentId field
      // Fix 4: Update the correct field name from schema (messageStatus.admitCardSend)
      // await Students.findByIdAndUpdate(studentData._id, {
      //   "messageStatus.admitCardSend": true,
      //   // If you want to track when it was sent, you'll need to add a field to your schema
      //   // For now, the timestamps will be updated automatically
      // });

      await Students.findByIdAndUpdate(studentData._id, {
        "messageStatus.admitCardSend": true,
        "messageStatus.admitCardSentDate": new Date(),
      });
    }

    return result;
  } catch (error) {
    console.error("Error in sendAdmitCardNotification:", error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendAdmitCardViaTwilio,
  sendAdmitCardViaWATI,
  sendAdmitCardWithPDF,
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

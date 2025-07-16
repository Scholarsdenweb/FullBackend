const fs = require("fs");
const { JSDOM } = require("jsdom");
const pdf = require("html-pdf");
const PDFDocument = require("pdfkit");
const csv = require("csv-parser");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Function to check if the file is valid (non-empty)
const isFileValid = (filePath) => {
    try {
        const stats = fs.statSync(filePath);
        return stats.size > 0;
    } catch (error) {
        console.error("Error checking file size:", error);
        return false;
    }
};

// Function to generate admit card using HTML template (HTML-to-PDF)
const generateAdmitCardHTML = (data, filePath) => {
    return new Promise((resolve, reject) => {
        const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; margin: 0; padding: 0; }
              .header { background-color: #4CAF50; color: white; padding: 10px; font-size: 24px; }
              .content { margin: 20px; }
              .details { text-align: left; margin: 20px; font-size: 16px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              table, th, td { border: 1px solid black; }
              th, td { padding: 8px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="header">ABC High School - Admit Card</div>
            <div class="content">
              <img src="${data.photo || 'default-photo-url.jpg'}" width="100" height="100" style="border-radius: 50%;">
              <div class="details">
                <p><b>Name:</b> ${data.First_Name}</p>
                <p><b>Roll Number:</b> ${data.Registration}</p>
                <p><b>Class:</b> ${data.class}</p>
              </div>
              <table>
                <tr><th>Subject</th><th>Date</th></tr>
                ${data.examDetails.map(exam => `<tr><td>${exam.subject}</td><td>${exam.date}</td></tr>`).join("")}
              </table>
            </div>
          </body>
        </html>
        `;

        // Generate PDF from the HTML content
        pdf.create(htmlContent).toFile(filePath, (err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res.filename);
            }
        });
    });
};

// Function to generate admit card using PDFKit
const generateAdmitCardPDFKit = (data, filePath) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const writeStream = fs.createWriteStream(filePath);

        doc.pipe(writeStream);

        // Add header and student details to the admit card
        doc.fontSize(20).text("Admit Card", { align: "center" }).moveDown();
        doc.fontSize(12).text(`First Name: ${data.First_Name}`);
        doc.text(`Roll Number: ${data.Registration}`);
        doc.text(`Class: ${data.class}`);
        doc.text(`Scholarship: ${data.Scholarship}`);
        doc.moveDown();

        // Finalize the document
        doc.end();

        writeStream.on("finish", () => {
            resolve(filePath); // Resolve the promise when the file is successfully written
        });

        writeStream.on("error", (error) => {
            reject(error); // Reject the promise in case of an error
        });
    });
};




// Function to upload a file to Cloudinary
const uploadToCloudinary = async (filePath, rollNumber) => {
    try {
        const folder = "admit_cards"; // Folder name in Cloudinary
        const publicId = `${folder}/${rollNumber}`; // Store the file with the student's roll number as the name

        console.log(`Uploading ${filePath} to Cloudinary...`);
        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: "raw", // Specify 'raw' for non-image files like PDFs
            public_id: publicId,  // Set custom public ID for the file

        });
        console.log(`Uploaded to Cloudinary: ${result.url}`);
        return result.url;
    } catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        throw error;
    }
};

// Function to process CSV data and generate admit cards
const processCSVAndGenerateAdmitCards = async (csvFilePath) => {
    const students = [];
    const allUrls = {}

    // Read CSV file and parse data
    fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on("data", (row) => {
            students.push(row);
        })
        .on("end", async () => { 
            console.log("CSV file successfully processed.");
            console.log("Number of students:", students.length);

            for (const student of students) {
                const pdfFilePath = `./admit_card_${student.Registration}.pdf`;

                // Prepare student data for admit card
                const studentData = {
                    First_Name: student.First_Name,
                    Registration: student.Registration,
                    class: student.Class,
                    Scholarship: student.Scholarship,
                    photo: student.Photo || "https://via.placeholder.com/100", // Placeholder if no photo
                    examDetails: [
                        { subject: "Mathematics", date: "2024-01-15" },
                        { subject: "Science", date: "2024-01-16" },
                        { subject: "English", date: "2024-01-17" }
                    ],
                };

                try {
                    // Choose between generating the PDF from HTML or PDFKit
                    // await generateAdmitCardHTML(studentData, pdfFilePath); // HTML-to-PDF example
                    await generateAdmitCardPDFKit(studentData, pdfFilePath); // PDFKit example
                    console.log(`Generated admit card for Roll Number: ${student.Registration}`);
                    console.log("print Data",studentData);

                    // Ensure that the file is valid before uploading
                    if (isFileValid(pdfFilePath)) {
                        // Upload the admit card to Cloudinary
                        const url = await uploadToCloudinary(pdfFilePath, student.Registration);
                        allUrls[student.Registration] = url;
                        console.log(`Admit card URL for ${student.Registration}: ${url}`);
                    } else {
                        console.log(`Generated PDF for ${student.Registration} is empty or invalid.`);
                    }

                    // Optionally, delete the local file after upload
                    fs.unlinkSync(pdfFilePath);
                } catch (error) {
                    console.error(`Error processing admit card for Roll Number: ${student.Registration}`, error);
                }
                return allUrls;
            }
        })
        .on("error", (error) => {
            console.error("Error reading CSV file:", error);
        });
};

// Run the script
// const csvFilePath = "./students.csv"; // Path to your CSV file
// processCSVAndGenerateAdmitCards(csvFilePath);

module.exports = processCSVAndGenerateAdmitCards;

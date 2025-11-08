const fs = require("fs");

const cloudinary = require("cloudinary").v2;

require("dotenv").config();
const puppeteer = require("puppeteer");
const puppeteerCore = require("puppeteer-core");
const chromium = require("@sparticuz/chromium-min");
const path = require("path");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const isFileValid = async (filePath) => {
  try {
    const stats = await fs.statSync(filePath);

    console.log("File stats:", stats);
    console.log("File size:", stats.size);

    return stats.size > 0;
  } catch (error) {
    console.error("Error checking file size:", error);
    return false;
  }
};

const generateAdmitCardPDF = async (data, filePath) => {
  console.log("generateAdmitCardPDF", data, filePath);
  let browser = null;
  try {
    if (process.env.NODE_ENV === "production") {
      const executablePath = await chromium.executablePath(
        "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar"
      );
      browser = await puppeteerCore.launch({
        executablePath,
        args: chromium.args,
        headless: chromium.headless,
        defaultViewport: chromium.defaultViewport,
      });
    } else {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }

    const page = await browser.newPage();
    // const logoPath = path.resolve(__dirname, "rise-logo.png");
        const logoPath = path.resolve(__dirname, "SDATLogo.png");


    console.log("logoPath from admitCard", logoPath);
    const logoBase64 = fs.readFileSync(logoPath, { encoding: "base64" });
    const logoDataUrl = `data:image/png;base64,${logoBase64}`;
    //  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@100;300;400;700&display=swap" rel="stylesheet">

    let currentClass = "";
    if (data.class.split(" ").length === 1) {
      currentClass = `${data.class} Foundation`;
    } else {
      currentClass = data.class;
    }
    const htmlContent = `
  <!DOCTYPE html>
  <html>
    <head>

      <style>
        body {
          margin: 0;
          font-family: Arial, sans-serif;
          background-color: #f7f7f7;
        }
        .admit-card {
          width: 800px;
          margin:  auto;
          padding: 20px 40px;
          background-color: #c61d23;
          color: white;
          border: 2px solid #000;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          font-family: Arial, sans-serif;
          font-weight: 100;
          letter-spacing: 1px;
        }
  
        .admit-card .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 28px;
          font-weight: bold;
        }
  
        .admit-card .stream-section,
        .admit-card .class-section {
          display: flex;
          // font-style: oblique;
          gap: 20px;
          align-items: center;
        }
  
        .admit-card .stream-section input,
        .admit-card .class-section input {
          height: 20px;
          width: 20px;
          outline: 1px solid black;
        }
  
        .mainStream input[type="checkbox"],
        .mainClass input[type="checkbox"] {
          margin-left: 6px;
        }
  
        .admit-card .stream-section .mainStream,
        .admit-card .class-section .mainClass {
          display: flex;
          margin: 10px 0;
          justify-content: center;
          align-items: center;
        }


  
        .admit-card .details-section {
          margin-top: 20px;
          // font-style: oblique;
        }
  
        .admit-card .details-section label {
          display: inline-block;
          width: 200px;
          font-size: 16px;

          margin-bottom: 20px;
        }
  
        .admit-card .photo-section {
          border: 2px dashed white;
          padding: 10px;
          width: 150px;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 100;
          color: gray;
          text-align: center;
          background-color: #ffffff;
        }
  
        .admit-card .footer {
          font-size: 13px;
          line-height: 1.1rem;
          text-align: center;
          margin-top: 10px;
          font-weight: 600;
          letter-spacing: 0.5px;
          word-spacing: 2px;
        }
  
        .mainSection {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          gap: 20px;
        }
        .logo {
          width: 20%;
          height: 20%;
        }
          .
      </style>
    </head>
    <body>
      <div class="admit-card">
        <div class="header">
         <img class="logo" src="${logoDataUrl}" alt="Logo" />
          <h5>ACKNOWLEDGEMENT SLIP / ADMIT CARD</h5>
        </div>
        <div class="mainSection">
          <div class="info">
            <div class="details-section">
             <label>Class:</label>
             <span>${currentClass}</span>
             <br/>
             <label>Registration No:</label>
              <span>${data.Registration}</span>
              <br />
              <label>Student's Name:</label>
              <span>${data.studentName}</span>
              <br />
              <label>Father Name: </label>
              <span> ${data.fatherName}</span>
              <br />
              <label>Exam Date:</label>
              <span>${data.examDate}</span>
              <br />
              <label>Exam Time:</label>
              <span>${data.examTime}</span>
              <br />
            
              <br />
              
            </div>
          </div>
          <div class="photo-section">
           ${
             data.profilePicture
               ? `<img src="${data.profilePicture}" alt="profilePic" width="100%" height="100%" />`
               : `<span>Paste a Recent Photograph</span>`
           }

          </div>
        </div>
        <div class="footer">
           SD Campus Near Tehsil, Sonakpur Overbridge Road, Moradabad (UP) 244001<br />
          SD House (Corporate Office): Sai Mandir Road, Deen Dayal Nagar-I,
          Moradabad (UP) 244001
          <br />
          Contact: +91 8126555222 / 333 | www.scholarsden.in / scholarsden
        </div>
      </div>
    </body>
  </html>
  `;

    await page.setContent(htmlContent, { waitUntil: "networkidle2" });

    console.log("pathFile from generateAdmitCardPDF", filePath);

    await page.setContent(htmlContent);
    await page.pdf({ path: filePath, format: "A4", printBackground: true });

    await browser.close();
  } catch (error) {
    console.log({ error });
  }
};

const uploadToCloudinary = async (filePath, rollNumber, studentName) => {
  try {
    const folder = "admit_cards"; // Folder name in Cloudinary
    const publicId = `${folder}/${studentName}/${rollNumber}`; // Store the file with the student's roll number as the name
    console.log("Uploading file to Cloudinary:", publicId);




    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "raw", // Specify 'raw' for non-image files like PDFs
      public_id: publicId,
      folder: "SDAT270425AdmitCard", // Set custom public ID for the file
    });
    return result.secure_url;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw error;
  }
};

// Function to process CSV data and generate admit cards
const processHTMLAndGenerateAdmitCards = async (student) => {
  const pdfFilePath = `./admit_card_${student.studentId}.pdf`;
  // const date = new Date(student.dob);

  // // Format the date to dd-mm-yy
  // const day = String(date.getDate()).padStart(2, '0'); // Ensure 2 digits for day
  // const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
  // const year = String(date.getFullYear()).slice(-2); // Get last 2 digits of year

  // const formattedDate = `${day}-${month}-${year}`;

  // console.log(formattedDate);

  function formatDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0"); // Months are zero-based
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
  }

  const studentData = {
    studentName: student.name,
    Registration: student.studentId,
    class: student.class,
    stream: student.stream,
    fatherName: student.FatherName,
    examDate: student.examDate,
    examTime: student.examTime,
    CenterName: student.CenterName,
    CenterAddress: student.CenterAddress,
    profilePicture: student.profilePicture,
  };

  try {
    const data = await generateAdmitCardPDF(studentData, pdfFilePath);
    console.log("Data from pdfFilePath ", pdfFilePath);
    console.log("Data from generateAdmitCardPDF ", data);
    1;
    const fileValidData = await isFileValid(pdfFilePath);

    console.log("Check fileValidData from generateAdmitCardPDF", fileValidData);
    console.log("Check fileValidData from generateAdmitCardPDF", pdfFilePath);

    console.log("Generated PDF file path:", pdfFilePath);
    console.log("Generated PDF file path:", student?.name?.trim());

    if (true) {
      const url = await uploadToCloudinary(
        pdfFilePath,
        student?.studentId,
        student?.name?.trim()
      );
      return url;
    } else {
      console.log(
        `Generated PDF for ${student.studentId} is empty or invalid.`
      );
    }
  } catch (error) {
    console.error(
      `Error processing admit card for Roll Number: ${student.studentId}`,
      error
    );
    return error;
    // res.status(500).json({ message: "Error processing admit card", error });
  } finally {
    if (fs.existsSync(pdfFilePath)) fs.unlinkSync(pdfFilePath);
  }
};

module.exports = processHTMLAndGenerateAdmitCards;

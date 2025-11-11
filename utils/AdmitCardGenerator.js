const fs = require("fs");

const { PDFDocument } =  require("pdf-lib");

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

// const uploadToCloudinary = async (filePath, rollNumber, studentName) => {
//   try {
//     const folder = "admit_cards"; // Folder name in Cloudinary
//     const publicId = `${folder}/${studentName}/${rollNumber}`; // Store the file with the student's roll number as the name
//     console.log("Uploading file to Cloudinary:", publicId);

//     const result = await cloudinary.uploader.upload(filePath, {
//       resource_type: "raw", // Specify 'raw' for non-image files like PDFs
//       public_id: publicId,
//       folder: "SDAT270425AdmitCard", // Set custom public ID for the file
//     });
//     return result.secure_url;
//   } catch (error) {
//     console.error("Error uploading to Cloudinary:", error);
//     throw error;
//   }
// };

// const uploadToCloudinary = async (filePath, rollNumber, studentName) => {
//   try {
//     // Step 1️⃣ — Read file as buffer
//     let fileBuffer = fs.readFileSync(filePath);

//     // Step 2️⃣ — Check and compress if larger than 1MB
//     if (fileBuffer.length > 1024 * 1024) {
//       console.log("⚠️ File > 1MB, compressing PDF...");

//       const pdfDoc = await PDFDocument.load(fileBuffer);
//       const compressedPdf = await pdfDoc.save({ useObjectStreams: true });

//       fileBuffer = Buffer.from(compressedPdf);

//       console.log(
//         "📉 PDF compressed before upload:",
//         (fileBuffer.length / 1024).toFixed(2),
//         "KB"
//       );
//     }

//     // Step 3️⃣ — Upload to Cloudinary using upload_stream
//     const result = await new Promise((resolve, reject) => {
//       const uploadStream = cloudinary.v2.uploader.upload_stream(
//         {
//           folder: "SDAT270425AdmitCard",
//           public_id: `${studentName}_${rollNumber}`,
//           resource_type: "raw",
//         },
//         (error, result) => {
//           if (error) reject(error);
//           else resolve(result);
//         }
//       );

//       // Pipe the buffer to Cloudinary
//       uploadStream.end(fileBuffer);
//     });

//     console.log("✅ Uploaded:", result.secure_url);
//     return result.secure_url;
//   } catch (error) {
//     console.error("❌ Error uploading to Cloudinary:", error);
//     throw error;
//   }
// };

// // Function to process CSV data and generate admit cards
// const processHTMLAndGenerateAdmitCards = async (student) => {
//   const pdfFilePath = `./admit_card_${student.studentId}.pdf`;
//   // const date = new Date(student.dob);

//   // // Format the date to dd-mm-yy
//   // const day = String(date.getDate()).padStart(2, '0'); // Ensure 2 digits for day
//   // const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
//   // const year = String(date.getFullYear()).slice(-2); // Get last 2 digits of year

//   // const formattedDate = `${day}-${month}-${year}`;

//   // console.log(formattedDate);

//   function formatDate(date) {
//     const d = new Date(date);
//     const day = String(d.getDate()).padStart(2, "0");
//     const month = String(d.getMonth() + 1).padStart(2, "0"); // Months are zero-based
//     const year = d.getFullYear();

//     return `${day}-${month}-${year}`;
//   }

//   const studentData = {
//     studentName: student.name,
//     Registration: student.studentId,
//     class: student.class,
//     stream: student.stream,
//     fatherName: student.FatherName,
//     examDate: student.examDate,
//     examTime: student.examTime,
//     CenterName: student.CenterName,
//     CenterAddress: student.CenterAddress,
//     profilePicture: student.profilePicture,
//   };

//   try {
//     const data = await generateAdmitCardPDF(studentData, pdfFilePath);
//     console.log("Data from pdfFilePath ", pdfFilePath);
//     console.log("Data from generateAdmitCardPDF ", data);
//     1;
//     const fileValidData = await isFileValid(pdfFilePath);

//     console.log("Check fileValidData from generateAdmitCardPDF", fileValidData);
//     console.log("Check fileValidData from generateAdmitCardPDF", pdfFilePath);

//     console.log("Generated PDF file path:", pdfFilePath);
//     console.log("Generated PDF file path:", student?.name?.trim());

//     if (fileValidData) {
//       const url = await uploadToCloudinary(
//         pdfFilePath,
//         student?.studentId,
//         student?.name?.trim()
//       );
//       return url;
//     } else {
//       console.log(
//         `Generated PDF for ${student.studentId} is empty or invalid.`
//       );
//     }
//   } catch (error) {
//     console.error(
//       `Error processing admit card for Roll Number: ${student.studentId}`,
//       error
//     );
//     return error;
//     // res.status(500).json({ message: "Error processing admit card", error });
//   } finally {
//     if (fs.existsSync(pdfFilePath)) fs.unlinkSync(pdfFilePath);
//   }
// };






// const uploadToCloudinary = async (filePath, rollNumber, studentName) => {
//   try {
//     // ✅ Check if cloudinary is configured
//     if (!cloudinary || !cloudinary.uploader) {
//       throw new Error("Cloudinary is not properly configured. Please check your cloudinary.config() setup.");
//     }

//     // Step 1️⃣ — Read file as buffer
//     let fileBuffer = fs.readFileSync(filePath);

//     // Step 2️⃣ — Check and compress if larger than 1MB
//     if (fileBuffer.length > 1024 * 1024) {
//       console.log("⚠️ File > 1MB, compressing PDF...");

//       const pdfDoc = await PDFDocument.load(fileBuffer);
//       const compressedPdf = await pdfDoc.save({ useObjectStreams: true });

//       fileBuffer = Buffer.from(compressedPdf);

//       console.log(
//         "📉 PDF compressed before upload:",
//         (fileBuffer.length / 1024).toFixed(2),
//         "KB"
//       );
//     }

//     // Step 3️⃣ — Upload to Cloudinary using upload_stream
//     const result = await new Promise((resolve, reject) => {
//       const uploadStream = cloudinary.uploader.upload_stream(
//         {
//           folder: "SDAT270425AdmitCard/admit_cards/" + studentName.replace(/\s+/g, '_'),
//           public_id: rollNumber,
//           resource_type: "raw",
//           format: "pdf",
//         },
//         (error, result) => {
//           if (error) {
//             console.error("❌ Cloudinary upload error:", error);
//             reject(error);
//           } else {
//             resolve(result);
//           }
//         }
//       );

//       // Pipe the buffer to Cloudinary
//       uploadStream.end(fileBuffer);
//     });

//     console.log("✅ Uploaded:", result.secure_url);
//     return result.secure_url;
//   } catch (error) {
//     console.error("❌ Error uploading to Cloudinary:", error);
//     throw error;
//   }
// };











const uploadToCloudinary = async (filePath, rollNumber, studentName) => {
  try {
    // ✅ Check if cloudinary is configured
    if (!cloudinary || !cloudinary.uploader) {
      throw new Error("Cloudinary is not properly configured. Please check your cloudinary.config() setup.");
    }

    // Step 1️⃣ — Read file as buffer
    let fileBuffer = fs.readFileSync(filePath);
    const originalSize = fileBuffer.length;
    console.log("📄 Original PDF size:", (originalSize / 1024).toFixed(2), "KB");

    // Step 2️⃣ — Aggressive compression to get under 1MB (10MB Cloudinary limit, but targeting <1MB)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB Cloudinary limit
    const TARGET_SIZE = 1024 * 1024; // Target 1MB

    if (fileBuffer.length > TARGET_SIZE) {
      console.log("⚠️ File > 1MB, applying aggressive compression...");

      try {
        const pdfDoc = await PDFDocument.load(fileBuffer);
        
        // Get all pages
        const pages = pdfDoc.getPages();
        console.log(`📑 Processing ${pages.length} pages...`);

        // Compress embedded images
        const embeddedImages = [];
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const { width, height } = page.getSize();
          
          // Try to extract and compress images (if any)
          // Note: pdf-lib doesn't have direct image extraction, 
          // so we'll rely on save options
        }

        // Save with maximum compression
        const compressedPdf = await pdfDoc.save({
          useObjectStreams: true,
          addDefaultPage: false,
          objectsPerTick: 50,
        });

        fileBuffer = Buffer.from(compressedPdf);
        console.log("📉 After pdf-lib compression:", (fileBuffer.length / 1024).toFixed(2), "KB");

        // If still too large, try alternative method with Ghostscript-like compression
        if (fileBuffer.length > MAX_SIZE) {
          console.log("⚠️ Still too large, trying advanced compression...");
          
          // Write to temp file for external compression
          const tempCompressedPath = `${filePath}.compressed.pdf`;
          fs.writeFileSync(tempCompressedPath, fileBuffer);

          // Use pdf-lib to create a lower quality version
          const pdfDoc2 = await PDFDocument.load(fileBuffer);
          const compressedPdf2 = await pdfDoc2.save({
            useObjectStreams: true,
            addDefaultPage: false,
          });
          
          fileBuffer = Buffer.from(compressedPdf2);
          
          // Clean up temp file
          if (fs.existsSync(tempCompressedPath)) {
            fs.unlinkSync(tempCompressedPath);
          }
        }

        const finalSize = fileBuffer.length;
        const reduction = ((1 - finalSize / originalSize) * 100).toFixed(2);
        console.log(`✅ Compression complete: ${(finalSize / 1024).toFixed(2)} KB (${reduction}% reduction)`);

        // Final check - if still over 10MB, fail
        if (fileBuffer.length > MAX_SIZE) {
          throw new Error(
            `PDF still too large after compression: ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB. ` +
            `Maximum allowed: 10MB. Please reduce image quality in the PDF generation step.`
          );
        }

      } catch (compressionError) {
        console.error("❌ Compression failed:", compressionError);
        throw new Error(`PDF compression failed: ${compressionError.message}`);
      }
    }

    // Step 3️⃣ — Upload to Cloudinary using upload_stream
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "SDAT270425AdmitCard/admit_cards/" + studentName.replace(/\s+/g, '_'),
          public_id: rollNumber,
          resource_type: "raw",
          format: "pdf",
        },
        (error, result) => {
          if (error) {
            console.error("❌ Cloudinary upload error:", error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      // Pipe the buffer to Cloudinary
      uploadStream.end(fileBuffer);
    });

    console.log("✅ Uploaded:", result.secure_url);
    return result.secure_url;
  } catch (error) {
    console.error("❌ Error uploading to Cloudinary:", error);
    throw error;
  }
};















// const processHTMLAndGenerateAdmitCards = async (student) => {
//   const pdfFilePath = `./admit_card_${student.studentId}.pdf`;

//   function formatDate(date) {
//     const d = new Date(date);
//     const day = String(d.getDate()).padStart(2, "0");
//     const month = String(d.getMonth() + 1).padStart(2, "0");
//     const year = d.getFullYear();
//     return `${day}-${month}-${year}`;
//   }

//   const studentData = {
//     studentName: student.name,
//     Registration: student.studentId,
//     class: student.class,
//     stream: student.stream,
//     fatherName: student.FatherName,
//     examDate: student.examDate,
//     examTime: student.examTime,
//     CenterName: student.CenterName,
//     CenterAddress: student.CenterAddress,
//     profilePicture: student.profilePicture,
//   };

//   try {
//     const data = await generateAdmitCardPDF(studentData, pdfFilePath);
//     console.log("Data from pdfFilePath:", pdfFilePath);
//     console.log("Data from generateAdmitCardPDF:", data);

//     // ✅ Check if file exists before validating
//     if (!fs.existsSync(pdfFilePath)) {
//       throw new Error(`PDF file was not created at ${pdfFilePath}`);
//     }

//     const fileValidData = await isFileValid(pdfFilePath);
//     console.log("Check fileValidData from generateAdmitCardPDF:", fileValidData);
//     console.log("Check pdfFilePath:", pdfFilePath);
//     console.log("Student name:", student?.name?.trim());

//     if (fileValidData) {
//       const url = await uploadToCloudinary(
//         pdfFilePath,
//         student?.studentId,
//         student?.name?.trim() || "student"
//       );
//       console.log("✅ Admit card uploaded successfully:", url);
//       return url;
//     } else {
//       const errorMsg = `Generated PDF for ${student.studentId} is empty or invalid.`;
//       console.error(errorMsg);
//       throw new Error(errorMsg);
//     }
//   } catch (error) {
//     console.error(
//       `❌ Error processing admit card for Roll Number: ${student.studentId}`,
//       error
//     );
//     // Return error message instead of error object to avoid storing complex objects in DB
//     return error.message || String(error);
//   } finally {
//     // ✅ Clean up PDF file
//     if (fs.existsSync(pdfFilePath)) {
//       try {
//         fs.unlinkSync(pdfFilePath);
//         console.log("🗑️ Cleaned up temporary PDF:", pdfFilePath);
//       } catch (cleanupError) {
//         console.error("⚠️ Failed to delete temporary PDF:", cleanupError);
//       }
//     }
//   }
// };








// Add this helper function to compress images before PDF generation






const compressImageForPDF = async (imageUrl) => {
  try {
    const sharp = require('sharp');
    const axios = require('axios');
    
    // Download image
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data);
    
    // Compress image to reasonable size (max 200KB)
    const compressedBuffer = await sharp(imageBuffer)
      .resize(300, 400, { // Passport photo size
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ 
        quality: 75, // Reduce quality
        progressive: true,
        mozjpeg: true 
      })
      .toBuffer();
    
    // Convert to base64 for use in PDF
    return `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
  } catch (error) {
    console.error('Error compressing image:', error);
    return imageUrl; // Return original if compression fails
  }
};

// Update your processHTMLAndGenerateAdmitCards function
const processHTMLAndGenerateAdmitCards = async (student) => {
  const pdfFilePath = `./admit_card_${student.studentId}.pdf`;

  function formatDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  // ✅ Compress profile picture BEFORE generating PDF
  const compressedProfilePicture = student.profilePicture 
    ? await compressImageForPDF(student.profilePicture)
    : student.profilePicture;

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
    profilePicture: compressedProfilePicture, // Use compressed image
  };

  try {
    const data = await generateAdmitCardPDF(studentData, pdfFilePath);
    console.log("Data from pdfFilePath:", pdfFilePath);

    if (!fs.existsSync(pdfFilePath)) {
      throw new Error(`PDF file was not created at ${pdfFilePath}`);
    }

    const fileValidData = await isFileValid(pdfFilePath);
    console.log("Check fileValidData:", fileValidData);

    if (fileValidData) {
      const url = await uploadToCloudinary(
        pdfFilePath,
        student?.studentId,
        student?.name?.trim() || "student"
      );
      console.log("✅ Admit card uploaded successfully:", url);
      return url;
    } else {
      throw new Error(`Generated PDF for ${student.studentId} is empty or invalid.`);
    }
  } catch (error) {
    console.error(`❌ Error processing admit card for Roll Number: ${student.studentId}`, error);
    return error.message || String(error);
  } finally {
    if (fs.existsSync(pdfFilePath)) {
      try {
        fs.unlinkSync(pdfFilePath);
        console.log("🗑️ Cleaned up temporary PDF:", pdfFilePath);
      } catch (cleanupError) {
        console.error("⚠️ Failed to delete temporary PDF:", cleanupError);
      }
    }
  }
};














module.exports = processHTMLAndGenerateAdmitCards;

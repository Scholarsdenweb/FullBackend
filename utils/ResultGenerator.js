const fs = require("fs");
const puppeteer = require('puppeteer');
const puppeteerCore = require("puppeteer-core");
const chromium = require("@sparticuz/chromium-min");
const csv = require("csv-parser");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();
const path = require('path');
const Students = require("../models/Student");
const Result = require("../models/Result");

const ExamDate = require("../models/ExamDate");
const ErrorList = require("../models/ErrorList");


// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Function to check if the file is valid (non-empty)
const isFileValid = (pdfFilePath) => {
  try {
    const stats = fs.statSync(pdfFilePath);
    return stats.size > 0;
  } catch (error) {
    console.error("Error checking file size:", error);
    return false;
  }
};





const generateReportCardPDF = async (data, pdfFilePath) => {


  const dirPath = path.dirname(pdfFilePath);

  // Ensure the directory exists
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  console.log("Directory ensured:", dirPath);
  console.log("Attempting to generate PDF at:", path.resolve(pdfFilePath));




  console.log("Generating Report Card PDF...", pdfFilePath);

  // const subjects = data.subjects.filter((subject) => subject !== undefined);





  let browser = null;
  try {
    if (process.env.NODE_ENV === 'production') {
      // Configure the version based on your package.json (for your future usage).
      const executablePath = await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar')
      browser = await puppeteerCore.launch({
        executablePath,
        // You can pass other configs as required
        args: chromium.args,
        headless: chromium.headless,
        defaultViewport: chromium.defaultViewport
      })
    } else {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
    }

    const page = await browser.newPage();
    console.log("Generating Report Card PDF...", page);


    // Convert images to base64 for embedding
    const getImageAsBase64 = (imagePath) => {

      try {

        const logoPath = path.resolve(__dirname, imagePath);
        const logoBase64 = fs.readFileSync(logoPath, { encoding: 'base64' });



        return `data:image/png;base64,${logoBase64}`;
      } catch (error) {
        return null;
      }

    };

    const logoBase64 = getImageAsBase64("../assets/SDATLogo.png");
    const scholarsDenBase64 = getImageAsBase64("../assets/SDLogo.png");
    const callIconBase64 = getImageAsBase64("../assets/callIcon.png");
    const websiteIconBase64 = getImageAsBase64("../assets/website.png");
    const facebookIconBase64 = getImageAsBase64("../assets/facebook.png");
    const youtubeIconBase64 = getImageAsBase64("../assets/youtube.png");
    const twitterIconBase64 = getImageAsBase64("../assets/twitter.png");
    const socialIconBase64 = getImageAsBase64("../assets/social.png");
    const VTSirImage = getImageAsBase64("../assets/VTSir.png");
    const VT_Sir_Signature = getImageAsBase64("../assets/VT_Sir_Signature.png")




    // https://res.cloudinary.com/dtytgoj3f/image/upload/Student_Pictures/Aman_Prajapati_202516004.jpg



    const studentImagePath = data.studentLastName
    ? `../Photographs/${data.studentFirstName} ${data.studentLastName}_${data.Registration}.jpeg`
    : `../Photographs/${data.studentFirstName}_${data.Registration}.jpeg`;
    // const studentImagePath = data.studentLastName
    //   ? `https://res.cloudinary.com/dtytgoj3f/image/upload/Student_Pictures/${data.studentFirstName}_${data.studentLastName}_${data.Registration}.jpg`
    //   : `https://res.cloudinary.com/dtytgoj3f/image/upload/Student_Pictures/${data.studentFirstName}_${data.Registration}.jpg`;


    console.log("studentImagePath", studentImagePath);




    console.log("studentImagePath", studentImagePath);


    // const imagePath = studentImagePath;
    const imagePath = getImageAsBase64(studentImagePath);



    // If Student Image not Found
    if (imagePath === undefined || imagePath === null || imagePath === "") {

      console.log("Student image path is undefined or null or empty string.");

      const studentAlreadyExists = await ErrorList.findOne({ rollNumber: data.Registration });

      console.log("studentAlreadyExists", studentAlreadyExists);
      console.log("studentAlreadyExists", !studentAlreadyExists);

      if (!studentAlreadyExists) {

        console.log("ExamDate", data.examDate);


        // Store Error to ErrorList
        const addError = new ErrorList({
          error: "Student image path is undefined or null or empty string.",
          rollNumber: data.Registration,
          name: `Image Problem`,
          ExamDate: data.examDate
        })

        await addError.save();
        console.log("Error added to ErrorList:", addError);
      }

    } else {
      const FindErrorAvailable = await ErrorList.findOneAndDelete({ rollNumber: data.Registration });
      console.log("FindErrorAvailable", FindErrorAvailable);
    }




    const allSubjectName = await data.subjects.map((subject) => subject.name);
    const allSubjectMarks = await data.subjects.map((subject) => subject.obtained);
    const allSubjectFullMarks = await data.subjects.map((subject) => subject.fullMarks);
    const allSubjectAverageMarks = await data.subjects.map((subject) => subject.average);
    const subjectWiseRank = await data.subjects.map((subject) => subject.subjectWiseRank);

    const allSubjectHighestMarks = await data.subjects.map((subject) => subject.highestScore);

    console.log("allSubjectHighestMarks", allSubjectHighestMarks);
    console.log("allSubjectHighestMarks", data);
    // console.log("data.totalMarks[0].obtainedMarks", data.totalMarks[0].obtainedMarks);

    // console.log("data.totalMarks[0]", data.totalMarks[0]);
    // console.log("data.totalMarks[0].value", data.totalMarks[0].value);


    const percentage = ((data.totalMarks[0].value / data.totalMarks[0].obtainedMarks) * 100).toFixed(1);

    console.log("percentage", percentage);
    const scholarship = data.Scholarship;

    console.log("scholarship", scholarship);



    const examDate = data.examDate; // Dynamic Date
    const [day, month, year] = examDate.split('.');




    const monthNames = [
      '', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];




    const subjectShortForms = {
      "PHYSICS": "PHY",
      "CHEMISTRY": "CHEM",
      "BIOLOGY": "BIO",
      "MATHEMATICS": "MATH",
      "SOCIAL SCIENCE": "SST",
      "MENTAL ABILITY TEST": "MAT",
    };

    const shortSubjectNames = allSubjectName.map(subject => subjectShortForms[subject] || subject);


    const tableRows = await data.subjects
      .map(
        (subject) => `
    <tr>
      <td>${subject.name}</td>
      <td>${subject.obtained}</td>
      <td>${subject.fullMarks}</td>
    </tr>`
      )
      .join('');

    const htmlContent = ` 
      <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Hind:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@100;300;400;700&display=swap" rel="stylesheet">
      <title>Report Card</title>
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-3d"></script>
      
    
      <style>
        body {
          // font-family: Roboto, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f8f8f8;
          
    
      font-family: "Roboto", "Hind", sans-serif;
        font-weight: 400;
        font-style: normal;

        }
    
        .hr {
          border-top: 2px dashed white;
    
          border-bottom: none;
        }
    
    
        .report-card {
          margin: auto;
          background-color: #c91717;
          // border: 3px solid #c91717;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
          padding: 10px 20px 0px 20px;
          box-sizing: border-box;
        }
    
        .line-text {
        display: flex;
        align-items: center;
        position: relative;
        
    
        top: 14px;
        /* justify-content: center; */
        color: #c91717;
        font-weight: bold;
        font-size: 24px;
      }
    
      .line-text::before,
      .line-text::after {
        content: '';
        flex: 1;
        height: 2px;
        background-color: #c91717;
      }
    
        .inner-container {
          background-color: white;
          padding: 3px 20px;
        }
    
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px;
        }
        .student-info-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0px 10px;
          border: 2px solid #c91717;
          border-top: 0px;
          border-bottom: 0px;
        }
    
        // .header img {
        //   height: 60px;
        // }
    
        .header h1 {
          font-size: 24px;
          color: #c91717;
          text-align: center;
          flex-grow: 1;
        }
    
        .header .paperLogo{
          display: flex;  
          align-items: end;
        }
    
       .logo{
          height: 100px;
        }
    
        .header .exam-date {
          font-size: 14px;
          letter-spacing: 0.5px;
          word-spacing: 0.3px;
          padding-left: 10px;
          padding-bottom: 5px;
          font-style: oblique;
          color: white;
        }
        .yellow-text{
          color: #ffdd00;
        }
    .brand-logo{
    display: flex;

    }
    
        .brand-logo img{
          width: 120px;
          /* display: inline;
          height: 100px; */
        }
    
        .student-details {
          display: flex;
          justify-content: space-between;
        }
    
        .student-info {
          font-size: 14px;
          line-height: 0.7;
        }
    
      
    
        .student-info b{
          color: #c91717;
    
        }
    
        .name{
          font-size: 28px;
          color: #c91717;
          font-weight: 500;
         
    
        }
    
        .black-text-name{
          position: relative;
          border: none;
          color: black;
    
        }
        /* .name span {
          
        } */
        .black-text-name::before {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 70%;
        height: 0%; /* Covers only the top half */
        border: 2px solid black;
        border-top: none; /* Remove the bottom border */
        box-sizing: border-box;
      }
    
    
        .student-photo {
          width: 130px;
          height: 180px;
          letter-spacing: 1px;
          word-spacing: 2px;
         
  
          // border: 1px solid black;
          display: flex;
          background-color: rgb(238, 237, 237);
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 600;
          // padding: 20px;
          color: rgb(182, 181, 181);
          text-align: center;
        }
    
       .marks-table {
  width: 100%;
  border-collapse: collapse;
  border: 2px solid #c91717;
  text-align: start; /* Aligns text to the start (left for LTR languages) */
  font-size: 14px;
}

.marks-table th,
.marks-table td {

   padding : ${(data.subjects.length === 3 ) ? "12px" : (data.subjects.length === 4 ) ? "8px" : "4px"};
  // padding : 8px;
  border-top: 1px solid rgb(92, 87, 87);
}

.marks-table thead {
  font-size: 14px;
  text-align: start; /* Ensures table header is aligned left */
  padding: 2px;
  border-bottom: 1px solid black;
  background-color: white;
  color: #c91717;
  font-weight: 700;
}


.marks-table th,
.marks-table td {
  text-align: start;
}
        .graphs {
          display: flex;
          flex-wrap: wrap;
          /* gap: 20px; */
          justify-content: center;
          /* margin-top: 10px; */
        }
    
        .graph-container-doughnut{
          display: flex;
          gap: 60px;
          justify-content: center;
          width: 100%;
        }
        .graph-container-bar{
          display: flex;
           gap: 60px;
          justify-content: center;
          width: 100%;
        }
    
    
         .headingAndGraph{
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    
        gap: 2px;
      }
    
      .headingAndGraph h4{
      margin-bottom: 0px;
      padding: 0px;
        text-align: center;
        width: 100%
      }
    
    
        .graph-container-pie {
          width: 100%;
          height: 145px;
        }
        .graph-container {
          // width: 48%;
          height: 200px;
        }
    
    
        .social-media-icons{
          display: flex;
          /* justify-content: space-around; */
        }
        .social-media-div{
        width: 100%;
          color: white;
          font-weight: 900;
          padding: 10px 17px;
          display: flex;
    
          align-items: center;
          justify-content: center;
          border-right: 1px dashed rgb(184, 121, 121);
          border-bottom: 1px dashed rgb(184, 121, 121);
          
        }
        .social-media-div span{
          display: flex;
          align-items: center;
          justify-content: center;
          /* gap: 10px; */
        }
        .social-media-div-last{
          border-right: none;
        }
    
    .social-media-div img{
    width: 20px;
    height: 20px;
    margin-right:5px;
    }
    
        .redText{
          color:#c91717;
          font-size: 14px;
          font-weight: 900;
        }
    
        .footer {
          font-size: 12px;
          display: flex;
          margin-top: 6px;
          margin-bottom: 3px;
          justify-content: center;
          line-height: 1rem;
          color: white;
          text-align: center;
          font-weight: 700;
          letter-spacing: 0.1px;
          /* word-spacing: px; */
        }


     



.secondPage{

  min-height: 297mm; /* Full A4 height */
  border-top: 20px solid #c91717;
  border-bottom: 20px solid #c91717;
  padding: 20px;
  box-sizing: border-box;
  position: relative;
  display:flex;
  flex-direction: column;




 background-color: white;
      color: white;
      font-size: 12px;
      // font-weight: 700;
      // text-align: center;
      

}


.secondPageLogo{
display: flex;
gap: 10px;


}

   .secondPageLogo img{
          height: 120px;
          /* display: inline;
          height: 100px; */
        }


    .secondPageLogo {
  
   
      // margin-right: 30px;
      /* background-color: white; */
      display: flex;
      justify-content: end;
    
    }


    .secondPagetextContainer {
      display: flex;
      flex-direction: column;
      justify-content: end;
      
      width: 100%
      margin-top: 100px;
      margin-left: 200px;
    }
      .secondPagetextContainer span{
      color: #c91717;
      // font-weight: 900;
      font-size: 24px;
 

      }

    .scholarshipMessage{
   
      margin-left: 100px;
    
    }

    .secondPagetextContainer p {
      display: flex;
      flex-direction: column;
      
      color: black;
      text-align: start;
      width: 90%;

      // font-weight: 500;
      font-size: 12px;
      letter-spacing: 1px;
      word-spacing: 1px;
      // line-height: 20px;
    }


    .secondPageFooter{
    position: absolute;
    bottom: 0;
    left: 0;
    z-index: 10;

    height: 400px;
    width: 100%;
      display: flex;
      flex-direction: row;
     
      justify-content: start;
      align-items: center;
      
    }
        .VTSirImage{
          height: 400px;
          /* display: inline;
          height: 100px; */
        }

    .footerSignature{
    color: black;
    }
    .footerSignature img{
    height: 50px;
    }
      .VTSirName{
      color: #c91717;
      font-size: 16px;
      
      }

    

    

      </style>
    </head>
    <body>
       <div class="report-card">
      <!-- Header -->
      <div class="header">
        <div class="paperLogo">
          <img class="logo" src="${logoBase64}" alt="Logo" />
          <div class="exam-date">
            Examination Date<br />
            <span class="yellow-text" id="examDate"></span>
          </div>
        </div>
        <div class="brand-logo">
          <img src="${scholarsDenBase64}" alt="Logo" />
        </div>
      </div>

      <!-- Student Details -->
      <div class="student-details">
        <div class="inner-container">
          <div class="line-text">REPORT CARD 2025</div>
          <div class="student-info-container">
            <div class="student-info">
              <p class="name">
                <span class="black-text-name">${data.studentFirstName.toUpperCase()}</span>
                ${data.studentLastName.toUpperCase()}
              </p>
              <p><b>Registration No:</b> ${data.Registration}</p>
              <p><b>Father's Name:</b> ${data.Father}</p>
              <p><b>Class:</b> ${data.Class}</p>
              <p>
                <b>Scholarship:</b> ${scholarship}% (Valid till 19th April '25)
              </p>
              <p><b>Rank:</b> ${data.Rank}</p>
              <p><b>Percentage: </b>${percentage}%</p>
            </div>
            ${imagePath ? `<img class="student-photo" src="${imagePath}" alt="Student Photo" />` : `<div class="student-photo">
              <div>
              Image Not Found
              </div>
              </div>`}

          </div>

          <!-- Marks Table -->
          <table class="marks-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Marks Obtained</th>
                <th>Full Marks</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
              <tr class="redText">
                <td><b>Total</b></td>
                <td><b>${data.totalMarks[0].value}</b></td>
                <td><b>${data.totalMarks[0].obtainedMarks}</b></td>
              </tr>
            </tbody>
          </table>

          <!-- Graphs Section -->
          <div class="graphs">
            <div class="graph-container-doughnut">
              <div class="headingAndGraph">
                <h4>Subjectwise Breakup of Full Marks</h4>
                <div class="graph-container-pie">
                  <canvas id="fullMarksChart"> </canvas>
                </div>
              </div>
              <div class="headingAndGraph">
                <h4> Subjectwise Breakup of Obtained Marks</h4>
                <div class="graph-container-pie">
                  <canvas id="obtainedMarksChart"></canvas>
                </div>
              </div>
            </div>

            <div class="graph-container-bar">
              <div class="headingAndGraph">
                <h4>Subjectwise Comparison</h4>

                <div class="graph-container">
                  <canvas id="comparisonChart"></canvas>
                </div>
              </div>

              <div class="headingAndGraph">
                <h4>Subjectwise Rank</h4>
                <div class="graph-container">
                  <canvas id="rankChart"></canvas>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Social Media Information -->
      <div class="social-media-info">
        <div class="social-media-icons">
          <div class="social-media-div">
            <!-- <img src="https://via.placeholder.com/50x50" alt="Facebook" /> -->
            <span>
              <img src="${callIconBase64}" alt="" />

              +91 8126555222/333</span
            >
          </div>
          <div class="social-media-div">
            <span>
              <img src="${websiteIconBase64}" alt="" />
              www.scholarsden.in</span
            >
          </div>
          <div class="social-media-div social-media-div-last">
            <img src="${facebookIconBase64}" alt="" />
            <img src="${youtubeIconBase64}" alt="" />
            <img src="${twitterIconBase64}" alt="" />
            <img src="${socialIconBase64}" alt="" />

            <span> scholarsden</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <div>
          BUILDING 1, 2 & 4: Near Qila, Kanth Road, Moradabad (UP) 244001<br />
          SD House (Corporate Office): Sai Mandir Road, Deen Dayal Nagar-I,
          Moradabad (UP) 244001
        </div>
      </div>

      <div class="secondPage">
        <div class="secondPageLogo">
          <img src="${scholarsDenBase64}" alt="Logo" />
        </div>

        <div class="secondPagetextContainer">
        <p>
          Dear, 
          </p>
          <span>
          ${data.studentFirstName}
          </span>
          <div id="scholarshipMessage"></div>
        </div>

        <div class="secondPageFooter">
          <img class="VTSirImage" src="${VTSirImage}" alt="Logo" />
          <div class="footerSignature">
          <img src=${VT_Sir_Signature} alt="Logo" />
          <div>
          <span >
          <strong class="VTSirName">
         Vivek Thakur (VT SIR) </strong> <br />
        
          IIT Kharagpur Alumnus <br />

          Managing Director, Scholars Den <br />
</span>


          </div>
          </div>
        </div>
      </div>
    </div>
    
       <script>

       




document.getElementById('examDate').innerHTML = \`${day}<sup>th</sup> ${monthNames[parseInt(month)]} '${year.slice(-2)}\`;





      


 const scholarshipMessageElement = document.getElementById('scholarshipMessage');
  
    if (${scholarship} > 0 && ${scholarship} < 40) {
scholarshipMessageElement.innerHTML = \`
<p>
  Your efforts have not gone unnoticed. Exams are just an experience for  
  learning that will help you progress. Since you are not familiar with the  
  nature of current competitive exams, give yourself a chance, and join Scholars  
  Den. Here our experienced team will prepare you for the current competitive  
  exams and provide an opportunity to bring out the talent hidden within you.  
</p>
<p>
  After joining Scholars Den, you will see a positive change within yourself in  
  no time. Other students have also witnessed significant growth in their  
  confidence and abilities after joining Scholars Den.
</p>
<p>We will assist you in every possible way to fulfill your dreams.</p>
<p>
  आपके प्रयास बेकार नहीं गए। परीक्षा केवल सीखने का एक अनुभव है जो आपको आगे बढ़ने  
  में मदद करेगा।
</p>
<p>
  चूंकि आप वर्तमान की प्रतियोगी परीक्षाओं की प्रकृति से परिचित नहीं हैं इसलिए  
  स्वयं को एक अवसर दें और स्कॉलर्स डेन आयें। यहाँ हमारी अनुभवी टीम आपको वर्तमान  
  प्रतियोगी परीक्षाओं के अनुरुप तैयार करेगी जिससे आपके भीतर छुपी प्रतिभा को बाहर  
  आने का मौका मिलेगा।
</p>
<p>
  स्कॉलर्स डेन में शामिल होने के बाद आप कुछ ही समय में अपने अंदर एक सकारात्मक  
  बदलाव देखेंगे। अन्य विद्याथियों ने भी स्कॉलर्स डेन आने के बाद अपने आत्मविश्वास  
  और क्षमताओं में उल्लेखनीय वृद्धि देखी है।
</p>
<p>हम आपके सपनों को पूरा करने में आपकी हर संभव मदद करेंगे।</p>
<p>With best wishes,</p>
\`; } else if(${scholarship} >= 40 && ${scholarship} < 60)
scholarshipMessageElement.innerHTML = \`
<p>
  Your efforts are commendable. If you are not yet familiar with the nature of  
  competitive exams, do not lose heart. We're ready to support you on this journey.
</p>
<p>
  Our experienced team will prepare you for the current competitive exams and  
  help unlock the potential within you.
</p>
<p>
  In Scholars Den, you will witness positive changes within yourself in no  
  just like many other students have experienced.
</p>
<p>We will assist you in every possible way to fulfill your dreams.</p>
<p>
  आपके प्रयास सराहनीय हैं। यदि आप अभी तक प्रतियोगी परीक्षाओं की प्रकृति से  
  परिचित नहीं हैं, तो हार न मानें। हम इस यात्रा में आपका साथ देने के लिए तैयार  
  है।
</p>
<p>
  हमारी अनुभवी टीम आपको वर्तमान प्रतियोगी परीक्षाओं के अनुरूप तैयार करेगी और  
  आपके अंदर छुपी प्रतिभा को निखारने में मदद करेगी।
</p>
<p>
  स्कॉलर्स डेन में आप कुछ ही समय में अपने अंदर सकारात्मक बदलाव देखेंगे, जैसा कि  
  कई अन्य छात्रों ने अनुभव किया है।
</p>
<p>हम आपके सपनों को पूरा करने में आपकी हर संभव मदद करेंगे।</p>
<p>With best wishes,</p>
\`; else if(${scholarship} >= 60 && ${scholarship} < 80){
scholarshipMessageElement.innerHTML = \`
<p>
  Your hard work and efforts in the exam are clearly visible. Keep moving  
  forward - we are always here to provide the right guidance and assistance.
</p>
<p>
  Our experienced team will familiarize you with the nature of current  
  competitive exams and help you progress on the path to success.  
</p>
<p>
  Many students studying at Scholars Den have witnessed significant growth in  
  their confidence and abilities after joining. You can be a part of those  
  students and write your own success story.
</p>
<p>
  परीक्षा में आपकी मेहनत और प्रयास साफ़ झलक रहे हैं। आगे बढ़ते रहें - हम आपको  
  उचित मार्गदर्शन व सहायता प्रदान करने के लिए हमेशा यहाँ हैं।
</p>
<p>
  हमारी अनुभवी टीम आपको वर्तमान प्रतियोगी परीक्षाओं की प्रकृति से परिचित कराएगी  
  और आपको सफलता की राह पर आगे बढ़ने में मदद करेगी।
</p>
<p>
  स्कॉलर्स डेन में पढ़ने वाले कई विद्यार्थियों ने भी यहाँ आने के बाद अपने  
  आत्मविश्वास और क्षमताओं में उल्लेखनीय वृद्धि देखी है। आप भी उन विद्यार्थियों  
  में शामिल हो सकते हैं और अपनी सफलता की कहानी खुद लिख सकते हैं।
</p>
<p>With best wishes,</p>
\`; 
}
else if (${scholarship} >= 80 && ${scholarship} < 90){
scholarshipMessageElement.innerHTML = \`

<p>Congratulations on achieving excellent marks in SDAT.</p>
<p>
  You possess sufficient talent and skills, and there is much more which needs  
  to be showcased to the world.
</p>
<p>
  We are always with you to provide the right direction. Our experienced team  
  will guide you for the current competitive exams and help further polish your  
  abilities.
</p>
<p>SDAT में उत्कृष्ट अंक प्राप्त करने के लिए आपको हार्दिक शुभकामनाएँ।</p>
<p>
  आपके पास पर्याप्त प्रतिभा व कौशल है, जिसका संसार में प्रदर्शन होना अभी बाकी
  है।
</p>
<p>
  आपको उचित दिशा प्रदान करने के लिए हम हमेशा आपके साथ हैं। हमारी अनुभवी टीम  
  वर्तमान प्रतियोगी परीक्षाओं के लिए आपका मार्गदर्शन करेगी और आपकी प्रतिभा को और  
  अधिक निखारने में मदद करेगी।
</p>
<p>With best wishes,</p>
\`; } 
  else { 
    scholarshipMessageElement.innerHTML = \`

<p>
  Congratulations on achieving excellent marks in SDAT. Best wishes to you. You  
  are on the right path.
</p>
<p>
  Maintain this level of commitment, and soon you will see your dreams come  
  true.
</p>
<p>
  We are with you in every need. Our experienced team will guide you for the  
  current competitive exams and help enhance your abilities even further.
</p>
<p>
  SDAT में उत्कृष्ट अंक प्राप्त करने के लिए आपको हार्दिक शुभकामनाएँ। आप सही दिशा
  में हैं।
</p>
<p>
  प्रतिबद्धता के इस स्तर को बनाए रखें, बहुत जल्द ही आप अपने सपनों को साकार होता
  हुआ पाएँगे।
</p>
<p>
  आपकी प्रत्येक आवश्यकता में हम आपके साथ हैं। हमारी अनुभवी टीम आपको वर्तमान  
  प्रतियोगी परीक्षाओं के लिए आपका मार्गदर्शन करेगी और आपकी प्रतिभा को और अधिक  
  निखारने में मदद करेगी।
</p>
<p>With best wishes,</p>
\`; }

    
       const allSubjectName = ${JSON.stringify(shortSubjectNames)};
       const allSubjectMarks = ${JSON.stringify(allSubjectMarks)};
       const allSubjectFullMarks = ${JSON.stringify(allSubjectFullMarks)};
       const allSubjectAverageMarks = ${JSON.stringify(allSubjectAverageMarks)};
       const subjectWiseRank = ${JSON.stringify(subjectWiseRank)};
    
      
    
    // Full Marks 3D Ring Chart
    const fullMarksCtx = document.getElementById("fullMarksChart").getContext("2d");
    new Chart(fullMarksCtx, {
    type: "doughnut",
    data: {
      labels: allSubjectName,
      datasets: [
        {
          data: allSubjectFullMarks,
          backgroundColor: [
            "#c61d23",
            "#302e2f",
            "#e6e7e8",
            "#ffdd00",
            "#FFCE56",
            "#FF9F40",
          ],
        },
      ],
    },
    options: {
      cutout: "40%",
      responsive: true,
      maintainAspectRatio: false,
      aspectRatio: 0.8, // Adjusted aspect ratio to make the chart smaller
      plugins: {
        chartJsPlugin3d: {
          enabled: true,
          perspective: 60,
          depth: 15,
        },
        legend: {
          position: "right",
          labels: {
            boxWidth: 12,
            padding: 10,
          },
        },
      },
    },
    });
    
    // Obtained Marks 3D Ring Chart
    const obtainedMarksCtx = document
    .getElementById("obtainedMarksChart")
    .getContext("2d");
    new Chart(obtainedMarksCtx, {
    type: "doughnut",
    data: {
      labels: allSubjectName,
      datasets: [
        {
          data: allSubjectMarks,
          backgroundColor: [
            "#c61d23",
            "#302e2f",
            "#e6e7e8",
            "#ffdd00",
            "#FFCE56",
            "#FF9F40",
          ],
        },
      ],
    },
    options: {
      cutout: "40%",
      responsive: true,
      maintainAspectRatio: false,
      aspectRatio: 0.8, // Adjusted aspect ratio to make the chart smaller
      plugins: {
        chartJsPlugin3d: {
          enabled: true,
          perspective: 60,
          depth: 15,
        },
        legend: {
          position: "right",
          labels: {
            boxWidth: 12,
            padding: 10,
          },
        },
      },
    },
    });
    
    
    
    
    // Comparison Chart (3D Bar)
    const comparisonCtx = document.getElementById("comparisonChart").getContext("2d");
    new Chart(comparisonCtx, {
    type: "bar",
    data: {
      labels: allSubjectName,
      datasets: [
        {
          label: "Marks Obtained",
          data: allSubjectMarks,
          backgroundColor: "#c61d23",
        },
        {
          label: "Full Marks",
          data: allSubjectFullMarks,
          backgroundColor: "#ffdd00",
        },
        { 
          label: "Average Marks",
          data: allSubjectAverageMarks,
          backgroundColor: "#e6e7e8clear",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      aspectRatio: 1.5, // Adjust the chart's height-width ratio
      plugins: {
        legend: {
          position: "top",
          labels: {
            boxWidth: 12,
            padding: 10,
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 10,
          },
        },
      },
    },
    });
    
    // Rank Chart (Line Chart Example)
    const rankCtx = document.getElementById("rankChart").getContext("2d");
    new Chart(rankCtx, {
    type: "line",
    data: {
      labels: allSubjectName,
      datasets: [
        {
          label: "Rank Progression",
          data: subjectWiseRank,
          borderColor: "#c61d23",
          backgroundColor: "rgba(198, 29, 35, 0.5)",
          fill: true,
          tension: 0.4, // Smooth curves
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
    },
    });
    
    
      </script>
    </body>
    </html>
    
    
    
    
      `;





    await page.setContent(htmlContent, { waitUntil: 'networkidle2' });


    // Wait for charts to render
    await page.waitForFunction(() => {
      const canvas = document.getElementById('comparisonChart');
      return canvas && canvas.getContext('2d') && canvas.toDataURL();
    }, { timeout: 10000 }); // Increase timeout to 10 seconds


    await page.evaluate(() => {
      return new Promise(resolve => setTimeout(resolve, 3000)); // Wait for 3 seconds
    });

    // await page.waitForTimeout(2000); // Additional delay for rendering


    // Capture a screenshot for debugging
    // await page.screenshot({ path: 'debug_screenshot.png', fullPage: true });

    // Generate the PDF
    console.log("Attempting to generate PDF at:", pdfFilePath);
    await page.pdf({ path: pdfFilePath, format: 'A4', printBackground: true });
    console.log("PDF generation completed.");
    await browser.close();
  } catch (error) {
    console.log("Error generating PDF:", error);
  }

};




// Function to upload a file to Cloudinary
// const uploadToCloudinary = async (pdfFilePath, rollNumber) => {
//   try {
//     const folder = "report_cards"; // Folder name in Cloudinary
//     const publicId = `${folder}/${rollNumber}`; // Store the file with the student's roll number as the name

//     console.log(`Uploading ${pdfFilePath} to Cloudinary...`);
//     const result = await cloudinary.uploader.upload(pdfFilePath, {
//       resource_type: "raw", // Specify 'raw' for non-image files like PDFs
//       public_id: publicId,  // Set custom public ID for the file
//       folder: "SDATResults", // Folder name in Cloudinary

//     });
//     console.log(`Uploaded to Cloudinary: ${result.url}`);
//     return result.url;
//   } catch (error) {
//     console.error("Error uploading to Cloudinary:", error);
//     throw error;
//   }
// };

// Function to process CSV data and generate report cards
const processCSVAndGenerateReportCards = async (csvFilePath, res) => {
  const students = [];

  // Read CSV file and parse data
  await fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on("data", (row) => {
      students.push(row);
    })
    .on("end", async () => {

      for (const [StudentIndex, student] of students.entries()) {


        const pdfFilePath = `./reportCards/${student["Candidate Name"]}_${student["Roll No"]}.pdf`;
        const allKeys = Object.keys(student);

        // Function to extract names and numbers
        function extractData(studentData) {
          let names = [];
          let numbers = [];
          let totalMarks = [];

          // Iterate through the data object
          for (let key in studentData) {
            let value = studentData[key];

            // Check if the key contains a number in parentheses (indicating marks/subjects)
            const match = key.match(/\((\d+)\)/);

            if (key === 'Total(100)' || key === 'Total(240)' || key === 'Total(480)') {
              totalMarks.push({ key: key.split("(")[0], obtainedMarks: match[1], value });
            }

            else if (match) {
              // If the key contains a number in parentheses, extract the number and store it as a number
              numbers.push({ key: key.split("(")[0], number: match[1], value });
            } else {
              // If it's not one of the excluded keys, store it as a name
              names.push({ key, value });
            }
          }

          return { names, numbers, totalMarks };
        }

        // Extracted studentData
        const { names, numbers, totalMarks } = await extractData(student);



        let checkMarksData = numbers.map((item, index) => {
          return {
            name: item.key.toUpperCase(),
            obtained: item.value,
            average: student[item.key.toUpperCase() + " Average"],
            highestScore: student[item.key.toUpperCase() + "_Highest Score"],
            subjectWiseRank: student[item.key.toUpperCase() + "_Subjectwise_Rank"],
            fullMarks: item.number,
          }
        })

        // console.log("checkMarksData", checkMarksData);

        // console.log("Student", student);



        function capitalizeWords(str) {
          return str?.split(' ')?.map(word =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            )
            .join(' ');
        }

        let data = {
          studentFirstName: capitalizeWords(student['Candidate Name']?.split(" ")[0]),
          studentLastName: capitalizeWords(student['Candidate Name']?.split(" ").length > 1 ? student['Candidate Name']?.split(" ").slice(1).join(" ") : ""),
          Registration: student['Roll No'],
          Rank: student['Rank'],
          Scholarship: student['Scholarship%'],
          Father: capitalizeWords(student["Father's Name"]),
          Class: capitalizeWords(student["Class"]),
          examDate: student["Exam Date"],
          Rank: student[allKeys[0]],
          subjects: checkMarksData,
          totalMarks: totalMarks,
        }


        try {
          const existingDate = await ExamDate.findOne({ examDate: student["Exam Date"] });

          console.log("existingDate", existingDate);
          console.log("student[\"Exam Date\"]", student["Exam Date"]);
          if (!existingDate) {
            const addDate = await ExamDate.create({ examDate: student["Exam Date"] });
            console.log("addDate", addDate);

          }


        } catch (error) {
          console.log("error in adding Exam date");
          console.log("error", error);

        }


        try {
          await generateReportCardPDF(data, pdfFilePath);
          console.log(`Generated PDF check pdfFilePath`, pdfFilePath);

          // Ensure that the file is valid before uploading
          if (isFileValid(pdfFilePath)) {
            try {
              // Upload the report card to Cloudinary
              // const url = await uploadToCloudinary(pdfFilePath, student["Roll No"]);
              // console.log("Report card uploaded to Cloudinary:", url);
              // console.log("Student role number:", student["Roll No"]);
              // Update the student document with the Cloudinary URL
              // const updatedStudent = await Students.updateOne({ "StudentsId": student["Roll No"] }, { $set: { "result": url } });
              // console.log("updatedStudent", updatedStudent);

              const resultAlreadyExists = await Result.findOne({ StudentId: student["Roll No"] });
              console.log("resultAlreadyExists", resultAlreadyExists);

              // if (!resultAlreadyExists) {


              //   const AddResult = new Result({
              //     StudentId: student["Roll No"],
              //     resultUrl: url,
              //     examDate: student["Exam Date"]
              //   })
              //   await AddResult.save();

              //   console.log("AddResult", AddResult);
              // }

              // // Send progress update to frontend
              // const resSend = await res.write(`data: ${JSON.stringify({ index: StudentIndex + 1, total: students.length, url })}\n\n`);



              // console.log("resSend", resSend);

            } catch (error) {
              console.error(`Error uploading report card for Roll Number: ${student["Roll No"]}`, error);
            }
            //  finally {
            //   if (fs.existsSync(pdfFilePath))
            //     fs.unlinkSync(pdfFilePath);

            // }
          } else {
            console.log(`Generated PDF for ${student["Roll No"]} is empty or invalid.`);
          }

          // Optionally, delete the local file after upload
        } catch (error) {
          console.error(`Error processing report card for Roll Number: `, error);
        }

      }

      await res.write(`data: ${JSON.stringify({ complete: true })}\n\n`);
      res.end();

    })
    .on("error", (error) => {
      console.error("Error reading CSV file:", error);
    });
};

// Run the script
const csvFilePath = "./SDATResult.csv"; // Path to your CSV file
// const csvFilePath = "./Jatin.csv"; // Path to your CSV file
// processCSVAndGenerateReportCards(csvFilePath);


// module.export = processCSVAndGenerateReportCards;


module.exports = processCSVAndGenerateReportCards;

const express = require("express");
const app = express();
const cors = require("cors");
const cookieParser = require('cookie-parser');

const adminRoutes = require("./routes/adminRoutes");
const admissionRoutes = require("./routes/admissionRoutes");
const userRoute = require("./routes/UserRoute");
const adminRoute = require("./routes/AdminRoute");
const fileUpload = require("express-fileupload");
const admissionAdminRoute = require("./routes/admissionAdminRoute");
const amountRoute = require("./routes/amount");

const mongoose = require("mongoose");
const port = process.env.PORT || 5004;
require("dotenv").config();

// ====== MIDDLEWARE ORDER IS CRITICAL ======

// 1. Cookie parser FIRST
app.use(cookieParser());

// 2. CORS Configuration - ONLY ONCE!
app.use(cors({
  origin: [
    'https://registration.scholarsden.in',
    'https://www.scholarsden.in',
    'https://scholarsden.in',
    'https://enquiry.scholarsden.in',
    'https://admissionform.scholarsden.in',
    'http://localhost:5173', // Vite default port
  ], // Your frontend URL
  credentials: true, // ESSENTIAL for cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie']
}));

// 3. Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ====== DATABASE CONNECTION ======
mongoose
  .connect(process.env.MONGODB_URI, {
    autoIndex: false,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// ====== ROUTES ======
app.use("/api/auth", require("./routes/auth"));
app.use("/api/students", require("./routes/students"));
app.use("/api/form", require("./routes/form"));
app.use("/api/employees", require("./routes/employes"));
app.use("/api/examList", require("./routes/examList"));
app.use("/api/candidates", require("./routes/candidate"));
app.use("/api/tasks", require("./routes/task"));
app.use("/api/attendence", require("./routes/attendence"));
app.use("/api/board", require("./routes/Board"));
app.use("/api/payment", require("./routes/payment"));
app.use("/api/result", require("./routes/result"));
app.use("/api/adminData", require("./routes/adminData"));
app.use("/api/approval", require("./routes/AdmissionApproval"));
app.use("/api/admin", adminRoutes);
app.use("/api/admissions", admissionRoutes);
app.use("/api/user", userRoute);
app.use("/api/amount", amountRoute);
app.use("/api/admin", adminRoute);
app.use("/api/admission-admin", admissionAdminRoute);

// ====== START SERVER ======
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
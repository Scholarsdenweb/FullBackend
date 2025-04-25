const express = require("express");
const app = express();
const cors = require("cors");

const adminRoutes = require("./routes/adminRoutes");
const admissionRoutes = require("./routes/admissionRoutes");

// const authRoutes = require('./routes/authRoutes');
const userRoute = require("./routes/UserRoute");

const adminRoute = require("./routes/AdminRoute");
const fileUpload = require("express-fileupload");

const mongoose = require("mongoose");
const port = process.env.PORT || 5004;
require("dotenv").config();

app.use(express.json());
app.use(
  cors({
    origin: "*",
    // credentials: true,
  })
);
app.use(express.urlencoded({ extended: true }));

mongoose
  .connect(process.env.MONGODB_URI, {
    autoIndex: false,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  });

app.use("/api/auth", require("./routes/auth"));

app.use("/api/students", require("./routes/students"));
// app.use("/api/admitCard", require("./routes/AdmitCardGenerator"));

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

// Routes
app.use("/api/admin", adminRoutes);
app.use("/api/admissions", admissionRoutes);

app.use("/api/user", userRoute);

// const formRoutes = require('./routes/formRoutes');
// const takenByRoutes = require('./routes/takenByRoutes');

// app.use('/auth', authRoutes);

// app.use("/api/user", userRoute);
app.use("/api/admin", adminRoute);
// app.use('/forms', formRoutes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

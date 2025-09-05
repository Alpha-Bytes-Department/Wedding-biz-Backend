const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(bodyParser.json());
app.use(cors());
 
// DB Connection
require("./DB/Connection");

// Routes
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
const userRoutes = require("./Routes/userRoute");
const noteRoutes = require("./Routes/noteRoute");
const eventRoutes = require("./Routes/eventRoute");
// const { default: seedAdmin } = require("./DB/SuperUser");

// ====================User Routes=========================
app.use("/api/users", userRoutes); 

// ====================Note Routes=========================
app.use("/api/notes", noteRoutes);

// ===================Event Routes=========================
app.use("/api/events", eventRoutes);

// Root
app.get("/", (req, res) => {
  res.send("Welcome to the WeddingBiz API 🚀");
});

// Start Server
app.listen(PORT, () => {
  // seedAdmin()
  console.log(`Server running on port ${PORT}`);
});

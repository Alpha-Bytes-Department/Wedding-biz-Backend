const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const http = require("http");
require("dotenv").config();
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy - MUST be set before any middleware that depends on client IP
app.set("trust proxy", 1);

// Middleware - Move security middleware to the top
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resource loading
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", "wss:", "ws:", "https:", "http:"], // Allow WebSocket connections
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:", "http:"], // Allow http images
      },
    },
  })
);

// Compression
app.use(compression());

// CORS configuration - Allow all origins (completely open)
app.use(
  cors({
    origin: "*", // Allow all origins
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "Cache-Control",
      "X-Forwarded-For",
    ],
    credentials: false, // Set to false when origin is "*"
    optionsSuccessStatus: 200,
    preflightContinue: false,
  })
);

// Additional middleware to handle preflight requests
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, X-Forwarded-For"
  );
  res.header("Access-Control-Max-Age", "86400"); // 24 hours

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  } else {
    next();
  }
});

// Body parser middleware with increased limits for file uploads
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// DB Connection
require("./DB/Connection");

// Add a simple test to check existing booking proposals
setTimeout(async () => {
  try {
    const { ChatMessage } = require("./Models/ChatSchema");
    const bookingProposals = await ChatMessage.find({
      type: "booking_proposal",
    }).limit(5);
    console.log(
      `📊 Database Test: Found ${bookingProposals.length} existing booking proposals`
    );
    if (bookingProposals.length > 0) {
      // console.log(
      //   "📋 Sample booking proposals:",
      //   bookingProposals.map((bp) => ({
      //     id: bp._id,
      //     roomId: bp.roomId,
      //     eventName: bp.bookingData?.eventName,
      //     status: bp.bookingData?.status,
      //     createdAt: bp.createdAt,
      //   }))
      // );
    }
  } catch (error) {
    console.error("❌ Error checking booking proposals:", error);
  }
}, 3000); // Wait 3 seconds for DB connection

// Add specific CORS middleware for uploads
app.use("/uploads", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control"
  );
  res.header("Cross-Origin-Resource-Policy", "cross-origin");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  } else {
    next();
  }
});

// Serve uploads folder with proper headers
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    maxAge: "1d", // Cache files for 1 day
    etag: true,
    lastModified: true,
    setHeaders: (res, path, stat) => {
      // Set CORS headers
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With"
      );
      res.set("Cross-Origin-Resource-Policy", "cross-origin");

      // Set proper MIME types for different file types
      if (path.endsWith(".pdf")) {
        res.setHeader("Content-Type", "application/pdf");
      } else if (path.endsWith(".jpg") || path.endsWith(".jpeg")) {
        res.setHeader("Content-Type", "image/jpeg");
      } else if (path.endsWith(".png")) {
        res.setHeader("Content-Type", "image/png");
      } else if (path.endsWith(".gif")) {
        res.setHeader("Content-Type", "image/gif");
      } else if (path.endsWith(".webp")) {
        res.setHeader("Content-Type", "image/webp");
      }
    },
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
});
app.use("/api/", limiter);

// File upload rate limiting
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 uploads per windowMs
  message: {
    error: "Too many file uploads, please try again later.",
  },
});

// Apply upload limiting to chat file upload endpoints
app.use("/api/upload-chat-file", uploadLimiter);
app.use("/api/upload-chat-files", uploadLimiter);

// Routes
const userRoutes = require("./Routes/userRoute");
const noteRoutes = require("./Routes/noteRoute");
const eventRoutes = require("./Routes/eventRoute");
const reviewRoute = require("./Routes/reviewRoute");
const notificationRoute = require("./Routes/notificationRoute");
const scheduleRoute = require("./Routes/scheduleRoute");
const marketingOthersRoute = require("./Routes/marketing_othersRoute");
const billRoute = require("./Routes/BillRoute");

// Import chat routes
const chatRoutes = require("./Routes/chatRoutes");

// ==========User routes=================
app.use("/api/users", userRoutes);
// ==========Note routes=================
app.use("/api/notes", noteRoutes);
// ==========Event routes================
app.use("/api/events", eventRoutes);
// ==========Review routes===============
app.use("/api/reviews", reviewRoute);
// ==========Notification routes=========
app.use("/api/notifications", notificationRoute);
// ==========Schedule routes=============
app.use("/api/schedule", scheduleRoute);
// ==========Marketing others routes=====
app.use("/api/marketing", marketingOthersRoute);
// ==========Bill routes=================
app.use("/api/bills", billRoute);
// ==========Chat routes=================
app.use("/api/chat", chatRoutes);

// =============PaymentFunctionality================
// Add your payment routes here

// Error handling middleware for multer errors (must be after routes)
app.use((error, req, res, next) => {
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      message: "File size too large. Maximum allowed size is 2MB.",
      error: "FILE_TOO_LARGE",
    });
  }

  if (error.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({
      success: false,
      message: "Too many files. Maximum allowed is 1 file.",
      error: "TOO_MANY_FILES",
    });
  }

  if (error.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      success: false,
      message: "Unexpected field name for file upload.",
      error: "UNEXPECTED_FIELD",
    });
  }

  if (error.message && error.message.includes("File type")) {
    return res.status(400).json({
      success: false,
      message: error.message,
      error: "INVALID_FILE_TYPE",
    });
  }

  // For other multer errors
  if (error.name === "MulterError") {
    return res.status(400).json({
      success: false,
      message: "File upload error: " + error.message,
      error: "UPLOAD_ERROR",
    });
  }

  // Pass other errors to default error handler
  next(error);
});

// API health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
    features: {
      chat: true,
      fileUpload: true,
      realTime: true,
    },
  });
});

// // Serve frontend/public folder
// app.use(express.static(path.join(__dirname, "public")));

// Create HTTP server
const server = http.createServer(app);

// Import and setup Socket.IO
const setupSocket = require("./Socket/socket");
const io = setupSocket(server);

// Make io available to routes if needed
app.set("io", io);

// Root route
app.get("/api/", (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);

  // Handle specific error types
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      details: err.message,
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
      details: err.message,
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Duplicate entry",
      details: "Resource already exists",
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// Handle 404 for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route ${req.originalUrl} not found`,
  });
});

// Handle all other routes (for SPA)
// app.use("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "public", "index.html"));
// });

// Start Server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📂 Uploads directory: ${path.join(__dirname, "uploads")}`);
  console.log(
    `🌐 Frontend URL: ${
      process.env.FRONTEND_URL ||
      "http://localhost:3000" ||
      "http://localhost:3001"
    }`
  );
  console.log(`💬 Chat functionality: Enabled`);
  console.log(
    `📁 File upload: Enabled (Max: 2MB for profile pictures, 50MB for chat files)`
  );
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Shutting down gracefully...");
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", err);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = app;

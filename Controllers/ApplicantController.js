const applicant = require("../Models/ApplicatntsSchema");
const user = require("../Models/UserCredential");
const { createNotification } = require("./notificationController");

// =============== create Application ===============
const createApplication = async (req, res) => {
  const {
    userId,
    name,
    contactNo,
    email,
    experience,
    address,
    experience_details,
    language,
    speciality,
  } = req.body;

  try {
    // Check if user already applied
    const existingApplication = await applicant.findOne({ userId });
    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted an application",
      });
    }

    // Validate required fields
    if (
      !userId ||
      !name ||
      !contactNo ||
      !email ||
      !experience ||
      !address ||
      !experience_details ||
      !speciality ||
      !language
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Validate files
    if (!req.files || !req.files.profilePicture || !req.files.portfolio) {
      return res.status(400).json({
        success: false,
        message: "Both profile picture and portfolio PDF are required",
      });
    }

    // Generate file URLs
    const baseUrl =
      process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
    const profilePictureUrl = `${baseUrl}/uploads/profiles/${req.files.profilePicture[0].filename}`;
    const portfolioUrl = `${baseUrl}/uploads/portfolios/${req.files.portfolio[0].filename}`;

    // Parse languages if it's a string
    let parsedLanguages;
    try {
      parsedLanguages =
        typeof language === "string" ? JSON.parse(language) : language;
    } catch (error) {
      parsedLanguages = [language]; // Fallback to single language array
    }

    const newApplication = new applicant({
      userId,
      name,
      contactNo,
      email,
      experience: parseInt(experience),
      address,
      experience_details,
      portfolio: portfolioUrl,
      profilePicture: profilePictureUrl,
      language: parsedLanguages,
      speciality,
    });

    console.log("New Application:", newApplication);

    await newApplication.save();

    // Create a notification for the user
    createNotification(
      userId,
      "Application Submitted",
      "Your application has been submitted successfully."
    );

    res.status(201).json({
      success: true,
      message: "Application created successfully",
      data: {
        applicationId: newApplication._id,
        status: newApplication.status,
      },
    });
  } catch (error) {
    console.error("Error creating application:", error);

    // Clean up uploaded files if database save failed
    if (req.files) {
      const fs = require("fs").promises;
      try {
        if (req.files.profilePicture) {
          await fs.unlink(req.files.profilePicture[0].path).catch(() => {});
        }
        if (req.files.portfolio) {
          await fs.unlink(req.files.portfolio[0].path).catch(() => {});
        }
      } catch (cleanupError) {
        console.error("Error cleaning up files:", cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: "Error creating application",
      error: error.message,
    });
  }
};

// ================ Update Application Status ================
const updateApplicationStatus = async (req, res) => {
  const applicationId = req.params.id; // Route uses /:id
  const { status, userId } = req.body;
  const applicantUser = await applicant.findById(applicationId);

  try {
    if (status === "approved") {

      await user.findByIdAndUpdate(userId, { role: "officiant", experience: applicantUser.experience });

      
      createNotification(
        userId,
        "Application Approved",
        "Your application to become an officiant has been approved."
      );
    }

    const updatedApplication = await applicant.findByIdAndUpdate(
      applicationId,
      { status },
      { new: true }
    );

    if (!updatedApplication) {
      return res.status(404).json({ message: "Application not found" });
    }

    res.status(200).json({
      message: "Application status updated successfully",
      application: updatedApplication,
    });
  } catch (error) {
    console.error("Error updating application status:", error);
    res
      .status(500)
      .json({ message: "Error updating application status", error });
  }
};

// ================== Get Application by ID ==================
const getApplicationById = async (req, res) => {
  const applicationId = req.params.id; // Route uses /:id
  try {
    const application = await applicant.findById(applicationId);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }
    res.status(200).json({ application });
  } catch (error) {
    console.error("Error fetching application:", error);
    res.status(500).json({ message: "Error fetching application", error });
  }
};

// ================= get all applications =================

const getAllApplications = async (req, res) => {
  try {
    const applications = await applicant.find();
    res.status(200).json({ applications });
  } catch (error) {
    console.error("Error fetching applications:", error);
    res.status(500).json({ message: "Error fetching applications", error });
  }
};

// ================= delete application =================

const deleteApplication = async (req, res) => {
  const applicationId = req.params.id; // Route uses /:id
  try {
    const deletedApplication = await applicant.findByIdAndDelete(applicationId);
    if (!deletedApplication) {
      return res.status(404).json({ message: "Application not found" });
    }
    res.status(200).json({ message: "Application deleted successfully" });
  } catch (error) {
    console.error("Error deleting application:", error);
    res.status(500).json({ message: "Error deleting application", error });
  }
};

// ================= export the functions =================
module.exports = {
  createApplication,
  updateApplicationStatus,
  getApplicationById,
  getAllApplications,
  deleteApplication,
};
